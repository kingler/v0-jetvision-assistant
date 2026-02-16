# Task ID: TASK104
# Task Name: Record Contract Signing Timestamp
# Parent User Story: [[US051-track-contract-signing|US051 - Record contract signature]]
# Status: Done
# Priority: High
# Estimate: 1h

## Description
Save the signed_at timestamp when a contract is signed. This provides an auditable record of exactly when the contract was executed, which is important for legal and compliance purposes.

## Acceptance Criteria
- signed_at is set to the exact timestamp of the signing action
- Timestamp is stored in UTC (ISO 8601 format)
- signed_at is immutable once set (cannot be overwritten)
- Timestamp is included in the contract response object
- Queryable for reporting (e.g., contracts signed this week)

## Implementation Details
- **File(s)**: app/api/contract/[id]/sign/route.ts
- **Approach**: Within the sign endpoint (TASK103), set signed_at = new Date().toISOString() as part of the contract update. Add a database-level constraint or application check to prevent overwriting an existing signed_at value. Include signed_at in the SELECT response.

## Dependencies
- [[TASK103-implement-sign-api|TASK103]] (Sign API endpoint) - parent endpoint implementation
- Contracts table must have a signed_at TIMESTAMPTZ column
