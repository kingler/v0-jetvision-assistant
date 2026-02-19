# User Story ID: US116
# Title: Real-Time Quote Notifications via WebSocket
# Parent Epic: [[EPIC028-webhook-subscription|EPIC028 - Avinode Webhook & Real-Time Events]]
# Status: Implemented
# Priority: Critical
# Story Points: 3

## User Story
As an ISO agent, I want real-time quote notifications via websocket, so I see new quotes instantly.

## Acceptance Criteria

### AC1: Quote Received Event Handling
**Given** I am subscribed to webhook events for a trip
**When** a quote_received event arrives via the websocket connection
**Then** the onQuoteReceived callback fires with the quoteId and quote details

## Tasks
- [[TASK220-handle-quote-events|TASK220 - Handle quote_received events from Supabase Realtime subscription]]

## Technical Notes
- Event type `TripRequestSellerResponse` from Avinode maps to quote_received
- Payload includes quoteId, operator name, aircraft type, and pricing
- Quote data stored in `avinode_webhook_events` table with event_type discriminator
- Frontend handler triggers UI update, toast notification, and system message
- Latency target: under 2 seconds from webhook receipt to UI display
