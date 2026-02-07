import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import type {
  AvinodeWebhookPayload,
  TripRequestSellerResponseData,
  TripChatData,
} from '@/lib/types/avinode-webhooks';
import { supabaseAdmin, findRequestByTripId } from '@/lib/supabase';
import type { Json } from '@/lib/types/database';
import { storeOperatorQuote, fetchMessageDetails } from './webhook-utils';

/**
 * Avinode Webhook Handler
 *
 * Receives webhook events from Avinode Broker API
 * Docs: https://developer.avinodegroup.com/docs/avinode-webhooks
 *
 * Events Handled:
 * - TripRequestSellerResponse: Operator quote received
 * - TripChatSeller: Operator message received
 * - TripChatMine: Internal company message
 *
 * Note: Per Avinode docs, webhooks do NOT use signature verification.
 * The endpoint must respond with HTTP 200 to acknowledge receipt.
 * Payloads contain: { id, href, type } - use href to fetch full data.
 */

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Environment variables
const WEBHOOK_SECRET = process.env.AVINODE_WEBHOOK_SECRET;
const API_TOKEN = process.env.AVINODE_API_TOKEN;

/**
 * Map Avinode webhook type to our event_type enum
 * Avinode types: rfqs, tripmsgs, emptylegs, leads
 */
function mapTypeToEventType(type: string): 'quote_received' | 'quote_rejected' | 'message_received' | 'trip_created' | 'trip_updated' {
  switch (type?.toLowerCase()) {
    case 'rfqs':
      return 'quote_received';
    case 'tripmsgs':
      return 'message_received';
    case 'trips':
      return 'trip_updated';
    default:
      return 'trip_updated';
  }
}

/**
 * Extract trip ID from Avinode href URL
 * Example: https://sandbox.avinode.com/api/rfqs/arfq-12345678 -> arfq-12345678
 * Example: https://sandbox.avinode.com/api/trips/atrip-65340586 -> atrip-65340586
 */
function extractTripIdFromHref(href: string): string | null {
  if (!href) return null;
  try {
    const url = new URL(href);
    const pathParts = url.pathname.split('/').filter(Boolean);
    // Get the last part of the path (the ID)
    const id = pathParts[pathParts.length - 1];
    return id || null;
  } catch {
    // If URL parsing fails, try regex
    const match = href.match(/\/(atrip-\d+|arfq-\d+|[A-Z0-9]+)(?:\?|$)/);
    return match ? match[1] : null;
  }
}

/**
 * Verify webhook request
 *
 * Per Avinode documentation (https://developer.avinodegroup.com/docs/avinode-webhooks),
 * webhooks do NOT use signature verification. We validate by:
 * 1. Checking the payload structure (must have id, href, type or event field)
 * 2. Optionally verifying the href domain is from avinode.com
 *
 * If AVINODE_WEBHOOK_SECRET is configured, we can add optional HMAC verification
 * for additional security (custom implementation, not Avinode standard).
 */
function verifyWebhook(payload: string, signature: string | null): boolean {
  try {
    const data = JSON.parse(payload);

    // Avinode webhooks have either:
    // - Simple format: { id, href, type }
    // - Extended format: { event, eventId, timestamp, data }
    const hasSimpleFormat = data.id && data.href && data.type;
    const hasExtendedFormat = data.event && data.data;

    if (!hasSimpleFormat && !hasExtendedFormat) {
      console.warn('[Avinode Webhook] Invalid payload structure - missing required fields');
      return false;
    }

    // Optional: Verify href domain if present
    if (data.href) {
      try {
        const url = new URL(data.href);
        if (!url.hostname.includes('avinode.com')) {
          console.warn('[Avinode Webhook] Suspicious href domain:', url.hostname);
          // Still allow for sandbox/testing, but log warning
        }
      } catch {
        // Invalid URL, but don't reject - might be a different payload format
      }
    }

    // Optional HMAC verification if secret is configured (custom security layer)
    if (WEBHOOK_SECRET && signature) {
      const expectedSignature = createHmac('sha256', WEBHOOK_SECRET)
        .update(payload)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.warn('[Avinode Webhook] Signature mismatch (optional verification)');
        // Don't reject - Avinode doesn't require signatures per their docs
      }
    }

    return true;
  } catch (error) {
    console.error('[Avinode Webhook] Payload validation error:', error);
    return false;
  }
}

/**
 * Handle TripRequestSellerResponse - Operator Quote
 * 
 * Stores quote in database and updates RFQ status when operators respond
 */
async function handleSellerResponse(
  data: TripRequestSellerResponseData,
  payload: AvinodeWebhookPayload
): Promise<void> {
  const { trip, request, seller, quote, declineReason } = data;

  console.log('[Avinode Webhook] Seller Response:', {
    tripId: trip.id,
    requestId: request.id,
    status: request.status,
    seller: seller.name,
  });

  try {
    // Store webhook event in database for audit trail
    // Map webhook event name to our enum value
    const eventType = request.status === 'quoted' ? 'quote_received' : 'quote_rejected';
    const { error: webhookError } = await supabaseAdmin
      .from('avinode_webhook_events')
      .insert({
        event_type: eventType,
        avinode_event_id: `trip_${trip.id}_req_${request.id}_${Date.now()}`,
        avinode_trip_id: trip.id,
        raw_payload: payload as any,
        processing_status: 'pending',
        received_at: new Date().toISOString(),
      });

    if (webhookError) {
      console.error('[Avinode Webhook] Error storing webhook event:', webhookError);
    }

    // Find the request by trip ID
    // Note: We need to find all requests with this trip ID since we don't have user context in webhook
    const { data: requests, error: requestError } = await supabaseAdmin
      .from('requests')
      .select('id, iso_agent_id')
      .eq('avinode_trip_id', trip.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (requestError || !requests || requests.length === 0) {
      console.warn('[Avinode Webhook] No request found for trip ID:', trip.id);
      // Still mark webhook as processed even if we can't find the request
      const eventType = request.status === 'quoted' ? 'quote_received' : 'quote_rejected';
      await supabaseAdmin
        .from('avinode_webhook_events')
        .update({ processing_status: 'skipped', processed_at: new Date().toISOString() })
        .eq('avinode_trip_id', trip.id)
        .eq('event_type', eventType)
        .order('received_at', { ascending: false })
        .limit(1);
      return;
    }

    const requestRecord = requests[0];

    if (request.status === 'quoted' && quote) {
      console.log('[Avinode Webhook] Quote received:', {
        quoteId: quote.id,
        price: `${quote.totalPrice.currency} ${quote.totalPrice.amount}`,
        validUntil: quote.validUntil,
        aircraft: quote.aircraft?.model,
      });

      try {
        // ONEK-175 FIX: Fetch full quote details from Avinode API using quote.href
        // The webhook payload contains basic price info but the href endpoint has
        // the authoritative sellerPrice (including operator price updates)
        let messageDetails = null;
        if (quote.href) {
          try {
            messageDetails = await fetchMessageDetails(quote.href, {
              maxRetries: 2,
              initialDelayMs: 500,
            });
            console.log('[Avinode Webhook] Fetched quote details from href:', {
              quoteId: quote.id,
              hasSellerPrice: !!(messageDetails as any)?.sellerPrice,
              sellerPrice: (messageDetails as any)?.sellerPrice?.price,
            });
          } catch (fetchError) {
            console.warn('[Avinode Webhook] Failed to fetch quote details from href, using webhook data:', fetchError);
          }
        }

        // Store quote in database with fetched details (or null if fetch failed)
        const quoteId = await storeOperatorQuote({
          webhookPayload: payload,
          messageDetails,
          requestId: requestRecord.id,
        });

        console.log('[Avinode Webhook] Quote stored successfully:', quoteId);

        // Mark webhook as processed
        await supabaseAdmin
          .from('avinode_webhook_events')
          .update({ processing_status: 'completed', processed_at: new Date().toISOString() })
          .eq('avinode_trip_id', trip.id)
          .eq('event_type', 'quote_received')
          .order('received_at', { ascending: false })
          .limit(1);

        // TODO: Notify ProposalAnalysisAgent to score this quote
        // TODO: Update workflow state machine

      } catch (error) {
        console.error('[Avinode Webhook] Error storing quote:', error);
        throw error;
      }

    } else if (request.status === 'declined') {
      console.log('[Avinode Webhook] Quote declined:', {
        seller: seller.name,
        reason: declineReason,
      });

      try {
        // Store declined quote in database
        const quoteId = await storeOperatorQuote({
          webhookPayload: payload,
          messageDetails: null,
          requestId: requestRecord.id,
        });

        console.log('[Avinode Webhook] Decline stored successfully:', quoteId);

        // Mark webhook as processed
        await supabaseAdmin
          .from('avinode_webhook_events')
          .update({ processing_status: 'completed', processed_at: new Date().toISOString() })
          .eq('avinode_trip_id', trip.id)
          .eq('event_type', 'quote_rejected')
          .order('received_at', { ascending: false })
          .limit(1);

        // TODO: Notify if all operators declined

      } catch (error) {
        console.error('[Avinode Webhook] Error storing decline:', error);
        throw error;
      }
    }
  } catch (error) {
    console.error('[Avinode Webhook] Error processing seller response:', error);
    // Don't throw - we've already acknowledged the webhook
  }
}

/**
 * Find or create an operator profile from Avinode sender data
 */
async function findOrCreateOperatorProfile(
  senderId: string,
  senderName: string,
  companyName: string
): Promise<string | null> {
  if (!senderId) return null;

  try {
    // Check if operator profile exists
    const { data: existing } = await supabaseAdmin
      .from('operator_profiles')
      .select('id')
      .eq('avinode_operator_id', senderId)
      .single();

    if (existing) return existing.id;

    // Create new operator profile
    const { data: newProfile, error } = await supabaseAdmin
      .from('operator_profiles')
      .insert({
        avinode_operator_id: senderId,
        avinode_company_id: senderId,
        company_name: companyName || senderName || 'Unknown Operator',
        contact_name: senderName,
        is_active: true,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Avinode Webhook] Error creating operator profile:', error);
      return null;
    }

    console.log('[Avinode Webhook] Created operator profile:', companyName);
    return newProfile.id;
  } catch (error) {
    console.error('[Avinode Webhook] Error in findOrCreateOperatorProfile:', error);
    return null;
  }
}

/**
 * Handle TripChatSeller/TripChatMine - Messages
 *
 * Stores messages in both:
 * 1. avinode_webhook_events (audit log)
 * 2. messages table (for chat UI display)
 */
async function handleChatMessage(data: TripChatData): Promise<void> {
  const { trip, message, sender, request } = data;
  const isOperatorMessage = data.type === 'TripChatSeller';

  console.log('[Avinode Webhook] Chat Message:', {
    tripId: trip.id,
    type: data.type,
    isOperatorMessage,
    sender: sender.name,
    company: sender.companyName,
    requestId: request?.id,
  });

  // Log first 200 chars of message content
  console.log('[Avinode Webhook] Message preview:', message.content.substring(0, 200));

  try {
    // 1. Store in avinode_webhook_events (audit log)
    const eventType = 'message_received' as const;
    const { error: webhookError } = await supabaseAdmin
      .from('avinode_webhook_events')
      .insert({
        event_type: eventType,
        avinode_event_id: `chat_${trip.id}_${message.id || Date.now()}`,
        avinode_trip_id: trip.id,
        raw_payload: {
          type: data.type,
          tripId: trip.id,
          requestId: request?.id,
          quoteId: request?.id,
          messageId: message.id,
          content: message.content,
          senderName: sender.name,
          senderCompany: sender.companyName,
          senderId: sender.id,
          timestamp: message.sentAt || new Date().toISOString(),
        } as Json,
        processing_status: 'pending',
        received_at: new Date().toISOString(),
      });

    if (webhookError) {
      console.error('[Avinode Webhook] Error storing webhook event:', webhookError);
    }

    // 2. Find the request by trip ID
    const { data: requestRecord, error: requestError } = await supabaseAdmin
      .from('requests')
      .select('id')
      .eq('avinode_trip_id', trip.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (requestError || !requestRecord) {
      console.warn('[Avinode Webhook] No request found for trip ID:', trip.id);
      // Update webhook event status
      await supabaseAdmin
        .from('avinode_webhook_events')
        .update({ processing_status: 'skipped', processed_at: new Date().toISOString() })
        .eq('avinode_event_id', `chat_${trip.id}_${message.id || Date.now()}`);
      return;
    }

    // 3. Check if message already exists (prevent duplicates)
    const avinodeMessageId = message.id || `${trip.id}_${message.sentAt || Date.now()}`;
    const { data: existingMessage } = await supabaseAdmin
      .from('messages')
      .select('id')
      .eq('request_id', requestRecord.id)
      .contains('metadata', { avinode_message_id: avinodeMessageId });

    if (existingMessage && existingMessage.length > 0) {
      console.log('[Avinode Webhook] Message already exists, skipping:', avinodeMessageId);
      await supabaseAdmin
        .from('avinode_webhook_events')
        .update({ processing_status: 'skipped', processed_at: new Date().toISOString() })
        .eq('avinode_event_id', `chat_${trip.id}_${message.id || Date.now()}`);
      return;
    }

    // 4. Find or create operator profile (for operator messages)
    let operatorProfileId: string | null = null;
    if (isOperatorMessage && sender.id) {
      operatorProfileId = await findOrCreateOperatorProfile(
        sender.id,
        sender.name,
        sender.companyName
      );
    }

    // 5. Find associated quote if request ID is provided
    let quoteId: string | null = null;
    if (request?.id) {
      const { data: quote } = await supabaseAdmin
        .from('quotes')
        .select('id')
        .eq('request_id', requestRecord.id)
        .contains('metadata', { avinode_rfq_id: request.id })
        .limit(1)
        .single();
      quoteId = quote?.id || null;
    }

    // 6. Insert into messages table
    const { error: messageError } = await supabaseAdmin
      .from('messages')
      .insert({
        request_id: requestRecord.id,
        quote_id: quoteId,
        sender_type: isOperatorMessage ? 'operator' : 'system',
        sender_operator_id: operatorProfileId,
        sender_name: isOperatorMessage
          ? (sender.companyName || sender.name || 'Operator')
          : 'System',
        content: message.content,
        content_type: 'text',
        status: 'delivered',
        metadata: {
          avinode_message_id: avinodeMessageId,
          avinode_trip_id: trip.id,
          avinode_request_id: request?.id,
          sender_id: sender.id,
          sender_company_id: sender.companyId,
          webhook_event_type: data.type,
        },
        created_at: message.sentAt || new Date().toISOString(),
      });

    if (messageError) {
      console.error('[Avinode Webhook] Error inserting message:', messageError);
      await supabaseAdmin
        .from('avinode_webhook_events')
        .update({ processing_status: 'failed', processed_at: new Date().toISOString() })
        .eq('avinode_event_id', `chat_${trip.id}_${message.id || Date.now()}`);
    } else {
      console.log('[Avinode Webhook] ✓ Message stored in messages table:', {
        requestId: requestRecord.id,
        senderType: isOperatorMessage ? 'operator' : 'system',
        senderName: sender.companyName || sender.name,
        preview: message.content.substring(0, 50),
      });

      // 7. Update request message count
      const { count } = await supabaseAdmin
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('request_id', requestRecord.id);

      await supabaseAdmin
        .from('requests')
        .update({
          message_count: count || 0,
          last_activity_at: new Date().toISOString(),
        })
        .eq('id', requestRecord.id);

      // 8. Mark webhook event as completed
      await supabaseAdmin
        .from('avinode_webhook_events')
        .update({
          processing_status: 'completed',
          processed_at: new Date().toISOString(),
          message_id: null, // Would need to capture the inserted message ID
        })
        .eq('avinode_event_id', `chat_${trip.id}_${message.id || Date.now()}`);
    }

  } catch (error) {
    console.error('[Avinode Webhook] Error processing chat message:', error);
  }

  // TODO: If from operator, trigger real-time notification via SSE
  // TODO: If contains important info (pricing, schedule), notify CommunicationAgent
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

    // Verify webhook payload structure (Avinode doesn't use signatures per their docs)
    const signature = req.headers.get('x-avinode-signature') ||
                      req.headers.get('x-webhook-signature');

    if (!verifyWebhook(rawBody, signature)) {
      console.error('[Avinode Webhook] Invalid webhook payload');
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      );
    }

    // Handle both Avinode payload formats:
    // 1. Simple format: { id, href, type } - standard Avinode format
    // 2. Extended format: { event, eventId, timestamp, data } - detailed format
    const rawPayload = JSON.parse(rawBody);
    const isSimpleFormat = rawPayload.id && rawPayload.href && rawPayload.type && !rawPayload.event;

    // Log event receipt
    console.log('[Avinode Webhook] Event received:', {
      format: isSimpleFormat ? 'simple' : 'extended',
      event: payload.event || rawPayload.type,
      eventId: payload.eventId || rawPayload.id,
      href: rawPayload.href,
      timestamp: payload.timestamp || new Date().toISOString(),
    });

    // For simple format, we need to fetch data from href
    // Per Avinode docs: "always use the URL provided in the notification payload"
    if (isSimpleFormat) {
      console.log('[Avinode Webhook] Simple format - fetching data from href');

      // Store the webhook notification
      const tripIdFromHref = extractTripIdFromHref(rawPayload.href);
      try {
        const { error: webhookError } = await supabaseAdmin
          .from('avinode_webhook_events')
          .insert({
            event_type: mapTypeToEventType(rawPayload.type),
            avinode_event_id: rawPayload.id,
            avinode_trip_id: tripIdFromHref,
            raw_payload: rawPayload as Json,
            processing_status: 'pending',
            received_at: new Date().toISOString(),
          });

        if (webhookError) {
          console.error('[Avinode Webhook] Error storing simple webhook:', webhookError);
        }
      } catch (storeError) {
        console.error('[Avinode Webhook] Error storing webhook:', storeError);
      }

      // ONEK-175 FIX: For 'rfqs' type, fetch the full data from href and process it
      // This ensures operator price updates are captured even in simple format webhooks
      if (rawPayload.type === 'rfqs' && rawPayload.href) {
        try {
          const details = await fetchMessageDetails(rawPayload.href, {
            maxRetries: 2,
            initialDelayMs: 500,
          });

          if (details) {
            console.log('[Avinode Webhook] Fetched RFQ details from href:', {
              id: rawPayload.id,
              hasSellerPrice: !!(details as any)?.sellerPrice,
              sellerPrice: (details as any)?.sellerPrice?.price,
            });

            // Find the request by trip ID to store the updated quote
            if (tripIdFromHref) {
              const { data: requests } = await supabaseAdmin
                .from('requests')
                .select('id, iso_agent_id')
                .eq('avinode_trip_id', tripIdFromHref)
                .order('created_at', { ascending: false })
                .limit(1);

              if (requests && requests.length > 0) {
                try {
                  // Derive status from fetched details instead of hardcoding
                  // Only treat as declined with explicit indicators — missing sellerPrice
                  // could mean pending/unparsed, not necessarily declined
                  const detailsAny = details as any;
                  const isDeclined =
                    detailsAny?.sourcingDisplayStatus === 'Declined' ||
                    detailsAny?.data?.sourcingDisplayStatus === 'Declined' ||
                    detailsAny?.status === 'declined' ||
                    detailsAny?.data?.status === 'declined';
                  const derivedStatus = isDeclined ? 'declined' : 'quoted';

                  const quoteId = await storeOperatorQuote({
                    webhookPayload: {
                      event: 'TripRequestSellerResponse',
                      eventId: rawPayload.id,
                      timestamp: new Date().toISOString(),
                      data: {
                        type: 'TripRequestSellerResponse',
                        trip: { id: tripIdFromHref, href: rawPayload.href },
                        request: { id: rawPayload.id, href: rawPayload.href, status: derivedStatus },
                        seller: { id: 'unknown', name: 'Unknown', companyId: 'unknown' },
                      },
                    } as AvinodeWebhookPayload,
                    messageDetails: details,
                    requestId: requests[0].id,
                  });

                  console.log('[Avinode Webhook] Quote stored from simple webhook:', quoteId);

                  // Mark webhook as processed only after successful storage
                  await supabaseAdmin
                    .from('avinode_webhook_events')
                    .update({ processing_status: 'completed', processed_at: new Date().toISOString() })
                    .eq('avinode_event_id', rawPayload.id);
                } catch (storeQuoteError) {
                  console.error('[Avinode Webhook] Error storing quote from simple webhook:', storeQuoteError);
                  // Mark webhook as failed so it can be retried or investigated
                  await supabaseAdmin
                    .from('avinode_webhook_events')
                    .update({ processing_status: 'failed', processed_at: new Date().toISOString() })
                    .eq('avinode_event_id', rawPayload.id);
                }
              }
            }
          }
        } catch (fetchError) {
          console.warn('[Avinode Webhook] Failed to fetch details from href (will be processed later):', fetchError);
        }
      }
    } else {
      // Extended format - process directly
      // Process based on event type
      switch (payload.event) {
        case 'TripRequestSellerResponse':
          await handleSellerResponse(payload.data as TripRequestSellerResponseData, payload);
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
