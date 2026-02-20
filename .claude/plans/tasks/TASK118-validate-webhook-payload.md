# Task ID: TASK118
# Task Name: Validate Avinode Webhook Payload with Zod
# Parent User Story: [[US060-process-quote-webhook|US060 - Process incoming Avinode webhook events]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Implement Zod schema validation for incoming Avinode webhook payloads to ensure data integrity and type safety. The validation covers all supported webhook event types (TripRequestSellerResponse, TripChatSeller, TripChatMine) and rejects malformed payloads with clear error messages.

## Acceptance Criteria
- Zod schemas defined for each webhook event type
- TripRequestSellerResponse schema validates: event_type, trip_id, rfq_id, quote href, seller info
- TripChatSeller schema validates: event_type, trip_id, message content, sender
- TripChatMine schema validates: event_type, trip_id, message content
- Common base schema for shared fields (event_type, timestamp, trip_id)
- Returns parsed/typed data on success
- Returns detailed error messages on validation failure
- Logs validation failures for monitoring
- Rejects unknown event types gracefully

## Implementation Details
- **File(s)**: app/api/webhooks/avinode/webhook-utils.ts
- **Approach**: Define Zod schemas using z.object() for each event type. Create a discriminated union schema based on event_type field. Export a validateWebhookPayload function that calls schema.safeParse() and returns a typed result. Log validation errors with the raw payload (sanitized) for debugging. Use z.discriminatedUnion() for clean event type switching.

## Dependencies
- Zod package must be installed
- Avinode webhook endpoint at /api/webhooks/avinode
- Documentation of Avinode webhook payload formats
