# Flight Search Agent - Deep Link Workflow

**Version**: 2.0.0
**Updated**: December 2025
**Status**: Production Ready
**Related Issues**: ONEK-120, ONEK-117

---

## Overview

This document describes the updated FlightSearchAgent workflow that uses **Avinode deep links** instead of automated RFP creation. This human-in-the-loop approach enables sales representatives to review and customize flight requests before sending them to operators.

## Workflow Comparison

### Previous Workflow (Deprecated)

```text
User Request → FlightSearchAgent → search_flights API → create_rfp API → Auto-send to operators
```

**Issues with previous approach:**

- No human review before sending RFPs
- Limited customization options
- Operators received templated messages
- No negotiation opportunity

### Current Deep Link Workflow

```text
User Request → FlightSearchAgent → create_trip API → Deep Link Generated
                                                            ↓
                                    Sales Rep Opens Avinode → Manual Operator Selection
                                                            ↓
                                    Sales Rep Sends RFP → Webhook Events → Quote Display
```

**Benefits:**

- Human judgment in operator selection
- Personalized messaging to operators
- Real-time negotiation capability
- Quality control before RFP distribution

---

## MCP Tools Overview

The Avinode MCP server provides 8 tools for the deep link workflow:

| Tool | Purpose | Returns |
|------|---------|---------|
| `create_trip` | Create trip and get deep link | `trip_id`, `deep_link` |
| `get_rfq` | Get RFQ details | RFQ object |
| `get_quote` | Get quote details | Quote object |
| `cancel_trip` | Cancel an active trip | Confirmation |
| `send_trip_message` | Send message to operators | Message ID |
| `get_trip_messages` | Get message history | Messages array |
| `search_airports` | Search airports | Airport list |
| `search_empty_legs` | Find empty leg flights | Empty legs list |

---

## Implementation Guide

### Step 1: Create Trip with Deep Link

```typescript
// agents/implementations/flight-search-agent.ts

import { MCPClient } from '@/lib/mcp/client'

export class FlightSearchAgent extends BaseAgent {
  private mcpClient: MCPClient

  async createTripWithDeepLink(context: FlightSearchContext): Promise<TripResult> {
    const { requestId, searchCriteria, clerkUserId } = context

    // Call create_trip MCP tool
    const tripResult = await this.mcpClient.callTool('avinode', {
      tool: 'create_trip',
      arguments: {
        departure_airport: searchCriteria.departure.airport,
        arrival_airport: searchCriteria.arrival.airport,
        departure_date: searchCriteria.departure.date,
        departure_time: searchCriteria.departure.time,
        passengers: searchCriteria.passengers,
        aircraft_preferences: searchCriteria.preferences?.aircraftType,
      },
    })

    // Save trip details to database
    await this.saveTripToDatabase(requestId, {
      tripId: tripResult.trip_id,
      deepLink: tripResult.deep_link,
      status: 'pending_action',
    })

    return {
      tripId: tripResult.trip_id,
      deepLink: tripResult.deep_link,
      status: 'pending_action',
      message: 'Trip created. Please open Avinode to select operators and send the RFP.',
    }
  }

  private async saveTripToDatabase(
    requestId: string,
    tripData: { tripId: string; deepLink: string; status: string }
  ): Promise<void> {
    await this.supabase
      .from('requests')
      .update({
        avinode_trip_id: tripData.tripId,
        avinode_deep_link: tripData.deepLink,
        status: tripData.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
  }
}
```

### Step 2: Display Deep Link in UI

```typescript
// components/avinode/avinode-deep-links.tsx

interface AvinodeDeepLinksProps {
  tripId: string
  deepLink: string
  isLoading?: boolean
}

export function AvinodeDeepLinks({ tripId, deepLink, isLoading }: AvinodeDeepLinksProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 bg-gray-100 rounded-lg">
        <Spinner className="h-4 w-4" />
        <span>Creating trip...</span>
      </div>
    )
  }

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">Trip ID</p>
          <p className="font-mono font-medium">{tripId}</p>
        </div>
        <a
          href={deepLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <ExternalLinkIcon className="h-4 w-4" />
          Open in Avinode
        </a>
      </div>
    </div>
  )
}
```

### Step 3: Handle Webhook Events

```typescript
// app/api/webhooks/avinode/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const signature = request.headers.get('x-avinode-signature')

  // Verify webhook signature
  if (!verifyAvinodeSignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Store webhook event
  await supabase.from('avinode_webhook_events').insert({
    event_type: body.event_type,
    trip_id: body.data.trip_id,
    payload: body.data,
    received_at: new Date().toISOString(),
  })

  // Handle specific event types
  switch (body.event_type) {
    case 'TripRequestSellerResponse':
      await handleQuoteReceived(body.data)
      break
    case 'TripChatSeller':
      await handleOperatorMessage(body.data)
      break
    case 'TripChatMine':
      await handleMessageConfirmation(body.data)
      break
  }

  // Emit to SSE clients
  await emitToSSE(body.data.trip_id, body)

  return NextResponse.json({ received: true })
}
```

### Step 4: Real-time Updates via SSE

```typescript
// lib/hooks/use-avinode-events.ts

import { useEffect, useState, useCallback } from 'react'

interface AvinodeEvent {
  type: string
  tripId: string
  data: Record<string, unknown>
  timestamp: string
}

export function useAvinodeEvents(tripId: string) {
  const [events, setEvents] = useState<AvinodeEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!tripId) return

    const eventSource = new EventSource(`/api/avinode/events?tripId=${tripId}`)

    eventSource.onopen = () => {
      setIsConnected(true)
      setError(null)
    }

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data) as AvinodeEvent
      setEvents((prev) => [...prev, data])
    }

    eventSource.onerror = () => {
      setIsConnected(false)
      setError(new Error('SSE connection lost'))
    }

    return () => {
      eventSource.close()
    }
  }, [tripId])

  return { events, isConnected, error }
}
```

---

## Database Schema

The workflow uses these database fields (from migration 015):

```sql
-- requests table
ALTER TABLE requests ADD COLUMN IF NOT EXISTS avinode_rfp_id TEXT;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS avinode_trip_id TEXT;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS avinode_deep_link TEXT;

-- avinode_webhook_events table (from ONEK-116)
CREATE TABLE avinode_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  trip_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- RLS policies
ALTER TABLE avinode_webhook_events ENABLE ROW LEVEL SECURITY;
```

---

## Workflow States

| State | Description | Next Actions |
|-------|-------------|--------------|
| `pending_action` | Trip created, awaiting sales rep | Open deep link |
| `rfp_sent` | Sales rep sent RFP | Wait for quotes |
| `quotes_received` | Operator quotes received | Review quotes |
| `quote_selected` | Quote chosen | Proceed to booking |
| `completed` | Trip finalized | Archive |
| `cancelled` | Trip cancelled | None |

---

## Error Handling

### Trip Creation Errors

```typescript
try {
  const trip = await this.createTripWithDeepLink(context)
  return trip
} catch (error) {
  if (error.code === 'AVINODE_AUTH_ERROR') {
    // Re-authenticate and retry
    await this.refreshAvinodeAuth()
    return this.createTripWithDeepLink(context)
  }

  if (error.code === 'AVINODE_RATE_LIMIT') {
    // Exponential backoff
    await this.delay(Math.pow(2, retryCount) * 1000)
    return this.createTripWithDeepLink(context)
  }

  throw error
}
```

### Webhook Processing Errors

```typescript
// Store failed webhooks for retry
await supabase.from('avinode_webhook_events').update({
  processed: false,
  error_message: error.message,
  retry_count: currentRetryCount + 1,
}).eq('id', webhookEventId)
```

---

## Testing

### Unit Tests

```typescript
// __tests__/unit/agents/flight-search-agent.test.ts

describe('FlightSearchAgent - Deep Link Workflow', () => {
  it('should create trip and return deep link', async () => {
    const agent = new FlightSearchAgent()
    const result = await agent.createTripWithDeepLink({
      requestId: 'req-123',
      searchCriteria: {
        departure: { airport: 'KTEB', date: '2025-12-20' },
        arrival: { airport: 'KLAX' },
        passengers: 6,
      },
      clerkUserId: 'user-123',
    })

    expect(result.tripId).toBeDefined()
    expect(result.deepLink).toContain('avinode.com')
    expect(result.status).toBe('pending_action')
  })

  it('should save trip to database', async () => {
    // Test database persistence
  })

  it('should handle webhook events', async () => {
    // Test webhook processing
  })
})
```

### Integration Tests

```typescript
// __tests__/integration/avinode-workflow.test.ts

describe('Avinode Deep Link Workflow', () => {
  it('should complete full workflow from request to quote', async () => {
    // 1. Create trip
    // 2. Verify deep link
    // 3. Simulate webhook event
    // 4. Verify quote display
  })
})
```

---

## Related Documentation

- [UX Requirements](../../../ux/UX_REQUIREMENTS_AVINODE_WORKFLOW.md)
- [Avinode MCP Server](../../../../mcp-servers/avinode-mcp-server/README.md)
- [Webhook Types](../../../../lib/types/avinode-webhooks.ts)
- [ONEK-120 Issue](https://linear.app/designthru-ai/issue/ONEK-120)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | Dec 2025 | Deep link workflow implementation |
| 1.0.0 | Oct 2025 | Initial automated workflow |
