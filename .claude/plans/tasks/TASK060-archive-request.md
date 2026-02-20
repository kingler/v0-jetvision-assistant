# Task ID: TASK060
# Task Name: PATCH /api/requests with action=archive, move to archived tab
# Parent User Story: [[US027-archive-completed-request|US027 - Archive a completed flight request]]
# Status: Done
# Priority: Medium
# Estimate: 2h

## Description
Implement the API endpoint to archive a flight request. Archiving moves the request out of the active list and into an archived tab, keeping it available for historical reference without cluttering the active view.

## Acceptance Criteria
- PATCH /api/requests accepts `{ action: "archive", requestId: string }` body
- Sets an `archived` flag or `archived_at` timestamp on the request
- Only requests in terminal states (Accepted, Declined, Expired, Cancelled) can be archived
- Returns updated request object in the response
- Returns 400 if request is not in a terminal state
- Returns 404 if request not found
- Archived requests appear in the "Archived" tab in the sidebar
- Archived requests are excluded from the "Active" tab
- Requires authentication (Clerk JWT validation)

## Implementation Details
- **File(s)**: `app/api/requests/route.ts`
- **Approach**: Add an "archive" action case to the PATCH handler. Validate that the request is in a terminal state (stage 7, 8, 9, or 10). Update the request row with `archived_at: new Date().toISOString()`. The frontend sidebar filters use this field to separate active from archived requests.

## Dependencies
- [[TASK058-cancel-request-api|TASK058]] (cancel-request-api) - Shares the PATCH endpoint pattern
