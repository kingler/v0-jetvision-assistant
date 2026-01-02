/**
 * Supabase Admin Client
 * Service role client that bypasses RLS for system operations
 *
 * WARNING: Only use this for server-side operations that require
 * elevated privileges (e.g., agent operations, webhooks, cron jobs).
 * NEVER expose this client to the client-side.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/database';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY');
}

/**
 * Supabase client with service role privileges
 * Bypasses Row Level Security (RLS) policies
 *
 * Use cases:
 * - Agent operations (creating workflow states, execution logs)
 * - Clerk webhook (creating/updating user profiles)
 * - System operations (cleanup, migrations)
 * - Cross-tenant operations (admin dashboards)
 */
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Type-safe helper for agent execution logging
 */
export async function logAgentExecution(
  execution: Database['public']['Tables']['agent_executions']['Insert']
) {
  const { data, error } = await supabaseAdmin
    .from('agent_executions')
    .insert(execution)
    .select()
    .single();

  if (error) {
    console.error('Failed to log agent execution:', error);
    throw error;
  }

  return data;
}

/**
 * Type-safe helper for workflow state updates
 */
export async function createWorkflowState(
  state: Database['public']['Tables']['workflow_states']['Insert']
) {
  const { data, error } = await supabaseAdmin
    .from('workflow_states')
    .insert(state)
    .select()
    .single();

  if (error) {
    console.error('Failed to create workflow state:', error);
    throw error;
  }

  return data;
}

/**
 * Type-safe helper for creating quotes
 */
export async function createQuote(
  quote: Database['public']['Tables']['quotes']['Insert']
) {
  const { data, error } = await supabaseAdmin
    .from('quotes')
    .insert(quote)
    .select()
    .single();

  if (error) {
    console.error('Failed to create quote:', error);
    throw error;
  }

  return data;
}

/**
 * Type-safe helper for syncing user from Clerk
 */
export async function syncUserFromClerk(
  user: Database['public']['Tables']['iso_agents']['Insert']
) {
  const { data, error } = await supabaseAdmin
    .from('iso_agents')
    .upsert(user, {
      onConflict: 'clerk_user_id',
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to sync user from Clerk:', error);
    throw error;
  }

  return data;
}

// ============================================================================
// TRIP ID LOOKUP HELPERS
// ============================================================================

/**
 * Find a request by Avinode Trip ID
 * Used when user enters a Trip ID in chat to check if it already exists
 *
 * @param tripId - The Avinode trip ID (e.g., "B22E7Z" or "atrip-64956150")
 * @param userId - The user's ID (from iso_agents table)
 * @returns The request row if found, null otherwise
 */
export async function findRequestByTripId(
  tripId: string,
  userId: string
): Promise<Database['public']['Tables']['requests']['Row'] | null> {
  // Normalize trip ID - strip 'atrip-' prefix if present for consistent lookup
  const normalizedTripId = tripId.replace(/^atrip-/i, '');

  const { data, error } = await supabaseAdmin
    .from('requests')
    .select('*')
    .eq('user_id', userId)
    .or(`avinode_trip_id.eq.${tripId},avinode_trip_id.eq.${normalizedTripId},avinode_trip_id.ilike.%${normalizedTripId}%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Failed to find request by trip ID:', error);
    throw error;
  }

  return data;
}

/**
 * List all trips/requests for a user
 * Used for "show me all my trips" command
 *
 * @param userId - The user's ID (from iso_agents table)
 * @param options - Optional filters (limit, status)
 * @returns Array of requests with trip data and total count
 */
export async function listUserTrips(
  userId: string,
  options?: {
    limit?: number;
    status?: Database['public']['Enums']['request_status'] | 'all';
  }
): Promise<{
  trips: Array<Database['public']['Tables']['requests']['Row'] & {
    quote_count?: number;
  }>;
  total: number;
}> {
  const limit = options?.limit ?? 20;
  const status = options?.status ?? 'all';

  let query = supabaseAdmin
    .from('requests')
    .select('*, quotes(count)', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  // Filter by status if not 'all'
  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Failed to list user trips:', error);
    throw error;
  }

  // Transform data to include quote_count
  const trips = (data || []).map((row) => {
    const { quotes, ...rest } = row as typeof row & { quotes?: Array<{ count: number }> };
    return {
      ...rest,
      quote_count: quotes?.[0]?.count ?? 0,
    };
  });

  return {
    trips,
    total: count ?? trips.length,
  };
}

/**
 * Create or update a request with Trip ID
 * Used when user searches a Trip ID that doesn't exist yet
 *
 * @param tripId - The Avinode trip ID
 * @param userId - The user's ID
 * @param flightData - Flight details from the trip
 * @returns The created/updated request row
 */
export async function upsertRequestWithTripId(
  tripId: string,
  userId: string,
  flightData: {
    departure_airport: string;
    arrival_airport: string;
    departure_date: string;
    passengers?: number;
    deep_link?: string;
  }
): Promise<Database['public']['Tables']['requests']['Row']> {
  // First check if request with this trip ID exists
  const existingRequest = await findRequestByTripId(tripId, userId);

  if (existingRequest) {
    // Update existing request with new data
    const { data, error } = await supabaseAdmin
      .from('requests')
      .update({
        avinode_deep_link: flightData.deep_link ?? existingRequest.avinode_deep_link,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingRequest.id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update request with trip ID:', error);
      throw error;
    }

    return data;
  }

  // Create new request
  const { data, error } = await supabaseAdmin
    .from('requests')
    .insert({
      user_id: userId,
      avinode_trip_id: tripId,
      avinode_deep_link: flightData.deep_link,
      departure_airport: flightData.departure_airport,
      arrival_airport: flightData.arrival_airport,
      departure_date: flightData.departure_date,
      passengers: flightData.passengers ?? 1,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create request with trip ID:', error);
    throw error;
  }

  return data;
}

// ============================================================================
// AVINODE TRIP DATA HELPERS
// ============================================================================

/**
 * Update request with Avinode trip data
 * Used by FlightSearchAgent after calling create_trip MCP tool
 */
export async function updateRequestWithAvinodeTrip(
  requestId: string,
  tripData: {
    avinode_trip_id: string;
    avinode_deep_link: string;
    avinode_rfp_id?: string;
  }
) {
  const { data, error } = await supabaseAdmin
    .from('requests')
    .update({
      avinode_trip_id: tripData.avinode_trip_id,
      avinode_deep_link: tripData.avinode_deep_link,
      avinode_rfp_id: tripData.avinode_rfp_id,
      avinode_session_started_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update request with Avinode trip:', error);
    throw error;
  }

  return data;
}
