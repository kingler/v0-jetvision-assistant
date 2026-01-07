# Issues

## Problem Summary

There is a persistent issue where **most RFQ data is successfully retrieved and displayed**, but **three specific fields are not updating or displaying** in the `@rfq-flight-card` component:

1. **Status (`rfqStatus`)** - Does not update (remains as initial value, typically "unanswered")
2. **TotalPrice/Price (`totalPrice`)** - Does not display (shows $0 or empty)
3. **Operator Messages** - Not visible in the RFQ flight card

The RFQ data structure itself is being passed correctly through the pipeline:
- Data flows from `chat-interface.tsx` → `rfq-flights-list` → `rfq-flight-card`
- Basic flight data (aircraft type, operator name, route, etc.) displays correctly
- However, we can retrieve complete quote data including prices, status, and messages from Avinode via test script (`test-avinode-rfq.sh`)

When the "View RFQs" or "Update RFQs" buttons are clicked, the system retrieves RFQ data but fails to properly extract/merge the **price**, **status**, and **messages** fields into the final data structure passed to the component.

**Root Cause**: The issue is in the data processing pipeline where:
- `get_quote` tool results may not be properly merged with RFQ flight data
- Price extraction logic may not be reading from the correct API response structure
- Status determination may not be using the correct field mappings
- Operator messages may not be correctly associated with quote IDs

This problem has been persisting for weeks and has been worked on by multiple agents to discover the root cause.

## Where to Investigate

### RFQ Data Flow Pipeline
The issue is in the RFQ data flow, NOT in workflow visualization components. The actual data pipeline is:

```
chat-interface.tsx (data processing)
  ↓ (activeChat.rfqFlights)
FlightSearchProgress component
  ↓ (rfqFlights prop)
RFQFlightsList component
  ↓ (individual flight)
RFQFlightCard component
```

### Key Files to Investigate

1. **`components/chat-interface.tsx`**
   - **Lines 391-553**: `useMemo` hook that processes `activeChat.rfqFlights` and converts data
   - **Lines ~2000+**: "View RFQs" / "Update RFQs" button click handlers (`handleTripIdSubmit`)
   - **Lines ~1823-1845**: Data transformation when RFQs are fetched - check if full `RFQFlight[]` data is being saved to `activeChat.rfqFlights`
   - **Lines 2578-2633**: RFQ conversion logic - verify data structure matches `RFQFlight` interface

2. **`components/chat-sidebar.tsx`**
   - **Line ~87**: `ChatSession` interface - verify `rfqFlights` field definition matches expected structure
   - Check how `onUpdateChat` callback updates `rfqFlights` in the session

3. **`components/avinode/rfq-flights-list.tsx`**
   - **Lines 272-312**: Rendering logic - verify `flights` prop is receiving complete data
   - **Lines 278-287**: Console logs - check what data is actually being passed to cards

4. **`components/avinode/rfq-flight-card.tsx`**
   - Verify `RFQFlight` interface definition (lines ~47-112) matches data structure
   - Check if required fields are present when component renders

5. **API Route: `app/api/chat/route.ts`**
   - **Lines ~308+**: `get_rfq` tool implementation
   - Verify API response structure matches `RFQFlight` format
   - Check if all 30+ fields are being returned from Avinode API

6. **MCP Server: `mcp-servers/avinode-mcp-server/src/index.ts`**
   - **Line 1458**: `getRFQ` function - calls Avinode API
   - **Line 1010**: `transformToRFQFlights` function - converts API response to `RFQFlight[]`
   - Verify transformation preserves all required fields

### Complete Button Click Flow

When "View RFQs" or "Update RFQs" buttons are clicked, the following flow executes:

1. **Button Click** → `components/avinode/flight-search-progress.tsx` (lines 744-780)
   - Button calls `onTripIdSubmit(tripId)` callback

2. **Handler Function** → `components/chat-interface.tsx` → `handleTripIdSubmit` (line 2007)
   - **Lines 2007-2054**: Builds request message and sends POST to `/api/chat`
   - Requests agent to call `get_rfq` and `get_trip_messages` tools
   - Handles both "View RFQs" (initial) and "Update RFQs" (refresh) scenarios

3. **API Route** → `app/api/chat/route.ts`
   - Agent receives request and calls MCP tools
   - Returns streaming SSE response with tool results

4. **MCP Server** → `mcp-servers/avinode-mcp-server/src/index.ts`
   - `getRFQ` function (line 1458) calls Avinode API endpoints:
     - `GET /trips/{tripId}` (primary) or `GET /rfqs/{id}` (fallback)
   - `transformToRFQFlights` (line 1010) converts API response to `RFQFlight[]` format

5. **Data Processing** → `handleTripIdSubmit` streaming response handler (lines 2127-2983)
   - **Lines 2154-2419**: Processes `tool_calls` from SSE stream
     - Extracts `preTransformedFlights` from `get_rfq` tool result (line 2190)
     - Extracts `get_quote` results to update prices (line 2157)
     - Extracts `get_trip_messages` results for operator messages (line 2420)
   - **Lines 2578-2674**: Converts quotes to `RFQFlight[]` format (legacy path if needed)
   - **Lines 2725-2873**: **CRITICAL**: Merges `get_quote` results to update prices and status
     - Priority: `preTransformedFlights` > `allFormattedQuotes` > empty array
     - Merges quote details map to update prices (line 2739-2857)
   - **Lines 2876-2983**: Creates final `rfqFlightsForChatSession` array
     - Creates new array reference for React (line 2942)
     - Logs price information for debugging
   - **Lines 2984+**: Saves to `activeChat.rfqFlights` via `onUpdateChat`

6. **Data Display** → Data flows through React components:
   - `chat-interface.tsx` → `useMemo` (line 391) processes `activeChat.rfqFlights`
   - Passed as `rfqFlights` prop to `FlightSearchProgress` component
   - `FlightSearchProgress` → Renders `RFQFlightsList` (line 846)
   - `RFQFlightsList` → Maps each flight to `RFQFlightCard` (line 291)

### Critical Code Sections

**Primary Data Source** (`handleTripIdSubmit`):
```typescript
// Line 2190: Pre-transformed flights from MCP tool
if (toolCall.result.flights && Array.isArray(toolCall.result.flights)) {
  preTransformedFlights = toolCall.result.flights as RFQFlight[]
}

// Line 2725: Final data selection priority
let rfqFlightsForChatSession = preTransformedFlights.length > 0
  ? preTransformedFlights  // Use pre-transformed flights (has prices)
  : (allFormattedQuotes.length > 0 
      ? allFormattedQuotes  // Fallback to converted quotes
      : [])  // Clear if no data

// Line 2735: Merge get_quote results to update prices
if (Object.keys(quoteDetailsMap).length > 0) {
  rfqFlightsForChatSession = rfqFlightsForChatSession.map(flight => {
    const quoteDetails = quoteDetailsMap[flight.quoteId]
    // Update price, currency, status from get_quote result
  })
}

// Line 2942: Create new array reference for React
const newRfqFlightsArray = rfqFlightsForChatSession.map(flight => ({
  ...flight,
  totalPrice: flight.totalPrice ?? 0,
  currency: flight.currency ?? 'USD',
  rfqStatus: flight.rfqStatus ?? 'unanswered',
}))
```

### Specific Field Issues

#### 1. Status (`rfqStatus`) Not Updating

**Symptoms**: RFQ status remains as initial value (typically "unanswered") even after quotes are received.

**Investigation Points**:
- **Line 2791-2804**: Status determination logic in `handleTripIdSubmit`
  - Verify status mapping from `quoteDetails.status` to `rfqStatus`
  - Check if status is correctly derived from price presence (if price > 0, status should be 'quoted')
- **Line 2949**: Default status fallback (`rfqStatus: flight.rfqStatus ?? 'unanswered'`)
  - May be overwriting updated status with default
- **MCP Server `transformToRFQFlights`**: Verify status extraction from Avinode API response
- **RFQ Flight Card**: Check if component is reading `rfqStatus` prop correctly

#### 2. TotalPrice/Price (`totalPrice`) Not Displaying

**Symptoms**: Price shows $0 or empty in UI, even though API response contains pricing data.

**Investigation Points**:
- **Line 2744-2771**: Price extraction logic in `handleTripIdSubmit`
  - Verify price is read from correct structure: `pricing.price` > `pricing.total` > `pricing.amount`
  - Check if `quoteDetails.pricing` structure matches expected format
  - Verify `sellerPrice` object structure from Avinode API
- **Line 2756-2759**: Price extraction priority check
  - `pricing.price || pricing.total || pricing.amount`
  - May need to check nested structures (e.g., `pricing.sellerPrice.price`)
- **Line 2822**: Price assignment logic
  - `totalPrice: (newPrice && newPrice > 0) ? newPrice : flight.totalPrice`
  - If `newPrice` is 0 or null, it falls back to existing (potentially incorrect) price
- **Line 2157-2173**: Verify `get_quote` tool is being called and results stored in `quoteDetailsMap`
- **Line 2230-2234**: Check for warnings about flights with $0 prices but no `get_quote` results
- **MCP Server**: Verify `transformToRFQFlights` extracts `totalPrice` from API response correctly

#### 3. Operator Messages Not Visible

**Symptoms**: Messages from operators are not displayed in the RFQ flight card.

**Investigation Points**:
- **Line 2240-2314**: Seller message extraction from quotes
  - Verify `sellerMessage` field is extracted from flight data
  - Check if messages are stored in `operatorMessages` map keyed by `quoteId`
- **Line 2420-2518**: `get_trip_messages` tool result processing
  - Verify messages are extracted and grouped by quote ID
  - Check message structure mapping (RESPONSE vs REQUEST types)
- **Line 2441-2463**: Quote ID extraction from messages
  - Verify correct quote ID is extracted from message structure
  - Check `sellerQuote.id`, `lift[].links.quotes[].id`, `links.quotes[].id` paths
- **Line 2488-2517**: Message merging logic
  - Verify messages are merged correctly without duplicates
  - Check if `operatorMessages` is saved to `activeChat` via `onUpdateChat`
- **RFQ Flight Card**: Verify component reads messages from correct prop/context
  - Check if `hasMessages` and `hasNewMessages` props are set correctly
  - Verify message display component receives message data

**Potential Issue Points**:
- Line 2190: Verify `preTransformedFlights` contains all required fields with prices
- Line 2735: Verify `get_quote` tool is being called for each quote ID
- Line 2739-2857: Verify price extraction logic correctly reads from `quoteDetails.pricing`
- Line 2791-2804: Verify status determination logic uses correct field mappings
- Line 2240-2314: Verify seller messages are extracted and stored correctly
- Line 2420-2518: Verify `get_trip_messages` results are processed and merged
- Line 2942: Verify new array reference triggers React re-render
- Line 2984+: Verify `onUpdateChat` correctly saves to `activeChat.rfqFlights` with all fields

### Components NOT Related to This Issue

- ❌ `components/workflow-visualization.tsx` - **NOT involved** in RFQ data flow (separate view component)
- ❌ Any workflow status components - these are display-only and don't process RFQ data

### Debugging Steps

#### General Debugging
1. Add console logs in `chat-interface.tsx` line ~404 to verify `activeChat.rfqFlights` contains complete data after "View RFQs" click
2. Verify `onUpdateChat` is saving full `RFQFlight[]` array (not simplified `quotes[]` format)
3. Compare API response structure from `test-avinode-rfq.sh` with what's stored in `activeChat.rfqFlights`
4. Verify React re-renders are triggered when `rfqsLastFetchedAt` timestamp changes

#### Price-Specific Debugging
1. **Line 2779-2786**: Check console logs for price extraction - verify `pricing` structure from `get_quote` result
2. **Line 2806-2816**: Check console logs for price updates - verify `newPrice` is extracted correctly
3. **Line 2876-2889**: Check "FINAL rfqFlightsForChatSession" log - verify `totalPrice` is not 0 before saving
4. **Line 2956-2982**: Check "Sample flight details" log - verify price is correctly set in final array
5. Verify `get_quote` tool is actually being called by the agent (check tool_calls in SSE stream)
6. Compare `pricing` structure from `test-avinode-rfq.sh` with what's in `quoteDetailsMap`

#### Status-Specific Debugging
1. **Line 2793-2804**: Check status determination logic - verify status is derived from price presence
2. Check if `quoteDetails.status` contains expected values ('quoted', 'declined', 'pending', etc.)
3. Verify status mapping logic matches Avinode API status values
4. Check if default status fallback (line 2949) is overwriting updated status

#### Message-Specific Debugging
1. **Line 2251-2268**: Check if `sellerMessage` is extracted from flight data
2. **Line 2429-2477**: Verify messages from `get_trip_messages` are grouped by correct quote ID
3. **Line 2484-2517**: Check if messages are merged correctly without duplicates
4. Verify `operatorMessages` is saved to `activeChat` via `onUpdateChat` (line 2310, 2515)
5. Check RFQ Flight Card component to verify it reads messages from correct prop/context
6. Verify `hasMessages` and `hasNewMessages` props are set correctly in `rfq-flights-list.tsx` (line 303-304)
