# Task ID: TASK046
# Task Name: Create trip with multiple segments
# Parent User Story: [[US019-specify-multi-city|US019 - Create multi-city flight requests]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Support creating multi-city (multi-segment) flights by passing three or more legs to the create_trip MCP tool. Each segment has its own departure, arrival, date, and time, allowing complex itineraries like NYC → Miami → Chicago → NYC.

## Acceptance Criteria
- create_trip accepts trip_type "multi_city" with 3+ legs in the legs array
- Each leg has independent departure, arrival, date, and time
- Legs are validated for chronological order (each leg date >= previous leg date)
- Agent detects multi-city intent from phrases like "then to", "with a stop in", "multi-city"
- Single trip_id and deep_link are returned for the entire itinerary
- Maximum of 10 legs per trip (Avinode API limit)
- Error handling for invalid leg sequences

## Implementation Details
- **File(s)**: `mcp-servers/avinode-mcp-server/`
- **Approach**: Extend the create_trip tool to handle legs arrays with 3+ entries for multi-city trips. The system prompt includes instructions for the LLM to parse complex multi-city itineraries and structure them as ordered legs. Validation ensures chronological ordering and that connecting airports make sense.

## Dependencies
- [[TASK040-call-create-trip-mcp|TASK040]] (call-create-trip-mcp) - Base trip creation functionality
- [[TASK044-create-round-trip|TASK044]] (create-round-trip) - Legs array pattern established here
