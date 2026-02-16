# Task ID: TASK063
# Task Name: Handle TripRequestSellerResponse, fetch details, store quote
# Parent User Story: [[US030-receive-realtime-quote-notification|US030 - Receive and store operator quotes]]
# Status: Done
# Priority: Critical
# Estimate: 5h

## Description
Implement the webhook handler for Avinode's TripRequestSellerResponse event. When an operator submits a quote through Avinode, this webhook receives the event, fetches the full quote details from the Avinode API, and stores the quote in the database.

## Acceptance Criteria
- POST /api/webhooks/avinode handles TripRequestSellerResponse events
- Extracts RFQ ID and quote ID from the webhook payload
- Calls get_rfq MCP tool to fetch full RFQ details
- Calls get_quote MCP tool to fetch full quote details including pricing
- Stores the quote in the database with all relevant fields
- Handles duplicate webhook deliveries idempotently
- Validates webhook payload structure before processing
- Returns 200 OK to Avinode after successful processing
- Returns 400 for malformed payloads
- Logs all webhook events for debugging
- Timeout handling for API calls to Avinode

## Implementation Details
- **File(s)**: `app/api/webhooks/avinode/route.ts`
- **Approach**: The webhook handler parses the incoming event, identifies the event type (TripRequestSellerResponse), extracts identifiers, and orchestrates two MCP calls: get_rfq for request details and get_quote for pricing/aircraft details. The combined data is then upserted into the quotes table. Idempotency is handled by checking for existing quotes with the same Avinode quote ID.

## Dependencies
- [[TASK040-call-create-trip-mcp|TASK040]] (call-create-trip-mcp) - Avinode MCP server must be operational
- [[TASK051-store-avinode-ids|TASK051]] (store-avinode-ids) - Request must have avinode_trip_id for correlation
