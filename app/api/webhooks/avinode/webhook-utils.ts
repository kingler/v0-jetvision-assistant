/**
 * Avinode Webhook Utilities
 *
 * Functions for validating webhooks, fetching message details,
 * storing quotes, and triggering agent analysis.
 *
 * @module app/api/webhooks/avinode/webhook-utils
 * @see ONEK-130
 */

import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import type { AvinodeWebhookPayload, AvinodeMessageDetails } from '@/lib/types/avinode-webhooks';

// ============================================================================
// Environment Variables (read at runtime for testability)
// ============================================================================

/**
 * Get Avinode API token
 */
function getAvinodeApiToken(): string | undefined {
  return process.env.AVINODE_API_TOKEN;
}

/**
 * Get Avinode authentication token
 */
function getAvinodeAuthToken(): string | undefined {
  return process.env.AVINODE_AUTHENTICATION_TOKEN;
}

/**
 * Get Supabase URL
 */
function getSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

/**
 * Get Supabase service role key
 */
function getSupabaseServiceKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

/**
 * Validate required environment variables
 * Throws early if critical config is missing
 */
function validateEnvVars(): void {
  const missing: string[] = [];

  if (!getSupabaseUrl()) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!getSupabaseServiceKey()) missing.push('SUPABASE_SERVICE_ROLE_KEY');

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        'Please check your .env.local file.'
    );
  }
}

/**
 * Validate Avinode API credentials
 * Called before API requests
 */
function validateAvinodeCredentials(): void {
  const missing: string[] = [];

  if (!getAvinodeApiToken()) missing.push('AVINODE_API_TOKEN');
  if (!getAvinodeAuthToken()) missing.push('AVINODE_AUTHENTICATION_TOKEN');

  if (missing.length > 0) {
    throw new Error(
      `Missing Avinode API credentials: ${missing.join(', ')}. ` +
        'Avinode API features will not work without proper credentials.'
    );
  }
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

const tripSchema = z.object({
  id: z.string(),
  href: z.string().url(),
});

const requestSchema = z.object({
  id: z.string(),
  href: z.string().url(),
  status: z.enum(['quoted', 'declined', 'pending']),
});

const sellerSchema = z.object({
  id: z.string(),
  name: z.string(),
  companyId: z.string(),
});

const quoteSchema = z
  .object({
    id: z.string(),
    href: z.string().url(),
    totalPrice: z.object({
      amount: z.number(),
      currency: z.string(),
    }),
    validUntil: z.string(),
    aircraft: z
      .object({
        type: z.string(),
        model: z.string(),
        tailNumber: z.string().optional(),
        capacity: z.number(),
      })
      .optional(),
    schedule: z
      .object({
        departureTime: z.string(),
        arrivalTime: z.string(),
      })
      .optional(),
  })
  .optional();

const messageSchema = z
  .object({
    id: z.string(),
    href: z.string().url(),
    content: z.string(),
    sentAt: z.string(),
  })
  .optional();

const senderSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    companyId: z.string(),
    companyName: z.string(),
  })
  .optional();

const tripRequestSellerResponseSchema = z.object({
  type: z.literal('TripRequestSellerResponse'),
  trip: tripSchema,
  request: requestSchema,
  seller: sellerSchema,
  quote: quoteSchema,
  declineReason: z.string().optional(),
});

const tripChatSchema = z.object({
  type: z.enum(['TripChatSeller', 'TripChatMine']),
  trip: tripSchema,
  message: messageSchema,
  sender: senderSchema,
  request: z
    .object({
      id: z.string(),
      href: z.string().url(),
    })
    .optional(),
});

const webhookPayloadSchema = z.object({
  event: z.string(),
  eventId: z.string(),
  timestamp: z.string(),
  apiVersion: z.string().optional(),
  data: z.union([tripRequestSellerResponseSchema, tripChatSchema]),
});

// ============================================================================
// Types
// ============================================================================

export interface ValidationResult {
  success: boolean;
  data?: AvinodeWebhookPayload;
  error?: z.ZodError;
}

export interface FetchOptions {
  maxRetries?: number;
  initialDelayMs?: number;
}

export interface StoreQuoteParams {
  webhookPayload: AvinodeWebhookPayload;
  messageDetails: AvinodeMessageDetails | null;
  requestId: string;
}

export interface TriggerAnalysisParams {
  rfpId: string;
  quoteId: string;
  context: {
    userId: string;
    sessionId?: string;
  };
}

// ============================================================================
// Webhook Validation
// ============================================================================

/**
 * Validate an incoming Avinode webhook payload
 */
export function validateWebhookPayload(
  payload: unknown
): ValidationResult {
  try {
    const result = webhookPayloadSchema.safeParse(payload);

    if (result.success) {
      return {
        success: true,
        data: payload as AvinodeWebhookPayload,
      };
    }

    return {
      success: false,
      error: result.error,
    };
  } catch (error) {
    return {
      success: false,
      error: error as z.ZodError,
    };
  }
}

// ============================================================================
// Fetch Message Details from Avinode API
// ============================================================================

/**
 * Fetch full message/quote details from Avinode API
 * Includes exponential backoff retry logic for rate limiting
 */
export async function fetchMessageDetails(
  href: string,
  options: FetchOptions = {}
): Promise<AvinodeMessageDetails> {
  // Validate credentials before making API request
  validateAvinodeCredentials();

  const { maxRetries = 3, initialDelayMs = 1000 } = options;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${getAvinodeAuthToken()}`,
    'X-Avinode-ApiToken': getAvinodeApiToken()!,
    'X-Avinode-SentTimestamp': new Date().toISOString(),
    'X-Avinode-Product': 'JetVision/1.0',
    'X-Avinode-ApiVersion': 'v1.0',
    'Content-Type': 'application/json',
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(href, {
        method: 'GET',
        headers,
      });

      // Handle rate limiting with exponential backoff
      if (response.status === 429) {
        const delay = initialDelayMs * Math.pow(2, attempt);
        console.log(
          `[Avinode API] Rate limited, waiting ${delay}ms before retry ${attempt + 1}/${maxRetries}`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      if (!response.ok) {
        throw new Error(
          `Avinode API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return data as AvinodeMessageDetails;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries - 1) {
        const delay = initialDelayMs * Math.pow(2, attempt);
        console.log(
          `[Avinode API] Error, retrying in ${delay}ms: ${lastError.message}`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `Failed after max retries (${maxRetries}): ${lastError?.message || 'Unknown error'}`
  );
}

// ============================================================================
// Store Operator Quote in Database
// ============================================================================

/**
 * Store operator quote in the quotes table
 * Uses upsert to handle duplicate avinode_quote_id
 */
export async function storeOperatorQuote(
  params: StoreQuoteParams
): Promise<string> {
  // Validate environment variables before database operations
  validateEnvVars();

  const { webhookPayload, messageDetails, requestId } = params;

  // Create Supabase client with service role for webhook processing
  const supabase = createClient(getSupabaseUrl()!, getSupabaseServiceKey()!);

  // Extract data from webhook and message details
  const webhookData = webhookPayload.data as any;
  const msgDetails = messageDetails as any;

  // ONEK-175 FIX: Extract quote data from multiple possible response formats
  // The fetched response from /quotes/{id} may have sellerPrice at different levels:
  // 1. Direct: messageDetails.sellerPrice (when response is the quote object itself)
  // 2. Nested data: messageDetails.data.sellerPrice (single wrap)
  // 3. Relationships: messageDetails.data.relationships.quote.data.attributes (JSONAPI format)
  const quoteData =
    msgDetails?.sellerPrice ? msgDetails :
    msgDetails?.data?.sellerPrice ? msgDetails.data :
    msgDetails?.data?.data?.sellerPrice ? msgDetails.data.data :
    msgDetails?.data?.relationships?.quote?.data?.attributes || null;

  const senderData = msgDetails?.data?.relationships?.sender?.data?.attributes || null;

  // ONEK-175 FIX: Extract sellerPrice (the authoritative operator price)
  // This is the PRIMARY price source - it reflects the operator's latest price including updates
  // Use ?? (nullish coalescing) instead of || to preserve legitimate $0 prices
  const sellerPrice = quoteData?.sellerPrice?.price ??
    msgDetails?.sellerPrice?.price ??
    0;
  const sellerCurrency = quoteData?.sellerPrice?.currency ??
    msgDetails?.sellerPrice?.currency ??
    null;

  console.log('[storeOperatorQuote] Price extraction:', {
    hasMessageDetails: !!messageDetails,
    sellerPrice,
    sellerCurrency,
    webhookPrice: webhookData.quote?.totalPrice?.amount,
    quoteDataKeys: quoteData ? Object.keys(quoteData) : [],
  });

  // Determine quote status
  // Map webhook request.status to database quote status
  // 'quoted' from webhook means operator provided a quote → 'received' in database
  // 'declined' from webhook means operator declined → 'declined' in database
  // 'pending' from webhook means no response yet → 'pending' in database
  let status: string = 'received';
  if (webhookData.request?.status === 'declined') {
    status = 'declined';
  } else if (webhookData.request?.status === 'quoted') {
    status = 'received'; // Quote was received (operator provided quote)
  } else if (webhookData.request?.status === 'pending') {
    status = 'pending';
  }

  // Build quote record
  // ONEK-175 FIX: Price priority: sellerPrice (fetched) > webhook totalPrice > 0
  const quoteRecord = {
    request_id: requestId,
    avinode_quote_id:
      webhookData.quote?.id || quoteData?.id || `decline-${webhookPayload.eventId}`,
    operator_id: webhookData.seller?.id || 'unknown',
    operator_name: webhookData.seller?.name || 'Unknown Operator',
    operator_contact: senderData
      ? {
          email: senderData.email,
          company: senderData.companyName,
        }
      : {},
    aircraft_type:
      quoteData?.aircraftType ||
      quoteData?.aircraft?.type ||
      webhookData.quote?.aircraft?.type ||
      'Unknown',
    aircraft_tail_number:
      quoteData?.aircraftTail ||
      quoteData?.aircraft?.tailNumber ||
      webhookData.quote?.aircraft?.tailNumber ||
      null,
    aircraft_details: quoteData?.aircraft || webhookData.quote?.aircraft || {},
    base_price:
      sellerPrice ??
      quoteData?.pricing?.basePrice ??
      webhookData.quote?.totalPrice?.amount ??
      0,
    total_price:
      sellerPrice ??
      quoteData?.pricing?.total ??
      webhookData.quote?.totalPrice?.amount ??
      0,
    currency:
      sellerCurrency ??
      quoteData?.pricing?.currency ??
      webhookData.quote?.totalPrice?.currency ??
      'USD',
    status,
    schedule: quoteData?.schedule || webhookData.quote?.schedule || {},
    availability: quoteData?.availability || {},
    message_content: quoteData?.sellerMessage || webhookData.message?.content || null,
    decline_reason: webhookData.declineReason || null,
    raw_webhook_payload: webhookPayload,
    raw_message_details: messageDetails,
    valid_until:
      quoteData?.validUntil || webhookData.quote?.validUntil || null,
  };

  const { data, error } = await supabase
    .from('quotes')
    .upsert(quoteRecord, { onConflict: 'avinode_quote_id' })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  return data.id;
}

// ============================================================================
// Trigger ProposalAnalysisAgent
// ============================================================================

/**
 * Trigger ProposalAnalysisAgent via MessageBus
 */
export async function triggerProposalAnalysis(
  params: TriggerAnalysisParams
): Promise<void> {
  const { rfpId, quoteId, context } = params;

  // Dynamically import to avoid circular dependencies
  const { messageBus, MessageType } = await import('@agents/coordination');

  await messageBus.publish({
    type: MessageType.TASK_CREATED,
    sourceAgent: 'webhook-handler',
    targetAgent: 'proposal-analysis-agent',
    payload: {
      taskType: 'analyze_quote',
      rfpId,
      quoteId,
      priority: 'high',
    },
    context: {
      requestId: rfpId,
      userId: context.userId,
      sessionId: context.sessionId,
    },
  });
}
