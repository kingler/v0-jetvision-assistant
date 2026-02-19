# User Story ID: US085
# Title: Handle User Deletion with Soft Delete
# Parent Epic: [[EPIC020-authentication|EPIC020 - Authentication & Authorization]]
# Status: Implemented
# Priority: Medium
# Story Points: 2

## User Story
As a system administrator, I want deleted users to be soft-deleted, so data integrity is preserved.

## Acceptance Criteria

### AC1: Soft delete on Clerk user deletion
**Given** a user is deleted in Clerk
**When** the `user.deleted` webhook fires
**Then** the `is_active` field is set to `false` and the record is not hard deleted

## Tasks
- [[TASK164-soft-delete-logic|TASK164 - Implement soft-delete logic in webhook handler]]

## Technical Notes
- Soft delete preserves referential integrity across `flight_requests`, `quotes`, and `chat_sessions` tables
- The `is_active` column defaults to `true` and is set to `false` on deletion
- Queries across the application filter on `is_active = true` to exclude soft-deleted users
- A `deleted_at` timestamp is also recorded for audit purposes
