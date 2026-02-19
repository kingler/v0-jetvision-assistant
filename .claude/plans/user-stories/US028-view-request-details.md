# User Story ID: US028
# Title: View Request Details
# Parent Epic: [[EPIC006-request-lifecycle|EPIC006 - Request Lifecycle Management]]
# Status: Implemented
# Priority: High
# Story Points: 2

## User Story
As an ISO agent, I want to view full request details, so that I have complete context.

## Acceptance Criteria

### AC1: Complete Request Information
**Given** a request exists
**When** I view details
**Then** I see route, dates, passengers, status, quotes count, and all history

## Tasks
- [[TASK061-view-request-details|TASK061 - Build request detail view displaying route, dates, passengers, status, quotes count, and full activity history]]

## Technical Notes
- The request detail view aggregates data from multiple database tables: requests, quotes, messages, and activity logs
- Route information includes departure and arrival airports with ICAO codes and city names
- Dates show both outbound and return (for round-trip) with formatted timestamps
- Quotes count shows total received, with breakdown by status (pending, accepted, declined, expired)
- History includes a chronological activity log: creation, trip creation, RFQ sent, quotes received, status changes, and communications
- The detail view is accessible from the sidebar request list and from within chat context
