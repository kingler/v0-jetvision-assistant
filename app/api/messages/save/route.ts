/**
 * Message Save API Route
 *
 * POST /api/messages/save
 *
 * Saves a chat message to the database for persistence.
 * Used to save agent messages (like proposal sent confirmations) that are
 * created client-side and need to be persisted.
 *
 * @see lib/conversation/message-persistence.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { saveMessage } from '@/lib/conversation/message-persistence';
import { getAuthenticatedAgent, isErrorResponse, parseJsonBody } from '@/lib/utils/api';

// Force dynamic rendering - API routes should not be statically generated
export const dynamic = 'force-dynamic';

// =============================================================================
// TYPES
// =============================================================================

interface SaveMessageRequest {
  requestId: string;
  content: string;
  contentType?: 'text' | 'rich' | 'system' | 'action' | 'quote' | 'proposal_shared';
  richContent?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

interface SaveMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

// =============================================================================
// VALIDATION
// =============================================================================

function validateRequest(body: SaveMessageRequest): string | null {
  if (!body.requestId || body.requestId.trim() === '') {
    return 'Request ID is required';
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(body.requestId)) {
    return 'Request ID must be a valid UUID';
  }

  if (!body.content || body.content.trim() === '') {
    return 'Message content is required';
  }

  return null;
}

// =============================================================================
// ROUTE HANDLER
// =============================================================================

/**
 * POST /api/messages/save
 *
 * Save a chat message to the database for persistence.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<SaveMessageResponse>> {
  try {
    // Authenticate user
    const authResult = await getAuthenticatedAgent();
    if (isErrorResponse(authResult)) {
      return authResult as NextResponse<SaveMessageResponse>;
    }

    // Parse request body
    const bodyResult = await parseJsonBody<SaveMessageRequest>(request);
    if (isErrorResponse(bodyResult)) {
      return bodyResult as NextResponse<SaveMessageResponse>;
    }

    const body = bodyResult;

    // Validate request
    const validationError = validateRequest(body);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 }
      );
    }

    // authResult.id from getAuthenticatedAgent() is already the iso_agent UUID
    // (it queries iso_agents by clerk_user_id and returns the id)
    const isoAgentId = authResult.id;

    // Save message to database
    const messageId = await saveMessage({
      requestId: body.requestId,
      senderType: 'ai_assistant',
      senderIsoAgentId: isoAgentId,
      content: body.content,
      contentType: body.contentType || 'text',
      richContent: body.richContent ?? undefined,
      metadata: body.metadata || {},
    });

    return NextResponse.json({
      success: true,
      messageId,
    });
  } catch (error) {
    console.error('Error saving message:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save message',
      },
      { status: 500 }
    );
  }
}
