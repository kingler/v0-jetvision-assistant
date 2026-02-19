# Task ID: TASK239
# Task Name: Handle Session Switch
# Parent User Story: [[US128-switch-between-sessions|US128 - Switch between chat sessions]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Implement session switching logic so that clicking a session card in the sidebar loads that session's messages, updates the active session state, and refreshes the chat interface to display the selected conversation.

## Acceptance Criteria
- Clicking a session card triggers message loading for that session
- Loading indicator is shown while messages are being fetched
- Chat interface updates to display the loaded messages
- Previous session's messages are cleared from the UI before new ones load
- Active session is highlighted in the sidebar
- Browser URL or state reflects the active session (optional)
- Switching is fast (<500ms for cached sessions)
- Unit tests verify the switch flow and state updates

## Implementation Details
- **File(s)**: `components/chat-sidebar.tsx`
- **Approach**: Add an `onClick` handler to each session card that calls a `switchSession(sessionId)` function. This function sets a loading state, calls the messages API (TASK232), restores chat state (TASK233), and updates the active session ID. Debounce rapid clicks to prevent race conditions.

## Dependencies
- [[TASK232-load-session-messages|TASK232]] (load-session-messages) for fetching messages
- [[TASK233-restore-chat-state|TASK233]] (restore-chat-state) for hydrating the chat
- [[TASK240-update-active-session|TASK240]] (update-active-session) for state management
