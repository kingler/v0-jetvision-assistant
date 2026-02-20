# Task ID: TASK111
# Task Name: Auto-Archive Deal After Closure
# Parent User Story: [[US055-close-deal|US055 - Close deal after payment]]
# Status: Done
# Priority: Medium
# Estimate: 1h

## Description
Automatically archive the flight request after the deal is closed as won. Archiving moves the request out of active pipeline views while preserving all data for historical reference and reporting. The archived request remains queryable but is hidden from default active request listings.

## Acceptance Criteria
- Sets is_archived flag to true on the request record
- Sets archived_at timestamp
- Archived requests are excluded from default active request queries
- Archived requests remain accessible via "show archived" filter
- Archiving happens automatically after closed_won status is set
- No data is deleted during archiving
- Archive action is logged for audit trail

## Implementation Details
- **File(s)**: app/api/requests/ (request update logic)
- **Approach**: After the closed_won status update (TASK110), set is_archived = true and archived_at = now() on the request record. Ensure default request list queries include a WHERE is_archived = false clause. Add an optional query parameter to include archived requests. This can be a simple flag update in the same transaction as the status change.

## Dependencies
- [[TASK110-update-closed-won|TASK110]] (Update closed won) - triggers archiving
- Requests table must have is_archived and archived_at columns
