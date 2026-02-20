# Task ID: TASK123
# Task Name: Webhook Status Indicator
# Parent User Story: [[US062-view-webhook-status|US062 - Webhook Event Status Display]]
# Status: Done
# Priority: Medium
# Estimate: 2h

## Description
Create a UI component that displays the status of the most recent Avinode webhook event. The indicator should show the last event time and event type, giving the user visibility into whether the webhook connection is active and what data has been received.

## Acceptance Criteria
- Component displays the timestamp of the last received webhook event
- Component displays the event type (e.g., TripChatSeller, TripRequestSellerResponse)
- Visual indicator shows connected/disconnected state
- Timestamp updates in real-time when new events arrive via SSE
- Graceful display when no events have been received yet
- Responsive layout that works in sidebar and main content areas

## Implementation Details
- **File(s)**: components/avinode/webhook-status-indicator.tsx
- **Approach**: Build a React component that subscribes to the SSE endpoint for Avinode events. Maintain local state for last event time and type. Use a colored dot or icon to indicate connection status (green = recent event, yellow = stale, red = no events). Format timestamps relative to current time (e.g., "2 minutes ago").

## Dependencies
- SSE endpoint for Avinode events (/api/avinode/events)
