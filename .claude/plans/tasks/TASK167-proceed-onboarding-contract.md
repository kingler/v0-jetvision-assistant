# Task ID: TASK167
# Task Name: Proceed Onboarding to Contract Step
# Parent User Story: [[US086-register-new-user|US086 - User Registration and Onboarding]]
# Status: Done
# Priority: High
# Estimate: 1h

## Description
After successful user registration, automatically advance the onboarding flow to the contract generation step. This involves updating the user's onboarding status and returning the next step information to the frontend.

## Acceptance Criteria
- After registration completes, onboarding status is updated to `contract_pending`
- Response includes the next step identifier for the frontend to navigate
- Onboarding progress is persisted in the database
- Frontend receives clear indication to proceed to contract generation
- Error during status update does not roll back user creation

## Implementation Details
- **File(s)**: app/api/onboarding/
- **Approach**: Extend the registration response to include onboarding step metadata. Update the user's `onboarding_status` field to `contract_pending` after successful creation. Return a response object with `{ user, nextStep: 'generate-contract' }` so the frontend can navigate accordingly.

## Dependencies
- [[TASK166-create-user-record|TASK166]] (create-user-record) must be complete
- Users table must have an `onboarding_status` column
