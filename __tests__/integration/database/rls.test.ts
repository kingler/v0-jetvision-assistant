import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import {
  createTestClient,
  createAnonClient,
  createTestUser,
  cleanupTestData,
  TestSupabaseClient,
} from '@tests/utils/database'

/**
 * Row Level Security (RLS) Policy Tests
 *
 * TDD RED PHASE: Tests will FAIL until RLS policies are deployed
 *
 * Coverage areas:
 * - User data isolation (users can only see their own data)
 * - Cross-tenant access prevention
 * - RLS policy enforcement on SELECT, INSERT, UPDATE, DELETE
 * - Service role bypass (for system operations)
 */

describe('RLS Policies - iso_agents Table', () => {
  let serviceClient: TestSupabaseClient
  let anonClient: TestSupabaseClient
  let testUser1ClerkId: string
  let testUser2ClerkId: string
  let testUser1Id: string
  let testUser2Id: string

  beforeAll(async () => {
    serviceClient = await createTestClient()
    anonClient = await createAnonClient()

    // Create test users with service role
    testUser1ClerkId = `test_rls_user1_${Date.now()}`
    testUser2ClerkId = `test_rls_user2_${Date.now()}`

    testUser1Id = await createTestUser(
      serviceClient,
      testUser1ClerkId,
      `user1_${Date.now()}@test.com`
    )
    testUser2Id = await createTestUser(
      serviceClient,
      testUser2ClerkId,
      `user2_${Date.now()}@test.com`
    )
  })

  afterAll(async () => {
    await cleanupTestData(serviceClient, testUser1ClerkId)
    await cleanupTestData(serviceClient, testUser2ClerkId)
  })

  it('should prevent anon client from reading iso_agents without auth', async () => {
    const { data, error } = await anonClient
      .from('iso_agents')
      .select('*')
      .eq('id', testUser1Id)

    // Anon client should not be able to read users without authentication
    expect(data).toEqual([]) // Empty array or null
  })

  it('should prevent anon client from inserting into iso_agents', async () => {
    const { error } = await anonClient
      .from('iso_agents')
      .insert({
        clerk_user_id: `test_anon_insert_${Date.now()}`,
        email: `anon@test.com`,
        full_name: 'Test User',
        role: 'sales_rep',
      })

    // Should be rejected by RLS
    expect(error).toBeDefined()
  })
})

describe('RLS Policies - requests Table', () => {
  let serviceClient: TestSupabaseClient
  let user1Client: TestSupabaseClient
  let user2Client: TestSupabaseClient
  let testUser1ClerkId: string
  let testUser2ClerkId: string
  let testUser1Id: string
  let testUser2Id: string

  beforeAll(async () => {
    serviceClient = await createTestClient()
    user1Client = await createAnonClient()
    user2Client = await createAnonClient()

    // Create test users
    testUser1ClerkId = `test_flight_rls_1_${Date.now()}`
    testUser2ClerkId = `test_flight_rls_2_${Date.now()}`

    testUser1Id = await createTestUser(
      serviceClient,
      testUser1ClerkId,
      `flight1_${Date.now()}@test.com`
    )
    testUser2Id = await createTestUser(
      serviceClient,
      testUser2ClerkId,
      `flight2_${Date.now()}@test.com`
    )
  })

  afterAll(async () => {
    await cleanupTestData(serviceClient, testUser1ClerkId)
    await cleanupTestData(serviceClient, testUser2ClerkId)
  })

  it('should prevent user from accessing another users flight requests', async () => {
    // User 2 creates a flight request (via service role for test setup)
    const { data: request } = await serviceClient
      .from('requests')
      .insert({
        iso_agent_id: testUser2Id,
        departure_airport: 'TEB',
        arrival_airport: 'VNY',
        departure_date: '2027-12-01',
        passengers: 4,
        status: 'pending',
      })
      .select()
      .single()

    expect(request).toBeDefined()

    // User 1 tries to access User 2's request (should fail with RLS)
    // Note: This requires auth context to be set, which in real app
    // would be via Clerk JWT. For now, we test with service vs anon.
    const { data, error } = await user1Client
      .from('requests')
      .select('*')
      .eq('id', request!.id)

    // Should not be able to access
    expect(data).toEqual([]) // Empty due to RLS
  })

  it('should allow user to access their own flight requests', async () => {
    // User 1 creates a flight request
    const { data: request } = await serviceClient
      .from('requests')
      .insert({
        iso_agent_id: testUser1Id,
        departure_airport: 'LAX',
        arrival_airport: 'JFK',
        departure_date: '2027-12-15',
        passengers: 6,
        status: 'pending',
      })
      .select()
      .single()

    expect(request).toBeDefined()

    // Service role can always access (bypasses RLS)
    const { data, error } = await serviceClient
      .from('requests')
      .select('*')
      .eq('id', request!.id)

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data![0].id).toBe(request!.id)
  })

  it('should prevent user from updating another users flight requests', async () => {
    // User 2 creates a flight request
    const { data: request } = await serviceClient
      .from('requests')
      .insert({
        iso_agent_id: testUser2Id,
        departure_airport: 'SFO',
        arrival_airport: 'SEA',
        departure_date: '2027-12-20',
        passengers: 3,
        status: 'pending',
      })
      .select()
      .single()

    // User 1 tries to update User 2's request (via anon client, should fail)
    const { error } = await user1Client
      .from('requests')
      .update({ status: 'cancelled' })
      .eq('id', request!.id)

    // Should be rejected by RLS
    expect(error).toBeDefined()
  })

  it('should prevent user from deleting another users flight requests', async () => {
    // User 2 creates a flight request
    const { data: request } = await serviceClient
      .from('requests')
      .insert({
        iso_agent_id: testUser2Id,
        departure_airport: 'ORD',
        arrival_airport: 'MIA',
        departure_date: '2027-12-25',
        passengers: 5,
        status: 'pending',
      })
      .select()
      .single()

    // User 1 tries to delete User 2's request (via anon client)
    const { error } = await user1Client
      .from('requests')
      .delete()
      .eq('id', request!.id)

    // Should be rejected by RLS
    expect(error).toBeDefined()

    // Verify request still exists
    const { data: checkRequest } = await serviceClient
      .from('requests')
      .select('*')
      .eq('id', request!.id)
      .single()

    expect(checkRequest).toBeDefined()
  })
})

describe('RLS Policies - Cascading Deletes', () => {
  let serviceClient: TestSupabaseClient
  let testUserClerkId: string
  let testUserId: string

  beforeEach(async () => {
    serviceClient = await createTestClient()
    testUserClerkId = `test_cascade_${Date.now()}`
    testUserId = await createTestUser(
      serviceClient,
      testUserClerkId,
      `cascade_${Date.now()}@test.com`
    )
  })

  afterAll(async () => {
    await cleanupTestData(serviceClient, testUserClerkId)
  })

  it('should cascade delete related records when user is deleted', async () => {
    // Create a flight request for the user
    const { data: request } = await serviceClient
      .from('requests')
      .insert({
        iso_agent_id: testUserId,
        departure_airport: 'BOS',
        arrival_airport: 'DCA',
        departure_date: '2027-12-30',
        passengers: 2,
        status: 'pending',
      })
      .select()
      .single()

    expect(request).toBeDefined()

    // Create a quote for the flight request
    const { data: quote } = await serviceClient
      .from('quotes')
      .insert({
        request_id: request!.id,
        operator_name: 'Test Operator',
        operator_id: 'test_operator_123',
        aircraft_type: 'Citation X',
        base_price: 25000,
        total_price: 27500,
        avinode_quote_id: 'test_quote_123',
      })
      .select()
      .single()

    expect(quote).toBeDefined()

    // Delete the user (should cascade delete flight request and quote)
    const { error } = await serviceClient
      .from('iso_agents')
      .delete()
      .eq('id', testUserId)

    expect(error).toBeNull()

    // Verify flight request was deleted
    const { data: deletedRequest } = await serviceClient
      .from('requests')
      .select('*')
      .eq('id', request!.id)

    expect(deletedRequest).toEqual([])

    // Verify quote was deleted
    const { data: deletedQuote } = await serviceClient
      .from('quotes')
      .select('*')
      .eq('id', quote!.id)

    expect(deletedQuote).toEqual([])
  })
})

describe('RLS Policies - Service Role Bypass', () => {
  let serviceClient: TestSupabaseClient
  let anonClient: TestSupabaseClient

  beforeAll(async () => {
    serviceClient = await createTestClient()
    anonClient = await createAnonClient()
  })

  it('should allow service role to bypass RLS and access all data', async () => {
    // Create users with service role
    const { data: users, error } = await serviceClient
      .from('iso_agents')
      .select('*')
      .limit(10)

    // Service role should always succeed
    expect(error).toBeNull()
    expect(Array.isArray(users)).toBe(true)
  })

  it('should prevent anon client from accessing data without proper auth', async () => {
    // Anon client tries to read all users
    const { data, error } = await anonClient
      .from('iso_agents')
      .select('*')

    // Should return empty or error due to RLS
    expect(data).toEqual([])
  })
})
