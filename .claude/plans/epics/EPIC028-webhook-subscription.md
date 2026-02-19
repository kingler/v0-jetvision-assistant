# Epic ID: EPIC028
# Epic Name: Webhook Event Subscription
# Parent Feature: [[F012-realtime-notifications|F012 - Real-Time Notification Pipeline]]
# Status: Implemented
# Priority: High

## Description
Supabase Realtime channel subscription system that delivers Avinode webhook events to the chat interface in real time. Subscribes to the avinode_webhook_events table filtered by trip or request ID, handles connection lifecycle including automatic reconnection on network interruption, and surfaces connection status to the UI.

## Goals
- Deliver real-time webhook events to the chat interface without polling
- Support filtering subscriptions by trip ID or flight request ID
- Automatically reconnect on network interruption with exponential backoff
- Expose connection status for UI health indicators

## User Stories
- [[US115-subscribe-webhook-by-trip|US115 - Subscribe to webhook events filtered by active trip ID]]
- [[US116-receive-realtime-quote-notification-ws|US116 - Receive real-time notification when an operator submits a quote]]
- [[US117-receive-operator-message-notification-ws|US117 - Receive real-time notification when an operator sends a chat message]]
- [[US118-handle-connection-status|US118 - Handle connection status changes (connected, disconnecting, reconnecting, error)]]

## Acceptance Criteria Summary
- Supabase Realtime channel subscribes to INSERT events on avinode_webhook_events table
- Subscriptions are filtered by trip_id or request_id to avoid irrelevant events
- Connection automatically reconnects within 5 seconds of network interruption
- Connection status is exposed via a reactive state (hook or observable)
- Subscriptions are properly cleaned up on component unmount or session change
- Events are parsed and typed before delivery to consumers

## Technical Scope
- lib/chat/hooks/use-webhook-subscription.ts - React hook for Supabase Realtime subscription
- Supabase Realtime channels - postgres_changes subscription on avinode_webhook_events
- Connection lifecycle management - subscribe, unsubscribe, reconnect, error handling
- Event type parsing - TripRequestSellerResponse, TripChatSeller, TripChatMine
