---
name: linear-fix-issue
description: Use when a Linear issue has reported bugs that need triaging into subtasks, an implementation plan, and systematic fixing. Triggered when bugs are found from e2e testing, user reports, or code review and need structured resolution.
---

# Linear Fix Issue Skill

Triage bugs from a Linear issue into subtasks, build a checklist implementation plan, notify stakeholders, and systematically fix each item.

## When to Use

- Bugs have been found and reported on a Linear issue (from `/e2e-test-issue`, user feedback, or code review)
- A Linear issue needs to be broken down into actionable subtasks before fixing
- Multiple bugs need prioritized, ordered resolution with stakeholder visibility
- You want an implementation plan with checkboxes that agents can update as they complete work

## When NOT to Use

- Single simple bug with an obvious fix — just fix it directly
- No bugs reported yet — run `/e2e-test-issue` first to find them
- Summarizing completed work — use `/linear-update-summary` instead

## Core Workflow

```
/e2e-test-issue ONEK-XXX     (find bugs)
        ↓
/linear-fix-issue ONEK-XXX   (triage + fix)
        ↓
/e2e-test-issue ONEK-XXX     (verify fixes)
        ↓
/linear-update-summary ONEK-XXX (document for UAT)
```

## Prerequisites

1. **Linear MCP** configured in `.claude/config.json`
2. **Feature branch** checked out (fixes are committed to a branch, not main)
3. **Bugs identified** — from e2e tests, conversation context, or Linear comments
4. **`gh` CLI** authenticated (for branch/PR operations)

## Command Usage

```bash
/linear-fix-issue ONEK-177
```

## What the Command Does

### 1. Retrieves Issue Context
Fetches issue title, description, status, comments, and any existing subtasks from Linear.

### 2. Triages Bugs into Subtasks
Gathers bugs from all sources (Linear comments, e2e test results, conversation, codebase TODOs), deduplicates, and creates a Linear subtask for each with:
- Descriptive title and reproduction steps
- Severity classification (Critical > Major > Minor)
- Parent issue linkage

### 3. Notifies Stakeholders
Posts a comment on each subtask mentioning the original reporter, plus a triage summary on the parent issue.

### 4. Builds Implementation Plan
Appends a checklist to the parent issue description with:
- Fix order by severity and dependency
- Acceptance criteria per subtask
- Dependency mapping between fixes
- Testing strategy

### 5. Implements Fixes Systematically
Works through the checklist, committing each fix with references to the subtask ID, updating Linear as each item completes.

## Severity Classification

| Severity | Criteria | Priority |
|----------|----------|----------|
| **Critical** | Crashes, data loss, security issues | Fix first |
| **Major** | Broken features, incorrect data, significant UI bugs | Fix second |
| **Minor** | Cosmetic issues, edge cases, minor UX improvements | Fix last |

## Best Practices

### Run From Feature Branch
Fixes are committed to a branch. If on `main`, the command will create `fix/ONEK-XXX-bug-fixes`.

### Confirm Before Creating Subtasks
The command asks for confirmation before creating subtasks and posting comments. Review the bug list to avoid duplicates with existing subtasks.

### Keep Acceptance Criteria Specific
Good: "RFQ prices update within 2 seconds after operator responds"
Bad: "Prices work correctly"

### Use the Full Lifecycle
The three Linear commands form a complete workflow:
1. `/linear-fix-issue` — Triage and fix
2. `/e2e-test-issue` — Verify
3. `/linear-update-summary` — Document

### Commit Messages Reference Subtasks
Each fix commit references the subtask ID for traceability:
```
fix(ONEK-177): resolve RFQ price staleness — resolves ONEK-177-1
```

## Troubleshooting

### Linear MCP Not Available
The command outputs the triage plan and implementation checklist to the console for manual entry into Linear.

### No Bugs Found
If no bugs are identified from any source, the command reports this and suggests running `/e2e-test-issue` first.

### Subtask Creation Fails
If `create_issue` fails (permissions, API limits), the command falls back to posting the full bug list as a comment on the parent issue.

### Circular Dependencies Between Fixes
If two fixes depend on each other, the command flags this and asks the user to determine which should go first.

## Linear MCP Tools Used

| Tool | Purpose |
|------|---------|
| `get_issue` | Fetch parent issue details and comments |
| `create_issue` | Create subtasks for each bug |
| `update_issue` | Append implementation plan to description, update status |
| `create_comment` | Notify stakeholders, post triage summary, track progress |

## References

- [e2e-test-issue.md](.claude/commands/e2e-test-issue.md) — Find bugs before triaging
- [linear-update-summary.md](.claude/commands/linear-update-summary.md) — Summarize after fixing
- [Linear MCP](https://mcp.linear.app) — Linear MCP server documentation
