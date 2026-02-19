# User Story ID: US029
# Title: Filter Requests by Status
# Parent Epic: [[EPIC006-request-lifecycle|EPIC006 - Request Lifecycle Management]]
# Status: Implemented
# Priority: Medium
# Story Points: 2

## User Story
As an ISO agent, I want to filter requests by status, so that I can find active, completed, or cancelled requests quickly.

## Acceptance Criteria

### AC1: Status Filtering
**Given** multiple requests exist
**When** I filter by status
**Then** only matching requests show

### AC2: Tab-Based Navigation
**Given** sidebar tabs exist
**When** I switch tabs (Active/Archived)
**Then** the list updates accordingly

## Tasks
- [[TASK062-filter-requests-status|TASK062 - Implement status-based filtering and tab navigation (Active/Archived) in the chat sidebar request list]]

## Technical Notes
- The chat sidebar component (`components/chat-sidebar.tsx`) provides tab-based navigation between Active and Archived requests
- Active tab shows requests with statuses: created, in_progress, awaiting_quotes, quotes_received, proposal_sent
- Archived tab shows requests with statuses: completed, cancelled, and manually archived
- Filtering is performed client-side for responsiveness, with server-side filtering available for large datasets
- The tab UI uses the design system's Tabs component (`components/ui/tabs.tsx`) for consistent styling
