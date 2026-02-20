# User Story ID: US060
# Title: Process Quote Webhook
# Parent Epic: [[EPIC014-webhook-processing|EPIC014 - Avinode Webhook Processing]]
# Status: Implemented
# Priority: Critical
# Story Points: 5

## User Story
As the system, I want to process TripRequestSellerResponse webhooks, so that quotes appear in the UI.

## Acceptance Criteria

### AC1: Webhook payload is processed and broadcast
**Given** Avinode sends a webhook
**When** the payload is a TripRequestSellerResponse
**Then** the quote is fetched, stored, and broadcast

### AC2: Seller price is prioritized
**Given** the webhook includes an href
**When** quote details are fetched
**Then** sellerPrice is prioritized over webhookPrice

### AC3: Quote links to correct request
**Given** the quote is stored
**When** it persists
**Then** it links to the correct request via trip_id

## Tasks
- [[TASK118-validate-webhook-payload|TASK118 - Validate webhook payload]]
- [[TASK119-fetch-quote-details|TASK119 - Fetch quote details from Avinode]]
- [[TASK120-store-quote-db|TASK120 - Store quote in database]]

## Technical Notes
- Webhook endpoint is at `/api/webhooks/avinode` which validates the incoming payload structure
- Quote details are fetched via `get_quote` MCP tool using the href from the webhook event
- The `sellerPrice` from the detailed quote API response is more accurate than the webhook price
- Quotes are stored in `avinode_webhook_events` table and linked to requests via `trip_id`
- SSE broadcast notifies connected clients of new quotes in real-time
