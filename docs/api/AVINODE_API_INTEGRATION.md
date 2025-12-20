# Avinode API Integration Guide

**Version**: 2.0.0
**Updated**: December 2025
**Status**: Production Ready
**Related Issues**: ONEK-120, ONEK-116, ONEK-117, ONEK-118, ONEK-119

---

## Overview

This document describes the Avinode API integration for the Jetvision Multi-Agent System. The integration uses the **MCP (Model Context Protocol)** pattern with a dedicated Avinode MCP Server that provides tools for flight search, trip management, and real-time quote handling.

---

## Architecture

### Integration Pattern

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Jetvision System                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐     ┌──────────────────┐     ┌───────────────────┐   │
│  │ FlightSearch    │────>│  Avinode MCP     │────>│  Avinode API      │   │
│  │ Agent           │     │  Server          │     │  (External)       │   │
│  └─────────────────┘     └──────────────────┘     └───────────────────┘   │
│                                   │                        │               │
│                                   │                        │               │
│  ┌─────────────────┐             │                        │               │
│  │ Chat Interface  │<────────────┘                        │               │
│  │ (SSE Updates)   │                                      │               │
│  └─────────────────┘                                      │               │
│           ^                                               │               │
│           │                                               │               │
│  ┌────────┴────────┐     ┌──────────────────┐            │               │
│  │ SSE Endpoint    │<────│  Webhook Handler │<───────────┘               │
│  │ /api/avinode/   │     │  /api/webhooks/  │   (Quote Events)           │
│  │ events          │     │  avinode         │                            │
│  └─────────────────┘     └──────────────────┘                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| FlightSearchAgent | Analyzes flight requests, calls MCP tools, saves trip data |
| Avinode MCP Server | Provides MCP tools, handles API authentication, manages requests |
| Webhook Handler | Receives Avinode events, stores in database, emits to SSE |
| SSE Endpoint | Streams real-time updates to connected clients |
| Chat Interface | Displays trip info, deep links, and quotes to users |

---

## MCP Server Configuration

### Location

```text
mcp-servers/avinode-mcp-server/
├── src/
│   ├── index.ts          # Server entry point
│   ├── client.ts         # Avinode API client
│   ├── mock-client.ts    # Mock client for development
│   └── types.ts          # TypeScript type definitions
├── package.json
└── tsconfig.json
```

### Environment Variables

```bash
# Required for production
AVINODE_API_KEY=your-api-key
AVINODE_API_URL=https://api.avinode.com

# Optional - enables mock mode when not set
# AVINODE_API_KEY=mock_key  # Prefix with 'mock_' for mock mode
```

### Starting the Server

```bash
# Start with other MCP servers
npm run dev:mcp

# Start standalone
cd mcp-servers/avinode-mcp-server
npm run start

# Development with mock data
AVINODE_API_KEY=mock_key npm run start
```

---

## MCP Tools Reference

### 1. create_trip

Creates a new trip in Avinode and returns a deep link for manual operator selection.

**Input Schema:**

```typescript
interface CreateTripParams {
  departure_airport: string    // ICAO code (e.g., "KTEB")
  arrival_airport: string      // ICAO code (e.g., "KLAX")
  departure_date: string       // YYYY-MM-DD format
  departure_time?: string      // HH:MM format (optional)
  passengers: number           // Number of passengers
  aircraft_preferences?: string[] // Optional aircraft type filters
}
```

**Response:**

```typescript
interface CreateTripResponse {
  trip_id: string      // e.g., "trp456789"
  deep_link: string    // e.g., "https://www.avinode.com/web/trips/trp456789"
  status: string       // "created" | "pending"
  created_at: string   // ISO 8601 timestamp
}
```

**Example:**

```typescript
const result = await mcpClient.callTool('avinode', {
  tool: 'create_trip',
  arguments: {
    departure_airport: 'KTEB',
    arrival_airport: 'KLAX',
    departure_date: '2025-12-20',
    departure_time: '09:00',
    passengers: 8,
  },
})
// Returns: { trip_id: "trp456789", deep_link: "https://...", ... }
```

### 2. get_rfq

Retrieves details of a Request for Quote.

**Input Schema:**

```typescript
interface GetRFQParams {
  rfq_id: string  // RFQ identifier
}
```

**Response:**

```typescript
interface RFQDetails {
  rfq_id: string
  trip_id: string
  status: 'pending' | 'sent' | 'responded' | 'expired'
  operators_contacted: number
  quotes_received: number
  created_at: string
  quote_deadline: string
}
```

### 3. get_quote

Retrieves details of a specific quote.

**Input Schema:**

```typescript
interface GetQuoteParams {
  quote_id: string  // Quote identifier
}
```

**Response:**

```typescript
interface QuoteDetails {
  quote_id: string
  rfq_id: string
  operator: {
    id: string
    name: string
    rating: number
  }
  aircraft: {
    type: string
    tail_number: string
    year: number
  }
  pricing: {
    amount: number
    currency: string
    includes_taxes: boolean
  }
  valid_until: string
  received_at: string
}
```

### 4. cancel_trip

Cancels an active trip.

**Input Schema:**

```typescript
interface CancelTripParams {
  trip_id: string     // Trip to cancel
  reason?: string     // Optional cancellation reason
}
```

**Response:**

```typescript
interface CancelTripResponse {
  trip_id: string
  status: 'cancelled'
  cancelled_at: string
}
```

### 5. send_trip_message

Sends a message to operators for a trip.

**Input Schema:**

```typescript
interface SendMessageParams {
  trip_id: string     // Trip identifier
  message: string     // Message content
  operator_ids?: string[]  // Specific operators (optional, all if omitted)
}
```

**Response:**

```typescript
interface SendMessageResponse {
  message_id: string
  trip_id: string
  sent_to: string[]
  sent_at: string
}
```

### 6. get_trip_messages

Retrieves message history for a trip.

**Input Schema:**

```typescript
interface GetMessagesParams {
  trip_id: string     // Trip identifier
  limit?: number      // Max messages to return (default: 50)
  offset?: number     // Pagination offset
}
```

**Response:**

```typescript
interface Message {
  id: string
  trip_id: string
  direction: 'inbound' | 'outbound'
  sender: {
    type: 'operator' | 'broker'
    name: string
  }
  content: string
  timestamp: string
}

interface GetMessagesResponse {
  messages: Message[]
  total: number
  has_more: boolean
}
```

### 7. search_airports

Searches for airports by name, city, or code.

**Input Schema:**

```typescript
interface SearchAirportsParams {
  query: string       // Search term
  country?: string    // Optional country code filter
}
```

**Response:**

```typescript
interface Airport {
  icao: string
  iata: string
  name: string
  city: string
  country: string
  timezone: string
}

interface SearchAirportsResponse {
  airports: Airport[]
  total_results: number
}
```

### 8. search_empty_legs

Searches for empty leg (repositioning) flights.

**Input Schema:**

```typescript
interface SearchEmptyLegsParams {
  departure_airport: string
  arrival_airport: string
  date_range: {
    from: string  // YYYY-MM-DD
    to: string    // YYYY-MM-DD
  }
  passengers: number
  max_price?: number
  aircraft_types?: string[]
}
```

**Response:**

```typescript
interface EmptyLeg {
  id: string
  operator: {
    id: string
    name: string
    rating: number
  }
  aircraft: {
    type: string
    tail_number: string
  }
  route: {
    departure: Airport
    arrival: Airport
  }
  departure_time: string
  price: {
    amount: number
    currency: string
    savings_percent: number
  }
  valid_until: string
}

interface SearchEmptyLegsResponse {
  empty_legs: EmptyLeg[]
  total_results: number
}
```

---

## Webhook Integration

### Webhook Endpoint

```text
POST /api/webhooks/avinode
```

### Event Types

| Event Type | Description | Payload |
|------------|-------------|---------|
| `TripRequestSellerResponse` | Operator submitted a quote | Quote details |
| `TripChatSeller` | Operator sent a message | Message content |
| `TripChatMine` | Confirmation of sent message | Message ID |

### Webhook Handler Implementation

```typescript
// app/api/webhooks/avinode/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const signature = request.headers.get('x-avinode-signature')

  // 1. Verify signature
  if (!verifyAvinodeSignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 2. Store webhook event
  await supabase.from('avinode_webhook_events').insert({
    event_type: body.event_type,
    trip_id: body.data.trip_id,
    payload: body.data,
    received_at: new Date().toISOString(),
  })

  // 3. Process event
  switch (body.event_type) {
    case 'TripRequestSellerResponse':
      await handleQuoteReceived(body.data)
      break
    case 'TripChatSeller':
      await handleOperatorMessage(body.data)
      break
  }

  // 4. Emit to SSE clients
  await emitToSSE(body.data.trip_id, body)

  return NextResponse.json({ received: true })
}
```

### Signature Verification

```typescript
function verifyAvinodeSignature(
  body: unknown,
  signature: string | null
): boolean {
  if (!signature) return false

  const secret = process.env.AVINODE_WEBHOOK_SECRET
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}
```

---

## SSE (Server-Sent Events) Integration

### SSE Endpoint

```text
GET /api/avinode/events?tripId={tripId}
```

### Client Usage

```typescript
// lib/hooks/use-avinode-events.ts

import { useEffect, useState } from 'react'

interface AvinodeEvent {
  type: string
  tripId: string
  data: Record<string, unknown>
  timestamp: string
}

export function useAvinodeEvents(tripId: string) {
  const [events, setEvents] = useState<AvinodeEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!tripId) return

    const eventSource = new EventSource(
      `/api/avinode/events?tripId=${tripId}`
    )

    eventSource.onopen = () => setIsConnected(true)

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data) as AvinodeEvent
      setEvents((prev) => [...prev, data])
    }

    eventSource.onerror = () => setIsConnected(false)

    return () => eventSource.close()
  }, [tripId])

  return { events, isConnected }
}
```

### SSE Server Implementation

```typescript
// app/api/avinode/events/route.ts

import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const tripId = request.nextUrl.searchParams.get('tripId')

  if (!tripId) {
    return new Response('Missing tripId', { status: 400 })
  }

  const stream = new ReadableStream({
    start(controller) {
      // Subscribe to events for this tripId
      const unsubscribe = subscribeToTripEvents(tripId, (event) => {
        const data = `data: ${JSON.stringify(event)}\n\n`
        controller.enqueue(new TextEncoder().encode(data))
      })

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        unsubscribe()
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
```

---

## Database Schema

### Tables

```sql
-- Existing requests table extensions
ALTER TABLE requests ADD COLUMN IF NOT EXISTS avinode_rfp_id TEXT;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS avinode_trip_id TEXT;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS avinode_deep_link TEXT;

-- Webhook events table
CREATE TABLE avinode_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  trip_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX idx_webhook_events_trip_id ON avinode_webhook_events(trip_id);
CREATE INDEX idx_webhook_events_event_type ON avinode_webhook_events(event_type);
CREATE INDEX idx_webhook_events_processed ON avinode_webhook_events(processed);

-- RLS policies
ALTER TABLE avinode_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage webhook events"
  ON avinode_webhook_events
  FOR ALL
  TO service_role
  USING (true);
```

---

## Error Handling

### Error Codes

| Code | Description | Recovery Action |
|------|-------------|-----------------|
| `AVINODE_AUTH_ERROR` | Authentication failed | Refresh API token |
| `AVINODE_RATE_LIMIT` | Rate limit exceeded | Exponential backoff |
| `AVINODE_NOT_FOUND` | Resource not found | Check trip/quote ID |
| `AVINODE_VALIDATION` | Invalid parameters | Check input data |
| `AVINODE_NETWORK` | Network error | Retry with backoff |

### Retry Strategy

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      if (error.code === 'AVINODE_AUTH_ERROR') {
        await refreshAvinodeAuth()
        continue
      }

      if (error.code === 'AVINODE_RATE_LIMIT') {
        await delay(Math.pow(2, i) * 1000)
        continue
      }

      throw error
    }
  }

  throw lastError!
}
```

---

## Authentication

### API Key Authentication

The Avinode MCP server uses API key authentication:

```typescript
// mcp-servers/avinode-mcp-server/src/client.ts

class AvinodeClient {
  private apiKey: string
  private baseUrl: string

  constructor() {
    this.apiKey = process.env.AVINODE_API_KEY!
    this.baseUrl = process.env.AVINODE_API_URL || 'https://api.avinode.com'
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      throw new AvinodeError(response.status, await response.text())
    }

    return response.json()
  }
}
```

### Webhook Authentication

Webhooks are authenticated using HMAC signature verification:

```bash
# Environment variable
AVINODE_WEBHOOK_SECRET=your-webhook-secret
```

---

## Rate Limiting

### Limits

| Endpoint | Rate Limit |
|----------|------------|
| create_trip | 10 requests/minute |
| search_* | 30 requests/minute |
| get_* | 60 requests/minute |

### Handling Rate Limits

```typescript
class RateLimitHandler {
  private requests: Map<string, number[]> = new Map()

  async checkLimit(endpoint: string): Promise<boolean> {
    const now = Date.now()
    const windowMs = 60 * 1000 // 1 minute

    const requests = this.requests.get(endpoint) || []
    const recentRequests = requests.filter((t) => now - t < windowMs)

    const limit = this.getLimit(endpoint)
    if (recentRequests.length >= limit) {
      return false
    }

    recentRequests.push(now)
    this.requests.set(endpoint, recentRequests)
    return true
  }

  private getLimit(endpoint: string): number {
    if (endpoint.includes('create_trip')) return 10
    if (endpoint.includes('search')) return 30
    return 60
  }
}
```

---

## Testing

### Mock Mode

The MCP server supports mock mode for development:

```bash
# Enable mock mode
AVINODE_API_KEY=mock_key npm run dev:mcp
```

### Unit Tests

```typescript
// __tests__/unit/mcp/avinode-server.test.ts

describe('Avinode MCP Server', () => {
  it('should create trip and return deep link', async () => {
    const result = await mcpClient.callTool('avinode', {
      tool: 'create_trip',
      arguments: {
        departure_airport: 'KTEB',
        arrival_airport: 'KLAX',
        departure_date: '2025-12-20',
        passengers: 6,
      },
    })

    expect(result.trip_id).toMatch(/^trp/)
    expect(result.deep_link).toContain('avinode.com')
  })
})
```

### Integration Tests

```typescript
// __tests__/integration/avinode-workflow.test.ts

describe('Avinode Workflow', () => {
  it('should complete full deep link workflow', async () => {
    // 1. Create trip
    const trip = await createTrip(params)
    expect(trip.trip_id).toBeDefined()

    // 2. Simulate webhook event
    await simulateWebhook('TripRequestSellerResponse', {
      trip_id: trip.trip_id,
      quote: mockQuote,
    })

    // 3. Verify quote stored
    const events = await getWebhookEvents(trip.trip_id)
    expect(events).toHaveLength(1)
  })
})
```

---

## Monitoring

### Metrics to Track

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `avinode.trip.created` | Trips created | N/A |
| `avinode.quote.received` | Quotes received | N/A |
| `avinode.api.latency` | API response time | > 2s |
| `avinode.api.errors` | API error rate | > 5% |
| `avinode.webhook.failures` | Failed webhook processing | > 0 |

### Logging

```typescript
// Structured logging
logger.info('Trip created', {
  trip_id: result.trip_id,
  departure: params.departure_airport,
  arrival: params.arrival_airport,
  passengers: params.passengers,
})

logger.warn('API rate limit approaching', {
  endpoint: 'create_trip',
  current: 8,
  limit: 10,
})

logger.error('Webhook processing failed', {
  event_type: 'TripRequestSellerResponse',
  trip_id: event.trip_id,
  error: error.message,
})
```

---

## Related Documentation

- [UX Requirements](../ux/UX_REQUIREMENTS_AVINODE_WORKFLOW.md)
- [Deep Link Workflow](../subagents/agents/flight-search/DEEP_LINK_WORKFLOW.md)
- [Workflow Integration](../implementation/WORKFLOW-AVINODE-INTEGRATION.md)
- [MCP Server README](../../mcp-servers/avinode-mcp-server/README.md)

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | Dec 2025 | Deep link workflow, 8 MCP tools, webhook integration |
| 1.0.0 | Oct 2025 | Initial automated workflow |
