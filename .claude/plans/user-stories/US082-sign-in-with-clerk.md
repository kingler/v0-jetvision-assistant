# User Story ID: US082
# Title: Sign In with Clerk
# Parent Epic: [[EPIC020-authentication|EPIC020 - Authentication & Authorization]]
# Status: Implemented
# Priority: Critical
# Story Points: 3

## User Story
As an ISO agent, I want to sign in with Clerk, so I can access the application securely.

## Acceptance Criteria

### AC1: Unauthenticated redirect
**Given** I am not authenticated
**When** I access the app
**Then** I am redirected to the Clerk sign-in page

### AC2: Successful sign-in redirect
**Given** I authenticate with valid credentials
**When** sign-in succeeds
**Then** I am redirected to the chat dashboard

## Tasks
- [[TASK157-configure-clerk-middleware|TASK157 - Configure Clerk middleware for route protection]]
- [[TASK158-setup-signin-pages|TASK158 - Set up sign-in and sign-up pages]]

## Technical Notes
- Clerk middleware configured in `middleware.ts` to protect all routes except public ones
- Sign-in and sign-up pages use Clerk's prebuilt components (`<SignIn />`, `<SignUp />`)
- Environment variables `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` must be set
- Redirect URLs configured via `NEXT_PUBLIC_CLERK_SIGN_IN_URL` and `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`
