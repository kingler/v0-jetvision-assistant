# Task ID: TASK234
# Task Name: Delete Session API Endpoint
# Parent User Story: [[US125-delete-session|US125 - Delete a chat session via API]]
# Status: Done
# Priority: Medium
# Estimate: 2h

## Description
Implement a DELETE endpoint at `/api/chat-sessions` that soft-deletes or hard-deletes a chat session and its associated messages. The endpoint should verify ownership before deletion.

## Acceptance Criteria
- DELETE `/api/chat-sessions?sessionId={id}` removes the session
- Associated messages are cascade-deleted or soft-deleted
- Session ownership is verified against the authenticated user
- Returns 200 on successful deletion with `{ deleted: true, sessionId }`
- Returns 404 for non-existent sessions
- Returns 403 if session belongs to a different user
- Returns 401 for unauthenticated requests
- Sidebar is updated to remove the deleted session
- Unit tests cover success, auth, and not-found scenarios

## Implementation Details
- **File(s)**: `app/api/chat-sessions/route.ts`
- **Approach**: Add a DELETE handler to the existing chat-sessions route. Parse session ID from query parameters. Verify ownership via Clerk auth. Delete from the `chat_sessions` table (cascade will handle messages if configured, otherwise delete messages first).

## Dependencies
- [[TASK230-create-session-api|TASK230]] (create-session-api) for the route file structure
- Database cascade delete configuration on messages table
