# Task ID: TASK013
# Task Name: Handle Streaming Errors
# Parent User Story: [[US005-handle-chat-errors|US005 - See graceful error handling when things go wrong]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Detect errors during SSE streaming (malformed data, server errors, unexpected stream termination) and preserve any partial content that was successfully received before the error.

## Acceptance Criteria
- Malformed JSON in SSE data lines is caught and logged without crashing
- HTTP error status codes (4xx, 5xx) in SSE responses are detected
- Unexpected stream termination (network drop) is detected via reader error
- Partial content received before the error is preserved and displayed
- Error details are passed to the UI for display (error type, message)
- Parser continues processing after non-fatal errors (e.g., single bad JSON line)

## Implementation Details
- **File(s)**: `lib/chat/parsers/sse-parser.ts`
- **Approach**: Wrap JSON.parse calls in try-catch to handle malformed data lines. Check the response status before starting stream parsing. Listen for `reader.read()` rejections to detect stream termination. Maintain accumulated content in a variable that persists through errors. Return both the accumulated content and the error in the `SSEParseResult`. Distinguish between fatal errors (stop parsing) and non-fatal errors (skip line, continue).

## Dependencies
- [[TASK004-implement-sse-streaming-parser|TASK004]] (SSE parser is the target of these error handling additions)
