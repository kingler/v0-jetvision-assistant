# Task ID: TASK077
# Task Name: Proposal Generation API Endpoint
# Parent User Story: [[US039-generate-proposal-from-quote|US039 - Generate proposal from accepted quote]]
# Status: Done
# Priority: Critical
# Estimate: 3h

## Description
Create a POST /api/proposal/generate endpoint that accepts a quote_id and request_id, retrieves the relevant flight details and pricing from the database, and orchestrates the proposal generation pipeline. This endpoint serves as the entry point for the entire proposal generation workflow, coordinating PDF creation, record insertion, and storage upload.

## Acceptance Criteria
- POST /api/proposal/generate accepts { quote_id, request_id } in the request body
- Validates that the quote and request exist and are in valid states
- Returns 201 with the created proposal object including proposal_id and proposal_number
- Returns appropriate error codes (400 for invalid input, 404 for missing records, 500 for server errors)
- Authenticates the request via Clerk JWT
- Logs the proposal generation event for audit trail

## Implementation Details
- **File(s)**: app/api/proposal/generate/route.ts
- **Approach**: Create a Next.js API route handler that validates input with Zod, fetches quote and request data from Supabase, calls the proposal service to generate PDF and create the record, and returns the proposal metadata. Use try/catch with structured error responses.

## Dependencies
- [[TASK078-generate-pdf|TASK078]] (Generate PDF) - called by this endpoint
- [[TASK079-create-proposal-record|TASK079]] (Create proposal record) - called by this endpoint
- Supabase quotes and requests tables must exist
