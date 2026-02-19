# Task ID: TASK022
# Task Name: Render Quote Results UI
# Parent User Story: [[US008-extract-quotes-from-stream|US008 - See flight quotes displayed as rich cards]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Render the RfqResultsUI or RfqQuoteDetailsCard components from extracted and transformed quote data. Display flight quotes as rich, interactive cards in the chat message flow.

## Acceptance Criteria
- Single quote renders as an `RfqQuoteDetailsCard`
- Multiple quotes render as an `RfqResultsUI` list/grid
- Each card shows aircraft type, operator, price, and status
- Cards are interactive (expandable for details, clickable for booking)
- Empty state is shown when no quotes are available
- Loading skeleton is shown while quotes are being fetched
- Component integrates seamlessly into the chat message flow

## Implementation Details
- **File(s)**: `components/mcp-ui/composites/RfqResultsUI.tsx`
- **Approach**: Create a composite component that receives an array of `RFQFlight` objects. If a single quote, render `RfqQuoteDetailsCard` directly. If multiple, render a scrollable list of `RfqFlightCard` components with summary stats at the top (number of quotes, price range). Register the component in the `tool-ui-registry` for `get_rfq` and `get_quote` tool names. Use design system card and grid tokens.

## Dependencies
- [[TASK021-transform-rfq-flight|TASK021]] (RFQ transformer provides normalized data)
- [[TASK006-extract-display-tool-calls|TASK006]] (ToolUIRenderer routes to this component)
- [[TASK025-implement-quote-card|TASK025]] (RfqFlightCard is used within the results UI)
