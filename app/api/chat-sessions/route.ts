/**
 * Chat Sessions API (Consolidated Schema)
 *
 * GET /api/chat-sessions
 * Lists chat sessions (requests with session fields) for the authenticated user
 *
 * Query parameters:
 * - trip_id (optional): Filter by Avinode trip ID
 * - status (optional): Filter by session status (active, paused, completed, archived)
 * - id (optional): Filter by specific request ID
 *
 * DELETE /api/chat-sessions
 * Deletes a request and all associated messages
 *
 * NOTE: After schema consolidation (migration 030-033), chat sessions are now
 * stored directly in the `requests` table with session fields. The old
 * `chat_sessions` and `conversations` tables are deprecated.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getIsoAgentIdFromClerkUserId } from '@/lib/conversation/message-persistence';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const tripId = searchParams.get('trip_id');
    const status = searchParams.get('status');
    const id = searchParams.get('id');

    // Get user's ISO agent ID (auto-syncs from Clerk if not found)
    const agentId = await getIsoAgentIdFromClerkUserId(userId);

    if (!agentId) {
      return NextResponse.json(
        { error: 'User not found', message: 'Failed to sync your account. Please try again.' },
        { status: 404 }
      );
    }

    // Create agent object for backward compatibility with rest of function
    const agent = { id: agentId };

    // Build query for requests with session fields (consolidated schema)
    // This replaces the old chat_sessions + conversations join
    let query = supabaseAdmin
      .from('requests')
      .select(`
        id,
        iso_agent_id,
        client_profile_id,
        departure_airport,
        arrival_airport,
        departure_date,
        return_date,
        passengers,
        aircraft_type,
        budget,
        special_requirements,
        status,
        metadata,
        created_at,
        updated_at,
        avinode_rfq_id,
        avinode_trip_id,
        avinode_deep_link,
        operators_contacted,
        quotes_expected,
        quotes_received,
        session_status,
        conversation_type,
        current_step,
        workflow_state,
        session_started_at,
        session_ended_at,
        last_activity_at,
        subject,
        avinode_thread_id,
        last_message_at,
        last_message_by,
        message_count,
        unread_count_iso,
        unread_count_operator,
        is_priority,
        is_pinned
      `)
      .eq('iso_agent_id', agent.id)
      .order('last_activity_at', { ascending: false, nullsFirst: false });

    // Filter by trip ID if provided
    if (tripId) {
      query = query.eq('avinode_trip_id', tripId);
    }

    // Filter by request ID if provided
    if (id) {
      query = query.eq('id', id);
    }

    // Filter by session status if provided
    if (status) {
      const validStatuses = ['active', 'paused', 'completed', 'archived'];
      if (validStatuses.includes(status)) {
        query = query.eq('session_status', status);
      }
    } else if (!id) {
      // Default to active sessions only if no status filter and no ID filter
      query = query.in('session_status', ['active', 'paused']);
    }

    const { data: requests, error } = await query;

    if (error) {
      console.error('[GET /api/chat-sessions] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch chat sessions', message: error.message },
        { status: 500 }
      );
    }

    // Transform to match the old API response format for backward compatibility
    // The frontend expects certain field names from the old chat_sessions structure
    const sessions = (requests || []).map(req => ({
      // Session-level fields (previously from chat_sessions)
      id: req.id,
      request_id: req.id, // Self-reference for backward compat
      iso_agent_id: req.iso_agent_id,
      status: req.session_status || 'active',
      conversation_type: req.conversation_type || 'flight_request',
      avinode_trip_id: req.avinode_trip_id,
      avinode_rfq_id: req.avinode_rfq_id,
      primary_quote_id: null, // Can be derived from quotes table if needed
      proposal_id: null, // Can be derived from proposals table if needed
      session_started_at: req.session_started_at || req.created_at,
      session_ended_at: req.session_ended_at,
      last_activity_at: req.last_activity_at || req.updated_at,
      current_step: req.current_step,
      workflow_state: req.workflow_state || {},
      message_count: req.message_count || 0,
      quotes_received_count: req.quotes_received || 0,
      quotes_expected_count: req.quotes_expected || 0,
      operators_contacted_count: req.operators_contacted || 0,
      metadata: req.metadata || {},
      created_at: req.created_at,
      updated_at: req.updated_at,

      // Request details (embedded, previously from join)
      request: {
        id: req.id,
        departure_airport: req.departure_airport,
        arrival_airport: req.arrival_airport,
        departure_date: req.departure_date,
        return_date: req.return_date,
        passengers: req.passengers,
        aircraft_type: req.aircraft_type,
        budget: req.budget,
        status: req.status,
        avinode_trip_id: req.avinode_trip_id,
        avinode_rfq_id: req.avinode_rfq_id,
        avinode_deep_link: req.avinode_deep_link,
        created_at: req.created_at,
      },

      // Conversation metadata (previously from conversations join)
      conversation: {
        id: req.id, // Using request ID as conversation ID
        request_id: req.id,
        quote_id: null,
        type: req.conversation_type || 'flight_request',
        status: req.session_status || 'active',
        subject: req.subject,
        last_message_at: req.last_message_at,
        message_count: req.message_count || 0,
      },
    }));

    return NextResponse.json({
      sessions,
      count: sessions.length,
    });
  } catch (error) {
    console.error('[GET /api/chat-sessions] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/chat-sessions
 * Deletes a request and all associated messages
 *
 * Query parameters:
 * - id: Request ID to delete (required)
 *
 * With the consolidated schema, deleting a "chat session" means deleting the
 * request and its messages (via CASCADE on request_id FK).
 */
export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('id');

    if (!requestId) {
      return NextResponse.json(
        { error: 'Missing request ID', message: 'Request ID is required' },
        { status: 400 }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(requestId)) {
      return NextResponse.json(
        { error: 'Invalid request ID', message: 'Request ID must be a valid UUID' },
        { status: 400 }
      );
    }

    // Get user's ISO agent ID
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('iso_agents')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'User not found', message: 'Your account may not be synced to the database' },
        { status: 404 }
      );
    }

    // Verify the request exists and belongs to this user
    const { data: existingRequest, error: fetchError } = await supabaseAdmin
      .from('requests')
      .select('id, iso_agent_id')
      .eq('id', requestId)
      .single();

    if (fetchError || !existingRequest) {
      console.error('[DELETE /api/chat-sessions] Request not found:', {
        requestId,
        error: fetchError?.message,
      });
      return NextResponse.json(
        { error: 'Request not found', message: 'The specified request does not exist' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (existingRequest.iso_agent_id !== agent.id) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have permission to delete this request' },
        { status: 403 }
      );
    }

    // Delete messages first (they reference request_id with CASCADE, but explicit is safer)
    console.log('[DELETE /api/chat-sessions] Deleting messages for request:', requestId);
    const { error: messagesError, count: messagesCount } = await supabaseAdmin
      .from('messages')
      .delete({ count: 'exact' })
      .eq('request_id', requestId);

    if (messagesError) {
      console.warn('[DELETE /api/chat-sessions] Failed to delete messages:', {
        requestId,
        error: messagesError.message,
      });
      // Continue - CASCADE should handle this
    } else {
      console.log('[DELETE /api/chat-sessions] Deleted messages:', messagesCount);
    }

    // Delete quotes (they reference request_id with CASCADE)
    const { error: quotesError, count: quotesCount } = await supabaseAdmin
      .from('quotes')
      .delete({ count: 'exact' })
      .eq('request_id', requestId);

    if (quotesError) {
      console.warn('[DELETE /api/chat-sessions] Failed to delete quotes:', {
        requestId,
        error: quotesError.message,
      });
      // Continue - CASCADE should handle this
    } else if (quotesCount && quotesCount > 0) {
      console.log('[DELETE /api/chat-sessions] Deleted quotes:', quotesCount);
    }

    // Delete the request itself
    const { error: deleteError } = await supabaseAdmin
      .from('requests')
      .delete()
      .eq('id', requestId);

    if (deleteError) {
      console.error('[DELETE /api/chat-sessions] Deletion failed:', {
        requestId,
        error: deleteError.message,
      });
      return NextResponse.json(
        { error: 'Failed to delete request', message: deleteError.message },
        { status: 500 }
      );
    }

    console.log('[DELETE /api/chat-sessions] Successfully deleted request:', {
      requestId,
      messagesDeleted: messagesCount || 0,
    });

    return NextResponse.json(
      { message: 'Chat session deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('[DELETE /api/chat-sessions] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
