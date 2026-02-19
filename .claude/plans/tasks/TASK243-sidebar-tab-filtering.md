# Task ID: TASK243
# Task Name: Sidebar Tab Filtering
# Parent User Story: [[US130-filter-active-archived|US130 - Active/Archived tab switching in sidebar]]
# Status: Done
# Priority: Medium
# Estimate: 2h

## Description
Implement tab-based filtering in the chat sidebar to allow users to switch between viewing active sessions and archived sessions. Active sessions are those with ongoing or recent conversations; archived sessions are completed or stale.

## Acceptance Criteria
- Two tabs are rendered at the top of the sidebar: "Active" and "Archived"
- "Active" tab is selected by default
- Switching tabs filters the session list to show only matching sessions
- Active sessions: status is not 'completed' or 'archived'
- Archived sessions: status is 'completed' or 'archived'
- Tab switch is instant (no API call; filter in memory)
- Tab indicator animates smoothly between positions
- Empty state message differs per tab ("No active sessions" vs "No archived sessions")
- Unit tests verify filtering logic for both tabs

## Implementation Details
- **File(s)**: `components/chat-sidebar.tsx`
- **Approach**: Use the `Tabs` component from `components/ui/tabs.tsx`. Store the active tab in local state. Filter the sessions array based on the selected tab before rendering. Use Framer Motion `layoutId` for the tab indicator animation.

## Dependencies
- [[TASK237-sidebar-session-list|TASK237]] (sidebar-session-list) for the session list
- Tab component from `components/ui/tabs.tsx`
