# Task ID: TASK074
# Task Name: Selected quote data flows to proposal generation
# Parent User Story: [[US036-select-quote-for-proposal|US036 - Select a quote for proposal generation]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Ensure the selected quote data is properly passed to the proposal generation service. The proposal service uses the quote details (pricing, aircraft, operator) along with client and request information to generate a professional client proposal.

## Acceptance Criteria
- Selected quote data is passed to the proposal service as structured input
- Data includes: total price, pricing breakdown, aircraft details, operator info, flight times
- Data includes: associated request details (route, dates, passengers)
- Data includes: client profile information for personalization
- Proposal service receives all data needed to generate a complete proposal
- Missing optional fields do not break the proposal generation
- Data transformation/mapping is documented and tested
- Error handling if quote data is incomplete or corrupted

## Implementation Details
- **File(s)**: `lib/services/proposal-service.ts`
- **Approach**: Create a data mapping function that transforms the selected quote record (from the database) into the format expected by the proposal service. This function joins quote data with request details and client profile data. The proposal service uses this combined payload to generate the proposal document via the agent or template system.

## Dependencies
- [[TASK073-select-quote-for-proposal|TASK073]] (select-quote-for-proposal) - Quote must be selected first
- [[TASK064-store-quote-database|TASK064]] (store-quote-database) - Quote data must be in the database
