# Integration Patterns

**Version**: 1.0.0
**Last Updated**: October 20, 2025

---

## 📋 Overview

This guide covers common integration patterns used in the Jetvision AI Assistant system, including agent communication, MCP integration, database access, and error handling.

---

## 🤖 Agent Communication Patterns

### 1. Direct Delegation

Orchestrator directly delegates to specialized agents via BullMQ:

```typescript
// Orchestrator Agent
async delegateToFlightSearch(context: RequestContext) {
  const job = await flightSearchQueue.add('search-flights', {
    requestId: context.requestId,
    searchCriteria: context.criteria,
    clerkUserId: context.clerkUserId,
  })

  // Wait for result or return job ID for async processing
  const result = await job.waitUntilFinished(flightSearchQueue.events)
  return result
}
```

### 2. Event-Driven Communication

Agents publish events that other agents subscribe to:

```typescript
// Publisher (Flight Search Agent)
await supabase
  .channel(`request:${requestId}`)
  .send({
    type: 'broadcast',
    event: 'rfp_created',
    payload: { rfpId, operatorCount },
  })

// Subscriber (Proposal Analysis Agent)
const channel = supabase.channel(`request:${requestId}`)
channel.on('broadcast', { event: 'rfp_created' }, (payload) => {
  // React to RFP creation
  this.monitorQuotes(payload.rfpId)
})
```

### 3. Result Aggregation

Orchestrator waits for multiple agents to complete:

```typescript
const [clientProfile, flightResults, historicalData] = await Promise.all([
  clientDataQueue.add('get-profile', { clientName }),
  flightSearchQueue.add('search-flights', { criteria }),
  analyticsQueue.add('get-history', { clientName }),
])
```

---

## 🔌 MCP Integration Pattern

### MCP Server Architecture

```typescript
// MCP Client (in Agent)
import { MCPClient } from '@/lib/mcp/client'

class FlightSearchAgent extends BaseAgent {
  private mcpClient: MCPClient

  async searchFlights(criteria: SearchCriteria) {
    // Call MCP tool
    const result = await this.mcpClient.callTool('avinode', {
      tool: 'search_flights',
      arguments: criteria,
    })

    return result.flights
  }
}
```

### MCP Tool Definition

```typescript
// MCP Server Tool
export const searchFlightsTool = {
  name: 'search_flights',
  description: 'Search for available flights',
  inputSchema: {
    type: 'object',
    properties: {
      departure: { type: 'string' },
      arrival: { type: 'string' },
      date: { type: 'string' },
    },
    required: ['departure', 'arrival', 'date'],
  },

  async execute(args: any) {
    // Call external API
    const response = await avinodeClient.post('/v1/flights/search', args)

    // Transform to standard format
    return {
      flights: response.data.results.map(transformFlight),
    }
  },
}
```

---

## 🗄️ Database Access Patterns

### 1. RLS-Protected Queries

Always set Clerk context before database operations:

```typescript
async function getClientRequests(clerkUserId: string) {
  const supabase = createClient()

  // Set RLS context
  await supabase.rpc('set_clerk_user_context', { user_id: clerkUserId })

  // Query with RLS protection
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .order('created_at', { ascending: false })

  return data
}
```

### 2. Transaction Pattern

Use transactions for multi-table operations:

```typescript
async function createRequestWithProposal(requestData: any, proposalData: any) {
  const supabase = createClient()

  // Start transaction
  const { data: request, error: reqError } = await supabase
    .from('requests')
    .insert(requestData)
    .select()
    .single()

  if (reqError) throw reqError

  const { data: proposal, error: propError } = await supabase
    .from('proposals')
    .insert({ ...proposalData, request_id: request.id })
    .select()
    .single()

  if (propError) {
    // Rollback by deleting request
    await supabase.from('requests').delete().eq('id', request.id)
    throw propError
  }

  return { request, proposal }
}
```

### 3. Real-time Updates

Broadcast changes to connected clients:

```typescript
async function updateRequestStatus(requestId: string, status: string) {
  const supabase = createClient()

  // Update database
  await supabase
    .from('requests')
    .update({ status })
    .eq('id', requestId)

  // Broadcast to subscribers
  await supabase
    .channel(`request:${requestId}`)
    .send({
      type: 'broadcast',
      event: 'status_update',
      payload: { status },
    })
}
```

---

## ⚠️ Error Handling Patterns

### 1. Retry with Exponential Backoff

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) throw error

      const delay = baseDelay * Math.pow(2, i)
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`)
      await sleep(delay)
    }
  }

  throw new Error('Should not reach here')
}

// Usage
const result = await retryWithBackoff(
  () => avinodeClient.post('/v1/flights/search', criteria),
  3,
  2000
)
```

### 2. Graceful Degradation

```typescript
async function getClientProfile(clientName: string) {
  try {
    // Try Google Sheets first
    const sheetsData = await mcpClient.callTool('google-sheets', {
      tool: 'search_client',
      arguments: { clientName },
    })

    if (sheetsData.found) {
      return sheetsData.data
    }
  } catch (error) {
    console.warn('Google Sheets unavailable, using database only')
  }

  // Fallback to database
  const dbData = await supabase
    .from('clients')
    .select('*')
    .eq('name', clientName)
    .single()

  return dbData.data
}
```

### 3. Circuit Breaker

```typescript
class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open'
      } else {
        throw new Error('Circuit breaker is OPEN')
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess() {
    this.failures = 0
    this.state = 'closed'
  }

  private onFailure() {
    this.failures++
    this.lastFailureTime = Date.now()

    if (this.failures >= this.threshold) {
      this.state = 'open'
    }
  }
}

// Usage
const breaker = new CircuitBreaker()
const result = await breaker.execute(
  () => avinodeClient.post('/v1/flights/search', criteria)
)
```

---

## 🔄 Job Queue Patterns

### 1. Job Chaining

Chain jobs to execute sequentially:

```typescript
async function orchestrateWorkflow(requestId: string) {
  // Step 1: Get client profile
  const clientJob = await clientDataQueue.add('get-profile', { requestId })
  const clientProfile = await clientJob.waitUntilFinished(clientDataQueue.events)

  // Step 2: Search flights (depends on client profile)
  const searchJob = await flightSearchQueue.add('search-flights', {
    requestId,
    clientProfile,
  })
  const flights = await searchJob.waitUntilFinished(flightSearchQueue.events)

  // Step 3: Analyze proposals (depends on flights)
  const analysisJob = await proposalAnalysisQueue.add('analyze', {
    requestId,
    flights,
  })

  return analysisJob.id
}
```

### 2. Job Prioritization

```typescript
// High priority job (VIP client)
await orchestratorQueue.add(
  'process-request',
  { requestId, clientProfile },
  { priority: 1 }
)

// Normal priority
await orchestratorQueue.add(
  'process-request',
  { requestId, clientProfile },
  { priority: 5 }
)

// Low priority (background task)
await cleanupQueue.add('cleanup-old-data', {}, { priority: 10 })
```

### 3. Job Scheduling

```typescript
// Delayed job (send follow-up email in 24 hours)
await communicationQueue.add(
  'follow-up-email',
  { requestId, clientEmail },
  {
    delay: 86400000, // 24 hours
  }
)

// Repeating job (daily report)
await reportQueue.add(
  'daily-report',
  {},
  {
    repeat: {
      pattern: '0 9 * * *', // 9 AM daily
      tz: 'America/New_York',
    },
  }
)
```

---

## 📊 Monitoring & Logging

### Structured Logging

```typescript
async function logActivity(
  requestId: string,
  activity: string,
  metadata?: any
) {
  await supabase.from('agent_activities').insert({
    request_id: requestId,
    agent_name: this.agent.name,
    activity,
    metadata,
    timestamp: new Date().toISOString(),
  })

  // Also log to console in dev
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${this.agent.name}] ${activity}`, metadata)
  }
}
```

### Performance Tracking

```typescript
async function trackPerformance<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now()

  try {
    const result = await fn()
    const duration = Date.now() - start

    // Log performance metric
    await analytics.track({
      event: 'operation_completed',
      properties: {
        operation,
        duration_ms: duration,
        success: true,
      },
    })

    return result
  } catch (error) {
    const duration = Date.now() - start

    await analytics.track({
      event: 'operation_failed',
      properties: {
        operation,
        duration_ms: duration,
        success: false,
        error: error.message,
      },
    })

    throw error
  }
}

// Usage
const result = await trackPerformance('search_flights', () =>
  flightSearchAgent.execute(context)
)
```

---

## 📚 Related Documentation

- [RFP Orchestrator Agent](../agents/orchestrator/README.md)
- [BullMQ Documentation](../technology-stack/bullmq/README.md)
- [Avinode API Documentation](../technology-stack/avinode/README.md)
- [Best Practices](./best-practices.md)

---

**Version**: 1.0.0 | **Last Updated**: Oct 20, 2025
