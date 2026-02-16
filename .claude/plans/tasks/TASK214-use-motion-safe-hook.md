# Task ID: TASK214
# Task Name: useMotionSafe Hook
# Parent User Story: [[US113-respect-reduced-motion|US113 - Motion Accessibility]]
# Status: Done
# Priority: Medium
# Estimate: 1h

## Description
Implement a useMotionSafe hook that respects the user's prefers-reduced-motion OS preference. The hook returns a boolean indicating whether animations should be applied.

## Acceptance Criteria
- useMotionSafe() returns true when prefers-reduced-motion is 'no-preference'
- useMotionSafe() returns false when prefers-reduced-motion is 'reduce'
- Reactively updates when the user changes their OS setting
- SSR-safe: defaults to true (motion allowed) during server rendering
- Uses matchMedia API for efficient event-driven detection
- Cleans up listeners on component unmount
- Exported from lib/design-system/motion-presets.ts alongside motion presets

## Implementation Details
- **File(s)**: lib/design-system/motion-presets.ts
- **Approach**: Use window.matchMedia('(prefers-reduced-motion: reduce)') to detect the preference. Return !matchMedia.matches (true when motion is allowed). Listen to 'change' events for reactive updates. Include motion preset objects (fadeIn, slideUp, scaleIn) that return empty objects when motion is not safe.

## Dependencies
- React hooks (useState, useEffect)
