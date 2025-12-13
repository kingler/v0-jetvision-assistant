---
allowed-tools: Bash(git worktree:*), Bash(rm:*), Bash(find:*), Read, Write
description: Clean up completed or stale git worktree workspaces
argument-hint: [branch-name|--all|--stale]
---

# Clean Up Git Worktree Workspaces

Remove completed, merged, or stale git worktree workspaces safely.

## Usage

```
/worktree-cleanup [branch-name]      # Clean up specific branch
/worktree-cleanup --all              # Clean up all completed worktrees
/worktree-cleanup --stale            # Clean up stale worktrees (>7 days)
```

**Examples:**
```
/worktree-cleanup feature/user-auth
/worktree-cleanup --stale
/worktree-cleanup --all
```

## Current Worktrees

List all active worktrees:
```bash
!`git worktree list`
```

## Workspace Metadata

Find all workspace metadata files:
```bash
!`find .context/workspaces -name "WORKSPACE_META.json" -type f 2>/dev/null | head -20`
```

## Task

### For Specific Branch Cleanup

1. **Find all worktrees** for the specified branch
2. **Check worktree status**:
   - Any uncommitted changes?
   - Any unpushed commits?
   - Current phase complete?
3. **Safety confirmation**:
   - Show what will be deleted
   - Confirm with user if uncommitted work exists
4. **Archive metadata**:
   - Update status to "archived"
   - Add `archivedAt` timestamp
   - Move to `.context/workspaces/.archive/`
5. **Remove worktrees**:
   ```bash
   git worktree remove .context/workspaces/phase-<N>-<name>/<branch>
   ```
6. **Prune git references**:
   ```bash
   git worktree prune
   ```

### For --stale Cleanup

1. **Find stale worktrees** (no activity >7 days):
   ```bash
   find .context/workspaces -name "WORKSPACE_META.json" -mtime +7
   ```
2. **Parse metadata** to check last access time
3. **Verify branch status**:
   - Is branch merged?
   - Is branch deleted?
   - Any uncommitted work?
4. **Show stale worktrees** with details
5. **Confirm before cleanup**
6. **Archive and remove** each stale worktree

### For --all Cleanup

1. **List all worktrees**
2. **Check merge status** for each branch
3. **Identify completed phases**:
   - Branch merged to main
   - All phases complete
   - No uncommitted changes
4. **Show cleanup plan**
5. **Confirm before proceeding**
6. **Archive and remove** all eligible worktrees

## Safety Checks

Before removing ANY worktree:

1. ✅ **Check for uncommitted changes**:
   ```bash
   cd .context/workspaces/phase-<N>-<name>/<branch>
   git status --porcelain
   ```

2. ✅ **Check for unpushed commits**:
   ```bash
   git log origin/<branch>..HEAD --oneline
   ```

3. ✅ **Verify not current directory**:
   - Must be outside worktree to remove it

4. ✅ **Check branch merge status**:
   ```bash
   git branch --merged main | grep <branch>
   ```

## Archiving Process

Before removal, archive workspace metadata:

1. **Create archive directory**:
   ```bash
   mkdir -p .context/workspaces/.archive
   ```

2. **Update metadata**:
   ```json
   {
     "status": "archived",
     "archivedAt": "<ISO-8601-timestamp>",
     "reason": "branch-merged|stale|manual-cleanup"
   }
   ```

3. **Move metadata file**:
   ```bash
   mv .context/workspaces/phase-<N>-<name>/<branch>/WORKSPACE_META.json \
      .context/workspaces/.archive/<branch>-phase-<N>-<timestamp>.json
   ```

## Warning Handling

### Uncommitted Changes Warning

```
⚠️  WARNING: Uncommitted changes detected in worktree
Branch: <branch-name>
Phase: <phase-name>
Changes:
  <list of modified files>

Options:
1. Commit changes before cleanup
2. Stash changes (creates stash: worktree-<branch>-<phase>)
3. Force remove (LOSE CHANGES)
4. Cancel cleanup
```

### Unpushed Commits Warning

```
⚠️  WARNING: Unpushed commits detected in worktree
Branch: <branch-name>
Phase: <phase-name>
Commits:
  <list of unpushed commits>

Options:
1. Push commits to remote
2. Force remove (LOSE COMMITS)
3. Cancel cleanup
```

## Disk Space Report

After cleanup, show disk space recovered:

```
Cleanup Summary:
- Worktrees removed: 5
- Branches cleaned: 3
- Disk space recovered: ~125 MB
- Metadata archived: 5 files

Remaining worktrees: 2 active
```

## Error Handling

- **Worktree not found**: Show available worktrees
- **Permission denied**: Check directory permissions
- **Locked worktree**: Unlock with `git worktree unlock`
- **Worktree in use**: Cannot remove if it's current directory

## Prune Operation

Always run after cleanup:

```bash
git worktree prune --verbose
```

This removes stale administrative files for deleted worktrees.

## Report Generation

Create cleanup report at `.context/workspaces/.archive/cleanup-<timestamp>.log`:

```
Git Worktree Cleanup Report
Date: 2025-11-14T10:30:00Z
Trigger: manual|stale|branch-merged

Worktrees Removed:
1. feature/user-auth (phase-2-test-creation)
   - Status: Merged to main
   - Created: 2025-11-10T08:00:00Z
   - Archived: 2025-11-14T10:30:00Z

2. feature/payment-gateway (phase-3-implementation)
   - Status: Stale (no activity for 8 days)
   - Created: 2025-11-05T12:00:00Z
   - Archived: 2025-11-14T10:30:00Z

Total Cleanup: 2 worktrees, ~85 MB recovered
```

## Best Practices

1. **Clean up regularly** - Run weekly to avoid accumulation
2. **Review before cleanup** - Always check uncommitted work
3. **Archive metadata** - Keep audit trail
4. **Prune after cleanup** - Clean up git references
5. **Monitor disk usage** - Worktrees can consume significant space
