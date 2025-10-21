# Git Workflow Guidelines
# JetVision AI Assistant

**Document Version**: 1.0
**Last Updated**: October 20, 2025
**Status**: Active Development

---

## Table of Contents

1. [Overview](#overview)
2. [Branch Strategy](#branch-strategy)
3. [Commit Guidelines](#commit-guidelines)
4. [Pull Request Process](#pull-request-process)
5. [Code Review Guidelines](#code-review-guidelines)
6. [Merge Strategy](#merge-strategy)
7. [Branch Protection Rules](#branch-protection-rules)
8. [Common Workflows](#common-workflows)
9. [Troubleshooting](#troubleshooting)

---

## Overview

This document defines the Git workflow for the JetVision AI Assistant project. We follow a **feature branch workflow** with strict code review requirements and Test-Driven Development (TDD) practices.

### Core Principles

- **Main branch is always deployable** - Never commit directly to `main`
- **Feature branches for all changes** - Even small fixes get their own branch
- **Pull requests are mandatory** - All code must be reviewed before merging
- **TDD approach required** - Write tests first, then implementation
- **Conventional commits** - Standardized commit message format
- **Linear history preferred** - Squash or rebase to maintain clean history

---

## Branch Strategy

### Main Branch

**Branch**: `main`

**Purpose**: Production-ready code only

**Rules**:
- ✅ Always deployable and stable
- ✅ Protected from direct pushes
- ✅ Only updated via approved pull requests
- ❌ Never commit directly
- ❌ Never force push

### Feature Branches

**Naming Convention**: `feature/TASK-XXX-brief-description`

**Examples**:
```bash
feature/TASK-001-clerk-authentication
feature/TASK-002-supabase-schema
feature/TASK-015-rfp-orchestrator-agent
feature/TASK-023-proposal-ranking-logic
```

**Creation**:
```bash
# Always branch from latest main
git checkout main
git pull origin main
git checkout -b feature/TASK-001-clerk-authentication
```

**Rules**:
- Must start with `feature/`
- Must include task number (TASK-XXX)
- Brief description in kebab-case
- Maximum 50 characters total
- Always branch from `main`

### Bug Fix Branches

**Naming Convention**: `fix/TASK-XXX-brief-description`

**Examples**:
```bash
fix/TASK-042-auth-session-timeout
fix/TASK-055-database-connection-leak
fix/TASK-067-ui-mobile-responsiveness
```

**Same rules as feature branches**, but prefixed with `fix/`

### Hotfix Branches (Production Emergencies)

**Naming Convention**: `hotfix/ISSUE-XXX-brief-description`

**Examples**:
```bash
hotfix/ISSUE-001-critical-auth-bypass
hotfix/ISSUE-002-data-leak-vulnerability
```

**Usage**:
- Only for critical production issues
- Branch from `main`
- Expedited review process
- Deploy immediately after merge

### Documentation Branches

**Naming Convention**: `docs/brief-description`

**Examples**:
```bash
docs/api-endpoint-documentation
docs/deployment-runbook
docs/architecture-diagrams
```

### Refactor Branches

**Naming Convention**: `refactor/TASK-XXX-brief-description`

**Examples**:
```bash
refactor/TASK-089-agent-factory-pattern
refactor/TASK-101-database-query-optimization
```

---

## Commit Guidelines

### Conventional Commits Format

We use the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Commit Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(auth): add Clerk authentication integration` |
| `fix` | Bug fix | `fix(db): resolve connection pool leak` |
| `docs` | Documentation only | `docs(api): add endpoint documentation` |
| `style` | Code style/formatting | `style(ui): apply consistent button spacing` |
| `refactor` | Code refactoring | `refactor(agents): extract factory pattern` |
| `test` | Adding/updating tests | `test(auth): add integration tests for login flow` |
| `perf` | Performance improvement | `perf(db): optimize flight search query` |
| `chore` | Build/tooling changes | `chore(deps): update dependencies` |
| `ci` | CI/CD changes | `ci(github): add test workflow` |

### Commit Message Examples

#### Good Commit Messages

```bash
# Feature with body
git commit -m "feat(auth): implement Clerk authentication integration

- Add Clerk middleware for route protection
- Configure user session management
- Add user profile sync with Supabase
- Implement JWT token validation

Implements: TASK-001"

# Bug fix
git commit -m "fix(ui): resolve mobile menu overflow issue

The mobile navigation menu was causing horizontal scroll
on devices smaller than 375px. Updated breakpoints and
container max-width to prevent overflow.

Fixes: TASK-042"

# Documentation
git commit -m "docs(readme): update setup instructions

Add Redis installation steps and environment variable
configuration examples for local development."

# Test addition
git commit -m "test(agents): add unit tests for orchestrator

- Test request validation logic
- Test workflow state transitions
- Test error handling scenarios
- Achieve 92% coverage for orchestrator module

Related to: TASK-015"
```

#### Bad Commit Messages

```bash
# ❌ Too vague
git commit -m "fix stuff"
git commit -m "update code"
git commit -m "changes"

# ❌ Not following convention
git commit -m "Fixed the bug in authentication"
git commit -m "Added new feature"

# ❌ Too long subject line (>72 chars)
git commit -m "feat(auth): implement comprehensive Clerk authentication integration with JWT validation and user profile synchronization"

# ❌ Missing scope
git commit -m "feat: add authentication"
```

### Commit Best Practices

1. **Subject Line**:
   - Maximum 72 characters
   - Imperative mood ("add" not "added" or "adds")
   - No period at the end
   - Capitalize first letter

2. **Body** (optional but recommended):
   - Blank line after subject
   - Wrap at 72 characters
   - Explain WHAT and WHY, not HOW
   - Use bullet points for multiple changes

3. **Footer** (optional):
   - Reference task numbers
   - Reference breaking changes
   - Link to issues or PRs

4. **Atomic Commits**:
   - One logical change per commit
   - Commit should be able to stand alone
   - If you use "and" in subject, split into multiple commits

5. **Commit Frequency**:
   - Commit often during development
   - Each passing test phase is a good commit point (TDD cycles)
   - Squash before creating PR if needed

---

## Pull Request Process

### 1. Before Creating PR

**Pre-PR Checklist**:
```bash
# 1. Ensure branch is up to date with main
git checkout main
git pull origin main
git checkout feature/TASK-001-clerk-authentication
git rebase main  # or git merge main

# 2. Run all quality checks
npm run lint          # ESLint check
npm run type-check    # TypeScript compilation
npm run test          # All tests must pass
npm run test:coverage # Check coverage thresholds
npm run build         # Ensure build succeeds

# 3. Review your own changes
git diff main..HEAD   # Review all changes
git log main..HEAD    # Review all commits

# 4. Squash commits if needed (optional)
git rebase -i main    # Interactive rebase to squash
```

### 2. Creating Pull Request

**Push your branch**:
```bash
git push -u origin feature/TASK-001-clerk-authentication
```

**Create PR on GitHub**:
1. Navigate to repository on GitHub
2. Click "Pull requests" → "New pull request"
3. Select your feature branch
4. Fill out the PR template (auto-populated)
5. Add reviewers (at least 1 required)
6. Add labels (feature, bug, documentation, etc.)
7. Link related task file or issue

**PR Title Format**:
```
[TASK-XXX] Brief description of changes
```

**Examples**:
```
[TASK-001] Implement Clerk authentication integration
[TASK-002] Deploy Supabase database schema with RLS
[TASK-015] Create RFP Orchestrator agent
```

### 3. PR Description

Use the `.github/PULL_REQUEST_TEMPLATE.md` template. Key sections:

- **Description**: Clear summary of changes
- **Type of Change**: Mark applicable checkboxes
- **Files Changed**: List created/modified/deleted files
- **TDD Confirmation**: Confirm Red-Green-Blue phases followed
- **Test Coverage**: Paste coverage report
- **Manual Testing**: Describe manual test scenarios
- **Screenshots**: Include for UI changes

### 4. Review Process

**Requesting Review**:
- Assign at least 1 reviewer (2 for critical changes)
- Respond to all comments promptly
- Mark conversations as resolved when addressed
- Request re-review after making changes

**As a Reviewer**:
- Review within 24 hours of request
- Check code quality, tests, and documentation
- Leave constructive comments
- Approve only when all concerns addressed

### 5. Addressing Review Comments

```bash
# Make requested changes
git add .
git commit -m "refactor(auth): address PR review comments

- Extract validation logic to separate function
- Add error handling for edge cases
- Improve test descriptions"

git push origin feature/TASK-001-clerk-authentication
```

### 6. Merging PR

**Merge Requirements**:
- ✅ At least 1 approval
- ✅ All CI checks passing
- ✅ No merge conflicts
- ✅ Branch up-to-date with main
- ✅ All conversations resolved

**Merge Strategy**:

**Option 1: Squash and Merge** (Preferred for feature branches)
```bash
# GitHub will create single commit on main
# Clean linear history
# Use for: Most feature branches with multiple commits
```

**Option 2: Rebase and Merge** (For well-structured commits)
```bash
# Preserves individual commits
# Maintains commit history
# Use for: Branches with meaningful, atomic commits
```

**Option 3: Merge Commit** (Rarely used)
```bash
# Creates merge commit
# Non-linear history
# Use for: Large feature branches with multiple contributors
```

**After Merging**:
```bash
# Delete remote branch (GitHub does this automatically if configured)
# Delete local branch
git checkout main
git pull origin main
git branch -d feature/TASK-001-clerk-authentication

# Move task file to completed
mv tasks/active/TASK-001-clerk-authentication.md tasks/completed/
```

---

## Code Review Guidelines

### For Authors (PR Creator)

**Before Requesting Review**:
1. ✅ Self-review all changes
2. ✅ Ensure all tests pass
3. ✅ Check code coverage >75%
4. ✅ Update documentation
5. ✅ Fill out PR template completely
6. ✅ Add screenshots for UI changes
7. ✅ Link task file or issue

**During Review**:
1. Respond to comments within 24 hours
2. Ask clarifying questions if needed
3. Provide context for design decisions
4. Be open to suggestions and improvements
5. Mark conversations as resolved when addressed
6. Request re-review after making significant changes

### For Reviewers

**Review Checklist**:

**Functionality** (30 minutes max per PR):
- [ ] Does code meet acceptance criteria?
- [ ] Are edge cases handled?
- [ ] Is error handling comprehensive?
- [ ] Are there any obvious bugs?

**Code Quality**:
- [ ] Follows project coding guidelines (see `AGENTS.md`)?
- [ ] Functions are focused and do one thing?
- [ ] Variable/function names clear and descriptive?
- [ ] No code duplication (DRY principle)?
- [ ] Proper TypeScript typing (no `any` types)?
- [ ] Comments added for complex logic?

**Testing**:
- [ ] Tests written using TDD approach?
- [ ] Test coverage >75% for new code?
- [ ] Tests are meaningful and comprehensive?
- [ ] Edge cases covered?
- [ ] Error scenarios tested?

**Security**:
- [ ] No hardcoded secrets or API keys?
- [ ] Input validation present?
- [ ] Authentication/authorization checks?
- [ ] SQL injection protection?
- [ ] XSS protection?

**Performance**:
- [ ] No unnecessary re-renders (React)?
- [ ] Database queries optimized?
- [ ] No N+1 query problems?
- [ ] Proper error handling and retries?

**Documentation**:
- [ ] Code comments for complex logic?
- [ ] JSDoc comments for public functions?
- [ ] README updated if needed?
- [ ] API documentation updated?

**Review Comments Examples**:

**Good Comments**:
```
✅ "Consider extracting this validation logic into a separate
function for reusability. Something like `validateFlightRequest()`"

✅ "Nice error handling here! Could we also add a test case for
when the API returns a 429 (rate limit) status?"

✅ "This SQL query might have an N+1 problem. Consider using a
JOIN instead of multiple queries in the loop."

✅ "Great implementation! The TDD approach is clear from the test
structure. One suggestion: could we add a test for the empty array case?"
```

**Bad Comments**:
```
❌ "This is wrong." (Not constructive, doesn't explain)

❌ "Why did you do it this way?" (Sounds accusatory)

❌ "I would have done this differently." (Not helpful without explanation)

❌ "This code is terrible." (Unprofessional)
```

**Approval Guidelines**:
- **Approve**: When all major concerns addressed, minor suggestions optional
- **Request Changes**: When blocking issues present (bugs, security issues, missing tests)
- **Comment**: For questions or minor suggestions that don't block merge

---

## Merge Strategy

### When to Use Each Strategy

**Squash and Merge** (Default):
- ✅ Feature branches with many small commits
- ✅ Commits like "WIP", "fix typo", "address review"
- ✅ Want clean, linear history on main
- ✅ Single logical change across multiple commits

**Rebase and Merge**:
- ✅ Commits are well-structured and atomic
- ✅ Each commit message is meaningful
- ✅ Want to preserve commit history
- ✅ Contributor followed conventional commits

**Merge Commit**:
- ✅ Long-running feature branch
- ✅ Multiple contributors on branch
- ✅ Want to preserve branch history
- ⚠️ Use sparingly (creates non-linear history)

### Merge Conflict Resolution

```bash
# If conflicts occur during rebase
git checkout feature/TASK-001-clerk-authentication
git rebase main

# If conflicts appear
# 1. Open conflicted files and resolve
# 2. Mark as resolved
git add <resolved-files>
git rebase --continue

# 3. Force push (since history changed)
git push --force-with-lease origin feature/TASK-001-clerk-authentication

# If you want to abort rebase
git rebase --abort
```

**Merge Conflict Best Practices**:
1. Keep branches short-lived (< 3 days ideal)
2. Rebase frequently from main
3. Communicate with team about overlapping work
4. Review conflicts carefully before resolving
5. Test thoroughly after resolving conflicts

---

## Branch Protection Rules

### Main Branch Protection

**GitHub Settings** → **Branches** → **Branch protection rules**

**Required Settings**:
```yaml
Branch name pattern: main

Require pull request before merging: ✅
  Require approvals: 1
  Dismiss stale reviews: ✅
  Require review from Code Owners: ❌ (until CODEOWNERS file created)

Require status checks to pass: ✅
  Require branches to be up to date: ✅
  Status checks:
    - test
    - lint
    - build
    - type-check

Require conversation resolution: ✅

Require signed commits: ❌ (optional)

Require linear history: ✅ (enforces squash or rebase)

Do not allow bypassing: ✅

Restrict who can push: ✅
  Allowed: Repository admins only
```

### Why These Rules Matter

1. **Require PRs**: Prevents accidental direct commits to main
2. **Require Approvals**: Ensures code review happens
3. **Require Status Checks**: Automated quality gates
4. **Require Up-to-date**: Prevents integration issues
5. **Linear History**: Easier to understand and bisect
6. **Restrict Push**: Only admins can emergency push (rare)

---

## Common Workflows

### Workflow 1: Starting New Task

```bash
# 1. Get latest main
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/TASK-015-rfp-orchestrator

# 3. Create/read task file
cat tasks/active/TASK-015-rfp-orchestrator.md

# 4. Write tests first (TDD Red phase)
# Create __tests__/unit/agents/orchestrator.test.ts

# 5. Commit failing tests
git add __tests__/unit/agents/orchestrator.test.ts
git commit -m "test(agents): add unit tests for RFP orchestrator

- Test request validation
- Test workflow initialization
- Test agent handoff logic

Red phase - tests currently failing

Related to: TASK-015"

# 6. Implement code (TDD Green phase)
# Create agents/orchestrator/orchestrator.agent.ts

# 7. Commit passing implementation
git add agents/orchestrator/orchestrator.agent.ts
git commit -m "feat(agents): implement RFP orchestrator agent

- Add request validation logic
- Initialize workflow state machine
- Implement handoff to Client Data Manager
- All unit tests passing

Green phase - tests now passing

Implements: TASK-015"

# 8. Refactor (TDD Blue phase)
# Improve code quality

# 9. Commit refactored code
git commit -am "refactor(agents): extract validation to helper

- Create validateFlightRequest() helper
- Improve error messages
- Add JSDoc comments
- Tests still passing

Blue phase - refactoring complete

Related to: TASK-015"

# 10. Push and create PR
git push -u origin feature/TASK-015-rfp-orchestrator
# Create PR on GitHub
```

### Workflow 2: Updating Branch with Latest Main

```bash
# Option A: Rebase (preferred - cleaner history)
git checkout feature/TASK-015-rfp-orchestrator
git fetch origin
git rebase origin/main

# If conflicts, resolve them
git add <resolved-files>
git rebase --continue

# Force push (history changed)
git push --force-with-lease origin feature/TASK-015-rfp-orchestrator

# Option B: Merge (if rebase too complex)
git checkout feature/TASK-015-rfp-orchestrator
git fetch origin
git merge origin/main

# Resolve conflicts if any
git add <resolved-files>
git commit -m "merge: sync with latest main"

# Push normally
git push origin feature/TASK-015-rfp-orchestrator
```

### Workflow 3: Squashing Commits Before PR

```bash
# View commit history
git log main..HEAD

# Interactive rebase to squash
git rebase -i main

# Editor opens - change 'pick' to 'squash' (or 's') for commits to combine
# Example:
# pick abc1234 test(agents): add tests
# squash def5678 feat(agents): implement orchestrator
# squash ghi9012 refactor(agents): improve validation
# squash jkl3456 fix(agents): handle edge case

# Save and close editor
# New editor opens for combined commit message
# Write clean, comprehensive message

# Force push
git push --force-with-lease origin feature/TASK-015-rfp-orchestrator
```

### Workflow 4: Emergency Hotfix

```bash
# 1. Branch from main
git checkout main
git pull origin main
git checkout -b hotfix/ISSUE-001-critical-auth-bypass

# 2. Fix the issue
# Edit files

# 3. Test thoroughly
npm test
npm run build

# 4. Commit with clear message
git commit -am "fix(auth): patch critical authentication bypass

CRITICAL: Unauthorized users could access protected routes
when session cookie was malformed. Added additional validation
in middleware.

Fixes: ISSUE-001
Severity: Critical
Impact: All authenticated routes"

# 5. Push and create PR
git push -u origin hotfix/ISSUE-001-critical-auth-bypass

# 6. Request expedited review
# Tag PR with 'hotfix' label
# Notify team in Slack/Discord

# 7. Deploy immediately after merge
# Follow deployment runbook
```

### Workflow 5: Working with Multiple Tasks

```bash
# Save current work in progress
git checkout feature/TASK-015-rfp-orchestrator
git stash save "WIP: orchestrator validation logic"

# Switch to urgent task
git checkout main
git pull origin main
git checkout -b feature/TASK-020-urgent-bug-fix

# Complete urgent task
# ... work, commit, push, create PR ...

# Return to original work
git checkout feature/TASK-015-rfp-orchestrator
git stash pop

# Continue working
```

---

## Troubleshooting

### Problem: Accidentally Committed to Main

```bash
# If you haven't pushed yet
git reset HEAD~1  # Undo last commit, keep changes
git checkout -b feature/TASK-XXX-my-feature
git add .
git commit -m "feat(scope): proper commit message"

# If you already pushed to main (CONTACT ADMIN)
# Admin can force push to remove commit
# Don't do this yourself unless you're absolutely sure
```

### Problem: Need to Undo Last Commit

```bash
# Keep changes, undo commit
git reset --soft HEAD~1

# Discard changes AND commit
git reset --hard HEAD~1  # ⚠️ DANGER: Loses all changes

# Undo multiple commits
git reset --soft HEAD~3  # Undo last 3 commits
```

### Problem: Force Push Rejected

```bash
# Use --force-with-lease for safety
git push --force-with-lease origin feature/TASK-015

# If still rejected, someone else pushed to your branch
# Pull first
git pull --rebase origin feature/TASK-015
git push --force-with-lease origin feature/TASK-015
```

### Problem: Merge Conflicts During Rebase

```bash
# During rebase, conflicts appear
# 1. Open files, resolve conflicts
# 2. Stage resolved files
git add <files>

# 3. Continue rebase
git rebase --continue

# If you want to abort
git rebase --abort

# If you get stuck in rebase hell
# Start over from main
git rebase --abort
git checkout main
git pull origin main
git checkout feature/TASK-015
git reset --hard origin/feature/TASK-015
```

### Problem: Pushed Sensitive Data (API Keys)

```bash
# 1. IMMEDIATELY rotate all exposed credentials

# 2. Remove from history (complex - contact admin)
# Option A: BFG Repo Cleaner
bfg --replace-text passwords.txt

# Option B: git filter-branch
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# 3. Force push (requires admin)
git push --force --all origin

# 4. Notify team to re-clone repository
```

### Problem: Lost Work After Reset

```bash
# Git keeps commits for ~30 days in reflog
git reflog

# Find your lost commit
# git reflog output:
# abc1234 HEAD@{0}: reset: moving to HEAD~1
# def5678 HEAD@{1}: commit: feat(auth): my lost work  <-- This one!

# Recover it
git checkout def5678
git checkout -b feature/recovered-work
```

### Problem: PR Has Too Many Commits

```bash
# Squash before merging
git rebase -i main

# Or let GitHub squash on merge
# Use "Squash and merge" button
```

---

## Quick Reference

### Branch Naming
```
feature/TASK-XXX-brief-description
fix/TASK-XXX-brief-description
hotfix/ISSUE-XXX-brief-description
docs/brief-description
refactor/TASK-XXX-brief-description
```

### Commit Types
```
feat     - New feature
fix      - Bug fix
docs     - Documentation
style    - Formatting
refactor - Code restructuring
test     - Tests
perf     - Performance
chore    - Tooling/dependencies
ci       - CI/CD changes
```

### Common Commands
```bash
# Start new feature
git checkout -b feature/TASK-XXX-name

# Commit with convention
git commit -m "type(scope): subject"

# Update from main
git rebase main

# Push branch
git push -u origin feature/TASK-XXX-name

# Squash commits
git rebase -i main

# Force push safely
git push --force-with-lease
```

---

**Questions or Issues?**
- Check existing PRs for examples
- Ask in team chat before force pushing
- When in doubt, create a new branch

**Document Owner**: Development Team
**Review Frequency**: Monthly
**Last Review**: October 20, 2025
**Next Review**: November 20, 2025
