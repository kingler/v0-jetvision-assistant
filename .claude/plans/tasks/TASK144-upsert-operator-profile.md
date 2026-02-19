# Task ID: TASK144
# Task Name: Upsert Operator Profile from Webhook
# Parent User Story: [[US074-auto-create-operator-from-webhook|US074 - Auto-Create Operator from Webhook]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Create or update operator_profiles records automatically when webhook events contain operator data. Use the extracted operator information to perform an upsert operation, ensuring the operator database stays current with Avinode data.

## Acceptance Criteria
- New operator profile is created when avinode_operator_id is not in the database
- Existing operator profile is updated when avinode_operator_id already exists
- Upsert uses avinode_operator_id as the conflict resolution key
- Updated records reflect the latest data from the webhook
- created_at is preserved on update (only updated_at changes)
- Upsert is called automatically during webhook processing
- No duplicate operator profiles are created for the same Avinode operator

## Implementation Details
- **File(s)**: app/api/webhooks/avinode/webhook-utils.ts
- **Approach**: Use the operator data extracted by TASK143 and pass it to the upsertOperatorProfile function from TASK122. Integrate the upsert call into the webhook processing pipeline so it runs for every relevant event type. Ensure the function is called before message/quote storage so the operator reference exists.

## Dependencies
- [[TASK143-extract-operator-webhook|TASK143]] (extraction provides the operator data)
- [[TASK122-create-update-operator|TASK122]] (upsert function for operator profiles)
