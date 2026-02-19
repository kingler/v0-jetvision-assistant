# Task ID: TASK056
# Task Name: FlightRequestStageBadge with 10 stages, labels, colors
# Parent User Story: [[US025-view-request-stage-badge|US025 - Display flight request stage badge]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Implement the FlightRequestStageBadge component that displays the current stage of a flight request. The badge supports 10 distinct stages, each with a specific label, color, and icon. The stage reflects the request's position in the charter flight workflow.

## Acceptance Criteria
- Supports all 10 stages (1: New Request, 2: Searching, 3: Quotes Received, 4: Quote Selected, 5: Proposal Sent, 6: Client Reviewing, 7: Accepted, 8: Declined, 9: Expired, 10: Cancelled)
- Each stage has a unique background color and text color
- Each stage has a human-readable label
- Badge renders as a compact, inline element (pill/tag style)
- Accepts a `stage` prop (number 1-10) to determine display
- Graceful fallback for unknown stage values
- Uses design system color tokens
- Component is accessible with proper color contrast ratios

## Implementation Details
- **File(s)**: `components/flight-request-stage-badge.tsx`
- **Approach**: Create a mapping object that associates each stage number (1-10) with its label, background color, and text color from the design system. The component receives a stage number prop and looks up the corresponding display values. Include a fallback mapping for stages outside the expected range to prevent rendering errors.

## Dependencies
- None (standalone UI component)
