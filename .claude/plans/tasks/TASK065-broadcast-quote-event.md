# Task ID: TASK065
# Task Name: Insert to avinode_webhook_events for Supabase Realtime broadcast
# Parent User Story: [[US030-receive-realtime-quote-notification|US030 - Receive and store operator quotes]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
After processing a quote webhook, insert the event into the avinode_webhook_events table. This table is configured with Supabase Realtime, enabling the frontend to receive live quote notifications via server-sent events (SSE).

## Acceptance Criteria
- Each processed webhook event is inserted into avinode_webhook_events table
- Event record includes: event_type, trip_id, rfq_id, quote_id, payload, processed_at
- Supabase Realtime broadcasts the insert to subscribed clients
- Frontend SSE endpoint receives the broadcast and pushes to connected clients
- Duplicate events (same event_id) are handled gracefully
- Event payload is stored as JSONB for flexible querying
- Events are linked to the parent request for filtering

## Implementation Details
- **File(s)**: `app/api/webhooks/avinode/route.ts`
- **Approach**: After successfully storing the quote, insert a row into the avinode_webhook_events table with the event metadata and full payload. Supabase Realtime is pre-configured to broadcast inserts on this table. The frontend subscribes to this channel via the SSE endpoint at `/api/avinode/events`, which relays the Realtime events to the browser.

## Dependencies
- [[TASK063-process-quote-webhook|TASK063]] (process-quote-webhook) - Webhook must be processed first
- [[TASK064-store-quote-database|TASK064]] (store-quote-database) - Quote must be stored before broadcasting
