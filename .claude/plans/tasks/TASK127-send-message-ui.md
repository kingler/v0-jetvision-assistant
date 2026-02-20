# Task ID: TASK127
# Task Name: Send Message UI
# Parent User Story: [[US065-send-message-to-operator|US065 - Send Message to Operator]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Create a message input component within the operator message thread that allows the user to compose and send messages to operators. The input should be inline with the message thread for a seamless chat experience.

## Acceptance Criteria
- Text input field is displayed at the bottom of the operator message thread
- Send button triggers message submission
- Enter key submits the message (Shift+Enter for newline)
- Input is cleared after successful send
- Loading state shown while message is being sent
- Error state displayed if send fails
- Input is disabled while a message is in flight
- Sent message appears optimistically in the thread

## Implementation Details
- **File(s)**: components/message-components/operator-chat-inline.tsx
- **Approach**: Build an inline chat input component with a textarea and send button. On submit, call the message send handler (which invokes the MCP tool). Show optimistic UI by immediately adding the message to the local thread state. Handle success/failure states and roll back optimistic update on error.

## Dependencies
- [[TASK125-operator-message-thread|TASK125]] (operator message thread for context)
- [[TASK128-call-send-trip-message|TASK128]] (MCP tool call for actual sending)
