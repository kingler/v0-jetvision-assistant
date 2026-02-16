# User Story ID: US036
# Title: Select Quote for Proposal Generation
# Parent Epic: [[EPIC008-quote-comparison-selection|EPIC008 - Proposal Generation]]
# Status: Implemented
# Priority: Critical
# Story Points: 3

## User Story
As an ISO agent, I want to select a quote for proposal generation, so that I can proceed with the best offer.

## Acceptance Criteria

### AC1: Quote Selection
**Given** quotes are displayed
**When** I select a quote
**Then** it's marked as selected and available for proposal generation

### AC2: Proposal Uses Selected Quote
**Given** a quote is selected
**When** I request a proposal
**Then** the system uses the selected quote's details

## Tasks
- [[TASK073-select-quote-for-proposal|TASK073 - Implement quote selection action that marks the chosen quote and updates its status in the database]]
- [[TASK074-pass-quote-to-proposal|TASK074 - Wire selected quote data into proposal generation flow so the proposal uses the correct quote details]]

## Technical Notes
- Quote selection updates the quote record's status to "selected" in the database and sets the request's stage to 6 (Quote Selected)
- Only one quote can be selected per request at a time; selecting a new quote deselects the previous one
- The selected quote's data (price, aircraft, operator details) flows into the proposal generation pipeline
- The proposal generation agent uses the selected quote's details to create a client-facing proposal document
- Selection is available via a "Select for Proposal" button on each quote card and in the comparison view
- The stage badge updates from "Quotes Received" (stage 5) to "Quote Selected" (stage 6) upon selection
