# Task ID: TASK256
# Task Name: Configure Playwright for E2E Tests
# Parent User Story: [[US140-run-e2e-tests|US140 - Playwright configuration for end-to-end testing]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Set up Playwright as the end-to-end testing framework for testing complete user workflows in a real browser environment. Configuration includes browser selection, base URL, test directory, and CI-specific settings.

## Acceptance Criteria
- Playwright is configured with `playwright.config.ts`
- Tests are discovered from `__tests__/e2e/**/*.spec.{ts,tsx}`
- Default browser is Chromium; Firefox and WebKit are optional
- Base URL points to `http://localhost:3000` (development server)
- Web server auto-starts via `npm run dev:app` before tests
- Screenshots are captured on failure
- Video recording is enabled for CI runs
- Retries: 0 in development, 2 in CI
- Parallel execution with configurable worker count
- `npm run test:e2e` command runs E2E tests
- Configuration is validated by running a sample spec

## Implementation Details
- **File(s)**: `playwright.config.ts`
- **Approach**: Create a Playwright config using `defineConfig` from `@playwright/test`. Set `testDir` to `__tests__/e2e`, configure `webServer` to start Next.js dev server, set `use.baseURL`, enable `screenshot: 'only-on-failure'`, and configure `video: 'retain-on-failure'`. Add CI detection via `process.env.CI` for retry and worker settings.

## Dependencies
- `@playwright/test` must be installed
- Next.js dev server must be startable via npm script
