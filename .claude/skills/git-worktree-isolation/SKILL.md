---
name: git-worktree-isolation
description: Git worktree best practices for agent workspace isolation in SDLC workflows. Use when working with multiple agents, managing feature branches, or coordinating TDD phases.
---

# Git Worktree Isolation Skill

Master git worktree usage for isolated agent workspaces in test-driven development workflows.

## When to Use This Skill

- Starting new feature development with multiple SDLC phases
- Coordinating work between Test Agent, Coding Agent, and Code Review Agent
- Managing parallel work on different branches
- Isolating agent contexts to prevent interference
- Syncing feature work with Linear issues

## Core Concepts

### What are Git Worktrees?

Git worktrees allow multiple working directories from a single repository:
- Each worktree is a separate checkout of a specific branch
- All worktrees share the same `.git` directory (refs, objects, config)
- Changes in one worktree don't affect others
- Perfect for agent isolation and parallel workflows

### Why Agent Workspace Isolation?

1. **Context Separation**: Each agent works in clean environment
2. **Parallel Execution**: Multiple agents can work simultaneously
3. **Phase Tracking**: Clear mapping of SDLC phases to workspaces
4. **Linear Sync**: Easy tracking of issue progress across phases
5. **Safe Experimentation**: Isolated environments for testing

## Directory Structure

```
.context/workspaces/
├── phase-1-branch-init/
│   └── feature-user-auth/          # Pull Request Agent
├── phase-2-test-creation/
│   └── feature-user-auth/          # Test Agent
│       └── WORKSPACE_META.json
├── phase-3-implementation/
│   └── feature-user-auth/          # Coding Agent
│       └── WORKSPACE_META.json
├── phase-4-code-review/
│   └── feature-user-auth/          # Code Review Agent
│       └── WORKSPACE_META.json
└── .archive/                       # Archived metadata
    └── feature-user-auth-phase-2-20251114.json
```

## Quick Start Commands

### Create Worktree for Phase

```bash
# Slash command (recommended)
/worktree-create 2 feature/user-auth ONEK-93

# Manual command
git worktree add .context/workspaces/phase-2-test-creation/feature-user-auth feature/user-auth
```

### List All Worktrees

```bash
git worktree list

# Or use status command
/worktree-status
```

### Navigate to Worktree

```bash
cd .context/workspaces/phase-2-test-creation/feature-user-auth
```

### Remove Worktree

```bash
# Slash command (recommended - includes safety checks)
/worktree-cleanup feature/user-auth

# Manual command (must be outside worktree)
git worktree remove .context/workspaces/phase-2-test-creation/feature-user-auth
```

## SDLC Phase Workflow

### Phase 1: Branch Initialization (Pull Request Agent)

```bash
# Create feature branch
git checkout -b feature/user-authentication

# Push to remote
git push -u origin feature/user-authentication

# Worktree auto-created by hook when agent invoked
```

### Phase 2: Test Creation (Test Agent)

```bash
# Test Agent works in isolated worktree
# Location: .context/workspaces/phase-2-test-creation/feature-user-authentication

# Agent writes tests
# Commits tests to branch
# Worktree auto-cleaned after test completion
```

### Phase 3: Implementation (Coding Agent)

```bash
# Coding Agent works in separate worktree
# Location: .context/workspaces/phase-3-implementation/feature-user-authentication

# Agent implements features
# Makes tests pass
# Commits implementation
```

### Phase 4: Code Review (Code Review Agent)

```bash
# Code Review Agent uses read-only worktree
# Location: .context/workspaces/phase-4-code-review/feature-user-authentication

# Agent reviews code
# Provides feedback
# No modifications allowed (safety)
```

### Phase 5-9: Remaining Phases

Each phase follows similar pattern with dedicated worktrees.

## Best Practices

### 1. Always Use Slash Commands

Prefer `/worktree-create` over manual git commands:
- Automatic safety checks
- Metadata creation
- Linear issue tracking
- Consistent naming

### 2. Clean Up Regularly

Don't accumulate stale worktrees:

```bash
# Weekly cleanup
/worktree-cleanup --stale

# After merge
/worktree-cleanup feature/completed-feature
```

### 3. Check Status Before Work

Always check worktree status:

```bash
/worktree-status
```

### 4. Sync with Linear

Always provide Linear issue ID:

```bash
/worktree-create 3 feature/payment-gateway ONEK-105
```

### 5. Let Hooks Manage Lifecycle

Hooks automatically:
- Create worktrees when agents invoked
- Clean up after phase completion
- Archive metadata for audit trail

## Common Workflows

### Starting New Feature

```bash
# 1. Create feature branch
git checkout -b feature/user-authentication

# 2. Invoke Test Agent (worktree auto-created)
# Use the test-runner subagent...

# 3. Invoke Coding Agent (separate worktree auto-created)
# Use the backend-developer subagent...

# 4. Check status
/worktree-status
```

### Parallel Feature Development

```bash
# Work on multiple features simultaneously
# Each feature has independent worktrees per phase

Feature A: feature/payment-gateway
├── Phase 2 worktree (Test Agent)
└── Phase 3 worktree (Coding Agent)

Feature B: feature/user-profile
├── Phase 2 worktree (Test Agent)
└── Phase 3 worktree (Coding Agent)
```

### Handling Conflicts

```bash
# Conflict Resolution Agent gets dedicated worktree
# Location: .context/workspaces/phase-8-conflict-resolution/feature-name

# Agent resolves conflicts
# Tests in isolation
# Commits resolution
```

## Safety Features

### Automatic Checks

Before worktree removal:
1. ✅ Check for uncommitted changes
2. ✅ Check for unpushed commits
3. ✅ Verify branch merge status
4. ✅ Confirm phase completion

### Metadata Tracking

Each worktree has `WORKSPACE_META.json`:
```json
{
  "branch": "feature/user-auth",
  "linearIssue": "ONEK-93",
  "phase": 2,
  "phaseName": "test-creation",
  "agentRole": "Test Agent",
  "createdAt": "2025-11-14T10:30:00Z",
  "status": "active"
}
```

### Archive System

Metadata preserved in `.context/workspaces/.archive/` for:
- Audit trail
- Troubleshooting
- Metrics tracking

## Troubleshooting

### Worktree Already Exists

```bash
# Check existing worktrees
git worktree list

# Force remove if stale
git worktree remove --force .context/workspaces/phase-2-test-creation/feature-auth

# Recreate
/worktree-create 2 feature/auth ONEK-93
```

### Permission Denied

```bash
# Check directory permissions
ls -la .context/workspaces

# Fix permissions
chmod -R u+w .context/workspaces
```

### Locked Worktree

```bash
# Unlock worktree
git worktree unlock .context/workspaces/phase-3-implementation/feature-auth

# Then remove
git worktree remove .context/workspaces/phase-3-implementation/feature-auth
```

### Uncommitted Changes Warning

```bash
# Commit changes
cd .context/workspaces/phase-3-implementation/feature-auth
git add .
git commit -m "feat: implement user authentication"

# Or stash
git stash save "WIP: phase 3 work"

# Then cleanup
cd -
/worktree-cleanup feature/auth
```

## Performance Tips

### Disk Space Management

```bash
# Check worktree disk usage
du -sh .context/workspaces

# Clean up stale worktrees
/worktree-cleanup --stale

# Prune git references
git worktree prune
```

### Parallel Agent Execution

Multiple agents can work simultaneously:
- Test Agent in phase-2 worktree
- Coding Agent in phase-3 worktree
- Code Review Agent in phase-4 worktree

All on the same branch without conflicts!

## Integration with Existing Tools

### With Subagents

Subagents automatically get isolated worktrees:
```bash
# Invoke qa-engineer-seraph
# → Worktree created at phase-2-test-creation/<branch>

# Invoke backend-developer-tank
# → Worktree created at phase-3-implementation/<branch>
```

### With Hooks

Hooks manage lifecycle automatically:
- **PreToolUse**: Creates worktree before agent starts
- **SubagentStop**: Cleans up after agent completes

### With Slash Commands

Commands provide manual control:
- `/worktree-create` - Manual creation
- `/worktree-status` - View all worktrees
- `/worktree-cleanup` - Manual cleanup

## Advanced Usage

### Custom Phase Mapping

Modify `.claude/agents/worktree-manager.md` to add custom phases.

### Worktree for Experiments

```bash
# Create experimental worktree
git worktree add .context/workspaces/experiments/feature-auth-v2 feature/auth

# Test experimental changes
cd .context/workspaces/experiments/feature-auth-v2
# ... make changes ...

# If successful, merge back
# If failed, simply remove worktree
```

### Shared Worktrees (Team Collaboration)

Each team member can have their own worktrees:
```bash
.context/workspaces/
├── alice-phase-3-implementation/feature-auth
└── bob-phase-4-code-review/feature-auth
```

## Metrics and Monitoring

Track worktree usage:
- Number of active worktrees
- Disk space used
- Average worktree lifetime
- Stale worktree count
- Cleanup frequency

View with `/worktree-status` command.

## References

- [git-branch-tree-pr-code-review-workflow.md](.claude/commands/git-branch-tree-pr-code-review-workflow.md) - SDLC workflow
- [worktree-manager.md](.claude/agents/worktree-manager.md) - Worktree manager agent
- [Git Worktree Documentation](https://git-scm.com/docs/git-worktree) - Official git docs
