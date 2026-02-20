# Task ID: TASK098
# Task Name: Contract Generation API Endpoint
# Parent User Story: [[US049-generate-contract|US049 - Generate contract from accepted proposal]]
# Status: Done
# Priority: Critical
# Estimate: 5h

## Description
Create a POST /api/contract/generate endpoint that generates a charter flight contract from an accepted proposal. The endpoint calculates the full pricing breakdown including Federal Excise Tax (FET), segment fees, and credit card processing fees, then creates the contract record and generates the contract document.

## Acceptance Criteria
- POST /api/contract/generate accepts { proposal_id, request_id, payment_method }
- Retrieves proposal and flight details from database
- Calculates complete pricing breakdown (TASK099)
- Creates contract record in database (TASK100)
- Generates contract document (PDF or structured data)
- Returns 201 with contract object including contract_id and contract_number
- Returns appropriate error codes (400, 404, 500)
- Validates proposal is in "accepted" or "sent" status
- Authenticates via Clerk JWT

## Implementation Details
- **File(s)**: app/api/contract/generate/route.ts
- **Approach**: Create a POST route handler that validates input with Zod, fetches proposal and request data, calls the pricing calculation service (TASK099), inserts the contract record (TASK100), and returns the complete contract object. The pricing calculation is the core logic, applying FET, segment fees, and optional CC fees based on payment method.

## Dependencies
- [[TASK099-calculate-contract-pricing|TASK099]] (Calculate contract pricing) - pricing logic
- [[TASK100-create-contract-record|TASK100]] (Create contract record) - database insertion
- Proposals and requests tables must have required data
