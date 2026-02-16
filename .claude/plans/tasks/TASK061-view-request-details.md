# Task ID: TASK061
# Task Name: GET /api/requests/[id] with full details
# Parent User Story: [[US028-view-request-details|US028 - View flight request details]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Implement the API endpoint to retrieve full details of a specific flight request by its ID. The response includes all request fields, associated Avinode data, linked quotes, and status history.

## Acceptance Criteria
- GET /api/requests/[id] returns the complete request object
- Response includes: route details, dates, passengers, status/stage, trip type
- Response includes Avinode fields: avinode_trip_id, avinode_rfq_id, avinode_deep_link
- Response includes linked quotes (if any) with count
- Response includes created_at and updated_at timestamps
- Returns 404 if request not found
- Returns 403 if user does not have access to the request
- Requires authentication (Clerk JWT validation)
- Response is JSON formatted

## Implementation Details
- **File(s)**: `app/api/requests/`
- **Approach**: Create a dynamic route handler at `app/api/requests/[id]/route.ts` that extracts the request ID from the URL params, queries Supabase for the request row with all fields, and optionally joins related quotes. Validate user access via Clerk authentication. Return the complete request object as JSON.

## Dependencies
- None (standalone API endpoint)
