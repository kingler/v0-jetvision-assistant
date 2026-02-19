# User Story ID: US007
# Title: Extract Trip Data from Stream
# Parent Epic: [[EPIC002-streaming-realtime|EPIC002 - Real-Time Streaming and Data Extraction]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As an ISO agent, I want trip data to be automatically extracted from AI responses, so that trip cards render without manual steps.

## Acceptance Criteria

### AC1: TripCreatedUI renders on create_trip result
**Given** the AI calls create_trip
**When** the tool result includes tripId and deepLink
**Then** TripCreatedUI component renders with trip summary and Avinode button

### AC2: Trip ID copyable and deep link functional
**Given** trip data is extracted
**When** the component renders
**Then** the trip ID is copyable and the deep link opens Avinode

## Tasks
- [[TASK018-extract-trip-data-sse|TASK018 - Extract trip data from SSE]]
- [[TASK019-render-trip-created-ui|TASK019 - Render TripCreatedUI composite]]

## Technical Notes
- Trip data extraction happens in the SSE parser when `create_trip` tool results are detected
- The `TripCreatedUI` component is a composite that includes trip summary, route visualization, and Avinode deep link button
- Trip ID uses a click-to-copy pattern with clipboard API integration
- The Avinode deep link opens in a new tab/window pointing to the Avinode Web UI
- Extracted trip data is stored in the SSEParseResult's `tripData` field
- The `tool-ui-registry.ts` maps tool names to their corresponding UI components
