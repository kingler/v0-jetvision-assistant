# User Story ID: US128
# Title: Switch Between Sessions
# Parent Epic: [[EPIC031-sidebar-navigation|EPIC031 - Sidebar & Session Management UI]]
# Status: Implemented
# Priority: High
# Story Points: 2

## User Story
As an ISO agent, I want to switch between sessions quickly, so I can manage multiple requests.

## Acceptance Criteria

### AC1: Session Switching
**Given** I click a different session in the sidebar
**When** the session activates
**Then** the chat area loads that session's messages and updates the active state indicator

## Tasks
- [[TASK239-handle-session-switch|TASK239 - Handle session switch event and load target session data]]
- [[TASK240-update-active-session|TASK240 - Update active session state in sidebar and chat interface]]

## Technical Notes
- Active session highlighted in sidebar with primary color accent
- Previous session state preserved in memory for fast switching back
- Loading indicator shown briefly during message fetch
- Webhook subscriptions update to match the new session's trip ID
- URL updates to reflect active session for deep linking support
