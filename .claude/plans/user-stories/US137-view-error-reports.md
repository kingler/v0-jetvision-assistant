# User Story ID: US137
# Title: View Error Reports via Sentry
# Parent Epic: [[EPIC033-analytics-dashboard|EPIC033 - Analytics & Monitoring]]
# Status: Partial
# Priority: Medium
# Story Points: 2

## User Story
As an admin, I want to view error reports via Sentry, so I can identify and fix issues.

## Acceptance Criteria

### AC1: Sentry Error Reporting
**Given** errors occur in the application
**When** Sentry captures them
**Then** I can view error details, frequency, affected users, and stack traces in the Sentry dashboard

## Tasks
- [[TASK253-sentry-integration|TASK253 - Configure Sentry integration for Next.js client and server]]

## Technical Notes
- Sentry SDK integrated into Next.js via `@sentry/nextjs`
- Captures: unhandled exceptions, API errors, agent execution failures
- Source maps uploaded for readable stack traces
- Environment tags: development, staging, production
- Partially implemented; Sentry SDK configured, custom error boundaries pending
