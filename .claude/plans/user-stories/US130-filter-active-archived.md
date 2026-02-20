# User Story ID: US130
# Title: Filter Sessions by Active/Archived
# Parent Epic: [[EPIC031-sidebar-navigation|EPIC031 - Sidebar & Session Management UI]]
# Status: Implemented
# Priority: Medium
# Story Points: 2

## User Story
As an ISO agent, I want to filter sessions by active/archived, so I can focus on current work.

## Acceptance Criteria

### AC1: Tab-Based Session Filtering
**Given** sessions exist in both active and archived states
**When** I switch between Active and Archived tabs in the sidebar
**Then** only sessions matching the selected filter are displayed

## Tasks
- [[TASK243-sidebar-tab-filtering|TASK243 - Implement sidebar tab filtering for active and archived sessions]]

## Technical Notes
- Tabs component used for Active/Archived toggle
- Active sessions: status is 'active' or 'in_progress'
- Archived sessions: status is 'completed', 'cancelled', or manually archived
- Filter applied client-side on the loaded session list
- Tab state persisted in URL query parameter for deep linking
- Default view shows Active sessions
