# Epic ID: EPIC021
# Epic Name: User Onboarding
# Parent Feature: [[F009-authentication-onboarding|F009 - User Management & Auth]]
# Status: Implemented
# Priority: High

## Description
Guides new ISO agents through a multi-step onboarding flow that includes registration, contract generation and signing, token validation, and profile setup. The onboarding process ensures that all legal and administrative requirements are met before an agent gains full access to the system. Onboarding tokens provide secure, time-limited access to the registration flow.

## Goals
- Guide new ISO agents through a structured registration and onboarding process
- Generate and deliver onboarding contracts for digital signature
- Validate onboarding tokens to ensure secure, time-limited registration access
- Enable profile customization including avatar upload during the onboarding flow

## User Stories
- [[US086-register-new-user|US086 - Register as new user: New ISO agent completes the registration form with personal and business information]]
- [[US087-generate-onboarding-contract|US087 - Generate onboarding contract: System generates a personalized onboarding contract based on the agent's registration details]]
- [[US088-sign-onboarding-contract|US088 - Sign onboarding contract: ISO agent reviews and digitally signs the onboarding contract to complete legal requirements]]
- [[US089-validate-onboarding-token|US089 - Validate onboarding token: System validates the token provided in the onboarding invitation link to verify authenticity and expiry]]
- [[US090-upload-avatar|US090 - Upload avatar: New ISO agent uploads a profile photo during the onboarding process]]

## Acceptance Criteria Summary
- Registration form validates all required fields and prevents duplicate registrations
- Onboarding contract is generated with correct agent details and terms
- Contract signing records the signature timestamp and IP address for legal compliance
- Onboarding tokens expire after their configured validity period
- Invalid or expired tokens display an appropriate error message
- Avatar upload accepts common image formats and enforces size limits
- Completion of all onboarding steps grants the user full system access
- Onboarding status is trackable through the status endpoint

## Technical Scope
- `app/api/onboarding/register/` - Registration endpoint
- `app/api/onboarding/generate-contract/` - Contract generation endpoint
- `app/api/onboarding/send-contract/` - Contract delivery endpoint
- `app/api/onboarding/sign-contract/` - Contract signing endpoint
- `app/api/onboarding/status/` - Onboarding progress tracking endpoint
- `app/api/onboarding/validate-token/` - Token validation endpoint
- `app/api/users/me/avatar/` - Avatar upload endpoint
- Supabase tables for onboarding state, contracts, and tokens
