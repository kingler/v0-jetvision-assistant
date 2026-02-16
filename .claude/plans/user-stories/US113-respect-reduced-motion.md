# User Story ID: US113
# Title: Respect Reduced Motion Preference
# Parent Epic: [[EPIC027-accessibility-responsive|EPIC027 - Accessibility & Responsiveness]]
# Status: Implemented
# Priority: Medium
# Story Points: 2

## User Story
As a user with motion sensitivity, I want animations disabled when I prefer reduced motion.

## Acceptance Criteria

### AC1: Reduced Motion Disables Animations
**Given** the user has set prefers-reduced-motion in their OS settings
**When** the useMotionSafe() hook returns false
**Then** all Framer Motion animations are disabled or replaced with instant transitions

## Tasks
- [[TASK214-use-motion-safe-hook|TASK214 - Implement useMotionSafe hook that reads prefers-reduced-motion media query]]
- [[TASK215-guard-animations|TASK215 - Guard all Framer Motion animations with useMotionSafe check]]

## Technical Notes
- `useMotionSafe` hook located in design system utilities
- Returns boolean indicating if animations should play
- All Framer Motion `animate`, `exit`, and `transition` props conditional on hook value
- Motion presets defined in `lib/design-system/motion-presets.ts`
- CSS transitions also guarded via `@media (prefers-reduced-motion: reduce)` in globals.css
