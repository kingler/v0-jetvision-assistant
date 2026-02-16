# Task ID: TASK143
# Task Name: Extract Operator Data from Webhook
# Parent User Story: [[US074-auto-create-operator-from-webhook|US074 - Auto-Create Operator from Webhook]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Parse and extract operator information from Avinode webhook payloads. When a TripRequestSellerResponse or TripChatSeller event is received, extract the operator's company name, contact details, and Avinode operator ID from the event data.

## Acceptance Criteria
- Operator data is extracted from TripRequestSellerResponse events
- Operator data is extracted from TripChatSeller events
- Extracted fields include: company name, contact name, email, avinode_operator_id
- Handles variations in webhook payload structure
- Missing fields are set to null rather than causing errors
- Extraction function is reusable across different event types
- Logging for unrecognized payload formats

## Implementation Details
- **File(s)**: app/api/webhooks/avinode/webhook-utils.ts
- **Approach**: Create an `extractOperatorFromWebhook` utility function that accepts the raw webhook payload and event type. Map the known payload fields to a normalized operator data structure. Handle differences between TripRequestSellerResponse and TripChatSeller payloads. Return a typed object with all available operator fields, using null for missing data.

## Dependencies
- Avinode webhook event documentation/schema
