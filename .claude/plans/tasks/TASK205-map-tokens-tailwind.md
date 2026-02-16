# Task ID: TASK205
# Task Name: Map Tokens to Tailwind Utilities
# Parent User Story: [[US106-design-tokens-tailwind|US106 - Tailwind Design Token Integration]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Create helper utilities that map design token values to Tailwind utility class names. These helpers enable components to reference tokens by name and get the correct Tailwind class.

## Acceptance Criteria
- tokenToClass(category, token) returns the Tailwind utility class string
- Supports color tokens: tokenToClass('bg', 'brand.primary') returns 'bg-brand-primary'
- Supports spacing tokens: tokenToClass('p', 'md') returns 'p-4'
- Supports typography tokens: tokenToClass('text', 'lg') returns 'text-lg'
- Type-safe: category and token parameters are typed, invalid combinations error at compile time
- Includes cn() utility for merging conditional token classes
- Helper functions are tree-shakeable
- Complete mapping documentation in JSDoc comments

## Implementation Details
- **File(s)**: lib/design-system/tailwind-helpers.ts
- **Approach**: Create typed mapping objects that connect token names to Tailwind class names. Export helper functions that accept token identifiers and return class strings. Use TypeScript template literal types for type safety. Include a cn() utility that wraps clsx + tailwind-merge for conditional class composition.

## Dependencies
- [[TASK199-define-brand-tokens|TASK199]] (define-brand-tokens)
- [[TASK204-tailwind-theme-generator|TASK204]] (tailwind-theme-generator)
- clsx and tailwind-merge packages
