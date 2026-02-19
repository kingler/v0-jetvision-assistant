# User Story ID: US125
# Title: Delete Chat Session
# Parent Epic: [[EPIC030-session-crud|EPIC030 - Chat Session Lifecycle]]
# Status: Implemented
# Priority: Medium
# Story Points: 2

## User Story
As an ISO agent, I want to delete a session, so I can remove conversations I no longer need.

## Acceptance Criteria

### AC1: Session Deletion
**Given** a chat session exists in the sidebar
**When** I delete the session
**Then** it is removed from the sidebar list and deleted from the database

## Tasks
- [[TASK234-delete-session-api|TASK234 - Delete session and associated messages via API endpoint]]

## Technical Notes
- API endpoint: DELETE `/api/chat-sessions?sessionId={id}`
- Cascading delete removes all associated messages from the database
- Confirmation dialog shown before deletion to prevent accidental removal
- If the deleted session was active, the UI switches to the next available session
- Soft delete option available for future recovery features
