# User Story ID: US140
# Title: Run E2E Tests with Playwright
# Parent Epic: [[EPIC034-test-infrastructure|EPIC034 - Testing Infrastructure]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As a developer, I want to run E2E tests with Playwright, so I can verify full user workflows.

## Acceptance Criteria

### AC1: E2E Test Execution
**Given** E2E test specifications exist
**When** npm run test:e2e executes
**Then** Playwright launches browsers and executes full user workflow tests

## Tasks
- [[TASK256-configure-playwright|TASK256 - Configure Playwright for Next.js with browser setup]]
- [[TASK257-write-e2e-specs|TASK257 - Write E2E test specifications for critical user flows]]

## Technical Notes
- Test runner: Playwright with chromium, firefox, webkit
- Config: `playwright.config.ts` with Next.js dev server auto-start
- Critical flows tested: session creation, chat interaction, flight request, quote viewing
- Test data seeded via API before each test suite
- Screenshots captured on failure for debugging
- CI runs in headless mode; local development supports headed mode
