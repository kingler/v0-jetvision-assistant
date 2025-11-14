# Git Worktree Agent Workspaces

This directory contains isolated git worktree workspaces for AI agent work organized by SDLC phase.

## Directory Structure

```
.claude/workspaces/
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
- **Cleaned up** when phases complete (via SubagentStop hook)
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

## Safety

Before worktree removal:
- ✅ Check for uncommitted changes
- ✅ Check for unpushed commits
- ✅ Archive metadata
- ✅ Verify phase completion

## Documentation

See [git-worktree-isolation skill](.claude/skills/git-worktree-isolation/SKILL.md) for comprehensive usage guide.
