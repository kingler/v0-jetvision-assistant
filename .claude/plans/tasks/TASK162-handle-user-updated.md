# Task ID: TASK162
# Task Name: Handle user.updated Webhook
# Parent User Story: [[US084-sync-user-from-clerk|US084 - Clerk Webhook User Sync]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Handle the Clerk user.updated webhook event to keep the iso_agents table in sync when user profile changes occur in Clerk. Updated fields (email, name, metadata) should be reflected in the application database.

## Acceptance Criteria
- Webhook endpoint processes user.updated event from Clerk
- Existing iso_agents record is updated with changed Clerk data
- Handles email address changes
- Handles name changes (first_name, last_name)
- Handles metadata/role changes
- updated_at timestamp is refreshed
- Non-existent user triggers a create instead (eventual consistency)
- Webhook signature is verified

## Implementation Details
- **File(s)**: app/api/webhooks/clerk/route.ts
- **Approach**: Add a case handler for user.updated in the Clerk webhook route. Extract the updated user data from the payload. Use Supabase's upsert to update the iso_agents record matching the clerk_user_id. Map the changed fields to the corresponding database columns. Handle the edge case where the user does not yet exist in iso_agents (create it). Log the update for audit purposes.

## Dependencies
- [[TASK161-handle-user-created|TASK161]] (webhook handler infrastructure)
- iso_agents table with clerk_user_id column
