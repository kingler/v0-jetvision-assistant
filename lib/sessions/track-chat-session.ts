/**
 * Chat Session Tracking Utilities (Consolidated Schema)
 *
 * Helper functions for tracking chat conversation sessions tied to
 * trip requests, RFQs, and proposals in Supabase.
 *
 * NOTE: After schema consolidation (migration 030-033), chat sessions
 * are stored directly in the `requests` table with session fields.
 * The old `chat_sessions` table is deprecated.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/database.types';
import type { Json } from '@/lib/types/supabase';

/**
 * Chat session data structure (now mapped from requests table)
 */
export interface ChatSession {
  id: string;
  iso_agent_id: string;
  request_id: string | null; // Self-reference for backward compat
  session_status: 'active' | 'paused' | 'completed' | 'archived';
  conversation_type: 'flight_request' | 'general';
  avinode_trip_id: string | null;
  avinode_rfq_id: string | null;
  current_step: string | null;
  workflow_state: Record<string, unknown>;
  session_started_at: string | null;
  session_ended_at: string | null;
  last_activity_at: string | null;
  message_count: number;
  quotes_received: number;
  quotes_expected: number;
  created_at: string;
  updated_at: string;
}

/**
 * Session insert data (fields to set when creating/updating a request)
 */
export interface ChatSessionInsert {
  iso_agent_id: string;
  session_status?: 'active' | 'paused' | 'completed' | 'archived';
  conversation_type?: 'flight_request' | 'general';
  avinode_trip_id?: string;
  avinode_rfq_id?: string;
  current_step?: string;
  workflow_state?: Record<string, unknown>;
  // Request fields (for creation)
  departure_airport?: string;
  arrival_airport?: string;
  departure_date?: string;
  return_date?: string;
  passengers?: number;
}

/**
 * Session update data
 */
export interface ChatSessionUpdate {
  session_status?: 'active' | 'paused' | 'completed' | 'archived';
  conversation_type?: 'flight_request' | 'general';
  avinode_trip_id?: string;
  avinode_rfq_id?: string;
  current_step?: string;
  workflow_state?: Record<string, unknown>;
  session_ended_at?: string;
}

/**
 * Map request row to ChatSession interface
 */
function mapRequestToSession(row: Record<string, unknown>): ChatSession {
  return {
    id: row.id as string,
    iso_agent_id: row.iso_agent_id as string,
    request_id: row.id as string, // Self-reference
    session_status: (row.session_status || 'active') as ChatSession['session_status'],
    conversation_type: (row.conversation_type || 'flight_request') as ChatSession['conversation_type'],
    avinode_trip_id: row.avinode_trip_id as string | null,
    avinode_rfq_id: row.avinode_rfq_id as string | null,
    current_step: row.current_step as string | null,
    workflow_state: (row.workflow_state || {}) as Record<string, unknown>,
    session_started_at: row.session_started_at as string | null,
    session_ended_at: row.session_ended_at as string | null,
    last_activity_at: row.last_activity_at as string | null,
    message_count: (row.message_count || 0) as number,
    quotes_received: (row.quotes_received || 0) as number,
    quotes_expected: (row.quotes_expected || 0) as number,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

/**
 * Create or update a chat session (request with session fields)
 *
 * @param sessionData - Session data to insert/update
 * @param existingRequestId - Optional existing request ID to update
 * @returns Created/updated session or null if error
 */
export async function createOrUpdateChatSession(
  sessionData: ChatSessionInsert,
  existingRequestId?: string
): Promise<ChatSession | null> {
  try {
    // If we have an existing request ID, update it
    if (existingRequestId) {
      const { data: updated, error } = await supabaseAdmin
        .from('requests')
        .update({
          session_status: sessionData.session_status || 'active',
          conversation_type: sessionData.conversation_type,
          avinode_trip_id: sessionData.avinode_trip_id,
          avinode_rfq_id: sessionData.avinode_rfq_id,
          current_step: sessionData.current_step,
          workflow_state: sessionData.workflow_state as Json,
          last_activity_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingRequestId)
        .select()
        .single();

      if (error) {
        console.error('[Chat Session] Error updating session:', error);
        return null;
      }

      console.log('[Chat Session] Session updated:', updated.id);
      return mapRequestToSession(updated);
    }

    // Create new request with session fields
    const insertData: Database['public']['Tables']['requests']['Insert'] = {
      iso_agent_id: sessionData.iso_agent_id,
      departure_airport: sessionData.departure_airport || '',
      arrival_airport: sessionData.arrival_airport || '',
      departure_date: sessionData.departure_date || new Date().toISOString().split('T')[0],
      return_date: sessionData.return_date,
      passengers: sessionData.passengers || 1,
      status: 'draft',
      session_status: sessionData.session_status || 'active',
      conversation_type: sessionData.conversation_type || 'flight_request',
      avinode_trip_id: sessionData.avinode_trip_id,
      avinode_rfq_id: sessionData.avinode_rfq_id,
      current_step: sessionData.current_step,
      workflow_state: (sessionData.workflow_state || {}) as Json,
      session_started_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    };
    const { data: request, error } = await supabaseAdmin
      .from('requests')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[Chat Session] Error creating session:', error);
      return null;
    }

    console.log('[Chat Session] Session created:', request.id);
    return mapRequestToSession(request);
  } catch (error) {
    console.error('[Chat Session] Error creating/updating session:', error);
    return null;
  }
}

/**
 * Get active chat session by request ID
 *
 * @param requestId - Request ID
 * @returns Active session or null
 */
export async function getActiveChatSession(
  requestId: string
): Promise<ChatSession | null> {
  try {
    const { data: request, error } = await supabaseAdmin
      .from('requests')
      .select('*')
      .eq('id', requestId)
      .in('session_status', ['active', 'paused'])
      .single();

    if (error || !request) {
      return null;
    }

    return mapRequestToSession(request);
  } catch (error) {
    console.error('[Chat Session] Error fetching session:', error);
    return null;
  }
}

/**
 * Get chat session by request ID
 *
 * @param requestId - Request ID (trip request)
 * @returns Session or null
 */
export async function getChatSessionByRequest(
  requestId: string
): Promise<ChatSession | null> {
  try {
    const { data: request, error } = await supabaseAdmin
      .from('requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (error || !request) {
      return null;
    }

    return mapRequestToSession(request);
  } catch (error) {
    console.error('[Chat Session] Error fetching session by request:', error);
    return null;
  }
}

/**
 * Get chat sessions by Avinode trip ID
 *
 * @param tripId - Avinode trip ID
 * @returns Array of sessions
 */
export async function getChatSessionsByTripId(
  tripId: string
): Promise<ChatSession[]> {
  try {
    const { data: requests, error } = await supabaseAdmin
      .from('requests')
      .select('*')
      .eq('avinode_trip_id', tripId)
      .order('last_activity_at', { ascending: false });

    if (error) {
      console.error('[Chat Session] Error fetching sessions by trip:', error);
      return [];
    }

    return (requests || []).map(mapRequestToSession);
  } catch (error) {
    console.error('[Chat Session] Error fetching sessions by trip:', error);
    return [];
  }
}

/**
 * Update chat session activity
 *
 * @param requestId - Request ID (session ID)
 * @returns true if updated, false otherwise
 */
export async function updateChatSessionActivity(
  requestId: string
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('requests')
      .update({
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .in('session_status', ['active', 'paused']);

    if (error) {
      console.error('[Chat Session] Error updating activity:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Chat Session] Error updating activity:', error);
    return false;
  }
}

/**
 * Update chat session with trip/RFQ information
 *
 * @param requestId - Request ID (session ID)
 * @param updates - Updates to apply (trip ID, RFP ID, etc.)
 * @returns Updated session or null
 */
export async function updateChatSessionWithTripInfo(
  requestId: string,
  updates: {
    avinode_trip_id?: string;
    avinode_rfq_id?: string;
    current_step?: string;
    workflow_state?: Record<string, unknown>;
  }
): Promise<ChatSession | null> {
  try {
    const { data: request, error } = await supabaseAdmin
      .from('requests')
      .update({
        avinode_trip_id: updates.avinode_trip_id,
        avinode_rfq_id: updates.avinode_rfq_id,
        current_step: updates.current_step,
        workflow_state: updates.workflow_state as Json,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      console.error('[Chat Session] Error updating session with trip info:', error);
      return null;
    }

    return mapRequestToSession(request);
  } catch (error) {
    console.error('[Chat Session] Error updating session with trip info:', error);
    return null;
  }
}

/**
 * Update chat session with quote information
 *
 * @param requestId - Request ID (session ID)
 * @param quoteId - Quote ID (used for linking, stored separately)
 * @param updates - Additional updates (quotes_received, etc.)
 * @returns Updated session or null
 */
export async function updateChatSessionWithQuote(
  requestId: string,
  quoteId: string,
  updates?: {
    quotes_received?: number;
    quotes_expected?: number;
  }
): Promise<ChatSession | null> {
  try {
    // Get current session to increment counts
    const { data: current } = await supabaseAdmin
      .from('requests')
      .select('quotes_received')
      .eq('id', requestId)
      .single();

    const quotesReceived = current
      ? (current.quotes_received || 0) + 1
      : updates?.quotes_received || 1;

    const { data: request, error } = await supabaseAdmin
      .from('requests')
      .update({
        quotes_received: updates?.quotes_received ?? quotesReceived,
        quotes_expected: updates?.quotes_expected,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      console.error('[Chat Session] Error updating session with quote:', error);
      return null;
    }

    return mapRequestToSession(request);
  } catch (error) {
    console.error('[Chat Session] Error updating session with quote:', error);
    return null;
  }
}

/**
 * Update chat session with proposal information
 *
 * @param requestId - Request ID (session ID)
 * @param proposalId - Proposal ID (stored in proposals table)
 * @returns Updated session or null
 */
export async function updateChatSessionWithProposal(
  requestId: string,
  proposalId: string
): Promise<ChatSession | null> {
  try {
    const { data: request, error } = await supabaseAdmin
      .from('requests')
      .update({
        current_step: 'proposal_ready',
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      console.error('[Chat Session] Error updating session with proposal:', error);
      return null;
    }

    return mapRequestToSession(request);
  } catch (error) {
    console.error('[Chat Session] Error updating session with proposal:', error);
    return null;
  }
}

/**
 * Complete a chat session
 *
 * @param requestId - Request ID (session ID)
 * @returns true if updated, false otherwise
 */
export async function completeChatSession(requestId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('requests')
      .update({
        session_status: 'completed',
        session_ended_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (error) {
      console.error('[Chat Session] Error completing session:', error);
      return false;
    }

    console.log('[Chat Session] Session completed:', requestId);
    return true;
  } catch (error) {
    console.error('[Chat Session] Error completing session:', error);
    return false;
  }
}

/**
 * Update chat session conversation type
 * Used when transitioning from general chat to flight request
 *
 * @param requestId - Request ID (session ID)
 * @param conversationType - New conversation type ('flight_request' | 'general')
 * @returns Updated session or null
 */
export async function updateChatSessionType(
  requestId: string,
  conversationType: 'flight_request' | 'general'
): Promise<ChatSession | null> {
  try {
    const { data: request, error } = await supabaseAdmin
      .from('requests')
      .update({
        conversation_type: conversationType,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      console.error('[Chat Session] Error updating conversation type:', error);
      return null;
    }

    console.log('[Chat Session] Conversation type updated:', {
      requestId,
      conversationType,
    });
    return mapRequestToSession(request);
  } catch (error) {
    console.error('[Chat Session] Error updating conversation type:', error);
    return null;
  }
}

/**
 * Get active chat sessions for a user
 *
 * @param isoAgentId - ISO agent ID
 * @returns Array of active sessions
 */
export async function getUserActiveChatSessions(
  isoAgentId: string
): Promise<ChatSession[]> {
  try {
    const { data: requests, error } = await supabaseAdmin
      .from('requests')
      .select('*')
      .eq('iso_agent_id', isoAgentId)
      .in('session_status', ['active', 'paused'])
      .order('last_activity_at', { ascending: false });

    if (error) {
      console.error('[Chat Session] Error fetching user sessions:', error);
      return [];
    }

    return (requests || []).map(mapRequestToSession);
  } catch (error) {
    console.error('[Chat Session] Error fetching user sessions:', error);
    return [];
  }
}
