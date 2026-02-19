# User Story ID: US022
# Title: Open Avinode Marketplace via Deep Link
# Parent Epic: [[EPIC005-trip-creation-deep-links|EPIC005 - Avinode Deep Link Integration]]
# Status: Implemented
# Priority: Critical
# Story Points: 2

## User Story
As an ISO agent, I want to open the Avinode marketplace via deep link, so that I can browse and select operators.

## Acceptance Criteria

### AC1: Deep Link Navigation
**Given** I click "Open in Avinode"
**When** the link activates
**Then** Avinode Web UI opens in a new browser tab with the trip pre-loaded

### AC2: Operator Selection and RFP Flow
**Given** I'm in Avinode
**When** I select operators and send RFP
**Then** quotes will flow back via webhooks

## Tasks
- [[TASK052-open-avinode-new-tab|TASK052 - Implement deep link button click handler that opens Avinode Web UI in a new tab with the trip pre-loaded]]

## Technical Notes
- The deep link is a standard HTTPS URL pointing to the Avinode Web marketplace
- The link opens with target="_blank" and includes rel="noopener noreferrer" for security
- Once the user is in Avinode, they manually browse operators, select preferred aircraft, and send RFPs
- This is the human-in-the-loop step in the workflow, ensuring manual operator selection
- After the user sends RFPs in Avinode, operator responses arrive via webhook events (TripRequestSellerResponse) to `/api/webhooks/avinode`
- The SSE endpoint `/api/avinode/events` pushes real-time updates to the frontend
