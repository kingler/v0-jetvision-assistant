# Task ID: TASK166
# Task Name: Create User Record
# Parent User Story: [[US086-register-new-user|US086 - User Registration and Onboarding]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Insert a new user into the database with the default `iso_agent` role upon registration. The API endpoint receives user details from the onboarding form and creates the corresponding database record via Supabase.

## Acceptance Criteria
- POST /api/onboarding/register creates a new user record in the `users` table
- Default role is set to `iso_agent` when no role is specified
- Validates required fields (name, email) before insertion
- Returns the created user object with id on success
- Returns 400 for missing/invalid fields, 409 for duplicate email
- Clerk authentication token is validated before processing

## Implementation Details
- **File(s)**: app/api/onboarding/register/route.ts
- **Approach**: Create a POST route handler that extracts user data from the request body, validates required fields, checks for duplicate email via Supabase query, inserts the user record with default `iso_agent` role, and returns the created user. Use Clerk `auth()` to validate the session.

## Dependencies
- Supabase client configured in lib/supabase
- Clerk authentication middleware
- Users table schema with role column
