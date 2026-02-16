# Task ID: TASK125
# Task Name: Operator Message Thread
# Parent User Story: [[US064-view-operator-message-thread|US064 - Operator Message Thread View]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Create a UI component that displays a chronological message thread for each operator. Messages should be organized per operator within a trip context, showing both incoming (operator) and outgoing (broker) messages in a chat-like interface.

## Acceptance Criteria
- Messages are displayed in chronological order (oldest first)
- Each message shows sender identity (operator name or "You")
- Timestamps are displayed for each message
- Incoming and outgoing messages are visually distinct (different alignment/colors)
- Thread loads historical messages on mount
- New messages appear in real-time via SSE updates
- Empty state shown when no messages exist for an operator
- Scrolls to latest message automatically

## Implementation Details
- **File(s)**: components/avinode/operator-message-thread.tsx
- **Approach**: Build a React component that takes an operator ID and trip ID as props. Fetch message history from the database on mount. Subscribe to SSE for real-time updates. Render messages in a scrollable container with different styles for sent vs received messages. Use a ref to auto-scroll to the bottom on new messages.

## Dependencies
- [[TASK121-process-chat-webhook|TASK121]] (messages stored from webhook)
- [[TASK128-call-send-trip-message|TASK128]] (outgoing messages via MCP)
