---
allowed-tools: Bash(git worktree:*), Bash(find:*), Read
description: Display status of all git worktree workspaces
---

# Git Worktree Workspace Status

Display comprehensive status of all active git worktree workspaces organized by SDLC phase.

## Current Worktrees

```bash
!`git worktree list`
```

## Workspace Directory Structure

```bash
!`find .claude/workspaces -type d -maxdepth 2 2>/dev/null | grep -v "^\\.claude/workspaces$" | sort`
```

## Workspace Metadata Files

```bash
!`find .claude/workspaces -name "WORKSPACE_META.json" -type f 2>/dev/null`
```

## Task

Generate a comprehensive status report showing:

### 1. Overview Summary

```
Git Worktree Workspace Status
Date: <current-timestamp>
Project: v0-jetvision-assistant

Active Worktrees: <count>
Total Phases Active: <count>
Disk Space Used: <total-size>
```

### 2. By-Phase Breakdown

For each phase (1-9), show:

```
Phase <N>: <phase-name> (<agent-role>)
├── Active Worktrees: <count>
├── Branches:
│   ├── <branch-1>
│   │   ├── Linear Issue: <issue-id>
│   │   ├── Status: <status>
│   │   ├── Created: <timestamp>
│   │   ├── Last Access: <timestamp>
│   │   ├── Uncommitted Changes: <yes/no>
│   │   └── Unpushed Commits: <count>
│   └── <branch-2>
│       └── ...
└── Total Size: <size>
```

### 3. Branch Status Details

For each worktree, check:

1. **Git Status**:
   ```bash
   cd .claude/workspaces/phase-<N>-<name>/<branch>
   git status --porcelain
   ```

2. **Unpushed Commits**:
   ```bash
   git log origin/<branch>..HEAD --oneline 2>/dev/null | wc -l
   ```

3. **Last Commit**:
   ```bash
   git log -1 --format="%h %s (%cr)"
   ```

4. **Disk Usage**:
   ```bash
   du -sh .claude/workspaces/phase-<N>-<name>/<branch>
   ```

### 4. Stale Worktree Detection

Identify worktrees with:
- No activity for 7+ days
- Merged branches
- Deleted remote branches

```
Stale Worktrees Detected:
1. feature/old-feature (phase-3-implementation)
   - Last activity: 10 days ago
   - Status: Branch merged to main
   - Recommendation: Clean up with /worktree-cleanup

2. feature/abandoned (phase-2-test-creation)
   - Last activity: 15 days ago
   - Status: Remote branch deleted
   - Recommendation: Archive and remove
```

### 5. Health Checks

Run health checks on all worktrees:

✅ **No uncommitted changes** in completed phases
✅ **All branches have remotes** configured
✅ **No conflicting worktrees** (same branch, different phases)
✅ **Workspace metadata valid** and up-to-date
✅ **No locked worktrees** preventing cleanup

Report any issues:

```
⚠️  Health Issues Detected:

1. Uncommitted changes in phase-4-code-review/feature-auth
   - 3 modified files
   - Recommendation: Commit or stash changes

2. Missing remote for branch feature-local-only
   - Phase: 3 (implementation)
   - Recommendation: Push branch to remote

3. Stale metadata for feature-completed
   - Last updated: 12 days ago
   - Status still shows "in_progress"
   - Recommendation: Update metadata or clean up
```

### 6. Linear Sync Status

Show Linear issue mapping:

```
Linear Issue Tracking:
├── ONEK-93 (User Authentication)
│   ├── Phase 2: test-creation (active)
│   ├── Phase 3: implementation (active)
│   └── Phase 4: code-review (pending)
├── ONEK-105 (Payment Gateway)
│   ├── Phase 2: test-creation (completed)
│   └── Phase 3: implementation (active)
└── ONEK-112 (Memory Leak Fix)
    └── Phase 8: conflict-resolution (active)
```

### 7. Recommendations

Provide actionable recommendations:

```
Recommendations:
1. Clean up 3 stale worktrees (>7 days old)
   Run: /worktree-cleanup --stale

2. Archive 2 merged branches
   - feature/completed-feature (phase-3)
   - fix/resolved-bug (phase-4)
   Run: /worktree-cleanup <branch-name>

3. Commit uncommitted changes in 1 worktree
   - feature-auth (phase-4-code-review)

4. Disk space: 245 MB used
   Potential recovery: ~120 MB after cleanup
```

### 8. Quick Actions

Provide quick action commands:

```
Quick Actions:
├── List all worktrees:
│   git worktree list
├── Create new worktree:
│   /worktree-create <phase> <branch> [issue-id]
├── Clean up stale:
│   /worktree-cleanup --stale
├── Navigate to worktree:
│   cd .claude/workspaces/phase-<N>-<name>/<branch>
└── Archive metadata:
│   View: cat .claude/workspaces/.archive/*.json
```

## Output Format

Generate a well-formatted, color-coded (if terminal supports) report that:

1. Shows overview at the top
2. Groups by phase
3. Highlights issues with warnings
4. Provides clear recommendations
5. Includes quick action commands

## Metadata Parsing

For each `WORKSPACE_META.json` file, extract:
- Branch name
- Linear issue ID
- Phase number and name
- Agent role
- Created/last accessed timestamps
- Current status
- Workflow state

## Performance Optimization

To avoid slow operations:
- Cache git status checks
- Run checks in parallel where possible
- Limit depth of directory traversal
- Skip archived workspaces unless requested

## Error Handling

- **No worktrees found**: Show helpful message about creating first worktree
- **Permission denied**: Report which directories need permission fixes
- **Corrupted metadata**: Flag files needing manual repair
- **Git errors**: Show git command failures with suggestions

## Export Options

Optionally export report to:
- JSON format: `.claude/workspaces/status-<timestamp>.json`
- Markdown format: `.claude/workspaces/status-<timestamp>.md`
- Plain text: `.claude/workspaces/status-<timestamp>.txt`

Use `--export json|md|txt` flag for exports.
