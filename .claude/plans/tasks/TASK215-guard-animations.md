# Task ID: TASK215
# Task Name: Guard Animations
# Parent User Story: [[US113-respect-reduced-motion|US113 - Motion Accessibility]]
# Status: Done
# Priority: Medium
# Estimate: 2h

## Description
Conditionally apply Framer Motion animation props based on the useMotionSafe hook. When reduced motion is preferred, animations are replaced with instant state changes.

## Acceptance Criteria
- Animation props are only applied when useMotionSafe() returns true
- When reduced motion is preferred, elements appear instantly (no animation)
- Framer Motion variants are wrapped with motion-safe guard
- Helper function safeMotionProps(props) returns props or empty object
- Applied to all animated components: modals, drawers, tooltips, page transitions
- No layout shift when animations are disabled
- Tested with prefers-reduced-motion: reduce enabled

## Implementation Details
- **File(s)**: Multiple components that use Framer Motion
- **Approach**: Create a safeMotionProps(props, isMotionSafe) helper that returns the animation props when safe, or { initial: false, animate: false, exit: false } when not. Update animated components to use this helper. Also create a SafeMotion wrapper component that conditionally renders motion.div or plain div based on the hook.

## Dependencies
- [[TASK214-use-motion-safe-hook|TASK214]] (use-motion-safe-hook)
- Framer Motion package
