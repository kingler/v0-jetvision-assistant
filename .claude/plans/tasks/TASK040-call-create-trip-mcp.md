# Task ID: TASK040
# Task Name: Call create_trip MCP tool with parsed flight details
# Parent User Story: [[US016-submit-flight-request-via-chat|US016 - Submit a flight request via chat]]
# Status: Done
# Priority: Critical
# Estimate: 3h

## Description
Implement the create_trip MCP tool invocation that sends parsed and validated flight details to the Avinode API. The tool creates a trip in Avinode and returns a trip ID and deep link URL for the sales representative to use.

## Acceptance Criteria
- create_trip MCP tool is called with correct parameters (departure, arrival, date, time, passengers, trip_type)
- Tool handles one-way, round-trip, and multi-city trip types
- Successful response includes trip_id and deep_link URL
- Error responses are handled gracefully with user-friendly messages
- API authentication is handled via environment variables
- Request/response is logged for debugging

## Implementation Details
- **File(s)**: `mcp-servers/avinode-mcp-server/`
- **Approach**: The Avinode MCP server exposes a `create_trip` tool that accepts structured flight parameters and calls the Avinode API. The tool definition includes the JSON schema for parameters, and the implementation maps these to the Avinode API endpoint. Response includes trip_id and deep_link which are returned to the agent for display and storage.

## Dependencies
- [[TASK038-parse-flight-request-nlp|TASK038]] (parse-flight-request-nlp) - Parsed fields needed as input
- [[TASK039-validate-required-fields|TASK039]] (validate-required-fields) - Fields must be validated before calling
