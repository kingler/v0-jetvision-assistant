---
name: pr-followup-issues
description: Use when a PR has been merged or reviewed and needs follow-up Linear issues generated from its context — failing CI checks, review feedback, tech debt, missing tests, or performance concerns. Takes a PR number, analyzes it via gh CLI, and creates categorized Linear issues linked back to the PR.
---

# PR Follow-Up Issues Skill

Analyze a GitHub PR (merged or open) and generate categorized follow-up Linear issues from what the PR reveals: failing checks, review comments, tech debt, missing coverage, and performance concerns.

## When to Use

- **After merging a PR** that had failing or skipped CI checks
- **After a PR review** with action items or deferred improvements
- **Sprint retrospective** — converting PR learnings into tracked work
- **Tech debt tracking** — capturing debt introduced or exposed by a PR

## When NOT to Use

- **Decomposing a new feature** — use `/create-linear-issue` instead
- **Fixing a single bug** — use `/linear-fix-issue` instead
- **The PR has no follow-ups** — don't create issues for the sake of it

## Core Workflow

```
PR #{number} (merged or open)
        |
        v
/pr-followup-issues {number}     (THIS SKILL)
        |
        v
gh pr view / gh pr checks        (fetch PR context)
        |
        v
Categorize follow-ups             (CI, Testing, Performance, Tech Debt, Docs)
        |
        v
User confirms / edits             (interactive review before creation)
        |
        v
Linear: follow-up issues          (linked to PR, categorized, prioritized)
```

## Prerequisites

1. **GitHub CLI** (`gh`) authenticated with repo access
2. **Linear MCP** configured in `.mcp.json`
3. **Team**: One Kaleidoscope

## Command Usage

```bash
# From PR number
/pr-followup-issues 22

# From PR URL
/pr-followup-issues https://github.com/kingler/v0-jetvision-assistant/pull/22

# With category filter
/pr-followup-issues 22 --categories=ci,testing

# Dry run — show what would be created without creating
/pr-followup-issues 22 --dry-run
```

## Follow-Up Categories

| Category | Label | Trigger Signals |
|----------|-------|-----------------|
| **CI/CD** | `ci/cd`, `infrastructure` | Failing CI checks, missing secrets, workflow issues |
| **Testing** | `testing`, `quality` | Low coverage, missing test files, skipped tests |
| **Performance** | `performance`, `optimization` | Bundle size warnings, build time, lighthouse scores |
| **Tech Debt** | `tech-debt`, `refactoring` | Review comments flagging shortcuts, TODOs in diff |
| **Documentation** | `documentation` | Missing or outdated docs mentioned in review |
| **Security** | `security` | npm audit warnings, dependency vulnerabilities |

## Detailed Steps

### Step 1: Parse Arguments and Fetch PR Context

1. **Parse `$ARGUMENTS`**:
   - Extract PR number (from bare number or full URL)
   - Parse optional `--categories` filter (comma-separated)
   - Parse optional `--dry-run` flag

2. **Fetch PR data** using `gh` CLI:
   ```bash
   # PR metadata
   gh pr view {number} --json title,body,state,mergedAt,author,labels,reviewDecision,url,number,headRefName

   # PR checks (CI status)
   gh pr checks {number} --json name,state,description

   # PR review comments (action items)
   gh api repos/{owner}/{repo}/pulls/{number}/reviews --jq '.[].body'

   # PR diff stats
   gh pr diff {number} --stat
   ```

3. **Display PR summary**:
   ```
   PR #{number}: {title}
   State: {merged|open|closed}
   Branch: {headRefName}
   Author: {author}
   Review: {reviewDecision}
   Files changed: {count}
   ```

### Step 2: Analyze and Categorize Follow-Ups

1. **CI/CD Analysis** — scan `gh pr checks` output:
   - Identify checks with `state: FAILURE` or `state: PENDING`
   - Group by check name (e.g., "Code Review", "Security Review", "Performance Review")
   - Extract failure descriptions

2. **Testing Analysis** — scan PR diff and checks:
   - Look for test coverage check failures
   - Scan diff for files without corresponding test files
   - Look for `skip`, `todo`, `xit`, `xdescribe` in test files
   - Check if new source files lack test coverage

3. **Performance Analysis** — scan checks and diff:
   - Look for performance/bundle check failures
   - Scan for large dependency additions in package.json changes
   - Check for missing dynamic imports in new components

4. **Tech Debt Analysis** — scan review comments and diff:
   - Extract review comments with action items (TODO, FIXME, "should be", "consider", "ideally")
   - Scan diff for new TODO/FIXME/HACK comments
   - Look for `any` type additions in TypeScript files
   - Identify `console.log` additions

5. **Documentation Analysis** — scan diff:
   - Check if new public APIs lack JSDoc
   - Check if README or docs/ need updating for new features
   - Look for review comments mentioning docs

6. **Security Analysis** — scan checks and diff:
   - Look for npm audit check failures
   - Scan for hardcoded strings that look like secrets
   - Check for new dependencies with known vulnerabilities

### Step 3: Present Follow-Up Summary for User Review

Display the categorized follow-ups and let the user edit before creation:

```
=== PR #{number} Follow-Up Analysis ===

CI/CD (2 issues):
  [1] CI Test Environment Setup
      Trigger: "Test Coverage" check FAILED — missing test DB config
      Priority: Urgent
      Est: 3h

  [2] Fix Security Review CI Check
      Trigger: "Security Review" check FAILED — npm audit warnings
      Priority: High
      Est: 2h

Testing (1 issue):
  [3] Expand Test Coverage for {changed modules}
      Trigger: Coverage below 75% threshold
      Priority: High
      Est: 8h
      Depends on: [1]

Performance (1 issue):
  [4] Bundle Size Optimization
      Trigger: "Performance Review" check FAILED
      Priority: Medium
      Est: 5h

Tech Debt (0 issues):
  (none detected)

Documentation (0 issues):
  (none detected)

Options:
  (a) Create all {N} issues
  (b) Select specific issues by number
  (c) Edit an issue before creating
  (d) Add a custom follow-up issue
  (e) Cancel
```

### Step 4: Create Linear Issues

For each confirmed follow-up, create a Linear issue:

```
create_issue({
  title: "{category}: {title}",
  description: "## Context\n\nFollow-up from PR #{number}: {pr_title}\n**PR**: {pr_url}\n**Branch**: {branch}\n**Trigger**: {what triggered this follow-up}\n\n## Tasks\n\n{task checklist from analysis}\n\n## Acceptance Criteria\n\n{generated from the follow-up context}\n\n## References\n\n- PR: {pr_url}\n- Related checks: {check names}",
  team: "One Kaleidoscope",
  labels: [{category labels}],
  priority: {1-4 based on category and severity},
  estimate: {hours estimate},
  state: "Backlog"
})
```

### Step 5: Set Dependencies

If follow-ups have logical dependencies (e.g., "Test Coverage" depends on "CI Environment Setup"):

```
update_issue({
  id: "{dependent_issue_id}",
  blockedByIds: ["{blocking_issue_id}"]
})
```

### Step 6: Final Report

```
=== PR Follow-Up Issues — Complete ===

PR:          #{number} — {title}
PR URL:      {url}
Created:     {N} follow-up issues

Issues:
  ONEK-AAA — CI/CD: {title}                    [Urgent]
  ONEK-BBB — Security: {title}                 [High]
  ONEK-CCC — Testing: {title}                  [High]  (blocked by ONEK-AAA)
  ONEK-DDD — Performance: {title}              [Medium]

Dependencies:
  ONEK-CCC blocked by ONEK-AAA

Next Steps:
  1. Review issues in Linear (search: "PR #{number}")
  2. Assign to sprint and team members
  3. Use /work-on-issue ONEK-AAA to start with highest priority
```

## Error Handling

### PR Not Found
If `gh pr view` fails:
- Error: "PR #{number} not found. Check the number and repo access."
- Stop execution.

### No Follow-Ups Detected
If analysis finds nothing actionable:
- Display: "No follow-up issues detected for PR #{number}. All checks passed and no action items found."
- Offer: "Would you like to add a custom follow-up issue anyway?"

### Linear MCP Unavailable
If Linear MCP tools fail:
- Output the follow-up issues as structured markdown
- Save to `docs/pr-followups/PR-{number}-followups.md` for manual entry

### gh CLI Not Authenticated
If `gh` commands fail with auth errors:
- Error: "GitHub CLI not authenticated. Run `gh auth login` first."
- Stop execution.

## Linear MCP Tools Used

| Tool | Purpose |
|------|---------|
| `create_issue` | Create follow-up issues |
| `update_issue` | Set dependencies between issues |
| `list_issue_labels` | Verify category labels exist |

## References

- [create-linear-issue](/.claude/commands/create-linear-issue.md) — Forward-looking plan-to-issues (complementary)
- [linear-fix-issue](/.claude/commands/linear-fix-issue.md) — Bug triage for existing issues
- [work-on-issue](/.claude/commands/work-on-issue.md) — Start implementation on created issues
