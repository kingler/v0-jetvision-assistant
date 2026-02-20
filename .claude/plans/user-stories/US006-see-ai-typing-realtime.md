# User Story ID: US006
# Title: See AI Typing in Real-Time via SSE
# Parent Epic: [[EPIC002-streaming-realtime|EPIC002 - Real-Time Streaming and Data Extraction]]
# Status: Implemented
# Priority: Critical
# Story Points: 5

## User Story
As an ISO agent, I want to see the AI typing in real-time via SSE, so that the interaction feels responsive.

## Acceptance Criteria

### AC1: Incremental text rendering
**Given** the AI is responding
**When** SSE chunks arrive
**Then** text renders incrementally

### AC2: Tool call tracking
**Given** the stream is active
**When** a chunk contains tool call data
**Then** the tool call is tracked and displayed

### AC3: Complete SSEParseResult on stream end
**Given** the stream completes
**When** the done event fires
**Then** the full SSEParseResult is available with content, toolCalls, tripData, rfqData, quotes, deepLink, workflowStatus

## Tasks
- [[TASK015-implement-sse-parser|TASK015 - Implement SSE parser]]
- [[TASK016-accumulate-streaming-content|TASK016 - Accumulate streaming content]]
- [[TASK017-parse-structured-data|TASK017 - Parse structured data from stream]]

## Technical Notes
- The SSE parser (`lib/chat/`) processes Server-Sent Events from the `/api/chat-sessions/messages` endpoint
- SSEParseResult contains: `content`, `toolCalls`, `tripData`, `rfqData`, `quotes`, `deepLink`, `workflowStatus`
- Tool calls are detected by parsing function call delimiters in the SSE stream
- The parser uses an accumulator pattern to build up the full response incrementally
- React state updates during streaming are debounced to maintain UI responsiveness
- The `done` event signals the end of the stream and triggers final data extraction
