# Task ID: TASK241
# Task Name: Track Unread Messages Per Session
# Parent User Story: [[US129-view-unread-badges|US129 - Track unread message count per session]]
# Status: Done
# Priority: Medium
# Estimate: 2h

## Description
Implement unread message tracking for each chat session. When a webhook event or agent notification arrives for a session that is not currently active, increment the unread count for that session.

## Acceptance Criteria
- Each session maintains an unread message count
- Count increments when a message arrives for an inactive session
- Count resets to zero when the session becomes active (user switches to it)
- Count persists across component re-renders (stored in state or context)
- New sessions start with zero unread messages
- System messages (quotes, operator messages) increment the count
- Unit tests verify increment, reset, and persistence behavior

## Implementation Details
- **File(s)**: `components/chat-sidebar.tsx`
- **Approach**: Maintain a `Map<string, number>` of session ID to unread count in the sidebar state. When a webhook event arrives, check if the target session is the active session. If not, increment the count. When a session is switched to, reset its count to zero. Expose the count to the session card for badge rendering.

## Dependencies
- [[TASK240-update-active-session|TASK240]] (update-active-session) to determine which session is active
- [[TASK221-handle-operator-message-events|TASK221]] (handle-operator-message-events) for incoming events
