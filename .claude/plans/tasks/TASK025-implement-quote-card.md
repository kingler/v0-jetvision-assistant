# Task ID: TASK025
# Task Name: Implement Quote Card Component
# Parent User Story: [[US010-view-quote-card-in-chat|US010 - View detailed quote card with aircraft and pricing]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Implement the RFQ flight card component that displays a flight quote with aircraft details, operator information, pricing, status badge, and amenity icons.

## Acceptance Criteria
- Card displays aircraft type, category, and year of manufacture
- Operator name and rating are shown
- Price is displayed with correct currency formatting
- Status badge shows current quote status (available, expired, withdrawn) with appropriate color
- Amenity icons are displayed for available amenities
- Card has a hover state and click interaction
- Aircraft image is displayed if available, with fallback placeholder
- Card layout is responsive (stacks on mobile, horizontal on desktop)

## Implementation Details
- **File(s)**: `components/avinode/rfq-flight-card.tsx`
- **Approach**: Create a card component using the design system card tokens. Layout with a header (aircraft image + type), body (operator info, route, pricing), and footer (amenities + actions). Use `FlightRequestStageBadge` for status display. Format prices with `Intl.NumberFormat`. Display aircraft image with `next/image` and a skeleton loader. Include expand/collapse for additional details (flight time, distance, notes).

## Dependencies
- [[TASK021-transform-rfq-flight|TASK021]] (RFQ transformer provides the RFQFlight data shape)
