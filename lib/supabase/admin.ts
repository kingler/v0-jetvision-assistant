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
