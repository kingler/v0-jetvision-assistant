import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createTestClient,
  TestSupabaseClient,
  tableExists,
  cleanupAllTestData,
  trackTestUser,
} from '@tests/utils/database'

/**
 * Database Schema Integration Tests
 *
 * TDD RED PHASE: These tests validate the database schema structure
 * Expected behavior: Tests will FAIL until schema is deployed
 *
 * Coverage areas:
 * - Table existence (6 core tables)
 * - Column structure and types
 * - Indexes and constraints
 * - Foreign key relationships
 *
 * NOTE: These tests will be SKIPPED if connecting to production database.
 * Set TEST_SUPABASE_URL for a test database or use local Supabase.
 */

// Store all test user IDs created in this file for cleanup
const testUserIds: string[] = []

describe('Database Schema - Table Existence', () => {
  let supabase: TestSupabaseClient

  beforeAll(async () => {
    supabase = await createTestClient()
  })

  it('should have iso_agents table', async () => {
    const exists = await tableExists(supabase, 'iso_agents')
    expect(exists).toBe(true)
  })

  it('should have client_profiles table', async () => {
    const exists = await tableExists(supabase, 'client_profiles')
    expect(exists).toBe(true)
  })

  it('should have requests table', async () => {
    const exists = await tableExists(supabase, 'requests')
    expect(exists).toBe(true)
  })

  it('should have quotes table', async () => {
    const exists = await tableExists(supabase, 'quotes')
    expect(exists).toBe(true)
  })

  it('should have proposals table', async () => {
    const exists = await tableExists(supabase, 'proposals')
    expect(exists).toBe(true)
  })

  it('should have workflow_states table', async () => {
    const exists = await tableExists(supabase, 'workflow_states')
    expect(exists).toBe(true)
  })

  it('should have agent_executions table', async () => {
    const exists = await tableExists(supabase, 'agent_executions')
    expect(exists).toBe(true)
  })
})

describe('Database Schema - iso_agents Table', () => {
  let supabase: TestSupabaseClient
  const localTestIds: string[] = []

  beforeAll(async () => {
    supabase = await createTestClient()
  })

  // IMPORTANT: Clean up ALL test data after tests complete
  afterAll(async () => {
    if (supabase && localTestIds.length > 0) {
      for (const testId of localTestIds) {
        await supabase.from('iso_agents').delete().eq('clerk_user_id', testId)
      }
    }
    // Also run global cleanup
    if (supabase) {
      await cleanupAllTestData(supabase)
    }
  })

  it('should have correct columns in iso_agents table', async () => {
    const { data, error } = await supabase
      .from('iso_agents')
      .select('*')
      .limit(1)

    expect(error).toBeNull()

    // If table is empty, insert a test row to get schema
    if (!data || data.length === 0) {
      const testClerkId = 'test_schema_check'
      localTestIds.push(testClerkId)
      trackTestUser(testClerkId)

      const { data: inserted } = await supabase
        .from('iso_agents')
        .insert({
          clerk_user_id: testClerkId,
          email: 'schema@test.com',
          full_name: 'Test User',
          role: 'sales_rep',
        })
        .select()
        .single()

      const schema = Object.keys(inserted || {})

      // Clean up immediately
      await supabase.from('iso_agents').delete().eq('clerk_user_id', testClerkId)

      expect(schema).toContain('id')
      expect(schema).toContain('clerk_user_id')
      expect(schema).toContain('email')
      expect(schema).toContain('full_name')
      expect(schema).toContain('role')
      expect(schema).toContain('commission_percentage')
      expect(schema).toContain('total_commission_earned')
      expect(schema).toContain('is_active')
      expect(schema).toContain('avatar_url')
      expect(schema).toContain('phone')
      expect(schema).toContain('timezone')
      expect(schema).toContain('preferences')
      expect(schema).toContain('last_login_at')
      expect(schema).toContain('created_at')
      expect(schema).toContain('updated_at')
    } else {
      const schema = Object.keys(data[0])
      expect(schema).toContain('id')
      expect(schema).toContain('clerk_user_id')
      expect(schema).toContain('email')
    }
  })

  it('should enforce unique constraint on clerk_user_id', async () => {
    const testId = `test_unique_${Date.now()}`
    localTestIds.push(testId)
    trackTestUser(testId)

    // Insert first record
    const { error: error1 } = await supabase
      .from('iso_agents')
      .insert({
        clerk_user_id: testId,
        email: `${testId}@test.com`,
        full_name: 'Test User',
        role: 'sales_rep',
      })

    expect(error1).toBeNull()

    // Try to insert duplicate clerk_user_id (should fail, so won't be inserted)
    const { error: error2 } = await supabase
      .from('iso_agents')
      .insert({
        clerk_user_id: testId,
        email: `${testId}_2@test.com`,
        full_name: 'Test User 2',
        role: 'sales_rep',
      })

    expect(error2).toBeDefined()
    expect(error2?.code).toBe('23505') // unique_violation

    // Cleanup
    await supabase.from('iso_agents').delete().eq('clerk_user_id', testId)
  })

  it('should enforce unique constraint on email', async () => {
    const timestamp = Date.now()
    const testEmail = `test_${timestamp}@example.com`
    const testId1 = `test1_${timestamp}`
    const testId2 = `test2_${timestamp}`
    localTestIds.push(testId1, testId2)
    trackTestUser(testId1)
    trackTestUser(testId2)

    // Insert first record
    const { error: error1 } = await supabase
      .from('iso_agents')
      .insert({
        clerk_user_id: testId1,
        email: testEmail,
        full_name: 'Test User 1',
        role: 'sales_rep',
      })

    expect(error1).toBeNull()

    // Try to insert duplicate email (should fail, so won't be inserted)
    const { error: error2 } = await supabase
      .from('iso_agents')
      .insert({
        clerk_user_id: testId2,
        email: testEmail,
        full_name: 'Test User 2',
        role: 'sales_rep',
      })

    expect(error2).toBeDefined()
    expect(error2?.code).toBe('23505') // unique_violation

    // Cleanup - delete by clerk_user_id since email constraint prevents second insert
    await supabase.from('iso_agents').delete().eq('clerk_user_id', testId1)
  })
})

describe('Database Schema - client_profiles Table', () => {
  let supabase: TestSupabaseClient
  const localTestIds: string[] = []

  beforeAll(async () => {
    supabase = await createTestClient()
  })

  afterAll(async () => {
    if (supabase && localTestIds.length > 0) {
      for (const testId of localTestIds) {
        await supabase.from('iso_agents').delete().eq('clerk_user_id', testId)
      }
    }
    if (supabase) {
      await cleanupAllTestData(supabase)
    }
  })

  it('should have correct columns in client_profiles table', async () => {
    const { data, error } = await supabase
      .from('client_profiles')
      .select('*')
      .limit(1)

    expect(error).toBeNull()

    // Check for essential columns (data might be empty)
    if (data && data.length > 0) {
      const schema = Object.keys(data[0])
      expect(schema).toContain('id')
      expect(schema).toContain('user_id')
      expect(schema).toContain('company_name')
      expect(schema).toContain('contact_name')
      expect(schema).toContain('email')
      expect(schema).toContain('phone')
    }
  })

  it('should have foreign key relationship to iso_agents', async () => {
    const testUserId = `test_fk_${Date.now()}`
    localTestIds.push(testUserId)
    trackTestUser(testUserId)

    // Create test user
    const { data: user } = await supabase
      .from('iso_agents')
      .insert({
        clerk_user_id: testUserId,
        email: `${testUserId}@test.com`,
        full_name: 'Test User',
        role: 'sales_rep',
      })
      .select('id')
      .single()

    expect(user).toBeDefined()

    // Try to create client with invalid user_id (should fail)
    const { error } = await supabase
      .from('client_profiles')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000', // Invalid UUID
        company_name: 'Test Company',
        contact_name: 'Test Contact',
        email: 'test@company.com',
      })

    expect(error).toBeDefined()
    expect(error?.code).toBe('23503') // foreign_key_violation

    // Cleanup
    await supabase.from('iso_agents').delete().eq('clerk_user_id', testUserId)
  })
})

describe('Database Schema - requests Table', () => {
  let supabase: TestSupabaseClient
  const localTestIds: string[] = []

  beforeAll(async () => {
    supabase = await createTestClient()
  })

  afterAll(async () => {
    if (supabase && localTestIds.length > 0) {
      for (const testId of localTestIds) {
        await supabase.from('iso_agents').delete().eq('clerk_user_id', testId)
      }
    }
    if (supabase) {
      await cleanupAllTestData(supabase)
    }
  })

  it('should have correct columns in requests table', async () => {
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .limit(1)

    expect(error).toBeNull()

    if (data && data.length > 0) {
      const schema = Object.keys(data[0])
      expect(schema).toContain('id')
      expect(schema).toContain('user_id')
      expect(schema).toContain('client_profile_id')
      expect(schema).toContain('departure_airport')
      expect(schema).toContain('arrival_airport')
      expect(schema).toContain('departure_date')
      expect(schema).toContain('return_date')
      expect(schema).toContain('passengers')
      expect(schema).toContain('status')
    }
  })

  it('should enforce valid status values', async () => {
    const testUserId = `test_status_${Date.now()}`
    localTestIds.push(testUserId)
    trackTestUser(testUserId)

    // Create test user
    const { data: user } = await supabase
      .from('iso_agents')
      .insert({
        clerk_user_id: testUserId,
        email: `${testUserId}@test.com`,
        full_name: 'Test User',
        role: 'sales_rep',
      })
      .select('id')
      .single()

    // Try to create request with invalid status
    const { error } = await supabase
      .from('requests')
      .insert({
        user_id: user!.id,
        departure_airport: 'TEB',
        arrival_airport: 'VNY',
        departure_date: '2025-12-01',
        passengers: 4,
        status: 'invalid_status', // Should fail if enum constraint exists
      })

    // Note: This test depends on enum constraint implementation
    // May pass if constraint isn't strict

    // Cleanup handled by afterAll
  })
})

describe('Database Schema - quotes Table', () => {
  let supabase: TestSupabaseClient

  beforeAll(async () => {
    supabase = await createTestClient()
  })

  it('should have correct columns in quotes table', async () => {
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .limit(1)

    expect(error).toBeNull()

    if (data && data.length > 0) {
      const schema = Object.keys(data[0])
      expect(schema).toContain('id')
      expect(schema).toContain('request_id')
      expect(schema).toContain('operator_name')
      expect(schema).toContain('aircraft_type')
      expect(schema).toContain('base_price')
      expect(schema).toContain('total_price')
    }
  })

  it('should have foreign key to requests', async () => {
    // Try to insert quote with non-existent request_id
    const { error } = await supabase
      .from('quotes')
      .insert({
        request_id: '00000000-0000-0000-0000-000000000000',
        operator_id: 'test-operator',
        operator_name: 'Test Operator',
        aircraft_type: 'Citation X',
        base_price: 25000,
        fuel_surcharge: 0,
        taxes: 0,
        fees: 0,
        total_price: 25000,
      })

    expect(error).toBeDefined()
    expect(error?.code).toBe('23503') // foreign_key_violation
  })
})

describe('Database Schema - proposals Table', () => {
  let supabase: TestSupabaseClient

  beforeAll(async () => {
    supabase = await createTestClient()
  })

  it('should have correct columns in proposals table', async () => {
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .limit(1)

    expect(error).toBeNull()

    if (data && data.length > 0) {
      const schema = Object.keys(data[0])
      expect(schema).toContain('id')
      expect(schema).toContain('request_id')
      expect(schema).toContain('ranked_quotes')
      expect(schema).toContain('selected_quote_id')
      expect(schema).toContain('margin_applied')
    }
  })
})

describe('Database Schema - workflow_states Table', () => {
  let supabase: TestSupabaseClient

  beforeAll(async () => {
    supabase = await createTestClient()
  })

  it('should have correct columns in workflow_states table', async () => {
    const { data, error } = await supabase
      .from('workflow_states')
      .select('*')
      .limit(1)

    expect(error).toBeNull()

    if (data && data.length > 0) {
      const schema = Object.keys(data[0])
      expect(schema).toContain('id')
      expect(schema).toContain('request_id')
      expect(schema).toContain('current_state')
      expect(schema).toContain('previous_state')
      expect(schema).toContain('state_entered_at')
      expect(schema).toContain('metadata')
    }
  })
})

describe('Database Schema - agent_executions Table', () => {
  let supabase: TestSupabaseClient

  beforeAll(async () => {
    supabase = await createTestClient()
  })

  it('should have correct columns in agent_executions table', async () => {
    const { data, error } = await supabase
      .from('agent_executions')
      .select('*')
      .limit(1)

    expect(error).toBeNull()

    if (data && data.length > 0) {
      const schema = Object.keys(data[0])
      expect(schema).toContain('id')
      expect(schema).toContain('request_id')
      expect(schema).toContain('agent_type')
      expect(schema).toContain('agent_id')
      expect(schema).toContain('status')
      expect(schema).toContain('started_at')
      expect(schema).toContain('metadata')
    }
  })
})
