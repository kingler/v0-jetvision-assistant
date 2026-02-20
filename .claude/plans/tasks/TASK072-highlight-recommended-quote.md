# Task ID: TASK072
# Task Name: Visual highlight on recommended quote
# Parent User Story: [[US035-compare-quotes-side-by-side|US035 - Compare operator quotes]]
# Status: Done
# Priority: Medium
# Estimate: 1h

## Description
Add a visual highlight to the recommended quote in the comparison view. The recommendation can be AI-generated (based on scoring criteria) or manually marked by the sales representative.

## Acceptance Criteria
- Recommended quote column has a distinct visual highlight (border, background tint, or badge)
- "Recommended" label or badge is shown at the top of the highlighted column
- Highlight uses design system accent/primary color
- Recommendation can come from AI scoring or manual selection
- Only one quote is highlighted as recommended at a time
- Highlight is visually prominent but does not obscure the data
- Non-recommended quotes remain fully readable
- Highlight state can be toggled by the user

## Implementation Details
- **File(s)**: `components/mcp-ui/composites/QuoteComparisonUI.tsx`
- **Approach**: Add a `recommended` or `isRecommended` prop to each quote column in the comparison grid. When true, apply a CSS class that adds a border highlight, subtle background tint, and a "Recommended" badge. The QuoteComparisonUI composite component manages the recommendation state, which can be set by the AI scoring system or toggled manually by the user.

## Dependencies
- [[TASK071-implement-quote-comparison|TASK071]] (implement-quote-comparison) - Base comparison view
