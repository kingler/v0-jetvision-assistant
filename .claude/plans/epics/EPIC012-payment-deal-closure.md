# Epic ID: EPIC012
# Epic Name: Payment & Deal Closure
# Parent Feature: [[F005-contract-payment|F005 - Contract & Deal Closure]]
# Status: Implemented
# Priority: Critical

## Description
Payment confirmation recording and deal closure workflow completing the charter flight sales cycle. This epic covers payment receipt recording with method, reference number, and amount details, payment confirmation display, deal closure with closed_won status, and the final archival of completed flight requests marking the end of the sales pipeline.

## Goals
- Record payment confirmation with payment method, reference number, and amount
- Display payment confirmation details in the chat as a structured card
- Close the deal with closed_won status upon successful payment
- Archive completed requests and display the final closed-won confirmation

## User Stories
- [[US053-confirm-payment|US053 - Confirm payment received]]
- [[US054-view-payment-confirmation|US054 - View payment confirmation]]
- [[US055-close-deal|US055 - Close deal]]
- [[US056-view-closed-won-confirmation|US056 - View closed-won confirmation]]

## Acceptance Criteria Summary
- Payment confirmation modal captures payment method (wire, credit card, etc.), reference number, and amount
- Recorded payment amount is validated against the contract total
- Payment confirmation card displays method, reference, amount, date, and confirmation status
- Deal closure updates the request status to closed_won in the database
- Closed-won confirmation card shows a success summary with deal value and completion timestamp
- Archived request moves out of the active pipeline view but remains accessible in history
- All payment and closure actions are logged for audit trail purposes
- Request lifecycle stage badge updates to reflect the closed/archived state

## Technical Scope
- app/api/contract/[id]/payment/ - Payment recording endpoint
- components/contract/payment-confirmation-modal.tsx - Payment input modal
- components/contract/payment-confirmed-card.tsx - Payment confirmation display card
- components/contract/closed-won-confirmation.tsx - Deal closure success card
- Supabase contracts table - Payment details and deal status
- Supabase requests table - Final status update to closed_won/archived
- lib/chat/constants/workflow.ts - Terminal stage definitions
