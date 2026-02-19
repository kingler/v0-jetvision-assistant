# Task ID: TASK019
# Task Name: Render Trip Created UI
# Parent User Story: [[US007-extract-trip-data-from-stream|US007 - See trip created confirmation with Avinode deep link]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Render the TripCreatedUI composite component that displays a trip summary card with route details and an "Open in Avinode" deep link button after a trip is successfully created.

## Acceptance Criteria
- TripSummaryCard displays route (departure -> arrival), dates, and passenger count
- AvinodeDeepLinks renders a clickable "Open in Avinode" button
- Deep link opens in a new tab with `target="_blank"` and `rel="noopener noreferrer"`
- Trip ID is displayed for reference
- Component handles missing optional fields gracefully
- Visual design matches the Avinode workflow UX requirements
- Loading state is shown while trip data is being extracted

## Implementation Details
- **File(s)**: `components/mcp-ui/composites/TripCreatedUI.tsx`
- **Approach**: Create a composite component that composes `TripSummaryCard` and `AvinodeDeepLinks` from `components/avinode/`. Accept `tripData` prop with `tripId`, `deepLink`, route info, and dates. Render the summary card with flight details and the deep link button below. Use design system card tokens for styling. Include an icon (external link) on the deep link button. Add a copy-to-clipboard action for the trip ID.

## Dependencies
- [[TASK018-extract-trip-data-sse|TASK018]] (trip data extraction provides the data)
- [[TASK006-extract-display-tool-calls|TASK006]] (ToolUIRenderer routes to this component)
