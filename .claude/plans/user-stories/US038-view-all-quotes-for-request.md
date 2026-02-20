# User Story ID: US038
# Title: View All Quotes for a Request
# Parent Epic: [[EPIC008-quote-comparison-selection|EPIC008 - Proposal Generation]]
# Status: Implemented
# Priority: High
# Story Points: 2

## User Story
As an ISO agent, I want to view all quotes for a specific request, so that I see the full picture.

## Acceptance Criteria

### AC1: Complete Quote List
**Given** a request has quotes
**When** I view them
**Then** all quotes display with their status, price, and operator

### AC2: Real-Time List Updates
**Given** quotes are listed
**When** new ones arrive
**Then** the list updates in real-time

## Tasks
- [[TASK076-list-quotes-for-request|TASK076 - Build quote list view for a request showing all quotes with status, price, and operator, with real-time updates via SSE]]

## Technical Notes
- The quote list is scoped to a specific flight request and fetches all associated quotes from the database
- Each quote entry displays: operator name, aircraft type/model, total price (formatted with currency), and status badge
- Real-time updates are powered by the SSE connection to `/api/avinode/events` -- when new TripRequestSellerResponse webhook events arrive, the list automatically appends the new quote
- Quotes are sorted by received time (newest first) with an option to sort by price
- The list view serves as the entry point to individual quote details, comparison view, and selection for proposal
- Quote count is displayed in the request header/card to indicate how many quotes have been received
