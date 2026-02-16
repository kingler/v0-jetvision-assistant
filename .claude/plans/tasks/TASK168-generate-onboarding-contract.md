# Task ID: TASK168
# Task Name: Generate Onboarding Contract
# Parent User Story: [[US087-generate-onboarding-contract|US087 - Contract Generation During Onboarding]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Create a POST /api/onboarding/generate-contract endpoint that generates a personalized contract document for the new user. The contract is populated with the user's details and standard terms of service.

## Acceptance Criteria
- POST /api/onboarding/generate-contract accepts userId and generates a contract
- Contract is populated with user name, email, company, and current date
- Standard contract template is used with dynamic field substitution
- Returns the generated contract content and a contract ID
- Returns 404 if user not found, 400 if user already has an active contract
- Authenticated endpoint requiring valid Clerk session

## Implementation Details
- **File(s)**: app/api/onboarding/generate-contract/route.ts
- **Approach**: Create a POST handler that fetches the user from Supabase, loads the contract template, substitutes dynamic fields (name, date, terms), generates a unique contract ID, stores the contract record in the `contracts` table with status `draft`, and returns the contract content and metadata.

## Dependencies
- [[TASK166-create-user-record|TASK166]] (create-user-record)
- [[TASK167-proceed-onboarding-contract|TASK167]] (proceed-onboarding-contract)
- Contract template definition
- Contracts table in Supabase
