# User Story ID: US126
# Title: Link Session to Flight Request
# Parent Epic: [[EPIC030-session-crud|EPIC030 - Chat Session Lifecycle]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As the system, I want to link sessions to flight requests, so chat context follows the request lifecycle.

## Acceptance Criteria

### AC1: Session-Request Linking
**Given** a flight request is created during a chat conversation
**When** the Avinode trip is created via MCP tools
**Then** the chat session links to the flight request via requestId in the database

## Tasks
- [[TASK235-link-session-request|TASK235 - Link chat session to flight request when trip is created]]
- [[TASK236-persist-session-link|TASK236 - Persist session-to-request link in the database]]

## Technical Notes
- `chat_sessions` table has `request_id` foreign key to `requests` table
- Link established when `create_trip` MCP tool returns trip_id
- Session title updates to include route (e.g., "KTEB -> KLAX")
- Linked request data loaded when session resumes
- Enables session filtering by request status and stage
