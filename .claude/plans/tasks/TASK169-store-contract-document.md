# Task ID: TASK169
# Task Name: Store Contract Document
# Parent User Story: [[US087-generate-onboarding-contract|US087 - Contract Generation During Onboarding]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Store the generated contract document in persistent storage. The contract content, metadata, and version information are saved to the database for later retrieval, signing, and auditing.

## Acceptance Criteria
- Generated contract is stored in the `contracts` table with all metadata
- Contract record includes: id, user_id, content, status, version, created_at
- Contract status is set to `pending_signature` after storage
- Contract can be retrieved by contract ID or user ID
- Storage operation is atomic (all-or-nothing)
- Previous draft contracts for the same user are marked as `superseded`

## Implementation Details
- **File(s)**: app/api/onboarding/
- **Approach**: After contract generation, insert a record into the `contracts` table via Supabase. Include content hash for integrity verification. If the user already has draft contracts, update their status to `superseded` before inserting the new one. Use a Supabase transaction to ensure atomicity.

## Dependencies
- [[TASK168-generate-onboarding-contract|TASK168]] (generate-onboarding-contract)
- Contracts table schema in Supabase
