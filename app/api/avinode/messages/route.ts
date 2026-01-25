/**
 * Avinode Messages API
 *
 * GET /api/avinode/messages
 * Fetches complete message history for a trip from Avinode API
 * Includes BOTH buyer (outbound) and seller (inbound) messages
 *
 * IMPORTANT: Only returns messages when the RFQ has quotes with 'quoted' status.
 * This prevents unnecessary API calls for RFQs that haven't received responses yet.
 *
 * Query parameters:
 * - trip_id (required): Avinode trip ID
 * - request_id (optional): Specific RFQ/request ID for filtering
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

interface AvinodeMessage {
  id?: string;
  messageId?: string;
  type?: string;
  content?: string;
  text?: string;
  message?: string;
  sender?: {
    name?: string;
    company?: string;
    companyName?: string;
    type?: string;
  };
  senderName?: string;
  senderType?: string;
  createdAt?: string;
  timestamp?: string;
  requestId?: string;
  quoteId?: string;
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
    const requestId = searchParams.get('request_id');

    if (!tripId) {
      return NextResponse.json(
        { error: 'Missing trip_id parameter' },
        { status: 400 }
      );
    }

    // Check if the RFQ has any quotes with 'quoted' status before fetching messages
    // This prevents unnecessary API calls for RFQs that haven't received responses yet
    const { data: request } = await supabaseAdmin
      .from('requests')
      .select('id, status, avinode_trip_id')
      .eq('avinode_trip_id', tripId)
      .maybeSingle();

    if (request) {
      // Check if there are any quotes with 'quoted' status for this request
      const { data: quotes, error: quotesError } = await supabaseAdmin
        .from('quotes')
        .select('id, status')
        .eq('request_id', request.id)
        .in('status', ['quoted', 'accepted', 'pending']);

      if (quotesError) {
        console.warn('[GET /api/avinode/messages] Error checking quotes:', quotesError);
      }

      // If no quotes with valid status, return empty messages
      // This avoids unnecessary Avinode API calls for RFQs without responses
      if (!quotes || quotes.length === 0) {
        console.log('[GET /api/avinode/messages] No quoted RFQs found for trip:', tripId);
        return NextResponse.json({
          tripId,
          requestId,
          messages: {},
          totalCount: 0,
          status: 'no_quotes',
          message: 'No quoted RFQs found for this trip. Messages are only available after operators have responded.',
        });
      }
    }

    // Call get_trip_messages MCP tool via the Avinode API endpoint
    // Use request origin to avoid port mismatch issues (app may run on 3000, 3001, etc.)
    const url = new URL(request.url);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : url.origin);

    const response = await fetch(`${baseUrl}/api/avinode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward auth cookies for internal API call
        'Cookie': request.headers.get('cookie') || '',
      },
      body: JSON.stringify({
        tool: 'get_trip_messages',
        params: {
          trip_id: tripId,
          request_id: requestId,
          limit: 100,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GET /api/avinode/messages] MCP tool error:', { status: response.status, error: errorText });
      return NextResponse.json(
        { error: 'Failed to fetch messages from Avinode', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const messages: AvinodeMessage[] = data.messages || [];

    // Group messages by quote/request ID and transform to UI format
    const messagesByQuoteId: Record<string, OperatorMessage[]> = {};

    for (const msg of messages) {
      // Determine quote/request ID
      const quoteId = msg.quoteId || msg.requestId || requestId || 'general';

      if (!messagesByQuoteId[quoteId]) {
        messagesByQuoteId[quoteId] = [];
      }

      // Determine message type based on sender
      const senderType = msg.senderType || msg.sender?.type || '';
      const isBuyer = senderType.toLowerCase().includes('buyer') ||
                      senderType.toLowerCase().includes('mine') ||
                      senderType.toLowerCase() === 'internal';

      const messageType: 'REQUEST' | 'RESPONSE' = isBuyer ? 'REQUEST' : 'RESPONSE';

      // Get message content
      const content = msg.content || msg.text || msg.message || '';

      // Get sender name
      const senderName = msg.senderName ||
                        msg.sender?.name ||
                        msg.sender?.companyName ||
                        msg.sender?.company ||
                        (isBuyer ? 'You' : 'Operator');

      const operatorMessage: OperatorMessage = {
        id: msg.id || msg.messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: messageType,
        content,
        timestamp: msg.createdAt || msg.timestamp || new Date().toISOString(),
        sender: senderName,
      };

      messagesByQuoteId[quoteId].push(operatorMessage);
    }

    // Sort messages by timestamp within each group
    for (const quoteId of Object.keys(messagesByQuoteId)) {
      messagesByQuoteId[quoteId].sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    }

    return NextResponse.json({
      tripId,
      requestId,
      messages: messagesByQuoteId,
      totalCount: messages.length,
    });
  } catch (error) {
    console.error('[GET /api/avinode/messages] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
