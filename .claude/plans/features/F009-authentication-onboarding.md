# Feature ID: F009
# Feature Name: Authentication and Onboarding
# Status: Implemented
# Priority: Critical

## Description
User authentication via Clerk and a structured onboarding workflow for new ISO agents. Handles the full identity lifecycle from initial registration through contract signing, ensuring only verified and authorized users can access the charter flight brokerage platform.

## Business Value
Authentication is the foundational security layer for the entire platform. The onboarding workflow ensures new ISO agents complete all required steps (registration, contract signing, profile setup) before accessing sensitive flight data and client information. Clerk integration provides enterprise-grade auth without custom implementation, while webhook-based user sync keeps the local database in lockstep with Clerk's identity provider.

## Key Capabilities
- Clerk-based authentication with JWT token validation on every API request
- User synchronization via Clerk webhooks (user.created, user.updated, user.deleted events)
- Multi-step onboarding registration flow for new ISO agents
- Role-based access control with roles: iso_agent, admin, operator
- Contract generation and digital signing during the onboarding process
- Onboarding token validation for secure registration links
- Avatar upload and profile customization
- Middleware-level route protection for authenticated-only pages
- Session management with automatic token refresh

## Related Epics
- [[EPIC020-authentication|EPIC020 - Authentication]]
- [[EPIC021-user-onboarding|EPIC021 - User Onboarding]]

## Dependencies
- None (foundational feature - other features depend on this)

## Technical Components
- `@clerk/nextjs` - Clerk SDK for Next.js authentication integration
- `app/api/webhooks/clerk/` - Webhook handler for user lifecycle events (user.created, user.updated, user.deleted)
- `app/api/onboarding/` - Onboarding API routes for registration flow and token validation
- `app/api/users/` - User management API routes
- `middleware.ts` - Next.js middleware enforcing authentication on protected routes
- Supabase tables: `users`, `onboarding_tokens`, `contracts`
- Clerk environment variables: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY
