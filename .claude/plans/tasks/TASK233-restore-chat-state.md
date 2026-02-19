# Task ID: TASK233
# Task Name: Restore Chat State from Messages
# Parent User Story: [[US124-resume-existing-session|US124 - Restore chat state from loaded messages]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Implement chat state restoration logic that takes an array of loaded messages from the API and hydrates the chat state hook, including reconstructing any tool call results, system notifications, and conversation context.

## Acceptance Criteria
- Loaded messages are correctly mapped to the chat state message format
- User, assistant, and system messages are all restored with correct roles
- Tool call results and metadata are preserved and renderable
- Chat UI scrolls to the most recent message after restoration
- Loading state is shown during message fetch
- Error state is shown if message loading fails
- Unit tests verify state hydration from various message arrays

## Implementation Details
- **File(s)**: `lib/chat/hooks/use-chat-state.ts`
- **Approach**: Add a `restoreFromMessages` function to the chat state hook that accepts a message array, transforms each message into the internal state format, and sets the messages state. Handle metadata parsing for tool calls and notifications. Set a loading flag during the async operation.

## Dependencies
- [[TASK232-load-session-messages|TASK232]] (load-session-messages) provides the message data
