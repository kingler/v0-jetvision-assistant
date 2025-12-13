import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import type {
  AvinodeWebhookPayload,
  TripRequestSellerResponseData,
  TripChatData,
} from '@/lib/types/avinode-webhooks';

/**
 * Unified Webhook Handler
 *
 * Handles webhooks at /api/webhooks (required by Avinode URL restrictions)
 * Internally routes to appropriate handlers based on payload
 *
 * Avinode Events Handled:
 * - TripRequestSellerResponse: Operator quote received
 * - TripChatSeller: Operator message received
 * - TripChatMine: Internal company message
 * - Quotes: Quote status changes
 * - QuotedTrips: Trip status changes
 */

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Environment variables
const WEBHOOK_SECRET = process.env.AVINODE_WEBHOOK_SECRET;

/**
 * Verify Avinode webhook signature
 * Avinode uses HMAC-SHA256 for webhook verification
 */
function verifyAvinodeSignature(payload: string, signature: string | null): boolean {
  if (!WEBHOOK_SECRET || !signature) {
    console.warn('[Webhook] No webhook secret configured or signature missing');
    // In development, allow unverified webhooks with warning
    return process.env.NODE_ENV === 'development';
  }

  try {
    const expectedSignature = createHmac('sha256', WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return sigBuffer.every((byte, i) => byte === expectedBuffer[i]);
  } catch (error) {
    console.error('[Webhook] Signature verification error:', error);
    return false;
  }
}

/**
 * Handle TripRequestSellerResponse - Operator Quote
 */
async function handleSellerResponse(data: TripRequestSellerResponseData): Promise<void> {
  const { trip, request, seller, quote, declineReason } = data;

  console.log('[Webhook] Seller Response:', {
    tripId: trip.id,
    requestId: request.id,
    status: request.status,
    seller: seller.name,
  });

  if (request.status === 'quoted' && quote) {
    console.log('[Webhook] Quote received:', {
      quoteId: quote.id,
      price: `${quote.totalPrice.currency} ${quote.totalPrice.amount}`,
      validUntil: quote.validUntil,
      aircraft: quote.aircraft?.model,
    });

    // TODO: Store quote in database
    // TODO: Notify ProposalAnalysisAgent to score this quote
    // TODO: Update workflow state machine

  } else if (request.status === 'declined') {
    console.log('[Webhook] Quote declined:', {
      seller: seller.name,
      reason: declineReason,
    });

    // TODO: Store decline in database
    // TODO: Notify if all operators declined
  }
}

/**
 * Handle TripChatSeller/TripChatMine - Messages
 */
async function handleChatMessage(data: TripChatData): Promise<void> {
  const { trip, message, sender, request } = data;

  console.log('[Webhook] Chat Message:', {
    tripId: trip.id,
    type: data.type,
    sender: sender.name,
    company: sender.companyName,
    requestId: request?.id,
  });

  // Log first 200 chars of message content
  console.log('[Webhook] Message preview:', message.content.substring(0, 200));

  // TODO: Store message in database
  // TODO: If from operator, notify CommunicationAgent
  // TODO: If contains important info (pricing, schedule), extract and process
}

/**
 * POST /api/webhooks
 *
 * Receives and processes webhook events (primarily Avinode)
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Get raw body for signature verification
    const rawBody = await req.text();
    let payload: AvinodeWebhookPayload;

    try {
      payload = JSON.parse(rawBody);
    } catch {
      console.error('[Webhook] Invalid JSON payload');
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Check if this is an Avinode webhook (has event field)
    if (payload.event) {
      // Verify Avinode webhook signature
      const signature = req.headers.get('x-avinode-signature') ||
                        req.headers.get('x-webhook-signature');

      if (!verifyAvinodeSignature(rawBody, signature)) {
        console.error('[Webhook] Invalid Avinode signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }

      // Log event receipt
      console.log('[Webhook] Avinode Event received:', {
        event: payload.event,
        eventId: payload.eventId,
        timestamp: payload.timestamp,
      });

      // Process based on event type
      switch (payload.event) {
        case 'TripRequestSellerResponse':
          await handleSellerResponse(payload.data as TripRequestSellerResponseData);
          break;

        case 'TripChatSeller':
        case 'TripChatMine':
          await handleChatMessage(payload.data as TripChatData);
          break;

        case 'TripRequestMine':
        case 'TripRequestBuyer':
          console.log('[Webhook] Trip request update:', payload.data);
          break;

        case 'Quotes':
        case 'QuotedTrips':
          console.log('[Webhook] Quote/Trip update:', payload.event, payload.data);
          break;

        case 'EmptyLegCreatedMine':
        case 'EmptyLegUpdatedMine':
        case 'EmptyLegDeletedMine':
          console.log('[Webhook] Empty leg event:', payload.data);
          break;

        default:
          console.log('[Webhook] Unhandled event type:', payload.event);
      }

      const duration = Date.now() - startTime;
      console.log(`[Webhook] Processed in ${duration}ms`);

      // Return 200 OK to acknowledge receipt
      return NextResponse.json({
        success: true,
        source: 'avinode',
        eventId: payload.eventId,
        processedIn: `${duration}ms`,
      });
    }

    // Unknown webhook type
    console.log('[Webhook] Unknown webhook format:', Object.keys(payload));
    return NextResponse.json({
      success: true,
      message: 'Received but unrecognized format',
    });

  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks
 *
 * Health check endpoint for webhook verification
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'healthy',
    endpoint: '/api/webhooks',
    timestamp: new Date().toISOString(),
    supported: ['avinode'],
    events: [
      'TripRequestSellerResponse',
      'TripChatSeller',
      'TripChatMine',
      'Quotes',
      'QuotedTrips',
    ],
  });
}
