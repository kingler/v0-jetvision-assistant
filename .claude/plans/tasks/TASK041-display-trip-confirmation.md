# Task ID: TASK041
# Task Name: Show TripCreatedUI after successful trip creation
# Parent User Story: [[US016-submit-flight-request-via-chat|US016 - Submit a flight request via chat]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Display a rich confirmation card (TripCreatedUI) in the chat interface after a trip is successfully created. The card shows route details, dates, passenger count, trip ID, status, and an "Open in Avinode" deep link button.

## Acceptance Criteria
- TripCreatedUI component renders after successful create_trip response
- Displays departure and arrival airports with ICAO codes and city names
- Shows date/time of departure
- Shows passenger count
- Displays trip ID with copy-to-clipboard functionality
- Shows trip status (e.g., "Created", "Pending")
- Includes "Open in Avinode" deep link button
- Component is responsive and works on mobile widths
- Integrates with the MCP UI tool registry for automatic rendering

## Implementation Details
- **File(s)**: `components/mcp-ui/composites/TripCreatedUI.tsx`
- **Approach**: Create a composite UI component that receives the create_trip tool response and renders a structured card. The component is registered in the tool-ui-registry so it automatically renders when the create_trip tool returns successfully. Uses the design system tokens for consistent styling.

## Dependencies
- [[TASK040-call-create-trip-mcp|TASK040]] (call-create-trip-mcp) - Needs trip creation response data
