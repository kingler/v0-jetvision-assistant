# Task ID: TASK108
# Task Name: Update Contract Status to Paid
# Parent User Story: [[US053-confirm-payment|US053 - Confirm payment received]]
# Status: Done
# Priority: High
# Estimate: 1h

## Description
Update the contract status from "signed" to "paid" when payment is confirmed. This status transition records the paid_at timestamp and triggers the deal closure workflow.

## Acceptance Criteria
- Updates contract status to "paid" in the contracts table
- Sets paid_at timestamp to current time
- Only transitions from "signed" status
- Triggers deal closure flow (TASK110)
- Returns the updated contract record
- Prevents duplicate payment recording

## Implementation Details
- **File(s)**: app/api/contract/[id]/payment/route.ts
- **Approach**: Within the payment confirmation endpoint (TASK107), update the contract status using a conditional Supabase update (WHERE status = 'signed'). Set status = 'paid' and paid_at = new Date().toISOString(). After successful update, trigger the deal closure workflow to update the request status to "closed_won" (TASK110).

## Dependencies
- [[TASK107-call-confirm-payment|TASK107]] (Confirm payment API) - triggers this update
- [[TASK110-update-closed-won|TASK110]] (Update closed won) - downstream trigger
- Contracts table must have paid_at column
