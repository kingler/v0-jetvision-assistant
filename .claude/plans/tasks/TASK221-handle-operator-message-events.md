# Task ID: TASK221
# Task Name: Handle Operator Message Events
# Parent User Story: [[US117-receive-operator-message-notification-ws|US117 - Handle incoming webhook events for operator messages]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Implement an `onMessageReceived` callback within the webhook subscription hook that processes incoming operator messages from the Avinode webhook stream. When a `TripChatSeller` event is received, the callback should parse the message payload, extract operator details and message content, and surface it to the chat interface.

## Acceptance Criteria
- `onMessageReceived` callback is defined and invoked when a `TripChatSeller` webhook event arrives
- Operator name, message body, and timestamp are correctly extracted from the event payload
- Messages are forwarded to the chat state for display in the conversation thread
- Invalid or malformed message events are handled gracefully without crashing
- Unit tests cover callback invocation, payload parsing, and error handling

## Implementation Details
- **File(s)**: `lib/chat/hooks/use-webhook-subscription.ts`
- **Approach**: Add an `onMessageReceived` callback parameter to the webhook subscription hook. Inside the SSE event handler, detect `TripChatSeller` event types and invoke the callback with parsed operator message data. Use TypeScript interfaces for the message payload shape.

## Dependencies
- [[TASK121-process-chat-webhook|TASK121]] (process-chat-webhook) must be complete for webhook event stream to be available
- [[TASK125-operator-message-thread|TASK125]] (operator-message-thread) for threading context
