# Task ID: TASK009
# Task Name: Persist Messages to Database
# Parent User Story: [[US003-view-message-history|US003 - View message history when returning to a session]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Save chat messages to Supabase via the message-persistence module. Both user messages and assistant responses (including tool call results and structured data) must be persisted for later retrieval.

## Acceptance Criteria
- User messages are saved immediately upon submission
- Assistant messages are saved after the stream completes
- Tool call results are stored in the message metadata JSON column
- Structured data (tripData, rfqData, quotes) is preserved in metadata
- Messages are associated with the correct session ID
- Failed saves are retried up to 3 times with exponential backoff
- Duplicate messages are prevented (idempotency via message ID)

## Implementation Details
- **File(s)**: `lib/conversation/message-persistence.ts`
- **Approach**: Implement `saveMessage` and `saveAssistantMessage` functions that insert into the Supabase `messages` table. User messages are saved synchronously before the API call. Assistant messages are saved after stream completion with the full content and metadata. Use upsert with a unique message ID to prevent duplicates. Include retry logic with exponential backoff for transient Supabase errors.

## Dependencies
- [[TASK002-handle-message-submission|TASK002]] (message submission triggers persistence)
- [[TASK004-implement-sse-streaming-parser|TASK004]] (SSE parser provides complete assistant message data)
