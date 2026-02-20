# Task ID: TASK122
# Task Name: Create/Update Operator Profile
# Parent User Story: [[US061-process-operator-message-webhook|US061 - Operator Chat Message Ingestion]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Implement an upsert function for operator profiles that uses the avinode_operator_id as the unique key. When a webhook event contains operator information, the system should create a new operator_profile record if one does not exist, or update the existing record with the latest data.

## Acceptance Criteria
- Upsert function creates a new operator_profile when avinode_operator_id is not found
- Upsert function updates existing operator_profile when avinode_operator_id matches
- All relevant fields are populated: company name, contact info, avinode_operator_id
- Function returns the upserted operator profile record
- Handles null/missing optional fields gracefully
- Database constraints are respected (unique avinode_operator_id)

## Implementation Details
- **File(s)**: app/api/webhooks/avinode/webhook-utils.ts
- **Approach**: Create a `upsertOperatorProfile` utility function that accepts operator data from the webhook payload. Use Supabase's upsert with `onConflict: 'avinode_operator_id'` to handle create-or-update in a single operation. Return the resulting record for downstream use.

## Dependencies
- Database migration for operator_profiles table with avinode_operator_id column
