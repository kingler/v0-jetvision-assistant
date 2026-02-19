# User Story ID: US017
# Title: Resolve City Names to Airports
# Parent Epic: [[EPIC004-request-submission|EPIC004 - Flight Request Submission]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As an ISO agent, I want to use city names instead of ICAO codes, so that I don't have to memorize codes.

## Acceptance Criteria

### AC1: Automatic Airport Resolution
**Given** I say "flight from New York to Miami"
**When** the AI processes it
**Then** search_airports is called automatically before asking for clarification

### AC2: Multiple Airport Disambiguation
**Given** multiple airports exist for a city
**When** results return
**Then** the AI presents options (e.g., KJFK, KLGA, KEWR for New York)

## Tasks
- [[TASK042-call-search-airports|TASK042 - Implement automatic search_airports MCP tool invocation when city names are detected]]
- [[TASK043-present-airport-options|TASK043 - Build disambiguation flow presenting multiple airport options to the user]]

## Technical Notes
- The search_airports MCP tool is provided by the Avinode MCP server
- The agent's system prompt instructs it to automatically resolve city names to ICAO codes before proceeding with trip creation
- When multiple airports match a city, the agent presents them as selectable options with ICAO code, full name, and city
- Common city-to-airport mappings: New York (KJFK, KLGA, KEWR), London (EGLL, EGLC, EGSS), Los Angeles (KLAX, KVNY, KSMO)
