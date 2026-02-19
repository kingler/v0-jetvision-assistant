# Task ID: TASK057
# Task Name: Map stages 1-10 to colors and labels with fallback mappings
# Parent User Story: [[US025-view-request-stage-badge|US025 - Display flight request stage badge]]
# Status: Done
# Priority: Medium
# Estimate: 1h

## Description
Define the complete mapping of flight request stages (1-10) to their colors, labels, and fallback values. Ensure all 10 stages are covered including stages 6-10 which were previously missing, and that unknown stage values gracefully fall back to a default display.

## Acceptance Criteria
- All 10 stages have defined label, background color, and text color
- Stage 1 (New Request): Blue/info color
- Stage 2 (Searching): Yellow/warning color
- Stage 3 (Quotes Received): Purple/info color
- Stage 4 (Quote Selected): Indigo color
- Stage 5 (Proposal Sent): Teal color
- Stage 6 (Client Reviewing): Amber/orange color
- Stage 7 (Accepted): Green/success color
- Stage 8 (Declined): Red/error color
- Stage 9 (Expired): Gray/muted color
- Stage 10 (Cancelled): Dark gray color
- Unknown stage values fall back to a neutral gray badge with "Unknown" label
- Unit tests cover all 10 stages and fallback behavior

## Implementation Details
- **File(s)**: `components/flight-request-stage-badge.tsx`
- **Approach**: Define a `STAGE_CONFIG` constant object mapping stage numbers to `{ label, bgColor, textColor }`. Include a `DEFAULT_STAGE_CONFIG` for fallback. This was addressed as part of ONEK-275 which added the missing fallback mappings for stages 6-10 and corresponding unit tests.

## Dependencies
- [[TASK056-implement-stage-badge|TASK056]] (implement-stage-badge) - Uses the stage mapping in this component
