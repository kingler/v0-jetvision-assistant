# Best Practices

**Version**: 1.0.0
**Last Updated**: October 20, 2025

---

## 📋 Overview

This guide covers best practices for developing, testing, and deploying Jetvision AI Assistant agents and services.

---

## 🏗️ Code Organization

### 1. Agent Structure

```
lib/agents/
├── base-agent.ts              # Base class for all agents
├── rfp-orchestrator.ts        # Orchestrator implementation
├── client-data-manager.ts     # Client data agent
├── flight-search-agent.ts     # Flight search agent
└── types/
    ├── agent.ts               # Agent type definitions
    └── context.ts             # Context type definitions
```

### 2. Separation of Concerns

```typescript
// ✅ GOOD: Clear separation
class FlightSearchAgent extends BaseAgent {
  async execute(context: FlightSearchContext) {
    // Business logic only
    const flights = await this.searchFlights(context.criteria)
    const filtered = this.filterFlights(flights, context.clientProfile)
    return this.createRFP(filtered)
  }

  // External API calls in separate methods
  private async searchFlights(criteria: SearchCriteria) {
    return this.mcpClient.callTool('avinode', {...})
  }
}

// ❌ BAD: Mixed concerns
class FlightSearchAgent {
  async execute(context: any) {
    // Mixed API calls, business logic, database operations
    const response = await axios.post('https://api.avinode.com/...')
    const data = response.data
    await db.insert(...)
    const filtered = data.filter(...)
    return filtered
  }
}
```

---

## 🧪 Testing

### 1. Test-Driven Development (TDD)

Write tests first:

```typescript
// 1. Write failing test
describe('FlightSearchAgent', () => {
  it('should filter flights by client preferences', () => {
    const agent = new FlightSearchAgent()
    const filtered = agent.filterFlights(mockFlights, mockClientProfile)

    expect(filtered).toHaveLength(3)
    expect(filtered[0].aircraft.type).toBe('light_jet')
  })
})

// 2. Implement feature to pass test
class FlightSearchAgent {
  filterFlights(flights: Flight[], profile: ClientProfile) {
    return flights.filter(
      (f) => profile.preferences.aircraftType.includes(f.aircraft.type)
    )
  }
}

// 3. Refactor if needed
```

### 2. Mock External Dependencies

```typescript
// __mocks__/mcp-client.ts
export class MCPClient {
  async callTool(service: string, params: any) {
    return {
      flights: mockFlightData,
    }
  }
}

// Test with mock
jest.mock('@/lib/mcp/client')

test('searchFlights returns results', async () => {
  const agent = new FlightSearchAgent()
  const results = await agent.searchFlights(mockCriteria)

  expect(results).toBeDefined()
  expect(results.length).toBeGreaterThan(0)
})
```

### 3. Integration Tests

```typescript
// __tests__/integration/workflow.test.ts
describe('End-to-end RFP workflow', () => {
  it('should complete full workflow', async () => {
    // Create request
    const request = await createRequest(testData)

    // Queue orchestrator job
    await orchestratorQueue.add('process', { requestId: request.id })

    // Wait for completion
    await waitForStatus(request.id, 'completed', 60000)

    // Verify final state
    const finalRequest = await db.query(
      'SELECT * FROM requests WHERE id = $1',
      [request.id]
    )

    expect(finalRequest.rows[0].status).toBe('completed')
    expect(finalRequest.rows[0].rfp_id).toBeDefined()
  })
})
```

---

## 🔒 Security

### 1. Environment Variables

```typescript
// ✅ GOOD: Validate environment variables at startup
export function validateEnv() {
  const required = [
    'OPENAI_API_KEY',
    'CLERK_SECRET_KEY',
    'SUPABASE_URL',
    'AVINODE_API_KEY',
  ]

  const missing = required.filter((key) => !process.env[key])

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

// Call in app initialization
validateEnv()

// ❌ BAD: No validation, fail at runtime
const apiKey = process.env.OPENAI_API_KEY // Might be undefined
```

### 2. Input Validation

```typescript
// ✅ GOOD: Validate all inputs
function validateSearchCriteria(criteria: any): SearchCriteria {
  if (!criteria.departure || !isValidICAO(criteria.departure)) {
    throw new ValidationError('Invalid departure airport')
  }

  if (!criteria.arrival || !isValidICAO(criteria.arrival)) {
    throw new ValidationError('Invalid arrival airport')
  }

  if (criteria.passengers < 1 || criteria.passengers > 20) {
    throw new ValidationError('Passengers must be between 1 and 20')
  }

  return criteria as SearchCriteria
}

// ❌ BAD: No validation
function searchFlights(criteria: any) {
  return api.search(criteria) // Might cause API errors
}
```

### 3. Rate Limiting

```typescript
// ✅ GOOD: Implement rate limiting
import rateLimit from 'express-rate-limit'

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later',
})

app.use('/api/', apiLimiter)

// ❌ BAD: No rate limiting (vulnerable to abuse)
```

---

## ⚡ Performance

### 1. Caching

```typescript
// ✅ GOOD: Cache expensive operations
async function getClientProfile(clientName: string) {
  const cacheKey = `client:${clientName}`
  const cached = await redis.get(cacheKey)

  if (cached) {
    return JSON.parse(cached)
  }

  const profile = await fetchClientProfile(clientName)
  await redis.set(cacheKey, JSON.stringify(profile), 'EX', 3600)

  return profile
}

// ❌ BAD: No caching, fetch every time
async function getClientProfile(clientName: string) {
  return await fetchClientProfile(clientName)
}
```

### 2. Parallel Operations

```typescript
// ✅ GOOD: Execute in parallel
const [clientProfile, flightHistory, preferences] = await Promise.all([
  getClientProfile(clientName),
  getFlightHistory(clientName),
  getPreferences(clientName),
])

// ❌ BAD: Sequential execution (3x slower)
const clientProfile = await getClientProfile(clientName)
const flightHistory = await getFlightHistory(clientName)
const preferences = await getPreferences(clientName)
```

### 3. Database Indexing

```sql
-- ✅ GOOD: Add indexes for common queries
CREATE INDEX idx_requests_iso_agent ON requests(iso_agent_id);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_created_at ON requests(created_at DESC);

-- Composite index for common query pattern
CREATE INDEX idx_requests_agent_status 
  ON requests(iso_agent_id, status, created_at DESC);
```

---

## 📝 Documentation

### 1. Code Comments

```typescript
// ✅ GOOD: Document complex logic
/**
 * Filters flights based on client preferences and history.
 * 
 * Scoring algorithm:
 * 1. Aircraft type match: +50 points
 * 2. Previous operator: +30 points
 * 3. Within budget: +20 points
 * 
 * @param flights - Available flights from search
 * @param clientProfile - Client profile with preferences
 * @returns Filtered and sorted flights
 */
function filterFlights(
  flights: Flight[],
  clientProfile: ClientProfile
): Flight[] {
  // Implementation...
}

// ❌ BAD: No documentation for complex logic
function filterFlights(flights, profile) {
  return flights.filter(f => /* complex logic */ )
}
```

### 2. API Documentation

```typescript
// ✅ GOOD: Document API routes
/**
 * POST /api/requests
 * 
 * Create a new flight request and start RFP workflow.
 * 
 * @body {
 *   clientName: string
 *   clientMessage: string
 *   flightDetails: {
 *     departure: string (ICAO)
 *     arrival: string (ICAO)
 *     date: string (YYYY-MM-DD)
 *     passengers: number
 *   }
 * }
 * 
 * @returns {
 *   requestId: string
 *   status: string
 *   jobId: string
 * }
 * 
 * @throws {401} Unauthorized
 * @throws {400} Invalid input
 * @throws {500} Server error
 */
export async function POST(request: NextRequest) {
  // Implementation...
}
```

---

## 🐛 Error Handling

### 1. Specific Error Classes

```typescript
// ✅ GOOD: Custom error classes
class AvinodeAPIError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message)
    this.name = 'AvinodeAPIError'
  }
}

class ValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

// Use specific errors
if (!isValidICAO(airport)) {
  throw new ValidationError('Invalid airport code', 'departure')
}

// ❌ BAD: Generic errors
throw new Error('Something went wrong')
```

### 2. Error Context

```typescript
// ✅ GOOD: Include context in errors
try {
  await avinodeClient.searchFlights(criteria)
} catch (error) {
  throw new Error(
    `Flight search failed for ${criteria.departure} -> ${criteria.arrival}: ${error.message}`
  )
}

// ❌ BAD: No context
try {
  await avinodeClient.searchFlights(criteria)
} catch (error) {
  throw error
}
```

---

## 📊 Monitoring

### 1. Health Checks

```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    avinode: await checkAvinode(),
  }

  const healthy = Object.values(checks).every((c) => c.healthy)

  return NextResponse.json(
    { healthy, checks },
    { status: healthy ? 200 : 503 }
  )
}

async function checkDatabase() {
  try {
    await supabase.from('users').select('id').limit(1)
    return { healthy: true }
  } catch (error) {
    return { healthy: false, error: error.message }
  }
}
```

### 2. Metrics Collection

```typescript
// Track key metrics
async function trackMetric(metric: string, value: number, tags?: Record<string, string>) {
  await analytics.track({
    event: metric,
    properties: { value, ...tags },
  })
}

// Usage
await trackMetric('agent_execution_time', duration, {
  agent: 'orchestrator',
  status: 'success',
})
```

---

## 📚 Related Documentation

- [Integration Patterns](./integration-patterns.md)
- [Common Pitfalls](./common-pitfalls.md)
- [All Agents](../agents/)
- [Technology Stack](../technology-stack/)

---

**Version**: 1.0.0 | **Last Updated**: Oct 20, 2025
