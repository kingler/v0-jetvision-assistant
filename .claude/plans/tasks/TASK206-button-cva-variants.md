# Task ID: TASK206
# Task Name: Button CVA Variants
# Parent User Story: [[US107-button-variants|US107 - Button Component Variants]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Implement the Button component with 8 visual variants using Class Variance Authority (CVA). The button supports default, destructive, outline, secondary, ghost, link, brand, and premium variants.

## Acceptance Criteria
- Button uses CVA for variant management
- 8 variants: default, destructive, outline, secondary, ghost, link, brand, premium
- default: Primary brand color background with white text
- destructive: Red/error background for dangerous actions
- outline: Bordered with transparent background
- secondary: Muted background with darker text
- ghost: No background, hover reveals subtle fill
- link: Styled as inline text link with underline
- brand: Brand gradient background for CTAs
- premium: Gold/premium styling for upgrade actions
- All variants use design system tokens for colors
- All variants have hover, focus, active, and disabled states

## Implementation Details
- **File(s)**: components/ui/button.tsx
- **Approach**: Use cva() from class-variance-authority to define buttonVariants with a variants object containing 'variant' and 'size' keys. Each variant maps to Tailwind classes using design token utilities. Export both the Button component (using React.forwardRef) and the buttonVariants for reuse. Include asChild prop support via Radix Slot.

## Dependencies
- [[TASK199-define-brand-tokens|TASK199]] (define-brand-tokens)
- [[TASK204-tailwind-theme-generator|TASK204]] (tailwind-theme-generator)
- class-variance-authority package
- @radix-ui/react-slot for asChild
