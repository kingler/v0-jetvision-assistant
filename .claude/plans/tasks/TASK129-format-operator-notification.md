# Task ID: TASK129
# Task Name: Format Operator Message Notification
# Parent User Story: [[US066-receive-operator-message-notification|US066 - Operator Message Notification in Chat]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Implement the formatOperatorMessageNotification function that transforms raw operator message webhook data into a structured notification suitable for display in the chat interface as a system message.

## Acceptance Criteria
- Function accepts raw webhook message data and returns formatted notification
- Notification includes operator name, company, and message preview
- Notification includes trip context (route, trip ID)
- Timestamp is formatted in user-friendly format
- Message content is truncated if too long (with "View full message" indicator)
- Function handles missing/optional fields gracefully
- Output conforms to the system message format used in chat

## Implementation Details
- **File(s)**: lib/chat/agent-notifications.ts
- **Approach**: Create a `formatOperatorMessageNotification` function that takes the webhook event payload and constructs a notification object. Extract operator name, company, message text, and trip details. Format the notification with an appropriate icon/badge, readable timestamp, and truncated message preview. Return an object compatible with the chat message rendering system.

## Dependencies
- [[TASK121-process-chat-webhook|TASK121]] (webhook processing provides the raw data)
