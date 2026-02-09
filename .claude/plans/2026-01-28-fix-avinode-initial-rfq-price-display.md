# Fix Avinode Initial RFQ Price Display

**Created:** 2026-01-28
**Status:** Draft
**Priority:** High

---

## Goal

Ensure the `RFQFlightCard` component always displays the initial RFQ price from Avinode (and any later operator-modified price), and never shows "Price Pending" when price data exists in the API responses.

---

## Problem Statement

Currently, the RFQ display shows "Price Pending" even when Avinode provides an initial estimated price for unanswered RFQs. This creates a poor user experience where sales representatives cannot see the expected pricing until an operator responds with a formal quote.

**Root Causes:**
1. RFQ-only transformers default `totalPrice` to `0` instead of extracting `estimatedPrice`
2. Price extraction logic is inconsistent between `rfq-transform.ts` and `rfq-transformer.ts`
3. Status coercion rules don't account for RFQs with initial prices but no operator response

---

## Key Files

| File | Purpose |
|------|---------|
| `components/avinode/rfq-flight-card.tsx` | Price display helper and UI |
| `lib/avinode/rfq-transform.ts` | Normalizer for RFQ/quote data into `RFQFlight` |
| `lib/chat/transformers/rfq-transformer.ts` | Chat RFQ/quote transformer |
| `lib/chat/types/index.ts` | RFQ/Quote and RFQFlight types |
| `__tests__/unit/components/avinode/rfq-flight-card.test.tsx` | RFQ card tests |
| `__tests__/unit/lib/avinode/rfq-transform.test.ts` | RFQ normalizer tests |

---

## Implementation Steps

### Step 1: Align Price Extraction Logic Across Transformers

**File:** `lib/avinode/rfq-transform.ts`

Update `normalizeQuoteToFlight` to reuse or mirror the `extractPrice` logic from `lib/chat/transformers/rfq-transformer.ts`, including support for `estimatedPrice` / `estimated_price` fallback.

**Price Extraction Priority Order:**
1. `sellerPrice.price`
2. `pricing.total`
3. `pricing.amount`
4. Direct numeric `totalPrice`
5. `total_price`
6. `price`
7. Object `totalPrice.amount`
8. `estimatedPrice.amount` (fallback for unanswered RFQs)
9. `estimated_price.amount`

**Actions:**
- [ ] Create shared `extractPrice()` utility or align both transformers
- [ ] Extend debug logging to include estimated price fields
- [ ] Add unit tests for each price field variant

---

### Step 2: Fix RFQ-Only Normalization to Carry Initial Price

**File:** `lib/chat/transformers/rfq-transformer.ts`

In `convertRfqToRFQFlight`, replace the hardcoded `totalPrice: 0` with logic that:

1. Looks for RFQ-level price/estimate fields:
   - `estimatedPrice`
   - `estimated_price`
   - `pricing` (if available at RFQ level)
2. Falls back to `0` only when absolutely no price/estimate is present

**Actions:**
- [ ] Update `convertRfqToRFQFlight` to extract initial price
- [ ] Mirror this behavior in any other RFQ-only normalization paths
- [ ] Add debug logging for RFQ price extraction

---

### Step 3: Enforce Business Rule - Price Implies Quoted Status

**Business Rule:** When `pricingTotal > 0`, override `rfqStatus` to `'quoted'` unless it is explicitly `'declined'` or `'expired'`.

**File:** `lib/avinode/rfq-transform.ts`

**Actions:**
- [ ] Harden the existing rule in `normalizeQuoteToFlight`
- [ ] Apply same rule in `convertQuoteToRFQFlight`
- [ ] Add JSDoc comments clarifying this is a Jetvision-specific UX rule

```typescript
/**
 * Jetvision UX Rule: When a positive price exists, the RFQ should display
 * as 'quoted' to indicate actionable pricing is available.
 *
 * This differs from Avinode's native status semantics where 'unanswered'
 * may still have an estimated price from the initial RFQ creation.
 *
 * Exception: 'declined' and 'expired' statuses are never overridden.
 */
```

---

### Step 4: Revisit formatPrice Fallback Semantics

**File:** `components/avinode/rfq-flight-card.tsx`

Review `formatPrice` and decide on fallback behavior:

**Option A (Recommended):** Defense-in-depth
- Keep "Price Pending" as fallback
- Rely on transformers to always populate non-zero `totalPrice` when data exists
- "Price Pending" becomes a signal of a transformer bug

**Option B:** Explicit unavailable state
- Change fallback to "Price Unavailable" for genuine data-missing cases
- "Price Pending" removed entirely

**Actions:**
- [ ] Review and document chosen approach
- [ ] Update `formatPrice` if Option B chosen
- [ ] Add/update unit tests for fallback behavior

---

### Step 5: Extend and Adjust Tests

#### 5a. RFQ Normalizer Tests

**File:** `__tests__/unit/lib/avinode/rfq-transform.test.ts`

Add test cases for:
- [ ] Quotes/RFQs with only `estimatedPrice` populated (Unanswered status)
  - Verify `RFQFlight.totalPrice` is populated
  - Verify `rfqStatus` is coerced to `'quoted'`
- [ ] RFQs without any price data
  - Confirm `totalPrice = 0`
  - Confirm correct fallback state

#### 5b. RFQFlightCard Tests

**File:** `__tests__/unit/components/avinode/rfq-flight-card.test.tsx`

Add/update test cases for:
- [ ] Flight with `rfqStatus: 'unanswered'` and `totalPrice > 0`
  - Assert formatted currency amount is displayed
  - Assert "Price Pending" is NOT displayed
- [ ] Flight with `totalPrice = 0` and no price fields
  - Assert correct fallback text is displayed

---

### Step 6: End-to-End Verification

Using existing test helpers (e.g., `scripts/test-rfq-flow.ts`), simulate:

1. **RFQ Creation with Initial Price**
   - Create RFQ with `estimatedPrice` but no operator responses
   - Status: Unanswered
   - Expected: Initial price displayed

2. **Operator Response Updates Price**
   - Operator submits quote with different price
   - Status: Quoted
   - Expected: Updated price replaces initial price

3. **Genuinely Missing Price**
   - RFQ/Quote with no price data at all
   - Expected: Fallback text displayed

**Actions:**
- [ ] Create or update E2E test script
- [ ] Document manual verification steps
- [ ] Confirm in rendered UI that prices display correctly

---

## Acceptance Criteria

- [ ] Initial RFQ price from `estimatedPrice` is displayed immediately after RFQ creation
- [ ] Operator-modified price replaces initial price after quote is received
- [ ] "Price Pending" only appears when backend truly has no price data
- [ ] All unit tests pass with 75%+ coverage
- [ ] No regressions in existing RFQ display functionality

---

## Todos

| ID | Task | Status |
|----|------|--------|
| `update-avinode-normalizer` | Extend `normalizeQuoteToFlight` to fully support initial `estimatedPrice` and align with chat `extractPrice` behavior | Pending |
| `fix-rfq-only-price` | Update RFQ-only transformers (e.g., `convertRfqToRFQFlight`) to surface RFQ-level initial prices instead of defaulting to zero | Pending |
| `harden-status-rules` | Ensure status coercion to `quoted` whenever a positive price is present, except for `declined`/`expired` quotes | Pending |
| `adjust-price-pending-tests` | Update/extend RFQFlightCard and normalizer tests to validate initial-price display for Unanswered RFQs and correct fallback behavior when price is genuinely missing | Pending |

---

## Technical Notes

### Avinode Price Types (from API research)

| Price Type | Description |
|------------|-------------|
| **Total Gross** | Complete price including all fees and markups |
| **Total Net** | Base price before additional charges (excluding sales tax) |

### Quote Line Item Types

| Type | Description |
|------|-------------|
| `CREW` | Crew-related charges |
| `POSITIONING` | Positioning/ferry flight charges |
| `CATERING` | Catering charges |
| `OTHER` | Miscellaneous charges |

### Price Breakdown Structure

```typescript
priceBreakdown?: {
  basePrice: number;
  fuelSurcharge?: number;
  taxes: number;
  fees: number;
}
```

---

## References

- [Avinode Download and Respond to RFQs](https://developer.avinodegroup.com/docs/download-respond-rfq)
- [FL3XX Avinode Integration](https://www.fl3xx.com/kb/avinode)
- [Avinode API Basics](https://developer.avinodegroup.com/docs/api-basics)
