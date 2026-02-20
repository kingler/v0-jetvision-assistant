# User Story ID: US052
# Title: View Contract Details
# Parent Epic: [[EPIC011-contract-generation|EPIC011 - Contract Management]]
# Status: Implemented
# Priority: Medium
# Story Points: 2

## User Story
As an ISO agent, I want to view contract details, so that I have the full agreement context.

## Acceptance Criteria

### AC1: Full contract details display
**Given** a contract exists
**When** I view details
**Then** I see all pricing, flight info, customer info, and status timeline

## Tasks
- [[TASK105-contract-details-view|TASK105 - Implement contract details view]]

## Technical Notes
- Contract details view displays the complete pricing breakdown (base, FET, segment fees, CC processing)
- Flight information includes route, dates, aircraft type, and operator
- Customer information shows name, email, and contact details
- Status timeline shows the contract lifecycle: draft, sent, signed, paid
- Component renders inline in the chat or as a dedicated detail panel
