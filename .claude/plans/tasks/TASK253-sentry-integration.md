# Task ID: TASK253
# Task Name: Sentry Integration
# Parent User Story: [[US137-view-error-reports|US137 - Configure error tracking with Sentry]]
# Status: Partial
# Priority: Medium
# Estimate: 2h

## Description
Configure `@sentry/nextjs` for comprehensive error tracking across both client and server environments. This includes automatic error capture, performance monitoring, and source map uploading for production debugging.

## Acceptance Criteria
- `@sentry/nextjs` is installed and configured for both client and server
- Unhandled exceptions are automatically captured and sent to Sentry
- API route errors include request context (URL, method, user ID)
- Client-side errors include component stack traces
- Performance monitoring captures route transitions and API calls
- Source maps are uploaded during build for readable stack traces
- Sentry DSN is stored in environment variables (not hardcoded)
- Development environment sends events to a separate Sentry project (or is disabled)
- Error boundaries are instrumented with Sentry.captureException
- Unit tests verify Sentry initialization (mocked)

## Implementation Details
- **File(s)**: `sentry.client.config.ts`, `sentry.server.config.ts`
- **Approach**: Install `@sentry/nextjs` and run the setup wizard. Configure `sentry.client.config.ts` with the DSN, traces sample rate, and replay configuration. Configure `sentry.server.config.ts` with server-specific settings. Update `next.config.mjs` to include the Sentry webpack plugin for source maps. Add `SENTRY_DSN` to environment variables.

## Dependencies
- `@sentry/nextjs` package must be installed
- Sentry project must be created and DSN obtained
- `next.config.mjs` must be updated for the webpack plugin
