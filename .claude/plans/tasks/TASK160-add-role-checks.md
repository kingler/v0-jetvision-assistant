# Task ID: TASK160
# Task Name: Add Role-Based Checks
# Parent User Story: [[US083-role-based-access|US083 - API Route Protection]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Implement role-based access control checks on admin API routes. Beyond basic authentication, certain routes should verify the user has the appropriate role (e.g., admin, manager) before allowing access.

## Acceptance Criteria
- Admin routes check for admin role in addition to authentication
- Users without admin role receive 403 Forbidden response
- Role information is retrieved from Clerk user metadata
- Role checks are implemented as reusable middleware/utility
- Response format for 403 is consistent with other error responses
- Role hierarchy is respected (admin > manager > user)
- Logging captures unauthorized access attempts

## Implementation Details
- **File(s)**: app/api/admin/ (admin route handlers)
- **Approach**: Create a `requireRole` utility function that checks the user's role from Clerk's session claims or user metadata. Use Clerk's `currentUser()` or `auth()` with session claims to access the user's role. Apply the role check after authentication in admin route handlers. Return 403 with a descriptive message if the role check fails. Support checking for multiple allowed roles.

## Dependencies
- [[TASK159-implement-auth-middleware|TASK159]] (authentication middleware provides the base auth check)
- Clerk user metadata configured with role field
