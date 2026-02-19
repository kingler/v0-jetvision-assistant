# Task ID: TASK248
# Task Name: Auth Diagnostics Script
# Parent User Story: [[US134-run-auth-diagnostics|US134 - Diagnostic script for Clerk/Supabase auth issues]]
# Status: Partial
# Priority: Medium
# Estimate: 3h

## Description
Create a diagnostic script that checks the health and configuration of the authentication system, including Clerk JWT validation, Supabase RLS policies, and the integration between the two. This aids in troubleshooting auth-related issues.

## Acceptance Criteria
- Script checks Clerk API key validity and configuration
- Script verifies Supabase connection with service role key
- Script tests JWT token generation and validation flow
- Script checks RLS policies are correctly configured on key tables
- Output is formatted with clear pass/fail indicators for each check
- Script can be run from the command line: `npx ts-node scripts/diagnostics/check-auth-errors.ts`
- Exit code 0 if all checks pass, 1 if any fail
- Sensitive keys are masked in output (show only last 4 characters)
- Script documents common failure modes and suggested fixes

## Implementation Details
- **File(s)**: `scripts/diagnostics/check-auth-errors.ts`
- **Approach**: Create a Node.js script that sequentially runs diagnostic checks. Use the Clerk SDK to verify the API key. Use the Supabase client to test connectivity and query RLS-protected tables. Generate a JWT and validate it against Supabase. Print results using colored console output (chalk or similar).

## Dependencies
- Clerk SDK must be installed
- Supabase client library must be available
- Environment variables must be set in `.env.local`
