# Task ID: TASK172
# Task Name: Token Validation
# Parent User Story: [[US089-validate-onboarding-token|US089 - Invitation Token Validation]]
# Status: Done
# Priority: Medium
# Estimate: 2h

## Description
Create a GET /api/onboarding/validate-token/[token] endpoint that validates invitation tokens used for onboarding new users. Tokens are checked for existence, expiration, and usage status.

## Acceptance Criteria
- GET /api/onboarding/validate-token/[token] validates the provided token
- Returns `{ valid: true, email, role }` for valid unused tokens
- Returns `{ valid: false, reason: 'expired' }` for expired tokens
- Returns `{ valid: false, reason: 'used' }` for already-used tokens
- Returns `{ valid: false, reason: 'not_found' }` for unknown tokens
- Token expiration is checked against a configurable TTL (default 7 days)
- This endpoint is public (no authentication required) since it is used before login

## Implementation Details
- **File(s)**: app/api/onboarding/validate-token/[token]/route.ts
- **Approach**: Create a dynamic route handler that extracts the token from params, queries the `invitation_tokens` table in Supabase, checks existence, expiration date, and used_at field, then returns the appropriate validation result.

## Dependencies
- Invitation tokens table in Supabase
- Token generation mechanism (admin-side)
