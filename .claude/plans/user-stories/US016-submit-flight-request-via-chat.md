# User Story ID: US016
# Title: Submit Flight Request via Chat
# Parent Epic: [[EPIC004-request-submission|EPIC004 - Flight Request Submission]]
# Status: Implemented
# Priority: Critical
# Story Points: 5

## User Story
As an ISO agent, I want to submit a flight request by describing it in natural language, so that I can create RFPs quickly.

## Acceptance Criteria

### AC1: Natural Language Trip Creation
**Given** I type "I need a flight from KTEB to KLAX on Jan 15, 3 passengers"
**When** the AI processes it
**Then** a trip is created on Avinode with correct details

### AC2: Missing Field Detection
**Given** I provide incomplete details
**When** the AI detects missing fields
**Then** it asks me for the missing information (departure, arrival, date, passengers)

### AC3: Trip Summary Display
**Given** trip creation succeeds
**When** the response renders
**Then** I see a TripSummaryCard with deep link button

## Tasks
- [[TASK038-parse-flight-request-nlp|TASK038 - Implement natural language parsing for flight request parameters]]
- [[TASK039-validate-required-fields|TASK039 - Integrate create_trip MCP tool call from parsed parameters]]
- [[TASK040-call-create-trip-mcp|TASK040 - Build conversational flow for missing field collection]]
- [[TASK041-display-trip-confirmation|TASK041 - Render TripSummaryCard component with deep link after successful creation]]

## Technical Notes
- The JetvisionAgent uses OpenAI function calling to extract structured flight data from natural language input
- The create_trip MCP tool is called via the Avinode MCP server
- Missing field detection leverages the agent's system prompt to identify required parameters (departure, arrival, date, passengers)
- TripSummaryCard component is located in `components/avinode/` and displays route, date, passengers, and the "Open in Avinode" deep link button
