# User Story ID: US009
# Title: Handle Streaming Errors
# Parent Epic: [[EPIC002-streaming-realtime|EPIC002 - Real-Time Streaming and Data Extraction]]
# Status: Implemented
# Priority: High
# Story Points: 2

## User Story
As an ISO agent, I want streaming errors to be handled gracefully, so that I don't lose partial responses.

## Acceptance Criteria

### AC1: Preserve partial content on SSE failure
**Given** SSE streaming fails mid-response
**When** the error occurs
**Then** partial content is preserved and error notification shows

### AC2: Structured error detection and display
**Given** a structured error in SSE data
**When** extractSSEError detects it
**Then** the error message displays to the user

## Tasks
- [[TASK023-handle-sse-connection-errors|TASK023 - Handle SSE connection errors]]
- [[TASK024-preserve-partial-content|TASK024 - Preserve partial content on error]]

## Technical Notes
- The SSE parser includes error handling for connection drops, timeouts, and malformed data
- `extractSSEError` is a utility function that parses structured error objects from SSE event data
- Partial content accumulated before the error is committed to the message state
- The error notification appears below the partial content so the user can see what was received
- Network-level errors (connection reset, timeout) are distinguished from application-level errors (tool failures, rate limits)
- Retry logic is available but not automatic -- the user must explicitly choose to retry
