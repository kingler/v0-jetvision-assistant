# Task ID: TASK257
# Task Name: Write E2E Test Specifications
# Parent User Story: [[US140-run-e2e-tests|US140 - End-to-end test specifications]]
# Status: Done
# Priority: High
# Estimate: 5h

## Description
Write comprehensive end-to-end test specifications covering the critical user journeys: chat session creation, flight request submission, quote reception, proposal generation, and session management.

## Acceptance Criteria
- E2E spec for chat session lifecycle: create, send message, receive response, switch session
- E2E spec for flight request flow: enter request, see trip confirmation, view deep link
- E2E spec for quote workflow: receive quote notification, view quote details
- E2E spec for sidebar interactions: session list, tab switching, unread badges
- E2E spec for error states: network disconnect, invalid input, session not found
- All specs use Page Object Model pattern for maintainability
- Specs include proper setup/teardown (seed data, cleanup)
- Tests pass in CI with retry logic for flaky scenarios
- Test data is isolated per test run to prevent interference

## Implementation Details
- **File(s)**: `__tests__/e2e/` (multiple spec files)
- **Approach**: Create a `pages/` directory within e2e for Page Object classes (ChatPage, SidebarPage, etc.). Write spec files for each user journey. Use Playwright fixtures for auth state and test data setup. Mock external APIs (Avinode, Gmail) using Playwright route interception. Structure specs with descriptive test names.

## Dependencies
- [[TASK256-configure-playwright|TASK256]] (configure-playwright) for Playwright setup
- Application must be runnable in test mode
