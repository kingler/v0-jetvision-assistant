# User Story ID: US021
# Title: Create Trip and See Avinode Deep Link
# Parent Epic: [[EPIC005-trip-creation-deep-links|EPIC005 - Avinode Deep Link Integration]]
# Status: Implemented
# Priority: Critical
# Story Points: 5

## User Story
As an ISO agent, I want to create a trip and see the Avinode deep link, so that I can select operators in the marketplace.

## Acceptance Criteria

### AC1: Deep Link URL Display
**Given** the AI calls create_trip
**When** it succeeds
**Then** the deep link URL is returned and displayed as a prominent button

### AC2: Visual Prominence
**Given** the deep link renders
**When** I see the "Open in Avinode" button
**Then** it's visually prominent with clear call-to-action

### AC3: Database Persistence
**Given** the trip is saved
**When** data persists
**Then** avinode_trip_id, avinode_rfq_id, and avinode_deep_link are stored in the requests table

## Tasks
- [[TASK049-create-trip-get-deep-link|TASK049 - Extract deep link URL from create_trip MCP tool response and pass to UI]]
- [[TASK050-display-deep-link-button|TASK050 - Build visually prominent "Open in Avinode" deep link button component with clear call-to-action styling]]
- [[TASK051-store-avinode-ids|TASK051 - Persist avinode_trip_id, avinode_rfq_id, and avinode_deep_link to the requests table in Supabase]]

## Technical Notes
- The create_trip MCP tool returns a response containing trip_id, rfq_id, and deep_link URL
- The deep link URL format points to the Avinode Web UI with the trip pre-loaded for operator selection
- Database fields were added in migration 015: avinode_rfp_id (TEXT), avinode_trip_id (TEXT), avinode_deep_link (TEXT)
- The AvinodeDeepLinks component in `components/avinode/` renders the button with prominent styling
- The deep link opens in a new browser tab (target="_blank") with rel="noopener noreferrer" for security
