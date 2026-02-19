# Task ID: TASK170
# Task Name: Record Contract Signature
# Parent User Story: [[US088-sign-onboarding-contract|US088 - Contract Signing During Onboarding]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Create a POST /api/onboarding/sign-contract endpoint that records the user's signature on the generated contract. The signature data, timestamp, and IP address are captured for legal compliance.

## Acceptance Criteria
- POST /api/onboarding/sign-contract accepts contractId and signature data
- Signature data (base64 image or typed name) is stored securely
- Signing timestamp and client IP are recorded for audit trail
- Contract status is updated from `pending_signature` to `signed`
- Returns 404 if contract not found, 400 if already signed
- Returns 403 if the authenticated user does not own the contract
- Authenticated endpoint requiring valid Clerk session

## Implementation Details
- **File(s)**: app/api/onboarding/sign-contract/route.ts
- **Approach**: Create a POST handler that validates the contract exists and belongs to the authenticated user, stores the signature data in the `contract_signatures` table, updates the contract status to `signed`, and records the signing metadata (timestamp, IP, user agent).

## Dependencies
- [[TASK168-generate-onboarding-contract|TASK168]] (generate-onboarding-contract)
- [[TASK169-store-contract-document|TASK169]] (store-contract-document)
- Contract signatures table in Supabase
