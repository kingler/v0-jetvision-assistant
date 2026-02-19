# Task ID: TASK236
# Task Name: Persist Session-Request Link
# Parent User Story: [[US126-link-session-to-request|US126 - Store sessionId-requestId mapping in database]]
# Status: Done
# Priority: High
# Estimate: 1h

## Description
Ensure the session-to-request mapping is durably stored in the database so that the association survives server restarts and can be queried to route incoming webhook events to the correct session.

## Acceptance Criteria
- `chat_sessions` table has a `request_id` column (nullable, foreign key to `requests`)
- Mapping is persisted atomically with the session update
- Mapping can be queried by request ID to find the associated session
- Index exists on `request_id` for efficient webhook event routing lookups
- Database migration or schema update includes the column if not present
- Unit tests verify the persistence and lookup of the mapping

## Implementation Details
- **File(s)**: `app/api/chat-sessions/route.ts`
- **Approach**: In the PATCH handler from TASK235, ensure the Supabase update includes the `request_id` field. Add a helper function `getSessionByRequestId(requestId)` that queries `chat_sessions` where `request_id` matches. This is used by the webhook handler to route events.

## Dependencies
- [[TASK235-link-session-request|TASK235]] (link-session-request) for the API endpoint
- Database schema must support the `request_id` column
