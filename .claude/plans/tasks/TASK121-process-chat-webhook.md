# Task ID: TASK121
# Task Name: Process Chat Webhook
# Parent User Story: [[US061-process-operator-message-webhook|US061 - Operator Chat Message Ingestion]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Handle the TripChatSeller webhook event from Avinode. When an operator sends a chat message through Avinode, the webhook endpoint should receive the event, parse the message payload, store the message in the database, and create or update the associated operator profile.

## Acceptance Criteria
- Webhook endpoint processes TripChatSeller event type correctly
- Chat message content is extracted from the webhook payload
- Message is persisted to the database with correct metadata (timestamp, operator, trip)
- Operator profile is created if it does not already exist
- Returns 200 OK on successful processing
- Returns appropriate error codes for malformed payloads
- Idempotent processing (safe to receive duplicate webhooks)

## Implementation Details
- **File(s)**: app/api/webhooks/avinode/route.ts
- **Approach**: Add a case handler for TripChatSeller in the existing webhook route handler. Parse the event payload to extract message content, operator details, and trip context. Call utility functions to store the message and upsert the operator profile. Wrap in try/catch for error resilience.

## Dependencies
- [[TASK124-deduplication-logic|TASK124]] (deduplication logic to prevent duplicate message storage)
- [[TASK122-create-update-operator|TASK122]] (create/update operator profile utility)
