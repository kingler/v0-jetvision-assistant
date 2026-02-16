# Task ID: TASK075
# Task Name: PATCH /api/quotes to update status (accepted/declined)
# Parent User Story: [[US037-accept-reject-quote|US037 - Update quote status]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Implement the API endpoint to update a quote's status. Supports status transitions including marking a quote as accepted, declined, selected, or other workflow states.

## Acceptance Criteria
- PATCH /api/quotes accepts `{ quoteId: string, status: string }` body
- Supported statuses: "selected", "accepted", "declined"
- Validates that the quote exists before updating
- Validates that the status transition is valid (e.g., can't accept an already declined quote)
- Returns updated quote object in the response
- Returns 404 if quote not found
- Returns 400 for invalid status values or transitions
- Requires authentication (Clerk JWT validation)
- Logs status change for audit trail
- Updates the updated_at timestamp

## Implementation Details
- **File(s)**: `app/api/quotes/route.ts`
- **Approach**: Create a PATCH handler in the quotes API route. Extract quoteId and status from the request body. Validate the quote exists and the status transition is allowed. Update the quote row in Supabase with the new status and current timestamp. Return the updated record. Include a status transition map that defines valid from→to transitions.

## Dependencies
- [[TASK064-store-quote-database|TASK064]] (store-quote-database) - Quotes must exist in the database
