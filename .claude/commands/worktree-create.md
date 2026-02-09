---
allowed-tools: Bash(git worktree:*), Bash(mkdir:*), Bash(gh:*), Write, Read
description: Create isolated git worktree workspace for a Linear issue
argument-hint: <branch-name> <linear-issue-id>
---

# Create Git Worktree Workspace

Create an isolated git worktree workspace mapped to a Linear issue, git branch, and PR.

## Usage

```
/worktree-create <branch-name> <linear-issue-id>
```

**Examples:**
```
/worktree-create feat/ONEK-123-user-auth ONEK-123
/worktree-create fix/ONEK-456-validation ONEK-456
/worktree-create feat/onek-207-contract-card ONEK-207
```

## Workspace Location

All workspaces live at `/Users/kinglerbercy/.claude/git-workspace/`, named by Linear issue ID (lowercase).

## Current Context

- Current branch: !`git branch --show-current`
- Existing worktrees: !`git worktree list`

## Task

1. **Parse arguments**: Extract branch ($1) and Linear issue ($2)
2. **Derive workspace directory** from issue ID (lowercase): `/Users/kinglerbercy/.claude/git-workspace/<issue-id>`
3. **Create workspace root** if it doesn't exist
4. **Check for existing worktree** for this issue
5. **Create branch** if it doesn't exist (from current main)
6. **Create git worktree**:
   ```bash
   git worktree add /Users/kinglerbercy/.claude/git-workspace/<issue-id> <branch>
   ```
7. **Look up PR** for this branch:
   ```bash
   gh pr list --head <branch> --json number,url --limit 1
   ```
8. **Create workspace metadata file** at worktree root
9. **Report worktree location** and next steps

## Workspace Metadata

Create `/Users/kinglerbercy/.claude/git-workspace/<issue-id>/WORKSPACE_META.json`:

```json
{
  "linearIssue": "<ONEK-123>",
  "branch": "<branch-name>",
  "pullRequest": "<#45 or null>",
  "prUrl": "<https://github.com/... or null>",
  "workspaceDir": "/Users/kinglerbercy/.claude/git-workspace/<issue-id>",
  "agentRole": "<agent-role>",
  "agentType": "<agent-type>",
  "createdAt": "<ISO-8601-timestamp>",
  "lastAccessedAt": "<ISO-8601-timestamp>",
  "status": "active"
}
```

## Safety Checks

Before creating:
- Verify `/Users/kinglerbercy/.claude/git-workspace/` exists (create if not)
- Check if worktree already exists for this issue
- Ensure branch name follows convention
- Verify no uncommitted changes in main tree

## Error Handling

- **Worktree exists**: Offer to use existing or force recreate
- **Branch exists elsewhere**: Show conflict and resolution options
- **Permission denied**: Check directory permissions

## Output

Success message should include:
- Worktree path
- Linear issue ID
- Branch name
- PR number (if exists)
- Next steps for the agent
