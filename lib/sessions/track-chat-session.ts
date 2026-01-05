/**
 * Chat Session Tracking Utilities
 * 
 * Helper functions for tracking chat conversation sessions tied to
 * trip requests, RFQs, and proposals in Supabase
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Database } from '@/lib/types/database';

/**
 * Chat session data structure
 */
export type ChatSession = Database['public']['Tables']['chat_sessions']['Row'];
export type ChatSessionInsert = Database['public']['Tables']['chat_sessions']['Insert'];
export type ChatSessionUpdate = Database['public']['Tables']['chat_sessions']['Update'];

/**
 * Create or update a chat session
 * 
 * @param sessionData - Session data to insert/update
 * @returns Created/updated session or null if error
 */
export async function createOrUpdateChatSession(
  sessionData: ChatSessionInsert
): Promise<ChatSession | null> {
  try {
    // Try to find existing session by conversation_id
    if (sessionData.conversation_id) {
      const { data: existing } = await supabaseAdmin
        .from('chat_sessions')
        .select('id')
        .eq('conversation_id', sessionData.conversation_id)
        .eq('status', 'active')
        .single();

      if (existing) {
        // Update existing session
        const { data: updated, error } = await supabaseAdmin
          .from('chat_sessions')
          .update({
            ...sessionData,
            last_activity_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) {
          console.error('[Chat Session] Error updating session:', error);
          return null;
        }

        console.log('[Chat Session] Session updated:', updated.id);
        return updated;
      }
    }

    // Create new session
    const { data: session, error } = await supabaseAdmin
      .from('chat_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (error) {
      console.error('[Chat Session] Error creating session:', error);
      return null;
    }

    console.log('[Chat Session] Session created:', session.id);
    return session;
  } catch (error) {
    console.error('[Chat Session] Error creating/updating session:', error);
    return null;
  }
}

/**
 * Get active chat session by conversation ID
 * 
 * @param conversationId - Conversation ID
 * @returns Active session or null
 */
export async function getActiveChatSession(
  conversationId: string
): Promise<ChatSession | null> {
  try {
    const { data: session, error } = await supabaseAdmin
      .from('chat_sessions')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('status', 'active')
      .order('last_activity_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !session) {
      return null;
    }

    return session;
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
    const { data: session, error } = await supabaseAdmin
      .from('chat_sessions')
      .select('*')
      .eq('request_id', requestId)
      .order('last_activity_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !session) {
      return null;
    }

    return session;
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
    const { data: sessions, error } = await supabaseAdmin
      .from('chat_sessions')
      .select('*')
      .eq('avinode_trip_id', tripId)
      .order('last_activity_at', { ascending: false });

    if (error) {
      console.error('[Chat Session] Error fetching sessions by trip:', error);
      return [];
    }

    return sessions || [];
  } catch (error) {
    console.error('[Chat Session] Error fetching sessions by trip:', error);
    return [];
  }
}

/**
 * Update chat session activity
 * 
 * @param sessionId - Session ID
 * @returns true if updated, false otherwise
 */
export async function updateChatSessionActivity(
  sessionId: string
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('chat_sessions')
      .update({
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('status', 'active');

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
 * @param sessionId - Session ID
 * @param updates - Updates to apply (trip ID, RFP ID, RFQ ID, etc.)
 * @returns Updated session or null
 */
export async function updateChatSessionWithTripInfo(
  sessionId: string,
  updates: {
    avinode_trip_id?: string;
    avinode_rfp_id?: string;
    avinode_rfq_id?: string;
    request_id?: string;
    current_step?: string;
    workflow_state?: Record<string, unknown>;
  }
): Promise<ChatSession | null> {
  try {
    const { data: session, error } = await supabaseAdmin
      .from('chat_sessions')
      .update({
        ...updates,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('[Chat Session] Error updating session with trip info:', error);
      return null;
    }

    return session;
  } catch (error) {
    console.error('[Chat Session] Error updating session with trip info:', error);
    return null;
  }
}

/**
 * Update chat session with quote information
 * 
 * @param sessionId - Session ID
 * @param quoteId - Quote ID
 * @param updates - Additional updates (quotes_received_count, etc.)
 * @returns Updated session or null
 */
export async function updateChatSessionWithQuote(
  sessionId: string,
  quoteId: string,
  updates?: {
    quotes_received_count?: number;
    quotes_expected_count?: number;
    primary_quote_id?: string;
  }
): Promise<ChatSession | null> {
  try {
    // Get current session to increment counts
    const { data: current } = await supabaseAdmin
      .from('chat_sessions')
      .select('quotes_received_count')
      .eq('id', sessionId)
      .single();

    const quotesReceivedCount = current
      ? (current.quotes_received_count || 0) + 1
      : updates?.quotes_received_count || 1;

    const { data: session, error } = await supabaseAdmin
      .from('chat_sessions')
      .update({
        primary_quote_id: quoteId,
        quotes_received_count: updates?.quotes_received_count || quotesReceivedCount,
        quotes_expected_count: updates?.quotes_expected_count,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('[Chat Session] Error updating session with quote:', error);
      return null;
    }

    return session;
  } catch (error) {
    console.error('[Chat Session] Error updating session with quote:', error);
    return null;
  }
}

/**
 * Update chat session with proposal information
 * 
 * @param sessionId - Session ID
 * @param proposalId - Proposal ID
 * @returns Updated session or null
 */
export async function updateChatSessionWithProposal(
  sessionId: string,
  proposalId: string
): Promise<ChatSession | null> {
  try {
    const { data: session, error } = await supabaseAdmin
      .from('chat_sessions')
      .update({
        proposal_id: proposalId,
        current_step: 'proposal_ready',
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('[Chat Session] Error updating session with proposal:', error);
      return null;
    }

    return session;
  } catch (error) {
    console.error('[Chat Session] Error updating session with proposal:', error);
    return null;
  }
}

/**
 * Complete a chat session
 * 
 * @param sessionId - Session ID
 * @returns true if updated, false otherwise
 */
export async function completeChatSession(sessionId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('chat_sessions')
      .update({
        status: 'completed',
        session_ended_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (error) {
      console.error('[Chat Session] Error completing session:', error);
      return false;
    }

    console.log('[Chat Session] Session completed:', sessionId);
    return true;
  } catch (error) {
    console.error('[Chat Session] Error completing session:', error);
    return false;
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
    const { data: sessions, error } = await supabaseAdmin
      .from('chat_sessions')
      .select('*')
      .eq('iso_agent_id', isoAgentId)
      .eq('status', 'active')
      .order('last_activity_at', { ascending: false });

    if (error) {
      console.error('[Chat Session] Error fetching user sessions:', error);
      return [];
    }

    return sessions || [];
  } catch (error) {
    console.error('[Chat Session] Error fetching user sessions:', error);
    return [];
  }
}
