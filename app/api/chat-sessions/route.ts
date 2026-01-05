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

    // Filter by status if provided
    if (status) {
      // Validate status is a valid chat session status
      const validStatuses = ['active', 'paused', 'completed', 'archived'];
      if (validStatuses.includes(status)) {
        query = query.eq('status', status as 'active' | 'paused' | 'completed' | 'archived');
      }
    } else {
      // Default to active sessions only if no status filter
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
