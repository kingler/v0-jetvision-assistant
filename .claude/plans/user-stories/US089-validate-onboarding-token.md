# User Story ID: US089
# Title: Validate Onboarding Token
# Parent Epic: [[EPIC021-user-onboarding|EPIC021 - User Onboarding]]
# Status: Implemented
# Priority: Medium
# Story Points: 2

## User Story
As the system, I want to validate onboarding tokens, so only authorized users complete onboarding.

## Acceptance Criteria

### AC1: Token validation
**Given** an onboarding link with a token
**When** the token is validated
**Then** the system confirms it is valid and not expired

## Tasks
- [[TASK172-token-validation|TASK172 - Implement token validation logic]]

## Technical Notes
- Onboarding tokens are JWTs with a 24-hour expiration
- Tokens are generated when an invitation is sent and stored in `onboarding_tokens` table
- Validation checks: token exists, not expired, not already used, matches user email
- Expired or invalid tokens redirect to an error page with instructions to request a new link
