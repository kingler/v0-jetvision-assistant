# Task ID: TASK216
# Task Name: Responsive Breakpoints
# Parent User Story: [[US114-responsive-layouts|US114 - Responsive Layout System]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Define responsive breakpoint utilities and media query helpers that align with the Tailwind default breakpoints. These utilities are used for programmatic responsive behavior beyond CSS media queries.

## Acceptance Criteria
- Breakpoint constants: sm(640px), md(768px), lg(1024px), xl(1280px), 2xl(1536px)
- mediaQuery(breakpoint) returns the CSS media query string
- useBreakpoint(breakpoint) hook returns true when viewport matches
- Breakpoints match Tailwind's default configuration exactly
- Container query support for component-level responsiveness
- Type-safe breakpoint names via TypeScript enum or union type
- Exported from lib/design-system/utils.ts
- Works with SSR (graceful fallback)

## Implementation Details
- **File(s)**: lib/design-system/utils.ts
- **Approach**: Define BREAKPOINTS constant object with named breakpoints and pixel values. Create mediaQuery() that returns `(min-width: ${px}px)`. Create useBreakpoint() hook using matchMedia. Include comparison helpers: isAbove(breakpoint), isBelow(breakpoint), isBetween(min, max). All hooks are SSR-safe with typeof window checks.

## Dependencies
- [[TASK199-define-brand-tokens|TASK199]] (define-brand-tokens) for consistent spacing
- React hooks for useBreakpoint
