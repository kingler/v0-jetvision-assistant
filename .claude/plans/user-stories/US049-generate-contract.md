# User Story ID: US049
# Title: Generate Contract from Accepted Proposal
# Parent Epic: [[EPIC011-contract-generation|EPIC011 - Contract Management]]
# Status: Implemented
# Priority: Critical
# Story Points: 5

## User Story
As an ISO agent, I want to generate a contract from an accepted proposal, so that the deal can be formalized.

## Acceptance Criteria

### AC1: Contract document creation
**Given** a proposal is accepted
**When** I or the "Book Flight" button triggers contract generation
**Then** a contract document is created

### AC2: Contract content with pricing breakdown
**Given** the contract generates
**When** it's ready
**Then** it includes flight details, pricing (base + FET 7.5% + segment fees + CC processing 5%), terms, and signature fields

### AC3: Contract record persistence
**Given** the contract is created
**When** data persists
**Then** contract record links to proposal and request

## Tasks
- [[TASK098-contract-generation-api|TASK098 - Implement contract generation API]]
- [[TASK099-calculate-contract-pricing|TASK099 - Calculate contract pricing]]
- [[TASK100-create-contract-record|TASK100 - Create contract record]]

## Technical Notes
- Contract pricing includes: base charter cost, Federal Excise Tax (FET) at 7.5%, segment fees, and credit card processing fee at 5%
- Contract document includes signature fields for both parties
- Contract record in the database links to the originating proposal_id and request_id
- The "Book Flight" button in the proposal UI triggers contract generation
- Terms and conditions are included from a configurable template
