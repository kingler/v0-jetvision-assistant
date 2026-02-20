# Task ID: TASK076
# Task Name: GET /api/quotes with request_id filter
# Parent User Story: [[US038-view-all-quotes-for-request|US038 - List quotes for a flight request]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Implement the API endpoint to list all quotes associated with a specific flight request. The endpoint accepts a request_id query parameter and returns all matching quotes with their full details, ordered by creation date.

## Acceptance Criteria
- GET /api/quotes?request_id=xxx returns all quotes for the given request
- Response is an array of quote objects with full details
- Each quote includes: pricing, aircraft details, operator info, status, timestamps
- Results are ordered by created_at descending (newest first)
- Returns empty array if no quotes found for the request
- Returns 400 if request_id parameter is missing
- Supports optional status filter: GET /api/quotes?request_id=xxx&status=quoted
- Requires authentication (Clerk JWT validation)
- Response includes total count of quotes
- Pagination support for requests with many quotes (optional)

## Implementation Details
- **File(s)**: `app/api/quotes/route.ts`
- **Approach**: Create a GET handler in the quotes API route. Extract request_id (required) and optional status filter from query parameters. Query Supabase for quotes matching the request_id, optionally filtered by status. Order results by created_at descending. Return the array with a count field. The frontend uses this endpoint to populate the quote comparison view and individual quote cards.

## Dependencies
- [[TASK064-store-quote-database|TASK064]] (store-quote-database) - Quotes must exist in the database
