# Task ID: TASK171
# Task Name: Mark Onboarding Complete
# Parent User Story: [[US088-sign-onboarding-contract|US088 - Contract Signing During Onboarding]]
# Status: Done
# Priority: High
# Estimate: 1h

## Description
After the contract is signed, update the user's onboarding status to `complete`. This unlocks the full application experience and marks the onboarding flow as finished.

## Acceptance Criteria
- User's onboarding_status is updated to `complete` after contract signing
- GET /api/onboarding/status returns current onboarding status for the user
- Status endpoint returns `{ status: 'complete', completedAt: timestamp }`
- Only the authenticated user can check their own onboarding status
- Completed timestamp is recorded in the user record
- Subsequent visits skip the onboarding flow entirely

## Implementation Details
- **File(s)**: app/api/onboarding/status/route.ts
- **Approach**: Create a GET handler that returns the user's current onboarding status from the database. The status update to `complete` is triggered as a side effect of TASK170 (sign-contract). The status endpoint simply reads and returns the current state.

## Dependencies
- [[TASK170-record-contract-signature|TASK170]] (record-contract-signature)
- Users table onboarding_status column
