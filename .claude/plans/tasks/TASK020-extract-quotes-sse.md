# Task ID: TASK020
# Task Name: Extract Quotes from SSE Stream
# Parent User Story: [[US008-extract-quotes-from-stream|US008 - See flight quotes displayed as rich cards]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Detect `get_rfq` and `get_quote` tool results in the SSE stream and extract quote data including aircraft details, pricing, operator information, and availability.

## Acceptance Criteria
- `get_rfq` tool call results are identified and RFQ summary data is extracted
- `get_quote` tool call results are identified and individual quote data is extracted
- Quote data includes: aircraft type, operator name, price, currency, availability status
- Multiple quotes from a single RFQ are collected into an array
- Quote data is typed with the `RFQQuote` interface
- Extracted data triggers the `onStructuredData` callback for immediate UI rendering
- Malformed quote data is handled gracefully with fallback values

## Implementation Details
- **File(s)**: `lib/chat/parsers/sse-parser.ts`
- **Approach**: Add detection cases for `tool_name === 'get_rfq'` and `tool_name === 'get_quote'` in the SSE parser. For `get_rfq`, extract the RFQ summary (route, dates, number of quotes). For `get_quote`, extract individual quote details (aircraft, operator, price, status, amenities). Append quotes to the `SSEParseResult.quotes` array. Call `onStructuredData({ type: 'quoteReceived', data: quote })` for each quote.

## Dependencies
- [[TASK017-parse-structured-data|TASK017]] (structured data parsing infrastructure)
