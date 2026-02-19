# Task ID: TASK067
# Task Name: Format prices with correct currency symbol and locale
# Parent User Story: [[US031-view-quote-pricing-breakdown|US031 - View quote pricing breakdown]]
# Status: Done
# Priority: Medium
# Estimate: 1h

## Description
Implement currency formatting for quote prices that correctly displays the currency symbol, thousand separators, and decimal places based on the quote's currency code and the user's locale.

## Acceptance Criteria
- Prices display with the correct currency symbol (e.g., $, EUR, GBP)
- Thousand separators are locale-appropriate (e.g., $1,234,567.00)
- Decimal places follow currency conventions (2 for most, 0 for JPY)
- Supports USD, EUR, GBP, and other common aviation currencies
- Falls back to USD formatting if currency code is unknown
- Handles null/undefined price values gracefully (displays "-")
- Uses Intl.NumberFormat for proper locale handling
- Consistent formatting across all price displays in the app

## Implementation Details
- **File(s)**: `components/avinode/rfq-flight-card.tsx`
- **Approach**: Create or use an existing currency formatting utility function that wraps `Intl.NumberFormat` with the `style: 'currency'` option. Accept a price number and currency code, return a formatted string. Handle edge cases for null, undefined, and zero values. The utility can be shared across components via a lib/utils module.

## Dependencies
- [[TASK066-display-pricing-breakdown|TASK066]] (display-pricing-breakdown) - Uses currency formatting
