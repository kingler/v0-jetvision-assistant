/**
 * Validation Utilities
 *
 * Shared validation functions used across the application.
 *
 * @module lib/utils/validation
 */

/**
 * Validate that a string is a valid UUID.
 *
 * @param id - String to validate
 * @returns True if valid UUID format
 */
export function isValidUUID(id: string | undefined | null): boolean {
  if (!id) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Alias for isValidUUID — backward-compatible name used in proposal-api.
 */
export const isValidRequestId = isValidUUID;

/**
 * Find a valid request ID from session data.
 *
 * Checks requestId, conversationId, and id in priority order.
 *
 * @param session - Session data with potential ID fields
 * @returns Valid request ID or null
 */
export function findValidRequestId(session: {
  requestId?: string;
  conversationId?: string;
  id?: string;
}): string | null {
  if (isValidUUID(session.requestId)) {
    return session.requestId!;
  }
  if (isValidUUID(session.conversationId)) {
    return session.conversationId!;
  }
  if (isValidUUID(session.id)) {
    return session.id!;
  }
  return null;
}
