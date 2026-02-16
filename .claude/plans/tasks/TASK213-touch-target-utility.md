# Task ID: TASK213
# Task Name: Touch Target Utility
# Parent User Story: [[US112-touch-targets|US112 - Touch Target Accessibility]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Implement a touchTarget() utility that ensures all interactive elements meet the 48px minimum touch target size recommended by WCAG and mobile platform guidelines. The utility adds invisible padding when the visual element is smaller.

## Acceptance Criteria
- touchTarget() returns classes ensuring 48x48px minimum touch area
- Visual appearance is not affected (extra hit area is invisible)
- Works with buttons, links, checkboxes, radio buttons, and icons
- Supports override for specific minimum sizes (e.g., 44px for tight layouts)
- Uses pseudo-element technique to expand touch area without affecting layout
- Applied to all interactive components in the design system
- Verified on actual touch devices (iOS Safari, Android Chrome)
- Does not interfere with adjacent clickable elements

## Implementation Details
- **File(s)**: lib/design-system/utils.ts
- **Approach**: Create a touchTarget(minSize = 48) function that returns Tailwind classes using a relative positioning + ::after pseudo-element approach. The pseudo-element is positioned absolutely with min-width/min-height of 48px, centered on the element. This expands the clickable area without changing visual layout. Export as composable utility.

## Dependencies
- [[TASK199-define-brand-tokens|TASK199]] (define-brand-tokens) for spacing tokens
