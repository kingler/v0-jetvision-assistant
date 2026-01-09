/**
 * Avinode Operator Messages API
 *
 * GET /api/avinode/messages
 * Loads operator messages for a specific trip from avinode_webhook_events
 *
 * Query parameters:
 * - trip_id (required): Avinode trip ID
 *
 * Returns messages grouped by quote/request ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface OperatorMessage {
  id: string;
  type: 'REQUEST' | 'RESPONSE' | 'INFO' | 'CONFIRMATION';
  content: string;
  timestamp: string;
  sender?: string;
}

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

    if (!tripId) {
      return NextResponse.json(
        { error: 'Missing trip_id parameter' },
        { status: 400 }
      );
    }

    // Fetch operator messages from avinode_webhook_events
    const { data: events, error } = await supabaseAdmin
      .from('avinode_webhook_events')
      .select('id, event_type, raw_payload, received_at')
      .eq('avinode_trip_id', tripId)
      .in('event_type', ['operator_message', 'internal_message'])
      .order('received_at', { ascending: true });

    if (error) {
      console.error('[GET /api/avinode/messages] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    // Group messages by quote/request ID
    const messagesByQuoteId: Record<string, OperatorMessage[]> = {};

    for (const event of events || []) {
      const payload = event.raw_payload as {
        type?: string;
        quoteId?: string;
        requestId?: string;
        messageId?: string;
        content?: string;
        senderName?: string;
        senderCompany?: string;
        timestamp?: string;
      };

      // Use quoteId or requestId as the key
      const quoteId = payload.quoteId || payload.requestId || 'unknown';

      if (!messagesByQuoteId[quoteId]) {
        messagesByQuoteId[quoteId] = [];
      }

      const message: OperatorMessage = {
        id: payload.messageId || event.id,
        type: event.event_type === 'operator_message' ? 'RESPONSE' : 'REQUEST',
        content: payload.content || '',
        timestamp: payload.timestamp || event.received_at,
        sender: payload.senderName || payload.senderCompany || 'Operator',
      };

      messagesByQuoteId[quoteId].push(message);
    }

    return NextResponse.json({
      tripId,
      messages: messagesByQuoteId,
      count: events?.length || 0,
    });
  } catch (error) {
    console.error('[GET /api/avinode/messages] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
