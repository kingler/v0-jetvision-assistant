# Task ID: TASK024
# Task Name: Preserve Partial Content on Error
# Parent User Story: [[US009-handle-streaming-errors|US009 - Recover from streaming errors without losing content]]
# Status: Done
# Priority: High
# Estimate: 1h

## Description
Ensure that accumulated text content is preserved when a streaming error occurs. The user should still see whatever content was successfully received before the failure, rather than losing it all.

## Acceptance Criteria
- Content accumulated before the error remains visible in the chat
- Partial content is marked as incomplete (visual indicator)
- Partial content is still saved to the database for history
- Error message is appended after the partial content, not replacing it
- User can retry the message and the new response replaces the partial content
- No content duplication occurs if the user retries

## Implementation Details
- **File(s)**: `lib/chat/hooks/use-streaming-chat.ts`
- **Approach**: In the error handler of the streaming hook, do NOT reset `streamingContent` to empty. Instead, keep the current accumulated value. Set an `isPartial` flag on the message state. When persisting, save with `{ status: 'partial', content: accumulatedContent }`. On retry, clear the partial message before starting a new stream. The UI should render partial content normally but append an error indicator (e.g., "[Response interrupted]") and the retry button.

## Dependencies
- [[TASK023-handle-sse-connection-errors|TASK023]] (error detection triggers the preservation logic)
- [[TASK016-accumulate-streaming-content|TASK016]] (content accumulator provides the partial content)
