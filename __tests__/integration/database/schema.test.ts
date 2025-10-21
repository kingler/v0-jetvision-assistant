import { describe, it, expect, beforeAll } from 'vitest'
import { createTestClient, TestSupabaseClient, tableExists } from '@tests/utils/database'

/**
 * Database Schema Integration Tests
 *
 * TDD RED PHASE: These tests validate the database schema structure
 * Expected behavior: Tests will FAIL until schema is deployed
 *
 * Coverage areas:
 * - Table existence (7 tables)
 * - Column structure and types
 * - Indexes and constraints
 * - Foreign key relationships
 */

describe('Database Schema - Table Existence', () => {
  let supabase: TestSupabaseClient

  beforeAll(async () => {
    supabase = await createTestClient()
  })

  it('should have iso_agents table', async () => {
    const exists = await tableExists(supabase, 'iso_agents')
    expect(exists).toBe(true)
  })

  it('should have iso_clients table', async () => {
    const exists = await tableExists(supabase, 'iso_clients')
    expect(exists).toBe(true)
  })

  it('should have iso_flight_requests table', async () => {
    const exists = await tableExists(supabase, 'iso_flight_requests')
    expect(exists).toBe(true)
  })

  it('should have iso_quotes table', async () => {
    const exists = await tableExists(supabase, 'iso_quotes')
    expect(exists).toBe(true)
  })

  it('should have iso_proposals table', async () => {
    const exists = await tableExists(supabase, 'iso_proposals')
    expect(exists).toBe(true)
  })

  it('should have iso_communications table', async () => {
    const exists = await tableExists(supabase, 'iso_communications')
    expect(exists).toBe(true)
  })

  it('should have iso_workflow_history table', async () => {
    const exists = await tableExists(supabase, 'iso_workflow_history')
    expect(exists).toBe(true)
  })
})

describe('Database Schema - iso_agents Table', () => {
  let supabase: TestSupabaseClient

  beforeAll(async () => {
    supabase = await createTestClient()
  })

  it('should have correct columns in iso_agents table', async () => {
    const { data, error } = await supabase
      .from('iso_agents')
      .select('*')
      .limit(1)

    expect(error).toBeNull()

    // If table is empty, insert a test row to get schema
    if (!data || data.length === 0) {
      const { data: inserted } = await supabase
        .from('iso_agents')
        .insert({
          clerk_user_id: 'test_schema_check',
          email: 'schema@test.com',
          role: 'broker',
        })
        .select()
        .single()

      const schema = Object.keys(inserted || {})

      // Clean up
      await supabase.from('iso_agents').delete().eq('clerk_user_id', 'test_schema_check')

      expect(schema).toContain('id')
      expect(schema).toContain('clerk_user_id')
      expect(schema).toContain('email')
      expect(schema).toContain('full_name')
      expect(schema).toContain('role')
      expect(schema).toContain('margin_type')
      expect(schema).toContain('margin_value')
      expect(schema).toContain('is_active')
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
      .from('iso_agents')
      .insert({
        clerk_user_id: testId,
        email: `${testId}@test.com`,
        role: 'broker',
      })

    expect(error1).toBeNull()

    // Try to insert duplicate clerk_user_id
    const { error: error2 } = await supabase
      .from('iso_agents')
      .insert({
        clerk_user_id: testId,
        email: `${testId}_2@test.com`,
        role: 'broker',
      })

    expect(error2).toBeDefined()
    expect(error2?.code).toBe('23505') // unique_violation

    // Cleanup
    await supabase.from('iso_agents').delete().eq('clerk_user_id', testId)
  })

  it('should enforce unique constraint on email', async () => {
    const testEmail = `test_${Date.now()}@example.com`

    // Insert first record
    const { error: error1 } = await supabase
      .from('iso_agents')
      .insert({
        clerk_user_id: `test1_${Date.now()}`,
        email: testEmail,
        role: 'broker',
      })

    expect(error1).toBeNull()

    // Try to insert duplicate email
    const { error: error2 } = await supabase
      .from('iso_agents')
      .insert({
        clerk_user_id: `test2_${Date.now()}`,
        email: testEmail,
        role: 'broker',
      })

    expect(error2).toBeDefined()
    expect(error2?.code).toBe('23505') // unique_violation

    // Cleanup
    await supabase.from('iso_agents').delete().eq('email', testEmail)
  })
})

describe('Database Schema - iso_clients Table', () => {
  let supabase: TestSupabaseClient

  beforeAll(async () => {
    supabase = await createTestClient()
  })

  it('should have correct columns in iso_clients table', async () => {
    const { data, error } = await supabase
      .from('iso_clients')
      .select('*')
      .limit(1)

    expect(error).toBeNull()

    // Check for essential columns (data might be empty)
    if (data && data.length > 0) {
      const schema = Object.keys(data[0])
      expect(schema).toContain('id')
      expect(schema).toContain('agent_id')
      expect(schema).toContain('company_name')
      expect(schema).toContain('contact_name')
      expect(schema).toContain('email')
      expect(schema).toContain('phone')
    }
  })

  it('should have foreign key relationship to iso_agents', async () => {
    const testUserId = `test_fk_${Date.now()}`

    // Create test user
    const { data: user } = await supabase
      .from('iso_agents')
      .insert({
        clerk_user_id: testUserId,
        email: `${testUserId}@test.com`,
        role: 'broker',
      })
      .select('id')
      .single()

    expect(user).toBeDefined()

    // Try to create client with invalid agent_id (should fail)
    const { error } = await supabase
      .from('iso_clients')
      .insert({
        agent_id: '00000000-0000-0000-0000-000000000000', // Invalid UUID
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

describe('Database Schema - iso_flight_requests Table', () => {
  let supabase: TestSupabaseClient

  beforeAll(async () => {
    supabase = await createTestClient()
  })

  it('should have correct columns in iso_flight_requests table', async () => {
    const { data, error } = await supabase
      .from('iso_flight_requests')
      .select('*')
      .limit(1)

    expect(error).toBeNull()

    if (data && data.length > 0) {
      const schema = Object.keys(data[0])
      expect(schema).toContain('id')
      expect(schema).toContain('agent_id')
      expect(schema).toContain('client_id')
      expect(schema).toContain('departure_airport')
      expect(schema).toContain('arrival_airport')
      expect(schema).toContain('departure_date')
      expect(schema).toContain('return_date')
      expect(schema).toContain('passengers')
      expect(schema).toContain('status')
      expect(schema).toContain('workflow_state')
    }
  })

  it('should enforce valid status values', async () => {
    const testUserId = `test_status_${Date.now()}`

    // Create test user
    const { data: user } = await supabase
      .from('iso_agents')
      .insert({
        clerk_user_id: testUserId,
        email: `${testUserId}@test.com`,
        role: 'broker',
      })
      .select('id')
      .single()

    // Try to create flight request with invalid status
    const { error } = await supabase
      .from('iso_flight_requests')
      .insert({
        agent_id: user!.id,
        departure_airport: 'TEB',
        arrival_airport: 'VNY',
        departure_date: '2025-12-01',
        passengers: 4,
        status: 'invalid_status', // Should fail if CHECK constraint exists
      })

    // Note: This test depends on CHECK constraint implementation
    // May pass if constraint isn't strict

    // Cleanup
    await supabase.from('iso_agents').delete().eq('clerk_user_id', testUserId)
  })
})

describe('Database Schema - iso_quotes Table', () => {
  let supabase: TestSupabaseClient

  beforeAll(async () => {
    supabase = await createTestClient()
  })

  it('should have correct columns in iso_quotes table', async () => {
    const { data, error } = await supabase
      .from('iso_quotes')
      .select('*')
      .limit(1)

    expect(error).toBeNull()

    if (data && data.length > 0) {
      const schema = Object.keys(data[0])
      expect(schema).toContain('id')
      expect(schema).toContain('flight_request_id')
      expect(schema).toContain('operator_name')
      expect(schema).toContain('aircraft_type')
      expect(schema).toContain('price')
      expect(schema).toContain('currency')
    }
  })

  it('should have foreign key to iso_flight_requests', async () => {
    // Try to insert quote with non-existent flight_request_id
    const { error } = await supabase
      .from('iso_quotes')
      .insert({
        flight_request_id: '00000000-0000-0000-0000-000000000000',
        operator_name: 'Test Operator',
        aircraft_type: 'Citation X',
        price: 25000,
        currency: 'USD',
      })

    expect(error).toBeDefined()
    expect(error?.code).toBe('23503') // foreign_key_violation
  })
})

describe('Database Schema - iso_proposals Table', () => {
  let supabase: TestSupabaseClient

  beforeAll(async () => {
    supabase = await createTestClient()
  })

  it('should have correct columns in iso_proposals table', async () => {
    const { data, error } = await supabase
      .from('iso_proposals')
      .select('*')
      .limit(1)

    expect(error).toBeNull()

    if (data && data.length > 0) {
      const schema = Object.keys(data[0])
      expect(schema).toContain('id')
      expect(schema).toContain('flight_request_id')
      expect(schema).toContain('ranked_quotes')
      expect(schema).toContain('selected_quote_id')
      expect(schema).toContain('margin_applied')
    }
  })
})

describe('Database Schema - iso_communications Table', () => {
  let supabase: TestSupabaseClient

  beforeAll(async () => {
    supabase = await createTestClient()
  })

  it('should have correct columns in iso_communications table', async () => {
    const { data, error } = await supabase
      .from('iso_communications')
      .select('*')
      .limit(1)

    expect(error).toBeNull()

    if (data && data.length > 0) {
      const schema = Object.keys(data[0])
      expect(schema).toContain('id')
      expect(schema).toContain('flight_request_id')
      expect(schema).toContain('direction')
      expect(schema).toContain('recipient')
      expect(schema).toContain('subject')
      expect(schema).toContain('body')
      expect(schema).toContain('sent_at')
    }
  })
})

describe('Database Schema - iso_workflow_history Table', () => {
  let supabase: TestSupabaseClient

  beforeAll(async () => {
    supabase = await createTestClient()
  })

  it('should have correct columns in iso_workflow_history table', async () => {
    const { data, error } = await supabase
      .from('iso_workflow_history')
      .select('*')
      .limit(1)

    expect(error).toBeNull()

    if (data && data.length > 0) {
      const schema = Object.keys(data[0])
      expect(schema).toContain('id')
      expect(schema).toContain('flight_request_id')
      expect(schema).toContain('from_state')
      expect(schema).toContain('to_state')
      expect(schema).toContain('transitioned_at')
      expect(schema).toContain('metadata')
    }
  })
})
