# Task ID: TASK038
# Task Name: Parse natural language flight requests via Jetvision system prompt
# Parent User Story: [[US016-submit-flight-request-via-chat|US016 - Submit a flight request via chat]]
# Status: Done
# Priority: Critical
# Estimate: 3h

## Description
Implement natural language parsing of flight requests through the Jetvision system prompt. The system prompt instructs the LLM to extract structured flight details (departure airport, arrival airport, date/time, passenger count, trip type) from free-form user messages such as "I need a flight from Teterboro to LA next Friday for 6 passengers."

## Acceptance Criteria
- System prompt includes instructions for extracting departure, arrival, date, time, and passenger count from natural language
- Handles various date formats (next Friday, March 15, 03/15/2026, tomorrow)
- Handles city names, airport names, and ICAO/IATA codes
- Extracts passenger count from various phrasings (6 pax, six passengers, party of 6)
- Prompts user for missing required fields before proceeding
- Supports one-way, round-trip, and multi-city trip type detection

## Implementation Details
- **File(s)**: `lib/prompts/jetvision-system-prompt.ts`
- **Approach**: Define structured extraction instructions within the Jetvision agent system prompt. The LLM uses function calling to invoke the `create_trip` MCP tool with parsed parameters. The system prompt specifies the expected parameter schema and instructs the model to ask clarifying questions when required fields are ambiguous or missing.

## Dependencies
- None (foundational task for flight request flow)
