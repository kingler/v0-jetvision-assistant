# Task ID: TASK051
# Task Name: Save avinode_trip_id, avinode_rfq_id, avinode_deep_link to requests table
# Parent User Story: [[US021-create-trip-see-deep-link|US021 - Receive Avinode deep link after trip creation]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Persist the Avinode trip ID, RFQ ID, and deep link URL to the requests table in Supabase after successful trip creation. These fields enable linking the internal flight request to the Avinode system for webhook processing and status tracking.

## Acceptance Criteria
- avinode_trip_id is saved to the requests table row
- avinode_rfq_id is saved to the requests table row (if returned)
- avinode_deep_link is saved to the requests table row
- Fields are updated via the requests API endpoint
- Null/undefined values do not overwrite existing data
- Database update occurs immediately after successful create_trip response
- Error in saving does not block the user-facing trip confirmation display

## Implementation Details
- **File(s)**: `app/api/requests/`
- **Approach**: After the create_trip MCP tool returns successfully, the chat handler or agent updates the corresponding request row in Supabase with the Avinode fields. Uses the Supabase client's update method targeting the request by its internal ID. These fields correspond to the columns added in database migration 015.

## Dependencies
- [[TASK049-create-trip-get-deep-link|TASK049]] (create-trip-get-deep-link) - Requires trip_id and deep_link from API
