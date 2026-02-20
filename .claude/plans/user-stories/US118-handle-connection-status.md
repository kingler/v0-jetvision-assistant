# User Story ID: US118
# Title: Connection Status Indicator
# Parent Epic: [[EPIC028-webhook-subscription|EPIC028 - Avinode Webhook & Real-Time Events]]
# Status: Implemented
# Priority: High
# Story Points: 2

## User Story
As an ISO agent, I want to see connection status, so I know if real-time updates are working.

## Acceptance Criteria

### AC1: Active Connection Indicator
**Given** the AvinodeConnectionStatus component is rendered
**When** the websocket connection is active and healthy
**Then** a green indicator shows with "Connected" status

### AC2: Auto-Reconnection on Disconnect
**Given** the websocket connection drops
**When** disconnection is detected
**Then** reconnection attempts begin automatically with exponential backoff

## Tasks
- [[TASK222-connection-status-component|TASK222 - Implement AvinodeConnectionStatus component with visual indicators]]
- [[TASK223-auto-reconnect|TASK223 - Implement auto-reconnect logic with exponential backoff]]

## Technical Notes
- Component located at `components/avinode/AvinodeConnectionStatus`
- Visual states: green (connected), yellow (connecting), red (disconnected/error)
- Supabase Realtime handles reconnection natively
- Additional retry logic wraps subscription re-establishment
- Status exposed via useWebhookSubscription hook's onStatusChange callback
