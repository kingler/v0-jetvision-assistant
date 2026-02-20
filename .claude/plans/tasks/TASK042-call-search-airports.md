# Task ID: TASK042
# Task Name: Call search_airports when city names given instead of ICAO codes
# Parent User Story: [[US017-resolve-city-names-to-airports|US017 - Resolve airport codes from city names]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
When users provide city names (e.g., "New York", "Los Angeles") instead of ICAO codes, the agent calls the search_airports MCP tool to resolve them to valid airport codes. The tool searches by city name, airport name, or partial ICAO/IATA codes.

## Acceptance Criteria
- search_airports MCP tool is called when input is a city name rather than a valid ICAO code
- Tool accepts partial matches and returns a list of matching airports
- Each result includes ICAO code, IATA code, airport name, and city name
- Results are ordered by relevance/popularity
- Tool handles international city names and common abbreviations
- Empty results return a helpful message suggesting alternatives

## Implementation Details
- **File(s)**: `mcp-servers/avinode-mcp-server/`
- **Approach**: The Avinode MCP server exposes a `search_airports` tool that queries the Avinode airport database. The agent's system prompt instructs it to call search_airports when the user provides a city name or ambiguous identifier. The tool returns an array of airport objects that the agent can present to the user or auto-select if there is only one match.

## Dependencies
- [[TASK038-parse-flight-request-nlp|TASK038]] (parse-flight-request-nlp) - Parsing identifies when city names are used
