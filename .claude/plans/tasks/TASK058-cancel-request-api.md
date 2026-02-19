# Task ID: TASK058
# Task Name: PATCH /api/requests with action=cancel
# Parent User Story: [[US026-cancel-active-request|US026 - Cancel a flight request]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Implement the API endpoint to cancel a flight request. The PATCH endpoint accepts an action parameter of "cancel" which updates the request status to cancelled (stage 10) and triggers any necessary cleanup operations.

## Acceptance Criteria
- PATCH /api/requests accepts `{ action: "cancel", requestId: string }` body
- Updates request status/stage to 10 (Cancelled) in the database
- Returns updated request object in the response
- Validates that the request exists and is in a cancellable state
- Requests in terminal states (Accepted, Expired, already Cancelled) cannot be cancelled
- Returns 404 if request not found
- Returns 400 if request is in a non-cancellable state
- Requires authentication (Clerk JWT validation)
- Logs cancellation event for audit trail

## Implementation Details
- **File(s)**: `app/api/requests/route.ts`
- **Approach**: Add a PATCH handler that checks the `action` field in the request body. For "cancel", validate the request exists and is in a cancellable state (stages 1-6), then update the stage to 10. Use the Supabase client to update the row and return the updated record. Include error handling for missing/invalid requests.

## Dependencies
- None (standalone API endpoint)
