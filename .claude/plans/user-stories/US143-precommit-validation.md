# User Story ID: US143
# Title: Pre-Commit Validation Hooks
# Parent Epic: [[EPIC035-code-review-cicd|EPIC035 - CI/CD & Code Quality Pipeline]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As a developer, I want pre-commit hooks, so code quality is enforced before every commit.

## Acceptance Criteria

### AC1: Automatic Pre-Commit Checks
**Given** I have staged changes for commit
**When** I run git commit
**Then** type-check, lint, unit tests, and code validation run automatically before the commit completes

### AC2: Commit Blocked on Failure
**Given** any pre-commit check fails
**When** the hook detects the failure
**Then** the commit is prevented and a clear error message indicates which check failed

## Tasks
- [[TASK260-husky-precommit|TASK260 - Configure Husky pre-commit hook with validation commands]]
- [[TASK261-validation-suite|TASK261 - Run full validation suite (type-check, lint, test, validate) in hook]]

## Technical Notes
- Hook configured in `.husky/pre-commit`
- Checks run sequentially: type-check -> lint -> unit tests -> code validation
- Type check: `npm run type-check` (tsc --noEmit)
- Lint: `npm run lint` (ESLint)
- Unit tests: runs tests for changed files only (via --changed flag)
- Code validation: `npm run review:validate` (morpheus-validator)
- Commit message format enforced in `.husky/commit-msg` (conventional commits)
