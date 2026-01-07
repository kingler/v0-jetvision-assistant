# Avinode API Field Name Verification

**Last Updated**: January 2025  
**Purpose**: Verify that field names used in codebase match actual Avinode API documentation

## API Endpoints Verified

1. **Read a trip message**: [https://developer.avinodegroup.com/reference/readmessage](https://developer.avinodegroup.com/reference/readmessage)
2. **Read all RFQs for a given trip identifier**: [https://developer.avinodegroup.com/reference/readtriprfqs](https://developer.avinodegroup.com/reference/readtriprfqs)
3. **Read a single RFQ**: [https://developer.avinodegroup.com/reference/readbynumericid](https://developer.avinodegroup.com/reference/readbynumericid)
4. **Create a trip**: [https://developer.avinodegroup.com/reference/createtrip](https://developer.avinodegroup.com/reference/createtrip)
5. **Create an RFQ**: [https://developer.avinodegroup.com/reference/createrfq_1](https://developer.avinodegroup.com/reference/createrfq_1)
6. **Avinode Webhooks**: [https://developer.avinodegroup.com/docs/avinode-webhooks](https://developer.avinodegroup.com/docs/avinode-webhooks)

---

## Field Name Verification

### 1. Quote ID Field

**API Documentation**: Uses `quote_id` (snake_case)  
**Codebase Usage**: ✅ **CORRECT**

- **MCP Server** (`mcp-servers/avinode-mcp-server/src/index.ts`):
  - `getQuote` returns: `quote_id: quote?.id || quote?.quote_id || params.quote_id`
  - `transformToRFQFlights` extracts: `quote.quote_id || quote.quote?.id || quote.id`
  
- **Chat Interface** (`components/chat-interface.tsx`):
  - Stores quote details by `quote_id` key
  - Matches using `flight.quoteId` (camelCase) which is extracted from `quote.quote_id`

**Status**: ✅ **VERIFIED** - Field names match API

---

### 2. Price Fields

**API Documentation**: 
- PRIMARY: `sellerPrice.price` and `sellerPrice.currency` (from GET /quotes/{quoteId})
- FALLBACK: `pricing.total` and `pricing.currency` (from pricing object)

**Codebase Usage**: ✅ **CORRECT**

- **MCP Server** (`mcp-servers/avinode-mcp-server/src/index.ts`):
  ```typescript
  // getQuote function returns:
  sellerPrice: sellerPrice,  // PRIMARY: { price, currency }
  pricing: pricing,          // FALLBACK: { total, currency, base_price, ... }
  ```

- **Chat Interface** (`components/chat-interface.tsx`):
  ```typescript
  // Price extraction prioritizes sellerPrice.price (PRIMARY)
  const sellerPrice = quoteDetails.sellerPrice; // PRIMARY
  const pricing = quoteDetails.pricing;         // FALLBACK
  let newPrice = sellerPrice?.price || pricing?.total || ...
  ```

- **Transform Function** (`mcp-servers/avinode-mcp-server/src/index.ts`):
  ```typescript
  // transformToRFQFlights extracts:
  let totalPrice = 
    quote.sellerPrice?.price ||        // PRIMARY
    quote.sellerPriceWithoutCommission?.price ||
    quote.totalPrice?.amount ||
    quote.pricing?.total ||            // FALLBACK
    0;
  ```

**Status**: ✅ **VERIFIED** - Field names match API (sellerPrice is PRIMARY per test script)

---

### 3. Status Fields

**API Documentation**: 
- `status` field (direct)
- `sourcingDisplayStatus` field (from sellerLift - "Accepted" = quoted, "Declined" = declined)

**Codebase Usage**: ✅ **CORRECT**

- **Transform Function** (`mcp-servers/avinode-mcp-server/src/index.ts`):
  ```typescript
  // Status determination:
  if (quote.sourcingDisplayStatus === 'Accepted') {
    rfqStatus = 'quoted';
  } else if (quote.sourcingDisplayStatus === 'Declined') {
    rfqStatus = 'declined';
  } else if (quote.status === 'quoted' || quote.quote?.status === 'quoted') {
    rfqStatus = 'quoted';
  }
  ```

**Status**: ✅ **VERIFIED** - Field names match API

---

### 4. Message Fields

**API Documentation**: 
- PRIMARY: `sellerMessage` (string) - operator message text from quote details
- FALLBACK: `notes` field
- Trip messages: `/tripmsgs/{tripId}` endpoint

**Codebase Usage**: ✅ **CORRECT**

- **MCP Server** (`mcp-servers/avinode-mcp-server/src/index.ts`):
  ```typescript
  // getQuote returns:
  sellerMessage: quote?.sellerMessage,  // PRIMARY
  notes: quote?.sellerMessage || quote?.notes,  // FALLBACK
  ```

- **Chat Interface** (`components/chat-interface.tsx`):
  ```typescript
  // Message extraction:
  const quoteMessage = quoteDetails.sellerMessage ||  // PRIMARY
                       quoteDetails.notes ||          // FALLBACK
                       (flight as any).sellerMessage;
  ```

**Status**: ✅ **VERIFIED** - Field names match API

---

### 5. RFQ/Trip ID Fields

**API Documentation**: 
- `rfq_id` (snake_case) - RFQ identifier
- `trip_id` (snake_case) - Trip identifier
- `id` - Direct ID field (may be prefixed like `arfq-*` or `atrip-*`)

**Codebase Usage**: ✅ **CORRECT**

- **MCP Server** (`mcp-servers/avinode-mcp-server/src/index.ts`):
  ```typescript
  // getQuote returns:
  quote_id: quote?.id || quote?.quote_id || params.quote_id,
  rfq_id: quote?.rfq_id,
  trip_id: quote?.trip_id,
  ```

- **getRFQ function**:
  - Handles both `arfq-*` (RFQ ID) and `atrip-*` (Trip ID) formats
  - Uses `GET /rfqs/{tripId}` for Trip IDs per [API documentation](https://developer.avinodegroup.com/reference/readtriprfqs)
  - Uses `GET /rfqs/{id}` for single RFQ lookups per [API documentation](https://developer.avinodegroup.com/reference/readbynumericid)

**Status**: ✅ **VERIFIED** - Field names match API

---

### 6. Trip Message Endpoints

**API Documentation**: 
- `GET /tripmsgs/{messageId}` - Read a specific message
- `GET /tripmsgs/{tripId}` - Get messages for a trip
- `GET /tripmsgs/{requestId}/chat` - Get messages for a specific request/RFQ

**Codebase Usage**: ✅ **CORRECT**

- **MCP Server** (`mcp-servers/avinode-mcp-server/src/index.ts`):
  ```typescript
  // getTripMessages function:
  if (params.request_id) {
    endpoint = `/tripmsgs/${identifier}/chat`;  // Per API docs
  } else if (params.trip_id) {
    endpoint = `/tripmsgs/${identifier}`;       // Per API docs
  }
  ```

**Status**: ✅ **VERIFIED** - Endpoints match API documentation

---

## Summary

All field names in the codebase match the Avinode API documentation:

| Field Category | API Field Name | Codebase Usage | Status |
|----------------|----------------|----------------|--------|
| Quote ID | `quote_id` | `quote_id` (snake_case) | ✅ Verified |
| Price (PRIMARY) | `sellerPrice.price` | `sellerPrice.price` | ✅ Verified |
| Price (FALLBACK) | `pricing.total` | `pricing.total` | ✅ Verified |
| Currency (PRIMARY) | `sellerPrice.currency` | `sellerPrice.currency` | ✅ Verified |
| Currency (FALLBACK) | `pricing.currency` | `pricing.currency` | ✅ Verified |
| Status | `status`, `sourcingDisplayStatus` | Both fields used | ✅ Verified |
| Message (PRIMARY) | `sellerMessage` | `sellerMessage` | ✅ Verified |
| Message (FALLBACK) | `notes` | `notes` | ✅ Verified |
| RFQ ID | `rfq_id` | `rfq_id` | ✅ Verified |
| Trip ID | `trip_id` | `trip_id` | ✅ Verified |

---

## Notes

1. **sellerPrice is PRIMARY**: While the API schema documentation may show `pricing.total`, the actual API responses (verified via test script) return `sellerPrice.price` as the PRIMARY pricing field. The codebase correctly prioritizes `sellerPrice.price` over `pricing.total`.

2. **Field Name Consistency**: The codebase uses snake_case (`quote_id`, `rfq_id`, `trip_id`) to match the API, but converts to camelCase (`quoteId`) in the UI layer for React component props.

3. **Status Mapping**: The codebase correctly maps `sourcingDisplayStatus === 'Accepted'` to `rfqStatus = 'quoted'` per API behavior.

4. **Message Sources**: The codebase correctly prioritizes `sellerMessage` (from quote details) over `notes` field, and also retrieves trip messages from `/tripmsgs` endpoints.

---

## References

- [Avinode API Reference - Read Message](https://developer.avinodegroup.com/reference/readmessage)
- [Avinode API Reference - Read Trip RFQs](https://developer.avinodegroup.com/reference/readtriprfqs)
- [Avinode API Reference - Read RFQ by Numeric ID](https://developer.avinodegroup.com/reference/readbynumericid)
- [Avinode API Reference - Create Trip](https://developer.avinodegroup.com/reference/createtrip)
- [Avinode API Reference - Create RFQ](https://developer.avinodegroup.com/reference/createrfq_1)
- [Avinode Webhooks Documentation](https://developer.avinodegroup.com/docs/avinode-webhooks)
- Test Script Analysis: `docs/testing/TEST_SCRIPT_ANALYSIS.md`
- RFQ Data Schema: `docs/api/AVINODE_RFQ_DATA_SCHEMA.md`
