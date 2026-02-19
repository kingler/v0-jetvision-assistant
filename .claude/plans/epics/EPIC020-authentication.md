# Epic ID: EPIC020
# Epic Name: Authentication & Authorization
# Parent Feature: [[F009-authentication-onboarding|F009 - User Management & Auth]]
# Status: Implemented
# Priority: Critical

## Description
Implements Clerk-based authentication with JWT validation and role-based access control for the entire application. All API routes are secured through middleware that validates Clerk session tokens. User profiles are synced from Clerk webhooks to the local Supabase database, and role-based access ensures ISO agents can only access resources within their authorization scope. User deletion events are handled to maintain data consistency.

## Goals
- Secure all API routes with Clerk JWT validation to prevent unauthorized access
- Sync user profiles from Clerk to Supabase for local data access and relationships
- Support role-based access control to differentiate permissions across user types
- Handle the full user lifecycle including creation, updates, and deletion

## User Stories
- [[US082-sign-in-with-clerk|US082 - Sign in with Clerk: User authenticates through the Clerk sign-in flow and receives a valid session token]]
- [[US083-role-based-access|US083 - Role-based API access: API routes enforce role-based permissions, restricting access based on the user's assigned role]]
- [[US084-sync-user-from-clerk|US084 - Sync user profile from Clerk: When a user is created or updated in Clerk, their profile is automatically synced to the iso_agents table in Supabase]]
- [[US085-handle-user-deletion|US085 - Handle user deletion: When a user is deleted from Clerk, their local data is cleaned up or soft-deleted to maintain referential integrity]]

## Acceptance Criteria Summary
- All API routes return 401 Unauthorized for requests without valid Clerk session tokens
- Clerk sign-in redirects work correctly and issue valid session cookies
- User creation webhooks from Clerk create corresponding records in the iso_agents table
- User update webhooks propagate profile changes to the local database
- User deletion webhooks trigger appropriate cleanup or soft-deletion
- Role-based access is enforced at the middleware level for protected routes
- JWT validation includes token expiry and signature verification

## Technical Scope
- `@clerk/nextjs` - Clerk SDK integration for Next.js
- `middleware.ts` - Next.js middleware for route-level JWT validation
- `app/api/webhooks/clerk/` - Webhook handler for Clerk user lifecycle events
- `iso_agents` Supabase table - Local user profile storage synced from Clerk
- Clerk publishable key and secret key configuration
- Role-based access control middleware and decorators
- Supabase RLS policies scoped to authenticated user identity
