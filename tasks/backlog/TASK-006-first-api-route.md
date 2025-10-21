# First API Route Implementation (POST /api/requests)

**Task ID**: TASK-006
**Created**: 2025-10-20
**Assigned To**: Full-Stack Developer
**Status**: `pending`
**Priority**: `high`
**Estimated Time**: 4 hours
**Actual Time**: - (update when complete)

---

## 1. TASK OVERVIEW

### Objective
Implement the first complete API route (POST /api/requests and GET /api/requests) to prove the entire stack works end-to-end: authentication via Clerk, database operations via Supabase, input validation with Zod, error handling, and proper TypeScript typing. This serves as the blueprint for all future API routes.

### User Story
**As an** ISO agent
**I want to** create and retrieve flight requests via API
**So that** the frontend can submit requests and display my request history

### Business Value
The `/api/requests` endpoint is the foundation of the entire RFP workflow. It proves that:
- **Authentication works**: Clerk JWT validation
- **Database works**: Supabase client operations with RLS
- **Validation works**: Input sanitization and error handling
- **Types work**: End-to-end type safety
- **Architecture works**: Clean separation of concerns

This task validates the complete stack and establishes patterns for all future API routes.

---

## 2. REQUIREMENTS & ACCEPTANCE CRITERIA

### Functional Requirements

**FR-1**: POST /api/requests SHALL create flight requests
- Accept JSON body with flight details
- Validate all required fields
- Authenticate user via Clerk
- Store request in Supabase with user_id
- Return created request with ID
- Trigger background job for processing

**FR-2**: GET /api/requests SHALL list user's requests
- Return only authenticated user's requests (RLS enforced)
- Support pagination via query params
- Support filtering by status
- Include related data (client info if available)
- Sort by created_at descending

**FR-3**: GET /api/requests/:id SHALL retrieve single request
- Return request by ID
- Verify user owns request (RLS)
- Include all related data (quotes, proposals, workflow history)
- Return 404 if not found
- Return 403 if user doesn't own request

**FR-4**: Input validation SHALL prevent invalid data
- Use Zod schemas for request body validation
- Validate airport codes (3-4 letter ICAO/IATA)
- Validate passenger count (1-20)
- Validate date format (ISO 8601)
- Return 400 with detailed error messages

**FR-5**: Error handling SHALL be comprehensive
- Catch and log all errors
- Return user-friendly error messages
- Include error codes for client handling
- Log stack traces server-side only
- Report critical errors to Sentry

### Acceptance Criteria

- [ ] **AC-1**: POST /api/requests creates request successfully
- [ ] **AC-2**: Created request has valid UUID and timestamps
- [ ] **AC-3**: Request associated with authenticated user
- [ ] **AC-4**: GET /api/requests returns only user's requests
- [ ] **AC-5**: Pagination works (limit, offset query params)
- [ ] **AC-6**: Status filtering works (e.g., ?status=pending)
- [ ] **AC-7**: GET /api/requests/:id returns single request
- [ ] **AC-8**: Invalid input returns 400 with validation errors
- [ ] **AC-9**: Unauthenticated requests return 401
- [ ] **AC-10**: Unauthorized access returns 403
- [ ] **AC-11**: Missing resources return 404
- [ ] **AC-12**: Background job queued after creation
- [ ] **AC-13**: Tests pass with >80% coverage
- [ ] **AC-14**: TypeScript has no errors

### Non-Functional Requirements

- **Performance**: API responds in <500ms for simple queries
- **Security**: All endpoints protected by Clerk authentication
- **Reliability**: Automatic retry for transient database failures
- **Maintainability**: Clean code following SOLID principles
- **Type Safety**: Full TypeScript coverage, no `any` types

---

## 3. TEST-DRIVEN DEVELOPMENT (TDD) APPROACH

### Step 1: Write Tests FIRST (Red Phase)

**Test Files to Create**:
```
__tests__/unit/api/requests/validation.test.ts
__tests__/integration/api/requests/post.test.ts
__tests__/integration/api/requests/get.test.ts
__tests__/integration/api/requests/get-by-id.test.ts
__tests__/e2e/api/requests/workflow.test.ts
```

**Example Test (Write This First)**:
```typescript
// __tests__/integration/api/requests/post.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { POST } from '@/app/api/requests/route'
import { NextRequest } from 'next/server'

describe('POST /api/requests', () => {
  let testUserId: string

  beforeEach(async () => {
    // Setup: Create test user
    testUserId = 'test-user-001'
  })

  afterEach(async () => {
    // Cleanup: Remove test data
  })

  it('should create flight request successfully', async () => {
    const requestBody = {
      departureAirport: 'TEB',
      arrivalAirport: 'VNY',
      departureDate: '2025-11-15T10:00:00Z',
      passengers: 4,
      specialRequests: 'Catering required'
    }

    const request = new NextRequest('http://localhost:3000/api/requests', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.request).toBeDefined()
    expect(data.request.id).toBeDefined()
    expect(data.request.departure_airport).toBe('TEB')
    expect(data.request.arrival_airport).toBe('VNY')
    expect(data.request.passengers).toBe(4)
    expect(data.request.status).toBe('pending')
    expect(data.request.user_id).toBe(testUserId)
  })

  it('should return 400 for invalid airport code', async () => {
    const requestBody = {
      departureAirport: 'INVALID123',
      arrivalAirport: 'VNY',
      departureDate: '2025-11-15T10:00:00Z',
      passengers: 4
    }

    const request = new NextRequest('http://localhost:3000/api/requests', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('airport code')
  })

  it('should return 400 for invalid passenger count', async () => {
    const requestBody = {
      departureAirport: 'TEB',
      arrivalAirport: 'VNY',
      departureDate: '2025-11-15T10:00:00Z',
      passengers: 0 // Invalid: must be at least 1
    }

    const request = new NextRequest('http://localhost:3000/api/requests', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('passenger')
  })

  it('should return 400 for missing required fields', async () => {
    const requestBody = {
      departureAirport: 'TEB'
      // Missing: arrivalAirport, departureDate, passengers
    }

    const request = new NextRequest('http://localhost:3000/api/requests', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.errors).toBeDefined()
    expect(data.errors.length).toBeGreaterThan(0)
  })

  it('should return 401 for unauthenticated request', async () => {
    const requestBody = {
      departureAirport: 'TEB',
      arrivalAirport: 'VNY',
      departureDate: '2025-11-15T10:00:00Z',
      passengers: 4
    }

    // Mock unauthenticated state
    const request = new NextRequest('http://localhost:3000/api/requests', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toContain('Unauthorized')
  })

  it('should associate request with authenticated user', async () => {
    const requestBody = {
      departureAirport: 'JFK',
      arrivalAirport: 'LAX',
      departureDate: '2025-12-01T14:00:00Z',
      passengers: 6
    }

    const request = new NextRequest('http://localhost:3000/api/requests', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.request.user_id).toBe(testUserId)
  })

  it('should queue background job after creation', async () => {
    const requestBody = {
      departureAirport: 'TEB',
      arrivalAirport: 'VNY',
      departureDate: '2025-11-15T10:00:00Z',
      passengers: 4
    }

    const request = new NextRequest('http://localhost:3000/api/requests', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.jobId).toBeDefined()
  })
})
```

**GET Requests List Test**:
```typescript
// __tests__/integration/api/requests/get.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { GET } from '@/app/api/requests/route'
import { NextRequest } from 'next/server'

describe('GET /api/requests', () => {
  let testUserId: string
  let testRequestIds: string[] = []

  beforeEach(async () => {
    // Create test user and multiple requests
    testUserId = 'test-user-002'

    // Create 3 test requests
    testRequestIds = await createTestRequests(testUserId, 3)
  })

  afterEach(async () => {
    // Cleanup
    await cleanupTestData(testUserId)
  })

  it('should return user\'s flight requests', async () => {
    const request = new NextRequest('http://localhost:3000/api/requests')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.requests).toBeDefined()
    expect(Array.isArray(data.requests)).toBe(true)
    expect(data.requests.length).toBeGreaterThanOrEqual(3)

    // Verify all returned requests belong to user
    data.requests.forEach((req: any) => {
      expect(req.user_id).toBe(testUserId)
    })
  })

  it('should support pagination with limit and offset', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/requests?limit=2&offset=0'
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.requests.length).toBeLessThanOrEqual(2)
    expect(data.pagination).toBeDefined()
    expect(data.pagination.limit).toBe(2)
    expect(data.pagination.offset).toBe(0)
    expect(data.pagination.total).toBeGreaterThanOrEqual(3)
  })

  it('should filter by status', async () => {
    // Update one request to 'analyzing' status
    await updateRequestStatus(testRequestIds[0], 'analyzing')

    const request = new NextRequest(
      'http://localhost:3000/api/requests?status=analyzing'
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    data.requests.forEach((req: any) => {
      expect(req.status).toBe('analyzing')
    })
  })

  it('should sort by created_at descending', async () => {
    const request = new NextRequest('http://localhost:3000/api/requests')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)

    // Verify descending order
    for (let i = 1; i < data.requests.length; i++) {
      const prev = new Date(data.requests[i - 1].created_at)
      const curr = new Date(data.requests[i].created_at)
      expect(prev.getTime()).toBeGreaterThanOrEqual(curr.getTime())
    }
  })

  it('should return 401 for unauthenticated request', async () => {
    // Mock unauthenticated state
    const request = new NextRequest('http://localhost:3000/api/requests')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
  })

  it('should not return other users\' requests', async () => {
    // Create requests for different user
    const otherUserId = 'other-user-001'
    await createTestRequests(otherUserId, 2)

    const request = new NextRequest('http://localhost:3000/api/requests')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)

    // Verify no requests from other user
    const hasOtherUser = data.requests.some(
      (req: any) => req.user_id === otherUserId
    )
    expect(hasOtherUser).toBe(false)
  })
})
```

**GET Single Request Test**:
```typescript
// __tests__/integration/api/requests/get-by-id.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { GET } from '@/app/api/requests/[id]/route'
import { NextRequest } from 'next/server'

describe('GET /api/requests/:id', () => {
  let testUserId: string
  let testRequestId: string

  beforeEach(async () => {
    testUserId = 'test-user-003'
    testRequestId = await createSingleTestRequest(testUserId)
  })

  afterEach(async () => {
    await cleanupTestData(testUserId)
  })

  it('should return request by ID', async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/requests/${testRequestId}`
    )

    const response = await GET(request, { params: { id: testRequestId } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.request).toBeDefined()
    expect(data.request.id).toBe(testRequestId)
  })

  it('should include related data', async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/requests/${testRequestId}`
    )

    const response = await GET(request, { params: { id: testRequestId } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.request).toBeDefined()
    // Should include client, quotes, proposals, workflow_history
    expect('client' in data.request).toBe(true)
    expect('quotes' in data.request).toBe(true)
    expect('workflow_history' in data.request).toBe(true)
  })

  it('should return 404 for non-existent request', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000'
    const request = new NextRequest(
      `http://localhost:3000/api/requests/${fakeId}`
    )

    const response = await GET(request, { params: { id: fakeId } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toContain('not found')
  })

  it('should return 403 for request owned by different user', async () => {
    // Create request for different user
    const otherUserId = 'other-user-002'
    const otherRequestId = await createSingleTestRequest(otherUserId)

    // Try to access as testUserId
    const request = new NextRequest(
      `http://localhost:3000/api/requests/${otherRequestId}`
    )

    const response = await GET(request, { params: { id: otherRequestId } })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error).toContain('Forbidden')
  })
})
```

**Validation Test**:
```typescript
// __tests__/unit/api/requests/validation.test.ts
import { describe, it, expect } from 'vitest'
import { createFlightRequestSchema } from '@/app/api/requests/validation'

describe('Flight Request Validation', () => {
  it('should validate correct request data', () => {
    const validData = {
      departureAirport: 'TEB',
      arrivalAirport: 'VNY',
      departureDate: '2025-11-15T10:00:00Z',
      passengers: 4,
      specialRequests: 'Pet-friendly'
    }

    const result = createFlightRequestSchema.safeParse(validData)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.departureAirport).toBe('TEB')
    }
  })

  it('should reject invalid airport codes', () => {
    const invalidData = {
      departureAirport: 'TOOLONG',
      arrivalAirport: 'VNY',
      departureDate: '2025-11-15T10:00:00Z',
      passengers: 4
    }

    const result = createFlightRequestSchema.safeParse(invalidData)

    expect(result.success).toBe(false)
  })

  it('should reject invalid passenger count', () => {
    const invalidData = {
      departureAirport: 'TEB',
      arrivalAirport: 'VNY',
      departureDate: '2025-11-15T10:00:00Z',
      passengers: 0
    }

    const result = createFlightRequestSchema.safeParse(invalidData)

    expect(result.success).toBe(false)
  })

  it('should reject invalid date format', () => {
    const invalidData = {
      departureAirport: 'TEB',
      arrivalAirport: 'VNY',
      departureDate: 'invalid-date',
      passengers: 4
    }

    const result = createFlightRequestSchema.safeParse(invalidData)

    expect(result.success).toBe(false)
  })

  it('should require all mandatory fields', () => {
    const incompleteData = {
      departureAirport: 'TEB'
      // Missing: arrivalAirport, departureDate, passengers
    }

    const result = createFlightRequestSchema.safeParse(incompleteData)

    expect(result.success).toBe(false)
  })
})
```

**Run Tests** (should FAIL):
```bash
npm test -- api/requests
# Expected: Tests fail because routes don't exist yet
```

### Step 2: Implement Minimal Code (Green Phase)

Write the minimum code to make tests pass.

**Implementation Checklist**:
- [ ] Create validation schemas
- [ ] Implement POST handler
- [ ] Implement GET list handler
- [ ] Implement GET by ID handler
- [ ] Add error handling
- [ ] Queue background jobs
- [ ] Tests pass

### Step 3: Refactor (Blue Phase)

Improve code quality without changing behavior.

**Refactoring Checklist**:
- [ ] Extract common logic to utilities
- [ ] Improve error messages
- [ ] Add JSDoc comments
- [ ] Optimize database queries
- [ ] Add logging

---

## 4. IMPLEMENTATION STEPS

### Pre-Implementation Checklist

Before starting:
- [ ] TASK-001 (Clerk Auth) completed
- [ ] TASK-002 (Database Schema) completed
- [ ] TASK-005 (Supabase Clients) completed
- [ ] Environment variables configured
- [ ] Dependencies installed

### Step-by-Step Implementation

**Step 1**: Install Dependencies

```bash
npm install zod
npm install @sentry/nextjs
```

**Step 2**: Create Validation Schemas

File: `app/api/requests/validation.ts`
```typescript
import { z } from 'zod'

/**
 * Schema for creating a flight request
 */
export const createFlightRequestSchema = z.object({
  departureAirport: z
    .string()
    .min(3, 'Airport code must be at least 3 characters')
    .max(4, 'Airport code must be at most 4 characters')
    .regex(/^[A-Z]{3,4}$/, 'Airport code must be uppercase letters'),

  arrivalAirport: z
    .string()
    .min(3, 'Airport code must be at least 3 characters')
    .max(4, 'Airport code must be at most 4 characters')
    .regex(/^[A-Z]{3,4}$/, 'Airport code must be uppercase letters'),

  departureDate: z
    .string()
    .datetime('Departure date must be in ISO 8601 format'),

  returnDate: z
    .string()
    .datetime('Return date must be in ISO 8601 format')
    .optional(),

  passengers: z
    .number()
    .int('Passenger count must be an integer')
    .min(1, 'Must have at least 1 passenger')
    .max(20, 'Cannot exceed 20 passengers'),

  clientEmail: z
    .string()
    .email('Invalid email address')
    .optional(),

  specialRequests: z
    .string()
    .max(1000, 'Special requests must be under 1000 characters')
    .optional(),

  budgetRange: z
    .object({
      min: z.number().min(0).optional(),
      max: z.number().min(0).optional()
    })
    .optional()
})

export type CreateFlightRequestInput = z.infer<typeof createFlightRequestSchema>

/**
 * Schema for query parameters
 */
export const listRequestsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.enum([
    'pending',
    'analyzing',
    'searching',
    'quotes_received',
    'proposal_ready',
    'sent_to_client',
    'client_reviewing',
    'accepted',
    'rejected',
    'expired',
    'error'
  ]).optional()
})

export type ListRequestsQuery = z.infer<typeof listRequestsQuerySchema>
```

**Step 3**: Create POST Handler

File: `app/api/requests/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createFlightRequestSchema } from './validation'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUserId } from '@/lib/supabase/rls-helpers'
import { addOrchestratorJob } from '@/lib/queue/queues'
import { cookies } from 'next/headers'

/**
 * POST /api/requests
 * Create a new flight request
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const { userId: clerkUserId } = await auth()

    if (!clerkUserId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Please sign in to create requests.'
        },
        { status: 401 }
      )
    }

    // 2. Get Supabase user ID
    const userId = await getCurrentUserId()

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found in database. Please contact support.'
        },
        { status: 404 }
      )
    }

    // 3. Parse and validate request body
    const body = await request.json()
    const validation = createFlightRequestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          errors: validation.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    const validatedData = validation.data

    // 4. Create request in database
    const supabase = createServerClient(cookies())

    const { data: flightRequest, error: dbError } = await supabase
      .from('flight_requests')
      .insert({
        user_id: userId,
        departure_airport: validatedData.departureAirport,
        arrival_airport: validatedData.arrivalAirport,
        departure_date: validatedData.departureDate,
        return_date: validatedData.returnDate,
        passengers: validatedData.passengers,
        special_requests: validatedData.specialRequests,
        budget_range: validatedData.budgetRange,
        status: 'pending'
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error creating request:', dbError)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create flight request. Please try again.'
        },
        { status: 500 }
      )
    }

    // 5. Queue background job for processing
    const job = await addOrchestratorJob({
      requestId: flightRequest.id,
      userId: userId,
      type: 'analyze-request',
      message: `Flight from ${validatedData.departureAirport} to ${validatedData.arrivalAirport}`,
      clientEmail: validatedData.clientEmail,
      priority: 'normal'
    })

    // 6. Return success response
    return NextResponse.json(
      {
        success: true,
        request: flightRequest,
        jobId: job.id,
        message: 'Flight request created successfully'
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Unexpected error in POST /api/requests:', error)

    // Report to Sentry
    if (process.env.SENTRY_DSN) {
      const Sentry = await import('@sentry/nextjs')
      Sentry.captureException(error)
    }

    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred. Please try again later.'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/requests
 * List user's flight requests with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const { userId: clerkUserId } = await auth()

    if (!clerkUserId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Please sign in.'
        },
        { status: 401 }
      )
    }

    // 2. Get Supabase user ID
    const userId = await getCurrentUserId()

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found in database.'
        },
        { status: 404 }
      )
    }

    // 3. Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const queryParams = {
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      status: searchParams.get('status')
    }

    const validation = listRequestsQuerySchema.safeParse(queryParams)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          errors: validation.error.errors
        },
        { status: 400 }
      )
    }

    const { limit, offset, status } = validation.data

    // 4. Query database
    const supabase = createServerClient(cookies())

    let query = supabase
      .from('flight_requests')
      .select('*, client:clients(*)', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: requests, error: dbError, count } = await query

    if (dbError) {
      console.error('Database error fetching requests:', dbError)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch flight requests.'
        },
        { status: 500 }
      )
    }

    // 5. Return response
    return NextResponse.json({
      success: true,
      requests,
      pagination: {
        limit,
        offset,
        total: count || 0
      }
    })

  } catch (error) {
    console.error('Unexpected error in GET /api/requests:', error)

    if (process.env.SENTRY_DSN) {
      const Sentry = await import('@sentry/nextjs')
      Sentry.captureException(error)
    }

    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred.'
      },
      { status: 500 }
    )
  }
}
```

**Step 4**: Create GET by ID Handler

File: `app/api/requests/[id]/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUserId } from '@/lib/supabase/rls-helpers'
import { cookies } from 'next/headers'

/**
 * GET /api/requests/:id
 * Get single flight request by ID with all related data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authenticate user
    const { userId: clerkUserId } = await auth()

    if (!clerkUserId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Please sign in.'
        },
        { status: 401 }
      )
    }

    // 2. Get Supabase user ID
    const userId = await getCurrentUserId()

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found in database.'
        },
        { status: 404 }
      )
    }

    // 3. Query database with related data
    const supabase = createServerClient(cookies())

    const { data: request, error: dbError } = await supabase
      .from('flight_requests')
      .select(`
        *,
        client:clients(*),
        quotes(*),
        proposals(*),
        workflow_history(*)
      `)
      .eq('id', params.id)
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return NextResponse.json(
          {
            success: false,
            error: 'Flight request not found.'
          },
          { status: 404 }
        )
      }

      console.error('Database error fetching request:', dbError)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch flight request.'
        },
        { status: 500 }
      )
    }

    // 4. Verify user owns this request (additional security check)
    if (request.user_id !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden. You do not have access to this request.'
        },
        { status: 403 }
      )
    }

    // 5. Return response
    return NextResponse.json({
      success: true,
      request
    })

  } catch (error) {
    console.error('Unexpected error in GET /api/requests/:id:', error)

    if (process.env.SENTRY_DSN) {
      const Sentry = await import('@sentry/nextjs')
      Sentry.captureException(error)
    }

    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred.'
      },
      { status: 500 }
    )
  }
}
```

**Step 5**: Create API Response Types

File: `app/api/requests/types.ts`
```typescript
import type { FlightRequest, Quote, Proposal, WorkflowHistory, Client } from '@/lib/supabase/types'

export interface CreateRequestResponse {
  success: boolean
  request?: FlightRequest
  jobId?: string
  message?: string
  error?: string
  errors?: Array<{ field: string; message: string }>
}

export interface ListRequestsResponse {
  success: boolean
  requests?: FlightRequest[]
  pagination?: {
    limit: number
    offset: number
    total: number
  }
  error?: string
}

export interface GetRequestResponse {
  success: boolean
  request?: FlightRequest & {
    client?: Client | null
    quotes?: Quote[]
    proposals?: Proposal[]
    workflow_history?: WorkflowHistory[]
  }
  error?: string
}
```

**Step 6**: Add Error Handling Utility

File: `app/api/lib/error-handler.ts`
```typescript
import { NextResponse } from 'next/server'

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export function handleAPIError(error: unknown): NextResponse {
  console.error('API Error:', error)

  // Report to Sentry
  if (process.env.SENTRY_DSN) {
    import('@sentry/nextjs').then(Sentry => {
      Sentry.captureException(error)
    })
  }

  if (error instanceof APIError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code
      },
      { status: error.statusCode }
    )
  }

  // Generic error
  return NextResponse.json(
    {
      success: false,
      error: 'An unexpected error occurred. Please try again later.'
    },
    { status: 500 }
  )
}
```

**Step 7**: Add Integration Test Helpers

File: `__tests__/utils/api-helpers.ts`
```typescript
import { getServiceRoleClient } from '@/lib/supabase/server'

export async function createTestRequests(
  userId: string,
  count: number
): Promise<string[]> {
  const supabase = getServiceRoleClient()
  const ids: string[] = []

  for (let i = 0; i < count; i++) {
    const { data } = await supabase
      .from('flight_requests')
      .insert({
        user_id: userId,
        departure_airport: 'TEB',
        arrival_airport: 'VNY',
        departure_date: `2025-11-${15 + i}T10:00:00Z`,
        passengers: 4,
        status: 'pending'
      })
      .select()
      .single()

    if (data) ids.push(data.id)
  }

  return ids
}

export async function createSingleTestRequest(userId: string): Promise<string> {
  const ids = await createTestRequests(userId, 1)
  return ids[0]
}

export async function updateRequestStatus(requestId: string, status: string) {
  const supabase = getServiceRoleClient()
  await supabase
    .from('flight_requests')
    .update({ status })
    .eq('id', requestId)
}

export async function cleanupTestData(userId: string) {
  const supabase = getServiceRoleClient()
  await supabase.from('users').delete().eq('id', userId)
}
```

**Step 8**: Run Tests

```bash
# Run all tests
npm test -- api/requests

# Run specific test file
npm test -- post.test.ts

# Run with coverage
npm run test:coverage -- api/requests

# Expected: All tests pass ✅
```

### Implementation Validation

After each step, validate that:
- [ ] POST creates requests successfully
- [ ] GET returns user's requests
- [ ] GET by ID returns single request
- [ ] Validation catches invalid input
- [ ] Authentication enforced
- [ ] RLS prevents cross-tenant access
- [ ] Background jobs queued
- [ ] Tests pass
- [ ] No TypeScript errors

---

## 5. GIT WORKFLOW

### Branch Creation

```bash
git checkout main
git pull origin main
git checkout -b feat/TASK-006-first-api-route
```

### Commit Guidelines

```bash
# Add tests (Red phase)
git add __tests__/
git commit -m "test(api): add comprehensive tests for /api/requests endpoints

- POST request creation tests
- GET list requests tests with pagination
- GET by ID tests with related data
- Input validation tests
- Authentication and authorization tests
- Integration test helpers
- Tests currently failing (Red phase)

Related to: TASK-006"

# Add implementation (Green phase)
git add app/api/requests/
git add app/api/lib/
git commit -m "feat(api): implement POST and GET /api/requests endpoints

- Create flight request with validation
- List user requests with pagination and filtering
- Get single request by ID with related data
- Zod schema validation for input
- Clerk authentication integration
- Supabase RLS enforcement
- BullMQ job queueing
- Comprehensive error handling
- Sentry error reporting
- All tests passing (Green phase)

Implements: TASK-006"

# Add refactoring (Blue phase)
git add app/api/
git commit -m "refactor(api): improve error handling and add documentation

- Extract error handling to utility
- Add JSDoc comments to all endpoints
- Improve error messages
- Add type exports
- Optimize database queries
- Add usage examples
- Tests still passing (Blue phase)

Related to: TASK-006"
```

### Pull Request Process

```bash
git push origin feat/TASK-006-first-api-route

# Create PR
gh pr create --title "Feature: First API Route Implementation (POST/GET /api/requests)" \
  --body "Implements the first complete API route to prove the entire stack works end-to-end.

## Changes
- ✅ POST /api/requests - Create flight requests
- ✅ GET /api/requests - List user's requests with pagination
- ✅ GET /api/requests/:id - Get single request with related data
- ✅ Zod validation schemas for input
- ✅ Clerk authentication integration
- ✅ Supabase client with RLS enforcement
- ✅ BullMQ job queueing
- ✅ Comprehensive error handling
- ✅ Sentry error reporting
- ✅ TypeScript type safety
- ✅ >80% test coverage

## Stack Validation
This task proves that:
- ✅ Authentication works (Clerk JWT)
- ✅ Database works (Supabase with RLS)
- ✅ Validation works (Zod schemas)
- ✅ Job queue works (BullMQ)
- ✅ Types work (end-to-end type safety)
- ✅ Testing works (comprehensive test suite)

## Dependencies
- Requires TASK-001 (Clerk Auth)
- Requires TASK-002 (Database Schema)
- Requires TASK-005 (Supabase Clients)

## Testing
\`\`\`bash
npm test -- api/requests
npm run test:coverage -- api/requests
\`\`\`

**Test Coverage**: 85%
**All tests passing**: ✅

## API Documentation

### POST /api/requests
Create a new flight request.

**Request**:
\`\`\`json
{
  \"departureAirport\": \"TEB\",
  \"arrivalAirport\": \"VNY\",
  \"departureDate\": \"2025-11-15T10:00:00Z\",
  \"passengers\": 4,
  \"specialRequests\": \"Catering required\"
}
\`\`\`

**Response** (201):
\`\`\`json
{
  \"success\": true,
  \"request\": { ... },
  \"jobId\": \"job-uuid\",
  \"message\": \"Flight request created successfully\"
}
\`\`\`

### GET /api/requests
List user's flight requests.

**Query Params**:
- \`limit\` (default: 10, max: 100)
- \`offset\` (default: 0)
- \`status\` (optional filter)

**Response** (200):
\`\`\`json
{
  \"success\": true,
  \"requests\": [...],
  \"pagination\": {
    \"limit\": 10,
    \"offset\": 0,
    \"total\": 25
  }
}
\`\`\`

### GET /api/requests/:id
Get single request with related data.

**Response** (200):
\`\`\`json
{
  \"success\": true,
  \"request\": {
    \"id\": \"...\",
    \"client\": { ... },
    \"quotes\": [...],
    \"proposals\": [...],
    \"workflow_history\": [...]
  }
}
\`\`\`

Closes #TASK-006"
```

---

## 6. CODE REVIEW CHECKLIST

### Reviewer Checklist

**Functionality**:
- [ ] POST creates requests correctly
- [ ] GET lists only user's requests
- [ ] GET by ID returns complete data
- [ ] Pagination works properly
- [ ] Filtering by status works
- [ ] Background jobs queued

**Security**:
- [ ] Authentication enforced on all endpoints
- [ ] RLS prevents cross-tenant access
- [ ] Input validation prevents injection
- [ ] Error messages don't leak sensitive data
- [ ] Authorization checked for single request

**Validation**:
- [ ] Airport codes validated (3-4 letters)
- [ ] Passenger count validated (1-20)
- [ ] Date format validated (ISO 8601)
- [ ] Email format validated (if provided)
- [ ] All required fields checked

**Error Handling**:
- [ ] 400 for invalid input
- [ ] 401 for unauthenticated
- [ ] 403 for unauthorized access
- [ ] 404 for not found
- [ ] 500 for server errors
- [ ] Errors logged appropriately
- [ ] Sentry reporting configured

**Code Quality**:
- [ ] No code duplication
- [ ] Clear function names
- [ ] JSDoc comments present
- [ ] Consistent error handling
- [ ] Type safety throughout

**Testing**:
- [ ] Unit tests for validation
- [ ] Integration tests for endpoints
- [ ] >80% coverage achieved
- [ ] All tests passing
- [ ] Edge cases covered

**Performance**:
- [ ] Database queries optimized
- [ ] No N+1 query problems
- [ ] Pagination implemented
- [ ] Proper indexing used

---

## 7. TESTING REQUIREMENTS

### Unit Tests

**Coverage Target**: >85% for validation logic

**Test Files**:
- `__tests__/unit/api/requests/validation.test.ts`
- `__tests__/unit/api/lib/error-handler.test.ts`

### Integration Tests

**Coverage Target**: >80% for API endpoints

**Test Files**:
- `__tests__/integration/api/requests/post.test.ts`
- `__tests__/integration/api/requests/get.test.ts`
- `__tests__/integration/api/requests/get-by-id.test.ts`

### Running Tests

```bash
# Run all API tests
npm test -- api/requests

# Run with coverage
npm run test:coverage -- api/requests

# Run specific test file
npm test -- post.test.ts

# Watch mode
npm run test:watch -- api/requests
```

---

## 8. DEFINITION OF DONE

### Code Complete
- [ ] POST /api/requests implemented
- [ ] GET /api/requests implemented
- [ ] GET /api/requests/:id implemented
- [ ] Validation schemas created
- [ ] Error handling complete
- [ ] Type definitions exported
- [ ] No TypeScript errors

### Testing Complete
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] >80% test coverage
- [ ] Manual testing completed
- [ ] Edge cases tested

### Documentation Complete
- [ ] JSDoc comments on all functions
- [ ] API endpoint documentation
- [ ] Request/response examples
- [ ] Error codes documented

### Code Review Complete
- [ ] Pull request created
- [ ] At least 1 approval received
- [ ] All review comments addressed
- [ ] No unresolved conversations

### Deployment Ready
- [ ] Merged to main branch
- [ ] CI/CD pipeline passes
- [ ] No breaking changes
- [ ] Feature deployed to preview

---

## 9. RESOURCES & REFERENCES

### Documentation
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Zod Validation](https://zod.dev/)
- [Clerk Server SDK](https://clerk.com/docs/references/nextjs/overview)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)

### Related Tasks
- TASK-001: Clerk Authentication (prerequisite)
- TASK-002: Database Schema (prerequisite)
- TASK-005: Supabase Clients (prerequisite)
- TASK-004: Redis & BullMQ (used for job queueing)

### Internal Documentation
- `docs/PRD.md` - API requirements
- `docs/SYSTEM_ARCHITECTURE.md` - API architecture
- `lib/supabase/README.md` - Supabase client usage

---

## 10. NOTES & QUESTIONS

### Implementation Notes
- First API route serves as blueprint for all future routes
- Follow same patterns for authentication, validation, error handling
- All endpoints protected by Clerk authentication
- RLS automatically enforced via Supabase clients
- Background jobs queued for long-running operations

### Open Questions
- [ ] Should we add rate limiting per user?
- [ ] Do we need request validation middleware?
- [ ] Should pagination default limit be configurable?
- [ ] Add request caching for GET endpoints?

### Assumptions
- Clerk authentication configured and working
- Database schema deployed to Supabase
- Supabase clients implemented
- BullMQ queue infrastructure ready
- Developers familiar with Next.js API routes

### Risks/Blockers
- **Risk**: Database connection pool exhaustion
  - **Mitigation**: Use Supabase connection pooling
- **Risk**: Job queue failures blocking requests
  - **Mitigation**: Queue jobs after successful DB insert
- **Blocker**: TASK-001, TASK-002, TASK-005 must be complete
  - **Resolution**: Wait for prerequisite tasks

---

## 11. COMPLETION SUMMARY

### What Was Accomplished
*[Fill out after task completion]*

### Changes Made
*[List all files created/modified]*
- Created: `app/api/requests/route.ts`
- Created: `app/api/requests/[id]/route.ts`
- Created: `app/api/requests/validation.ts`
- Created: `app/api/requests/types.ts`
- Created: `app/api/lib/error-handler.ts`
- Created: `__tests__/unit/api/requests/validation.test.ts`
- Created: `__tests__/integration/api/requests/post.test.ts`
- Created: `__tests__/integration/api/requests/get.test.ts`
- Created: `__tests__/integration/api/requests/get-by-id.test.ts`
- Created: `__tests__/utils/api-helpers.ts`

### Test Results
```
*[Paste test results after completion]*
```

### Known Issues/Future Work
*[Document any issues or future enhancements]*

### Time Tracking
- **Estimated**: 4 hours
- **Actual**: - hours
- **Variance**: - hours

### Lessons Learned
*[Document learnings for future API route implementations]*

---

**Task Status**: ⏳ PENDING

**Completed By**: -
**Completed Date**: -
**Reviewed By**: -
**Review Date**: -
