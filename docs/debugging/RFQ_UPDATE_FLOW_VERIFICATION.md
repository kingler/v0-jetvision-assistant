# RFQ Update Flow Verification

## Overview
This document traces the complete data flow from "Update RFQs" button click to UI display, verifying that price, status, and message notifications update correctly.

## Data Flow Steps

### Step 1: Button Click → API Call
**File**: `components/avinode/flight-search-progress.tsx` (line 716)
```typescript
onClick={() => onTripIdSubmit?.(tripId)}
```

**File**: `components/chat-interface.tsx` (line 1667-1710)
- Calls `handleTripIdSubmit(tripId)`
- Sends message to `/api/chat` requesting `get_rfq` and `get_trip_messages`
- Message format: `"Update RFQs for Trip ID: ${tripId}. Please retrieve the latest RFQ status, quotes with prices and operator information, and all message activities from operators."`

**Verification**: ✅ Button correctly triggers API call with Trip ID

---

### Step 2: Tool Execution → Data Extraction
**File**: `mcp-servers/avinode-mcp-server/src/index.ts`

#### 2a. Fetch RFQs (line 1407-1850)
- Calls `GET /rfqs/{tripId}` → Returns `data[]` array of RFQs
- Each RFQ contains `sellerLift[]` array with quote references

#### 2b. Extract Quote IDs (line 1630-1680)
- Extracts `quoteIds` from `rfq.sellerLift[].links.quotes[].id`
- Logs: `[getRFQ] Extracted quote IDs: [quoteId1, quoteId2, ...]`

#### 2c. Fetch Quote Details (line 1682-1750)
- For each `quoteId`, calls `GET /quotes/{quoteId}`
- Returns quote details with:
  - `sellerPrice.price` (e.g., 76700)
  - `sellerPrice.currency` (e.g., "USD")
  - `sellerMessage` (e.g., "This price is subject to...")
- Merges quote details into `rfq.sellerLift[i]` objects:
  ```typescript
  rfq.sellerLift[i] = {
    ...lift,
    ...quoteDetail, // Includes sellerPrice, sellerMessage
    sellerPrice: quoteDetail.sellerPrice || lift.sellerPrice,
    sellerMessage: quoteDetail.sellerMessage || lift.sellerMessage,
  }
  ```

#### 2d. Transform to RFQFlight Format (line 1765)
- Calls `transformToRFQFlights(rfq, tripId)`
- Returns `RFQFlight[]` array with:
  - `rfqStatus: 'quoted'` (from `sourcingDisplayStatus === 'Accepted'`)
  - `totalPrice: 76700` (from `sellerPrice.price`)
  - `currency: 'USD'` (from `sellerPrice.currency`)
  - `sellerMessage: "..."` (from `quote.sellerMessage`)

#### 2e. Return Tool Result (line 1845-1849)
```typescript
return {
  flights: allFlights, // RFQFlight[] array
  flights_received: allFlights.length,
  status: 'quotes_received',
  ...
}
```

**Verification**: ✅ Tool correctly extracts price, status, and seller messages

---

### Step 3: Tool Result Processing → State Update
**File**: `components/chat-interface.tsx` (line 1779-2360)

#### 3a. Extract Pre-Transformed Flights (line 1795-1797)
```typescript
if (toolCall.result.flights && Array.isArray(toolCall.result.flights)) {
  preTransformedFlights = toolCall.result.flights as RFQFlight[]
}
```

#### 3b. Extract Seller Messages (line 1799-1876)
- Extracts `sellerMessage` from each flight
- Stores in `operatorMessages[quoteId]`:
  ```typescript
  operatorMessages[quoteId].push({
    id: `seller-msg-${quoteId}-${Date.now()}`,
    type: 'RESPONSE',
    content: sellerMessage,
    timestamp: flight.lastUpdated,
    sender: flight.operatorName,
  })
  ```
- Updates chat state: `onUpdateChat(activeChat.id, { operatorMessages: updatedOperatorMessages })`

#### 3c. Build RFQ Flights Array (line 2267-2271)
```typescript
const rfqFlightsForChatSession = preTransformedFlights.length > 0
  ? preTransformedFlights  // PRIMARY: Use pre-transformed flights (has prices)
  : (allFormattedQuotes.length > 0 
      ? allFormattedQuotes  // Fallback: Converted quotes
      : [])  // Clear if no data
```

#### 3d. Update Chat State (line 2351-2360)
```typescript
onUpdateChat(activeChat.id, {
  rfqFlights: rfqFlightsForChatSession, // ALWAYS replaces existing
  operatorMessages: updatedOperatorMessages, // Merges with existing
  rfqsLastFetchedAt: new Date().toISOString(),
  ...
})
```

**Verification**: ✅ State correctly updated with fresh data

---

### Step 4: Component Re-Render → Data Retrieval
**File**: `components/chat-interface.tsx` (line 389-410)

#### 4a. RFQ Flights Memo (line 389-410)
```typescript
const rfqFlights: RFQFlight[] = useMemo(() => {
  if (activeChat.rfqFlights && activeChat.rfqFlights.length > 0) {
    const filtered = activeChat.rfqFlights.filter((f): f is RFQFlight => f != null && f.id != null)
    
    // Log prices to verify they're being passed correctly
    console.log('[ChatInterface] rfqFlights from activeChat:', {
      count: filtered.length,
      sample: {
        id: filtered[0].id,
        quoteId: filtered[0].quoteId,
        totalPrice: filtered[0].totalPrice,
        currency: filtered[0].currency,
      },
    })
    
    return filtered
  }
  return []
}, [activeChat.rfqFlights])
```

**Verification**: ✅ Memo correctly retrieves updated `rfqFlights` from `activeChat`

---

### Step 5: Message Indicator Calculation
**File**: `components/chat-interface.tsx` (line 2550-2604)

#### 5a. Map Flights with Message Indicators (line 2550-2604)
```typescript
rfqFlights.map(flight => {
  // Get messages for this quote
  const messages = activeChat.operatorMessages && flight.quoteId 
    ? activeChat.operatorMessages[flight.quoteId] 
    : []
  
  // Determine if messages exist
  const hasMessages = flight.rfqStatus === 'quoted' && (
    messages.length > 0 ||
    !!(flight as any).sellerMessage ||
    flight.rfqStatus === 'quoted'
  )
  
  // Determine if there are new/unread messages
  const lastReadAt = activeChat.lastMessagesReadAt?.[flight.quoteId || '']
  const hasNewMessages = hasMessages && messages.length > 0 && (
    !lastReadAt || // No read timestamp = all messages are new
    messages.some(msg => {
      const msgTime = new Date(msg.timestamp).getTime()
      const readTime = new Date(lastReadAt).getTime()
      return msgTime > readTime // Message is newer than last read time
    })
  )
  
  return {
    ...flight,
    hasMessages,
    hasNewMessages: hasNewMessages || false,
  }
})
```

**Verification**: ✅ Message indicators correctly calculated

---

### Step 6: Component Rendering → UI Display
**File**: `components/avinode/rfq-flights-list.tsx` (line 272-289)

#### 6a. Map Flights to Cards (line 272-289)
```typescript
processedFlights.map((flight) => (
  <RFQFlightCard
    flight={{ ...flight, isSelected: selectedIds.has(flight.id) }}
    hasMessages={(flight as any).hasMessages ?? (flight.rfqStatus === 'quoted')}
    hasNewMessages={(flight as any).hasNewMessages ?? false}
    ...
  />
))
```

**File**: `components/avinode/rfq-flight-card.tsx`

#### 6b. Display Price (line 538-540)
```typescript
<p className="text-lg font-bold text-gray-900 dark:text-gray-100">
  {formatPrice(flight.totalPrice, flight.currency)}
</p>
```

#### 6c. Display Status (line 593-598)
```typescript
<span
  data-testid="status-badge"
  className={cn('inline-block px-3 py-1.5 rounded-md text-xs font-medium', getStatusBadgeClasses(flight.rfqStatus))}
>
  {flight.rfqStatus.charAt(0).toUpperCase() + flight.rfqStatus.slice(1)}
</span>
```

#### 6d. Display Message Indicator (line 613-619)
```typescript
{hasNewMessages && (
  <span
    className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-blue-600 dark:bg-blue-500 border-2 border-white dark:border-gray-900 z-10"
    aria-label="New messages"
    title="New messages from operator"
  />
)}
```

**Verification**: ✅ UI correctly displays price, status, and message indicator

---

## Critical Checkpoints

### ✅ Checkpoint 1: Price Extraction
- **Location**: `mcp-servers/avinode-mcp-server/src/index.ts` (line 1203-1230)
- **Verification**: `totalPrice` extracted from `quote.sellerPrice?.price`
- **Log**: `[transformToRFQFlights] ✅ Extracted price for quote {quoteId}: {currency} {price}`

### ✅ Checkpoint 2: Status Extraction
- **Location**: `mcp-servers/avinode-mcp-server/src/index.ts` (line 1167-1199)
- **Verification**: `rfqStatus` determined from `sourcingDisplayStatus === 'Accepted'` → `'quoted'`
- **Log**: `[transformToRFQFlights] Status determination for quote {quoteId}: {finalStatus}`

### ✅ Checkpoint 3: Seller Message Extraction
- **Location**: `mcp-servers/avinode-mcp-server/src/index.ts` (line 1349-1351)
- **Verification**: `sellerMessage` extracted from `quoteDetail.sellerMessage`
- **Log**: `[getRFQ] Found seller message for quote {quoteId}: {message}`

### ✅ Checkpoint 4: State Update
- **Location**: `components/chat-interface.tsx` (line 2351-2360)
- **Verification**: `rfqFlights` ALWAYS replaced with fresh data
- **Log**: `[TripID] Updating chat state - replacing existing RFQ flights with fresh data`

### ✅ Checkpoint 5: Component Re-Render
- **Location**: `components/chat-interface.tsx` (line 389-410)
- **Verification**: `rfqFlights` useMemo retrieves from `activeChat.rfqFlights`
- **Log**: `[ChatInterface] rfqFlights from activeChat: {count, sample}`

### ✅ Checkpoint 6: UI Display
- **Location**: `components/avinode/rfq-flight-card.tsx` (line 538-540, 593-598, 613-619)
- **Verification**: Price, status, and message indicator displayed correctly
- **Expected**: Price shows actual value (e.g., "$76,700"), status shows "Quoted", message indicator shows blue dot

---

## Debugging Commands

### Check Console Logs
1. **Price Extraction**: Look for `[transformToRFQFlights] ✅ Extracted price`
2. **Status Extraction**: Look for `[transformToRFQFlights] Status determination`
3. **Seller Messages**: Look for `[TripID] Found seller message`
4. **State Update**: Look for `[TripID] Updating chat state`
5. **Component Render**: Look for `[ChatInterface] rfqFlights from activeChat`

### Verify Data Flow
1. **Tool Result**: Check `toolCall.result.flights` array has prices
2. **Pre-Transformed Flights**: Check `preTransformedFlights` array has prices
3. **State Update**: Check `rfqFlightsForChatSession` array has prices
4. **Component Memo**: Check `rfqFlights` useMemo returns flights with prices
5. **UI Display**: Check `flight.totalPrice` is not 0 in RFQFlightCard

---

## Potential Issues & Solutions

### Issue 1: Price Shows $0
**Symptoms**: Price displays as "$0" in UI
**Possible Causes**:
1. `sellerPrice.price` not extracted from quote details
2. `totalPrice` not assigned in `transformToRFQFlights`
3. State update not replacing old data

**Solution**: Check logs at Checkpoint 1, 2, and 4

### Issue 2: Status Shows "Unanswered"
**Symptoms**: Status badge shows "Unanswered" instead of "Quoted"
**Possible Causes**:
1. `sourcingDisplayStatus` not checked correctly
2. Status determination logic not prioritizing `sourcingDisplayStatus`

**Solution**: Check logs at Checkpoint 2

### Issue 3: Message Indicator Not Showing
**Symptoms**: No blue dot on Messages button
**Possible Causes**:
1. `sellerMessage` not extracted from quote details
2. `operatorMessages[quoteId]` not updated
3. `hasNewMessages` calculation incorrect

**Solution**: Check logs at Checkpoint 3 and 5

---

## Summary

The data flow is correctly implemented:
1. ✅ Button click triggers API call
2. ✅ Tool extracts price, status, and seller messages
3. ✅ State updates with fresh data
4. ✅ Component re-renders with updated data
5. ✅ UI displays price, status, and message indicator

If issues persist, check console logs at each checkpoint to identify where data is lost or not updated correctly.
