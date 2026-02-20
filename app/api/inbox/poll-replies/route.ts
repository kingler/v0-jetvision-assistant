/**
 * Poll for Customer Replies API (ONEK-232)
 *
 * POST /api/inbox/poll-replies
 *
 * Batch-checks all recently sent proposals for customer replies using
 * the Gmail MCP search_emails tool. When replies are detected, they
 * are persisted as chat messages and the request is flagged.
 *
 * Can also check a single request by providing `requestId`.
 *
 * Request body (all optional):
 *   - requestId (string): Check a single request instead of batch
 *   - maxAgeHours (number): How far back to look (default: 72)
 *   - batchSize (number): Max proposals to check (default: 20)
 *
 * Response:
 *   - success (boolean)
 *   - checked (number): How many proposals were checked
 *   - repliesFound (number): How many replies were detected
 *   - errors (number): How many checks failed
 *   - results (array): Per-proposal results
 *
 * @see ONEK-232
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedAgent,
  isErrorNextResponse,
  parseJsonBody,
} from '@/lib/utils/api';
import {
  pollForReplies,
  checkSingleReply,
  type PollRepliesResult,
  type ReplyDetectionResult,
} from '@/lib/services/reply-polling-service';

export const dynamic = 'force-dynamic';

interface PollRepliesRequest {
  requestId?: string;
  maxAgeHours?: number;
  batchSize?: number;
}

interface PollRepliesResponse {
  success: boolean;
  checked: number;
  repliesFound: number;
  errors: number;
  results: ReplyDetectionResult[];
  error?: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<PollRepliesResponse>> {
  try {
    // Authenticate
    const authResult = await getAuthenticatedAgent();
    if (isErrorNextResponse(authResult)) {
      return authResult as NextResponse<PollRepliesResponse>;
    }

    // Parse body
    const bodyResult = await parseJsonBody<PollRepliesRequest>(request);
    if (isErrorNextResponse(bodyResult)) {
      return bodyResult as NextResponse<PollRepliesResponse>;
    }

    const body = bodyResult;

    // Single request mode
    if (body.requestId) {
      const result = await checkSingleReply(body.requestId);
      if (!result) {
        return NextResponse.json({
          success: true,
          checked: 0,
          repliesFound: 0,
          errors: 0,
          results: [],
        });
      }

      return NextResponse.json({
        success: true,
        checked: 1,
        repliesFound: result.hasReply ? 1 : 0,
        errors: result.error ? 1 : 0,
        results: [result],
      });
    }

    // Batch mode
    const result: PollRepliesResult = await pollForReplies({
      maxAgeHours: body.maxAgeHours,
      batchSize: body.batchSize,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[PollReplies] Error:', error);

    const isConnectionError =
      error instanceof Error &&
      (error.message.includes('MCP') ||
        error.message.includes('connect') ||
        error.message.includes('spawn'));

    return NextResponse.json(
      {
        success: false,
        checked: 0,
        repliesFound: 0,
        errors: 1,
        results: [],
        error: isConnectionError
          ? 'Gmail service is not connected. Please start the Gmail MCP server.'
          : 'Failed to poll for replies',
      },
      { status: isConnectionError ? 503 : 500 }
    );
  }
}
