# User Story ID: US053
# Title: Confirm Payment Received
# Parent Epic: [[EPIC012-payment-deal-closure|EPIC012 - Payment and Deal Closure]]
# Status: Implemented
# Priority: Critical
# Story Points: 5

## User Story
As an ISO agent, I want to confirm payment received, so that the deal can be closed.

## Acceptance Criteria

### AC1: Payment details input
**Given** a signed contract
**When** I confirm payment
**Then** I provide payment_amount, payment_method, and payment_reference

### AC2: Contract status transition to paid
**Given** payment is confirmed
**When** it processes
**Then** the contract status moves to "paid"

### AC3: Payment modal trigger
**Given** the "Mark Payment Received" button in the contract card
**When** I click it
**Then** the PaymentConfirmationModal opens

## Tasks
- [[TASK106-payment-confirmation-modal|TASK106 - Implement payment confirmation modal]]
- [[TASK107-call-confirm-payment|TASK107 - Call confirm_payment MCP tool]]
- [[TASK108-update-contract-paid|TASK108 - Update contract status]]

## Technical Notes
- PaymentConfirmationModal collects payment_amount, payment_method (e.g., wire, credit card, check), and payment_reference
- The confirm_payment MCP tool processes the payment confirmation and updates backend records
- Contract status transitions from "signed" to "paid" upon successful confirmation
- Payment details are persisted on the contract record for audit and reporting
- The "Mark Payment Received" button appears on the contract card only when contract status is "signed"
