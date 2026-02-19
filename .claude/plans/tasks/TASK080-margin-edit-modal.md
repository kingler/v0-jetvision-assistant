# Task ID: TASK080
# Task Name: Margin Edit Modal Component
# Parent User Story: [[US040-adjust-proposal-margin|US040 - Edit margin/markup on proposal]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Create a modal dialog component that allows sales representatives to set the markup on a proposal. The modal supports two margin modes: percentage-based markup (e.g., 15%) or fixed dollar amount (e.g., $5,000). It displays a live preview of the recalculated final amount as the user adjusts the margin.

## Acceptance Criteria
- Modal opens when triggered from the proposal preview
- Supports toggle between "Percentage" and "Fixed Amount" margin modes
- Percentage mode: input accepts 0-100% with decimal precision
- Fixed amount mode: input accepts dollar amounts with currency formatting
- Shows live preview of: base amount, margin amount, final amount
- Save button calls the margin update API endpoint
- Cancel button closes modal without changes
- Validates input (no negative values, reasonable bounds)
- Accessible with proper ARIA attributes and keyboard navigation

## Implementation Details
- **File(s)**: components/proposal/margin-edit-modal.tsx
- **Approach**: Build using the existing Dialog/Modal component from the design system. Use controlled form state with useState for margin_type (percentage | fixed) and margin_value. Compute preview amounts client-side for instant feedback. On save, call PATCH /api/proposal/[id]/margin. Use Tailwind classes consistent with the design system tokens.

## Dependencies
- [[TASK081-recalculate-pricing|TASK081]] (Recalculate pricing API) - backend for saving margin changes
- Design system Dialog component must exist
- Proposal data structure with pricing fields
