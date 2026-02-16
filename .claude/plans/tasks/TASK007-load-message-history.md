# Task ID: TASK007
# Task Name: Load Message History
# Parent User Story: [[US003-view-message-history|US003 - View message history when returning to a session]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Implement the GET endpoint and client-side fetching to load previous messages when a user returns to an existing chat session.

## Acceptance Criteria
- GET `/api/chat-sessions/messages?sessionId=xxx` returns all messages for a session
- Messages are returned in chronological order (oldest first)
- Response includes message content, role, timestamps, and any structured data
- Client fetches messages on session load / page mount
- Loading state is shown while messages are being fetched
- Empty state is shown for sessions with no messages
- Pagination or cursor-based loading is supported for long histories

## Implementation Details
- **File(s)**: `app/api/chat-sessions/messages/route.ts`
- **Approach**: In the API route, query Supabase `messages` table filtered by `session_id`, ordered by `created_at ASC`. Return the messages as JSON. On the client, call this endpoint in a `useEffect` on mount or when `sessionId` changes. Populate the message list state with the returned data. Include tool call results and structured data stored in the `metadata` JSON column.

## Dependencies
- [[TASK009-persist-messages-database|TASK009]] (messages must be persisted to load them)
