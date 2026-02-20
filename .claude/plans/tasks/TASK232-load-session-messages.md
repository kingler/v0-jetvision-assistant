# Task ID: TASK232
# Task Name: Load Session Messages API
# Parent User Story: [[US124-resume-existing-session|US124 - Load messages for a chat session]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Implement a GET endpoint at `/api/chat-sessions/messages` that retrieves all messages for a given session ID, ordered chronologically. This supports session switching and page reload scenarios.

## Acceptance Criteria
- GET `/api/chat-sessions/messages?sessionId={id}` returns all messages for the session
- Messages are ordered by `created_at` ascending (oldest first)
- Response includes message role, content, metadata, and timestamps
- Pagination support via `limit` and `offset` query parameters (default: limit=100, offset=0)
- Returns empty array for sessions with no messages
- Returns 404 for non-existent session IDs
- Returns 401 for unauthenticated requests
- Returns 403 if session belongs to a different user
- Unit tests cover all response scenarios

## Implementation Details
- **File(s)**: `app/api/chat-sessions/messages/route.ts`
- **Approach**: Create a Next.js GET route handler. Parse `sessionId`, `limit`, and `offset` from query parameters. Verify session ownership via Clerk user ID. Query the `messages` table filtered by session ID with ordering and pagination. Return the message array.

## Dependencies
- [[TASK230-create-session-api|TASK230]] (create-session-api) for session existence
- [[TASK226-persist-system-messages|TASK226]] (persist-system-messages) for system messages to be included
