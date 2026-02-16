# Task ID: TASK212
# Task Name: Focus Ring Utility
# Parent User Story: [[US111-focus-rings|US111 - Focus Ring Accessibility]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Implement a focusRing() utility that applies consistent focus ring styles to all interactive elements. The focus ring is visible only during keyboard navigation (focus-visible) and uses the brand accent color.

## Acceptance Criteria
- focusRing() returns Tailwind classes for focus-visible ring styling
- Ring uses brand accent color with 2px width and 2px offset
- Ring is only visible on :focus-visible (not on mouse click)
- High contrast mode: ring is visible against all backgrounds
- Utility supports customization: color, width, offset, style (ring vs outline)
- Applied consistently to buttons, inputs, links, checkboxes, radio buttons
- Meets WCAG 2.1 AA focus indicator requirements (3:1 contrast)
- Works in both light and dark themes

## Implementation Details
- **File(s)**: lib/design-system/utils.ts
- **Approach**: Create a focusRing(options?) function that returns a string of Tailwind classes: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2'. Allow options to override ring color, width, and offset. Export as a utility that can be composed with cn() in components.

## Dependencies
- [[TASK199-define-brand-tokens|TASK199]] (define-brand-tokens) for accent color token
- [[TASK204-tailwind-theme-generator|TASK204]] (tailwind-theme-generator) for ring color utility
