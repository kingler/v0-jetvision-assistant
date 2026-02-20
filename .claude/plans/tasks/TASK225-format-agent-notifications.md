# Task ID: TASK225
# Task Name: Format Agent Notifications
# Parent User Story: [[US120-system-message-in-chat|US120 - Format quote and operator message notifications for chat display]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Implement `formatQuoteReceivedMessage` and `formatOperatorMessageNotification` functions that transform raw webhook event data into structured, human-readable notification messages suitable for display in the chat conversation thread.

## Acceptance Criteria
- `formatQuoteReceivedMessage` accepts a quote event payload and returns a formatted message with operator name, aircraft type, price, and availability
- `formatOperatorMessageNotification` accepts an operator message event and returns a formatted notification with operator name, message preview, and timestamp
- Both functions return objects conforming to the chat message interface (role: 'system', content, metadata)
- Edge cases handled: missing fields, null values, zero prices
- Unit tests cover normal formatting, edge cases, and missing data scenarios

## Implementation Details
- **File(s)**: `lib/chat/agent-notifications.ts`
- **Approach**: Create pure functions that accept typed webhook event payloads and return formatted message objects. Use template strings for message formatting. Include metadata fields for the UI to render rich notification cards.

## Dependencies
- [[TASK226-persist-system-messages|TASK226]] (persist-system-messages) to save formatted messages
- [[TASK227-batch-formatting|TASK227]] (batch-formatting) for batched quote notifications
