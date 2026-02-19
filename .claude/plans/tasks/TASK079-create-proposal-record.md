# Task ID: TASK079
# Task Name: Create Proposal Database Record
# Parent User Story: [[US039-generate-proposal-from-quote|US039 - Generate proposal from accepted quote]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Insert a new proposal record into the proposals table with a unique proposal_number, linking it to the source quote_id and request_id. The proposal_number should follow a sequential or formatted pattern (e.g., PROP-2026-0001) for easy reference in communications with clients.

## Acceptance Criteria
- Creates a new row in the proposals table with all required fields
- Generates a unique proposal_number in a consistent format
- Links proposal to quote_id and request_id via foreign keys
- Sets initial status to "draft"
- Stores pricing details (total_amount, margin, final_amount)
- Returns the complete proposal record with generated id and proposal_number
- Handles duplicate proposal_number conflicts gracefully

## Implementation Details
- **File(s)**: lib/services/proposal-service.ts
- **Approach**: Add a createProposal function that generates a proposal_number using a counter or date-based format, then inserts into Supabase proposals table. Use a transaction or upsert pattern to handle race conditions on the proposal_number. Include fields: id, proposal_number, quote_id, request_id, status, total_amount, margin_type, margin_value, final_amount, created_at.

## Dependencies
- Supabase proposals table must exist (migration required)
- Quote and request records must exist in database
- [[TASK078-generate-pdf|TASK078]] (Generate PDF) - PDF generation happens in same workflow
