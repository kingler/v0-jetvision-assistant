# User Story ID: US046
# Title: Approve and Send Proposal Email
# Parent Epic: [[EPIC010-proposal-delivery|EPIC010 - Proposal Delivery]]
# Status: Implemented
# Priority: Critical
# Story Points: 3

## User Story
As an ISO agent, I want to approve and send the proposal email, so that my client receives the offer.

## Acceptance Criteria

### AC1: Email send confirmation
**Given** I click "Approve & Send"
**When** the email sends via Gmail MCP
**Then** I see a ProposalSentConfirmation

### AC2: Status updates on send
**Given** sending succeeds
**When** status updates
**Then** the proposal status changes to "sent" and request stage advances

## Tasks
- [[TASK092-send-proposal-email|TASK092 - Send via send_proposal_email]]
- [[TASK093-update-proposal-status|TASK093 - Update proposal/request status]]

## Technical Notes
- Email is sent via the Gmail MCP server's send_proposal_email tool
- ProposalSentConfirmation component displays success state with sent timestamp and recipient info
- Proposal record status field updates to "sent"
- Flight request stage advances to reflect proposal delivery (stage 8)
- Both proposal and request status updates are persisted to the database
