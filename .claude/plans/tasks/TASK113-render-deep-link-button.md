# Task ID: TASK113
# Task Name: Render Avinode Deep Link CTA Button
# Parent User Story: [[US057-open-avinode-via-deep-link|US057 - Open Avinode trip via deep link]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Render a prominent call-to-action (CTA) button that opens the Avinode deep link for a created trip. The button should be visually distinctive, clearly labeled, and positioned prominently within the chat interface to guide the sales representative to take action in Avinode.

## Acceptance Criteria
- Renders a prominent button with "Open in Avinode" label and Avinode icon
- Button is visually distinctive (primary/accent color, larger size)
- Displays the trip ID for reference
- Shows the trip status (e.g., "Ready for Review")
- Button is disabled if no deep link is available
- Includes tooltip explaining what happens when clicked
- Accessible with proper ARIA labels
- Works with the AvinodeDeepLinks component

## Implementation Details
- **File(s)**: components/avinode/avinode-deep-links.tsx
- **Approach**: Enhance or create the AvinodeDeepLinks component to render a prominent CTA button. Use the design system Button component with primary variant and larger size. Include an Avinode-themed icon. Accept deep_link URL and trip_id as props. Render contextual information (trip ID, status) above or alongside the button.

## Dependencies
- Avinode MCP create_trip tool must return deep_link URL
- Design system Button component
- Trip data must be available from agent execution
