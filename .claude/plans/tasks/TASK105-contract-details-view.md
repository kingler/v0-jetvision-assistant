# Task ID: TASK105
# Task Name: Contract Details View API
# Parent User Story: [[US052-view-contract-details|US052 - View contract details]]
# Status: Done
# Priority: Medium
# Estimate: 2h

## Description
Create a GET /api/contract/[id] endpoint that returns the full contract details including pricing breakdown, customer information, flight details, status history, and signing metadata. This endpoint powers the contract detail views in the UI.

## Acceptance Criteria
- GET /api/contract/[id] returns complete contract data
- Includes pricing breakdown (base, FET, segment fees, CC fee, total)
- Includes customer details (name, email, company)
- Includes flight details (route, dates, aircraft)
- Includes status and timestamps (created_at, sent_at, signed_at, paid_at)
- Includes linked proposal and request references
- Returns 404 if contract not found
- Authenticates via Clerk JWT

## Implementation Details
- **File(s)**: app/api/contract/[id]/route.ts
- **Approach**: Create a GET route handler with dynamic [id] parameter. Fetch the contract from Supabase with joined data from proposals, requests, and clients tables. Transform the raw database result into a structured response object. Use Supabase's select with foreign key joins for efficient single-query retrieval.

## Dependencies
- [[TASK100-create-contract-record|TASK100]] (Create contract record) - contract must exist
- Contracts, proposals, requests, and clients tables must exist
- Foreign key relationships configured in Supabase
