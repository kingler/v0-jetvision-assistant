# Task ID: TASK164
# Task Name: Soft-Delete Logic
# Parent User Story: [[US085-handle-user-deletion|US085 - Soft-Delete User Profiles]]
# Status: Done
# Priority: Medium
# Estimate: 1h

## Description
Implement soft-delete logic that preserves data integrity when a user is deleted. Instead of removing the record, the system sets is_active=false and records the deletion timestamp, ensuring historical data and relationships remain intact.

## Acceptance Criteria
- Soft-delete sets is_active = false on the iso_agents record
- deleted_at timestamp is recorded
- Soft-deleted users are excluded from active user queries
- Soft-deleted users cannot log in (Clerk handles this)
- Related data (chat sessions, proposals) is preserved
- Soft-deleted records can be restored if needed (set is_active = true)
- Database queries filter by is_active = true by default

## Implementation Details
- **File(s)**: app/api/webhooks/clerk/route.ts
- **Approach**: Implement the soft-delete as a simple update operation on the iso_agents table. Add is_active and deleted_at columns if not already present. Create a utility function `softDeleteUser(clerkUserId)` that performs the update. Ensure all user-querying functions include a `where is_active = true` filter by default. Document the restore procedure for admin use.

## Dependencies
- iso_agents table with is_active and deleted_at columns
