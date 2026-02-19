# Task ID: TASK062
# Task Name: Sidebar tabs filter by active/archived status
# Parent User Story: [[US029-filter-requests-by-status|US029 - Filter flight requests by status]]
# Status: Done
# Priority: Medium
# Estimate: 2h

## Description
Implement tab-based filtering in the chat sidebar to separate active and archived flight requests. Users can switch between tabs to view currently active requests or review archived (completed/cancelled) ones.

## Acceptance Criteria
- Sidebar has "Active" and "Archived" tabs
- "Active" tab shows requests where archived_at is null
- "Archived" tab shows requests where archived_at is not null
- Tab switching does not trigger a full page reload (client-side filtering)
- Active tab is selected by default
- Each tab shows the count of requests in that category
- Tab styling uses design system tokens
- Smooth transition when switching between tabs
- Empty state message when no requests in the selected tab

## Implementation Details
- **File(s)**: `components/chat-sidebar.tsx`
- **Approach**: Add tab controls at the top of the sidebar request list. Use React state to track the active tab. Filter the requests array client-side based on the `archived_at` field. Display a count badge on each tab. Use the design system's Tabs component for consistent styling.

## Dependencies
- [[TASK060-archive-request|TASK060]] (archive-request) - Archiving functionality must exist
