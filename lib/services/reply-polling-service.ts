/**
 * Reply Polling Service (ONEK-232)
 *
 * Server-side service that checks for customer replies to sent proposals.
 * Queries the `proposals` table for entries with `sent_at` in the last
 * N hours, then uses the inbox monitor to search Gmail for replies.
 *
 * When a reply is detected, it persists a `customer_reply` message to the
 * conversation so the sales agent can see it in the chat UI.
 *
 * Designed to be called from:
 *   - An API route (manual or cron-triggered)
 *   - A BullMQ scheduled job (when TASK-003 is implemented)
 *
 * @module lib/services/reply-polling-service
 * @see ONEK-232
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkForCustomerReplies } from '@/lib/services/inbox-monitor';
import { saveMessage } from '@/lib/conversation/message-persistence';

// =============================================================================
// Types
// =============================================================================

export interface PendingProposal {
  requestId: string;
  proposalId: string;
  customerEmail: string;
  proposalSentAt: string;
  threadId?: string;
  customerName?: string;
}

export interface ReplyDetectionResult {
  requestId: string;
  customerEmail: string;
  hasReply: boolean;
  replySnippet?: string;
  replyDate?: string;
  messageId?: string;
  error?: string;
}

export interface PollRepliesResult {
  checked: number;
  repliesFound: number;
  errors: number;
  results: ReplyDetectionResult[];
}

export interface PollRepliesOptions {
  /** Maximum age of proposals to check, in hours (default: 72) */
  maxAgeHours?: number;
  /** Maximum number of proposals to check per batch (default: 20) */
  batchSize?: number;
  /** Skip proposals that already have a reply recorded (default: true) */
  skipAlreadyReplied?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_MAX_AGE_HOURS = 72;
const DEFAULT_BATCH_SIZE = 20;

// =============================================================================
// Service
// =============================================================================

/**
 * Fetch proposals that were sent within the time window and haven't received
 * a detected reply yet. Queries the `proposals` table which has `sent_at`,
 * `sent_to_email`, `sent_to_name`, and `email_message_id` columns.
 */
export async function getPendingProposals(
  options: PollRepliesOptions = {}
): Promise<PendingProposal[]> {
  const maxAgeHours = options.maxAgeHours ?? DEFAULT_MAX_AGE_HOURS;
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;

  const cutoff = new Date(
    Date.now() - maxAgeHours * 60 * 60 * 1000
  ).toISOString();

  // Query proposals that have been sent and have a recipient email,
  // ordered by most recent first
  const query = supabaseAdmin
    .from('proposals')
    .select(`
      id,
      request_id,
      sent_at,
      sent_to_email,
      sent_to_name,
      email_message_id,
      metadata,
      status
    `)
    .not('sent_at', 'is', null)
    .not('sent_to_email', 'is', null)
    .gte('sent_at', cutoff)
    .order('sent_at', { ascending: false })
    .limit(batchSize);

  const { data, error } = await query;

  if (error) {
    console.error('[ReplyPolling] Error fetching pending proposals:', error);
    throw new Error(`Failed to fetch pending proposals: ${error.message}`);
  }

  // Filter out proposals where we already detected a reply (stored in metadata)
  const filtered = (data || []).filter((row) => {
    if (options.skipAlreadyReplied === false) return true;
    const meta = row.metadata as Record<string, unknown> | null;
    return !meta?.reply_detected_at;
  });

  return filtered.map((row) => ({
    requestId: row.request_id,
    proposalId: row.id,
    customerEmail: row.sent_to_email as string,
    proposalSentAt: row.sent_at as string,
    threadId: row.email_message_id ?? undefined,
    customerName: row.sent_to_name ?? undefined,
  }));
}

/**
 * Check a single proposal for customer replies and persist the result.
 */
export async function checkAndRecordReply(
  proposal: PendingProposal
): Promise<ReplyDetectionResult> {
  const { requestId, proposalId, customerEmail, proposalSentAt, threadId } = proposal;

  try {
    const result = await checkForCustomerReplies({
      customerEmail,
      afterDate: proposalSentAt,
      threadId,
    });

    if (!result.hasReply) {
      return { requestId, customerEmail, hasReply: false };
    }

    // Reply found — persist as a chat message
    const messageId = await saveMessage({
      requestId,
      senderType: 'system',
      senderName: 'Email Monitor',
      content: `Customer reply detected from ${proposal.customerName || customerEmail}: "${result.replySnippet || 'Reply received'}"`,
      contentType: 'text',
      metadata: {
        type: 'customer_reply_detected',
        customerEmail,
        replySnippet: result.replySnippet,
        replyDate: result.replyDate,
        detectedAt: new Date().toISOString(),
      },
    });

    const replyTimestamp = result.replyDate || new Date().toISOString();

    // Mark the proposal as having a reply (in metadata)
    await supabaseAdmin
      .from('proposals')
      .update({
        metadata: {
          reply_detected_at: replyTimestamp,
          reply_snippet: result.replySnippet,
        },
      })
      .eq('id', proposalId);

    // Update the request's last activity timestamp
    await supabaseAdmin
      .from('requests')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', requestId);

    console.log(
      `[ReplyPolling] Reply detected for ${requestId} from ${customerEmail}`
    );

    return {
      requestId,
      customerEmail,
      hasReply: true,
      replySnippet: result.replySnippet,
      replyDate: result.replyDate,
      messageId,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `[ReplyPolling] Error checking ${requestId}:`,
      message
    );
    return {
      requestId,
      customerEmail,
      hasReply: false,
      error: message,
    };
  }
}

/**
 * Poll all pending proposals for customer replies.
 *
 * This is the main entry point — called from API routes or scheduled jobs.
 * It fetches proposals with `sent_at` within the time window,
 * checks Gmail for replies to each, and persists any detected replies
 * as chat messages.
 */
export async function pollForReplies(
  options: PollRepliesOptions = {}
): Promise<PollRepliesResult> {
  const proposals = await getPendingProposals(options);

  if (proposals.length === 0) {
    return { checked: 0, repliesFound: 0, errors: 0, results: [] };
  }

  console.log(
    `[ReplyPolling] Checking ${proposals.length} proposals for replies`
  );

  // Process sequentially to avoid Gmail rate limits
  const results: ReplyDetectionResult[] = [];
  let repliesFound = 0;
  let errors = 0;

  for (const proposal of proposals) {
    const result = await checkAndRecordReply(proposal);
    results.push(result);

    if (result.hasReply) repliesFound++;
    if (result.error) errors++;

    // Small delay between checks to be respectful of Gmail API
    if (proposals.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  console.log(
    `[ReplyPolling] Done: ${proposals.length} checked, ${repliesFound} replies, ${errors} errors`
  );

  return {
    checked: proposals.length,
    repliesFound,
    errors,
    results,
  };
}

/**
 * Check a single request for customer reply.
 * Convenience wrapper for use from client-side polling.
 * Finds the most recently sent proposal for the given request.
 */
export async function checkSingleReply(
  requestId: string
): Promise<ReplyDetectionResult | null> {
  const { data, error } = await supabaseAdmin
    .from('proposals')
    .select(`
      id,
      request_id,
      sent_at,
      sent_to_email,
      sent_to_name,
      email_message_id,
      metadata
    `)
    .eq('request_id', requestId)
    .not('sent_at', 'is', null)
    .not('sent_to_email', 'is', null)
    .order('sent_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    console.error('[ReplyPolling] No sent proposal found for request:', requestId);
    return null;
  }

  // Check if reply was already detected (stored in metadata)
  const meta = data.metadata as Record<string, unknown> | null;
  if (meta?.reply_detected_at) {
    return {
      requestId,
      customerEmail: data.sent_to_email as string,
      hasReply: true,
      replyDate: meta.reply_detected_at as string,
    };
  }

  return checkAndRecordReply({
    requestId: data.request_id,
    proposalId: data.id,
    customerEmail: data.sent_to_email as string,
    proposalSentAt: data.sent_at as string,
    threadId: data.email_message_id ?? undefined,
    customerName: data.sent_to_name ?? undefined,
  });
}
