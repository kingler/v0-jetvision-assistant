# Task ID: TASK018
# Task Name: Extract Trip Data from SSE Stream
# Parent User Story: [[US007-extract-trip-data-from-stream|US007 - See trip created confirmation with Avinode deep link]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Detect the `create_trip` tool result in the SSE stream and extract the `tripId` and `deepLink` URL for display in the trip confirmation UI.

## Acceptance Criteria
- `create_trip` tool call result is identified in the SSE stream by tool name
- `tripId` (e.g., "trp456789") is extracted from the result payload
- `deepLink` URL (full Avinode Web UI URL) is extracted from the result payload
- Trip metadata (route, dates, passenger count) is extracted if available
- Extracted data is passed to the `onStructuredData` callback immediately
- Missing `tripId` or `deepLink` in the result triggers a warning, not a crash

## Implementation Details
- **File(s)**: `lib/chat/parsers/sse-parser.ts`
- **Approach**: In the tool call detection branch of the SSE parser, add a case for `tool_name === 'create_trip'`. Extract `tripId` from `result.trip_id` or `result.tripId`. Extract `deepLink` from `result.deep_link` or `result.deepLink`. Package into a `TripData` typed object. Call `onStructuredData({ type: 'tripCreated', data: tripData })`. Store in the `SSEParseResult.tripData` field.

## Dependencies
- [[TASK017-parse-structured-data|TASK017]] (structured data parsing infrastructure)
