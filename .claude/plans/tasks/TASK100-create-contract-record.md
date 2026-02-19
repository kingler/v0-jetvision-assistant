# Task ID: TASK100
# Task Name: Create Contract Database Record
# Parent User Story: [[US049-generate-contract|US049 - Generate contract from accepted proposal]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Insert a new contract record into the contracts table, linking it to the source proposal and flight request. The contract record stores the complete pricing breakdown, customer details, flight information, and status tracking fields.

## Acceptance Criteria
- Creates a new row in the contracts table with a unique contract_number
- Links to proposal_id and request_id via foreign keys
- Stores complete pricing breakdown (base, FET, segment fees, CC fee, total)
- Sets initial status to "draft"
- Includes customer_id for the client
- Stores payment_method selection
- Returns the complete contract record with generated id
- Handles unique constraint violations gracefully

## Implementation Details
- **File(s)**: app/api/contract/generate/route.ts
- **Approach**: After pricing calculation (TASK099), insert into the contracts table using Supabase client. Generate contract_number with a formatted pattern (e.g., CTR-2026-0001). Include all pricing fields, customer reference, and metadata. Set status to "draft" and created_at to current timestamp.

## Dependencies
- [[TASK099-calculate-contract-pricing|TASK099]] (Calculate contract pricing) - provides pricing data
- Contracts table must exist in Supabase (migration required)
- Proposal and request records must exist
