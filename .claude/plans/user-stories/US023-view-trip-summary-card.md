# User Story ID: US023
# Title: View Trip Summary Card
# Parent Epic: [[EPIC005-trip-creation-deep-links|EPIC005 - Avinode Deep Link Integration]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As an ISO agent, I want to see a trip summary card, so that I have all trip details at a glance.

## Acceptance Criteria

### AC1: Trip Details Display
**Given** a trip exists
**When** the TripSummaryCard renders
**Then** I see departure/arrival airports with ICAO codes and cities, date, passengers, status, and trip type

### AC2: Multi-City Segment Expansion
**Given** a multi-city trip
**When** segments exist
**Then** they expand to show all legs

## Tasks
- [[TASK053-implement-trip-summary-card|TASK053 - Build TripSummaryCard component displaying departure/arrival airports (ICAO + city), date, passengers, status, and trip type]]
- [[TASK054-expandable-multi-city|TASK054 - Implement expandable segment view for multi-city trips within TripSummaryCard]]

## Technical Notes
- TripSummaryCard is located in `components/avinode/` and renders as an inline chat card
- The card displays: departure airport (ICAO code + city name), arrival airport (ICAO code + city name), date(s), passenger count, trip status badge, and trip type (one_way, round_trip, multi_city)
- Multi-city trips use an expandable/collapsible pattern to show individual legs
- The card includes the "Open in Avinode" deep link button and copy-trip-ID action
- Status is displayed using the FlightRequestStageBadge component for consistent stage visualization
