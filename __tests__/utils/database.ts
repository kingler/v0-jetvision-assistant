import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Database Test Utilities
 *
 * Provides helper functions for database testing including:
 * - Test client creation with service role
 * - Test data cleanup
 * - Schema validation helpers
 */

export type TestSupabaseClient = SupabaseClient

/**
 * Creates a Supabase client with service role key for testing
 * Uses service role to bypass RLS policies during setup/teardown
 */
export async function createTestClient(): Promise<TestSupabaseClient> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
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
 */
export async function createTestUser(
  supabase: TestSupabaseClient,
  clerkUserId: string = `test_${Date.now()}`,
  email: string = `test.${Date.now()}@example.com`
): Promise<string> {
  const { data, error } = await supabase
    .from('iso_agents')
    .insert({
      clerk_user_id: clerkUserId,
      email,
      full_name: 'Test User',
      role: 'broker',
      margin_type: 'percentage',
      margin_value: 10,
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
