# Task ID: TASK116
# Task Name: Wire Webhook Subscription to Active Session
# Parent User Story: [[US058-return-from-avinode-with-context|US058 - Maintain session while interacting with Avinode]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Connect the Avinode webhook event subscription to the active chat session using the trip_id as the correlation key. When Avinode sends webhook events (quote received, message sent), they should be routed to the correct chat session and displayed in real-time.

## Acceptance Criteria
- Webhook events are correlated to chat sessions via trip_id
- SSE endpoint streams relevant events to the subscribed client
- New quote notifications appear in the chat in real-time
- Operator messages are displayed when received
- Subscription is established when a trip is created
- Subscription survives page visibility changes (reconnects)
- Multiple sessions can subscribe to the same trip
- Unsubscribe on session close/navigation away

## Implementation Details
- **File(s)**: lib/chat/hooks/use-webhook-subscription.ts
- **Approach**: Create a custom React hook that manages SSE subscription to /api/avinode/events?trip_id={trip_id}. The hook connects when a trip_id is available in the chat context, handles reconnection on disconnect, and dispatches received events to the chat state manager. Use EventSource API with automatic reconnection. Clean up subscription on unmount.

## Dependencies
- [[TASK115-preserve-session-context|TASK115]] (Preserve session context) - session must persist
- Avinode webhook handler at /api/webhooks/avinode
- SSE endpoint at /api/avinode/events
- Trip must be created with a trip_id
