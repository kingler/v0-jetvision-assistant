# User Story ID: US115
# Title: Subscribe to Webhook Events by Trip ID
# Parent Epic: [[EPIC028-webhook-subscription|EPIC028 - Avinode Webhook & Real-Time Events]]
# Status: Implemented
# Priority: Critical
# Story Points: 5

## User Story
As the system, I want to subscribe to webhook events by trip ID, so updates route to the correct session.

## Acceptance Criteria

### AC1: Trip-Specific Event Subscription
**Given** a trip ID is known for the current session
**When** useWebhookSubscription subscribes to events
**Then** only webhook events matching that trip ID are received by the subscriber

### AC2: Connection Status Callbacks
**Given** a webhook subscription connection is active
**When** the connection status changes
**Then** the onStatusChange callback fires with the appropriate status ('connecting', 'connected', 'disconnected', or 'error')

## Tasks
- [[TASK218-supabase-realtime-sub|TASK218 - Implement Supabase Realtime subscription for avinode_webhook_events table]]
- [[TASK219-filter-by-trip-id|TASK219 - Filter incoming events by trip_id to route to correct session]]

## Technical Notes
- Uses Supabase Realtime (PostgreSQL Changes) for event streaming
- Subscribes to INSERT events on `avinode_webhook_events` table
- Filter applied at subscription level: `filter: 'trip_id=eq.{tripId}'`
- Connection status tracked via Supabase channel status callbacks
- Auto-reconnection handled by Supabase Realtime client
- Hook cleans up subscription on component unmount
