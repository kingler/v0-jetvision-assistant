# User Story ID: US117
# Title: Real-Time Operator Message Notifications
# Parent Epic: [[EPIC028-webhook-subscription|EPIC028 - Avinode Webhook & Real-Time Events]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As an ISO agent, I want real-time operator message notifications, so I don't miss messages.

## Acceptance Criteria

### AC1: Operator Message Event Handling
**Given** I am subscribed to webhook events for a trip
**When** an operator_message event arrives via the websocket connection
**Then** the onMessageReceived callback fires with the quoteId and message content

## Tasks
- [[TASK221-handle-operator-message-events|TASK221 - Handle operator_message events from Supabase Realtime subscription]]

## Technical Notes
- Event type `TripChatSeller` from Avinode maps to operator_message
- Payload includes quoteId, operator name, message text, and timestamp
- Messages stored in `avinode_webhook_events` with event_type = 'TripChatSeller'
- Handler updates chat thread for the specific operator
- Notification includes operator name and message preview
