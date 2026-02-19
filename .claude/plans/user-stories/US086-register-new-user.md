# User Story ID: US086
# Title: Register New User Through Onboarding
# Parent Epic: [[EPIC021-user-onboarding|EPIC021 - User Onboarding]]
# Status: Implemented
# Priority: High
# Story Points: 5

## User Story
As a new ISO agent, I want to register through onboarding, so I can start using the platform.

## Acceptance Criteria

### AC1: Account creation with default role
**Given** I am a new user
**When** I complete the registration form
**Then** my account is created with default role "iso_agent"

### AC2: Proceed to contract generation
**Given** registration succeeds
**When** my profile is saved
**Then** I proceed to the contract generation step of the onboarding flow

## Tasks
- [[TASK165-registration-api|TASK165 - Implement registration API endpoint]]
- [[TASK166-create-user-record|TASK166 - Create user record in iso_agents table]]
- [[TASK167-proceed-onboarding-contract|TASK167 - Proceed to onboarding contract step]]

## Technical Notes
- Registration is triggered after Clerk sign-up via the `user.created` webhook
- The onboarding flow is a multi-step wizard: registration -> contract -> signature -> complete
- Default role "iso_agent" is assigned in Clerk metadata and synced to the database
- Registration collects: full name, email, company name, and phone number
