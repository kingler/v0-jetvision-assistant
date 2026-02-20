# Task ID: TASK242
# Task Name: Display Unread Count Badge
# Parent User Story: [[US129-view-unread-badges|US129 - Render unread count badge on session cards]]
# Status: Done
# Priority: Medium
# Estimate: 1h

## Description
Render a numeric badge on session cards in the sidebar that displays the count of unread messages. The badge should be visually prominent and disappear when the count is zero.

## Acceptance Criteria
- Badge renders on session cards when unread count is greater than zero
- Badge displays the numeric count (e.g., "3")
- Counts above 99 display as "99+"
- Badge is positioned at the top-right corner of the session card
- Badge uses the design system accent color for visibility
- Badge has a subtle scale-in animation when appearing
- Badge disappears (with fade-out) when count resets to zero
- Unit tests verify rendering, threshold display, and visibility logic

## Implementation Details
- **File(s)**: `components/chat-sidebar.tsx`
- **Approach**: Add a conditional badge element inside each session card component. Read the unread count from the tracking state (TASK241). Use Framer Motion `AnimatePresence` for enter/exit animations. Style with design system tokens for the accent background color and white text.

## Dependencies
- [[TASK241-track-unread-session|TASK241]] (track-unread-session) provides the unread counts
- [[TASK237-sidebar-session-list|TASK237]] (sidebar-session-list) for the session card structure
