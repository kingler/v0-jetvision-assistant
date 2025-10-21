# Integration Tests for API Routes

**Task ID**: TASK-027
**Created**: 2025-10-20
**Assigned To**: Backend Developer / QA Engineer
**Status**: `pending`
**Priority**: `high`
**Estimated Time**: 12 hours
**Actual Time**: - (update when complete)

---

## 1. TASK OVERVIEW

### Objective
Implement comprehensive integration tests for all API routes including request/response cycles, authentication, database interactions, queue job creation, and webhook endpoints using Mock Service Worker (MSW) for external API mocking.

### User Story
**As a** developer
**I want** integration tests for all API endpoints
**So that** I can ensure end-to-end API functionality, catch integration bugs, and verify that all layers (auth, database, queue, external APIs) work correctly together

### Business Value
Integration testing validates that the API layer correctly integrates with all system components (Clerk auth, Supabase database, BullMQ queue, MCP servers). This prevents integration bugs that unit tests miss, reduces production incidents by 60%, and ensures reliable API contracts for the frontend. Critical for achieving the 99.9% uptime goal.

---

## 2. REQUIREMENTS & ACCEPTANCE CRITERIA

### Functional Requirements

**FR-1**: System SHALL implement integration tests for authentication routes
- Test Clerk webhook for user sync
- Verify JWT token validation
- Test protected route access control
- Test user creation and database sync

**FR-2**: System SHALL implement integration tests for request routes
- POST /api/requests - Create flight request
- GET /api/requests - List user's requests
- GET /api/requests/:id - Get single request
- PATCH /api/requests/:id - Update request
- DELETE /api/requests/:id - Cancel request
- Verify RLS enforcement

**FR-3**: System SHALL implement integration tests for agent routes
- POST /api/agents/orchestrator - Trigger orchestrator
- POST /api/agents/client-data - Fetch client profile
- POST /api/agents/flight-search - Search flights
- POST /api/agents/proposal-analysis - Analyze quotes
- POST /api/agents/communication - Send proposal
- Verify job queue creation

**FR-4**: System SHALL implement integration tests for webhook routes
- POST /api/webhooks/avinode/quotes - Receive Avinode quotes
- POST /api/webhooks/gmail/delivery - Email delivery status
- POST /api/webhooks/clerk - User sync
- Verify signature validation

**FR-5**: System SHALL implement integration tests for quote routes
- GET /api/requests/:id/quotes - Get quotes for request
- POST /api/quotes/:id/analyze - Trigger analysis
- Verify database queries and joins

**FR-6**: System SHALL implement integration tests for proposal routes
- GET /api/requests/:id/proposals - Get proposals
- POST /api/proposals/:id/send - Send proposal email
- Verify email queue job creation

**FR-7**: System SHALL use MSW for external API mocking
- Mock OpenAI API responses
- Mock Avinode API calls
- Mock Gmail API calls
- Mock Google Sheets API

**FR-8**: System SHALL test complete request/response cycles
- Request validation (400 errors)
- Authentication failures (401 errors)
- Authorization failures (403 errors)
- Not found errors (404 errors)
- Server errors (500 errors)
- Success responses (200, 201)

### Acceptance Criteria

- [ ] **AC-1**: All request routes have integration tests (5 routes)
- [ ] **AC-2**: All agent routes have integration tests (5 routes)
- [ ] **AC-3**: All webhook routes have integration tests (3 routes)
- [ ] **AC-4**: All quote routes have integration tests (2 routes)
- [ ] **AC-5**: All proposal routes have integration tests (2 routes)
- [ ] **AC-6**: Authentication and authorization tested for all protected routes
- [ ] **AC-7**: Database operations verified (create, read, update, delete)
- [ ] **AC-8**: Queue job creation verified
- [ ] **AC-9**: MSW mocks all external APIs
- [ ] **AC-10**: All HTTP status codes tested (200, 201, 400, 401, 403, 404, 500)
- [ ] **AC-11**: Tests use test database or transaction rollback
- [ ] **AC-12**: Tests are isolated and can run in parallel
- [ ] **AC-13**: Code review approved

### Non-Functional Requirements

- **Performance**: Test suite completes in <3 minutes
- **Reliability**: Tests are deterministic and repeatable
- **Isolation**: Each test cleans up after itself
- **Coverage**: All API routes have >3 tests each
- **Realism**: Test data matches production scenarios

---

## 3. TEST-DRIVEN DEVELOPMENT (TDD) APPROACH

### Step 1: Write Tests FIRST (Red Phase)

**Test Files to Create**:
```
__tests__/integration/api/requests.test.ts
__tests__/integration/api/agents.test.ts
__tests__/integration/api/webhooks.test.ts
__tests__/integration/api/quotes.test.ts
__tests__/integration/api/proposals.test.ts
__tests__/integration/helpers/test-client.ts
__tests__/integration/helpers/msw-handlers.ts
__tests__/integration/helpers/test-db.ts
```

**Example Test - Request Routes**:
```typescript
// __tests__/integration/api/requests.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createTestClient } from '../helpers/test-client'
import { setupMSW } from '../helpers/msw-handlers'
import { createTestUser, cleanupTestData } from '../helpers/test-db'

const server = setupMSW()

describe('POST /api/requests', () => {
  let testClient: any
  let testUser: any
  let authToken: string

  beforeAll(async () => {
    server.listen()
    testUser = await createTestUser()
    authToken = await testClient.getAuthToken(testUser.id)
  })

  afterAll(async () => {
    server.close()
    await cleanupTestData()
  })

  beforeEach(() => {
    testClient = createTestClient()
  })

  it('should create flight request with valid data', async () => {
    const requestData = {
      departure_airport: 'KTEB',
      arrival_airport: 'KVNY',
      passengers: 6,
      departure_date: '2025-11-15',
      client_email: 'john@example.com'
    }

    const response = await testClient
      .post('/api/requests')
      .set('Authorization', `Bearer ${authToken}`)
      .send(requestData)

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({
      id: expect.any(String),
      departure_airport: 'KTEB',
      arrival_airport: 'KVNY',
      status: 'CREATED',
      user_id: testUser.id
    })
  })

  it('should return 400 for missing required fields', async () => {
    const invalidData = {
      departure_airport: 'KTEB'
      // Missing arrival_airport, passengers, date
    }

    const response = await testClient
      .post('/api/requests')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidData)

    expect(response.status).toBe(400)
    expect(response.body.error).toContain('Missing required fields')
  })

  it('should return 401 for unauthenticated requests', async () => {
    const requestData = {
      departure_airport: 'KTEB',
      arrival_airport: 'KVNY',
      passengers: 6,
      departure_date: '2025-11-15'
    }

    const response = await testClient
      .post('/api/requests')
      .send(requestData)

    expect(response.status).toBe(401)
  })

  it('should return 400 for invalid airport codes', async () => {
    const requestData = {
      departure_airport: 'INVALID',
      arrival_airport: 'KVNY',
      passengers: 6,
      departure_date: '2025-11-15'
    }

    const response = await testClient
      .post('/api/requests')
      .set('Authorization', `Bearer ${authToken}`)
      .send(requestData)

    expect(response.status).toBe(400)
    expect(response.body.error).toContain('Invalid airport code')
  })

  it('should return 400 for invalid passenger count', async () => {
    const requestData = {
      departure_airport: 'KTEB',
      arrival_airport: 'KVNY',
      passengers: -1,
      departure_date: '2025-11-15'
    }

    const response = await testClient
      .post('/api/requests')
      .set('Authorization', `Bearer ${authToken}`)
      .send(requestData)

    expect(response.status).toBe(400)
    expect(response.body.error).toContain('Invalid passenger count')
  })

  it('should return 400 for past dates', async () => {
    const requestData = {
      departure_airport: 'KTEB',
      arrival_airport: 'KVNY',
      passengers: 6,
      departure_date: '2020-01-01'
    }

    const response = await testClient
      .post('/api/requests')
      .set('Authorization', `Bearer ${authToken}`)
      .send(requestData)

    expect(response.status).toBe(400)
    expect(response.body.error).toContain('Date must be in the future')
  })

  it('should store request in database', async () => {
    const requestData = {
      departure_airport: 'KTEB',
      arrival_airport: 'KVNY',
      passengers: 6,
      departure_date: '2025-11-15'
    }

    const response = await testClient
      .post('/api/requests')
      .set('Authorization', `Bearer ${authToken}`)
      .send(requestData)

    // Verify in database
    const { data } = await testClient.supabase
      .from('flight_requests')
      .select()
      .eq('id', response.body.id)
      .single()

    expect(data).toBeTruthy()
    expect(data.departure_airport).toBe('KTEB')
  })

  it('should trigger orchestrator job in queue', async () => {
    const queueSpy = vi.spyOn(testClient.queue, 'add')

    const requestData = {
      departure_airport: 'KTEB',
      arrival_airport: 'KVNY',
      passengers: 6,
      departure_date: '2025-11-15'
    }

    await testClient
      .post('/api/requests')
      .set('Authorization', `Bearer ${authToken}`)
      .send(requestData)

    expect(queueSpy).toHaveBeenCalledWith(
      'orchestrate_workflow',
      expect.objectContaining({
        request_id: expect.any(String)
      })
    )
  })
})

describe('GET /api/requests', () => {
  let testClient: any
  let testUser: any
  let authToken: string

  beforeAll(async () => {
    testUser = await createTestUser()
    authToken = await testClient.getAuthToken(testUser.id)

    // Create test requests
    await testClient.supabase.from('flight_requests').insert([
      {
        user_id: testUser.id,
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        status: 'CREATED'
      },
      {
        user_id: testUser.id,
        departure_airport: 'KJFK',
        arrival_airport: 'KLAX',
        passengers: 4,
        status: 'COMPLETED'
      }
    ])
  })

  afterAll(async () => {
    await cleanupTestData()
  })

  it('should return all user requests', async () => {
    const response = await testClient
      .get('/api/requests')
      .set('Authorization', `Bearer ${authToken}`)

    expect(response.status).toBe(200)
    expect(response.body).toHaveLength(2)
  })

  it('should enforce RLS - only return user\'s own requests', async () => {
    // Create another user with requests
    const otherUser = await createTestUser()
    await testClient.supabase.from('flight_requests').insert({
      user_id: otherUser.id,
      departure_airport: 'KBOS',
      arrival_airport: 'KSFO',
      passengers: 2,
      status: 'CREATED'
    })

    const response = await testClient
      .get('/api/requests')
      .set('Authorization', `Bearer ${authToken}`)

    // Should only see own requests, not other user's
    expect(response.body).toHaveLength(2)
    expect(response.body.every((r: any) => r.user_id === testUser.id)).toBe(true)
  })

  it('should return 401 for unauthenticated requests', async () => {
    const response = await testClient.get('/api/requests')

    expect(response.status).toBe(401)
  })

  it('should filter by status query parameter', async () => {
    const response = await testClient
      .get('/api/requests?status=COMPLETED')
      .set('Authorization', `Bearer ${authToken}`)

    expect(response.status).toBe(200)
    expect(response.body).toHaveLength(1)
    expect(response.body[0].status).toBe('COMPLETED')
  })

  it('should support pagination', async () => {
    const response = await testClient
      .get('/api/requests?limit=1&offset=0')
      .set('Authorization', `Bearer ${authToken}`)

    expect(response.status).toBe(200)
    expect(response.body).toHaveLength(1)
  })
})

describe('GET /api/requests/:id', () => {
  let testClient: any
  let testUser: any
  let authToken: string
  let testRequest: any

  beforeAll(async () => {
    testUser = await createTestUser()
    authToken = await testClient.getAuthToken(testUser.id)

    const { data } = await testClient.supabase
      .from('flight_requests')
      .insert({
        user_id: testUser.id,
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        status: 'CREATED'
      })
      .select()
      .single()

    testRequest = data
  })

  afterAll(async () => {
    await cleanupTestData()
  })

  it('should return single request by ID', async () => {
    const response = await testClient
      .get(`/api/requests/${testRequest.id}`)
      .set('Authorization', `Bearer ${authToken}`)

    expect(response.status).toBe(200)
    expect(response.body.id).toBe(testRequest.id)
    expect(response.body.departure_airport).toBe('KTEB')
  })

  it('should return 404 for non-existent request', async () => {
    const response = await testClient
      .get('/api/requests/non-existent-id')
      .set('Authorization', `Bearer ${authToken}`)

    expect(response.status).toBe(404)
  })

  it('should return 403 when accessing another user\'s request', async () => {
    const otherUser = await createTestUser()
    const { data: otherRequest } = await testClient.supabase
      .from('flight_requests')
      .insert({
        user_id: otherUser.id,
        departure_airport: 'KBOS',
        arrival_airport: 'KSFO',
        passengers: 2,
        status: 'CREATED'
      })
      .select()
      .single()

    const response = await testClient
      .get(`/api/requests/${otherRequest.id}`)
      .set('Authorization', `Bearer ${authToken}`)

    expect(response.status).toBe(403)
  })

  it('should include related quotes and proposals', async () => {
    // Add quote to request
    await testClient.supabase.from('quotes').insert({
      request_id: testRequest.id,
      operator_name: 'ABC Jets',
      aircraft_type: 'Citation X',
      base_price: 50000
    })

    const response = await testClient
      .get(`/api/requests/${testRequest.id}?include=quotes,proposals`)
      .set('Authorization', `Bearer ${authToken}`)

    expect(response.status).toBe(200)
    expect(response.body.quotes).toBeDefined()
    expect(response.body.proposals).toBeDefined()
  })
})

describe('PATCH /api/requests/:id', () => {
  let testClient: any
  let testUser: any
  let authToken: string
  let testRequest: any

  beforeEach(async () => {
    testUser = await createTestUser()
    authToken = await testClient.getAuthToken(testUser.id)

    const { data } = await testClient.supabase
      .from('flight_requests')
      .insert({
        user_id: testUser.id,
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        status: 'CREATED'
      })
      .select()
      .single()

    testRequest = data
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  it('should update request with valid data', async () => {
    const updateData = {
      passengers: 8,
      departure_date: '2025-11-20'
    }

    const response = await testClient
      .patch(`/api/requests/${testRequest.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateData)

    expect(response.status).toBe(200)
    expect(response.body.passengers).toBe(8)
    expect(response.body.departure_date).toBe('2025-11-20')
  })

  it('should return 400 for invalid update data', async () => {
    const updateData = {
      passengers: -1
    }

    const response = await testClient
      .patch(`/api/requests/${testRequest.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateData)

    expect(response.status).toBe(400)
  })

  it('should return 403 when updating another user\'s request', async () => {
    const otherUser = await createTestUser()
    const { data: otherRequest } = await testClient.supabase
      .from('flight_requests')
      .insert({
        user_id: otherUser.id,
        departure_airport: 'KBOS',
        arrival_airport: 'KSFO',
        passengers: 2,
        status: 'CREATED'
      })
      .select()
      .single()

    const response = await testClient
      .patch(`/api/requests/${otherRequest.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ passengers: 4 })

    expect(response.status).toBe(403)
  })

  it('should prevent updating completed requests', async () => {
    await testClient.supabase
      .from('flight_requests')
      .update({ status: 'COMPLETED' })
      .eq('id', testRequest.id)

    const response = await testClient
      .patch(`/api/requests/${testRequest.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ passengers: 8 })

    expect(response.status).toBe(400)
    expect(response.body.error).toContain('Cannot update completed request')
  })
})

describe('DELETE /api/requests/:id', () => {
  let testClient: any
  let testUser: any
  let authToken: string
  let testRequest: any

  beforeEach(async () => {
    testUser = await createTestUser()
    authToken = await testClient.getAuthToken(testUser.id)

    const { data } = await testClient.supabase
      .from('flight_requests')
      .insert({
        user_id: testUser.id,
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        status: 'CREATED'
      })
      .select()
      .single()

    testRequest = data
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  it('should cancel request (soft delete)', async () => {
    const response = await testClient
      .delete(`/api/requests/${testRequest.id}`)
      .set('Authorization', `Bearer ${authToken}`)

    expect(response.status).toBe(200)

    // Verify status changed to CANCELLED
    const { data } = await testClient.supabase
      .from('flight_requests')
      .select()
      .eq('id', testRequest.id)
      .single()

    expect(data.status).toBe('CANCELLED')
  })

  it('should return 403 when cancelling another user\'s request', async () => {
    const otherUser = await createTestUser()
    const { data: otherRequest } = await testClient.supabase
      .from('flight_requests')
      .insert({
        user_id: otherUser.id,
        departure_airport: 'KBOS',
        arrival_airport: 'KSFO',
        passengers: 2,
        status: 'CREATED'
      })
      .select()
      .single()

    const response = await testClient
      .delete(`/api/requests/${otherRequest.id}`)
      .set('Authorization', `Bearer ${authToken}`)

    expect(response.status).toBe(403)
  })

  it('should prevent cancelling completed requests', async () => {
    await testClient.supabase
      .from('flight_requests')
      .update({ status: 'COMPLETED' })
      .eq('id', testRequest.id)

    const response = await testClient
      .delete(`/api/requests/${testRequest.id}`)
      .set('Authorization', `Bearer ${authToken}`)

    expect(response.status).toBe(400)
    expect(response.body.error).toContain('Cannot cancel completed request')
  })
})
```

**Example Test - Agent Routes**:
```typescript
// __tests__/integration/api/agents.test.ts
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createTestClient } from '../helpers/test-client'
import { setupMSW } from '../helpers/msw-handlers'
import { createTestUser } from '../helpers/test-db'

const server = setupMSW()

describe('POST /api/agents/orchestrator', () => {
  let testClient: any
  let testUser: any
  let authToken: string

  beforeAll(async () => {
    server.listen()
    testUser = await createTestUser()
    authToken = await testClient.getAuthToken(testUser.id)
  })

  afterAll(() => {
    server.close()
  })

  it('should trigger orchestrator with valid request ID', async () => {
    const { data: request } = await testClient.supabase
      .from('flight_requests')
      .insert({
        user_id: testUser.id,
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        status: 'CREATED'
      })
      .select()
      .single()

    const response = await testClient
      .post('/api/agents/orchestrator')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ request_id: request.id })

    expect(response.status).toBe(200)
    expect(response.body.job_id).toBeDefined()
  })

  it('should queue orchestrator job in BullMQ', async () => {
    const queueSpy = vi.spyOn(testClient.queue, 'add')

    const { data: request } = await testClient.supabase
      .from('flight_requests')
      .insert({
        user_id: testUser.id,
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        status: 'CREATED'
      })
      .select()
      .single()

    await testClient
      .post('/api/agents/orchestrator')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ request_id: request.id })

    expect(queueSpy).toHaveBeenCalledWith(
      'orchestrate_workflow',
      expect.objectContaining({
        request_id: request.id
      }),
      expect.objectContaining({
        priority: expect.any(Number)
      })
    )
  })

  it('should return 404 for non-existent request', async () => {
    const response = await testClient
      .post('/api/agents/orchestrator')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ request_id: 'non-existent' })

    expect(response.status).toBe(404)
  })

  it('should return 403 when triggering for another user\'s request', async () => {
    const otherUser = await createTestUser()
    const { data: otherRequest } = await testClient.supabase
      .from('flight_requests')
      .insert({
        user_id: otherUser.id,
        departure_airport: 'KBOS',
        arrival_airport: 'KSFO',
        passengers: 2,
        status: 'CREATED'
      })
      .select()
      .single()

    const response = await testClient
      .post('/api/agents/orchestrator')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ request_id: otherRequest.id })

    expect(response.status).toBe(403)
  })
})

describe('POST /api/agents/flight-search', () => {
  it('should trigger flight search with valid parameters', async () => {
    const searchParams = {
      departure_airport: 'KTEB',
      arrival_airport: 'KVNY',
      passengers: 6,
      departure_date: '2025-11-15'
    }

    const response = await testClient
      .post('/api/agents/flight-search')
      .set('Authorization', `Bearer ${authToken}`)
      .send(searchParams)

    expect(response.status).toBe(200)
    expect(response.body.job_id).toBeDefined()
  })

  it('should mock Avinode API call via MSW', async () => {
    // MSW handler intercepts Avinode API
    const searchParams = {
      departure_airport: 'KTEB',
      arrival_airport: 'KVNY',
      passengers: 6,
      departure_date: '2025-11-15'
    }

    const response = await testClient
      .post('/api/agents/flight-search')
      .set('Authorization', `Bearer ${authToken}`)
      .send(searchParams)

    expect(response.status).toBe(200)
    // MSW returns mocked aircraft data
    expect(response.body.aircraft_found).toBeGreaterThan(0)
  })
})
```

**MSW Setup**:
```typescript
// __tests__/integration/helpers/msw-handlers.ts
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

export const setupMSW = () => {
  const handlers = [
    // Mock OpenAI API
    http.post('https://api.openai.com/v1/chat/completions', () => {
      return HttpResponse.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                departure_airport: 'KTEB',
                arrival_airport: 'KVNY',
                passengers: 6,
                departure_date: '2025-11-15',
                urgency: 'normal',
                complexity: 'simple'
              })
            }
          }
        ]
      })
    }),

    // Mock Avinode API
    http.post('https://api.avinode.com/v1/search', () => {
      return HttpResponse.json({
        aircraft: [
          {
            type: 'Citation X',
            operator: 'ABC Jets',
            capacity: 8,
            available: true
          }
        ]
      })
    }),

    // Mock Gmail API
    http.post('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', () => {
      return HttpResponse.json({
        id: 'msg-123',
        threadId: 'thread-123',
        labelIds: ['SENT']
      })
    })
  ]

  return setupServer(...handlers)
}
```

**Run Tests** (should FAIL initially):
```bash
npm test -- integration/api
# Expected: Tests fail because routes not fully implemented
```

### Step 2: Implement Minimal Code (Green Phase)

Implement API routes to make tests pass:

```typescript
// app/api/requests/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  // Validation
  if (!body.departure_airport || !body.arrival_airport || !body.passengers) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createClient()

  // Create request
  const { data, error } = await supabase
    .from('flight_requests')
    .insert({
      user_id: userId,
      ...body,
      status: 'CREATED'
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Queue orchestrator job
  await queue.add('orchestrate_workflow', { request_id: data.id })

  return NextResponse.json(data, { status: 201 })
}

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient()

  const { data, error } = await supabase
    .from('flight_requests')
    .select()
    .eq('user_id', userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
```

**Run Tests Again**:
```bash
npm test -- integration/api
# Expected: More tests pass ✓
```

### Step 3: Refactor (Blue Phase)

- Extract validation logic
- Add middleware for common operations
- Improve error handling
- Add request/response logging

**Run Tests After Refactoring**:
```bash
npm test -- integration/api
# Expected: All tests still pass ✓
```

---

## 4. IMPLEMENTATION STEPS

### Pre-Implementation Checklist

- [ ] TASK-018 (API Routes Layer) completed
- [ ] Test database configured
- [ ] MSW installed and configured
- [ ] Supertest or similar HTTP testing library installed

### Step-by-Step Implementation

**Step 1**: Install Dependencies
```bash
npm install -D msw supertest @types/supertest
```

**Step 2**: Configure MSW
- Create MSW handlers for external APIs
- Setup server in test environment
- Add request/response interceptors

**Step 3**: Create Test Database Helpers
```typescript
// __tests__/integration/helpers/test-db.ts
export async function createTestUser() {
  // Create test user in database
}

export async function cleanupTestData() {
  // Clean up all test data
}
```

**Step 4**: Create Test Client
```typescript
// __tests__/integration/helpers/test-client.ts
export function createTestClient() {
  // Return HTTP client with helpers
}
```

**Step 5**: Write Integration Tests for Request Routes (20+ tests)
- POST /api/requests (8 tests)
- GET /api/requests (5 tests)
- GET /api/requests/:id (4 tests)
- PATCH /api/requests/:id (4 tests)
- DELETE /api/requests/:id (3 tests)

**Step 6**: Write Integration Tests for Agent Routes (15+ tests)
- POST /api/agents/orchestrator (5 tests)
- POST /api/agents/client-data (3 tests)
- POST /api/agents/flight-search (4 tests)
- POST /api/agents/proposal-analysis (2 tests)
- POST /api/agents/communication (1 test)

**Step 7**: Write Integration Tests for Webhook Routes (10+ tests)
- POST /api/webhooks/avinode/quotes (4 tests)
- POST /api/webhooks/gmail/delivery (3 tests)
- POST /api/webhooks/clerk (3 tests)

**Step 8**: Write Integration Tests for Quote Routes (6+ tests)
- GET /api/requests/:id/quotes (4 tests)
- POST /api/quotes/:id/analyze (2 tests)

**Step 9**: Write Integration Tests for Proposal Routes (5+ tests)
- GET /api/requests/:id/proposals (3 tests)
- POST /api/proposals/:id/send (2 tests)

**Step 10**: Run Full Integration Test Suite
```bash
npm run test:integration
```

### Implementation Validation

After each step:
- [ ] Tests pass
- [ ] Database is cleaned up after tests
- [ ] No test pollution (tests can run in any order)
- [ ] MSW mocks working correctly

---

## 5. GIT WORKFLOW

### Branch Creation
```bash
git checkout main
git pull origin main
git checkout -b test/api-integration-tests
```

### Commit Guidelines
```bash
git add __tests__/integration/api/requests.test.ts
git commit -m "test(api): add integration tests for request routes (20+ tests)"

git add __tests__/integration/api/agents.test.ts
git commit -m "test(api): add integration tests for agent routes (15+ tests)"

git add __tests__/integration/helpers/msw-handlers.ts
git commit -m "test(helpers): setup MSW for external API mocking"

git push origin test/api-integration-tests
```

### Pull Request
```bash
gh pr create --title "Test: Integration Tests for All API Routes" \
  --body "Implements 56+ integration tests for all API endpoints.

**Routes Tested:**
- Request routes: 20 tests
- Agent routes: 15 tests
- Webhook routes: 10 tests
- Quote routes: 6 tests
- Proposal routes: 5 tests

**External APIs Mocked:**
- OpenAI
- Avinode
- Gmail
- Google Sheets

Closes #TASK-027"
```

---

## 6-11. STANDARD SECTIONS

(Following template structure)

- Code Review Checklist
- Testing Requirements
- Definition of Done
- Resources & References
- Notes & Questions
- Completion Summary

---

**Task Status**: ⏳ PENDING

**Completed By**: -
**Completed Date**: -
