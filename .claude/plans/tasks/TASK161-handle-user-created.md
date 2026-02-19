# Task ID: TASK161
# Task Name: Handle user.created Webhook
# Parent User Story: [[US084-sync-user-from-clerk|US084 - Clerk Webhook User Sync]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Handle the Clerk user.created webhook event to automatically create a corresponding record in the iso_agents table when a new user registers. This ensures every Clerk user has an associated agent profile in the application database.

## Acceptance Criteria
- Webhook endpoint processes user.created event from Clerk
- New iso_agents record is created with Clerk user data
- Record includes clerk_user_id, email, full_name, and is_active=true
- Webhook signature is verified using Clerk's svix library
- Duplicate user.created events are handled idempotently
- Returns 200 OK on successful processing
- Error handling for database insert failures

## Implementation Details
- **File(s)**: app/api/webhooks/clerk/route.ts
- **Approach**: Create a POST handler for Clerk webhooks. Verify the webhook signature using svix/Clerk webhook verification. Parse the event type from the payload. For user.created, extract user data (id, email_addresses, first_name, last_name). Insert a new record into iso_agents with the mapped fields. Handle the case where the record already exists (idempotency).

## Dependencies
- Clerk webhook signing secret configured
- iso_agents table in database
- svix package for webhook verification
