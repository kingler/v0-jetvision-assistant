# ONEK-175: RFQ Price Updates by Operator Do Not Refresh in Chat UI

## Problem Statement

When an operator updates their quote price in Avinode (e.g., $46,400 to $50,000), the Chat UI continues to display the stale/original price. The updated price is visible in the Avinode UI but not reflected in our system.

## Root Cause Analysis

### Contributing Factor 1: Webhook Price Fetching Gap

**File**: `app/api/webhooks/avinode/route.ts`

When Avinode sends a `TripRequestSellerResponse` webhook (including price updates), two issues exist:

1. **Simple format webhooks (`{id, href, type}`) are stored but never processed**. Per Avinode docs, the standard webhook format only contains `{id, href, type}` - the actual data must be fetched from the `href` URL. The code stores the notification but never follows up to fetch the quote details.

2. **Extended format webhooks pass `messageDetails: null`** to `storeOperatorQuote()`, which means the function falls back to `webhookData.quote?.totalPrice?.amount` instead of fetching the authoritative `sellerPrice` from the API.

### Contributing Factor 2: Price Extraction in storeOperatorQuote

**File**: `app/api/webhooks/avinode/webhook-utils.ts`

The `storeOperatorQuote()` function looks for price data at `messageDetails?.data?.relationships?.quote?.data?.attributes` (JSONAPI format), but when `fetchMessageDetails` returns the raw quote response from `/quotes/{id}`, the `sellerPrice` is at the top level of the response, not nested in relationships. This mismatch causes the price extraction to miss the authoritative `sellerPrice` field.

### Contributing Factor 3: Quote Response Unwrapping in MCP Server

**File**: `mcp-servers/avinode-mcp-server/src/index.ts`

The `getRFQ` handler fetches individual quote details via `GET /quotes/{quoteId}` and tries to unwrap the response to find `sellerPrice`. However, the unwrapping logic has edge cases:
- Different API versions may return `sellerPrice` at different nesting levels
- When `sellerPrice` is absent but `sellerPriceWithoutCommission` exists, it's not promoted as a fallback
- The unwrapping was inconsistent with the `getQuote` function's approach

## Implementation Plan

### Phase 1: Fix Webhook Quote Detail Fetching

**File**: `app/api/webhooks/avinode/route.ts`

#### Change 1.1: Import `fetchMessageDetails`
- Add `fetchMessageDetails` to the import from `./webhook-utils`

#### Change 1.2: Fetch quote details in `handleSellerResponse`
- Before calling `storeOperatorQuote`, fetch full quote details from `quote.href` using `fetchMessageDetails`
- Use 2 retries with 500ms initial delay (graceful degradation if fetch fails)
- Pass the fetched details as `messageDetails` parameter
- Log the fetched `sellerPrice` for debugging

#### Change 1.3: Process simple format webhooks for `rfqs` type
- For simple format webhooks with `type === 'rfqs'`, fetch data from `href` URL
- Find the associated request by trip ID
- Call `storeOperatorQuote` with the fetched details
- Mark the webhook as processed after successful storage

### Phase 2: Fix Price Extraction in storeOperatorQuote

**File**: `app/api/webhooks/avinode/webhook-utils.ts`

#### Change 2.1: Multi-format response unwrapping
- Add support for extracting `sellerPrice` from multiple response formats:
  - Direct: `messageDetails.sellerPrice` (raw quote object)
  - Single wrap: `messageDetails.data.sellerPrice`
  - Double wrap: `messageDetails.data.data.sellerPrice`
  - JSONAPI: `messageDetails.data.relationships.quote.data.attributes` (existing)

#### Change 2.2: Price priority with sellerPrice
- Price extraction priority: `sellerPrice.price` (fetched) > `webhookData.quote.totalPrice.amount` > 0
- Currency extraction: `sellerPrice.currency` > `webhookData.quote.totalPrice.currency` > 'USD'
- Add logging for price extraction source tracking

#### Change 2.3: Additional field extraction
- Extract `aircraftType` and `aircraftTail` from fetched quote details
- Extract `sellerMessage` from fetched quote details for operator messages

### Phase 3: Improve MCP Server Quote Response Unwrapping

**File**: `mcp-servers/avinode-mcp-server/src/index.ts`

#### Change 3.1: Unified response unwrapping
- Align the quote detail unwrapping in `getRFQ` with the approach used in `getQuote`:
  ```
  const payload = raw?.data ?? raw;
  let quoteData = payload?.data ?? payload;
  ```
- Add safety net: search `raw`, `raw.data`, `raw.data.data` for `sellerPrice`

#### Change 3.2: sellerPriceWithoutCommission fallback
- If `sellerPrice` is not found but `sellerPriceWithoutCommission` exists, promote it to `sellerPrice`
- Log when this fallback is used

#### Change 3.3: Add `latestquote` and `quotebreakdown` to `getQuote`
- The standalone `getQuote` function was missing `quotebreakdown: true` and `latestquote: true` params
- Add them for consistency with the quote fetching in `getRFQ`

## Files Modified

| File | Changes |
|------|---------|
| `app/api/webhooks/avinode/route.ts` | Import `fetchMessageDetails`, fetch quote details before storing, process simple format webhooks |
| `app/api/webhooks/avinode/webhook-utils.ts` | Multi-format response unwrapping, sellerPrice priority for pricing, logging |
| `mcp-servers/avinode-mcp-server/src/index.ts` | Unified response unwrapping, sellerPriceWithoutCommission fallback, latestquote param |

## Files NOT Modified (No Changes Needed)

| File | Reason |
|------|--------|
| `lib/avinode/rfq-transform.ts` | Price extraction chain already prioritizes sellerPrice correctly |
| `app/api/avinode/messages/route.ts` | Messages endpoint handles messages, not price updates |
| `components/avinode/*` | UI components read from the data they receive; no changes needed |

## Testing Strategy

1. **Existing tests**: Run `rfq-transform.test.ts` (25 tests) - should pass unchanged since we didn't modify the transform
2. **Existing tests**: Run `proposal/generate.test.ts` and `proposal/send.test.ts` - should pass unchanged
3. **Manual testing**:
   - Submit an RFQ in Avinode sandbox
   - Have operator submit initial quote
   - Verify price appears in Chat UI
   - Have operator update the quote price
   - Verify updated price appears in Chat UI after re-fetching
4. **Webhook testing**: Send a test webhook to `/api/webhooks/avinode` with both simple and extended formats

## Risk Assessment

- **Low risk**: All changes are additive (new fetch calls, better fallbacks) - no existing behavior is removed
- **Graceful degradation**: If `fetchMessageDetails` fails for any reason, the code falls back to the existing behavior (using webhook payload data)
- **No schema changes**: No database migrations needed
- **No UI changes**: The UI components already display whatever price data they receive

## Branch

`fix/ONEK-175-rfq-price-update-refresh` (created from `main`)
