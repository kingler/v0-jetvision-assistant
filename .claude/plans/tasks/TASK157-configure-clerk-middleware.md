# Task ID: TASK157
# Task Name: Configure Clerk Middleware
# Parent User Story: [[US082-sign-in-with-clerk|US082 - User Authentication with Clerk]]
# Status: Done
# Priority: Critical
# Estimate: 2h

## Description
Set up @clerk/nextjs middleware for route protection in the Next.js application. Configure the middleware to protect authenticated routes while allowing public access to sign-in/sign-up pages and webhook endpoints.

## Acceptance Criteria
- Clerk middleware is configured in middleware.ts at the project root
- Authenticated routes (/, /api/chat-sessions, /api/proposal) require valid session
- Public routes are explicitly listed (/sign-in, /sign-up, /api/webhooks/*)
- API routes return 401 for unauthenticated requests
- Middleware runs on all applicable routes via matcher config
- Clerk session data is available in protected route handlers
- No interference with Next.js static assets and internal routes

## Implementation Details
- **File(s)**: middleware.ts
- **Approach**: Install and configure @clerk/nextjs middleware using the `clerkMiddleware` function. Define publicRoutes for authentication pages and webhook endpoints. Define protectedRoutes for all other application routes. Configure the matcher to apply middleware to relevant paths while excluding static files (_next, favicon.ico). Export the middleware config with the matcher array.

## Dependencies
- @clerk/nextjs package installed
- Clerk API keys configured in environment variables
