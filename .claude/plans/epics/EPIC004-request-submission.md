# Epic ID: EPIC004
# Epic Name: Flight Request Submission
# Parent Feature: [[F002-flight-request-management|F002 - Flight Request Management]]
# Status: Implemented
# Priority: Critical

## Description
Natural language flight request submission through the AI chat interface with intelligent NLP parsing. This epic covers the parsing of free-form text into structured flight request data, airport resolution from city names or codes, validation of required fields, and support for complex itineraries including round-trip and multi-leg requests.

## Goals
- Parse natural language flight requests into structured data (departure, arrival, date, time, passengers, aircraft preferences)
- Validate all required fields and prompt the user for missing information conversationally
- Resolve city names, airport names, and ICAO/IATA codes to canonical airport identifiers
- Support round-trip, one-way, and multi-city/multi-leg itinerary specifications
- Display a clear confirmation of the parsed request before trip creation

## User Stories
- [[US016-submit-flight-request-via-chat|US016 - Submit flight request via chat]]
- [[US017-resolve-city-names-to-airports|US017 - Resolve city names to airports]]
- [[US018-specify-round-trip|US018 - Specify round-trip details]]
- [[US019-specify-multi-city|US019 - Specify multi-city itinerary]]
- [[US020-view-request-confirmation|US020 - View request confirmation]]

## Acceptance Criteria Summary
- Free-form text like "I need a flight from Teterboro to LA next Friday for 6 passengers" is correctly parsed
- Airport resolution handles city names, ICAO codes (KTEB), IATA codes (LAX), and common airport names
- Missing required fields trigger follow-up questions from the AI
- Round-trip requests correctly capture both outbound and return legs
- Multi-city itineraries with 3+ legs are supported and displayed correctly
- Request confirmation card shows all parsed details for user review before proceeding

## Technical Scope
- lib/prompts/jetvision-system-prompt.ts - System prompt with flight request parsing instructions
- search_airports MCP tool - Airport search and resolution via Avinode MCP
- create_trip MCP tool - Trip creation on Avinode marketplace
- lib/chat/transformers/ - Request data transformation and validation
- Supabase requests table - Persistence of flight request records
