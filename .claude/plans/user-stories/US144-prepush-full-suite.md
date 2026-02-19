# User Story ID: US144
# Title: Pre-Push Full Test Suite
# Parent Epic: [[EPIC035-code-review-cicd|EPIC035 - CI/CD & Code Quality Pipeline]]
# Status: Implemented
# Priority: High
# Story Points: 2

## User Story
As a developer, I want pre-push hooks, so the full test suite runs before pushing.

## Acceptance Criteria

### AC1: Full Suite on Push
**Given** I am pushing commits to the remote repository
**When** the pre-push hook triggers
**Then** the full test suite runs including coverage checks and integration tests

## Tasks
- [[TASK262-husky-prepush|TASK262 - Configure Husky pre-push hook with full test suite execution]]

## Technical Notes
- Hook configured in `.husky/pre-push`
- Runs: `npm run test:coverage` (full suite with 75% threshold enforcement)
- Runs: `npm run test:integration` (cross-component tests)
- Push blocked if any test fails or coverage drops below threshold
- Longer execution time expected (30-60 seconds); progress output shown
- Can be bypassed with `--no-verify` in emergencies only
