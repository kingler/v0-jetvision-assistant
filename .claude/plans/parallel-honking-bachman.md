# Fix: Step 3 RFQ Flights Not Displaying

## Problem Summary

When clicking "View RFQs" in Step 3, the RFQ flights list shows "No RFQs available" even when RFQs exist and have been sent to operators. The UI displays:
```
Trip ID verified successfully!
No RFQs have been submitted yet. Please check back later or try refreshing.
No RFQs available
No RFQ has been submitted yet
```

## Root Cause Analysis

After tracing the data flow through the system, I've identified **two main issues**:

### Issue 1: MCP Tool Returns Raw Data Instead of Transformed Data

**Location:** [lib/mcp/avinode-server.ts:450-452](lib/mcp/avinode-server.ts#L450-L452)

The `get_rfq` MCP tool calls `getRFQ()` which returns **raw API data**:
```typescript
execute: async (params: any) => {
  this.ensureClientAvailable();
  return await this.client!.getRFQ(params.rfq_id);  // Raw data!
}
```

But there's a `getRFQFlights()` method (lines 454-583) that:
1. Calls `getRFQ()` to get raw data
2. Validates critical fields
3. **Transforms** data into `RFQFlight[]` format using `transformToRFQFlights()`

**The transformation is never used!**

### Issue 2: Empty RFQs Array When No Quotes Yet

**Location:** [components/chat-interface.tsx:1647-1700](components/chat-interface.tsx#L1647-L1700)

The chat interface tries to extract RFQs and quotes from the `get_rfq` result:
```typescript
if (toolCall.result.rfqs && Array.isArray(toolCall.result.rfqs)) {
  rfqs = toolCall.result.rfqs
  // Extract quotes from rfqs...
}
```

But when the Avinode API returns RFQs in a different structure (e.g., as a flat object or with `tripmsgs` structure), the extraction fails and `rfqs` remains empty.

### Issue 3: RFQ Status Not Being Displayed Correctly

**Location:** [components/chat-interface.tsx:311-376](components/chat-interface.tsx#L311-L376)

The `convertRfqToRFQFlight()` function works correctly, but it's only called when:
1. `rfqs` array is populated AND
2. RFQs don't have quotes

If `rfqs` is empty (due to Issue 2), `convertRfqToRFQFlight()` is never called.

## Data Flow Trace

```
User clicks "View RFQs" with Trip ID
  ↓
handleTripIdSubmit() sends request to /api/chat
  ↓
Agent calls get_rfq MCP tool
  ↓
MCP server calls getRFQ() → Returns RAW Avinode API data
  ↓
Chat interface receives tool result
  ↓
Tries to extract from:
  - toolCall.result.quotes (may not exist)
  - toolCall.result.rfqs (may be in different format)
  ↓
Falls back to empty arrays → "No RFQs available"
```

## Solution

### Option A: Modify MCP Tool to Return Transformed Data (Recommended)

**File:** `lib/mcp/avinode-server.ts`

Change the `get_rfq` tool to call `getRFQFlights()` instead of `getRFQ()`:

```typescript
execute: async (params: any) => {
  this.ensureClientAvailable();
  return await this.client!.getRFQFlights(params.rfq_id);  // Transformed!
}
```

**Advantages:**
- Single source of truth for transformation
- Consistent data format for all consumers
- Leverages existing transformation logic in `avinode-client.ts`

**Disadvantage:**
- May break any code expecting raw RFQ data format

### Option B: Transform Data in Chat Interface (Alternative)

Keep MCP tool returning raw data, but improve extraction logic in `chat-interface.tsx`:

1. Handle all Avinode API response formats (array, object, nested)
2. Check for `tripmsgs` structure (which contains RFQ status)
3. Improve fallback handling when no quotes exist yet

## Recommended Implementation Plan

### Step 1: Update MCP Tool (Primary Fix)
**File:** `lib/mcp/avinode-server.ts`

```typescript
// Line 450-452 - Change:
execute: async (params: any) => {
  this.ensureClientAvailable();
  return await this.client!.getRFQFlights(params.rfq_id);
}
```

### Step 2: Update Chat Interface Response Handling
**File:** `components/chat-interface.tsx`

Modify lines 1632-1700 to handle the new response format:

```typescript
if (toolCall.name === "get_rfq" && toolCall.result) {
  // New format from getRFQFlights includes:
  // - rfq_id, trip_id, status, flights[], etc.

  if (toolCall.result.flights && Array.isArray(toolCall.result.flights)) {
    // flights are already in RFQFlight format
    quotes = toolCall.result.flights;
  }
  // ... handle backward compatibility with old format
}
```

### Step 3: Handle RFQs Without Quotes
**File:** `components/chat-interface.tsx`

Ensure RFQs without quotes are still shown with "Awaiting quotes" status:
- The existing `convertRfqToRFQFlight()` function handles this
- Need to ensure it gets called even when no quotes exist

### Step 4: Update Tests
**Files:**
- `__tests__/unit/components/avinode/rfq-flights-list.test.tsx`
- `__tests__/unit/components/avinode/rfq-flight-card.test.tsx`

Add tests for:
- Empty RFQ list rendering
- RFQs without quotes (status = 'sent')
- Mixed state: some RFQs with quotes, some without

## Files to Modify

1. **lib/mcp/avinode-server.ts** (line 450-452)
   - Change `getRFQ()` to `getRFQFlights()`

2. **components/chat-interface.tsx** (lines 1632-1810)
   - Update response extraction to handle new format
   - Add fallback for RFQs without quotes

3. **components/avinode/flight-search-progress.tsx** (lines 708-775)
   - May need minor adjustments for loading states

## Testing Checklist

- [ ] Trip ID submitted shows "Loading flight quotes..."
- [ ] RFQs with quotes display RFQFlightCard with pricing
- [ ] RFQs without quotes display with "Awaiting quotes" status
- [ ] Empty RFQs shows appropriate message (only if truly no RFQs exist)
- [ ] Filter and sort work correctly
- [ ] Selection and "Continue" button work
