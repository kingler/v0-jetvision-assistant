# Task ID: TASK235
# Task Name: Link Session to Request
# Parent User Story: [[US126-link-session-to-request|US126 - Associate chat session with flight request]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
After a trip is created via the Avinode MCP tool, associate the current chat session with the resulting flight request ID. This enables the system to route webhook events (quotes, messages) to the correct chat session.

## Acceptance Criteria
- PATCH `/api/chat-sessions?sessionId={id}` accepts a `requestId` body field
- Session record is updated with the linked request ID
- Session title is auto-updated to include route info (e.g., "KTEB to KLAX")
- Subsequent webhook events for the request are routed to this session
- Returns 200 with updated session data
- Returns 400 if request ID is invalid or already linked to another session
- Unit tests cover linking, duplicate linking, and validation

## Implementation Details
- **File(s)**: `app/api/chat-sessions/route.ts`
- **Approach**: Add a PATCH handler to the chat-sessions route. Accept `requestId` in the request body. Update the `chat_sessions` table to set the `request_id` foreign key. Optionally update the session title based on the request's route information.

## Dependencies
- [[TASK230-create-session-api|TASK230]] (create-session-api) for the route file
- [[TASK040-call-create-trip-mcp|TASK040]] (call-create-trip-mcp) for trip creation context
