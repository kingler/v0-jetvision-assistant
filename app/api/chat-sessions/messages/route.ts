/**
 * Chat Session Messages API
 *
 * GET /api/chat-sessions/messages
 * Loads messages for a specific chat session
 *
 * Query parameters:
 * - session_id (required): Chat session ID
 * - limit (optional): Maximum number of messages (default: 100)
 *
 * Returns messages array formatted for UI consumption
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

    // Fetch the chat session to get conversation_id
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('chat_sessions')
      .select(`
        id,
        conversation_id,
        request_id,
        iso_agent_id,
        avinode_trip_id,
        conversation:conversations(
          id,
          request_id
        )
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error('[GET /api/chat-sessions/messages] Session not found:', {
        sessionId,
        error: sessionError?.message,
      });
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (session.iso_agent_id !== agent.id) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have permission to access this session' },
        { status: 403 }
      );
    }

    // Load messages if conversation_id exists
    let messages: Array<{
      id: string;
      type: 'user' | 'agent';
      content: string;
      timestamp: string;
      senderName?: string | null;
      contentType?: string;
      richContent?: Record<string, unknown> | null;
      metadata?: Record<string, unknown> | null;
    }> = [];

    console.log('[GET /api/chat-sessions/messages] Loading messages:', {
      sessionId,
      conversationId: session.conversation_id,
      hasConversationId: !!session.conversation_id,
    });

    if (session.conversation_id) {
      try {
        const dbMessages = await loadMessages(session.conversation_id, limit);

        console.log('[GET /api/chat-sessions/messages] DB messages loaded:', {
          conversationId: session.conversation_id,
          count: dbMessages.length,
          firstMessage: dbMessages[0] || null,
        });

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
        }));
      } catch (loadError) {
        console.error('[GET /api/chat-sessions/messages] Error loading messages:', loadError);
        // Return empty messages array rather than failing
      }
    } else {
      console.log('[GET /api/chat-sessions/messages] No conversation_id - skipping message load');
    }

    // Return response with session info and messages
    return NextResponse.json({
      session: {
        id: session.id,
        conversationId: session.conversation_id,
        requestId: session.request_id,
        tripId: session.avinode_trip_id,
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
