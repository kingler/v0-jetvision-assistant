# User Story ID: US019
# Title: Specify Multi-City Itinerary
# Parent Epic: [[EPIC004-request-submission|EPIC004 - Flight Request Submission]]
# Status: Implemented
# Priority: Medium
# Story Points: 5

## User Story
As an ISO agent, I want to specify multi-city itineraries, so that complex trips are supported.

## Acceptance Criteria

### AC1: Multi-Segment Parsing
**Given** I describe a multi-city trip
**When** segments are parsed
**Then** each leg is created as a separate segment

### AC2: Multi-City Card Display
**Given** multi-city data
**When** the trip card renders
**Then** all segments display with expandable details

## Tasks
- [[TASK046-create-multi-city-trip|TASK046 - Parse multi-city itinerary segments from natural language (e.g., "New York to Miami, then Miami to Chicago, then Chicago to New York")]]
- [[TASK047-display-multi-city-segments|TASK047 - Render multi-segment TripSummaryCard with expandable leg details]]

## Technical Notes
- Multi-city trips involve three or more legs with potentially different dates and passenger counts per segment
- The create_trip MCP tool supports an array of leg objects for multi-city itineraries
- The TripSummaryCard uses an expandable/collapsible UI pattern to show all segments without overwhelming the view
- Trip type field is set to "multi_city" in the requests table
- Each segment stores departure, arrival, date, and passenger count independently
