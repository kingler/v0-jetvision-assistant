# Git Worktree Agent Workspace Isolation

**Status**: Implemented
**Last Updated**: 2025-11-14
**Maintained By**: Development Team

---

## Overview

This document describes the git worktree-based agent workspace isolation system for the Jetvision AI Assistant project. This system provides isolated workspaces for AI agents working on different SDLC phases, ensuring clean separation of contexts and enabling parallel agent execution.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Directory Structure](#directory-structure)
- [SDLC Phase Mapping](#sdlc-phase-mapping)
- [Components](#components)
- [Usage](#usage)
- [Automatic Management](#automatic-management)
- [Manual Operations](#manual-operations)
- [Safety Features](#safety-features)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)
- [Integration](#integration)
- [Metrics and Monitoring](#metrics-and-monitoring)

---

## Architecture

### Core Principles

1. **Agent Isolation**: Each agent works in a dedicated worktree
2. **Phase Separation**: SDLC phases have distinct workspace directories
3. **Linear Sync**: All worktrees track Linear issue IDs
4. **Automatic Lifecycle**: Hooks manage creation/cleanup
5. **Safe Operations**: Multiple safety checks before any destructive action

### Workflow Integration

The worktree system integrates with the existing [git-branch-tree-pr-code-review-workflow](../.claude/commands/git-branch-tree-pr-code-review-workflow.md):

```
User Request
    ↓
Phase 1: Branch Init (Pull Request Agent)
    ↓ [worktree created]
Phase 2: Test Creation (Test Agent)
    ↓ [isolated worktree]
Phase 3: Implementation (Coding Agent)
    ↓ [separate worktree]
Phase 4: Code Review (Code Review Agent)
    ↓ [read-only worktree]
Phase 5-9: Remaining phases
    ↓ [dedicated worktrees]
Merge Complete → All worktrees cleaned up
```

---

## Directory Structure

```
.context/workspaces/
├── phase-1-branch-init/
│   └── <branch-name>/
│       └── WORKSPACE_META.json
├── phase-2-test-creation/
│   └── <branch-name>/
│       └── WORKSPACE_META.json
├── phase-3-implementation/
│   └── <branch-name>/
│       └── WORKSPACE_META.json
├── phase-4-code-review/
│   └── <branch-name>/
│       └── WORKSPACE_META.json
├── phase-5-iteration/
│   └── <branch-name>/
│       └── WORKSPACE_META.json
├── phase-6-pr-creation/
│   └── <branch-name>/
│       └── WORKSPACE_META.json
├── phase-7-pr-review/
│   └── <branch-name>/
│       └── WORKSPACE_META.json
├── phase-8-conflict-resolution/
│   └── <branch-name>/
│       └── WORKSPACE_META.json
├── phase-9-merge/
│   └── <branch-name>/
│       └── WORKSPACE_META.json
├── .archive/
│   └── <archived-metadata>.json
└── README.md
```

### Workspace Metadata Format

Each worktree contains `WORKSPACE_META.json`:

```json
{
  "branch": "feature/user-authentication",
  "linearIssue": "ONEK-93",
  "phase": 2,
  "phaseName": "test-creation",
  "agentRole": "Test Agent",
  "agentType": "qa-engineer-seraph",
  "createdAt": "2025-11-14T10:30:00Z",
  "lastAccessedAt": "2025-11-14T11:45:00Z",
  "status": "active",
  "workflowState": {
    "analyzing": "completed",
    "test_creation": "in_progress"
  }
}
```

---

## SDLC Phase Mapping

| Phase | Name | Agent Role | Workspace Path |
|-------|------|-----------|---------------|
| 1 | branch-init | Pull Request Agent | `phase-1-branch-init/<branch>` |
| 2 | test-creation | Test Agent | `phase-2-test-creation/<branch>` |
| 3 | implementation | Coding Agent | `phase-3-implementation/<branch>` |
| 4 | code-review | Code Review Agent | `phase-4-code-review/<branch>` |
| 5 | iteration | Coding Agent | `phase-5-iteration/<branch>` |
| 6 | pr-creation | Pull Request Agent | `phase-6-pr-creation/<branch>` |
| 7 | pr-review | Code Review Agent | `phase-7-pr-review/<branch>` |
| 8 | conflict-resolution | Conflict Resolution Agent | `phase-8-conflict-resolution/<branch>` |
| 9 | merge | Pull Request Agent | `phase-9-merge/<branch>` |

---

## Components

### 1. Subagent: worktree-manager

**Location**: [.claude/agents/worktree-manager.md](../.claude/agents/worktree-manager.md)

**Purpose**: Manages worktree lifecycle, creation, cleanup, and metadata

**Key Features**:
- Creates phase-specific worktrees
- Syncs with Linear issues
- Tracks worktree status
- Enforces naming conventions
- Handles cleanup safely

**Usage**:
```
Use the worktree-manager subagent to create a worktree for phase 2
```

### 2. Slash Commands

#### /worktree-create

**Location**: [.claude/commands/worktree-create.md](../.claude/commands/worktree-create.md)

**Purpose**: Manually create isolated worktree for specific phase

**Syntax**:
```bash
/worktree-create <phase-number> <branch-name> [linear-issue-id]
```

**Examples**:
```bash
/worktree-create 2 feature/user-auth ONEK-93
/worktree-create 3 feature/payment-gateway ONEK-105
/worktree-create 8 fix/memory-leak ONEK-112
```

#### /worktree-status

**Location**: [.claude/commands/worktree-status.md](../.claude/commands/worktree-status.md)

**Purpose**: Display comprehensive status of all worktrees

**Syntax**:
```bash
/worktree-status
```

**Output**:
- Overview summary (active count, disk usage)
- By-phase breakdown
- Branch status details
- Stale worktree detection
- Health checks
- Recommendations

#### /worktree-cleanup

**Location**: [.claude/commands/worktree-cleanup.md](../.claude/commands/worktree-cleanup.md)

**Purpose**: Clean up completed or stale worktrees

**Syntax**:
```bash
/worktree-cleanup [branch-name]      # Specific branch
/worktree-cleanup --stale            # Stale worktrees (>7 days)
/worktree-cleanup --all              # All completed
```

### 3. Hooks

#### worktree-auto-create.py

**Location**: [.claude/hooks/worktree-auto-create.py](../.claude/hooks/worktree-auto-create.py)

**Hook Event**: `PreToolUse` (Task tool - agent invocation)

**Purpose**: Automatically create worktree when agent is invoked

**Behavior**:
- Detects agent type from Task tool invocation
- Maps agent to SDLC phase
- Creates appropriate worktree
- Generates workspace metadata
- Extracts Linear issue from branch name

#### worktree-auto-cleanup.py

**Location**: [.claude/hooks/worktree-auto-cleanup.py](../.claude/hooks/worktree-auto-cleanup.py)

**Hook Event**: `SubagentStop` (agent task completion)

**Purpose**: Automatically clean up completed phase worktrees

**Behavior**:
- Checks if branch is merged
- Verifies no uncommitted changes
- Archives workspace metadata
- Removes completed worktrees
- Prunes git references

### 4. Skill: git-worktree-isolation

**Location**: [.claude/skills/git-worktree-isolation/SKILL.md](../.claude/skills/git-worktree-isolation/SKILL.md)

**Purpose**: Comprehensive guide to worktree best practices

**Topics Covered**:
- Core concepts
- Quick start commands
- SDLC phase workflow
- Best practices
- Common workflows
- Troubleshooting
- Performance tips
- Advanced usage

---

## Usage

### Initial Setup

Run the initialization script:

```bash
bash scripts/init-worktree-system.sh
```

This creates:
- Workspace directory structure
- .gitignore configuration
- README files
- Initial status report

### Basic Workflow

#### 1. Create Feature Branch

```bash
git checkout -b feature/user-authentication
git push -u origin feature/user-authentication
```

#### 2. Invoke Agent (Automatic Worktree Creation)

```bash
# Invoke Test Agent for phase 2
# Worktree automatically created at:
# .context/workspaces/phase-2-test-creation/feature-user-authentication
```

#### 3. Check Status

```bash
/worktree-status
```

#### 4. Work Continues Through Phases

Each agent invocation creates its own worktree:
- Test Agent → phase-2 worktree
- Coding Agent → phase-3 worktree
- Code Review Agent → phase-4 worktree

#### 5. Automatic Cleanup After Merge

When branch merges to main:
- All worktrees for that branch are cleaned up
- Metadata archived for audit trail

### Manual Operations

#### Create Worktree Manually

```bash
/worktree-create 3 feature/payment-gateway ONEK-105
```

#### Navigate to Worktree

```bash
cd .context/workspaces/phase-3-implementation/feature-payment-gateway
```

#### Check Worktree List

```bash
git worktree list
```

#### Remove Worktree Manually

```bash
/worktree-cleanup feature/payment-gateway
```

---

## Automatic Management

### Hook Integration

#### PreToolUse Hook (Creation)

**Trigger**: Agent invocation via Task tool

**Process**:
1. Detect agent type
2. Map to SDLC phase
3. Check if worktree exists
4. Create worktree if needed
5. Generate metadata
6. Extract Linear issue ID

**Example**:
```
User: Use the qa-engineer-seraph agent to test feature/user-auth
    ↓
PreToolUse hook triggered
    ↓
Agent type: qa-engineer-seraph → Phase 2 (test-creation)
    ↓
Worktree created: .context/workspaces/phase-2-test-creation/feature-user-auth
    ↓
Agent proceeds with work in isolated workspace
```

#### SubagentStop Hook (Cleanup)

**Trigger**: Agent task completion

**Process**:
1. Check if branch merged to main
2. Find all worktrees for branch
3. Verify no uncommitted changes
4. Archive metadata
5. Remove worktrees
6. Prune git references

**Example**:
```
Branch feature/user-auth merged to main
    ↓
SubagentStop hook triggered
    ↓
Found 3 worktrees for feature/user-auth
    ↓
Safety checks passed
    ↓
Metadata archived to .archive/
    ↓
Worktrees removed
    ↓
Git references pruned
```

---

## Safety Features

### Pre-Deletion Checks

Before removing any worktree:

1. ✅ **Uncommitted Changes Check**
   ```bash
   git status --porcelain
   ```
   - Prevents loss of work
   - Shows modified files
   - Offers commit/stash options

2. ✅ **Unpushed Commits Check**
   ```bash
   git log origin/<branch>..HEAD
   ```
   - Prevents loss of commits
   - Shows unpushed work
   - Offers push option

3. ✅ **Branch Merge Status**
   ```bash
   git branch --merged main
   ```
   - Verifies work is preserved
   - Confirms merge completion

4. ✅ **Phase Completion**
   - Checks workflow state
   - Verifies agent finished
   - Confirms handoff occurred

### Metadata Archiving

All workspace metadata preserved in `.context/workspaces/.archive/`:

```json
{
  "branch": "feature/user-auth",
  "linearIssue": "ONEK-93",
  "phase": 2,
  "status": "archived",
  "archivedAt": "2025-11-14T15:30:00Z",
  "reason": "branch-merged"
}
```

### Warning System

Clear warnings for unsafe operations:

```
⚠️  WARNING: Uncommitted changes detected
Branch: feature/user-auth
Phase: implementation
Changes:
  M src/auth/login.ts
  M tests/auth.test.ts

Options:
1. Commit changes
2. Stash changes
3. Force remove (LOSE CHANGES)
4. Cancel
```

---

## Troubleshooting

### Common Issues

#### Issue: Worktree Already Exists

**Symptom**: Cannot create worktree, already exists error

**Solution**:
```bash
# Check existing worktrees
git worktree list

# If stale, force remove
git worktree remove --force .context/workspaces/phase-2-test-creation/feature-auth

# Recreate
/worktree-create 2 feature/auth ONEK-93
```

#### Issue: Permission Denied

**Symptom**: Cannot create/remove worktree due to permissions

**Solution**:
```bash
# Check permissions
ls -la .context/workspaces

# Fix permissions
chmod -R u+w .context/workspaces
```

#### Issue: Locked Worktree

**Symptom**: Cannot remove worktree, "locked" error

**Solution**:
```bash
# Unlock worktree
git worktree unlock .context/workspaces/phase-3-implementation/feature-auth

# Remove
git worktree remove .context/workspaces/phase-3-implementation/feature-auth
```

#### Issue: Uncommitted Changes Warning

**Symptom**: Cleanup blocked by uncommitted work

**Solution**:
```bash
# Option 1: Commit
cd .context/workspaces/phase-3-implementation/feature-auth
git add .
git commit -m "feat: complete phase 3 implementation"
git push

# Option 2: Stash
git stash save "WIP: phase 3 work"

# Then cleanup
cd -
/worktree-cleanup feature/auth
```

### Debug Commands

```bash
# List all worktrees
git worktree list

# Show worktree details
git worktree list --porcelain

# Find stale worktrees
find .context/workspaces -name "WORKSPACE_META.json" -mtime +7

# Check disk usage
du -sh .context/workspaces

# Prune references
git worktree prune --verbose
```

---

## Best Practices

### 1. Always Use Slash Commands

✅ **Good**:
```bash
/worktree-create 3 feature/auth ONEK-93
```

❌ **Avoid**:
```bash
git worktree add .context/workspaces/phase-3-implementation/feature-auth feature/auth
```

**Why**: Slash commands include safety checks, metadata creation, and Linear tracking.

### 2. Clean Up Regularly

```bash
# Weekly cleanup of stale worktrees
/worktree-cleanup --stale

# After merging feature
/worktree-cleanup feature/completed-feature
```

### 3. Check Status Before Work

```bash
/worktree-status
```

### 4. Always Provide Linear Issue ID

```bash
/worktree-create 2 feature/payment ONEK-105
```

### 5. Let Hooks Manage Lifecycle

Don't manually create/remove worktrees unless necessary. Let hooks handle automatic management.

### 6. Monitor Disk Usage

```bash
# Check disk usage regularly
du -sh .context/workspaces

# Clean up if > 500MB
/worktree-cleanup --stale
```

### 7. Archive Before Removing

Always ensure metadata is archived before worktree removal.

---

## Integration

### With Subagents

All custom subagents automatically benefit from worktree isolation:

```bash
# Test Agent
qa-engineer-seraph
→ Worktree: phase-2-test-creation/<branch>

# Coding Agent
backend-developer-tank
→ Worktree: phase-3-implementation/<branch>

# Code Review Agent
code-review-coordinator
→ Worktree: phase-4-code-review/<branch>
```

### With Skills

The [git-worktree-isolation skill](../.claude/skills/git-worktree-isolation/SKILL.md) provides guidance during worktree operations.

### With Linear Workflow

Linear issues are automatically tracked:
- Issue ID extracted from branch name
- Stored in workspace metadata
- Reported in status commands
- Used for audit trail

### With CI/CD

Worktrees don't interfere with CI/CD:
- CI/CD runs on main repository
- Worktrees are in .gitignore
- No impact on remote operations

---

## Metrics and Monitoring

### Key Metrics

Track via `/worktree-status`:

1. **Active Worktrees Count**
   - Total active worktrees
   - Worktrees per phase
   - Worktrees per branch

2. **Disk Usage**
   - Total space used
   - Average worktree size
   - Potential recovery from cleanup

3. **Lifecycle Metrics**
   - Average worktree lifetime
   - Cleanup frequency
   - Stale worktree count

4. **Health Indicators**
   - Uncommitted changes count
   - Unpushed commits count
   - Locked worktrees count

### Status Reports

Generate periodic status reports:

```bash
/worktree-status --export md
```

Exports to: `.context/workspaces/status-<timestamp>.md`

### Audit Trail

All operations logged in:
- `.context/workspaces/.archive/` - Archived metadata
- `.context/workspaces/status-*.txt` - Status snapshots
- Git reflog - Worktree operations

---

## References

- [git-branch-tree-pr-code-review-workflow.md](../.claude/commands/git-branch-tree-pr-code-review-workflow.md) - SDLC workflow
- [git-branch-analysis-clean-up.md](../.claude/commands/git-branch-analysis-clean-up.md) - Branch cleanup
- [worktree-manager.md](../.claude/agents/worktree-manager.md) - Worktree manager agent
- [Git Worktree Documentation](https://git-scm.com/docs/git-worktree) - Official git docs
- [Multi-Agent System Architecture](../architecture/MULTI_AGENT_SYSTEM.md) - Overall system

---

**Maintainers**: Development Team
**Last Review**: 2025-11-14
**Next Review**: 2025-12-14
