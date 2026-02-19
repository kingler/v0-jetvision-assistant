# Task ID: TASK066
# Task Name: Show base, fuel, taxes, total in collapsible section
# Parent User Story: [[US031-view-quote-pricing-breakdown|US031 - View quote pricing breakdown]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Display a detailed pricing breakdown for each operator quote, showing base price, fuel surcharge, taxes/fees, and total price. The breakdown is in a collapsible section that expands to show individual cost components.

## Acceptance Criteria
- Pricing section shows total price prominently
- Collapsible section expands to reveal breakdown: base price, fuel surcharge, taxes/fees
- Each line item shows label and formatted amount
- Total line is visually distinguished (bold, separator line above)
- Currency symbol matches the quote currency
- Collapse/expand toggle with chevron icon
- Default state is collapsed (showing only total)
- Empty/zero values are displayed as "-" or "$0.00"
- Pricing aligns to the right for easy scanning

## Implementation Details
- **File(s)**: `components/avinode/rfq-flight-card.tsx`
- **Approach**: Add a collapsible pricing section within the RFQFlightCard component. The collapsed state shows the total price. Expanding reveals a breakdown table with each cost component. Use the currency formatting utility for consistent display. Apply design system spacing and typography tokens.

## Dependencies
- [[TASK064-store-quote-database|TASK064]] (store-quote-database) - Quote pricing data must be available
