# Task ID: TASK207
# Task Name: Button Size Variants
# Parent User Story: [[US107-button-variants|US107 - Button Component Variants]]
# Status: Done
# Priority: Medium
# Estimate: 1h

## Description
Add size variants to the Button component including default, sm, lg, xl, icon, and icon-sm sizes. Each size adjusts padding, font size, height, and minimum touch target.

## Acceptance Criteria
- default size: h-10, px-4, text-sm (standard button)
- sm size: h-8, px-3, text-xs (compact button)
- lg size: h-12, px-6, text-base (large button)
- xl size: h-14, px-8, text-lg (extra large for CTAs)
- icon size: h-10, w-10, p-0 (square icon button)
- icon-sm size: h-8, w-8, p-0 (small square icon button)
- All sizes maintain 48px minimum touch target on mobile (via padding or min-height)
- Size variants compose correctly with visual variants
- Default size is 'default' when not specified

## Implementation Details
- **File(s)**: components/ui/button.tsx
- **Approach**: Add 'size' key to the CVA variants object with entries for each size. Each size maps to Tailwind height, padding, and text-size classes. Ensure the defaultVariants includes size: 'default'. Update the ButtonProps type to include size as an optional prop.

## Dependencies
- [[TASK206-button-cva-variants|TASK206]] (button-cva-variants)
- [[TASK213-touch-target-utility|TASK213]] (touch-target-utility) for mobile touch targets
