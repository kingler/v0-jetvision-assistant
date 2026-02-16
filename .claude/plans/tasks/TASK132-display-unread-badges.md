# Task ID: TASK132
# Task Name: Display Unread Badges
# Parent User Story: [[US067-view-unread-message-count|US067 - Unread Message Badges]]
# Status: Done
# Priority: Medium
# Estimate: 1h

## Description
Create and display badge components on sidebar items to show the number of unread messages for each operator thread. Badges should be visually prominent to draw attention to new messages.

## Acceptance Criteria
- Badge displays unread count as a number
- Badge is hidden when count is zero
- Badge shows "9+" for counts greater than 9
- Badge uses attention-grabbing color (e.g., red or accent color from design system)
- Badge is positioned correctly on sidebar items
- Badge animates briefly when count increases
- Responsive sizing for different sidebar widths

## Implementation Details
- **File(s)**: components/chat-sidebar.tsx
- **Approach**: Create a small Badge component (or use an existing one from the UI library) that accepts a count prop. Render the badge next to each operator thread item in the sidebar. Conditionally show/hide based on count. Apply design system tokens for colors and spacing. Add a subtle scale animation on count change using CSS transitions or framer-motion.

## Dependencies
- [[TASK131-track-unread-counts|TASK131]] (unread count tracking provides the count values)
