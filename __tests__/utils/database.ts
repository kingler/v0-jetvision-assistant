import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Database Test Utilities
 *
 * Provides helper functions for database testing including:
 * - Test client creation with service role
 * - Test data cleanup
 * - Schema validation helpers
 *
 * IMPORTANT: Integration tests should use TEST_SUPABASE_URL env var
 * to avoid polluting production database.
 */

export type TestSupabaseClient = SupabaseClient

/**
 * Production database URLs that should NEVER be used for integration tests
 * Add your production Supabase URL here to prevent accidental writes
 */
const PRODUCTION_DB_PATTERNS = [
  'supabase.co', // All Supabase production databases
]

/**
 * Checks if a URL appears to be a production database
 */
function isProductionDatabase(url: string): boolean {
  // Allow explicit test databases
  if (process.env.ALLOW_PRODUCTION_DB_TESTS === 'true') {
    return false
  }

  // Check if URL matches production patterns
  return PRODUCTION_DB_PATTERNS.some(pattern => url.includes(pattern))
}

/**
 * Creates a Supabase client with service role key for testing
 * Uses service role to bypass RLS policies during setup/teardown
 *
 * WARNING: Will throw if attempting to connect to production database
 * unless ALLOW_PRODUCTION_DB_TESTS=true is set (not recommended)
 */
export async function createTestClient(): Promise<TestSupabaseClient> {
  // Prefer test-specific URL, fall back to main URL
  const supabaseUrl = process.env.TEST_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.TEST_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing Supabase credentials. Set TEST_SUPABASE_URL and TEST_SUPABASE_SERVICE_KEY for testing, ' +
      'or NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    )
  }

  // SAFETY CHECK: Prevent integration tests from running against production
  if (isProductionDatabase(supabaseUrl)) {
    throw new Error(
      `SAFETY ERROR: Integration tests cannot run against production database (${supabaseUrl}).\n\n` +
      'Options:\n' +
      '1. Set TEST_SUPABASE_URL to a test/local database\n' +
      '2. Use a local Supabase instance: npx supabase start\n' +
      '3. Skip integration tests: npm run test:unit\n\n' +
      'To override (NOT RECOMMENDED): set ALLOW_PRODUCTION_DB_TESTS=true'
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return supabase
}

/**
 * Creates a Supabase client with anon key for RLS testing
 * Used to verify RLS policies work correctly
 */
export async function createAnonClient(): Promise<TestSupabaseClient> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return supabase
}

/**
 * Cleans up test data for a specific user
 * Uses CASCADE delete to remove all related records
 */
export async function cleanupTestData(
  supabase: TestSupabaseClient,
  clerkUserId: string
): Promise<void> {
  // Delete user (CASCADE will handle related records)
  const { error } = await supabase
    .from('iso_agents')
    .delete()
    .eq('clerk_user_id', clerkUserId)

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows found, which is okay
    console.error('Error cleaning up test data:', error)
    throw error
  }
}

/**
 * Creates a test user in the database
 * Returns the created user ID
 *
 * Automatically tracks the user for cleanup - call cleanupAllTestData() in afterAll()
 */
export async function createTestUser(
  supabase: TestSupabaseClient,
  clerkUserId: string = `test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  email: string = `test_${Date.now()}@test.com`
): Promise<string> {
  // Track for cleanup BEFORE insert (in case of partial failure)
  createdTestUserIds.add(clerkUserId)

  const { data, error } = await supabase
    .from('iso_agents')
    .insert({
      clerk_user_id: clerkUserId,
      email,
      full_name: 'Test User',
      role: 'iso_agent',
      commission_percentage: 10,
      is_active: true,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating test user:', error)
    throw error
  }

  return data.id
}

/**
 * Checks if a table exists in the database
 */
export async function tableExists(
  supabase: TestSupabaseClient,
  tableName: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(0)

  // If error is "relation does not exist", table doesn't exist
  if (error && error.code === '42P01') {
    return false
  }

  // Any other error means we can't determine
  if (error) {
    throw error
  }

  return true
}

/**
 * Checks if RLS is enabled on a table
 */
export async function rlsEnabled(
  supabase: TestSupabaseClient,
  tableName: string
): Promise<boolean> {
  const { data, error} = await supabase.rpc('check_rls_enabled', {
    table_name: tableName,
  })

  if (error) {
    // If RPC doesn't exist, we'll check manually via pg_catalog
    // This is a fallback for testing
    console.warn('RLS check RPC not available, using fallback')
    return false
  }

  return data === true
}

/**
 * Gets the count of records in a table
 */
export async function getTableCount(
  supabase: TestSupabaseClient,
  tableName: string
): Promise<number> {
  const { count, error } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true })

  if (error) {
    throw error
  }

  return count || 0
}

/**
 * Track all test clerk_user_ids created during test runs for cleanup
 */
const createdTestUserIds: Set<string> = new Set()

/**
 * Register a test user ID for cleanup
 */
export function trackTestUser(clerkUserId: string): void {
  createdTestUserIds.add(clerkUserId)
}

/**
 * Clean up ALL test records created during this test run
 * Call this in afterAll() hooks
 */
export async function cleanupAllTestData(supabase: TestSupabaseClient): Promise<void> {
  if (createdTestUserIds.size === 0) {
    return
  }

  const idsToDelete = Array.from(createdTestUserIds)

  // Delete in batches of 50
  for (let i = 0; i < idsToDelete.length; i += 50) {
    const batch = idsToDelete.slice(i, i + 50)
    const { error } = await supabase
      .from('iso_agents')
      .delete()
      .in('clerk_user_id', batch)

    if (error && error.code !== 'PGRST116') {
      console.error('Error cleaning up test data:', error)
    }
  }

  createdTestUserIds.clear()
}

/**
 * Clean up ALL orphaned test records (emergency cleanup)
 * Matches common test data patterns
 */
export async function cleanupOrphanedTestData(supabase: TestSupabaseClient): Promise<number> {
  const patterns = [
    'test_%',
    'test_clerk_%',
    'test_fk_%',
    'test_unique_%',
    'test_status_%',
    'clerk_user_123',
    'clerk_admin_123',
  ]

  let totalDeleted = 0

  for (const pattern of patterns) {
    const { count, error } = await supabase
      .from('iso_agents')
      .delete({ count: 'exact' })
      .like('clerk_user_id', pattern)

    if (!error && count) {
      totalDeleted += count
    }
  }

  // Also clean up by email patterns
  const emailPatterns = ['%@test.com', 'test%@example.com', 'schema@test.com']

  for (const pattern of emailPatterns) {
    const { count, error } = await supabase
      .from('iso_agents')
      .delete({ count: 'exact' })
      .like('email', pattern)

    if (!error && count) {
      totalDeleted += count
    }
  }

  return totalDeleted
}
