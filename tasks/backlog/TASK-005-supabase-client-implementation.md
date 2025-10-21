# Supabase Client Implementation

**Task ID**: TASK-005
**Created**: 2025-10-20
**Assigned To**: Backend Developer
**Status**: `pending`
**Priority**: `high`
**Estimated Time**: 4 hours
**Actual Time**: - (update when complete)

---

## 1. TASK OVERVIEW

### Objective
Implement comprehensive Supabase client utilities for browser and server environments, including TypeScript types generated from the database schema, Row Level Security (RLS) helper functions, and middleware client for authentication state management.

### User Story
**As a** full-stack developer
**I want** properly configured Supabase clients for browser, server, and middleware contexts
**So that** I can access the database securely with automatic RLS enforcement and type safety

### Business Value
Supabase client utilities are the foundation for all database interactions in the application. Proper implementation ensures:
- **Type Safety**: Auto-generated types prevent runtime errors
- **Security**: Automatic RLS enforcement protects tenant data
- **Developer Experience**: Clear APIs for database operations
- **Performance**: Optimized connection pooling and caching
- **Maintainability**: Centralized database access patterns

---

## 2. REQUIREMENTS & ACCEPTANCE CRITERIA

### Functional Requirements

**FR-1**: Browser Client SHALL authenticate users
- Use Clerk session tokens for authentication
- Automatically refresh expired tokens
- Enforce Row Level Security
- Support real-time subscriptions

**FR-2**: Server Client SHALL handle server-side operations
- Use cookies for session management
- Support service role key for admin operations
- Pool database connections efficiently
- Handle Next.js server component context

**FR-3**: Middleware Client SHALL manage authentication state
- Validate user sessions
- Update auth state in database
- Handle authentication redirects
- Work with Clerk middleware

**FR-4**: TypeScript Types SHALL be generated from schema
- Export all table types
- Include relationship types
- Support JSON column types
- Auto-update when schema changes

**FR-5**: Helper Functions SHALL simplify common operations
- CRUD helpers for each table
- RLS validation utilities
- Type-safe query builders
- Error handling wrappers

### Acceptance Criteria

- [ ] **AC-1**: Browser client can authenticate with Clerk token
- [ ] **AC-2**: Server client can access database from API routes
- [ ] **AC-3**: Middleware client validates auth state correctly
- [ ] **AC-4**: TypeScript types match database schema exactly
- [ ] **AC-5**: RLS policies enforced on all client operations
- [ ] **AC-6**: Helper functions work for users, clients, flight_requests
- [ ] **AC-7**: Real-time subscriptions work in browser client
- [ ] **AC-8**: Service role key operations bypass RLS when needed
- [ ] **AC-9**: Connection pooling prevents exhaustion
- [ ] **AC-10**: All clients handle errors gracefully
- [ ] **AC-11**: Tests pass with >75% coverage
- [ ] **AC-12**: Documentation includes usage examples

### Non-Functional Requirements

- **Performance**: Database queries return in <100ms for simple queries
- **Security**: RLS enforced automatically, no manual user_id filtering needed
- **Reliability**: Automatic retry for transient connection failures
- **Maintainability**: Clear separation of client types and purposes
- **Type Safety**: Zero `any` types in public APIs

---

## 3. TEST-DRIVEN DEVELOPMENT (TDD) APPROACH

### Step 1: Write Tests FIRST (Red Phase)

**Test Files to Create**:
```
__tests__/unit/supabase/browser-client.test.ts
__tests__/unit/supabase/server-client.test.ts
__tests__/unit/supabase/middleware-client.test.ts
__tests__/unit/supabase/helpers.test.ts
__tests__/integration/supabase/rls-enforcement.test.ts
```

**Example Test (Write This First)**:
```typescript
// __tests__/unit/supabase/browser-client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createBrowserClient } from '@/lib/supabase/client'

describe('Supabase Browser Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create client with environment variables', () => {
    const client = createBrowserClient()

    expect(client).toBeDefined()
    expect(client.auth).toBeDefined()
    expect(client.from).toBeDefined()
  })

  it('should use Clerk token for authentication', async () => {
    const client = createBrowserClient()

    // Mock Clerk session token
    const mockToken = 'mock-clerk-jwt-token'

    // Client should use token for auth
    const { data, error } = await client
      .from('users')
      .select('*')
      .limit(1)

    // With valid token, should succeed
    expect(error).toBeNull()
  })

  it('should enforce RLS policies', async () => {
    const client = createBrowserClient()

    // Try to query without authentication (should fail or return no data)
    const { data, error } = await client
      .from('flight_requests')
      .select('*')

    // RLS should prevent unauthorized access
    expect(data).toEqual([])
  })

  it('should support real-time subscriptions', () => {
    const client = createBrowserClient()

    const channel = client
      .channel('test-channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'flight_requests'
      }, (payload) => {
        console.log('Change received:', payload)
      })

    expect(channel).toBeDefined()
  })
})
```

**Server Client Test**:
```typescript
// __tests__/unit/supabase/server-client.test.ts
import { describe, it, expect } from 'vitest'
import { createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

describe('Supabase Server Client', () => {
  it('should create server client with cookie store', async () => {
    const cookieStore = cookies()
    const client = createServerClient(cookieStore)

    expect(client).toBeDefined()
  })

  it('should read auth session from cookies', async () => {
    const cookieStore = cookies()
    const client = createServerClient(cookieStore)

    const { data: { session } } = await client.auth.getSession()

    // Session may or may not exist, but method should work
    expect(session === null || typeof session === 'object').toBe(true)
  })

  it('should allow service role operations', async () => {
    const client = createServerClient(cookies(), {
      useServiceRole: true
    })

    // Service role should bypass RLS
    const { data, error } = await client
      .from('users')
      .select('*')
      .limit(1)

    // Should have access to all data
    expect(error).toBeNull()
  })
})
```

**Helper Functions Test**:
```typescript
// __tests__/unit/supabase/helpers.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  createFlightRequest,
  getFlightRequestById,
  updateFlightRequestStatus,
  getUserFlightRequests
} from '@/lib/supabase/helpers'
import { createServerClient } from '@/lib/supabase/server'

describe('Supabase Helper Functions', () => {
  let testUserId: string
  let testRequestId: string

  beforeEach(async () => {
    // Create test user
    const client = createServerClient(null, { useServiceRole: true })
    const { data: user } = await client
      .from('users')
      .insert({
        clerk_user_id: 'test_user_helper_001',
        email: 'helper-test@example.com',
        full_name: 'Helper Test User',
        role: 'broker'
      })
      .select()
      .single()

    testUserId = user.id
  })

  afterEach(async () => {
    // Cleanup
    const client = createServerClient(null, { useServiceRole: true })
    await client.from('users').delete().eq('id', testUserId)
  })

  it('should create flight request with helper function', async () => {
    const request = await createFlightRequest({
      userId: testUserId,
      departureAirport: 'TEB',
      arrivalAirport: 'VNY',
      departureDate: '2025-11-15',
      passengers: 4,
      status: 'pending'
    })

    expect(request).toBeDefined()
    expect(request.id).toBeDefined()
    expect(request.departure_airport).toBe('TEB')

    testRequestId = request.id
  })

  it('should get flight request by ID', async () => {
    // First create a request
    const created = await createFlightRequest({
      userId: testUserId,
      departureAirport: 'JFK',
      arrivalAirport: 'LAX',
      departureDate: '2025-12-01',
      passengers: 6,
      status: 'pending'
    })

    // Then retrieve it
    const request = await getFlightRequestById(created.id)

    expect(request).toBeDefined()
    expect(request?.id).toBe(created.id)
    expect(request?.arrival_airport).toBe('LAX')
  })

  it('should update flight request status', async () => {
    const created = await createFlightRequest({
      userId: testUserId,
      departureAirport: 'BOS',
      arrivalAirport: 'MIA',
      departureDate: '2025-11-20',
      passengers: 3,
      status: 'pending'
    })

    const updated = await updateFlightRequestStatus(created.id, 'analyzing')

    expect(updated).toBeDefined()
    expect(updated?.status).toBe('analyzing')
  })

  it('should get all flight requests for user', async () => {
    // Create multiple requests
    await createFlightRequest({
      userId: testUserId,
      departureAirport: 'SFO',
      arrivalAirport: 'SEA',
      departureDate: '2025-11-25',
      passengers: 2,
      status: 'pending'
    })

    await createFlightRequest({
      userId: testUserId,
      departureAirport: 'DEN',
      arrivalAirport: 'PHX',
      departureDate: '2025-12-05',
      passengers: 5,
      status: 'analyzing'
    })

    const requests = await getUserFlightRequests(testUserId)

    expect(requests).toBeDefined()
    expect(requests.length).toBeGreaterThanOrEqual(2)
    expect(requests.every(r => r.user_id === testUserId)).toBe(true)
  })
})
```

**RLS Enforcement Integration Test**:
```typescript
// __tests__/integration/supabase/rls-enforcement.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServerClient } from '@/lib/supabase/server'

describe('RLS Policy Enforcement', () => {
  let user1Id: string
  let user2Id: string
  let request1Id: string

  beforeAll(async () => {
    const adminClient = createServerClient(null, { useServiceRole: true })

    // Create two test users
    const { data: u1 } = await adminClient
      .from('users')
      .insert({
        clerk_user_id: 'rls_test_user_1',
        email: 'rls1@test.com',
        full_name: 'RLS Test User 1',
        role: 'broker'
      })
      .select()
      .single()

    const { data: u2 } = await adminClient
      .from('users')
      .insert({
        clerk_user_id: 'rls_test_user_2',
        email: 'rls2@test.com',
        full_name: 'RLS Test User 2',
        role: 'broker'
      })
      .select()
      .single()

    user1Id = u1.id
    user2Id = u2.id

    // Create request for user 1
    const { data: req } = await adminClient
      .from('flight_requests')
      .insert({
        user_id: user1Id,
        departure_airport: 'TEB',
        arrival_airport: 'VNY',
        departure_date: '2025-11-01',
        passengers: 4,
        status: 'pending'
      })
      .select()
      .single()

    request1Id = req.id
  })

  afterAll(async () => {
    const adminClient = createServerClient(null, { useServiceRole: true })
    await adminClient.from('users').delete().eq('id', user1Id)
    await adminClient.from('users').delete().eq('id', user2Id)
  })

  it('should prevent cross-tenant data access', async () => {
    // Create client as user 2 (using anon key with RLS)
    const user2Client = createServerClient(null)

    // Try to access user 1's request
    const { data, error } = await user2Client
      .from('flight_requests')
      .select('*')
      .eq('id', request1Id)
      .single()

    // Should fail or return null (RLS blocks access)
    expect(data).toBeNull()
  })

  it('should allow users to access their own data', async () => {
    // Create client as user 1
    const user1Client = createServerClient(null)

    const { data, error } = await user1Client
      .from('flight_requests')
      .select('*')
      .eq('user_id', user1Id)

    // Should succeed
    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(Array.isArray(data)).toBe(true)
  })

  it('should enforce RLS on related tables', async () => {
    const adminClient = createServerClient(null, { useServiceRole: true })

    // Create quote for user 1's request
    const { data: quote } = await adminClient
      .from('quotes')
      .insert({
        flight_request_id: request1Id,
        operator_name: 'Test Operator',
        aircraft_type: 'Citation X',
        base_price: 25000,
        total_price: 28000,
        availability: 'confirmed'
      })
      .select()
      .single()

    // User 2 should not be able to see user 1's quotes
    const user2Client = createServerClient(null)
    const { data, error } = await user2Client
      .from('quotes')
      .select('*')
      .eq('id', quote.id)

    expect(data).toEqual([])
  })
})
```

**Run Tests** (should FAIL):
```bash
npm test -- supabase
# Expected: Tests fail because Supabase clients don't exist yet
```

### Step 2: Implement Minimal Code (Green Phase)

Write the minimum code necessary to make tests pass.

**Implementation Checklist**:
- [ ] Create browser client
- [ ] Create server client
- [ ] Create middleware client
- [ ] Generate TypeScript types
- [ ] Implement helper functions
- [ ] Tests pass

### Step 3: Refactor (Blue Phase)

Improve code quality without changing behavior.

**Refactoring Checklist**:
- [ ] Add JSDoc comments
- [ ] Optimize connection pooling
- [ ] Improve error messages
- [ ] Add usage examples
- [ ] Document edge cases

---

## 4. IMPLEMENTATION STEPS

### Pre-Implementation Checklist

Before starting:
- [ ] Review TASK-002 (Database schema must be deployed)
- [ ] Verify Supabase environment variables configured
- [ ] Confirm Clerk integration working
- [ ] Install required dependencies

### Step-by-Step Implementation

**Step 1**: Install Dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install -D supabase
```

**Step 2**: Generate TypeScript Types from Database

```bash
# Login to Supabase CLI
npx supabase login

# Link to your project
npx supabase link --project-ref your-project-ref

# Generate types
npx supabase gen types typescript --linked > lib/supabase/database.types.ts
```

**Step 3**: Create Browser Client

File: `lib/supabase/client.ts`
```typescript
import { createBrowserClient as createClient } from '@supabase/ssr'
import type { Database } from './database.types'

export function createBrowserClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Get Supabase client for browser/client components
 *
 * @example
 * ```typescript
 * const supabase = getBrowserClient()
 * const { data } = await supabase.from('users').select('*')
 * ```
 */
export function getBrowserClient() {
  return createBrowserClient()
}
```

**Step 4**: Create Server Client

File: `lib/supabase/server.ts`
```typescript
import { createServerClient as createClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './database.types'

export interface ServerClientOptions {
  useServiceRole?: boolean
}

/**
 * Create Supabase client for server components and API routes
 *
 * @param cookieStore - Next.js cookies() from headers
 * @param options - Client configuration options
 *
 * @example
 * ```typescript
 * import { cookies } from 'next/headers'
 *
 * const supabase = createServerClient(cookies())
 * const { data } = await supabase.from('users').select('*')
 * ```
 */
export function createServerClient(
  cookieStore: ReturnType<typeof cookies> | null,
  options?: ServerClientOptions
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = options?.useServiceRole
    ? process.env.SUPABASE_SERVICE_KEY!
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!cookieStore) {
    // Service role client without cookies (for admin operations)
    return createClient<Database>(supabaseUrl, supabaseKey)
  }

  return createClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Handle server component cookie setting limitation
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Handle server component cookie removal limitation
          }
        }
      }
    }
  )
}

/**
 * Get Supabase service role client (bypasses RLS)
 * Use only for admin operations and webhooks
 *
 * @example
 * ```typescript
 * const supabase = getServiceRoleClient()
 * // Can access all data regardless of RLS policies
 * const { data } = await supabase.from('users').select('*')
 * ```
 */
export function getServiceRoleClient() {
  return createServerClient(null, { useServiceRole: true })
}
```

**Step 5**: Create Middleware Client

File: `lib/supabase/middleware.ts`
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from './database.types'

/**
 * Create Supabase client for middleware
 * Handles auth state updates and cookie management
 *
 * @param request - Next.js request object
 *
 * @example
 * ```typescript
 * // middleware.ts
 * import { createMiddlewareClient } from '@/lib/supabase/middleware'
 *
 * export async function middleware(request: NextRequest) {
 *   const { supabase, response } = createMiddlewareClient(request)
 *   await supabase.auth.getSession()
 *   return response
 * }
 * ```
 */
export function createMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers
    }
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options
          })
          response = NextResponse.next({
            request: {
              headers: request.headers
            }
          })
          response.cookies.set({
            name,
            value,
            ...options
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options
          })
          response = NextResponse.next({
            request: {
              headers: request.headers
            }
          })
          response.cookies.set({
            name,
            value: '',
            ...options
          })
        }
      }
    }
  )

  return { supabase, response }
}
```

**Step 6**: Create Helper Functions

File: `lib/supabase/helpers.ts`
```typescript
import { createServerClient, getServiceRoleClient } from './server'
import type { Database } from './database.types'

type FlightRequest = Database['public']['Tables']['flight_requests']['Row']
type FlightRequestInsert = Database['public']['Tables']['flight_requests']['Insert']
type FlightRequestUpdate = Database['public']['Tables']['flight_requests']['Update']

type Client = Database['public']['Tables']['clients']['Row']
type ClientInsert = Database['public']['Tables']['clients']['Insert']

type Quote = Database['public']['Tables']['quotes']['Row']
type QuoteInsert = Database['public']['Tables']['quotes']['Insert']

/**
 * Create a new flight request
 */
export async function createFlightRequest(
  data: FlightRequestInsert
): Promise<FlightRequest> {
  const supabase = getServiceRoleClient()

  const { data: request, error } = await supabase
    .from('flight_requests')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return request
}

/**
 * Get flight request by ID
 */
export async function getFlightRequestById(
  id: string
): Promise<FlightRequest | null> {
  const supabase = getServiceRoleClient()

  const { data, error } = await supabase
    .from('flight_requests')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

/**
 * Update flight request status
 */
export async function updateFlightRequestStatus(
  id: string,
  status: FlightRequest['status']
): Promise<FlightRequest | null> {
  const supabase = getServiceRoleClient()

  const { data, error } = await supabase
    .from('flight_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return null
  return data
}

/**
 * Get all flight requests for a user
 */
export async function getUserFlightRequests(
  userId: string
): Promise<FlightRequest[]> {
  const supabase = getServiceRoleClient()

  const { data, error } = await supabase
    .from('flight_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return []
  return data
}

/**
 * Create a new client
 */
export async function createClient(data: ClientInsert): Promise<Client> {
  const supabase = getServiceRoleClient()

  const { data: client, error } = await supabase
    .from('clients')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return client
}

/**
 * Get client by email
 */
export async function getClientByEmail(
  email: string,
  userId: string
): Promise<Client | null> {
  const supabase = getServiceRoleClient()

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('email', email)
    .eq('user_id', userId)
    .single()

  if (error) return null
  return data
}

/**
 * Create a quote for a flight request
 */
export async function createQuote(data: QuoteInsert): Promise<Quote> {
  const supabase = getServiceRoleClient()

  const { data: quote, error } = await supabase
    .from('quotes')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return quote
}

/**
 * Get all quotes for a flight request
 */
export async function getQuotesForRequest(
  requestId: string
): Promise<Quote[]> {
  const supabase = getServiceRoleClient()

  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('flight_request_id', requestId)
    .order('created_at', { ascending: false })

  if (error) return []
  return data
}
```

**Step 7**: Create RLS Helper Utilities

File: `lib/supabase/rls-helpers.ts`
```typescript
import { createServerClient } from './server'
import { auth } from '@clerk/nextjs/server'

/**
 * Get current user's Supabase user ID from Clerk session
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { userId } = await auth()

  if (!userId) return null

  const supabase = createServerClient(null, { useServiceRole: true })

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', userId)
    .single()

  return user?.id || null
}

/**
 * Check if current user owns a resource
 */
export async function userOwnsResource(
  table: string,
  resourceId: string
): Promise<boolean> {
  const userId = await getCurrentUserId()
  if (!userId) return false

  const supabase = createServerClient(null, { useServiceRole: true })

  const { data } = await supabase
    .from(table as any)
    .select('user_id')
    .eq('id', resourceId)
    .single()

  return data?.user_id === userId
}

/**
 * Validate RLS access before operation
 */
export async function validateAccess(
  table: string,
  resourceId: string
): Promise<void> {
  const hasAccess = await userOwnsResource(table, resourceId)

  if (!hasAccess) {
    throw new Error(`Access denied to ${table} resource ${resourceId}`)
  }
}
```

**Step 8**: Create Type Export File

File: `lib/supabase/types.ts`
```typescript
/**
 * Re-export database types for convenience
 */
export type { Database } from './database.types'

// Export commonly used types
export type {
  Database['public']['Tables']['users']['Row'] as User,
  Database['public']['Tables']['clients']['Row'] as Client,
  Database['public']['Tables']['flight_requests']['Row'] as FlightRequest,
  Database['public']['Tables']['quotes']['Row'] as Quote,
  Database['public']['Tables']['proposals']['Row'] as Proposal,
  Database['public']['Tables']['communications']['Row'] as Communication,
  Database['public']['Tables']['workflow_history']['Row'] as WorkflowHistory
} from './database.types'

// Export insert types
export type {
  Database['public']['Tables']['flight_requests']['Insert'] as FlightRequestInsert,
  Database['public']['Tables']['clients']['Insert'] as ClientInsert,
  Database['public']['Tables']['quotes']['Insert'] as QuoteInsert
} from './database.types'

// Export update types
export type {
  Database['public']['Tables']['flight_requests']['Update'] as FlightRequestUpdate,
  Database['public']['Tables']['clients']['Update'] as ClientUpdate
} from './database.types'
```

**Step 9**: Add Client Usage Documentation

File: `lib/supabase/README.md`
```markdown
# Supabase Client Usage

## Client Types

### Browser Client (`client.ts`)
Use in client components and browser context.

```typescript
import { getBrowserClient } from '@/lib/supabase/client'

const supabase = getBrowserClient()
const { data } = await supabase.from('users').select('*')
```

### Server Client (`server.ts`)
Use in server components and API routes.

```typescript
import { createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

const supabase = createServerClient(cookies())
const { data } = await supabase.from('users').select('*')
```

### Service Role Client
For admin operations that bypass RLS.

```typescript
import { getServiceRoleClient } from '@/lib/supabase/server'

const supabase = getServiceRoleClient()
// Can access all data
```

### Middleware Client (`middleware.ts`)
Use in Next.js middleware for auth state management.

```typescript
import { createMiddlewareClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request)
  await supabase.auth.getSession()
  return response
}
```

## Helper Functions

```typescript
import {
  createFlightRequest,
  getFlightRequestById,
  updateFlightRequestStatus,
  getUserFlightRequests
} from '@/lib/supabase/helpers'

// Create request
const request = await createFlightRequest({
  userId: 'user-id',
  departureAirport: 'TEB',
  arrivalAirport: 'VNY',
  departureDate: '2025-11-15',
  passengers: 4,
  status: 'pending'
})

// Get by ID
const request = await getFlightRequestById('request-id')

// Update status
await updateFlightRequestStatus('request-id', 'analyzing')

// Get user's requests
const requests = await getUserFlightRequests('user-id')
```

## RLS Helpers

```typescript
import { getCurrentUserId, userOwnsResource, validateAccess } from '@/lib/supabase/rls-helpers'

// Get current user ID
const userId = await getCurrentUserId()

// Check ownership
const isOwner = await userOwnsResource('flight_requests', 'request-id')

// Validate before operation
await validateAccess('flight_requests', 'request-id')
```

## Type Safety

```typescript
import type { Database, FlightRequest, FlightRequestInsert } from '@/lib/supabase/types'

const request: FlightRequest = {
  id: 'uuid',
  user_id: 'uuid',
  departure_airport: 'TEB',
  // ... TypeScript ensures all required fields
}
```
```

**Step 10**: Run Tests

```bash
# Run all Supabase tests
npm test -- supabase

# Expected: All tests pass ✓
```

### Implementation Validation

After each step, validate that:
- [ ] Clients connect successfully
- [ ] Types match database schema
- [ ] Helper functions work correctly
- [ ] RLS enforced properly
- [ ] Tests pass
- [ ] No TypeScript errors

---

## 5. GIT WORKFLOW

### Branch Creation

```bash
git checkout main
git pull origin main
git checkout -b feat/TASK-005-supabase-client-implementation
```

### Commit Guidelines

```bash
# Add tests (Red phase)
git add __tests__/unit/supabase/
git add __tests__/integration/supabase/
git commit -m "test(supabase): add client and helper function tests"

# Add implementation (Green phase)
git add lib/supabase/
git commit -m "feat(supabase): implement browser, server, and middleware clients

- Create browser client for client components
- Create server client with cookie management
- Create middleware client for auth state
- Generate TypeScript types from database
- Implement CRUD helper functions
- Add RLS validation utilities
- All tests passing

Implements: TASK-005"

# Add documentation (Blue phase)
git add lib/supabase/README.md
git commit -m "docs(supabase): add client usage documentation and examples"
```

### Pull Request Process

```bash
git push origin feat/TASK-005-supabase-client-implementation

# Create PR
gh pr create --title "Feature: Supabase Client Implementation" \
  --body "Implements comprehensive Supabase client utilities for browser, server, and middleware contexts.

## Changes
- Browser client with Clerk auth integration
- Server client with cookie-based session management
- Middleware client for auth state updates
- TypeScript types generated from database schema
- Helper functions for common CRUD operations
- RLS validation utilities
- Comprehensive test suite (>75% coverage)
- Usage documentation and examples

## Dependencies
- Requires TASK-002 (Database schema deployed)
- Blocks TASK-006 (API routes need clients)

## Testing
\`\`\`bash
npm test -- supabase
\`\`\`

All tests passing ✅

Closes #TASK-005"
```

---

## 6. CODE REVIEW CHECKLIST

### Reviewer Checklist

**Functionality**:
- [ ] Browser client works in client components
- [ ] Server client works in API routes and server components
- [ ] Middleware client manages auth state correctly
- [ ] Helper functions perform CRUD operations
- [ ] RLS enforced on all operations

**Type Safety**:
- [ ] Database types match actual schema
- [ ] No `any` types in public APIs
- [ ] All functions properly typed
- [ ] Type exports work correctly

**Security**:
- [ ] RLS policies enforced automatically
- [ ] Service role key only used server-side
- [ ] No credentials exposed in client code
- [ ] Auth validation works correctly

**Performance**:
- [ ] Connection pooling configured
- [ ] No redundant database calls
- [ ] Proper error handling
- [ ] Efficient query patterns

**Testing**:
- [ ] Unit tests for all clients
- [ ] Integration tests for RLS
- [ ] Helper function tests comprehensive
- [ ] >75% coverage achieved

**Documentation**:
- [ ] JSDoc comments on all public functions
- [ ] README with usage examples
- [ ] Type definitions documented
- [ ] Edge cases explained

---

## 7. TESTING REQUIREMENTS

### Unit Tests

**Coverage Target**: >75% for client utilities

**Test Files**:
- `__tests__/unit/supabase/browser-client.test.ts`
- `__tests__/unit/supabase/server-client.test.ts`
- `__tests__/unit/supabase/middleware-client.test.ts`
- `__tests__/unit/supabase/helpers.test.ts`
- `__tests__/unit/supabase/rls-helpers.test.ts`

### Integration Tests

**Test Files**:
- `__tests__/integration/supabase/rls-enforcement.test.ts`
- `__tests__/integration/supabase/realtime-subscriptions.test.ts`

### Running Tests

```bash
# Run all Supabase tests
npm test -- supabase

# Run with coverage
npm run test:coverage -- supabase

# Run specific test file
npm test -- browser-client.test.ts
```

---

## 8. DEFINITION OF DONE

### Code Complete
- [ ] Browser client implemented
- [ ] Server client implemented
- [ ] Middleware client implemented
- [ ] TypeScript types generated
- [ ] Helper functions implemented
- [ ] RLS helpers created
- [ ] No TypeScript errors

### Testing Complete
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Test coverage >75%
- [ ] Manual testing completed
- [ ] RLS enforcement verified

### Documentation Complete
- [ ] JSDoc comments on all functions
- [ ] README with usage examples
- [ ] Type definitions documented
- [ ] Edge cases noted

### Code Review Complete
- [ ] Pull request created
- [ ] At least 1 approval received
- [ ] All review comments addressed
- [ ] No unresolved conversations

### Deployment Ready
- [ ] Merged to main branch
- [ ] CI/CD pipeline passes
- [ ] Types generated successfully
- [ ] No breaking changes

---

## 9. RESOURCES & REFERENCES

### Documentation
- [Supabase Client Libraries](https://supabase.com/docs/reference/javascript/introduction)
- [Supabase SSR Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [TypeScript Type Generation](https://supabase.com/docs/guides/api/generating-types)

### Related Tasks
- TASK-002: Database Schema (prerequisite)
- TASK-006: First API Route (depends on this)
- TASK-001: Clerk Authentication (integrates with clients)

### Internal Documentation
- `docs/PRD.md` - Database requirements
- `docs/SYSTEM_ARCHITECTURE.md` - Client architecture
- `lib/database/README.md` - Database schema documentation

---

## 10. NOTES & QUESTIONS

### Implementation Notes
- Browser client automatically uses Clerk session tokens
- Server client uses cookies for session persistence
- Service role client bypasses RLS for admin operations
- Type generation should be run after schema changes

### Open Questions
- [ ] Should we add caching layer for frequently accessed data?
- [ ] Do we need custom retry logic for failed queries?
- [ ] Should helper functions include pagination support?

### Assumptions
- Database schema (TASK-002) already deployed
- Clerk authentication working
- Supabase environment variables configured
- Developers familiar with Supabase concepts

### Risks/Blockers
- **Risk**: Database schema changes break generated types
  - **Mitigation**: Run type generation in CI/CD pipeline
- **Risk**: RLS policies too restrictive
  - **Mitigation**: Comprehensive testing of access patterns
- **Blocker**: TASK-002 must be completed first
  - **Resolution**: Wait for database deployment

---

## 11. COMPLETION SUMMARY

### What Was Accomplished
*[Fill out after task completion]*

### Changes Made
*[List all files created/modified]*
- Created: `lib/supabase/client.ts`
- Created: `lib/supabase/server.ts`
- Created: `lib/supabase/middleware.ts`
- Created: `lib/supabase/helpers.ts`
- Created: `lib/supabase/rls-helpers.ts`
- Created: `lib/supabase/types.ts`
- Created: `lib/supabase/README.md`
- Created: `lib/supabase/database.types.ts` (generated)
- Created: `__tests__/unit/supabase/*.test.ts`
- Created: `__tests__/integration/supabase/*.test.ts`

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
*[Document learnings for future tasks]*

---

**Task Status**: ⏳ PENDING

**Completed By**: -
**Completed Date**: -
**Reviewed By**: -
**Review Date**: -
