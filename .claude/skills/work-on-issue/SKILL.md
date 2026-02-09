---
name: work-on-issue
description: Full Linear issue lifecycle orchestration — workspace setup, TDD, implementation, code review, PR, and merge. References agent teams, MCP tools, hooks, and command chains. Use when starting work on a Linear issue, resuming paused work, or coordinating the SDLC workflow for any ONEK issue.
---

# Work on Issue Skill

Orchestrate the full development lifecycle for a Linear issue — from workspace setup through merge.

## When to Use This Skill

- Starting work on a new Linear issue
- Resuming work on an in-progress issue
- Determining what phase an issue is in and what to do next
- Coordinating the full SDLC pipeline for a feature or bug fix
- Understanding which commands to chain together for an issue

## When NOT to Use This Skill

- Quick one-off code changes that don't have a Linear issue
- Exploring or reading code without intent to change it
- Creating new Linear issues (use `create_issue` directly)
- Managing worktrees without a Linear issue context (use `git-worktree-isolation` skill)

## Prerequisites

- Linear MCP server connected (for issue fetching and updates)
- Git repository with remote configured
- GitHub CLI (`gh`) authenticated
- Workspace root exists: `/Users/kinglerbercy/.claude/git-workspace/`

## Command Chain

The full lifecycle is a chain of slash commands, each handling a specific phase:

```
/work-on-issue ONEK-XXX            # 1. Setup workspace + fetch context + detect phase
  -> /linear-fix-issue ONEK-XXX     # 2. Triage bugs, create subtasks, implement
  -> /e2e-test-issue ONEK-XXX       # 3. Browser test the implementation
  -> /linear-update-summary ONEK-XXX # 4. Post dev summary for UAT
  -> /worktree-cleanup onek-xxx     # 5. Archive and clean up workspace
```

**Entry point**: Always start with `/work-on-issue ONEK-XXX`. It detects the current phase and tells you what to run next.

## Lifecycle Overview

### 9-Phase SDLC

| Phase | Name | Entry Condition | Exit Condition | Agent Team |
|-------|------|-----------------|----------------|------------|
| 1 | Branch Init | Issue accepted | Branch + workspace created | Architecture |
| 2 | Test Creation | Workspace ready | Failing tests written (TDD RED) | Testing |
| 3 | Implementation | Tests exist | Tests pass (TDD GREEN) | Development |
| 4 | Code Review | Tests pass | Review approved | Code Review |
| 5 | Iteration | Review feedback | Feedback addressed | Development |
| 6 | PR Creation | Review approved | PR created | DevOps |
| 7 | PR Review | PR created | PR approved | Code Review |
| 8 | Conflict Resolution | Merge conflicts | Conflicts resolved | DevOps |
| 9 | Merge | PR approved | Merged to main | DevOps |

### Phase Flow

```
Phase 1: Branch Init
    |
    v
Phase 2: Test Creation (TDD RED)
    |
    v
Phase 3: Implementation (TDD GREEN)
    |
    v
Phase 4: Code Review
    |
    +--[feedback]--> Phase 5: Iteration --+
    |                                      |
    +<------------------------------------+
    |
    v
Phase 6: PR Creation
    |
    v
Phase 7: PR Review
    |
    +--[conflicts]--> Phase 8: Conflict Resolution --+
    |                                                  |
    +<------------------------------------------------+
    |
    v
Phase 9: Merge + Cleanup
```

## Agent Teams

| Team | Agents | Phases | Responsibility |
|------|--------|--------|----------------|
| **Architecture** | system-architect, architect | 1 | Branch naming, workspace setup, initial planning |
| **Testing** | qa-engineer-seraph, test-engineer | 2 | Writing failing tests, defining acceptance criteria |
| **Development** | backend-developer, frontend-developer, fullstack-developer | 3, 5 | Making tests pass, addressing review feedback |
| **Code Review** | code-review-coordinator, morpheus-validator | 4, 7 | Code quality validation, PR review |
| **DevOps** | git-workflow, devops, deployment-engineer | 6, 8, 9 | PR creation, conflict resolution, merge |

## MCP Tools Reference

### Linear MCP (Issue Tracking)

| Tool | Used In | Purpose |
|------|---------|---------|
| `get_issue` | Phase 1, all phases | Fetch issue details (title, status, labels) |
| `update_issue` | Phase 1, 9 | Update status (In Progress, Done) |
| `create_comment` | Phase 1, 4, 6, 9 | Post progress updates and summaries |
| `list_comments` | Phase 1 | Fetch existing context and bug reports |
| `list_issue_statuses` | Phase 1 | Get available status options for team |
| `create_issue` | Phase 2 | Create subtasks for bugs |

### Avinode MCP (Flight Operations)

Used when the issue involves flight-related features:

| Tool | Purpose |
|------|---------|
| `create_trip` | Create trip and get deep link |
| `get_rfq` | Get RFQ details for testing |
| `get_quote` | Get quote details for verification |

### Gmail MCP (Communication)

Used when the issue involves email/proposal features:

| Tool | Purpose |
|------|---------|
| `send_email` | Send proposals or notifications |

## Hook Integration

### PreToolUse Hook — Auto Workspace Creation

- **File**: `.claude/hooks/worktree-auto-create.py`
- **Trigger**: When agents are invoked for Linear issues
- **Action**: Creates isolated worktree at `/Users/kinglerbercy/.claude/git-workspace/<issue-id>`
- **Output**: `WORKSPACE_META.json` with Linear issue, branch, and PR mapping

### SubagentStop Hook — Auto Workspace Cleanup

- **File**: `.claude/hooks/worktree-auto-cleanup.py`
- **Trigger**: When agent completes work
- **Conditions**: ALL 5 must be met:
  1. All TDD tests pass (`npm run test:unit` exits 0)
  2. PR is created (`gh pr list --head <branch>` returns PR)
  3. Code review is completed (PR has `reviewDecision: APPROVED`)
  4. Linear issue is updated (status = Done/Closed)
  5. Branch is merged into main (`git branch --merged main`)
- **Safety**: Also checks for uncommitted changes and unpushed commits

## TDD Workflow Integration

The lifecycle enforces Test-Driven Development through phases 2-3:

### RED Phase (Phase 2 — Test Creation)

1. Write tests that define the expected behavior
2. Run tests to confirm they fail: `npm run test:unit`
3. Commit failing tests: `git commit -m "test(ONEK-XXX): add failing tests for {feature}"`

### GREEN Phase (Phase 3 — Implementation)

1. Write minimal code to make tests pass
2. Run tests to confirm they pass: `npm run test:unit`
3. Commit passing implementation: `git commit -m "feat(ONEK-XXX): implement {feature}"`

### BLUE Phase (Phase 4 — Code Review)

1. Refactor for quality: `npm run review:validate`
2. Run full test suite: `npm test`
3. Commit improvements: `git commit -m "refactor(ONEK-XXX): improve {area}"`

Use `npm run review:tdd` to guide through each phase interactively.

## Workspace Metadata

Each workspace contains `WORKSPACE_META.json` at its root:

```json
{
  "linearIssue": "ONEK-XXX",
  "branch": "feat/onek-xxx-feature-name",
  "pullRequest": "#45",
  "prUrl": "https://github.com/kingler/v0-jetvision-assistant/pull/45",
  "workspaceDir": "/Users/kinglerbercy/.claude/git-workspace/onek-xxx",
  "agentRole": "Coding Agent",
  "agentType": "backend-developer",
  "createdAt": "2025-11-14T10:30:00Z",
  "lastAccessedAt": "2025-11-14T12:45:00Z",
  "status": "active",
  "currentPhase": 3,
  "completedPhases": [1, 2],
  "phaseHistory": [
    {"phase": 1, "startedAt": "...", "completedAt": "...", "agent": "worktree-manager"},
    {"phase": 2, "startedAt": "...", "completedAt": "...", "agent": "qa-engineer-seraph"}
  ]
}
```

### Field Mapping

| Field | Source | Example |
|-------|--------|---------|
| `linearIssue` | Linear issue ID | `ONEK-207` |
| `branch` | Git feature/fix branch | `feat/onek-207-contract-card` |
| `pullRequest` | GitHub PR number | `#103` |
| `workspaceDir` | Filesystem path | `/Users/kinglerbercy/.claude/git-workspace/onek-207` |
| `currentPhase` | SDLC phase number (1-9) | `3` |
| `completedPhases` | Array of completed phase numbers | `[1, 2]` |

## Quality Gates

Each phase transition requires passing quality checks:

### Phase 2 -> 3 (Tests Written -> Implementation)

- At least one test file exists for the feature
- Tests run and fail as expected (not errors, but assertion failures)

### Phase 3 -> 4 (Implementation -> Code Review)

- All unit tests pass: `npm run test:unit`
- Type checking passes: `npm run type-check` (if available)
- Linting passes: `npm run lint`

### Phase 4 -> 6 (Code Review -> PR Creation)

- Code validation passes: `npm run review:validate`
- Coverage meets threshold (75%): `npm run test:coverage`
- No critical issues from review

### Phase 6 -> 7 (PR Created -> PR Review)

- PR exists on GitHub
- All CI checks pass
- PR description is complete

### Phase 7 -> 9 (PR Approved -> Merge)

- PR has at least one approval
- No merge conflicts
- All CI checks green

## Related Commands

| Command | Purpose |
|---------|---------|
| `/work-on-issue ONEK-XXX` | Entry point — setup + phase detection |
| `/linear-fix-issue ONEK-XXX` | Triage bugs, create subtasks, implement fixes |
| `/e2e-test-issue ONEK-XXX` | Browser test the implementation |
| `/linear-update-summary ONEK-XXX` | Post development summary for UAT |
| `/worktree-create <branch> <issue>` | Create isolated workspace |
| `/worktree-status` | View all workspace statuses |
| `/worktree-cleanup <issue-id>` | Archive and remove workspace |

## Related Skills

| Skill | When to Use |
|-------|-------------|
| `git-worktree-isolation` | Worktree best practices and troubleshooting |
| `linear-fix-issue` | Detailed bug triage and fix workflow |
| `linear-update-summary` | Structured dev summary posting |
| `uat-instructions` | Generate UAT test instructions after dev |

## Related Agents

| Agent | Role |
|-------|------|
| `issue-workflow-orchestrator` | Coordinates the 9-phase SDLC for an issue |
| `worktree-manager` | Manages git worktree lifecycle |

## Troubleshooting

### No Workspace Found

If `/work-on-issue` can't find a workspace:
1. Check if the issue ID is correct (case-insensitive match)
2. Look for existing branches: `git branch -a | grep -i onek-xxx`
3. Create manually: `/worktree-create feat/ONEK-XXX-description ONEK-XXX`

### Phase Detection Wrong

If the detected phase seems incorrect:
1. Check test files manually in the workspace
2. Run tests to see current state: `npm run test:unit`
3. Check PR status: `gh pr list --head <branch>`
4. Override by telling the assistant which phase you're in

### Linear MCP Unavailable

If Linear MCP is not connected:
1. The command still creates/resumes workspaces using git context
2. Phase detection uses git and GitHub state only
3. Linear status updates are skipped with a warning
4. Post summaries manually after reconnecting
