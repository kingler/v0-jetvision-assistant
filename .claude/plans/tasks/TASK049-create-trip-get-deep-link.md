# Task ID: TASK049
# Task Name: create_trip returns tripId + deepLink URL
# Parent User Story: [[US021-create-trip-see-deep-link|US021 - Receive Avinode deep link after trip creation]]
# Status: Done
# Priority: Critical
# Estimate: 3h

## Description
Ensure the create_trip MCP tool response includes both the Avinode trip ID and a deep link URL that navigates directly to the trip in the Avinode Web UI. This deep link is the bridge between the Jetvision assistant and the Avinode platform for the human-in-the-loop workflow.

## Acceptance Criteria
- create_trip response includes `trip_id` field (e.g., "trp456789")
- create_trip response includes `deep_link` field (full Avinode Web UI URL)
- Deep link URL follows the Avinode URL pattern and includes the trip ID
- Both fields are non-null on successful trip creation
- Deep link is validated as a well-formed URL before returning
- Error response clearly indicates if deep link generation failed

## Implementation Details
- **File(s)**: `mcp-servers/avinode-mcp-server/`
- **Approach**: The Avinode API returns a trip ID upon successful creation. The MCP server constructs the deep link URL using the Avinode Web UI base URL pattern combined with the trip ID. Both values are included in the tool's return schema. The deep link format follows Avinode's standard URL structure for direct trip access.

## Dependencies
- [[TASK040-call-create-trip-mcp|TASK040]] (call-create-trip-mcp) - Base create_trip implementation
