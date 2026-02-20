# User Story ID: US088
# Title: Sign Onboarding Contract
# Parent Epic: [[EPIC021-user-onboarding|EPIC021 - User Onboarding]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As a new ISO agent, I want to sign the onboarding contract, so I can complete setup and start working.

## Acceptance Criteria

### AC1: Record signature with timestamp
**Given** the contract is presented
**When** I sign it
**Then** the signature is recorded with a timestamp

### AC2: Mark onboarding complete
**Given** signing succeeds
**When** the status updates
**Then** my onboarding is marked as complete

## Tasks
- [[TASK170-record-contract-signature|TASK170 - Record contract signature with timestamp]]
- [[TASK171-mark-onboarding-complete|TASK171 - Mark onboarding as complete]]

## Technical Notes
- Signature is captured as a typed name confirmation (not a drawn signature)
- The `onboarding_contracts` table is updated with `signed_at` timestamp and `status = "signed"`
- The `iso_agents` table `onboarding_status` field is set to "complete"
- After signing, the user is redirected to the main chat dashboard
