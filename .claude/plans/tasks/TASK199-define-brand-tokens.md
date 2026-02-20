# Task ID: TASK199
# Task Name: Define Brand Tokens
# Parent User Story: [[US103-brand-colors-consistent|US103 - Design System Brand Tokens]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Define the complete brand color palette and design tokens in a centralized tokens.ts file. These tokens serve as the single source of truth for all colors, spacing, typography, and other visual properties used across the application.

## Acceptance Criteria
- Brand primary, secondary, and accent color definitions with full shade scales (50-950)
- Semantic color tokens: success, warning, error, info mapped to brand palette
- Surface colors: background, foreground, card, popover, muted, border
- Text colors: primary, secondary, muted, inverse
- Color values defined in oklch for perceptual uniformity
- Tokens exported as typed constants with TypeScript inference
- Token naming follows design system conventions (category.property.variant)
- All tokens documented with JSDoc comments describing usage

## Implementation Details
- **File(s)**: lib/design-system/tokens.ts
- **Approach**: Define a tokens object with nested categories (colors, spacing, typography, radii, shadows). Colors use oklch values for better perceptual consistency. Export individual token groups and a combined tokens object. Include both light and dark theme token sets.

## Dependencies
- Design system specification/brand guidelines
- oklch color space understanding
