# User Story ID: US084
# Title: Sync User Profiles from Clerk
# Parent Epic: [[EPIC020-authentication|EPIC020 - Authentication & Authorization]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As the system, I want to sync user profiles from Clerk, so database records match Clerk data.

## Acceptance Criteria

### AC1: User created webhook
**Given** Clerk fires a `user.created` event
**When** the webhook processes
**Then** an `iso_agents` record is created with the user's Clerk ID, email, and name

### AC2: User updated webhook
**Given** Clerk fires a `user.updated` event
**When** the webhook processes
**Then** the corresponding `iso_agents` record is updated with the latest data

### AC3: User deleted webhook
**Given** Clerk fires a `user.deleted` event
**When** the webhook processes
**Then** the user is soft-deleted by setting `is_active=false`

## Tasks
- [[TASK161-handle-user-created|TASK161 - Handle user.created webhook event]]
- [[TASK162-handle-user-updated|TASK162 - Handle user.updated webhook event]]
- [[TASK163-handle-user-deleted|TASK163 - Handle user.deleted webhook event]]

## Technical Notes
- Webhook endpoint at `/api/webhooks/clerk` validates Clerk webhook signatures using `svix`
- The `iso_agents` table uses `clerk_user_id` as the foreign key to Clerk
- Webhook events are idempotent; duplicate events are safely handled
- All webhook processing is wrapped in try/catch with error logging
