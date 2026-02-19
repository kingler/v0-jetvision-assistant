# Task ID: TASK260
# Task Name: Husky Pre-Commit Hook
# Parent User Story: [[US143-precommit-validation|US143 - Pre-commit hook for code quality]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Configure a Husky pre-commit hook that runs type checking, linting, unit tests for changed files, and code validation before allowing a commit to proceed. This ensures code quality is maintained at every commit.

## Acceptance Criteria
- Pre-commit hook runs automatically on every `git commit`
- Hook executes in order: type-check, lint, unit tests (changed files only), code validation
- Type checking via `npm run type-check` (tsc --noEmit)
- Linting via `npm run lint` (ESLint)
- Unit tests run only for files changed in the commit (using vitest --changed)
- Code validation via `npm run review:validate`
- Hook fails fast: stops at first failure and prevents the commit
- Hook output is clear about which step failed
- `--no-verify` flag bypasses the hook for emergencies
- Hook completes in under 30 seconds for typical commits

## Implementation Details
- **File(s)**: `.husky/pre-commit`
- **Approach**: Create the hook file using `npx husky add .husky/pre-commit`. Write a bash script that sequentially runs each validation step. Use `set -e` for fail-fast behavior. For changed-file unit tests, use `git diff --cached --name-only` to get staged files and pass them to Vitest's `--related` flag.

## Dependencies
- Husky must be installed and initialized (`npm run prepare`)
- All validation scripts must exist as npm commands
