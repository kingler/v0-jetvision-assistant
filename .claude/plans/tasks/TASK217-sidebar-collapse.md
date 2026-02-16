# Task ID: TASK217
# Task Name: Sidebar Collapse
# Parent User Story: [[US114-responsive-layouts|US114 - Responsive Layout System]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Implement responsive sidebar behavior with a hamburger menu toggle on mobile viewports. The sidebar collapses to an overlay drawer on mobile and remains visible on desktop.

## Acceptance Criteria
- Desktop (>768px): Sidebar is always visible as a fixed panel
- Mobile (<=768px): Sidebar is hidden by default, shown as overlay drawer
- Hamburger menu button appears in the header on mobile
- Sidebar opens with slide-in animation from the left
- Backdrop overlay dims the main content when sidebar is open
- Clicking backdrop or selecting a chat closes the sidebar
- Sidebar state persists during the session (remembers collapsed state on desktop)
- Smooth transition animation (200-300ms ease-out)
- Focus is trapped within sidebar when open on mobile

## Implementation Details
- **File(s)**: components/chat-sidebar.tsx
- **Approach**: Use useIsMobile() to determine rendering mode. On mobile, wrap sidebar content in a Drawer component (from vaul or custom). Add a hamburger button to the chat header that toggles sidebar visibility. Use React state for open/close with Framer Motion or CSS transitions for animation. Include backdrop with onClick handler to close.

## Dependencies
- [[TASK209-use-is-mobile-hook|TASK209]] (use-is-mobile-hook)
- [[TASK215-guard-animations|TASK215]] (guard-animations) for motion-safe transitions
