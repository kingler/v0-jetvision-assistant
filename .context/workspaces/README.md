# Git Worktree Agent Workspaces

This directory contains isolated git worktree workspaces for AI agent work organized by SDLC phase.

## Directory Structure

```
.context/workspaces/
├── phase-1-branch-init/        # Pull Request Agent
├── phase-2-test-creation/      # Test Agent
├── phase-3-implementation/     # Coding Agent
├── phase-4-code-review/        # Code Review Agent
├── phase-5-iteration/          # Coding Agent (refinement)
├── phase-6-pr-creation/        # Pull Request Agent
├── phase-7-pr-review/          # Code Review Agent
├── phase-8-conflict-resolution/# Conflict Resolution Agent
├── phase-9-merge/              # Pull Request Agent
└── .archive/                   # Archived workspace metadata
```

## Usage

### Create Worktree

```bash
/worktree-create <phase> <branch-name> [linear-issue-id]
```

### View Status

```bash
/worktree-status
```

### Cleanup

```bash
/worktree-cleanup <branch-name>
/worktree-cleanup --stale
/worktree-cleanup --all
```

## Automatic Management

Worktrees are automatically:
- **Created** when agents are invoked (via PreToolUse hook)
- **Cleaned up** when ALL lifecycle conditions are met:
  1. All TDD tests pass
  2. PR is created
  3. Code review is completed
  4. Linear issue is updated
  5. Branch is merged into main
- **Archived** with metadata for audit trail

## Metadata

Each worktree contains `WORKSPACE_META.json`:

```json
{
  "branch": "feature/name",
  "linearIssue": "ONEK-123",
  "phase": 2,
  "phaseName": "test-creation",
  "agentRole": "Test Agent",
  "status": "active"
}
```

## Lifecycle Conditions for Auto-Cleanup

Before a worktree is automatically deleted, ALL conditions must be true:

| Condition | Verification Method |
|-----------|-------------------|
| TDD tests pass | `npm run test:unit` exits 0 |
| PR created | `gh pr list --head <branch>` returns PR |
| Code review complete | `gh pr view <pr> --json reviewDecision` = APPROVED |
| Linear issue updated | Linear API shows status = Done/Closed |
| Branch merged | `git branch -r --merged main` contains branch |

## Safety

Before worktree removal:
- Check for uncommitted changes
- Check for unpushed commits
- Verify all 5 lifecycle conditions
- Archive metadata

## Documentation

See [git-worktree-isolation skill](.claude/skills/git-worktree-isolation/SKILL.md) for comprehensive usage guide.
