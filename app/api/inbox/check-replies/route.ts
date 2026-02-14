/**
 * Check for Customer Replies API
 *
 * POST /api/inbox/check-replies
 *
 * Checks Gmail for customer replies to proposal emails using the
 * Gmail MCP server's search_emails tool.
 *
 * Request body:
 *   - customerEmail (string, required): The customer's email address
 *   - proposalSentAt (string, required): ISO date of when the proposal was sent
 *   - threadId (string, optional): Gmail thread/message ID to narrow search
 *
 * Response:
 *   - success (boolean): Whether the API call succeeded
 *   - hasReply (boolean): Whether a reply was found
 *   - replySnippet (string?): Preview text of the reply
 *   - replyDate (string?): ISO date of the reply
 *   - error (string?): Error message if success is false
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedAgent,
  isErrorNextResponse,
  parseJsonBody,
} from '@/lib/utils/api';
import { checkForCustomerReplies } from '@/lib/services/inbox-monitor';

export const dynamic = 'force-dynamic';

interface CheckRepliesRequest {
  customerEmail: string;
  proposalSentAt: string;
  threadId?: string;
}

interface CheckRepliesResponse {
  success: boolean;
  hasReply: boolean;
  replySnippet?: string;
  replyDate?: string;
  error?: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<CheckRepliesResponse>> {
  try {
    // Authenticate the caller
    const authResult = await getAuthenticatedAgent();
    if (isErrorNextResponse(authResult)) {
      return authResult as NextResponse<CheckRepliesResponse>;
    }

    // Parse request body
    const bodyResult = await parseJsonBody<CheckRepliesRequest>(request);
    if (isErrorNextResponse(bodyResult)) {
      return bodyResult as NextResponse<CheckRepliesResponse>;
    }

    const body = bodyResult;

    // Validate required fields
    if (!body.customerEmail) {
      return NextResponse.json(
        { success: false, hasReply: false, error: 'customerEmail is required' },
        { status: 400 }
      );
    }

    if (!body.proposalSentAt) {
      return NextResponse.json(
        { success: false, hasReply: false, error: 'proposalSentAt is required' },
        { status: 400 }
      );
    }

    // Check for replies
    const result = await checkForCustomerReplies({
      customerEmail: body.customerEmail,
      afterDate: body.proposalSentAt,
      threadId: body.threadId,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[CheckReplies] Error:', error);

    const isConnectionError =
      error instanceof Error &&
      (error.message.includes('MCP') ||
        error.message.includes('connect') ||
        error.message.includes('spawn'));

    return NextResponse.json(
      {
        success: false,
        hasReply: false,
        error: isConnectionError
          ? 'Gmail service is not connected. Please start the Gmail MCP server.'
          : 'Failed to check for replies',
      },
      { status: isConnectionError ? 503 : 500 }
    );
  }
}
