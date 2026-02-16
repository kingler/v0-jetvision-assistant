# Task ID: TASK159
# Task Name: Implement Auth Middleware for API Routes
# Parent User Story: [[US083-role-based-access|US083 - API Route Protection]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Implement authentication validation on all API routes using Clerk's auth() function. Each protected API route should verify the user's session before processing the request and return 401 for unauthenticated access.

## Acceptance Criteria
- All API routes (except webhooks) validate authentication via auth()
- Unauthenticated requests receive 401 Unauthorized response
- Authenticated requests have access to userId and sessionId
- auth() is called consistently across all protected route handlers
- Response format for 401 is consistent (JSON with error message)
- Performance impact is minimal (Clerk's session validation is fast)
- Webhook routes (/api/webhooks/*) are excluded from auth checks

## Implementation Details
- **File(s)**: middleware.ts, API route handlers
- **Approach**: Use Clerk's `auth()` helper in API route handlers to validate the session. Create a reusable `requireAuth` utility function that wraps auth() and returns 401 if no valid session exists. Apply this at the top of each API route handler. Extract userId from the auth result for use in database queries and logging. Configure middleware matcher to enforce this globally as a fallback.

## Dependencies
- [[TASK157-configure-clerk-middleware|TASK157]] (Clerk middleware configuration)
- @clerk/nextjs package
