/**
 * Inbox Monitor Service
 *
 * Checks for customer replies to proposal emails using the Gmail MCP
 * server's `search_emails` tool. Designed to be called from an API route
 * or polling mechanism to detect when a customer has responded.
 *
 * @module lib/services/inbox-monitor
 */

import { searchEmails } from '@/lib/mcp/clients/gmail-mcp-client';

// =============================================================================
// Types
// =============================================================================

export interface CheckRepliesParams {
  /** Customer email address to search replies from */
  customerEmail: string;
  /** ISO date string — only look for replies sent after this date */
  afterDate: string;
  /** Optional thread ID to narrow the search to a specific conversation */
  threadId?: string;
}

export interface CheckRepliesResult {
  /** Whether at least one reply was found */
  hasReply: boolean;
  /** Short preview of the reply content */
  replySnippet?: string;
  /** ISO date string of the reply */
  replyDate?: string;
}

// =============================================================================
// Service
// =============================================================================

/**
 * Check whether a customer has replied to a proposal email.
 *
 * Builds a Gmail search query using the customer email and a date filter,
 * then calls the Gmail MCP `search_emails` tool. Returns the first matching
 * result (if any).
 *
 * @param params - Search parameters
 * @returns Result indicating whether a reply exists and its preview
 * @throws Error if the Gmail MCP server is unreachable
 */
export async function checkForCustomerReplies(
  params: CheckRepliesParams
): Promise<CheckRepliesResult> {
  const { customerEmail, afterDate, threadId } = params;

  // Convert ISO date (e.g. 2025-06-15T10:00:00Z) to Gmail format (2025/06/15)
  const afterFormatted = afterDate.split('T')[0].replace(/-/g, '/');

  // Build Gmail search query
  let query = `from:${customerEmail} after:${afterFormatted}`;
  if (threadId) {
    query += ` rfc822msgid:${threadId}`;
  }

  const results = await searchEmails({
    query,
    maxResults: 1,
    from: customerEmail,
    after: afterFormatted,
  });

  if (results.length === 0) {
    return { hasReply: false };
  }

  const firstReply = results[0];
  return {
    hasReply: true,
    replySnippet: firstReply.snippet || firstReply.subject || 'Reply received',
    replyDate: firstReply.date || new Date().toISOString(),
  };
}
