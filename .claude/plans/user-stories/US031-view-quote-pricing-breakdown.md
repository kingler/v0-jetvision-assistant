# User Story ID: US031
# Title: View Quote Pricing Breakdown
# Parent Epic: [[EPIC007-quote-reception-display|EPIC007 - Quote Management]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As an ISO agent, I want to see detailed pricing breakdowns on quotes, so that I can evaluate costs.

## Acceptance Criteria

### AC1: Pricing Component Display
**Given** a quote has pricing
**When** the details render
**Then** I see base price, fuel surcharge, taxes, and total

### AC2: Currency Formatting
**Given** currency info
**When** price displays
**Then** it's formatted correctly with currency symbol

## Tasks
- [[TASK066-display-pricing-breakdown|TASK066 - Build pricing breakdown component displaying base price, fuel surcharge, taxes, and total]]
- [[TASK067-format-currency|TASK067 - Implement currency-aware price formatting with correct symbols and locale-based number formatting]]

## Technical Notes
- Quote pricing data comes from the Avinode webhook payload (TripRequestSellerResponse event)
- Pricing breakdown includes: base price, fuel surcharge, applicable taxes/fees, and total amount
- Currency formatting uses Intl.NumberFormat for locale-aware display with correct currency symbols (USD, EUR, GBP, etc.)
- The RFQQuoteDetailsCard component (`components/avinode/rfq-flight-card.tsx`) renders the pricing breakdown
- Prices are stored in the database as numeric values with a separate currency code field
- Display format example: "$45,000 USD" or "EUR 38,500"
