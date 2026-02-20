# Task ID: TASK023
# Task Name: Handle SSE Connection Errors
# Parent User Story: [[US009-handle-streaming-errors|US009 - Recover from streaming errors without losing content]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Detect connection drops, network errors, and timeouts during SSE streaming. Surface these errors to the user while preserving any content received before the failure.

## Acceptance Criteria
- Network disconnection during streaming is detected within 5 seconds
- Request timeout (configurable, default 60s) triggers an error
- HTTP error responses (4xx, 5xx) before streaming starts are caught
- AbortController signal is used for manual cancellation support
- Error type is classified (network, timeout, server_error, parse_error)
- Error is surfaced via the `onError` callback with type and message
- Stream reader is properly closed/released on error

## Implementation Details
- **File(s)**: `lib/chat/hooks/use-streaming-chat.ts`
- **Approach**: In the `useStreamingChat` hook, wrap the fetch call and stream reading in try-catch blocks. Use `AbortController` with a timeout signal for request timeout detection. Check `response.ok` before starting stream parsing. Handle `TypeError` from fetch (network errors) and `DOMException` from abort. Classify errors and call `setStreamError({ type, message })`. Ensure the `ReadableStreamDefaultReader` is released via `reader.releaseLock()` in the finally block.

## Dependencies
- [[TASK015-implement-sse-parser|TASK015]] (SSE parser is where errors occur during streaming)
- [[TASK016-accumulate-streaming-content|TASK016]] (content accumulation state must persist through errors)
