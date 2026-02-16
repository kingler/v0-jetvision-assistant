# Task ID: TASK218
# Task Name: Supabase Realtime Subscription
# Parent User Story: [[US115-subscribe-webhook-by-trip|US115 - Avinode Webhook Realtime Events]]
# Status: Done
# Priority: Critical
# Estimate: 5h

## Description
Implement a React hook that subscribes to the `avinode_webhook_events` table via Supabase Realtime. The hook listens for INSERT events and provides real-time quote and message notifications to the chat interface.

## Acceptance Criteria
- useWebhookSubscription(tripId) subscribes to avinode_webhook_events table
- Listens for INSERT events only (new webhook events)
- Connection is established on mount and cleaned up on unmount
- Handles connection errors with automatic retry (exponential backoff)
- Provides connection status: connecting, connected, disconnected, error
- Events are typed as AvinodeWebhookEvent with proper TypeScript interface
- Maximum 3 retry attempts before entering error state
- Stale subscriptions are cleaned up when tripId changes

## Implementation Details
- **File(s)**: lib/chat/hooks/use-webhook-subscription.ts
- **Approach**: Create a custom React hook that uses Supabase's realtime channel API. On mount, create a channel subscription to the `avinode_webhook_events` table with a filter on the event type. Use useEffect for lifecycle management. Track connection status in state. Implement retry logic with exponential backoff (1s, 2s, 4s). Return { events, status, error } from the hook.

## Dependencies
- Supabase client (lib/supabase)
- avinode_webhook_events table with Realtime enabled
- Supabase Realtime feature configured on the project
