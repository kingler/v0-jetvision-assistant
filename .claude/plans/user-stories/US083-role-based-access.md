# User Story ID: US083
# Title: Role-Based API Access
# Parent Epic: [[EPIC020-authentication|EPIC020 - Authentication & Authorization]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As a system administrator, I want role-based API access, so that users only access authorized resources.

## Acceptance Criteria

### AC1: ISO agent data scoping
**Given** a user has role "iso_agent"
**When** they call API routes
**Then** they can only access their own data

### AC2: Admin full access
**Given** a user has role "admin"
**When** they call admin routes
**Then** they have full access to all resources

## Tasks
- [[TASK159-implement-auth-middleware|TASK159 - Implement auth middleware with role extraction]]
- [[TASK160-add-role-checks|TASK160 - Add role checks to API routes]]

## Technical Notes
- Roles are stored in Clerk user metadata and synced to the `iso_agents` table
- Auth middleware extracts JWT claims and validates role permissions per route
- API routes use a `requireRole()` helper to enforce access control
- Supabase Row Level Security (RLS) provides an additional layer of data isolation
