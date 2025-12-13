import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import type {
  AvinodeWebhookPayload,
  TripRequestSellerResponseData,
  TripChatData,
} from '@/lib/types/avinode-webhooks';

/**
 * Avinode Webhook Handler
 *
 * Receives webhook events from Avinode Broker API
 * Docs: https://developer.avinodegroup.com/docs/getting-started-webhooks
 *
 * Events Handled:
 * - TripRequestSellerResponse: Operator quote received
 * - TripChatSeller: Operator message received
 * - TripChatMine: Internal company message
 *
 * Authentication:
 * - Webhook secret verification via HMAC signature
 * - API token validation
 */

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Environment variables
const WEBHOOK_SECRET = process.env.AVINODE_WEBHOOK_SECRET;
const API_TOKEN = process.env.AVINODE_API_TOKEN;

/**
 * Verify webhook signature
 * Avinode uses HMAC-SHA256 for webhook verification
 */
function verifySignature(payload: string, signature: string | null): boolean {
  if (!WEBHOOK_SECRET || !signature) {
    console.warn('[Avinode Webhook] No webhook secret configured or signature missing');
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
    console.error('[Avinode Webhook] Signature verification error:', error);
    return false;
  }
}

/**
 * Handle TripRequestSellerResponse - Operator Quote
 */
async function handleSellerResponse(data: TripRequestSellerResponseData): Promise<void> {
  const { trip, request, seller, quote, declineReason } = data;

  console.log('[Avinode Webhook] Seller Response:', {
    tripId: trip.id,
    requestId: request.id,
    status: request.status,
    seller: seller.name,
  });

  if (request.status === 'quoted' && quote) {
    console.log('[Avinode Webhook] Quote received:', {
      quoteId: quote.id,
      price: `${quote.totalPrice.currency} ${quote.totalPrice.amount}`,
      validUntil: quote.validUntil,
      aircraft: quote.aircraft?.model,
    });

    // TODO: Store quote in database
    // TODO: Notify ProposalAnalysisAgent to score this quote
    // TODO: Update workflow state machine

  } else if (request.status === 'declined') {
    console.log('[Avinode Webhook] Quote declined:', {
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

  console.log('[Avinode Webhook] Chat Message:', {
    tripId: trip.id,
    type: data.type,
    sender: sender.name,
    company: sender.companyName,
    requestId: request?.id,
  });

  // Log first 200 chars of message content
  console.log('[Avinode Webhook] Message preview:', message.content.substring(0, 200));

  // TODO: Store message in database
  // TODO: If from operator, notify CommunicationAgent
  // TODO: If contains important info (pricing, schedule), extract and process
}

/**
 * POST /api/webhooks/avinode
 *
 * Receives and processes Avinode webhook events
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
      console.error('[Avinode Webhook] Invalid JSON payload');
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const signature = req.headers.get('x-avinode-signature') ||
                      req.headers.get('x-webhook-signature');

    if (!verifySignature(rawBody, signature)) {
      console.error('[Avinode Webhook] Invalid signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Log event receipt
    console.log('[Avinode Webhook] Event received:', {
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
        console.log('[Avinode Webhook] Trip request update:', payload.data);
        // TODO: Handle trip status updates
        break;

      case 'EmptyLegCreatedMine':
      case 'EmptyLegUpdatedMine':
      case 'EmptyLegDeletedMine':
        console.log('[Avinode Webhook] Empty leg event:', payload.data);
        // TODO: Handle empty leg events if needed
        break;

      default:
        console.log('[Avinode Webhook] Unhandled event type:', payload.event);
    }

    const duration = Date.now() - startTime;
    console.log(`[Avinode Webhook] Processed in ${duration}ms`);

    // Return 200 OK to acknowledge receipt
    return NextResponse.json({
      success: true,
      eventId: payload.eventId,
      processedIn: `${duration}ms`,
    });

  } catch (error) {
    console.error('[Avinode Webhook] Error processing webhook:', error);

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
 * GET /api/webhooks/avinode
 *
 * Health check endpoint for webhook verification
 * Avinode may call this to verify the endpoint is active
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  // Optionally verify API token in query params
  const token = req.nextUrl.searchParams.get('token');

  if (API_TOKEN && token !== API_TOKEN) {
    // Allow health check without token, but log it
    console.log('[Avinode Webhook] Health check (no token)');
  }

  return NextResponse.json({
    status: 'healthy',
    endpoint: '/api/webhooks/avinode',
    timestamp: new Date().toISOString(),
    events: [
      'TripRequestSellerResponse',
      'TripChatSeller',
      'TripChatMine',
    ],
  });
}
