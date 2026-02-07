---
name: linear-cleanup
description: Use when Linear issues need bulk cleanup — deduplication, status validation against codebase/test results, project synchronization, and backlog triage. Triggered when the board is stale, statuses are out of sync with reality, or duplicates have accumulated.
---

# Linear Cleanup Skill

Automated Linear issue management: deduplicate issues, validate statuses against test results, synchronize with codebase state, triage the backlog, and post UAT-ready comments with acceptance criteria.

## When to Use

- **Board is stale** — issue statuses don't reflect what's actually been implemented or tested
- **Duplicates exist** — multiple issues describe the same bug or feature
- **Sprint planning** — need a clean, accurate backlog before planning
- **After a burst of development** — many issues were worked on but not updated in Linear
- **Before UAT** — need every issue to have user stories, acceptance criteria, and manual test steps
- **Periodic hygiene** — run weekly/biweekly to keep Linear aligned with reality

## When NOT to Use

- **Single issue fix** — use `/linear-fix-issue` for individual bug triage
- **Posting a dev summary** — use `/linear-update-summary` for single-issue summaries
- **Finding bugs** — use `/e2e-test-issue` to discover bugs first

## Core Workflow

```
/linear-cleanup [team] [--scope=all|duplicates|status|sync|backlog]
        |
        v
  Phase 1: Fetch all issues
        |
        v
  Phase 2: Deduplication scan
        |  - Title/description similarity
        |  - Merge duplicates (keep oldest)
        v
  Phase 3: Status validation
        |  - Extract issue IDs from code
        |  - Run related tests
        |  - Update status based on results
        v
  Phase 4: Project synchronization
        |  - /analyze_codebase comparison
        |  - Match features to issues
        v
  Phase 5: Backlog triage
        |  - Stale issue detection
        |  - Priority recalculation
        v
  Phase 6: UAT comments
        |  - User stories + acceptance criteria
        |  - Manual test steps
        |  - @AB @Kham mentions
        v
  Cleanup Report
```

## Prerequisites

1. **Linear MCP** configured in `.claude/config.json`
2. **`gh` CLI** authenticated (for branch/PR cross-referencing)
3. **Test suite** runnable via `npx vitest run` (for status validation)
4. **Codebase access** for file/test mapping

## Command Usage

```bash
# Full cleanup (all phases)
/linear-cleanup

# Target a specific team
/linear-cleanup One Kaleidoscope

# Run only specific phases
/linear-cleanup --scope=duplicates
/linear-cleanup --scope=status
/linear-cleanup --scope=sync
/linear-cleanup --scope=backlog
```

## Phase Details

### Phase 1: Deduplication

Scans all non-archived issues and identifies duplicates by:
- **Title similarity** — Levenshtein distance or keyword overlap
- **Description overlap** — shared reproduction steps, affected files, or error messages
- **Label match** — same labels + similar titles is a strong signal

Actions taken:
- Keeps the **oldest** issue (first created)
- Marks newer duplicates with `Duplicate` status
- Posts a comment on each duplicate linking to the canonical issue
- Moves any unique context from duplicates into the canonical issue

### Phase 2: Status Validation

For each `In Progress`, `Todo`, or `In Review` issue:
1. Extracts the issue ID (e.g., `ONEK-123`) from the title/description
2. Searches the codebase for references (`git log --grep`, file search)
3. Finds related test files
4. Runs targeted tests: `npx vitest run <test-file>`
5. Updates status:

| Test Result | New Status | Condition |
|-------------|-----------|-----------|
| All pass | **Done** or **In Review** | Code exists, tests pass |
| Some fail | **In Progress** | Code exists, tests partially pass |
| All fail | **In Progress** or **Blocked** | Code exists, tests broken |
| No tests | **Todo** (flagged "Needs Tests") | Code may exist but untested |
| No code | **Backlog** | No implementation found |
| Tests pass, not deployed | **Ready for Deploy** | Create status if missing |

### Phase 3: Project Synchronization

Cross-references Linear with the actual codebase:
- Runs `/analyze_codebase` to generate current project status
- Compares completed features (code + passing tests) against issue statuses
- Identifies orphaned work (code with no corresponding issue)
- Flags issues that claim "In Progress" but have no branch or recent commits

### Phase 4: Backlog Triage

Analyzes backlog items and recommends actions:

**Implement** — issue should be prioritized when:
- Dependencies are now complete
- High business value / user impact
- Technical debt causing other failures

**Cancel** — issue should be closed when:
- Feature is no longer needed (superseded)
- No activity for >6 months
- Duplicate of completed work
- Outdated requirements

### Phase 5: UAT Comments

For every issue updated during cleanup, posts a comment with:
- **User Story** in "As a [role], I want [feature], so that [benefit]" format
- **Acceptance Criteria** as checkboxes
- **Manual Test Steps** for @AB and @Kham to verify
- Mentions `@AB` and `@Kham` for UAT assignment

## Status Mapping

### One Kaleidoscope Team
| Status | Type | ID |
|--------|------|-----|
| Backlog | backlog | `7f9ec129-...` |
| Todo | unstarted | `e90fbb77-...` |
| In Progress | started | `24cf6b54-...` |
| In Review | started | `76649747-...` |
| Done | completed | `3edf9454-...` |
| Canceled | canceled | `c878d47d-...` |
| Duplicate | canceled | `dd0eec11-...` |

### DesignThru AI Team
| Status | Type | ID |
|--------|------|-----|
| Backlog | backlog | `b8c6081d-...` |
| Todo | unstarted | `c19771b4-...` |
| In Progress | started | `6d7daa7a-...` |
| In Review | started | `f1dca90f-...` |
| Done | completed | `06be1531-...` |
| Canceled | canceled | `b5932867-...` |
| Duplicate | canceled | `b9bc32cb-...` |

## User Confirmation

The command **always asks for confirmation** before:
- Marking issues as Duplicate
- Changing issue statuses
- Posting bulk comments
- Canceling backlog items
- Creating new statuses (e.g., "Ready for Deploy")

A summary table is shown and the user must approve each phase's changes.

## Output Report

After execution, the command produces a cleanup report:

```markdown
## Linear Cleanup Report — {date}

### Duplicates
- {N} duplicates found, {N} merged
- Canonical issues: {list}

### Status Corrections
- {N} issues updated
| Issue | Old Status | New Status | Reason |
|-------|-----------|-----------|--------|
| ONEK-123 | In Progress | Done | All tests pass |

### Sync Discrepancies
- {N} issues misaligned with codebase
- {N} orphaned code areas (no issue)

### Backlog Recommendations
| Issue | Recommendation | Rationale |
|-------|---------------|-----------|
| ONEK-456 | Implement | Dependency ONEK-123 now complete |
| ONEK-789 | Cancel | No activity 8 months, superseded |

### UAT Comments Posted
- {N} issues updated with user stories and acceptance criteria
```

## Best Practices

### Run During Low Activity
Avoid running during active development sprints — status changes could conflict with in-progress work.

### Review Before Bulk Updates
Always review the proposed changes before confirming. The deduplication phase is especially important to verify — false positives can merge unrelated issues.

### Pair with Analyze Codebase
For the most accurate sync, run `/analyze_codebase` first, then `/linear-cleanup --scope=sync` to align issues with the freshly generated report.

### Incremental Scoping
If the board has many issues, run one scope at a time to keep changes manageable:
1. `--scope=duplicates` first
2. `--scope=status` second
3. `--scope=backlog` last

## Troubleshooting

### Linear MCP Not Available
Falls back to outputting the cleanup report to console for manual action.

### Test Suite Hangs
If `npx vitest run` hangs on external drive, use targeted runs:
```bash
npx vitest run __tests__/unit/lib/chat
```
The command uses targeted test execution, not full suite runs.

### Too Many Issues
Use team filtering or label filtering to narrow scope:
```bash
/linear-cleanup One Kaleidoscope
```

### "Ready for Deploy" Status Missing
The command will prompt to create this status if it doesn't exist in the team's workflow.

## Linear MCP Tools Used

| Tool | Purpose |
|------|---------|
| `list_issues` | Fetch all issues for analysis |
| `get_issue` | Get detailed issue info with relations |
| `update_issue` | Change status, description, labels |
| `create_comment` | Post UAT comments, dedup notices, audit trail |
| `list_issue_statuses` | Verify available statuses per team |
| `list_teams` | Identify target team |
| `list_issue_labels` | Cross-reference labels for dedup |

## References

- [linear-fix-issue](.claude/skills/linear-fix-issue/SKILL.md) — Single issue bug triage
- [linear-update-summary](.claude/skills/linear-update-summary/SKILL.md) — Post dev summary to single issue
- [analyze_codebase](.claude/commands/analyze_codebase.md) — Generate codebase status report
- [Linear MCP](https://mcp.linear.app) — Linear MCP server documentation
