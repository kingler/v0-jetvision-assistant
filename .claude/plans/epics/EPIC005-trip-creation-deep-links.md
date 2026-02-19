# Epic ID: EPIC005
# Epic Name: Trip Creation & Deep Links
# Parent Feature: [[F002-flight-request-management|F002 - Flight Request Management]]
# Status: Implemented
# Priority: Critical

## Description
Avinode trip creation via MCP tools and deep link display for marketplace interaction. This epic covers the end-to-end flow from creating a trip on the Avinode platform, receiving the trip ID and deep link URL, displaying an actionable "Open in Avinode" button, and guiding the sales representative through the manual operator selection process in the Avinode Web UI.

## Goals
- Create trips on the Avinode marketplace via the create_trip MCP tool
- Display "Open in Avinode" deep link button prominently after trip creation
- Provide a trip summary card with route, dates, passenger count, and status
- Guide the user through the human-in-the-loop operator selection workflow

## User Stories
- [[US021-create-trip-see-deep-link|US021 - Create trip and see deep link]]
- [[US022-open-avinode-marketplace|US022 - Open Avinode marketplace]]
- [[US023-view-trip-summary-card|US023 - View trip summary card]]
- [[US024-copy-trip-id|US024 - Copy trip ID]]

## Acceptance Criteria Summary
- Trip creation call to Avinode MCP returns trip_id, rfq_id, and deep_link URL
- Deep link button is prominently displayed and opens the Avinode Web UI in a new tab
- Trip summary card shows departure, arrival, date/time, passengers, and trip status
- Trip ID is copyable to clipboard with visual confirmation
- Trip data (trip_id, rfq_id, deep_link) is persisted to the Supabase requests table
- Error states (API failure, invalid route) display appropriate error messages

## Technical Scope
- components/avinode/trip-summary-card.tsx - Trip overview with route and status display
- components/avinode/avinode-deep-links.tsx - Clickable deep link button component
- components/avinode/deep-link-prompt.tsx - Instructional prompt for marketplace interaction
- components/mcp-ui/composites/TripCreatedUI.tsx - Composite UI for trip creation result
- create_trip MCP tool - Avinode trip creation endpoint
- Supabase requests table - avinode_trip_id, avinode_rfp_id, avinode_deep_link fields
