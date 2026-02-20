# Task ID: TASK107
# Task Name: Confirm Payment API Endpoint
# Parent User Story: [[US053-confirm-payment|US053 - Confirm payment received]]
# Status: Done
# Priority: Critical
# Estimate: 2h

## Description
Create a POST /api/contract/[id]/payment endpoint (or call confirm_payment MCP tool) that records payment confirmation for a signed contract. This endpoint validates the payment details, updates the contract status, and triggers downstream deal closure workflows.

## Acceptance Criteria
- POST /api/contract/[id]/payment accepts { amount, payment_method, reference_number, payment_date, notes? }
- Validates contract exists and is in "signed" status
- Records payment details in the contract record
- Updates contract status to "paid" (TASK108)
- Returns updated contract with payment details
- Returns 400 if contract is not in "signed" status
- Returns 404 if contract not found
- Validates payment amount is positive
- Authenticates via Clerk JWT

## Implementation Details
- **File(s)**: app/api/contract/[id]/payment/route.ts
- **Approach**: Create a POST route handler with dynamic [id] parameter. Validate input with Zod schema. Fetch contract and verify status is "signed". Update contract with payment fields (payment_amount, payment_method, payment_reference, payment_date, paid_at). Set status to "paid". Return the updated contract.

## Dependencies
- [[TASK103-implement-sign-api|TASK103]] (Sign API) - contract must be signed before payment
- [[TASK108-update-contract-paid|TASK108]] (Update contract paid) - status update logic
- Contracts table must have payment-related columns
