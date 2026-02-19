# User Story ID: US087
# Title: Generate Onboarding Contract
# Parent Epic: [[EPIC021-user-onboarding|EPIC021 - User Onboarding]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As a new ISO agent, I want an onboarding contract generated, so I can review the terms of service.

## Acceptance Criteria

### AC1: Contract content generation
**Given** I have registered
**When** the contract generates
**Then** it includes platform terms, pricing, and service agreement details

## Tasks
- [[TASK168-generate-onboarding-contract|TASK168 - Generate onboarding contract with platform terms]]
- [[TASK169-store-contract-document|TASK169 - Store contract document in database]]

## Technical Notes
- Contract is generated from a template with dynamic fields (agent name, date, company)
- Contract document is stored in the `onboarding_contracts` table with status "pending"
- Contract content includes: platform usage terms, commission structure, service level agreement
- The contract is rendered as a scrollable document in the onboarding UI
