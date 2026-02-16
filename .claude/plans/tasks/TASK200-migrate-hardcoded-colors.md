# Task ID: TASK200
# Task Name: Migrate Hardcoded Colors to Design Tokens
# Parent User Story: [[US103-brand-colors-consistent|US103 - Design System Brand Tokens]]
# Status: Done
# Priority: High
# Estimate: 8h

## Description
Migrate approximately 1,140 hardcoded color values across 27 files to use design system tokens. This ensures visual consistency and enables theme switching by replacing inline hex/rgb/hsl values with token references.

## Acceptance Criteria
- All hardcoded hex colors (#xxx, #xxxxxx) replaced with design token references
- All hardcoded rgb/rgba values replaced with design token references
- All hardcoded hsl/hsla values replaced with design token references
- Tailwind arbitrary color values ([#xxx]) replaced with token-based utilities
- No visual regressions after migration (manual visual review)
- 27 files updated across components/, app/, and lib/ directories
- Remaining hardcoded colors documented with justification (e.g., third-party requirements)
- ESLint rule or grep check confirms no new hardcoded colors introduced

## Implementation Details
- **File(s)**: Multiple components across 27 files
- **Approach**: Use grep to identify all hardcoded colors. Map each to the appropriate design token. Replace using find-and-replace with manual review for each file. Test each component visually after migration. Create a mapping guide (old color -> new token) for reference.

## Dependencies
- [[TASK199-define-brand-tokens|TASK199]] (define-brand-tokens)
- [[TASK204-tailwind-theme-generator|TASK204]] (tailwind-theme-generator) for Tailwind utility mapping
