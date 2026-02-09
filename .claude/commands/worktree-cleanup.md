---
allowed-tools: Bash(git worktree:*), Bash(rm:*), Bash(find:*), Bash(du:*), Read, Write
description: Clean up completed or stale git worktree workspaces
argument-hint: [issue-id|--all|--stale]
---

# Clean Up Git Worktree Workspaces

Remove completed, merged, or stale git worktree workspaces safely.

## Workspace Root

`/Users/kinglerbercy/.claude/git-workspace/`

## Usage

```
/worktree-cleanup [issue-id]          # Clean up specific issue workspace
/worktree-cleanup --all               # Clean up all completed workspaces
/worktree-cleanup --stale             # Clean up stale workspaces (>7 days)
```

**Examples:**
```
/worktree-cleanup onek-123
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
!`find /Users/kinglerbercy/.claude/git-workspace -name "WORKSPACE_META.json" -type f 2>/dev/null | head -20`
```

## Task

### For Specific Issue Cleanup

1. **Find workspace** at `/Users/kinglerbercy/.claude/git-workspace/<issue-id>`
2. **Read WORKSPACE_META.json** for branch and PR info
3. **Check workspace status**:
   - Any uncommitted changes?
   - Any unpushed commits?
   - Is the PR merged?
   - Is the Linear issue closed?
4. **Safety confirmation**:
   - Show what will be deleted
   - Confirm with user if uncommitted work exists
5. **Archive metadata**:
   - Update status to "archived"
   - Add `archivedAt` timestamp
   - Move to `/Users/kinglerbercy/.claude/git-workspace/.archive/`
6. **Remove worktree**:
   ```bash
   git worktree remove /Users/kinglerbercy/.claude/git-workspace/<issue-id>
   ```
7. **Prune git references**:
   ```bash
   git worktree prune
   ```

### For --stale Cleanup

1. **Find stale workspaces** (no activity >7 days):
   ```bash
   find /Users/kinglerbercy/.claude/git-workspace -name "WORKSPACE_META.json" -mtime +7
   ```
2. **Parse metadata** to check last access time
3. **Verify branch status**: Is branch merged? Is branch deleted? Any uncommitted work?
4. **Show stale workspaces** with details
5. **Confirm before cleanup**
6. **Archive and remove** each stale workspace

### For --all Cleanup

1. **List all workspaces**
2. **Check merge status** for each branch
3. **Identify completed issues**: Branch merged, PR closed, no uncommitted changes
4. **Show cleanup plan**
5. **Confirm before proceeding**
6. **Archive and remove** all eligible workspaces

## Safety Checks

Before removing ANY workspace:

1. **Check for uncommitted changes**:
   ```bash
   git -C /Users/kinglerbercy/.claude/git-workspace/<issue-id> status --porcelain
   ```

2. **Check for unpushed commits**:
   ```bash
   git -C /Users/kinglerbercy/.claude/git-workspace/<issue-id> log origin/<branch>..HEAD --oneline
   ```

3. **Verify not current directory**: Must be outside worktree to remove it

4. **Check branch merge status**:
   ```bash
   git branch --merged main | grep <branch>
   ```

## Archiving Process

Before removal, archive workspace metadata:

1. **Create archive directory**:
   ```bash
   mkdir -p /Users/kinglerbercy/.claude/git-workspace/.archive
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
   cp /Users/kinglerbercy/.claude/git-workspace/<issue-id>/WORKSPACE_META.json \
      /Users/kinglerbercy/.claude/git-workspace/.archive/<issue-id>-<timestamp>.json
   ```

## Warning Handling

### Uncommitted Changes Warning

```
WARNING: Uncommitted changes detected in workspace
Issue: <ONEK-123>
Branch: <branch-name>
Changes:
  <list of modified files>

Options:
1. Commit changes before cleanup
2. Stash changes
3. Force remove (LOSE CHANGES)
4. Cancel cleanup
```

### Unpushed Commits Warning

```
WARNING: Unpushed commits detected in workspace
Issue: <ONEK-123>
Branch: <branch-name>
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
- Workspaces removed: <count>
- Disk space recovered: ~<size>
- Metadata archived: <count> files

Remaining workspaces: <count> active
```

## Prune Operation

Always run after cleanup:

```bash
git worktree prune --verbose
```

## Best Practices

1. **Clean up regularly** - Run weekly to avoid accumulation
2. **Review before cleanup** - Always check uncommitted work
3. **Archive metadata** - Keep audit trail
4. **Prune after cleanup** - Clean up git references
5. **Monitor disk usage** - Worktrees can consume significant space
