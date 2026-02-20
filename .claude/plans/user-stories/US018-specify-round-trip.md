# User Story ID: US018
# Title: Specify Round Trip
# Parent Epic: [[EPIC004-request-submission|EPIC004 - Flight Request Submission]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As an ISO agent, I want to specify round-trip details, so that both legs are included in the request.

## Acceptance Criteria

### AC1: Round-Trip Leg Creation
**Given** I request a round-trip
**When** I provide return date
**Then** the trip is created with both outbound and return legs

### AC2: Round-Trip Card Display
**Given** round-trip data
**When** the TripSummaryCard renders
**Then** it shows both legs with trip type "round_trip"

## Tasks
- [[TASK044-create-round-trip|TASK044 - Parse round-trip intent and return date from natural language input]]
- [[TASK045-display-round-trip-card|TASK045 - Create both outbound and return legs via create_trip MCP tool and display in TripSummaryCard]]

## Technical Notes
- Round-trip detection is handled by the agent's natural language understanding (e.g., "round trip", "return on", "coming back")
- The create_trip MCP tool accepts multiple legs in a single call
- TripSummaryCard renders both legs with clear visual separation showing outbound and return routes
- Trip type field is set to "round_trip" in the requests table for proper categorization
