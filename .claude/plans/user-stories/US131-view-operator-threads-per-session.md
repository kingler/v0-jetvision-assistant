# User Story ID: US131
# Title: View Operator Threads per Session
# Parent Epic: [[EPIC031-sidebar-navigation|EPIC031 - Sidebar & Session Management UI]]
# Status: Implemented
# Priority: Medium
# Story Points: 3

## User Story
As an ISO agent, I want to see operator threads within each session, so I can track per-operator communication.

## Acceptance Criteria

### AC1: Per-Operator Thread Display
**Given** a session has messages from multiple operators
**When** the session is expanded in the sidebar or detail view
**Then** threads show per operator with the latest message preview and timestamp

## Tasks
- [[TASK244-group-messages-operator|TASK244 - Group messages by operator within each session]]
- [[TASK245-thread-summaries|TASK245 - Display thread summaries with latest message preview]]

## Technical Notes
- Operator threads grouped by operator_id from webhook event metadata
- Each thread shows: operator name, aircraft type, latest message preview (truncated)
- Thread count badge shows total messages per operator
- Clicking a thread scrolls to or filters chat to that operator's messages
- Thread data derived from avinode_webhook_events joined with session messages
