# Task ID: TASK265
# Task Name: GitHub Actions CI/CD Workflow
# Parent User Story: [[US147-cicd-runs-on-pr|US147 - CI/CD workflow for pull requests]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Configure a GitHub Actions workflow that runs on every pull request and push to main, executing automated code review, security scanning, architecture compliance checks, and full test suites with coverage reporting.

## Acceptance Criteria
- Workflow triggers on: pull request (opened, synchronize), push to main
- **Code Review Job**: runs linting, type checking, validation suite, PR review report
- **Security Review Job**: runs `npm audit`, scans for hardcoded secrets, checks dependencies
- **Architecture Review Job**: validates agents extend BaseAgent, MCP servers use SDK, API error handling
- **Performance Review Job**: analyzes bundle size, checks for performance anti-patterns
- **Test Job**: runs unit tests, integration tests, and generates coverage report
- Coverage report is posted as a PR comment
- Workflow uses caching for node_modules and build artifacts
- Jobs run in parallel where possible for faster CI
- Workflow fails if any job fails, blocking merge
- Status badges are available for README

## Implementation Details
- **File(s)**: `.github/workflows/code-review.yml`
- **Approach**: Create a multi-job GitHub Actions workflow. Use `actions/checkout`, `actions/setup-node`, and `actions/cache` for setup. Define jobs for code-review, security-review, architecture-review, performance-review, and test. Use `npm run` commands for each check. Post coverage report to PR using a coverage action. Configure `concurrency` to cancel in-progress runs for the same PR.

## Dependencies
- [[TASK261-validation-suite|TASK261]] (validation-suite) for the validate script
- [[TASK263-pr-review-script|TASK263]] (pr-review-script) for the PR review report
- [[TASK259-coverage-thresholds|TASK259]] (coverage-thresholds) for coverage enforcement
- All npm scripts must be defined in package.json
