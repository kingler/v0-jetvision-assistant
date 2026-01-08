/**
 * Chat Sessions API
 * 
 * GET /api/chat-sessions
 * Lists chat conversation sessions for the authenticated user
 * 
 * Query parameters:
 * - trip_id (optional): Filter sessions by Avinode trip ID
 * - status (optional): Filter by session status (active, paused, completed, archived)
 * 
 * Returns list of chat sessions with conversation and request details
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

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
    const id = searchParams.get('id'); // Support filtering by chat_session ID

    // Get user's ISO agent ID using admin client (bypasses RLS)
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

    // Build query for chat sessions (using admin client to bypass RLS for joins)
    let query = supabaseAdmin
      .from('chat_sessions')
      .select(`
        id,
        conversation_id,
        request_id,
        iso_agent_id,
        status,
        avinode_trip_id,
        avinode_rfp_id,
        avinode_rfq_id,
        primary_quote_id,
        proposal_id,
        session_started_at,
        session_ended_at,
        last_activity_at,
        current_step,
        workflow_state,
        message_count,
        quotes_received_count,
        quotes_expected_count,
        operators_contacted_count,
        metadata,
        created_at,
        updated_at,
        conversation:conversations(
          id,
          request_id,
          quote_id,
          type,
          status,
          subject,
          last_message_at,
          message_count
        ),
        request:requests(
          id,
          departure_airport,
          arrival_airport,
          departure_date,
          return_date,
          passengers,
          aircraft_type,
          budget,
          status,
          avinode_trip_id,
          avinode_rfp_id,
          avinode_deep_link,
          created_at
        )
      `)
      .eq('iso_agent_id', agent.id)
      .order('last_activity_at', { ascending: false });

    // Filter by trip ID if provided
    if (tripId) {
      query = query.eq('avinode_trip_id', tripId);
    }

    // Filter by chat_session ID if provided
    if (id) {
      query = query.eq('id', id);
    }

    // Filter by status if provided
    if (status) {
      // Validate status is a valid chat session status
      const validStatuses = ['active', 'paused', 'completed', 'archived'];
      if (validStatuses.includes(status)) {
        query = query.eq('status', status as 'active' | 'paused' | 'completed' | 'archived');
      }
    } else if (!id) {
      // Default to active sessions only if no status filter and no ID filter
      // (If filtering by ID, we want to return it regardless of status)
      query = query.in('status', ['active', 'paused']);
    }

    const { data: sessions, error } = await query;

    if (error) {
      console.error('[GET /api/chat-sessions] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch chat sessions', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sessions: sessions || [],
      count: sessions?.length || 0,
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
 * Deletes a chat session from the database
 *
 * Query parameters:
 * - id: Chat session ID to delete (required)
 *
 * This is useful for deleting orphaned chat sessions that don't have an associated request.
 * For chat sessions with a request_id, use DELETE /api/requests instead.
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
    const sessionId = searchParams.get('id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session ID', message: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      return NextResponse.json(
        { error: 'Invalid session ID', message: 'Session ID must be a valid UUID' },
        { status: 400 }
      );
    }

    // Get user's ISO agent ID using admin client (bypasses RLS)
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

    // Verify the chat session exists and belongs to this user
    const { data: session, error: fetchError } = await supabaseAdmin
      .from('chat_sessions')
      .select('id, iso_agent_id, request_id')
      .eq('id', sessionId)
      .single();

    if (fetchError || !session) {
      console.error('[DELETE /api/chat-sessions] Session not found:', {
        sessionId,
        error: fetchError?.message,
      });
      return NextResponse.json(
        { error: 'Session not found', message: 'The specified chat session does not exist' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (session.iso_agent_id !== agent.id) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have permission to delete this session' },
        { status: 403 }
      );
    }

    // Delete the chat session
    const { error: deleteError } = await supabaseAdmin
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId);

    if (deleteError) {
      console.error('[DELETE /api/chat-sessions] Deletion failed:', {
        sessionId,
        error: deleteError.message,
      });
      return NextResponse.json(
        { error: 'Failed to delete session', message: deleteError.message },
        { status: 500 }
      );
    }

    console.log('[DELETE /api/chat-sessions] Successfully deleted session:', { sessionId });

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
