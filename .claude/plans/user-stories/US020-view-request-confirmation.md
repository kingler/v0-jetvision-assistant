# User Story ID: US020
# Title: View Request Confirmation
# Parent Epic: [[EPIC004-request-submission|EPIC004 - Flight Request Submission]]
# Status: Implemented
# Priority: High
# Story Points: 2

## User Story
As an ISO agent, I want to see confirmation after submitting a request, so that I know it was processed correctly.

## Acceptance Criteria

### AC1: Confirmation Details Display
**Given** a trip is created
**When** confirmation renders
**Then** I see route, date, passengers, trip ID, and status

## Tasks
- [[TASK048-display-request-confirmation|TASK048 - Render confirmation view with route, date, passengers, trip ID, and status after successful trip creation]]

## Technical Notes
- Confirmation is rendered inline in the chat as a TripSummaryCard component immediately after successful create_trip MCP tool execution
- The confirmation displays: departure airport (ICAO + city), arrival airport (ICAO + city), date(s), passenger count, Avinode trip ID, and current status
- Status is initially set to "created" (stage 1) upon successful submission
- The trip ID is displayed with a copy-to-clipboard action for easy reference
