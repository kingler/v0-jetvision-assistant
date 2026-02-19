# Task ID: TASK059
# Task Name: Call cancel_trip MCP when request has avinode_trip_id
# Parent User Story: [[US026-cancel-active-request|US026 - Cancel a flight request]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
When cancelling a flight request that has an associated Avinode trip, call the cancel_trip MCP tool to cancel the trip in the Avinode system as well. This ensures the cancellation is synchronized between Jetvision and Avinode.

## Acceptance Criteria
- When a request with a non-null avinode_trip_id is cancelled, cancel_trip MCP is called
- cancel_trip receives the avinode_trip_id as a parameter
- Successful Avinode cancellation is logged
- If Avinode cancellation fails, the local request is still cancelled but a warning is logged
- Avinode cancellation failure does not block the user-facing cancellation
- If the request has no avinode_trip_id, the MCP call is skipped
- Cancellation status is reflected in both systems

## Implementation Details
- **File(s)**: `app/api/requests/route.ts`
- **Approach**: In the cancel action handler, after validating the request, check if `avinode_trip_id` is present. If so, invoke the cancel_trip MCP tool with the trip ID. Wrap the MCP call in a try-catch so that Avinode API failures do not prevent the local cancellation from completing. Log the outcome either way for debugging.

## Dependencies
- [[TASK058-cancel-request-api|TASK058]] (cancel-request-api) - Local cancellation endpoint
- [[TASK040-call-create-trip-mcp|TASK040]] (call-create-trip-mcp) - Avinode MCP server must be connected
