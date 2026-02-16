# User Story ID: US057
# Title: Open Avinode via Deep Link
# Parent Epic: [[EPIC013-deep-link-workflow|EPIC013 - Avinode Deep Link Integration]]
# Status: Implemented
# Priority: Critical
# Story Points: 3

## User Story
As an ISO agent, I want to open Avinode via deep link, so I can select operators in the marketplace.

## Acceptance Criteria

### AC1: Deep link button opens Avinode
**Given** a trip is created
**When** I click "Open in Avinode"
**Then** Avinode Web UI opens with the trip loaded

### AC2: Trip is loaded on page open
**Given** the deep link opens
**When** the page loads
**Then** I see my trip with available operators

## Tasks
- [[TASK113-render-deep-link-button|TASK113 - Render deep link button]]
- [[TASK114-open-avinode-tab|TASK114 - Open Avinode in new tab]]

## Technical Notes
- Deep link URL is returned from `create_trip` MCP tool and stored in `avinode_deep_link` field on the requests table
- The `AvinodeDeepLinks` component in `components/avinode/` renders the clickable button
- Link opens in a new browser tab (`target="_blank"`) to preserve the Jetvision chat session
- Trip ID is embedded in the deep link URL for Avinode to load the correct trip context
