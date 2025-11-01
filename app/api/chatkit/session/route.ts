/**
 * ChatKit Session Management API
 *
 * @route POST /api/chatkit/session - Create or refresh ChatKit session
 *
 * This endpoint manages ChatKit sessions by:
 * 1. Authenticating the user via Clerk
 * 2. Mapping Clerk user ID to ChatKit device ID
 * 3. Creating or refreshing session tokens
 * 4. Storing session data in Supabase
 *
 * Protected by RBAC: Requires authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRBAC } from '@/lib/middleware/rbac';
import { createClient } from '@/lib/supabase/server';
import { supabase as supabaseAdmin } from '@/lib/supabase/client';
import { randomUUID } from 'crypto';
import type {
  CreateSessionRequest,
  CreateSessionResponse,
  ChatKitSession,
  ChatKitSessionRow,
  SessionStatus,
} from '@/lib/types/chatkit';

// Force dynamic rendering - API routes should not be statically generated
export const dynamic = 'force-dynamic';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Session expiration time in milliseconds (24 hours)
 */
const SESSION_EXPIRATION_MS = 24 * 60 * 60 * 1000;

/**
 * Session refresh threshold in milliseconds (1 hour before expiration)
 */
const SESSION_REFRESH_THRESHOLD_MS = 60 * 60 * 1000;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique device ID for ChatKit
 *
 * @param userId - Clerk user ID
 * @returns Device ID in format: device_{userId}_{timestamp}
 */
function generateDeviceId(userId: string): string {
  const timestamp = Date.now();
  return `device_${userId}_${timestamp}`;
}

/**
 * Generate a secure session token
 *
 * @returns Random UUID v4 session token
 */
function generateSessionToken(): string {
  return randomUUID();
}

/**
 * Calculate session expiration timestamp
 *
 * @param fromDate - Base date (defaults to now)
 * @returns ISO timestamp for session expiration
 */
function calculateExpirationTime(fromDate: Date = new Date()): string {
  const expirationDate = new Date(fromDate.getTime() + SESSION_EXPIRATION_MS);
  return expirationDate.toISOString();
}

/**
 * Check if a session needs to be refreshed
 *
 * @param expiresAt - Session expiration timestamp
 * @returns true if session should be refreshed
 */
function shouldRefreshSession(expiresAt: string): boolean {
  const expirationTime = new Date(expiresAt).getTime();
  const now = Date.now();
  const timeUntilExpiration = expirationTime - now;

  return timeUntilExpiration <= SESSION_REFRESH_THRESHOLD_MS;
}

/**
 * Find active session for a user
 *
 * @param userId - Clerk user ID
 * @returns Active session row or null
 */
async function findActiveSession(
  userId: string
): Promise<ChatKitSessionRow | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('chatkit_sessions')
      .select('*')
      .eq('clerk_user_id', userId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error finding active session:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception finding active session:', error);
    return null;
  }
}

/**
 * Create a new ChatKit session in the database
 *
 * @param userId - Clerk user ID
 * @param deviceId - ChatKit device ID
 * @param workflowId - ChatKit workflow ID
 * @param metadata - Optional session metadata
 * @returns Created session row
 */
async function createSession(
  userId: string,
  deviceId: string,
  workflowId: string,
  metadata?: Record<string, unknown>
): Promise<ChatKitSessionRow> {
  const sessionToken = generateSessionToken();
  const expiresAt = calculateExpirationTime();
  const now = new Date().toISOString();

  const sessionData = {
    clerk_user_id: userId,
    device_id: deviceId,
    workflow_id: workflowId,
    session_token: sessionToken,
    status: 'active' as SessionStatus,
    expires_at: expiresAt,
    metadata: metadata || {},
    last_activity_at: now,
  };

  const { data, error } = await supabaseAdmin
    .from('chatkit_sessions')
    .insert(sessionData)
    .select()
    .single();

  if (error) {
    console.error('Error creating session:', error);
    throw new Error(`Failed to create session: ${error.message}`);
  }

  if (!data) {
    throw new Error('Failed to create session: No data returned');
  }

  return data;
}

/**
 * Refresh an existing ChatKit session
 *
 * @param sessionId - Session ID to refresh
 * @returns Updated session row
 */
async function refreshSession(sessionId: string): Promise<ChatKitSessionRow> {
  const newSessionToken = generateSessionToken();
  const expiresAt = calculateExpirationTime();
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('chatkit_sessions')
    .update({
      session_token: newSessionToken,
      expires_at: expiresAt,
      last_activity_at: now,
      updated_at: now,
    })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) {
    console.error('Error refreshing session:', error);
    throw new Error(`Failed to refresh session: ${error.message}`);
  }

  if (!data) {
    throw new Error('Failed to refresh session: No data returned');
  }

  return data;
}

/**
 * Convert database session row to API response format
 *
 * @param sessionRow - Database session row
 * @returns ChatKit session object
 */
function toSessionResponse(sessionRow: ChatKitSessionRow): ChatKitSession {
  return {
    chatKitSessionId: sessionRow.session_token,
    deviceId: sessionRow.device_id,
    userId: sessionRow.clerk_user_id,
    workflowId: sessionRow.workflow_id,
    createdAt: sessionRow.created_at,
    expiresAt: sessionRow.expires_at,
    metadata: sessionRow.metadata,
  };
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * POST /api/chatkit/session
 * Create or refresh a ChatKit session
 *
 * Request Body:
 * - deviceId (optional): Custom device ID, auto-generated if not provided
 * - metadata (optional): Additional session metadata
 *
 * Response:
 * - 200: Session created or refreshed successfully
 * - 400: Invalid request (missing workflow ID)
 * - 401: Unauthorized (not authenticated)
 * - 500: Internal server error
 *
 * @example
 * ```typescript
 * const response = await fetch('/api/chatkit/session', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ metadata: { source: 'web' } })
 * })
 * const { session } = await response.json()
 * ```
 */
export const POST = withRBAC(
  async (req: NextRequest, context): Promise<NextResponse> => {
    try {
      // 1. Validate context (should always exist due to withRBAC)
      if (!context) {
        return NextResponse.json(
          {
            error: 'Unauthorized',
            message: 'Authentication required',
          },
          { status: 401 }
        );
      }

      const { userId } = context;

      // 2. Validate environment configuration
      const workflowId = process.env.CHATKIT_WORKFLOW_ID;
      if (!workflowId) {
        console.error('Missing CHATKIT_WORKFLOW_ID environment variable');
        return NextResponse.json(
          {
            error: 'Configuration Error',
            message: 'ChatKit workflow ID not configured',
          },
          { status: 500 }
        );
      }

      // 3. Parse request body
      let requestBody: CreateSessionRequest = {};
      try {
        const body = await req.json();
        requestBody = body;
      } catch (error) {
        // Empty body is acceptable
        requestBody = {};
      }

      const { deviceId: customDeviceId, metadata } = requestBody;

      // 4. Check for existing active session
      const existingSession = await findActiveSession(userId);

      if (existingSession) {
        // 4a. If session exists and doesn't need refresh, return it
        if (!shouldRefreshSession(existingSession.expires_at)) {
          console.log(`Returning existing session for user ${userId}`);
          const session = toSessionResponse(existingSession);
          return NextResponse.json(
            { session } as CreateSessionResponse,
            { status: 200 }
          );
        }

        // 4b. Session exists but needs refresh
        console.log(`Refreshing session for user ${userId}`);
        const refreshedSession = await refreshSession(existingSession.id);
        const session = toSessionResponse(refreshedSession);
        return NextResponse.json(
          { session } as CreateSessionResponse,
          { status: 200 }
        );
      }

      // 5. Create new session
      console.log(`Creating new session for user ${userId}`);
      const deviceId = customDeviceId || generateDeviceId(userId);
      const newSession = await createSession(
        userId,
        deviceId,
        workflowId,
        metadata
      );

      const session = toSessionResponse(newSession);

      return NextResponse.json(
        { session } as CreateSessionResponse,
        { status: 200 }
      );
    } catch (error) {
      console.error('Error in ChatKit session endpoint:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'An unexpected error occurred';

      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: errorMessage,
        },
        { status: 500 }
      );
    }
  },
  { resource: 'users', action: 'read_own' }
);
