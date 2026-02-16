# Task ID: TASK015
# Task Name: Implement Full SSE Parser
# Parent User Story: [[US006-see-ai-typing-realtime|US006 - Parse and accumulate streaming response data]]
# Status: Done
# Priority: Critical
# Estimate: 5h

## Description
Implement the complete SSE parser with `data:` line handling, JSON parsing, content accumulation, and structured result output. This is the core parsing engine that powers all streaming functionality.

## Acceptance Criteria
- Parses `data:` prefixed lines from raw SSE text
- Handles multi-line events separated by `\n\n`
- Correctly parses JSON payloads within `data:` lines
- Accumulates text content into a single string
- Collects tool call results into an array
- Extracts structured data fields (tripData, rfqData, quotes, deepLink, workflowStatus)
- Returns a complete `SSEParseResult` object with all accumulated data
- Handles the `[DONE]` sentinel to signal stream completion
- Gracefully skips malformed lines without crashing

## Implementation Details
- **File(s)**: `lib/chat/parsers/sse-parser.ts`
- **Approach**: Implement `parseSSEStream(stream: ReadableStream, callbacks: SSECallbacks): Promise<SSEParseResult>`. Use `TextDecoderStream` to convert bytes to text. Buffer incoming text and split on `\n\n` to get complete events. For each event, extract the `data:` field. Parse as JSON and route based on the event type. Accumulate content via string concatenation. Collect tool calls and structured data in arrays/objects. Call appropriate callbacks (`onContent`, `onToolCall`, `onStructuredData`, `onError`, `onDone`) as data arrives.

## Dependencies
- [[TASK002-handle-message-submission|TASK002]] (message submission provides the ReadableStream to parse)
