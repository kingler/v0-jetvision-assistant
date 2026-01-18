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
import { normalizeTripId } from '@/lib/avinode/trip-id';

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
 * @param isoAgentId - The iso_agents.id (UUID) for the user
 * @returns The request row if found, null otherwise
 */
export async function findRequestByTripId(
  tripId: string,
  isoAgentId: string
): Promise<Database['public']['Tables']['requests']['Row'] | null> {
  const parsedTripId = normalizeTripId(tripId);
  const normalizedTripId = parsedTripId?.normalized ?? tripId.trim();
  const unprefixedTripId = normalizedTripId.replace(/^atrip-/i, '');
  const candidateTripIds = Array.from(
    new Set([tripId, normalizedTripId, unprefixedTripId].filter((value) => value))
  );
  const exactFilters = candidateTripIds.map((value) => `avinode_trip_id.eq.${value}`).join(',');
  const fuzzyFilter = unprefixedTripId ? `avinode_trip_id.ilike.%${unprefixedTripId}%` : '';
  const orFilter = [exactFilters, fuzzyFilter].filter(Boolean).join(',');

  const { data, error } = await supabaseAdmin
    .from('requests')
    .select('*')
    .eq('iso_agent_id', isoAgentId)
    .or(orFilter)
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
 * @param isoAgentId - The iso_agents.id (UUID) for the user
 * @param options - Optional filters (limit, status)
 * @returns Array of requests with trip data and total count
 */
export async function listUserTrips(
  isoAgentId: string,
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
    .eq('iso_agent_id', isoAgentId)
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
      iso_agent_id: userId,
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
    avinode_rfq_id?: string;
  }
) {
  const { data, error } = await supabaseAdmin
    .from('requests')
    .update({
      avinode_trip_id: tripData.avinode_trip_id,
      avinode_deep_link: tripData.avinode_deep_link,
      avinode_rfq_id: tripData.avinode_rfq_id,
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

/**
 * Update an existing conversation request with trip data and flight details
 *
 * This function is used when a trip is created during a chat conversation.
 * Instead of creating a new request (which would orphan the conversation messages),
 * it updates the existing conversation request with the trip information.
 *
 * This fixes the dual-request bug where:
 * - Request A (conversation) had messages but no trip ID
 * - Request B (trip) had trip ID but no messages
 *
 * @param requestId - The existing conversation request ID to update
 * @param tripData - Trip information from create_trip tool
 * @param flightData - Flight details from the tool call arguments
 * @returns The updated request row
 */
export async function updateConversationWithTripData(
  requestId: string,
  tripData: {
    trip_id: string;
    deep_link?: string;
    rfq_id?: string;
  },
  flightData: {
    departure_airport?: string;
    arrival_airport?: string;
    departure_date?: string;
    passengers?: number;
  }
): Promise<Database['public']['Tables']['requests']['Row']> {
  const updatePayload: Record<string, unknown> = {
    avinode_trip_id: tripData.trip_id,
    avinode_session_started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_activity_at: new Date().toISOString(),
    // Ensure conversation_type is flight_request when trip is created
    conversation_type: 'flight_request',
  };

  // Add optional trip data
  if (tripData.deep_link) {
    updatePayload.avinode_deep_link = tripData.deep_link;
  }
  if (tripData.rfq_id) {
    updatePayload.avinode_rfq_id = tripData.rfq_id;
  }

  // Add flight details if provided (only update non-empty values)
  if (flightData.departure_airport) {
    updatePayload.departure_airport = flightData.departure_airport;
  }
  if (flightData.arrival_airport) {
    updatePayload.arrival_airport = flightData.arrival_airport;
  }
  if (flightData.departure_date) {
    updatePayload.departure_date = flightData.departure_date;
  }
  if (flightData.passengers && flightData.passengers > 0) {
    updatePayload.passengers = flightData.passengers;
  }

  console.log('[Admin] Updating conversation request with trip data:', {
    requestId,
    tripId: tripData.trip_id,
    flightData,
  });

  const { data, error } = await supabaseAdmin
    .from('requests')
    .update(updatePayload)
    .eq('id', requestId)
    .select()
    .single();

  if (error) {
    console.error('[Admin] Failed to update conversation with trip data:', error);
    throw error;
  }

  console.log('[Admin] Successfully updated conversation request:', {
    requestId: data.id,
    tripId: data.avinode_trip_id,
    sessionStatus: data.session_status,
    conversationType: data.conversation_type,
  });

  return data;
}

// ============================================================================
// USER/ISO_AGENT HELPERS
// ============================================================================

/**
 * Get ISO Agent ID from Clerk User ID
 * Central lookup function for converting Clerk auth ID to database UUID
 *
 * @param clerkUserId - The Clerk user ID (e.g., "user_123abc")
 * @returns The iso_agents.id (UUID) or null if not found
 */
export async function getIsoAgentIdFromClerkUserId(
  clerkUserId: string
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('iso_agents')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single();

  if (error || !data) {
    console.error('[Admin] Error getting ISO agent ID:', error);
    return null;
  }

  return data.id;
}

/**
 * Get full ISO Agent record from Clerk User ID
 * Returns complete user profile including role and preferences
 *
 * @param clerkUserId - The Clerk user ID
 * @returns The full iso_agents row or null if not found
 */
export async function getIsoAgentByClerkUserId(
  clerkUserId: string
): Promise<Database['public']['Tables']['iso_agents']['Row'] | null> {
  const { data, error } = await supabaseAdmin
    .from('iso_agents')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .single();

  if (error || !data) {
    console.error('[Admin] Error getting ISO agent:', error);
    return null;
  }

  return data;
}

// ============================================================================
// PIPELINE/TRIP RETRIEVAL HELPERS
// ============================================================================

/**
 * Pipeline data structure for user's trip/request overview
 */
export interface UserPipelineData {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
  };
  stats: {
    totalRequests: number;
    pendingRequests: number;
    completedRequests: number;
    totalQuotes: number;
    activeWorkflows: number;
  };
  trips: Array<{
    id: string;
    avinode_trip_id: string | null;
    avinode_rfq_id: string | null;
    avinode_deep_link: string | null;
    departure_airport: string;
    arrival_airport: string;
    departure_date: string;
    return_date: string | null;
    passengers: number;
    status: string;
    quote_count: number;
    created_at: string;
    updated_at: string;
  }>;
}

/**
 * Get comprehensive pipeline data for a user
 * Includes user profile, stats, and all trips with quote counts
 *
 * @param clerkUserId - The Clerk user ID
 * @param options - Optional filters
 * @returns Complete pipeline data or null if user not found
 */
export async function getUserPipeline(
  clerkUserId: string,
  options?: {
    limit?: number;
    status?: Database['public']['Enums']['request_status'] | 'all';
    includeExpired?: boolean;
  }
): Promise<UserPipelineData | null> {
  // First get the user
  const user = await getIsoAgentByClerkUserId(clerkUserId);
  if (!user) {
    console.log(`[Admin] No user found for clerk_user_id: ${clerkUserId}`);
    return null;
  }

  // Get trips with quote counts
  const { trips, total } = await listUserTrips(user.id, {
    limit: options?.limit ?? 50,
    status: options?.status ?? 'all',
  });

  // Calculate stats
  const stats = {
    totalRequests: total,
    pendingRequests: trips.filter(t =>
      t.status === 'pending' || t.status === 'draft'
    ).length,
    completedRequests: trips.filter(t => t.status === 'completed').length,
    totalQuotes: trips.reduce((sum, t) => sum + (t.quote_count ?? 0), 0),
    activeWorkflows: trips.filter(t =>
      ['analyzing', 'fetching_client_data', 'searching_flights',
       'awaiting_quotes', 'analyzing_proposals', 'generating_email',
       'sending_proposal', 'trip_created', 'awaiting_user_action',
       'avinode_session_active', 'monitoring_for_quotes'].includes(t.status)
    ).length,
  };

  // Transform trips to pipeline format
  const pipelineTrips = trips.map(t => ({
    id: t.id,
    avinode_trip_id: t.avinode_trip_id,
    avinode_rfq_id: t.avinode_rfq_id,
    avinode_deep_link: t.avinode_deep_link,
    departure_airport: t.departure_airport,
    arrival_airport: t.arrival_airport,
    departure_date: t.departure_date as string,
    return_date: t.return_date as string | null,
    passengers: t.passengers,
    status: t.status,
    quote_count: t.quote_count ?? 0,
    created_at: t.created_at as string,
    updated_at: t.updated_at as string,
  }));

  return {
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
    },
    stats,
    trips: pipelineTrips,
  };
}

/**
 * Get trips by Trip ID pattern for a user
 * Searches across avinode_trip_id and avinode_rfq_id
 *
 * @param clerkUserId - The Clerk user ID
 * @param searchTerm - Trip ID search pattern (partial or full)
 * @returns Matching trips
 */
export async function searchUserTripsByTripId(
  clerkUserId: string,
  searchTerm: string
): Promise<Array<Database['public']['Tables']['requests']['Row']>> {
  // Get user's iso_agent_id
  const isoAgentId = await getIsoAgentIdFromClerkUserId(clerkUserId);
  if (!isoAgentId) {
    return [];
  }

  // Normalize search term
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const unprefixed = normalizedSearch.replace(/^(atrip-|arfq-)/i, '');

  const { data, error } = await supabaseAdmin
    .from('requests')
    .select('*')
    .eq('iso_agent_id', isoAgentId)
    .or(`avinode_trip_id.ilike.%${unprefixed}%,avinode_rfq_id.ilike.%${unprefixed}%`)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('[Admin] Error searching trips:', error);
    return [];
  }

  return data ?? [];
}
