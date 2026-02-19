# Task ID: TASK050
# Task Name: Prominent "Open in Avinode" button with deep link
# Parent User Story: [[US021-create-trip-see-deep-link|US021 - Receive Avinode deep link after trip creation]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Display a prominent "Open in Avinode" button that uses the deep link URL returned from trip creation. The button should be visually distinct and clearly communicate that it will open the Avinode Web UI for the sales representative to continue the workflow.

## Acceptance Criteria
- Button labeled "Open in Avinode" is prominently displayed in the trip confirmation card
- Button uses the deep_link URL from the create_trip response
- Button has a distinct visual style (primary action color, icon)
- Button includes an external link icon indicating it opens a new tab
- Button is accessible (proper ARIA labels, keyboard navigable)
- Button is disabled with appropriate messaging if deep_link is unavailable
- Hover state provides visual feedback

## Implementation Details
- **File(s)**: `components/avinode/avinode-deep-links.tsx`
- **Approach**: Create or update the AvinodeDeepLinks component to render a styled button/link that opens the deep link URL. Use the design system's primary button variant with an external link icon. The component accepts the deep_link URL as a prop and renders appropriately based on availability.

## Dependencies
- [[TASK049-create-trip-get-deep-link|TASK049]] (create-trip-get-deep-link) - Requires deep link URL from API
