# User Story ID: US123
# Title: Create New Chat Session
# Parent Epic: [[EPIC030-session-crud|EPIC030 - Chat Session Lifecycle]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As an ISO agent, I want to create a new chat session, so I can start a new conversation.

## Acceptance Criteria

### AC1: New Chat Session Creation
**Given** I click the "New Chat" button in the sidebar
**When** the session creation completes
**Then** a new session appears in the sidebar list and the chat area is empty and ready for input

## Tasks
- [[TASK230-create-session-api|TASK230 - Create new chat session via API endpoint]]
- [[TASK231-init-empty-chat|TASK231 - Initialize empty chat state for the new session]]

## Technical Notes
- API endpoint: POST `/api/chat-sessions`
- Session stored in Supabase `chat_sessions` table
- Session includes: id, user_id, created_at, updated_at, status, title
- Title auto-generates from first user message or defaults to "New Chat"
- Active session state managed in chat interface component
- Sidebar updates optimistically before API confirmation
