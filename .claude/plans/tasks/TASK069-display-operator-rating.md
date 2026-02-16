# Task ID: TASK069
# Task Name: Star rating with numeric value
# Parent User Story: [[US033-view-operator-rating|US033 - View operator rating in quote]]
# Status: Done
# Priority: Medium
# Estimate: 1h

## Description
Display the operator's Avinode rating as a star rating visualization with the numeric value. This helps the sales representative quickly assess operator quality when comparing quotes.

## Acceptance Criteria
- Star rating displays 1-5 stars based on the operator's Avinode rating
- Supports half-star granularity (e.g., 4.5 stars)
- Numeric value shown next to stars (e.g., "4.5/5")
- Stars use appropriate color (gold/amber for filled, gray for empty)
- Handles missing/null rating values (shows "No rating" or "N/A")
- Rating is displayed in the operator section of the quote card
- Stars are SVG-based for crisp rendering at any size
- Accessible: screen reader text describes the rating

## Implementation Details
- **File(s)**: `components/avinode/rfq-flight-card.tsx`
- **Approach**: Create a star rating display within the RFQFlightCard's operator section. Use SVG star icons with fill clipping for partial stars. The numeric value from the quote data determines the fill level. A small utility calculates the full, half, and empty star counts from the decimal rating value.

## Dependencies
- [[TASK064-store-quote-database|TASK064]] (store-quote-database) - Operator rating comes from stored quote data
