/**
 * Supabase Client
 * Standard client for client-side operations with Row Level Security (RLS)
 *
 * This client uses the anon key and respects RLS policies.
 * All queries are automatically filtered by the authenticated user.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/database';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

/**
 * Standard Supabase client for client-side and authenticated operations
 * Respects Row Level Security (RLS) policies
 *
 * Use cases:
 * - Client-side components
 * - API routes (with user context)
 * - Server components (with user context)
 * - Any operation that should respect RLS
 */
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

/**
 * Type-safe helper for fetching user profile
 */
export async function getUserProfile(clerkUserId: string) {
  const { data, error } = await supabase
    .from('iso_agents')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .single();

  if (error) {
    console.error('Failed to fetch user profile:', error);
    throw error;
  }

  return data;
}

/**
 * Type-safe helper for fetching user's requests
 */
export async function getUserRequests(clerkUserId: string) {
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('created_by', clerkUserId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch user requests:', error);
    throw error;
  }

  return data;
}

/**
 * Type-safe helper for fetching a specific request
 */
export async function getRequest(requestId: string) {
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (error) {
    console.error('Failed to fetch request:', error);
    throw error;
  }

  return data;
}

/**
 * Type-safe helper for creating a new request
 */
export async function createRequest(
  request: Database['public']['Tables']['requests']['Insert']
) {
  const { data, error } = await supabase
    .from('requests')
    .insert(request)
    .select()
    .single();

  if (error) {
    console.error('Failed to create request:', error);
    throw error;
  }

  return data;
}

/**
 * Type-safe helper for fetching quotes for a request
 */
export async function getQuotesForRequest(requestId: string) {
  const { data, error} = await supabase
    .from('quotes')
    .select('*')
    .eq('request_id', requestId)
    .order('score', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('Failed to fetch quotes:', error);
    throw error;
  }

  return data;
}
