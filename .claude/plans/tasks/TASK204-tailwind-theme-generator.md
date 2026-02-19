# Task ID: TASK204
# Task Name: Tailwind Theme Generator
# Parent User Story: [[US106-design-tokens-tailwind|US106 - Tailwind Design Token Integration]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Create a utility that generates Tailwind CSS configuration from the design system tokens. This ensures Tailwind utility classes are always in sync with the design token definitions.

## Acceptance Criteria
- Generates complete Tailwind theme.extend configuration from tokens
- Covers colors, spacing, fontSize, borderRadius, boxShadow, fontFamily
- Output is a valid Tailwind theme configuration object
- Supports CSS variable references for dynamic theming
- Generated config can be spread into tailwind.config.ts
- Includes custom color utilities (e.g., bg-brand-primary, text-brand-secondary)
- Handles both light and dark mode color mappings
- Generates both the theme config and safelist for dynamic classes

## Implementation Details
- **File(s)**: lib/design-system/tailwind-theme.ts
- **Approach**: Create a generateTailwindTheme() function that reads the design tokens and produces a theme configuration object. Map token categories to Tailwind theme keys (colors -> theme.colors, spacing -> theme.spacing, etc.). Use CSS variable syntax (e.g., `var(--brand-primary)`) for colors to enable runtime theme switching. Export the generated config for use in tailwind.config.ts.

## Dependencies
- [[TASK199-define-brand-tokens|TASK199]] (define-brand-tokens)
- [[TASK203-dark-mode-css-vars|TASK203]] (dark-mode-css-vars) for variable naming
