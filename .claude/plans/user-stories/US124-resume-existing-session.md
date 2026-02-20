# User Story ID: US124
# Title: Resume Existing Chat Session
# Parent Epic: [[EPIC030-session-crud|EPIC030 - Chat Session Lifecycle]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As an ISO agent, I want to resume an existing session, so I can continue where I left off.

## Acceptance Criteria

### AC1: Session Resumption
**Given** existing chat sessions are listed in the sidebar
**When** I click on a session entry
**Then** the full message history loads and the chat context restores to its previous state

## Tasks
- [[TASK232-load-session-messages|TASK232 - Load session messages from the API on session selection]]
- [[TASK233-restore-chat-state|TASK233 - Restore full chat state including linked request context]]

## Technical Notes
- API endpoint: GET `/api/chat-sessions/messages?sessionId={id}`
- Messages loaded with pagination (latest 50 first, load more on scroll)
- Chat context includes linked flight request data if present
- Message persistence handled by `lib/conversation/message-persistence.ts`
- Loading state shown with skeleton components during fetch
