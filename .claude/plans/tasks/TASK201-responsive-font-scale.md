# Task ID: TASK201
# Task Name: Responsive Font Scale
# Parent User Story: [[US104-typography-responsive|US104 - Responsive Typography]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Implement a clamp-based responsive font scaling system that smoothly scales typography between minimum and maximum sizes based on viewport width. This eliminates the need for breakpoint-specific font size overrides.

## Acceptance Criteria
- Font scale uses CSS clamp() for smooth viewport-based scaling
- Minimum font size respects accessibility (16px body minimum)
- Scale includes sizes: xs, sm, base, lg, xl, 2xl, 3xl, 4xl, 5xl
- Each size has defined min, preferred (vw-based), and max values
- Line heights are paired with each font size for optimal readability
- Font scale tokens are exported from the design system
- Works correctly across all supported viewports (320px to 1920px+)
- No text overflow or truncation at any viewport size

## Implementation Details
- **File(s)**: lib/design-system/tokens.ts
- **Approach**: Define a fontScale object in tokens that maps size names to clamp() values. Example: `base: 'clamp(1rem, 0.95rem + 0.25vw, 1.125rem)'`. Include corresponding lineHeight values. Export as part of the typography token group. Values derived from a modular scale (1.2 ratio).

## Dependencies
- [[TASK199-define-brand-tokens|TASK199]] (define-brand-tokens) for token structure
