# Feature ID: F015
# Feature Name: Testing & Quality Infrastructure
# Status: Implemented
# Priority: High

## Description
Comprehensive testing infrastructure and quality gate system enforcing test-driven development, automated code review, and continuous integration across the entire codebase. The system spans unit testing with Vitest (75% coverage threshold), integration tests for agent coordination, E2E tests with Playwright, and agent-specific test suites. Quality is enforced through Git hooks (pre-commit, pre-push, commit-msg), automated code validation, and GitHub Actions CI/CD pipelines that gate all merges to main.

## Business Value
A multi-agent system handling real financial transactions (charter flight quotes worth tens of thousands of dollars) demands rigorous quality assurance. A single bug in quote formatting, flight search parsing, or email generation could cost a broker a deal or damage client relationships. The testing infrastructure ensures regressions are caught before they reach production, the TDD workflow prevents implementation drift from requirements, and automated code review maintains consistent code quality as the team scales. The 75% coverage threshold provides a quantitative quality floor while Git hooks prevent untested code from entering the codebase.

## Key Capabilities
- Unit testing with Vitest including 75% coverage thresholds for lines, functions, and statements (70% for branches)
- Integration tests for agent coordination workflows (handoffs, message bus, state machine transitions)
- End-to-end tests with Playwright for critical user journeys (chat flow, flight request submission, quote review)
- Agent-specific test suites validating tool execution, context management, and response formatting
- TDD workflow script (`npm run review:tdd`) enforcing the RED, GREEN, REFACTOR cycle with phase-specific validation
- Code review automation via morpheus-validator (file naming, code style, security checks, architecture compliance) and code-review-coordinator (PR review process management)
- Pre-commit Git hooks running type-check, lint, unit tests for changed files, and code validation on every commit
- Pre-push Git hooks running the full test suite with coverage verification and integration tests before remote push
- Commit message validation enforcing conventional commits format (e.g., `feat(agents): add orchestrator agent`)
- PR review report generation (`npm run review:pr`) producing a structured review checklist saved to `.github/PULL_REQUEST_REVIEW.md`
- GitHub Actions CI/CD with four parallel jobs: code-review, security-review, architecture-review, and performance-review

## Related Epics
- [[EPIC034-test-infrastructure|EPIC034 - Test Infrastructure]]
- [[EPIC035-code-review-cicd|EPIC035 - Code Review & CI/CD]]

## Dependencies
- None (cross-cutting concern that applies to all features and components)

## Technical Components
- `vitest.config.ts` - Vitest configuration with path aliases, coverage thresholds (75%/75%/70%/75%), and test file patterns
- `__tests__/` - Test directory structure organized by type (unit/, integration/, e2e/, agents/, mocks/)
- `__tests__/unit/` - Unit tests for lib modules, components, agents, and utilities
- `__tests__/integration/` - Integration tests for agent coordination, MCP tool execution, and API routes
- `.husky/pre-commit` - Pre-commit hook running type-check, lint, unit tests, and code validation
- `.husky/pre-push` - Pre-push hook running full test suite with coverage and integration tests
- `.husky/commit-msg` - Commit message hook enforcing conventional commits format
- `scripts/code-review/` - Code review automation scripts (morpheus-validator, code-review-coordinator, TDD workflow)
- `.github/workflows/` - GitHub Actions workflow definitions for CI/CD pipeline (code-review.yml, security, architecture, performance)
