# User Story ID: US062
# Title: View Webhook Status
# Parent Epic: [[EPIC014-webhook-processing|EPIC014 - Avinode Webhook Processing]]
# Status: Implemented
# Priority: Medium
# Story Points: 2

## User Story
As an ISO agent, I want to see webhook status, so I know if the connection is working.

## Acceptance Criteria

### AC1: Status indicator shows connection info
**Given** a webhook connection
**When** status indicator renders
**Then** it shows last event time and type

## Tasks
- [[TASK123-webhook-status-indicator|TASK123 - Implement webhook status indicator]]

## Technical Notes
- The `WebhookStatusIndicator` component in `components/avinode/` displays connection health
- Status shows the timestamp and event type of the last received webhook event
- Visual indicators (green/yellow/red) communicate connection state at a glance
- Status updates in real-time as webhook events are received via SSE
