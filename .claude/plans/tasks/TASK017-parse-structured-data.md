# Task ID: TASK017
# Task Name: Parse Structured Data from Stream
# Parent User Story: [[US006-see-ai-typing-realtime|US006 - Parse and accumulate streaming response data]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Extract structured data fields (tripData, rfqData, quotes, deepLink, workflowStatus) from the SSE stream. These fields drive the rendering of specialized UI components like trip cards, quote displays, and workflow progress indicators.

## Acceptance Criteria
- `tripData` is extracted when a `create_trip` tool result is detected
- `rfqData` is extracted when `get_rfq` tool results arrive
- `quotes` array is populated from `get_quote` tool results
- `deepLink` URL is extracted from trip creation responses
- `workflowStatus` is extracted from workflow status events
- All structured data is typed with TypeScript interfaces
- Missing or partial data does not cause parser errors

## Implementation Details
- **File(s)**: `lib/chat/parsers/sse-parser.ts`
- **Approach**: Within the SSE parser, add detection logic for tool call results. When a tool call event is parsed, check the `tool_name` field. For `create_trip`, extract `tripId`, `deepLink`, and trip metadata into `tripData`. For `get_rfq` and `get_quote`, extract quote details into `rfqData` and `quotes`. For workflow events, extract `stage`, `progress`, and `steps` into `workflowStatus`. Store all in the `SSEParseResult` and call `onStructuredData` callback.

## Dependencies
- [[TASK015-implement-sse-parser|TASK015]] (SSE parser provides the parsing infrastructure)
