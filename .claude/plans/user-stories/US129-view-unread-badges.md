# User Story ID: US129
# Title: Unread Message Badges
# Parent Epic: [[EPIC031-sidebar-navigation|EPIC031 - Sidebar & Session Management UI]]
# Status: Implemented
# Priority: Medium
# Story Points: 2

## User Story
As an ISO agent, I want unread message badges, so I know which sessions have new activity.

## Acceptance Criteria

### AC1: Unread Count Display
**Given** unread messages exist in inactive sessions
**When** the sidebar renders
**Then** affected sessions show unread count badges with the number of new messages

## Tasks
- [[TASK241-track-unread-session|TASK241 - Track unread message count per session]]
- [[TASK242-display-badge|TASK242 - Display unread count badge component on session items]]

## Technical Notes
- Unread count tracked per session in local state
- Count increments when webhook events arrive for non-active sessions
- Count resets to zero when session becomes active (user clicks it)
- Badge uses destructive/accent color for visibility
- Badge hidden when count is zero
- Count persisted in session metadata for cross-page consistency
