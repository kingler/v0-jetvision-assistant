/**
 * Test API Endpoint: Check TripIDs with RFQs and Operator Messages
 * 
 * GET /api/test/trip-rfqs
 * 
 * Returns a summary of which TripIDs have RFQs and operator messages
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('[GET /api/test/trip-rfqs] Starting test...')

    // Step 1: Get all requests with trip IDs
    const { data: requests, error: requestsError } = await supabaseAdmin
      .from('requests')
      .select('id, avinode_trip_id, departure_airport, arrival_airport, status, created_at')
      .not('avinode_trip_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50)

    if (requestsError) {
      console.error('[GET /api/test/trip-rfqs] Error fetching requests:', requestsError)
      return NextResponse.json(
        { error: 'Failed to fetch requests', message: requestsError.message },
        { status: 500 }
      )
    }

    console.log(`[GET /api/test/trip-rfqs] Found ${requests?.length || 0} requests with trip IDs`)

    if (!requests || requests.length === 0) {
      return NextResponse.json({
        summary: {
          totalTrips: 0,
          tripsWithRFQs: 0,
          tripsWithQuotes: 0,
          tripsWithMessages: 0,
        },
        trips: [],
        message: 'No requests with trip IDs found in database',
      })
    }

    // Step 2: For each request, get RFQs, quotes, and messages
    const tripStatuses = await Promise.all(
      (requests || []).map(async (request) => {
        const tripId = request.avinode_trip_id as string
        const route = `${request.departure_airport} → ${request.arrival_airport}`

        // Get quotes for this request
        const { data: quotes, error: quotesError } = await supabaseAdmin
          .from('quotes')
          .select('id, operator_name, total_price, status, message_content, avinode_quote_id, created_at')
          .eq('request_id', request.id)
          .order('created_at', { ascending: false })

        if (quotesError) {
          console.error(`[GET /api/test/trip-rfqs] Error fetching quotes for trip ${tripId}:`, quotesError.message)
        }

        // Get operator messages for this request
        const { data: messages, error: messagesError } = await supabaseAdmin
          .from('messages')
          .select('id, sender_type, content, created_at, quote_id')
          .eq('request_id', request.id)
          .eq('sender_type', 'operator')
          .order('created_at', { ascending: false })

        if (messagesError) {
          console.error(`[GET /api/test/trip-rfqs] Error fetching messages for trip ${tripId}:`, messagesError.message)
        }

        // Get webhook events for this trip
        const { data: webhookEvents, error: webhookError } = await supabaseAdmin
          .from('avinode_webhook_events')
          .select('event_type, received_at, quote_id')
          .eq('avinode_trip_id', tripId)
          .order('received_at', { ascending: false })

        if (webhookError) {
          console.error(`[GET /api/test/trip-rfqs] Error fetching webhook events for trip ${tripId}:`, webhookError.message)
        }

        // Count RFQs (webhook events of type TripRequestSellerResponse)
        const rfqEvents = webhookEvents?.filter(e => e.event_type === 'TripRequestSellerResponse') || []
        const operatorMessageEvents = webhookEvents?.filter(e => 
          e.event_type === 'TripChatSeller' || e.event_type === 'TripChatMine'
        ) || []

        // Build quote details
        const quoteDetails = (quotes || []).map(quote => ({
          id: quote.id,
          operatorName: quote.operator_name || 'Unknown',
          totalPrice: quote.total_price || 0,
          status: quote.status || 'unknown',
          hasMessage: !!quote.message_content,
          avinodeQuoteId: quote.avinode_quote_id,
          createdAt: quote.created_at,
        }))

        // Build message details
        const messageDetails = (messages || []).map(msg => ({
          id: msg.id,
          senderType: msg.sender_type,
          content: (msg.content || '').substring(0, 200),
          createdAt: msg.created_at,
          quoteId: msg.quote_id,
        }))

        // Build webhook event summary
        const eventTypeCounts = (webhookEvents || []).reduce((acc, evt) => {
          acc[evt.event_type] = (acc[evt.event_type] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        return {
          tripId,
          requestId: request.id,
          route,
          status: request.status || 'unknown',
          rfqCount: rfqEvents.length,
          quoteCount: quotes?.length || 0,
          operatorMessageCount: messages?.length || 0,
          webhookEventCount: webhookEvents?.length || 0,
          quotes: quoteDetails,
          messages: messageDetails,
          webhookEventTypes: eventTypeCounts,
          createdAt: request.created_at,
        }
      })
    )

    // Calculate summary statistics
    const tripsWithRFQs = tripStatuses.filter(t => t.rfqCount > 0).length
    const tripsWithQuotes = tripStatuses.filter(t => t.quoteCount > 0).length
    const tripsWithMessages = tripStatuses.filter(t => t.operatorMessageCount > 0).length

    // Identify issues
    const tripsWithRFQsButNoQuotes = tripStatuses.filter(
      t => t.rfqCount > 0 && t.quoteCount === 0
    ).map(t => ({
      tripId: t.tripId,
      route: t.route,
      rfqCount: t.rfqCount,
      quoteCount: t.quoteCount,
    }))

    const tripsWithQuotesButNoMessages = tripStatuses.filter(
      t => t.quoteCount > 0 && t.operatorMessageCount === 0
    ).map(t => ({
      tripId: t.tripId,
      route: t.route,
      quoteCount: t.quoteCount,
      messageCount: t.operatorMessageCount,
    }))

    console.log(`[GET /api/test/trip-rfqs] Test completed successfully`)

    return NextResponse.json({
      summary: {
        totalTrips: tripStatuses.length,
        tripsWithRFQs,
        tripsWithQuotes,
        tripsWithMessages,
      },
      issues: {
        tripsWithRFQsButNoQuotes,
        tripsWithQuotesButNoMessages,
      },
      trips: tripStatuses,
    }, { status: 200 })

  } catch (error) {
    console.error('[GET /api/test/trip-rfqs] Unexpected error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    )
  }
}
