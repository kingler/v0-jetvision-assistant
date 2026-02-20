# Epic ID: EPIC014
# Epic Name: Avinode Webhook Processing
# Parent Feature: [[F006-avinode-marketplace-integration|F006 - Avinode Integration]]
# Status: Implemented
# Priority: Critical

## Description
Handles the ingestion, validation, and processing of webhook events sent by the Avinode platform. These events include operator quote submissions, chat messages, and trip status updates. Each event is validated, deduplicated, stored in an audit log, and routed to the appropriate downstream handler to trigger real-time UI updates and workflow state transitions.

## Goals
- Reliably ingest and process all Avinode webhook events with zero data loss
- Store every webhook event in an audit log for traceability and debugging
- Trigger downstream actions (quote analysis, message display, state transitions) based on event type
- Handle webhook retries and deduplication to prevent duplicate processing

## User Stories
- [[US060-process-quote-webhook|US060 - Process quote webhook: System receives a TripRequestSellerResponse event, extracts quote details, and stores the operator quote in the database]]
- [[US061-process-operator-message-webhook|US061 - Process operator message webhook: System receives a TripChatSeller event, fetches full message details, and stores the message for display]]
- [[US062-view-webhook-status|US062 - View webhook status indicator: ISO agent sees a real-time indicator showing webhook connection health and recent event status]]
- [[US063-handle-webhook-deduplication|US063 - Handle webhook retry and deduplication: System detects and discards duplicate webhook deliveries using event IDs]]

## Acceptance Criteria Summary
- Webhook endpoint accepts POST requests with valid Avinode payloads and returns 200 OK
- Invalid or malformed payloads are rejected with appropriate HTTP status codes
- All webhook events are stored in the avinode_webhook_events table with full payload
- Duplicate events (same event ID) are detected and skipped without re-processing
- TripRequestSellerResponse events trigger quote storage and SSE notification
- TripChatSeller events trigger message fetch and storage
- Webhook status indicator reflects real-time connection health in the UI

## Technical Scope
- `app/api/webhooks/avinode/route.ts` - Webhook endpoint handler
- `webhook-utils.ts` - Utility functions: fetchMessageDetails, storeOperatorQuote, validateWebhookPayload
- `avinode_webhook_events` Supabase table for audit logging
- SSE push to `/api/avinode/events` for real-time frontend updates
- `components/avinode/webhook-status-indicator.tsx` - UI component for webhook health
- Event type routing: TripRequestSellerResponse, TripChatSeller, TripChatMine
