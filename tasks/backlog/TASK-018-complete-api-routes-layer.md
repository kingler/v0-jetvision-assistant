# Complete API Routes Layer Implementation

**Task ID**: TASK-018
**Created**: 2025-10-20
**Assigned To**: Backend Developer
**Status**: `pending`
**Priority**: `high`
**Estimated Time**: 12 hours
**Actual Time**: - (update when complete)

---

## 1. TASK OVERVIEW

### Objective
Implement all remaining API endpoints for the Jetvision application including flight request CRUD operations, quote retrieval, proposal management, agent execution endpoints, webhook handlers, input validation with Zod, comprehensive error handling, and rate limiting for API protection.

### User Story
**As a** frontend developer
**I want** complete API endpoints for all application features
**So that** I can build the UI with proper data fetching and state management

### Business Value
The complete API layer provides the interface between the frontend and backend services. Well-designed, secure, and performant APIs are critical for application reliability, developer productivity, and system scalability. Proper validation and error handling prevent data corruption and security vulnerabilities.

---

## 2. REQUIREMENTS & ACCEPTANCE CRITERIA

### Functional Requirements

**FR-1**: System SHALL implement flight request CRUD endpoints
- GET /api/requests - List user's requests (with pagination, filtering, sorting)
- GET /api/requests/:id - Get single request with full details
- PATCH /api/requests/:id - Update request (status, notes, etc.)
- DELETE /api/requests/:id - Cancel/delete request

**FR-2**: System SHALL implement quote management endpoints
- GET /api/requests/:id/quotes - Get all quotes for a request
- POST /api/quotes/:id/analyze - Trigger quote analysis

**FR-3**: System SHALL implement proposal endpoints
- GET /api/requests/:id/proposals - Get all proposals for a request
- POST /api/proposals/:id/send - Send proposal via email

**FR-4**: System SHALL implement agent execution endpoints
- POST /api/agents/orchestrator - Trigger RFP Orchestrator
- POST /api/agents/client-data - Execute Client Data Manager
- POST /api/agents/flight-search - Execute Flight Search Agent
- POST /api/agents/proposal-analysis - Execute Proposal Analysis
- POST /api/agents/communication - Execute Communication Manager
- POST /api/agents/error-monitor - Execute Error Monitor

**FR-5**: System SHALL implement webhook endpoints
- POST /api/webhooks/avinode/quotes - Receive Avinode quote notifications
- POST /api/webhooks/gmail/delivery - Receive Gmail delivery status updates

**FR-6**: System SHALL implement input validation with Zod
- Validate all request bodies
- Validate path and query parameters
- Return clear validation error messages
- Support nested object validation

**FR-7**: System SHALL implement comprehensive error handling
- Consistent error response format
- HTTP status codes (400, 401, 403, 404, 500)
- Detailed error messages for debugging
- Production-safe error messages (no sensitive data)

**FR-8**: System SHALL implement rate limiting
- Limit requests per user (100/minute)
- Limit webhook endpoints (1000/minute)
- Return 429 Too Many Requests with retry-after header
- Use Redis for distributed rate limiting

### Acceptance Criteria

- [ ] **AC-1**: All CRUD endpoints implemented and tested
- [ ] **AC-2**: Quote and proposal endpoints functional
- [ ] **AC-3**: All 6 agent endpoints working
- [ ] **AC-4**: Webhook endpoints receive and process data correctly
- [ ] **AC-5**: Zod validation prevents invalid data
- [ ] **AC-6**: Error handling is consistent and informative
- [ ] **AC-7**: Rate limiting protects against abuse
- [ ] **AC-8**: Unit tests achieve >80% coverage
- [ ] **AC-9**: Integration tests verify API contracts
- [ ] **AC-10**: API response times <2 seconds (95th percentile)
- [ ] **AC-11**: Code review approved

### Non-Functional Requirements

- **Performance**: API response time <2s (95th percentile)
- **Security**: All endpoints require authentication (except webhooks with signature validation)
- **Reliability**: 99.9% uptime
- **Scalability**: Support 1000+ concurrent requests

---

## 3. TEST-DRIVEN DEVELOPMENT (TDD) APPROACH

### Step 1: Write Tests FIRST (Red Phase)

**Test Files to Create**:
```
__tests__/integration/api/requests.test.ts
__tests__/integration/api/quotes.test.ts
__tests__/integration/api/proposals.test.ts
__tests__/integration/api/agents.test.ts
__tests__/integration/api/webhooks.test.ts
```

**Example Test**:
```typescript
// __tests__/integration/api/requests.test.ts
import { describe, it, expect } from 'vitest'
import { createMocks } from 'node-mocks-http'

describe('Flight Requests API', () => {
  describe('GET /api/requests', () => {
    it('should return list of user requests', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          authorization: 'Bearer valid-token'
        }
      })

      await GET(req)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data).toHaveProperty('requests')
      expect(Array.isArray(data.requests)).toBe(true)
    })

    it('should support pagination', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { page: '2', limit: '10' }
      })

      await GET(req)

      const data = JSON.parse(res._getData())
      expect(data).toHaveProperty('pagination')
      expect(data.pagination.page).toBe(2)
      expect(data.pagination.limit).toBe(10)
    })

    it('should support filtering by status', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { status: 'COMPLETED' }
      })

      await GET(req)

      const data = JSON.parse(res._getData())
      data.requests.forEach((request: any) => {
        expect(request.status).toBe('COMPLETED')
      })
    })

    it('should return 401 if not authenticated', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        headers: {}
      })

      await GET(req)

      expect(res._getStatusCode()).toBe(401)
    })
  })

  describe('GET /api/requests/:id', () => {
    it('should return single request with details', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'req-123' }
      })

      await GET(req)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data).toHaveProperty('id', 'req-123')
      expect(data).toHaveProperty('departure_airport')
      expect(data).toHaveProperty('arrival_airport')
    })

    it('should return 404 if request not found', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'nonexistent' }
      })

      await GET(req)

      expect(res._getStatusCode()).toBe(404)
    })

    it('should return 403 if request belongs to different user', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'other-user-request' }
      })

      await GET(req)

      expect(res._getStatusCode()).toBe(403)
    })
  })

  describe('PATCH /api/requests/:id', () => {
    it('should update request fields', async () => {
      const { req, res } = createMocks({
        method: 'PATCH',
        query: { id: 'req-123' },
        body: {
          notes: 'Updated notes',
          status: 'CANCELLED'
        }
      })

      await PATCH(req)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.notes).toBe('Updated notes')
      expect(data.status).toBe('CANCELLED')
    })

    it('should validate update data', async () => {
      const { req, res } = createMocks({
        method: 'PATCH',
        query: { id: 'req-123' },
        body: {
          passengers: -5 // Invalid
        }
      })

      await PATCH(req)

      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data.error).toContain('passengers')
    })
  })

  describe('DELETE /api/requests/:id', () => {
    it('should delete/cancel request', async () => {
      const { req, res } = createMocks({
        method: 'DELETE',
        query: { id: 'req-123' }
      })

      await DELETE(req)

      expect(res._getStatusCode()).toBe(200)
    })
  })
})

// Similar tests for other endpoints...
```

### Step 2: Implement API Routes (Green Phase)

```typescript
// app/api/requests/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Validation schemas
const requestQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['CREATED', 'ANALYZING', 'SEARCHING_FLIGHTS', 'AWAITING_QUOTES', 'COMPLETED', 'FAILED']).optional(),
  sort: z.enum(['created_at', 'departure_date', 'status']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc')
})

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const query = requestQuerySchema.parse(searchParams)

    const supabase = createClient()

    // Build query
    let dbQuery = supabase
      .from('flight_requests')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)

    // Apply filters
    if (query.status) {
      dbQuery = dbQuery.eq('status', query.status)
    }

    // Apply sorting
    dbQuery = dbQuery.order(query.sort, { ascending: query.order === 'asc' })

    // Apply pagination
    const offset = (query.page - 1) * query.limit
    dbQuery = dbQuery.range(offset, offset + query.limit - 1)

    const { data, error, count } = await dbQuery

    if (error) throw error

    return NextResponse.json({
      requests: data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: count,
        total_pages: Math.ceil((count || 0) / query.limit)
      }
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('GET /api/requests error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// app/api/requests/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient()

    const { data, error } = await supabase
      .from('flight_requests')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Request not found' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('GET /api/requests/:id error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

const updateRequestSchema = z.object({
  notes: z.string().optional(),
  status: z.enum(['CREATED', 'ANALYZING', 'CANCELLED']).optional(),
  passengers: z.number().min(1).max(20).optional()
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = updateRequestSchema.parse(body)

    const supabase = createClient()

    const { data, error } = await supabase
      .from('flight_requests')
      .update(validated)
      .eq('id', params.id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('PATCH /api/requests/:id error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient()

    const { error } = await supabase
      .from('flight_requests')
      .update({ status: 'CANCELLED' })
      .eq('id', params.id)
      .eq('user_id', userId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DELETE /api/requests/:id error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// app/api/webhooks/avinode/quotes/route.ts
import { headers } from 'next/headers'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    // Validate webhook signature
    const headersList = headers()
    const signature = headersList.get('x-avinode-signature')

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }

    const body = await request.text()
    const expectedSignature = crypto
      .createHmac('sha256', process.env.AVINODE_WEBHOOK_SECRET!)
      .update(body)
      .digest('hex')

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const data = JSON.parse(body)

    // Process quote
    const supabase = createClient()

    await supabase
      .from('quotes')
      .insert({
        request_id: data.request_id,
        operator_name: data.operator_name,
        aircraft_type: data.aircraft_type,
        base_price: data.base_price,
        response_time: data.response_time_hours,
        specifications: data.specifications,
        created_at: new Date().toISOString()
      })

    // Trigger Proposal Analysis if we have enough quotes
    const { data: quotes } = await supabase
      .from('quotes')
      .select('*')
      .eq('request_id', data.request_id)

    if (quotes && quotes.length >= 3) {
      // Trigger analysis (queue job or direct call)
      console.log('Triggering proposal analysis for request:', data.request_id)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Avinode webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## 4. IMPLEMENTATION STEPS

### Pre-Implementation Checklist

- [ ] Review PRD.md section on API Endpoints
- [ ] TASK-002 (Database) completed
- [ ] TASK-005 (Supabase Client) completed
- [ ] TASK-006 (First API Route) completed as reference
- [ ] All agents implemented (TASK-011 through TASK-017)

### Step-by-Step Implementation

**Step 1**: Set up Zod validation schemas
- Create shared schemas in `lib/validation/`
- Define request/response types
- Add reusable validators

**Step 2**: Implement CRUD endpoints
- GET /api/requests
- GET /api/requests/:id
- PATCH /api/requests/:id
- DELETE /api/requests/:id

**Step 3**: Implement quote endpoints
- GET /api/requests/:id/quotes
- POST /api/quotes/:id/analyze

**Step 4**: Implement proposal endpoints
- GET /api/requests/:id/proposals
- POST /api/proposals/:id/send

**Step 5**: Implement agent endpoints (6 total)
- POST /api/agents/orchestrator
- POST /api/agents/client-data
- POST /api/agents/flight-search
- POST /api/agents/proposal-analysis
- POST /api/agents/communication
- POST /api/agents/error-monitor

**Step 6**: Implement webhook endpoints
- POST /api/webhooks/avinode/quotes (with signature validation)
- POST /api/webhooks/gmail/delivery

**Step 7**: Add rate limiting
- Install and configure rate limiting middleware
- Apply to all endpoints
- Test rate limit behavior

**Step 8**: Write comprehensive tests
- Unit tests for validation
- Integration tests for all endpoints
- E2E tests for critical workflows

---

## 5-11. STANDARD SECTIONS

(Following same structure as previous tasks)

**API Endpoints Summary**:

### Flight Requests
- GET /api/requests
- GET /api/requests/:id
- PATCH /api/requests/:id
- DELETE /api/requests/:id

### Quotes
- GET /api/requests/:id/quotes
- POST /api/quotes/:id/analyze

### Proposals
- GET /api/requests/:id/proposals
- POST /api/proposals/:id/send

### Agents
- POST /api/agents/orchestrator
- POST /api/agents/client-data
- POST /api/agents/flight-search
- POST /api/agents/proposal-analysis
- POST /api/agents/communication
- POST /api/agents/error-monitor

### Webhooks
- POST /api/webhooks/avinode/quotes
- POST /api/webhooks/gmail/delivery

**Dependencies**:
- TASK-002: Supabase Database Schema Deployment
- TASK-005: Supabase Client Implementation
- TASK-006: First API Route Implementation
- TASK-011-017: All Agent Implementations

**Task Status**: ⏳ PENDING

**Completed By**: -
**Completed Date**: -
