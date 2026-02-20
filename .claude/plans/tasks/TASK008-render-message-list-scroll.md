# Task ID: TASK008
# Task Name: Render Message List with Auto-Scroll
# Parent User Story: [[US003-view-message-history|US003 - View message history when returning to a session]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Render the full message list with auto-scroll behavior that keeps the newest messages visible. Support both historical messages and incoming streaming messages.

## Acceptance Criteria
- Messages are rendered in chronological order (oldest at top, newest at bottom)
- Chat auto-scrolls to the bottom when new messages arrive
- Auto-scroll is disabled when user manually scrolls up to read history
- Auto-scroll re-engages when user scrolls back to near the bottom
- Smooth scroll animation for new message arrivals
- Performance is maintained with large message histories (100+ messages)

## Implementation Details
- **File(s)**: `components/message-list.tsx`
- **Approach**: Use a scrollable container with `overflow-y-auto`. Track scroll position with `useRef` and an `IntersectionObserver` on a sentinel element at the bottom. When the sentinel is visible, auto-scroll on new messages. When the user scrolls up (sentinel not visible), pause auto-scroll. Use `scrollIntoView({ behavior: 'smooth' })` for new messages. Virtualize the list with a library if performance becomes an issue.

## Dependencies
- [[TASK003-display-user-message-bubble|TASK003]] (UserMessage component for user bubbles)
- [[TASK007-load-message-history|TASK007]] (message history data to render)
