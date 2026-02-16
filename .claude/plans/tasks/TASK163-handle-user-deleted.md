# Task ID: TASK163
# Task Name: Handle user.deleted Webhook
# Parent User Story: [[US084-sync-user-from-clerk|US084 - Clerk Webhook User Sync]]
# Status: Done
# Priority: Medium
# Estimate: 1h

## Description
Handle the Clerk user.deleted webhook event by setting the is_active flag to false on the corresponding iso_agents record. This implements soft-delete to preserve data integrity and audit history.

## Acceptance Criteria
- Webhook endpoint processes user.deleted event from Clerk
- iso_agents record is soft-deleted (is_active set to false)
- Record is NOT hard-deleted from the database
- deleted_at timestamp is set on the record
- Already-deleted users are handled gracefully (idempotent)
- Non-existent users do not cause errors
- Webhook signature is verified

## Implementation Details
- **File(s)**: app/api/webhooks/clerk/route.ts
- **Approach**: Add a case handler for user.deleted in the Clerk webhook route. Extract the clerk_user_id from the payload. Update the iso_agents record to set is_active = false and deleted_at = current timestamp. Do not delete the record. Return 200 OK regardless of whether the user existed (idempotency). Log the soft-delete action.

## Dependencies
- [[TASK161-handle-user-created|TASK161]] (webhook handler infrastructure)
- [[TASK164-soft-delete-logic|TASK164]] (soft-delete logic design)
