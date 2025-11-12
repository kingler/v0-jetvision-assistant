/**
 * ChatKit Type Definitions
 *
 * Types for ChatKit session management and device integration
 */

// ============================================================================
// SESSION TYPES
// ============================================================================

/**
 * ChatKit session object returned by the API
 */
export interface ChatKitSession {
  chatKitSessionId: string;
  deviceId: string;
  userId: string;
  workflowId: string;
  createdAt: string;
  expiresAt: string;
  metadata?: Record<string, unknown>;
}

/**
 * Request body for creating a ChatKit session
 */
export interface CreateSessionRequest {
  deviceId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Response from session creation endpoint
 */
export interface CreateSessionResponse {
  session: ChatKitSession;
}

/**
 * Error response from ChatKit endpoints
 */
export interface ChatKitErrorResponse {
  error: string;
  message: string;
  details?: unknown;
}

/**
 * Session status types
 */
export type SessionStatus = 'active' | 'expired' | 'revoked';

/**
 * Database row for chatkit_sessions table
 */
export interface ChatKitSessionRow {
  id: string;
  clerk_user_id: string;
  device_id: string;
  workflow_id: string;
  session_token: string;
  status: SessionStatus;
  expires_at: string;
  metadata: Record<string, unknown>;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}
