---
allowed-tools: Bash(git worktree:*), Bash(find:*), Bash(du:*), Bash(gh:*), Read
description: Display status of all git worktree workspaces
---

# Git Worktree Workspace Status

Display comprehensive status of all active git worktree workspaces.

## Workspace Root

`/Users/kinglerbercy/.claude/git-workspace/`

## Current Worktrees

```bash
!`git worktree list`
```

## Workspace Metadata Files

```bash
!`find /Users/kinglerbercy/.claude/git-workspace -name "WORKSPACE_META.json" -type f 2>/dev/null`
```

## Task

Generate a comprehensive status report showing:

### 1. Overview Summary

```
Git Worktree Workspace Status
Date: <current-timestamp>
Project: v0-jetvision-assistant
Workspace Root: /Users/kinglerbercy/.claude/git-workspace/

Active Workspaces: <count>
Disk Space Used: <total-size>
```

### 2. By-Issue Breakdown

For each workspace, show:

```
<issue-id>/
├── Linear Issue: <ONEK-123>
├── Branch: <branch-name>
├── Pull Request: <#45 or none>
├── Status: <active/stale>
├── Created: <timestamp>
├── Last Access: <timestamp>
├── Uncommitted Changes: <yes/no>
└── Unpushed Commits: <count>
```

### 3. Workspace Status Details

For each worktree, check:

1. **Git Status**:
   ```bash
   git -C /Users/kinglerbercy/.claude/git-workspace/<issue-id> status --porcelain
   ```

2. **Unpushed Commits**:
   ```bash
   git -C /Users/kinglerbercy/.claude/git-workspace/<issue-id> log origin/<branch>..HEAD --oneline 2>/dev/null | wc -l
   ```

3. **Last Commit**:
   ```bash
   git -C /Users/kinglerbercy/.claude/git-workspace/<issue-id> log -1 --format="%h %s (%cr)"
   ```

4. **Disk Usage**:
   ```bash
   du -sh /Users/kinglerbercy/.claude/git-workspace/<issue-id>
   ```

### 4. Stale Workspace Detection

Identify workspaces with:
- No activity for 7+ days
- Merged branches
- Deleted remote branches

### 5. Linear Sync Status

Show Linear issue mapping:

```
Linear Issue Tracking:
├── ONEK-123 (User Authentication)
│   ├── Branch: feat/onek-123-user-auth
│   ├── PR: #45
│   └── Status: active
├── ONEK-144 (Multi-city Trip Card)
│   ├── Branch: fix/ONEK-144-multi-city-trip-card
│   ├── PR: #98
│   └── Status: active
└── ONEK-207 (Contract Card)
    ├── Branch: feat/onek-207-contract-card
    ├── PR: #103
    └── Status: active
```

### 6. Recommendations

Provide actionable recommendations:

```
Recommendations:
1. Clean up stale workspaces (>7 days old)
   Run: /worktree-cleanup --stale

2. Archive merged issue workspaces
   Run: /worktree-cleanup <issue-id>

3. Disk space: <size> used
   Potential recovery: ~<size> after cleanup
```

### 7. Quick Actions

```
Quick Actions:
├── List all worktrees:       git worktree list
├── Create new workspace:     /worktree-create <branch> <issue-id>
├── Clean up stale:           /worktree-cleanup --stale
├── Navigate to workspace:    cd /Users/kinglerbercy/.claude/git-workspace/<issue-id>
└── View archived metadata:   ls /Users/kinglerbercy/.claude/git-workspace/.archive/
```

## Metadata Parsing

For each `WORKSPACE_META.json` file, extract:
- Linear issue ID
- Branch name
- Pull request number/URL
- Agent role and type
- Created/last accessed timestamps
- Current status

## Error Handling

- **No workspaces found**: Show helpful message about creating first workspace
- **Permission denied**: Report which directories need permission fixes
- **Corrupted metadata**: Flag files needing manual repair
