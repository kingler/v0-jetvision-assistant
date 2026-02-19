# User Story ID: US050
# Title: Send Contract to Customer
# Parent Epic: [[EPIC011-contract-generation|EPIC011 - Contract Management]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As an ISO agent, I want to send the contract to the customer, so that they can review and sign.

## Acceptance Criteria

### AC1: Contract email delivery
**Given** a contract is generated
**When** I send it
**Then** the customer receives an email with the contract

### AC2: Contract status update on send
**Given** sending succeeds
**When** status updates
**Then** contract status changes to "sent"

## Tasks
- [[TASK101-send-contract-email|TASK101 - Send contract via email]]
- [[TASK102-update-contract-status-sent|TASK102 - Update contract status]]

## Technical Notes
- Contract is sent as an email attachment via the Gmail MCP server
- Contract status field transitions from "draft" to "sent" upon successful delivery
- Email includes a cover message explaining the contract and next steps
- Sent timestamp is recorded on the contract record
