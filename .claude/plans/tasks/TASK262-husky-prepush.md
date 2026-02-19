# Task ID: TASK262
# Task Name: Husky Pre-Push Hook
# Parent User Story: [[US144-prepush-full-suite|US144 - Pre-push hook with full test suite]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Configure a Husky pre-push hook that runs the full test suite with coverage checks and integration tests before allowing code to be pushed to the remote repository. This provides a final quality gate before code leaves the developer's machine.

## Acceptance Criteria
- Pre-push hook runs automatically on every `git push`
- Hook executes: full unit test suite, integration tests, coverage check
- Coverage must meet thresholds (75% lines, 75% functions, 70% branches, 75% statements)
- Hook fails and prevents push if any test fails or coverage is below threshold
- Hook output clearly shows which step failed and the coverage report
- `--no-verify` flag bypasses the hook for emergencies
- Hook completes in under 2 minutes for the full test suite
- Integration tests can be skipped with an environment variable for offline work

## Implementation Details
- **File(s)**: `.husky/pre-push`
- **Approach**: Create the hook file using `npx husky add .husky/pre-push`. Write a bash script that runs `npm run test:unit`, then `npm run test:integration` (with skip option), then `npm run test:coverage`. Use `set -e` for fail-fast. Check `SKIP_INTEGRATION` env var to optionally skip integration tests.

## Dependencies
- [[TASK254-configure-vitest-unit|TASK254]] (configure-vitest-unit) for unit test configuration
- [[TASK255-configure-integration-tests|TASK255]] (configure-integration-tests) for integration test configuration
- [[TASK259-coverage-thresholds|TASK259]] (coverage-thresholds) for coverage enforcement
