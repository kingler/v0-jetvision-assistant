# Task ID: TASK103
# Task Name: Contract Signing API Endpoint
# Parent User Story: [[US051-track-contract-signing|US051 - Record contract signature]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Create a PATCH /api/contract/[id]/sign endpoint that records a contract signature. This endpoint transitions the contract from "sent" to "signed" status and records the signing metadata including timestamp and signer information.

## Acceptance Criteria
- PATCH /api/contract/[id]/sign accepts { signer_name, signer_email, signature_data? }
- Validates contract exists and is in "sent" status
- Updates contract status to "signed"
- Records signed_at timestamp (TASK104)
- Stores signer information (name, email)
- Returns updated contract record
- Returns 400 if contract is not in "sent" status
- Returns 404 if contract not found
- Prevents double-signing

## Implementation Details
- **File(s)**: app/api/contract/[id]/sign/route.ts
- **Approach**: Create a PATCH route handler with dynamic [id] parameter. Validate input with Zod. Fetch contract and verify status is "sent". Update status to "signed" with signer details and timestamp. Use conditional update to prevent race conditions.

## Dependencies
- [[TASK101-send-contract-email|TASK101]] (Send contract email) - contract must be in "sent" status
- [[TASK104-record-signing-timestamp|TASK104]] (Record signing timestamp) - timestamp recording
- Contracts table must have signed_at, signer_name, signer_email columns
