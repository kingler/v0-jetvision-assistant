# Task ID: TASK068
# Task Name: Show type, model, year, capacity, tail, photo
# Parent User Story: [[US032-view-aircraft-details|US032 - View aircraft details in quote]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Display detailed aircraft information within the quote card, including aircraft type category, specific model, manufacturing year, passenger capacity, tail number, and aircraft photo when available.

## Acceptance Criteria
- Aircraft type/category is displayed (e.g., "Heavy Jet", "Midsize", "Light Jet")
- Specific model is shown (e.g., "Gulfstream G650", "Citation XLS+")
- Manufacturing year is displayed
- Passenger capacity is shown with icon
- Tail number is displayed (if available from the quote)
- Aircraft photo is shown if a URL is provided in the quote data
- Photo has proper aspect ratio and fallback placeholder
- All fields handle null/missing values gracefully
- Layout is structured as a detail grid within the card

## Implementation Details
- **File(s)**: `components/avinode/rfq-flight-card.tsx`
- **Approach**: Add an aircraft details section to the RFQFlightCard component. Use a compact grid layout showing the key aircraft specifications. The aircraft photo (if available) is displayed as a small thumbnail with lazy loading and a fallback airplane icon placeholder. Data comes from the quote record which is populated by the get_quote MCP call during webhook processing.

## Dependencies
- [[TASK064-store-quote-database|TASK064]] (store-quote-database) - Aircraft data comes from stored quotes
