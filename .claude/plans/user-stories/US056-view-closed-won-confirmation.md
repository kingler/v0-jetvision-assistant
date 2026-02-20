# User Story ID: US056
# Title: View Closed-Won Confirmation
# Parent Epic: [[EPIC012-payment-deal-closure|EPIC012 - Payment and Deal Closure]]
# Status: Implemented
# Priority: Medium
# Story Points: 2

## User Story
As an ISO agent, I want to see a closed-won confirmation, so that I know the deal is complete.

## Acceptance Criteria

### AC1: Closed-won confirmation display
**Given** a deal is closed
**When** confirmation renders
**Then** ClosedWonConfirmation shows with deal summary and celebration

## Tasks
- [[TASK112-closed-won-confirmation|TASK112 - Implement closed-won confirmation card]]

## Technical Notes
- ClosedWonConfirmation component displays a deal summary including flight route, customer, total amount, and completion timestamp
- Celebration visual (e.g., confetti animation or success banner) provides positive feedback on deal completion
- Component renders inline in the chat as the final message in the deal workflow
- Summary includes links to the associated proposal, contract, and payment records for reference
