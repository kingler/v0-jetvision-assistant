# Task ID: TASK240
# Task Name: Update Active Session State
# Parent User Story: [[US128-switch-between-sessions|US128 - Set active session state on switch]]
# Status: Done
# Priority: High
# Estimate: 1h

## Description
Manage the active session state at the page level so that the chat interface, sidebar, and header all reflect which session is currently selected. This state drives conditional rendering and data fetching.

## Acceptance Criteria
- Active session ID is stored in page-level state (or context)
- Changing the active session updates all dependent components
- Active session persists across component re-renders
- Initial active session is set to the most recent session on page load
- New session creation automatically sets it as active
- State is accessible by sidebar, chat interface, and header components
- Unit tests verify state updates propagate correctly

## Implementation Details
- **File(s)**: `app/page.tsx`
- **Approach**: Use `useState` at the page component level to track `activeSessionId`. Pass the setter down to the sidebar and the value to the chat interface. When a session is clicked in the sidebar, call the setter. When a new session is created, set it as active immediately.

## Dependencies
- [[TASK239-handle-session-switch|TASK239]] (handle-session-switch) triggers the state update
- [[TASK231-init-empty-chat|TASK231]] (init-empty-chat) sets active session on creation
