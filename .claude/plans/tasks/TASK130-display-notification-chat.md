# Task ID: TASK130
# Task Name: Display Notification in Chat
# Parent User Story: [[US066-receive-operator-message-notification|US066 - Operator Message Notification in Chat]]
# Status: Done
# Priority: High
# Estimate: 1h

## Description
Render the formatted operator message notification as a system message in the chat interface. When an operator sends a message, the notification should appear inline in the chat conversation so the user is immediately aware of the incoming communication.

## Acceptance Criteria
- Notification appears as a visually distinct system message in the chat
- System message style differentiates it from user and assistant messages
- Notification shows operator name and message preview
- Clicking the notification navigates to the full operator message thread
- Notification appears in real-time when webhook event is received
- Multiple notifications are displayed in chronological order

## Implementation Details
- **File(s)**: components/chat-interface.tsx
- **Approach**: Add a handler for operator message notification events in the chat interface. When an SSE event for a new operator message is received, call formatOperatorMessageNotification to create the notification, then append it to the chat message list as a system message type. Style the system message with a distinct background color and icon to differentiate from regular conversation messages.

## Dependencies
- [[TASK129-format-operator-notification|TASK129]] (formatOperatorMessageNotification function)
- SSE endpoint delivering real-time events
