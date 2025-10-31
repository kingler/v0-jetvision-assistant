# Code Review Integration Guide

Complete guide to using **morpheus-validator** and **code-review-coordinator** agents in the JetVision Multi-Agent System.

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Git Hooks](#git-hooks)
4. [TDD Workflow](#tdd-workflow)
5. [Pull Request Process](#pull-request-process)
6. [Automated Validation](#automated-validation)
7. [GitHub Actions](#github-actions)
8. [Troubleshooting](#troubleshooting)

---

## Overview

### Code Review Agents

**morpheus-validator**
- **Purpose**: Automated code quality validation
- **When**: Pre-commit, pre-push, CI/CD
- **Checks**: Type safety, linting, tests, security, architecture

**code-review-coordinator**
- **Purpose**: Manages code review process
- **When**: Before creating PRs, during reviews
- **Provides**: Checklists, reports, review coordination

### Integration Points

```
Developer Workflow
    ↓
Write Code → Commit → Push → PR
    ↓          ↓       ↓      ↓
    ↓      Pre-commit Pre-push GitHub
    ↓      (morpheus) (morpheus) Actions
    ↓          ↓         ↓        ↓
Manual → Auto-validate → PR Review
Review                  (coordinator)
```

---

## Quick Start

### Installation

```bash
# Install dependencies (includes husky)
npm install

# Initialize git hooks
npm run prepare

# Verify setup
npm run review:validate
```

### Basic Commands

```bash
# Run code validation
npm run review:validate

# Run TDD workflow
npm run review:tdd

# Generate PR review
npm run review:pr

# Auto-fix linting
npm run review:fix
```

---

## Git Hooks

### Pre-commit Hook

Runs automatically on `git commit`:

**Checks**:
1. Type check (`tsc --noEmit`)
2. Linting (`eslint`)
3. Unit tests for changed files
4. Code validation (morpheus-validator)

**Example**:
```bash
$ git commit -m "feat(agents): add new agent"

🔍 Running Morpheus Validator pre-commit checks...
✅ Type check passed
✅ Linting passed
✅ Unit tests passed
✅ Code validation passed
✅ Pre-commit checks passed!
```

**Failure**:
```bash
$ git commit -m "feat(agents): add new agent"

🔍 Running Morpheus Validator pre-commit checks...
✅ Type check passed
❌ Linting failed. Fix linting errors before committing.

💡 Run 'npm run review:fix' to automatically fix some issues.
```

### Pre-push Hook

Runs automatically on `git push`:

**Checks**:
1. Full test suite
2. Test coverage ≥75%
3. Integration tests

**Example**:
```bash
$ git push

🚀 Running pre-push validation...
✅ Test coverage: 78% (threshold: 75%)
✅ Integration tests passed
✅ Pre-push checks passed!
```

### Commit Message Validation

Enforces conventional commits format:

**Valid formats**:
- `feat(scope): description`
- `fix(scope): description`
- `docs(scope): description`
- `test(scope): description`
- `refactor(scope): description`
- `chore(scope): description`

**Example**:
```bash
$ git commit -m "add new feature"

❌ Invalid commit message format!

Commit message must follow conventional commits format:
  type(scope): subject

Examples:
  feat(agents): add orchestrator agent
  fix(api): resolve authentication bug
```

### Bypassing Hooks

**Emergency only**:
```bash
# Skip pre-commit
git commit --no-verify -m "emergency fix"

# Skip pre-push
git push --no-verify
```

⚠️ **Warning**: All checks will still run in CI/CD. Use only in emergencies.

---

## TDD Workflow

### Overview

The TDD workflow enforces the RED → GREEN → REFACTOR cycle:

```bash
npm run review:tdd
```

### Phase 1: RED (Failing Test)

**Steps**:
1. Run workflow: `npm run review:tdd`
2. Select **RED** phase
3. Write failing test
4. Run workflow again - verifies test fails

**Example**:
```bash
$ npm run review:tdd

🔄 JetVision TDD Workflow with Code Review

Current phase (RED/GREEN/REFACTOR): RED

🔴 RED Phase - Write Failing Test

Steps:
  1. Create test file
  2. Write test case that defines desired behavior
  3. Verify test fails (as expected)

Have you written the failing test? (y/n): y

🧪 Running tests to verify failure...

❌ Test failed as expected! RED phase complete.

Next step: Run this script with GREEN phase to implement the feature.
```

### Phase 2: GREEN (Make Test Pass)

**Steps**:
1. Implement minimal code to make test pass
2. Run workflow: `npm run review:tdd`
3. Select **GREEN** phase
4. Tests run - verifies they pass
5. Code validation runs
6. Commit changes

**Example**:
```bash
$ npm run review:tdd

Current phase (RED/GREEN/REFACTOR): GREEN

🟢 GREEN Phase - Make Test Pass

Have you implemented the code? (y/n): y

🧪 Running tests...
✅ Tests passed! GREEN phase complete.

🔍 Running code review validation...
✅ Code review validation passed!

📝 Ready to commit?
Commit message (or "skip" to commit later): feat(agents): implement orchestrator agent

✅ Changes committed!

Next step: Run this script with REFACTOR phase to improve code quality.
```

### Phase 3: REFACTOR (Improve Quality)

**Steps**:
1. Improve code structure and quality
2. Run workflow: `npm run review:tdd`
3. Select **REFACTOR** phase
4. Full test suite runs
5. Comprehensive validation runs
6. Commit refactoring

**Example**:
```bash
$ npm run review:tdd

Current phase (RED/GREEN/REFACTOR): REFACTOR

🔵 REFACTOR Phase - Improve Code Quality

Have you refactored the code? (y/n): y

🧪 Running full test suite...
✅ All tests passed!

🔍 Running comprehensive code review...
✅ Type check passed
✅ Linting passed
✅ All validation checks passed!

Commit message: refactor(agents): improve orchestrator agent structure

✅ Refactoring committed!

🎉 TDD cycle complete!
Feature is ready for code review and PR creation.
```

---

## Pull Request Process

### Step 1: Run PR Review

Before creating a PR:

```bash
npm run review:pr
```

**Output**:
```
📋 Pull Request Code Review Coordinator

Branch: feat/new-feature
Base: main

🤖 Running Automated Checks

  Type Check... ✅
  Linting... ✅
  Unit Tests... ✅
  Integration Tests... ✅
  Test Coverage... ✅
  Code Validation... ✅

✅ All automated checks passed!

📋 Code Review Checklist

Code Quality:
  [ ] Code follows project style guidelines (Required)
  [ ] No unused imports or variables (Required)
  [ ] Proper error handling implemented (Required)
  ...

Testing:
  [ ] Unit tests cover new functionality (Required)
  [ ] Coverage meets 75% threshold (Required)
  ...

📄 Generating Review Report...

✅ Review report saved to: .github/PULL_REQUEST_REVIEW.md

📌 Next steps:
  1. Review the checklist above
  2. Address any remaining items
  3. Create PR with: gh pr create
  4. Use the generated review report as PR description
```

### Step 2: Review Checklist

Go through the generated checklist:
- `.github/PULL_REQUEST_REVIEW.md`
- `.github/CODE_REVIEW_CHECKLIST.md`

### Step 3: Create PR

```bash
# Using GitHub CLI
gh pr create --title "feat: Add new feature" --body-file .github/PULL_REQUEST_REVIEW.md

# Or using web interface
# Copy content from .github/PULL_REQUEST_REVIEW.md
```

### Step 4: Automated Review

GitHub Actions automatically runs:
- Code review checks
- Security audit
- Architecture compliance
- Performance analysis

**Example PR Comment**:
```
🤖 Automated Code Review

✅ All Checks Passed

- ✅ Type Check
- ✅ Linting
- ✅ Code Validation
- ✅ Unit Tests
- ✅ Test Coverage (≥75%)

---
Automated by Morpheus Validator
```

---

## Automated Validation

### What Gets Validated

**File Naming**:
```typescript
// ✅ Good
my-component.tsx        // Components: PascalCase
base-agent.ts          // Files: kebab-case
my-feature.test.ts     // Tests: .test.ts

// ❌ Bad
My_Component.tsx       // Use PascalCase
BaseAgent.ts           // Use kebab-case
my-feature.spec.ts     // Use .test.ts
```

**Code Style**:
```typescript
// ❌ Bad
const result: any = getData();           // No 'any' type
console.log('Debug:', result);          // No console.log
function getData() { /* ... */ }        // Missing JSDoc

// ✅ Good
/**
 * Fetches user data from API
 * @param userId - User identifier
 * @returns User data object
 */
function getData(userId: string): Promise<UserData> {
  // Implementation
}
```

**Security**:
```typescript
// ❌ Bad
const API_KEY = 'sk-1234567890';        // Hardcoded secret
eval(userInput);                        // Unsafe eval
<div dangerouslySetInnerHTML={{__html: input}} />  // XSS risk

// ✅ Good
const API_KEY = process.env.API_KEY;    // Environment variable
const result = JSON.parse(userInput);   // Safe parsing
<div>{sanitize(input)}</div>            // Sanitized input
```

**Architecture**:
```typescript
// ❌ Bad
class MyAgent {                         // Missing BaseAgent
  async run() { /* ... */ }
}

// ✅ Good
import { BaseAgent } from '@agents/core';

class MyAgent extends BaseAgent {       // Extends BaseAgent
  async execute(context: AgentContext): Promise<AgentResult> {
    // Implementation
  }
}
```

### Running Validation Manually

```bash
# Run all validations
npm run review:validate

# Auto-fix what can be fixed
npm run review:fix

# Type check only
npm run type-check

# Linting only
npm run lint

# Tests only
npm run test:coverage
```

---

## GitHub Actions

### Workflow Overview

**Trigger**: On every PR and push to `main`, `develop`, `feat/**`, `fix/**`

**Jobs**:

1. **code-review** (Main validation)
   - Type checking
   - Linting
   - Code validation
   - Unit tests
   - Integration tests
   - Coverage report
   - PR comment with results

2. **security-review**
   - npm audit
   - Secret scanning (TruffleHog)

3. **architecture-review**
   - Agent BaseAgent compliance
   - API route error handling
   - MCP server structure

4. **performance-review**
   - Bundle size analysis
   - Dependency check

### Viewing Results

**GitHub UI**:
1. Go to PR → Checks tab
2. View each job's status
3. Click failed jobs to see errors

**PR Comments**:
- Automated review results posted as comment
- Coverage reports attached
- Security findings flagged

---

## Troubleshooting

### Hooks Not Running

**Problem**: Git hooks don't execute

**Solution**:
```bash
# Reinstall hooks
npm run prepare

# Check hooks exist
ls -la .husky/

# Make hooks executable
chmod +x .husky/pre-commit
chmod +x .husky/pre-push
chmod +x .husky/commit-msg
```

### Validation Fails Locally But Passes in CI

**Problem**: Different results local vs CI

**Solution**:
```bash
# Clear cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Run validation
npm run review:validate
```

### Type Check Errors

**Problem**: TypeScript errors block commit

**Solution**:
```bash
# See all errors
npm run type-check

# Fix one at a time
# Check tsconfig.json is correct
# Ensure @types/* packages installed
```

### Test Coverage Below Threshold

**Problem**: Coverage < 75%

**Solution**:
```bash
# See coverage report
npm run test:coverage

# View detailed report
open coverage/index.html

# Add missing tests
# Focus on uncovered branches/lines
```

### Linting Errors

**Problem**: ESLint errors block commit

**Solution**:
```bash
# Auto-fix what's possible
npm run review:fix

# See all errors
npm run lint

# Update ESLint config if needed
# Check .eslintrc.json
```

### Pre-commit Hook Too Slow

**Problem**: Hook takes too long

**Solution**:
```bash
# Option 1: Skip for emergency
git commit --no-verify -m "message"

# Option 2: Optimize tests
# Run only changed tests in hook
# Full suite runs in CI

# Option 3: Disable specific checks
# Edit .husky/pre-commit
# Remove slow steps (not recommended)
```

---

## Best Practices

### Daily Workflow

1. **Start of day**: Pull latest changes
   ```bash
   git pull origin main
   ```

2. **Create feature branch**:
   ```bash
   git checkout -b feat/my-feature
   ```

3. **TDD cycle**:
   ```bash
   # RED
   npm run review:tdd  # Write failing test

   # GREEN
   npm run review:tdd  # Implement feature

   # REFACTOR
   npm run review:tdd  # Improve quality
   ```

4. **Before PR**:
   ```bash
   npm run review:pr   # Generate review
   gh pr create        # Create PR
   ```

5. **After approval**:
   ```bash
   git checkout main
   git pull
   git branch -d feat/my-feature
   ```

### Code Review Tips

**For Authors**:
- Run `npm run review:pr` before creating PR
- Address all checklist items
- Provide context in PR description
- Respond to feedback promptly
- Keep PRs small and focused

**For Reviewers**:
- Use `.github/CODE_REVIEW_CHECKLIST.md`
- Check automated review results first
- Test changes locally if needed
- Provide constructive feedback
- Approve only when all items complete

---

## Configuration

### Customizing Validation

Edit `scripts/code-review/validate.ts` to:
- Add custom checks
- Modify thresholds
- Change validation rules

### Customizing Hooks

Edit `.husky/pre-commit`, `.husky/pre-push`:
- Add/remove checks
- Change order
- Adjust for team needs

### Customizing GitHub Actions

Edit `.github/workflows/code-review.yml`:
- Add new jobs
- Modify triggers
- Change notification settings

---

## Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Husky Documentation](https://typicode.github.io/husky/)
- [GitHub Actions](https://docs.github.com/en/actions)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Vitest Documentation](https://vitest.dev/)

---

**Last Updated**: 2025-10-26
**Maintained By**: JetVision Development Team
