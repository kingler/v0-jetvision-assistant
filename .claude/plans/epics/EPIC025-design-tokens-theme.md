# Epic ID: EPIC025
# Epic Name: Design Tokens and Theme System
# Parent Feature: [[F011-design-system|F011 - Design System Foundation]]
# Status: Implemented
# Priority: High

## Description
Comprehensive design token system that serves as the single source of truth for all visual properties including brand colors, typography scales, spacing, border radii, shadows, and animation timings. Tokens are defined in TypeScript and automatically generate Tailwind CSS theme configuration, supporting both light and dark color modes.

## Goals
- Establish a single source of truth for all visual design properties
- Integrate seamlessly with Tailwind CSS via theme generation
- Support dark/light mode with CSS custom properties
- Enable consistent branding across all UI surfaces

## User Stories
- [[US103-brand-colors-consistent|US103 - Brand colors applied consistently across all components]]
- [[US104-typography-responsive|US104 - Typography scales responsively across breakpoints]]
- [[US105-dark-mode-toggle|US105 - Dark mode toggle switches theme without page reload]]
- [[US106-design-tokens-tailwind|US106 - Design tokens generate Tailwind config automatically]]

## Acceptance Criteria Summary
- All color values are defined as design tokens, not hardcoded hex values
- Typography scale covers headings (h1-h6), body, caption, and overline variants
- Spacing scale follows a consistent mathematical ratio (4px base unit)
- Tailwind theme extends from generated token values
- Dark mode toggles via CSS custom properties with no flash of unstyled content
- All tokens are exported as typed TypeScript constants

## Technical Scope
- lib/design-system/tokens.ts - Core token definitions (colors, typography, spacing, radii, shadows)
- lib/design-system/tailwind-theme.ts - Tailwind theme generation from tokens
- lib/design-system/utils.ts - Utility functions for token consumption
- lib/design-system/index.ts - Barrel exports for design system
- app/globals.css - CSS custom properties and base styles
- tailwind.config.ts - Extended theme configuration
