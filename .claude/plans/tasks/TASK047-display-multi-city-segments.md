# Task ID: TASK047
# Task Name: Trip card with expandable segment list
# Parent User Story: [[US019-specify-multi-city|US019 - Create multi-city flight requests]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Update the TripSummaryCard to display multi-city trips with an expandable segment list. The card shows a summary overview and allows expanding to see all individual leg details.

## Acceptance Criteria
- TripSummaryCard shows a compact summary for multi-city trips (first → last city, total legs count)
- Expandable/collapsible section reveals all individual segments
- Each segment shows leg number, departure → arrival, date, and time
- Visual timeline or numbered list connects the segments
- Collapse state persists within the chat session
- Card header shows "Multi-City" trip type indicator
- Responsive layout works on mobile screens

## Implementation Details
- **File(s)**: `components/avinode/trip-summary-card.tsx`
- **Approach**: Add an expandable section to TripSummaryCard that triggers when trip_type is "multi_city" and legs count is 3+. Use a collapsible component with smooth animation. The collapsed state shows origin → final destination with a "N segments" badge. Expanded state renders each leg with a vertical timeline connector.

## Dependencies
- [[TASK046-create-multi-city-trip|TASK046]] (create-multi-city-trip) - Requires multi-city trip data
- [[TASK053-implement-trip-summary-card|TASK053]] (implement-trip-summary-card) - Base card component
