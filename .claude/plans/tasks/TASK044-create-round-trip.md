# Task ID: TASK044
# Task Name: Create trip with outbound and return legs
# Parent User Story: [[US018-specify-round-trip|US018 - Create round-trip flight requests]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Support creating round-trip flights by passing both outbound and return leg details to the create_trip MCP tool. The trip is created as a single entity with two legs in the Avinode system.

## Acceptance Criteria
- create_trip accepts a trip_type of "round_trip" with two legs
- Outbound leg has departure, arrival, date, and time
- Return leg has reversed departure/arrival with its own date and time
- Both legs are included in a single API call to Avinode
- Agent detects round-trip intent from phrases like "round trip", "return on", "coming back"
- Return date must be on or after the outbound date
- Single trip_id and deep_link are returned for both legs

## Implementation Details
- **File(s)**: `mcp-servers/avinode-mcp-server/`
- **Approach**: Extend the create_trip tool schema to accept a `legs` array with two entries for round-trip. The Avinode API call includes both legs in the trip creation payload. The system prompt is updated to instruct the LLM on detecting round-trip requests and structuring the legs array correctly.

## Dependencies
- [[TASK040-call-create-trip-mcp|TASK040]] (call-create-trip-mcp) - Base trip creation functionality
