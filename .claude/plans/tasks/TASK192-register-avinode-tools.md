# Task ID: TASK192
# Task Name: Register Avinode Tools
# Parent User Story: [[US099-connect-avinode-mcp|US099 - Avinode MCP Server Integration]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Register all 8 Avinode tools with the MCP server including their JSON Schema definitions, descriptions, and handler functions: create_trip, get_rfq, get_quote, cancel_trip, send_trip_message, get_trip_messages, search_airports, search_empty_legs.

## Acceptance Criteria
- create_trip: Creates a trip with legs (departure, arrival, date, pax) and returns trip_id + deep_link
- get_rfq: Retrieves RFQ details by rfq_id with operator responses
- get_quote: Gets quote details by quote_id with pricing breakdown
- cancel_trip: Cancels an active trip by trip_id
- send_trip_message: Sends message to operator(s) on a trip
- get_trip_messages: Retrieves message history for a trip
- search_airports: Searches airports by ICAO/IATA code or name
- search_empty_legs: Finds empty leg flights by route and date range
- Each tool has complete JSON Schema for input parameters
- Each tool returns structured JSON responses

## Implementation Details
- **File(s)**: mcp-servers/avinode-mcp-server/
- **Approach**: Define each tool with name, description, and inputSchema (JSON Schema). Implement handler functions that map to Avinode API endpoints. Use a switch statement or handler map in the tools/call request handler to route to the correct function.

## Dependencies
- [[TASK191-avinode-mcp-server|TASK191]] (avinode-mcp-server)
- Avinode API endpoint documentation
