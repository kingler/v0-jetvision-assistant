# Task ID: TASK165
# Task Name: Registration API Endpoint
# Parent User Story: [[US086-register-new-user|US086 - User Onboarding Registration]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Create the POST /api/onboarding/register endpoint that handles new user registration and onboarding. This endpoint is called after Clerk authentication to complete the application-specific registration process, including setting up the user profile, default preferences, and initial workspace configuration.

## Acceptance Criteria
- POST /api/onboarding/register endpoint accepts registration data
- Endpoint validates authentication via Clerk session
- Creates or updates the iso_agents record with onboarding data
- Sets default user preferences (notification settings, timezone)
- Creates initial workspace/session for the user
- Returns the complete user profile on success
- Handles duplicate registration attempts gracefully (idempotent)
- Validates required fields (company_name, role)
- Returns 400 for invalid input, 401 for unauthenticated, 409 for already registered

## Implementation Details
- **File(s)**: app/api/onboarding/register/route.ts
- **Approach**: Create a POST handler that first validates the Clerk session. Parse and validate the request body (company_name, role, preferences). Check if the user is already registered (iso_agents record exists and is_active). If not registered, create/update the iso_agents record with the onboarding data. Set default preferences. Optionally create an initial chat session. Return the complete user profile. Handle all error cases with appropriate HTTP status codes and messages.

## Dependencies
- [[TASK157-configure-clerk-middleware|TASK157]] (Clerk middleware for authentication)
- [[TASK161-handle-user-created|TASK161]] (iso_agents record may already exist from webhook)
- iso_agents table schema
