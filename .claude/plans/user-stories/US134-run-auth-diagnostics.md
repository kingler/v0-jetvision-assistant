# User Story ID: US134
# Title: Run Authentication Diagnostics
# Parent Epic: [[EPIC032-health-monitoring|EPIC032 - System Health & Diagnostics]]
# Status: Partial
# Priority: Medium
# Story Points: 2

## User Story
As an admin, I want to run auth diagnostics, so I can troubleshoot login issues.

## Acceptance Criteria

### AC1: Authentication Diagnostics Output
**Given** authentication issues are suspected
**When** diagnostics run
**Then** I see Clerk configuration status, Supabase sync status, and detailed error information

## Tasks
- [[TASK248-auth-diagnostics|TASK248 - Implement auth diagnostics script with Clerk and Supabase checks]]

## Technical Notes
- Checks Clerk publishable key configuration
- Verifies Supabase JWT integration with Clerk tokens
- Tests RLS policy enforcement with sample queries
- Reports: Clerk config valid, Supabase connected, JWT sync working, RLS active
- Available as CLI script: `npm run diagnostics:auth`
- Partially implemented; full diagnostic dashboard pending
