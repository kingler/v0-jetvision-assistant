/**
 * Supabase Type Helpers
 * Helper functions for type-safe Supabase operations
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/database';

/**
 * Type-safe Supabase client
 * Use this type annotation when TypeScript can't infer the Database type
 */
export type TypedSupabaseClient = SupabaseClient<Database>;

/**
 * Type assertion helper for Supabase clients
 * Use this when you need to ensure the client is properly typed
 */
export function asTypedClient(client: any): TypedSupabaseClient {
  return client as TypedSupabaseClient;
}
