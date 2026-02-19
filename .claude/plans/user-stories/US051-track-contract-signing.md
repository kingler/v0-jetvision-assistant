# User Story ID: US051
# Title: Track Contract Signing
# Parent Epic: [[EPIC011-contract-generation|EPIC011 - Contract Management]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As an ISO agent, I want to track when a contract is signed, so that I know when to proceed to payment.

## Acceptance Criteria

### AC1: Signing timestamp recording
**Given** a contract was sent
**When** the customer signs
**Then** the signed_at timestamp is recorded

### AC2: Status and stage advancement
**Given** signing is recorded
**When** status updates
**Then** contract moves to "signed" and stage advances

## Tasks
- [[TASK103-implement-sign-api|TASK103 - Implement sign API]]
- [[TASK104-record-signing-timestamp|TASK104 - Record signing timestamp]]

## Technical Notes
- The sign API endpoint accepts the contract ID and records the signed_at timestamp
- Contract status transitions from "sent" to "signed"
- Flight request stage advances to reflect the signed contract milestone
- Stage advancement triggers UI updates across the chat interface and sidebar
