# User Story ID: US032
# Title: View Aircraft Details on Quotes
# Parent Epic: [[EPIC007-quote-reception-display|EPIC007 - Quote Management]]
# Status: Implemented
# Priority: High
# Story Points: 2

## User Story
As an ISO agent, I want to see aircraft details on quotes, so that I can match client preferences.

## Acceptance Criteria

### AC1: Aircraft Information Display
**Given** a quote has aircraft data
**When** it renders
**Then** I see aircraft type, model, year, capacity, tail number, and photo (if available)

## Tasks
- [[TASK068-display-aircraft-details|TASK068 - Build aircraft details section within quote card displaying type, model, year, capacity, tail number, and optional photo]]

## Technical Notes
- Aircraft details are extracted from the Avinode quote response payload
- Fields displayed: aircraft type (e.g., "Light Jet"), model (e.g., "Citation CJ3+"), year of manufacture, passenger capacity, tail number, and aircraft photo URL (if provided by the operator)
- Aircraft photos are loaded lazily with a placeholder silhouette shown while loading or if unavailable
- The aircraft details section is part of the RFQQuoteDetailsCard component in `components/avinode/`
- Capacity information helps agents match client group size to available aircraft
