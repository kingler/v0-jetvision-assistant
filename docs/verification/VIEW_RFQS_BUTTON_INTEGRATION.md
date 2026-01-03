# "View RFQs" Button Integration Verification

**Date:** 2025-01-14  
**Feature:** "View RFQs" Button Click Handler  
**API Documentation:** https://developer.avinodegroup.com/reference/readtriprfqs  
**Status:** ✅ Verified and Correct

---

## Integration Flow

When the user clicks the "View RFQs" button, the following flow is executed:

### 1. Button Click Handler

**Location:** `components/avinode/flight-search-progress.tsx:683-699`

```typescript
<Button
  onClick={() => onTripIdSubmit?.(tripId)}
  disabled={isTripIdLoading}
  className="flex items-center gap-2"
>
  {isTripIdLoading ? (
    <>
      <Loader2 className="h-4 w-4 animate-spin" />
      Loading RFQs...
    </>
  ) : (
    <>
      <Search className="h-4 w-4" />
      View RFQs
    </>
  )}
</Button>
```

**Action:** Calls `onTripIdSubmit(tripId)` callback

---

### 2. Trip ID Submit Handler

**Location:** `components/chat-interface.tsx:1594-1623`

```typescript
const handleTripIdSubmit = async (tripId: string): Promise<void> => {
  setIsTripIdLoading(true)
  setTripIdError(undefined)

  try {
    // Build conversation history for context
    const conversationHistory = activeChat.messages.map((msg) => ({
      role: msg.type === "user" ? "user" as const : "assistant" as const,
      content: msg.content,
    }))

    // Send Trip ID to the chat API - will trigger get_rfq tool with Trip ID
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Here is my Trip ID: ${tripId}`,
        conversationHistory,
        context: {
          flightRequestId: activeChat.id,
          route: activeChat.route,
          passengers: activeChat.passengers,
          date: activeChat.date,
          tripId: tripId, // Include Trip ID in context to trigger get_rfq
        },
      }),
    })
    // ... handle response
  }
}
```

**Action:** Sends POST request to `/api/chat` with Trip ID message

---

### 3. Chat API Route

**Location:** `app/api/chat/route.ts`

The chat API route:
- Receives the message containing the Trip ID
- Uses OpenAI GPT-4 with function calling
- Has `get_rfq` tool configured in `AVINODE_TOOLS` array (line 280-296)
- Tool description instructs the model to use `get_rfq` with Trip ID

**Tool Configuration:**
```typescript
{
  type: 'function',
  function: {
    name: 'get_rfq',
    description: 'Get RFQ (Request for Quote) details including all received quotes from operators. This tool automatically handles both RFQ IDs and Trip IDs: Use with RFQ ID (arfq-*) for a single RFQ, or Trip ID (atrip-*) to get all RFQs for that trip. When user provides a Trip ID, use this tool with the Trip ID to retrieve all RFQs and quotes.',
    parameters: {
      type: 'object',
      properties: {
        rfq_id: {
          type: 'string',
          description: 'The RFQ identifier (e.g., arfq-12345678) or Trip ID (e.g., atrip-12345678). If it starts with "atrip-", returns all RFQs for that trip.',
        },
      },
      required: ['rfq_id'],
    },
  },
}
```

**Action:** OpenAI model calls `get_rfq` tool with Trip ID parameter

---

### 4. MCP Server Tool Handler

**Location:** `mcp-servers/avinode-mcp-server/src/index.ts:562-566`

```typescript
case 'get_rfq': {
  const params = args as unknown as GetRFQParams;
  result = await getRFQ(params);
  break;
}
```

**Action:** Routes to `getRFQ` function

---

### 5. getRFQ Function Implementation

**Location:** `mcp-servers/avinode-mcp-server/src/index.ts:922-1026`

**API Endpoint:** `GET /rfqs/{tripId}`  
**API Documentation:** https://developer.avinodegroup.com/reference/readtriprfqs

**Query Parameters (per API documentation):**

| Parameter | Value | Purpose (from API docs) |
|-----------|-------|-------------------------|
| `taildetails` | `true` | Additional information about the aircraft |
| `typedetails` | `true` | Detailed information about the aircraft type |
| `timestamps` | `true` | Include `updatedByBuyer` and `latestUpdatedDateBySeller` fields |
| `quotebreakdown` | `true` | A detailed breakdown of the quote consisting of different sections and line items |
| `latestquote` | `true` | The latest added quote on a lift |
| `tailphotos` | `true` | Links to photos of the actual aircraft |
| `typephotos` | `true` | Links to generic photos of the aircraft type |

**Implementation:**
```typescript
const response = await avinodeClient.get(`/rfqs/${apiId}`, {
  params: {
    taildetails: true,
    typedetails: true,
    timestamps: true,
    quotebreakdown: true,
    latestquote: true,
    tailphotos: true,
    typephotos: true,
  },
});
```

**Response Handling:**
- Detects if response is an array (Trip ID response)
- Extracts all RFQs from the response
- Flattens all quotes from all RFQs
- Returns structured response with:
  - `trip_id`: The Trip ID
  - `rfqs`: Array of RFQ details
  - `total_rfqs`: Count of RFQs
  - `quotes`: Flattened array of all quotes
  - `total_quotes`: Count of quotes
  - `message`: User-friendly message if no RFQs found

**Action:** Calls Avinode API and processes response

---

### 6. Response Flow Back to UI

The response flows back through:
1. MCP server returns structured data
2. Chat API returns tool result to OpenAI
3. OpenAI generates agent message with results
4. Chat interface processes tool results
5. `rfqFlights` state is updated with transformed data
6. `RFQFlightsList` component receives and displays the flights

---

## API Documentation Compliance

### ✅ Endpoint
- **Expected:** `GET /rfqs/{tripId}`
- **Implementation:** `GET /rfqs/${apiId}` ✅

### ✅ Query Parameters
All recommended query parameters are included per API documentation:
- ✅ `taildetails`
- ✅ `typedetails`
- ✅ `timestamps`
- ✅ `quotebreakdown`
- ✅ `latestquote`
- ✅ `tailphotos`
- ✅ `typephotos`

### ✅ Response Format
- **Expected:** Array of RFQ objects for Trip ID
- **Implementation:** Correctly handles array response ✅

---

## Verification Checklist

- [x] ✅ Button click handler calls `onTripIdSubmit(tripId)`
- [x] ✅ `handleTripIdSubmit` sends message to `/api/chat`
- [x] ✅ Chat API has `get_rfq` tool configured
- [x] ✅ Tool description references Trip ID usage
- [x] ✅ MCP server routes to `getRFQ` function
- [x] ✅ `getRFQ` uses correct endpoint: `GET /rfqs/{tripId}`
- [x] ✅ Query parameters match API documentation
- [x] ✅ Response handling correctly processes Trip ID response
- [x] ✅ Empty RFQ response returns user-friendly message
- [x] ✅ Data transformation maps API response to `RFQFlight[]`
- [x] ✅ `RFQFlightsList` component receives and displays data

---

## Summary

The "View RFQs" button integration is **correctly implemented** and follows the Avinode API documentation at https://developer.avinodegroup.com/reference/readtriprfqs. The implementation:

1. ✅ Uses the correct endpoint: `GET /rfqs/{tripId}`
2. ✅ Includes all recommended query parameters
3. ✅ Handles the response format correctly (array of RFQs)
4. ✅ Transforms data to UI component format
5. ✅ Displays results in `RFQFlightsList` component

The integration is production-ready and compliant with the official Avinode API documentation.
