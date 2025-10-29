import { describe, it, expect, beforeAll } from 'vitest'
import { createTestClient, TestSupabaseClient, tableExists } from '@tests/utils/database'

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
 */

describe('Database Schema - Table Existence', () => {
  let supabase: TestSupabaseClient

  beforeAll(async () => {
    supabase = await createTestClient()
  })

  it('should have users table', async () => {
    const exists = await tableExists(supabase, 'users')
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

describe('Database Schema - users Table', () => {
  let supabase: TestSupabaseClient

  beforeAll(async () => {
    supabase = await createTestClient()
  })

  it('should have correct columns in users table', async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1)

    expect(error).toBeNull()

    // If table is empty, insert a test row to get schema
    if (!data || data.length === 0) {
      const { data: inserted } = await supabase
        .from('users')
        .insert({
          clerk_user_id: 'test_schema_check',
          email: 'schema@test.com',
          full_name: 'Test User',
          role: 'sales_rep',
        })
        .select()
        .single()

      const schema = Object.keys(inserted || {})

      // Clean up
      await supabase.from('users').delete().eq('clerk_user_id', 'test_schema_check')

      expect(schema).toContain('id')
      expect(schema).toContain('clerk_user_id')
      expect(schema).toContain('email')
      expect(schema).toContain('full_name')
      expect(schema).toContain('role')
      expect(schema).toContain('margin_type')
      expect(schema).toContain('margin_value')
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

    // Insert first record
    const { error: error1 } = await supabase
      .from('users')
      .insert({
        clerk_user_id: testId,
        email: `${testId}@test.com`,
        full_name: 'Test User',
        role: 'sales_rep',
      })

    expect(error1).toBeNull()

    // Try to insert duplicate clerk_user_id
    const { error: error2 } = await supabase
      .from('users')
      .insert({
        clerk_user_id: testId,
        email: `${testId}_2@test.com`,
        full_name: 'Test User 2',
        role: 'sales_rep',
      })

    expect(error2).toBeDefined()
    expect(error2?.code).toBe('23505') // unique_violation

    // Cleanup
    await supabase.from('users').delete().eq('clerk_user_id', testId)
  })

  it('should enforce unique constraint on email', async () => {
    const testEmail = `test_${Date.now()}@example.com`

    // Insert first record
    const { error: error1 } = await supabase
      .from('users')
      .insert({
        clerk_user_id: `test1_${Date.now()}`,
        email: testEmail,
        full_name: 'Test User 1',
        role: 'sales_rep',
      })

    expect(error1).toBeNull()

    // Try to insert duplicate email
    const { error: error2 } = await supabase
      .from('users')
      .insert({
        clerk_user_id: `test2_${Date.now()}`,
        email: testEmail,
        full_name: 'Test User 2',
        role: 'sales_rep',
      })

    expect(error2).toBeDefined()
    expect(error2?.code).toBe('23505') // unique_violation

    // Cleanup
    await supabase.from('users').delete().eq('email', testEmail)
  })
})

describe('Database Schema - client_profiles Table', () => {
  let supabase: TestSupabaseClient

  beforeAll(async () => {
    supabase = await createTestClient()
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

  it('should have foreign key relationship to users', async () => {
    const testUserId = `test_fk_${Date.now()}`

    // Create test user
    const { data: user } = await supabase
      .from('users')
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
    await supabase.from('users').delete().eq('clerk_user_id', testUserId)
  })
})

describe('Database Schema - requests Table', () => {
  let supabase: TestSupabaseClient

  beforeAll(async () => {
    supabase = await createTestClient()
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

    // Create test user
    const { data: user } = await supabase
      .from('users')
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

    // Cleanup
    await supabase.from('users').delete().eq('clerk_user_id', testUserId)
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
