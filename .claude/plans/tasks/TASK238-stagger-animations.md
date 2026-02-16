# Task ID: TASK238
# Task Name: Stagger Animations for Session List
# Parent User Story: [[US127-view-session-list|US127 - Apply Framer Motion stagger to session list]]
# Status: Done
# Priority: Medium
# Estimate: 1h

## Description
Apply Framer Motion staggered entrance animations to the session list in the sidebar, so that session cards animate in sequentially with a slight delay between each card for a polished user experience.

## Acceptance Criteria
- Session cards animate in with a staggered delay (e.g., 50ms between each)
- Animation includes fade-in and slide-up (opacity 0→1, y 10→0)
- Animation duration is short (200-300ms per card) to feel snappy
- Animations only play on initial load, not on re-renders
- Animation respects `prefers-reduced-motion` media query
- No layout shift during animation
- Visual verification confirms smooth stagger effect

## Implementation Details
- **File(s)**: `components/chat-sidebar.tsx`
- **Approach**: Wrap session list in Framer Motion `AnimatePresence` and use `motion.div` for each card with `variants` for staggered children. Use the motion presets from `lib/design-system/motion-presets.ts` if available, or define inline variants with `staggerChildren: 0.05`.

## Dependencies
- [[TASK237-sidebar-session-list|TASK237]] (sidebar-session-list) for the session list structure
- Framer Motion library must be installed
