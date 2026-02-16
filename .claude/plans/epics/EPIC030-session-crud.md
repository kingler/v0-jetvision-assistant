# Epic ID: EPIC030
# Epic Name: Chat Session CRUD Operations
# Parent Feature: [[F013-chat-session-management|F013 - Chat Session Management]]
# Status: Implemented
# Priority: High

## Description
Full create, read, update, and delete lifecycle for chat sessions persisted in Supabase. Sessions maintain their message history across browser reloads, link to associated flight requests for contextual continuity, and support metadata updates for titles, status, and archival state.

## Goals
- Persist chat sessions and messages across browser reloads and device switches
- Link chat sessions to flight requests for contextual reference
- Manage session lifecycle including creation, resumption, archival, and deletion
- Provide API endpoints for session operations consumed by the frontend

## User Stories
- [[US123-create-new-session|US123 - Create a new chat session with optional flight request association]]
- [[US124-resume-existing-session|US124 - Resume an existing chat session with full message history loaded]]
- [[US125-delete-session|US125 - Delete a chat session and its associated messages]]
- [[US126-link-session-to-request|US126 - Link an existing session to a flight request after trip creation]]

## Acceptance Criteria Summary
- Chat sessions are persisted in Supabase with user_id, title, status, and timestamps
- Messages are stored with session_id foreign key, role, content, and metadata
- Session list API returns sessions ordered by last activity (most recent first)
- Deleting a session cascades to remove all associated messages
- Session can be linked to a flight request via request_id field
- API routes handle authentication and return appropriate error codes

## Technical Scope
- app/api/chat-sessions/ - REST API routes for session CRUD
- app/api/chat-sessions/messages/route.ts - Message persistence endpoints
- lib/conversation/message-persistence.ts - Persistence logic and Supabase queries
- Supabase tables - chat_sessions, chat_messages with RLS policies
