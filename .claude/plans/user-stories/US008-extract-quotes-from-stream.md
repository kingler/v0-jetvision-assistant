# User Story ID: US008
# Title: Extract Quotes from Stream
# Parent Epic: [[EPIC002-streaming-realtime|EPIC002 - Real-Time Streaming and Data Extraction]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As an ISO agent, I want quotes to be automatically extracted from AI responses, so that quote cards render inline.

## Acceptance Criteria

### AC1: Quote UI renders on get_rfq or get_quote result
**Given** the AI calls get_rfq or get_quote
**When** the tool result includes quote data
**Then** RfqResultsUI or RfqQuoteDetailsCard renders

### AC2: Quote details display correctly
**Given** multiple quotes exist
**When** they render
**Then** each shows operator, aircraft, price, and status

## Tasks
- [[TASK020-extract-quotes-sse|TASK020 - Extract quotes from SSE]]
- [[TASK021-transform-rfq-flight|TASK021 - Transform to RFQFlight format]]
- [[TASK022-render-quote-ui|TASK022 - Render quote UI components]]

## Technical Notes
- Quote extraction occurs when the SSE parser detects `get_rfq` or `get_quote` tool results
- Raw quote data is transformed into the `RFQFlight` format used by the UI components
- `RfqResultsUI` displays a list of quotes from an RFQ response
- `RfqQuoteDetailsCard` displays detailed information for a single quote
- Components are located in `components/avinode/` directory
- The `rfq-flight-card.tsx` component handles the flight card rendering with operator, aircraft, price, and status fields
- Quote data is stored in the SSEParseResult's `quotes` field
