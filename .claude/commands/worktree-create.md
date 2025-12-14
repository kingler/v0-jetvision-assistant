---
allowed-tools: Bash(git worktree:*), Bash(mkdir:*), Write, Read
description: Create isolated git worktree workspace for agent/phase
argument-hint: <phase-number> <branch-name> [linear-issue-id]
---

# Create Git Worktree Workspace

Create an isolated git worktree workspace for a specific SDLC phase and branch.

## Usage

```
/worktree-create <phase> <branch-name> [linear-issue-id]
```

**Examples:**
```
/worktree-create 2 feature/user-auth ONEK-93
/worktree-create 3 feature/payment-gateway ONEK-105
/worktree-create 4 fix/memory-leak ONEK-112
```

## Phase Mapping

| Phase | Name | Agent Role |
|-------|------|-----------|
| 1 | branch-init | Pull Request Agent |
| 2 | test-creation | Test Agent |
| 3 | implementation | Coding Agent |
| 4 | code-review | Code Review Agent |
| 5 | iteration | Coding Agent |
| 6 | pr-creation | Pull Request Agent |
| 7 | pr-review | Code Review Agent |
| 8 | conflict-resolution | Conflict Resolution Agent |
| 9 | merge | Pull Request Agent |

## Current Context

- Current branch: !`git branch --show-current`
- Existing worktrees: !`git worktree list`

## Task

1. **Parse arguments**: Extract phase ($1), branch ($2), and Linear issue ($3)
2. **Determine phase name** from phase number
3. **Create worktree directory structure** if it doesn't exist
4. **Check for existing worktree** for this phase/branch combination
5. **Create branch** if it doesn't exist (from current main)
6. **Create git worktree**:
   ```bash
   git worktree add .claude/workspaces/phase-<N>-<name>/<branch> <branch>
   ```
7. **Create workspace metadata file** at worktree root
8. **Report worktree location** and next steps

## Workspace Metadata

Create `.claude/workspaces/phase-<N>-<name>/<branch>/WORKSPACE_META.json`:

```json
{
  "branch": "<branch-name>",
  "linearIssue": "<linear-issue-id>",
  "phase": <N>,
  "phaseName": "<phase-name>",
  "agentRole": "<agent-role>",
  "createdAt": "<ISO-8601-timestamp>",
  "lastAccessedAt": "<ISO-8601-timestamp>",
  "status": "active",
  "workflowState": {}
}
```

## Safety Checks

Before creating:
- ✅ Verify `.claude/workspaces/` exists
- ✅ Check if worktree already exists
- ✅ Validate phase number (1-9)
- ✅ Ensure branch name follows convention
- ✅ Verify no uncommitted changes in main tree

## Error Handling

- **Worktree exists**: Offer to use existing or force recreate
- **Invalid phase**: Show valid phase numbers
- **Branch exists elsewhere**: Show conflict and resolution options
- **Permission denied**: Check directory permissions

## Output

Success message should include:
- Worktree path
- Branch name
- Linear issue ID (if provided)
- Phase name and agent role
- Next steps for the agent
