# Task ID: TASK054
# Task Name: Expandable segments list for multi-city
# Parent User Story: [[US023-view-trip-summary-card|US023 - View trip summary card]]
# Status: Done
# Priority: Medium
# Estimate: 2h

## Description
Add an expandable/collapsible segments list to the TripSummaryCard for multi-city trips. When collapsed, shows a summary; when expanded, reveals all individual flight segments with their details.

## Acceptance Criteria
- Collapsed state shows first city → last city with segment count badge
- Expand/collapse toggle button with chevron icon
- Expanded state shows all segments in order with leg numbers
- Each segment displays departure → arrival airports, date, and time
- Smooth expand/collapse animation using motion presets
- Collapse state defaults to collapsed for 4+ segments, expanded for 2-3
- Toggle state is maintained within the component lifecycle
- Accessible: keyboard operable, proper ARIA expanded state

## Implementation Details
- **File(s)**: `components/avinode/trip-summary-card.tsx`
- **Approach**: Add a collapsible section within TripSummaryCard that renders when trip_type is "multi_city" or when legs count is 3+. Use React state for toggle management and CSS transitions or Framer Motion for smooth animation. The collapsed summary extracts first departure and last arrival from the legs array.

## Dependencies
- [[TASK053-implement-trip-summary-card|TASK053]] (implement-trip-summary-card) - Base card component
- [[TASK047-display-multi-city-segments|TASK047]] (display-multi-city-segments) - Multi-city display logic
