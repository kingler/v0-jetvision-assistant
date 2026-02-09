---
name: git-worktree-isolation
description: Git worktree best practices for agent workspace isolation. Use when working with multiple agents, managing feature branches, or coordinating development phases. Workspaces are mapped to Linear Issues, Git Branches, and PRs.
---

# Git Worktree Isolation Skill

Master git worktree usage for isolated agent workspaces mapped to Linear issues.

## When to Use This Skill

- Starting new feature development for a Linear issue
- Coordinating work between multiple Claude Code instances
- Managing parallel work on different branches
- Isolating agent contexts to prevent interference
- Syncing feature work with Linear issues and PRs

## Core Concepts

### What are Git Worktrees?

Git worktrees allow multiple working directories from a single repository:
- Each worktree is a separate checkout of a specific branch
- All worktrees share the same `.git` directory (refs, objects, config)
- Changes in one worktree don't affect others
- Perfect for agent isolation and parallel workflows

### Workspace-to-Issue Mapping

Every workspace maintains a **1:1:1 mapping**:

| Field | Source | Example |
|-------|--------|---------|
| **Directory** | Linear issue ID (lowercase) | `onek-207` |
| **Linear Issue** | ONEK project tracker | `ONEK-207` |
| **Git Branch** | Feature/fix branch | `feat/onek-207-contract-card` |
| **Pull Request** | GitHub PR | `#103` |

## Directory Structure

```
/Users/kinglerbercy/.claude/git-workspace/
├── onek-123/                    # Linear: ONEK-123
│   └── WORKSPACE_META.json      # Metadata with issue, branch, PR
├── onek-144/                    # Linear: ONEK-144
│   └── WORKSPACE_META.json
├── onek-207/                    # Linear: ONEK-207
│   └── WORKSPACE_META.json
└── .archive/                    # Archived workspace metadata
    └── onek-99-feat-onek-99-auth-20251114.json
```

## Quick Start Commands

### Create Worktree for a Linear Issue

```bash
# Slash command (recommended)
/worktree-create feat/ONEK-123-user-auth ONEK-123

# Manual command
git worktree add /Users/kinglerbercy/.claude/git-workspace/onek-123 feat/onek-123-user-auth
```

### List All Worktrees

```bash
git worktree list

# Or use status command
/worktree-status
```

### Navigate to Worktree

```bash
cd /Users/kinglerbercy/.claude/git-workspace/onek-123
```

### Remove Worktree

```bash
# Slash command (recommended - includes safety checks)
/worktree-cleanup onek-123

# Manual command (must be outside worktree)
git worktree remove /Users/kinglerbercy/.claude/git-workspace/onek-123
```

## Workspace Lifecycle

### Auto-Creation (PreToolUse hook)

- Triggered when agents are invoked for Linear issues
- Creates isolated worktree at `/Users/kinglerbercy/.claude/git-workspace/<issue-id>`
- Generates `WORKSPACE_META.json` with Linear issue, branch, and PR mapping

### Auto-Cleanup (SubagentStop hook)

Worktrees are only cleaned up when ALL 5 conditions are met:

1. All TDD tests pass (`npm run test:unit` exits 0)
2. PR is created (`gh pr list --head <branch>` returns PR)
3. Code review is completed (PR has `reviewDecision: APPROVED`)
4. Linear issue is updated (status = Done/Closed)
5. Branch is merged into main (`git branch --merged main`)

Plus 2 safety checks:
- No uncommitted changes
- No unpushed commits

## Best Practices

### 1. Always Use Slash Commands

Prefer `/worktree-create` over manual git commands:
- Automatic safety checks
- Metadata creation with Linear/Branch/PR mapping
- Consistent naming

### 2. Clean Up Regularly

Don't accumulate stale worktrees:

```bash
# Weekly cleanup
/worktree-cleanup --stale

# After merge
/worktree-cleanup onek-123
```

### 3. Check Status Before Work

Always check worktree status:

```bash
/worktree-status
```

### 4. Always Provide Linear Issue ID

Every workspace must map to a Linear issue:

```bash
/worktree-create feat/onek-105-payment-gateway ONEK-105
```

### 5. Let Hooks Manage Lifecycle

Hooks automatically:
- Create worktrees when agents invoked
- Clean up after phase completion
- Archive metadata for audit trail

## Common Workflows

### Starting New Feature

```bash
# 1. Create feature branch and worktree
/worktree-create feat/ONEK-200-new-feature ONEK-200

# 2. Navigate to isolated workspace
cd /Users/kinglerbercy/.claude/git-workspace/onek-200

# 3. Launch Claude Code instance in the worktree
# Agent works in complete isolation

# 4. Check status
/worktree-status
```

### Parallel Feature Development

```bash
# Multiple isolated workspaces, each with its own Claude Code instance

/Users/kinglerbercy/.claude/git-workspace/
├── onek-200/    # Agent A: feat/onek-200-payment
├── onek-201/    # Agent B: feat/onek-201-profile
└── onek-202/    # Agent C: fix/onek-202-validation
```

## Safety Features

### Automatic Checks

Before worktree removal:
1. Check for uncommitted changes
2. Check for unpushed commits
3. Verify branch merge status
4. Confirm Linear issue is closed

### Metadata Tracking

Each worktree has `WORKSPACE_META.json`:
```json
{
  "linearIssue": "ONEK-123",
  "branch": "feat/onek-123-user-auth",
  "pullRequest": "#45",
  "prUrl": "https://github.com/kingler/v0-jetvision-assistant/pull/45",
  "workspaceDir": "/Users/kinglerbercy/.claude/git-workspace/onek-123",
  "agentRole": "Coding Agent",
  "agentType": "backend-developer",
  "createdAt": "2025-11-14T10:30:00Z",
  "lastAccessedAt": "2025-11-14T12:45:00Z",
  "status": "active"
}
```

### Archive System

Metadata preserved in `/Users/kinglerbercy/.claude/git-workspace/.archive/` for:
- Audit trail
- Troubleshooting
- Metrics tracking

## Troubleshooting

### Worktree Already Exists

```bash
# Check existing worktrees
git worktree list

# Force remove if stale
git worktree remove --force /Users/kinglerbercy/.claude/git-workspace/onek-123

# Recreate
/worktree-create feat/onek-123-auth ONEK-123
```

### Permission Denied

```bash
# Check directory permissions
ls -la /Users/kinglerbercy/.claude/git-workspace

# Fix permissions
chmod -R u+w /Users/kinglerbercy/.claude/git-workspace
```

### Locked Worktree

```bash
# Unlock worktree
git worktree unlock /Users/kinglerbercy/.claude/git-workspace/onek-123

# Then remove
git worktree remove /Users/kinglerbercy/.claude/git-workspace/onek-123
```

### Uncommitted Changes Warning

```bash
# Commit changes
cd /Users/kinglerbercy/.claude/git-workspace/onek-123
git add .
git commit -m "feat(ONEK-123): implement user authentication"

# Or stash
git stash save "WIP: ONEK-123 work"

# Then cleanup
cd -
/worktree-cleanup onek-123
```

## Performance Tips

### Disk Space Management

```bash
# Check worktree disk usage
du -sh /Users/kinglerbercy/.claude/git-workspace

# Clean up stale worktrees
/worktree-cleanup --stale

# Prune git references
git worktree prune
```

### Parallel Agent Execution

Multiple Claude Code instances can work simultaneously, each in its own worktree:
- Instance A in `onek-200` on `feat/onek-200-payment`
- Instance B in `onek-201` on `feat/onek-201-profile`
- Instance C in `onek-202` on `fix/onek-202-validation`

All share the same git object store — no duplication.

## Integration with Other Tools

### With Hooks

Hooks manage lifecycle automatically:
- **PreToolUse**: Creates worktree before agent starts
- **SubagentStop**: Cleans up after agent completes

### With Slash Commands

Commands provide manual control:
- `/worktree-create` - Manual creation
- `/worktree-status` - View all worktrees
- `/worktree-cleanup` - Manual cleanup

### With Linear

Every workspace is synced to a Linear issue. The `WORKSPACE_META.json` tracks the issue ID, branch, and PR for full traceability.

## References

- [worktree-manager.md](.claude/agents/worktree-manager.md) - Worktree manager agent
- [Git Worktree Documentation](https://git-scm.com/docs/git-worktree) - Official git docs
