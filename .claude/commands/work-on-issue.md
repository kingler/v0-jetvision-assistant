---
allowed-tools: Bash(git:*), Bash(gh:*), Bash(mkdir:*), Bash(ls:*), Bash(cat:*), Bash(npm:*), Bash(pnpm:*), Read, Write, Edit, Task
description: Start or resume work on a Linear issue with full SDLC orchestration including TDD workflow
argument-hint: <linear-issue-id>
---

# Work on Linear Issue

Start or resume work on a Linear issue with full SDLC orchestration — workspace setup, phase detection, TDD-driven implementation, quality gates, and guided next steps.

## Usage

```
/work-on-issue <linear-issue-id>
```

**Examples:**
```
/work-on-issue ONEK-207
/work-on-issue ONEK-123
```

## Current Context

- Current branch: !`git branch --show-current`
- Existing worktrees: !`git worktree list`

## Task

### Step 1: Validate Input

1. **Parse the Linear issue ID** from `$ARGUMENTS`
   - If no argument provided, ask the user: "Which Linear issue should I work on? (e.g., ONEK-207)"
   - Validate format matches `ONEK-\d+` pattern (case-insensitive)
   - Normalize to uppercase: `ONEK-XXX`

### Step 2: Fetch Linear Issue Context

1. **Fetch full issue details** using the Linear MCP `get_issue` tool:
   - Retrieve title, description, current status, labels, priority, assignee
   - If the issue is not found, report the error and stop

2. **Fetch existing comments** using Linear MCP `list_comments`:
   - Look for bug reports, implementation notes, UAT feedback
   - Extract any previously posted development summaries

3. **Display issue context** to the user:
   ```
   Issue: ONEK-XXX — {title}
   Status: {status}
   Priority: {priority}
   Assignee: {assignee or "Unassigned"}
   Labels: {labels}
   ```

### Step 3: Check for Existing Workspace

1. **Check for existing workspace** at `/Users/kinglerbercy/.claude/git-workspace/<issue-id-lowercase>/`

2. **If workspace exists**:
   - Read `WORKSPACE_META.json` for branch, PR, and status info
   - Check for uncommitted changes:

     ```bash
     git -C /Users/kinglerbercy/.claude/git-workspace/<issue-id> status --porcelain
     ```

   - Display workspace status:

     ```
     Existing workspace found:
     - Path: /Users/kinglerbercy/.claude/git-workspace/<issue-id>
     - Branch: {branch}
     - PR: {pr-number or "None"}
     - Status: {active/archived}
     - Last accessed: {timestamp}
     ```

   - Offer to resume: "Resume working in this workspace?"

3. **If no workspace exists**:
   - Derive a branch name from the issue:
     - Bug/fix labels → `fix/ONEK-XXX-{slugified-title}`
     - Feature/enhancement → `feat/ONEK-XXX-{slugified-title}`
     - Default → `feat/ONEK-XXX-{slugified-title}`
   - Create workspace via `/worktree-create <branch> <issue-id>`
   - If the issue already has a branch (check `git branch -a | grep -i onek-xxx`), use that branch

### Step 4: Determine Workflow Phase

Based on issue status and workspace state, determine the current SDLC phase:

| Issue Status | Workspace State | Phase | Description |
|-------------|----------------|-------|-------------|
| Backlog / Todo | No workspace | 1 | Branch init — create workspace |
| Backlog / Todo | Workspace exists | 2 | Test creation — write failing tests (TDD RED) |
| In Progress | No tests exist | 2 | Test creation — write failing tests (TDD RED) |
| In Progress | Tests exist, failing | 3 | Implementation — make tests pass (TDD GREEN) |
| In Progress | Tests pass, no review | 4 | Code review — validate quality (TDD REFACTOR) |
| In Progress | Review feedback | 5 | Iteration — address feedback |
| In Review | PR exists | 7 | PR review — review and approve |
| Done | PR merged | 9 | Merge — cleanup workspace |

**Detection heuristics:**
- Check for test files: `find <workspace> -name "*.test.ts" -o -name "*.test.tsx" | head -5`
- Check test status: `pnpm test:unit --silent 2>&1 | tail -5` (from workspace dir)
- Check for PR: `gh pr list --head <branch> --json number,state --limit 1`
- Check review status: `gh pr view <pr-number> --json reviewDecision`

### Step 5: Update Linear Issue Status

1. **If issue is in Backlog or Todo**, update to "In Progress":
   - Use Linear MCP `update_issue` to set state to "In Progress"
   - Assign to "me" if unassigned

2. **Post a start comment** on the Linear issue using `create_comment`:
   ```markdown
   🚀 Started work on this issue.
   - **Branch**: `{branch-name}`
   - **Workspace**: `/Users/kinglerbercy/.claude/git-workspace/<issue-id>`
   - **Phase**: {current-phase-name}
   - **TDD Mode**: Active — tests will be written before implementation
   ```

### Step 6: Display Status and Next Steps

Show the user the current state and recommended next actions:

```
=== Work on ONEK-XXX ===

Issue: {title}
Phase: {phase-number} — {phase-name}
Branch: {branch-name}
Workspace: /Users/kinglerbercy/.claude/git-workspace/<issue-id>
PR: {pr-number or "Not created yet"}
TDD Cycle: {RED | GREEN | REFACTOR | N/A}

=== Recommended Next Steps ===
```

**Phase-specific guidance:**

- **Phase 1-2 (Branch Init / Test Creation)**:
  ```
  1. Run `/linear-fix-issue ONEK-XXX` to triage and create implementation plan
  2. Proceed to Step 7 (TDD RED phase) — write failing tests
  ```

- **Phase 3 (Implementation)**:
  ```
  1. Run `/linear-fix-issue ONEK-XXX` to implement fixes
  2. Proceed to Step 7 (TDD GREEN phase) — make all tests pass
  3. Run `/test unit` to validate
  ```

- **Phase 4-5 (Code Review / Iteration)**:
  ```
  1. Proceed to Step 8 (Quality Gate) — full validation suite
  2. Run `pnpm review:pr` to generate PR review report
  3. Address any feedback, then create PR with `gh pr create`
  ```

- **Phase 6 (PR Creation)**:
  ```
  1. Create PR: `gh pr create --title "..." --body "..."`
  2. Run `/e2e-test-issue ONEK-XXX` for browser testing
  3. Run `/test comprehensive` for full suite validation
  ```

- **Phase 7 (PR Review)**:
  ```
  1. Run `/e2e-test-issue ONEK-XXX` for browser verification
  2. Address review comments if any
  3. Run `/linear-update-summary ONEK-XXX` to post dev summary
  ```

- **Phase 9 (Done / Merge)**:
  ```
  1. Run `/linear-update-summary ONEK-XXX` to post final summary
  2. Run `/worktree-cleanup <issue-id>` to archive workspace
  ```

### Step 7: Execute TDD Workflow (Auto-triggered after workspace setup)

**This step runs automatically** after Steps 1-6 complete. It implements the
Red-Green-Refactor cycle based on the detected phase, following `/tdd-usage`
patterns and the `/test` command for validation.

> **Important**: If the detected phase is 1-3, this step executes immediately.
> For phases 4+, skip to Step 8 (Quality Gates).

#### 7a. TDD RED Phase — Write Failing Tests (Phase 2)

**Goal**: Define expected behavior through tests before writing any implementation.

1. **Analyze the issue** to identify testable requirements:
   - Parse the Linear issue description, acceptance criteria, and comments
   - Identify the affected components, API routes, or utilities
   - Map requirements → test cases (aim for 1 test per acceptance criterion)

2. **Scaffold test files** in the workspace:
   - Determine test file locations using project conventions:
     - Unit tests: `__tests__/unit/` mirroring `components/` or `lib/` structure
     - Integration tests: `__tests__/integration/` for cross-component flows
     - Agent tests: `__tests__/agents/` for agent behavior
   - Create test files named `{feature}.test.ts` or `{feature}.test.tsx`

3. **Write failing tests** using Vitest + React Testing Library:
   ```typescript
   // Example: test structure for a new feature
   import { describe, it, expect } from 'vitest';

   describe('{FeatureName}', () => {
     it('should {expected behavior from acceptance criteria}', () => {
       // Arrange — setup preconditions from issue description
       // Act — invoke the feature
       // Assert — verify expected outcome
       expect(result).toBe(expected);
     });
   });
   ```

4. **Run tests to confirm they fail** (for the right reasons — assertion failures, not errors):

   ```bash
   pnpm test:unit -- --reporter=verbose 2>&1 | tail -20
   ```
   - If tests error (import failures, syntax issues), fix those first
   - Tests must FAIL on assertions, not crash on setup

5. **Commit failing tests** with conventional commit:

   ```bash
   git add __tests__/
   git commit -m "test(ONEK-XXX): add failing tests for {feature-slug}"
   ```

6. **Display RED phase summary**:

   ```
   === TDD RED Phase Complete ===
   Tests written: {count}
   Tests failing: {count} (expected)
   Test files: {list}
   Next: Proceeding to GREEN phase — implement to make tests pass
   ```

#### 7b. TDD GREEN Phase — Implement Minimal Code (Phase 3)

**Goal**: Write the minimum code necessary to make all failing tests pass.

1. **Review failing tests** to understand required implementation:

   ```bash
   pnpm test:unit -- --reporter=verbose 2>&1
   ```

2. **Implement the feature** following project conventions:
   - Use existing patterns from the codebase (check similar components/modules)
   - Follow TypeScript strict mode — no `any` types
   - Add JSDoc comments on exported functions and components
   - Use existing Tailwind utility patterns for UI
   - Keep implementation minimal — only what's needed to pass tests

3. **Run tests iteratively** during implementation:

   ```bash
   # Quick feedback loop — run only the relevant test file
   pnpm test:unit -- {test-file-path} --reporter=verbose
   ```

4. **Verify ALL tests pass** once implementation is complete:

   ```bash
   # Run the full unit test suite to check for regressions
   pnpm test:unit -- --reporter=verbose 2>&1
   ```
   - If any tests fail, fix the implementation (not the tests)
   - If pre-existing tests broke, the implementation has a regression — fix it

5. **Commit passing implementation** with conventional commit:

   ```bash
   git add .
   git commit -m "feat(ONEK-XXX): implement {feature-slug}"
   ```
   - Use `fix(ONEK-XXX)` for bug fixes instead of `feat`

6. **Display GREEN phase summary**:

   ```
   === TDD GREEN Phase Complete ===
   Tests passing: {count}/{total}
   Files changed: {list}
   Next: Proceeding to REFACTOR phase — improve code quality
   ```

#### 7c. TDD REFACTOR Phase — Improve Quality (Phase 4)

**Goal**: Improve code quality, remove duplication, and ensure maintainability
while keeping all tests green.

1. **Run code quality checks**:

   ```bash
   # Type checking
   pnpm type-check 2>&1

   # Linting
   pnpm lint 2>&1

   # Full validation suite
   pnpm review:validate 2>&1
   ```

2. **Address quality issues** found:
   - Fix TypeScript errors and warnings
   - Resolve lint issues (prefer auto-fix: `pnpm lint --fix`)
   - Remove code duplication
   - Improve naming and readability
   - Extract reusable utilities to `lib/`

3. **Run comprehensive test suite** to verify nothing broke:

   ```bash
   # Unit + integration tests
   pnpm test 2>&1

   # Coverage check (75% threshold)
   pnpm test:coverage 2>&1
   ```

4. **Commit refactoring** with conventional commit:

   ```bash
   git add .
   git commit -m "refactor(ONEK-XXX): improve {area} code quality"
   ```

5. **Display REFACTOR phase summary**:

   ```
   === TDD REFACTOR Phase Complete ===
   Type check: {PASS/FAIL}
   Lint: {PASS/FAIL}
   Tests: {count} passing
   Coverage: {percentage}%
   Next: Proceed to Step 8 (Quality Gates) before PR creation
   ```

### Step 8: Quality Gate Validation (Pre-PR checkpoint)

**This step enforces quality gates before a PR can be created.** All checks
must pass to proceed. Run this after the TDD cycle completes (end of Step 7)
or when resuming at Phase 4+.

#### 8a. Automated Validation Suite

Run all validation commands and collect results:

```bash
# 1. TypeScript compilation — must pass
pnpm type-check 2>&1

# 2. Linting — must pass
pnpm lint 2>&1

# 3. Unit tests — must pass
pnpm test:unit 2>&1

# 4. Coverage — must meet 75% threshold
pnpm test:coverage 2>&1

# 5. Code review validation — should pass
pnpm review:validate 2>&1
```

#### 8b. Quality Gate Report

Display a pass/fail summary:

```
=== Quality Gate Report — ONEK-XXX ===

  Type Check:       ✅ PASS / ❌ FAIL
  Lint:             ✅ PASS / ❌ FAIL
  Unit Tests:       ✅ {n} passing / ❌ {n} failing
  Test Coverage:    ✅ {n}% (≥75%) / ❌ {n}% (<75%)
  Code Validation:  ✅ PASS / ❌ FAIL

  Overall: ✅ READY FOR PR / ❌ NEEDS FIXES
```

#### 8c. Gate Failure Handling

If any gate fails:

1. **Identify the failing gate** and display the specific errors
2. **Attempt auto-fix** where possible:
   - Lint errors → `pnpm lint --fix`
   - Type errors → Review and fix the type issues
   - Test failures → Debug and fix the failing tests
3. **Re-run the failing gate** to verify the fix
4. **Loop until all gates pass** or ask the user for guidance if stuck
5. **Commit fixes** with conventional commit:

   ```bash
   git add .
   git commit -m "fix(ONEK-XXX): resolve quality gate failures"
   ```

### Step 9: Transition to Next Command

After the TDD cycle and quality gates pass, **automatically suggest or invoke**
the next command in the chain based on the current state:

| Current State | Next Action | Command |
|--------------|-------------|---------|
| Tests pass, no PR | Create PR | `gh pr create --title "{type}(ONEK-XXX): {title}" --body "..."` |
| PR created, no E2E | Browser test | `/e2e-test-issue ONEK-XXX` |
| E2E passed | Post summary | `/linear-update-summary ONEK-XXX` |
| Summary posted | UAT handoff | `/uat_instructions ONEK-XXX` |
| UAT complete | Cleanup | `/worktree-cleanup onek-xxx` |

**Ask the user** before proceeding to the next command:

```
Quality gates passed! Ready to proceed.

Next recommended action: {next-command-description}
  Command: {next-command}

Shall I proceed? (yes / no / skip to {alternative})
```

## Command Chain

This command is the entry point for the full Linear issue lifecycle.
Each step flows into the next, with TDD and testing integrated at every stage:

```
/work-on-issue ONEK-XXX            # 1. Setup workspace + context + detect phase
  |
  +-- [Phase 2] TDD RED             #    Auto: Write failing tests (Step 7a)
  +-- [Phase 3] TDD GREEN           #    Auto: Implement to pass tests (Step 7b)
  +-- [Phase 4] TDD REFACTOR        #    Auto: Improve quality (Step 7c)
  +-- [Gate]    Quality Validation   #    Auto: Run all quality checks (Step 8)
  |
  -> /linear-fix-issue ONEK-XXX     # 2. Triage bugs, create subtasks, implement
  -> /test unit                      # 3. Validate unit tests pass
  -> /test comprehensive             # 4. Full test suite validation
  -> /e2e-test-issue ONEK-XXX       # 5. Browser test the implementation
  -> /linear-update-summary ONEK-XXX # 6. Post dev summary for UAT
  -> /uat_instructions ONEK-XXX     # 7. Generate UAT test instructions
  -> /worktree-cleanup onek-xxx     # 8. Archive and clean up workspace
```

### Shortcut: Resume at Current Phase

When resuming work, the command detects the phase and **skips completed steps**:

```
# Resuming at Phase 3 (tests already written, some failing)
/work-on-issue ONEK-XXX
  → Detected Phase 3 (TDD GREEN) — skipping to Step 7b
  → Running failing tests to identify remaining work...
```

## TDD Workflow Reference

The TDD cycle follows the classic Red-Green-Refactor pattern.
See `/tdd-usage` for detailed examples and agent configurations.

### Quick Reference: TDD Commands During Development

```bash
# Run specific test file (fast feedback loop)
pnpm test:unit -- __tests__/unit/{path}/{file}.test.ts --reporter=verbose

# Run all unit tests
pnpm test:unit

# Run with coverage
pnpm test:coverage

# Run integration tests
pnpm test:integration

# Run full suite (unit + integration)
pnpm test

# Comprehensive QA (all test types)
# Equivalent to /test comprehensive
pnpm test && pnpm type-check && pnpm lint
```

### TDD Commit Convention

Each TDD phase produces a distinct commit type:

| Phase | Commit Prefix | Example |
|-------|--------------|---------|
| RED | `test(ONEK-XXX):` | `test(ONEK-207): add failing tests for contract card` |
| GREEN | `feat(ONEK-XXX):` or `fix(ONEK-XXX):` | `feat(ONEK-207): implement contract card component` |
| REFACTOR | `refactor(ONEK-XXX):` | `refactor(ONEK-207): extract shared card utilities` |
| Gate fix | `fix(ONEK-XXX):` | `fix(ONEK-207): resolve lint and type-check errors` |

## Notes

- This command requires the **Linear MCP** server for issue fetching and status updates
- If Linear MCP is unavailable, the command can still create/resume workspaces using git context alone
- The workspace root is `/Users/kinglerbercy/.claude/git-workspace/`
- Branch names are derived from issue type and title if no existing branch is found
- Always confirm with the user before changing Linear issue status
- This command pairs with the `work-on-issue` skill for full lifecycle reference
- The TDD workflow (Step 7) auto-triggers for phases 1-3; for later phases, it resumes at the appropriate sub-step
- Quality gates (Step 8) must all pass before any PR is created — no exceptions
- Use `/test unit` for fast feedback during development, `/test comprehensive` before PR creation
