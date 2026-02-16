# Task ID: TASK230
# Task Name: Create Session API Endpoint
# Parent User Story: [[US123-create-new-session|US123 - Create new chat session via API]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Implement a POST endpoint at `/api/chat-sessions` that creates a new chat session record in the database. The endpoint should accept an optional title, return the new session ID, and associate the session with the authenticated user.

## Acceptance Criteria
- POST `/api/chat-sessions` creates a new session record in the database
- Request body accepts optional `title` field (defaults to "New Chat")
- Response returns `{ sessionId, title, createdAt }` with 201 status
- Session is associated with the authenticated user via Clerk JWT
- Unauthenticated requests return 401
- Invalid request bodies return 400 with descriptive error message
- Unit tests cover success, auth failure, and validation cases

## Implementation Details
- **File(s)**: `app/api/chat-sessions/route.ts`
- **Approach**: Create a Next.js route handler for POST requests. Validate the Clerk auth token, extract user ID, insert a new row into the `chat_sessions` table via Supabase, and return the created session data. Wrap in try/catch for error handling.

## Dependencies
- Supabase `chat_sessions` table must exist
- Clerk authentication middleware must be configured
