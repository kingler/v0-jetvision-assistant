/**
 * Chat Session Messages API (Consolidated Schema)
 *
 * GET /api/chat-sessions/messages
 * Loads messages for a specific chat session (request)
 *
 * Query parameters:
 * - session_id (required): Request ID (session ID in consolidated schema)
 * - limit (optional): Maximum number of messages (default: 100)
 * - quote_id (optional): Filter messages by operator quote thread
 *
 * Returns messages array formatted for UI consumption
 *
 * NOTE: After schema consolidation (migration 030-033), chat sessions are
 * stored directly in the `requests` table. The session_id parameter now
 * refers to a request ID.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { loadMessages } from '@/lib/conversation/message-persistence';

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
    const sessionId = searchParams.get('session_id');
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const quoteId = searchParams.get('quote_id') || undefined;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session_id parameter' },
        { status: 400 }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      return NextResponse.json(
        { error: 'Invalid session_id format' },
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

    // Fetch the request (session in consolidated schema)
    // In the consolidated schema, session_id IS the request_id
    const { data: requestData, error: requestError } = await supabaseAdmin
      .from('requests')
      .select(`
        id,
        iso_agent_id,
        avinode_trip_id,
        avinode_rfq_id,
        avinode_deep_link,
        session_status,
        conversation_type,
        subject,
        message_count,
        departure_airport,
        arrival_airport,
        departure_date,
        passengers,
        status,
        created_at,
        updated_at
      `)
      .eq('id', sessionId)
      .single();

    if (requestError || !requestData) {
      console.error('[GET /api/chat-sessions/messages] Request not found:', {
        sessionId,
        error: requestError?.message,
      });
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (requestData.iso_agent_id !== agent.id) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have permission to access this session' },
        { status: 403 }
      );
    }

    // Load messages for this request
    // In consolidated schema, messages link directly to request_id
    let messages: Array<{
      id: string;
      type: 'user' | 'agent';
      content: string;
      timestamp: string;
      senderName?: string | null;
      contentType?: string;
      richContent?: Record<string, unknown> | null;
      metadata?: Record<string, unknown> | null;
      quoteId?: string | null;
    }> = [];

    try {
      const dbMessages = await loadMessages(sessionId, { quoteId, limit });

      // Transform to UI format
      messages = dbMessages.map((msg) => ({
        id: msg.id,
        type: (msg.senderType === 'iso_agent' ? 'user' : 'agent') as 'user' | 'agent',
        content: msg.content,
        timestamp: msg.createdAt,
        senderName: msg.senderName,
        contentType: msg.contentType,
        richContent: msg.richContent,
        metadata: msg.metadata,
        quoteId: msg.quoteId,
      }));
    } catch (loadError) {
      console.error('[GET /api/chat-sessions/messages] Error loading messages:', loadError);
      // Return empty messages array rather than failing
    }

    // Return response with session info and messages
    return NextResponse.json({
      session: {
        id: requestData.id,
        requestId: requestData.id, // Same as id in consolidated schema
        tripId: requestData.avinode_trip_id,
        rfqId: requestData.avinode_rfq_id,
        deepLink: requestData.avinode_deep_link,
        status: requestData.session_status,
        conversationType: requestData.conversation_type,
        subject: requestData.subject,
        route: requestData.departure_airport && requestData.arrival_airport
          ? `${requestData.departure_airport} → ${requestData.arrival_airport}`
          : null,
        departureDate: requestData.departure_date,
        passengers: requestData.passengers,
        requestStatus: requestData.status,
      },
      messages,
      count: messages.length,
    });
  } catch (error) {
    console.error('[GET /api/chat-sessions/messages] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
