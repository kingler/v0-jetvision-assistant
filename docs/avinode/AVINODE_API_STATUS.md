# Avinode API Integration Status

**Date**: 2025-12-12
**Environment**: Sandbox (sandbox.avinode.com)
**Status**: ✅ WORKING

## Implementation Progress

### Completed
- ✅ **Authentication Fixed** - Bearer token authentication working
  - Changed from Cookie (`AVI_JWT`) to `Authorization: Bearer {JWT}`
  - Added `X-Avinode-ApiVersion: v1.0` header
  - Trip creation returns 201 with deep link

- ✅ **MCP Server Updated** - `mcp-servers/avinode-mcp-server/src/`
  - `create_trip` tool (POST /trips → returns deep link) ✅ TESTED
  - `get_rfq` tool (GET /rfqs/{id})
  - `send_trip_message` tool (POST /tripmsgs/{tripId}/sendMessage)
  - `get_trip_messages` tool (GET /tripmsgs/{tripId})
  - `cancel_trip` tool (PUT /trips/{id}/cancel)
  - `search_airports` tool (GET /airports?search=)
  - `search_empty_legs` tool (POST /emptyLegSearch)

- ✅ **FlightSearchAgent Redesigned** - `agents/implementations/flight-search-agent.ts`
  - Two modes: SEARCH (create trip) and FETCH_RFQ (get details)
  - Returns deep link + instructions instead of flight data
  - Properly handles the Avinode Broker workflow

- ✅ **Webhook Infrastructure** - `app/api/webhooks/avinode/route.ts`
  - Receives events: TripRequestSellerResponse, TripChatSeller, TripChatMine
  - HMAC signature verification
  - Registration script: `scripts/register-avinode-webhook.ts`
  - **Registered**: Webhook ID `whs-1583` at `https://v0-jet-vision-agent.vercel.app/api/webhooks/avinode`

### In Progress
- 🚧 **RFQ ID Capture Mechanism** - UI/UX for Sales Rep to input RFQ ID

### Pending
- ⏳ **Communication Bridge** - Agent-to-operator messaging
- ⏳ **Database Schema Migrations** - Store trips/RFQs/messages
- ⏳ **Webhook Database Storage** - Persist events for async processing

## Verified API Response

```json
{
  "data": {
    "id": "atrip-64956153",
    "href": "https://sandbox.avinode.com/api/trips/atrip-64956153",
    "type": "trips",
    "actions": {
      "searchInAvinode": {
        "description": "Start a search in Avinode",
        "href": "https://sandbox.avinode.com/marketplace/mvc/search/load/atrip-64956153?source=api&origin=api_action"
      },
      "viewInAvinode": {
        "description": "View in Avinode",
        "href": "https://sandbox.avinode.com/marketplace/mvc/trips/buying/atrip-64956153?source=api"
      },
      "cancel": {
        "description": "Cancel",
        "href": "https://sandbox.avinode.com/api/trips/atrip-64956153/cancel"
      }
    }
  }
}
```

## Authentication Requirements

Per [Avinode API Basics](https://developer.avinodegroup.com/docs/api-basics):

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer {JWT_TOKEN}` |
| `X-Avinode-ApiToken` | `{API_TOKEN}` |
| `X-Avinode-SentTimestamp` | ISO-8601 UTC timestamp |
| `X-Avinode-Product` | `JetVision/1.0` |
| `X-Avinode-ApiVersion` | `v1.0` |
| `Content-Type` | `application/json` |

**Key Discovery**: The API requires `Authorization: Bearer` header, NOT Cookie-based authentication.

## Credentials Location

```
mcp-servers/avinode-mcp-server/.env.local
```

Token expires: **08 Feb 2026 00:01 UTC**

## Request Format

**Working Format** (passes validation):
```json
{
  "sourcing": true,
  "criteria": {
    "startAirport": { "icao": "EHAM" },
    "endAirport": { "icao": "EGGW" },
    "date": "2025-12-20",
    "passengers": 4
  }
}
```

**Key Insight**: `criteria` must be an **object**, not an array.

## Test Scripts

| Script | Purpose |
|--------|---------|
| `scripts/test-avinode-trip-creation.ts` | Full trip creation workflow ✅ |
| `scripts/test-avinode-bearer-auth.ts` | Authentication method comparison |
| `scripts/test-avinode-credentials.ts` | Credential validation |

Run full test:
```bash
npx tsx scripts/test-avinode-trip-creation.ts
```

## Integration Flow

```
1. JetVision → POST /trips with flight criteria
2. Avinode   → Returns tripId + searchInAvinode deep link
3. Sales Rep → Opens deep link in Avinode Web UI
4. Sales Rep → Browses/selects flights, submits RFQs to operators
5. Sales Rep → Notes Trip/RFQ ID from Avinode UI
6. Sales Rep → Messages Trip ID back to JetVision Agent
7. JetVision → Uses Trip ID to fetch RFQ details via API
8. JetVision → Receives quotes via webhooks (pending setup)
```

## Webhook Setup

### Files Created

- `app/api/webhooks/avinode/route.ts` - Webhook endpoint handler
- `lib/types/avinode-webhooks.ts` - TypeScript types for webhook events
- `scripts/register-avinode-webhook.ts` - Registration script

### Environment Variables Needed

Add to your `.env.local` or deployment environment:

```bash
# Webhook secret for HMAC signature verification
AVINODE_WEBHOOK_SECRET=your-random-secret-string

# Your deployed webhook URL (after deployment)
AVINODE_WEBHOOK_URL=https://your-app.vercel.app/api/webhooks/avinode
```

### Registration Steps

1. **Deploy your app** to get a public URL
2. **Add environment variables** to `.env.local`:

   ```bash
   AVINODE_WEBHOOK_URL=https://your-app.vercel.app/api/webhooks/avinode
   AVINODE_WEBHOOK_SECRET=generate-a-random-string
   ```

3. **Register the webhook**:

   ```bash
   npx tsx scripts/register-avinode-webhook.ts
   ```

4. **Verify registration**:

   ```bash
   npx tsx scripts/register-avinode-webhook.ts list
   ```

### Manual Registration (Avinode UI)

If you prefer to register via the Avinode web interface:

1. Go to Avinode Settings → API → Webhooks
2. Click "Add Webhook"
3. Configure:
   - **Name**: JetVision Assistant
   - **URL**: `https://your-app.vercel.app/api/webhooks/avinode`
   - **Status**: Active
   - **Authentication**: None (we verify via HMAC internally)
4. Select events:
   - ✅ Trip Request - Seller Response
   - ✅ Trip Chat - Seller
   - ✅ Trip Chat (My Company)
5. Save

### Events Handled

| Event | Description | Handler |
|-------|-------------|---------|
| `TripRequestSellerResponse` | Operator submitted a quote | `handleSellerResponse()` |
| `TripChatSeller` | Operator sent a message | `handleChatMessage()` |
| `TripChatMine` | Internal company message | `handleChatMessage()` |
| `TripRequestMine` | Trip status update | Logged (TODO) |

## Next Steps

1. **RFQ ID Capture** - Add UI component for Sales Rep to input RFQ ID

2. **Communication Bridge** - Implement messaging via `POST /tripmsgs/{id}/sendMessage`

3. **Database Storage** - Store webhook events for async processing

## Files Modified

- `mcp-servers/avinode-mcp-server/.env.local` - Credentials (updated)
- `mcp-servers/avinode-mcp-server/src/client.ts` - Bearer auth (fixed)
- `mcp-servers/avinode-mcp-server/src/index.ts` - New tools
- `mcp-servers/avinode-mcp-server/src/types.ts` - New types
- `agents/implementations/flight-search-agent.ts` - Redesigned
- `scripts/test-avinode-*.ts` - Test scripts

## Summary

The Avinode Broker API integration is now **fully functional**. Trip creation works and returns deep links for Sales Reps to browse flights in the Avinode Web UI. The authentication issue was resolved by switching from Cookie-based auth to Bearer token authentication.
