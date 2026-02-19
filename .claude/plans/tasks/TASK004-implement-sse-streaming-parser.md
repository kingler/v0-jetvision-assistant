# Task ID: TASK004
# Task Name: Implement SSE Streaming Parser
# Parent User Story: [[US002-view-ai-streaming-response|US002 - See assistant response stream in real-time]]
# Status: Done
# Priority: Critical
# Estimate: 5h

## Description
Parse the Server-Sent Events (SSE) stream from the chat API. Extract content chunks, tool call results, and structured data (trip data, RFQ data, quotes) from the stream as they arrive.

## Acceptance Criteria
- Correctly parses `data:` lines from the SSE stream
- Handles multi-line `data:` payloads
- Extracts text content chunks and passes to `onContent` callback
- Extracts tool call results and passes to `onToolCall` callback
- Extracts structured data (tripData, rfqData, quotes, deepLink, workflowStatus)
- Handles `[DONE]` sentinel to close the stream
- Gracefully handles malformed JSON in data lines
- Returns `SSEParseResult` with all accumulated data

## Implementation Details
- **File(s)**: `lib/chat/parsers/sse-parser.ts`
- **Approach**: Implement a streaming parser that reads from a `ReadableStream<Uint8Array>`, decodes with `TextDecoder`, and splits on `\n\n` boundaries. Each event is parsed for its `data:` field. JSON payloads are parsed and routed to appropriate handlers based on their `type` field (content, tool_call, structured_data). Accumulate results into an `SSEParseResult` object.

## Dependencies
- [[TASK002-handle-message-submission|TASK002]] (message submission returns the SSE stream)
