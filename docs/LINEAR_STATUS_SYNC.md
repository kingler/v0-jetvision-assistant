# Linear Status Synchronization for Race Condition Prevention

**Purpose**: Prevent race conditions when multiple agents or developers work on the same Linear issue
**Status**: Core Requirement
**Date**: 2025-11-02

---

## Problem

When an agent begins working on a Linear issue, there's a risk that:
- Another agent might start working on the same issue simultaneously
- A human developer might start working on it
- This creates duplicate or conflicting work

## Solution

**Simple Status Claiming**: Before doing ANY work on a Linear issue, atomically update the issue status to prevent conflicts.

---

## Status Check Condition

**Before starting work**, check if the issue is available:

```typescript
// Fetch current issue state
const issue = await mcp__linear__get_issue({ id: issueId });

// CHECK: Is another agent already working on it?
if (issue.state.name === 'In Progress') {
  console.log('⚠️ Issue already in progress - skipping to avoid conflict');
  return; // DO NOT WORK ON THIS ISSUE
}

// CHECK: Is the issue in a workable state?
const WORKABLE_STATES = ['Backlog', 'Todo', 'Ready'];
if (!WORKABLE_STATES.includes(issue.state.name)) {
  console.log('⚠️ Issue not in workable state - skipping');
  return;
}

// Issue is available - safe to claim
```

---

## Implementation Pattern

When starting work on a Linear issue:

```typescript
// STEP 0: Check if issue is available
const issue = await mcp__linear__get_issue({ id: issueId });
if (issue.state.name === 'In Progress') {
  throw new Error('Issue already being worked on by another agent');
}

// STEP 1: Claim the issue FIRST (before any work)
try {
  await mcp__linear__update_issue({
    id: issueId,
    state: 'In Progress',
  });
} catch (error) {
  // If claim fails, DO NOT proceed
  throw new Error('Cannot claim issue - may be in use');
}

// STEP 2: Add visibility comment
await mcp__linear__create_comment({
  issueId: issueId,
  body: '🤖 Automated agent execution started\n\n⚠️ Please do not make manual changes to avoid conflicts.',
});

// STEP 3: Add label for visibility (optional)
await mcp__linear__update_issue({
  id: issueId,
  labels: [...existingLabels, 'agent-in-progress'],
});

// NOW you can safely proceed with work
// ... do the actual work ...
```

---

## Key Principles

### 1. Atomic Status Update
- Update status to "In Progress" as the **FIRST** operation
- If the update fails, **DO NOT** proceed with work
- Fail-fast is better than creating conflicts

### 2. Clear Communication
- Add a comment indicating automated work has started
- Add a label for visual indication
- Warn against manual changes

### 3. Status Cleanup
On completion:
```typescript
await mcp__linear__update_issue({
  id: issueId,
  state: 'Done',
  labels: existingLabels.filter(l => l !== 'agent-in-progress'),
});
```

On error:
```typescript
await mcp__linear__update_issue({
  id: issueId,
  state: 'Backlog', // Revert for retry
  labels: [...existingLabels.filter(l => l !== 'agent-in-progress'), 'agent-failed'],
});
```

---

## Required Linear Labels

Create these labels in Linear (one-time setup):

| Label | Color | Description |
|-------|-------|-------------|
| `agent-in-progress` | `#FF6B6B` (Red) | Agent is actively working |
| `agent-failed` | `#FFA94D` (Orange) | Automated execution failed |

---

## Linear MCP Integration

Required MCP tools:

### Get Issue
```typescript
const issue = await mcp__linear__get_issue({ id: 'ONEK-84' });
```

### Update Issue Status
```typescript
await mcp__linear__update_issue({
  id: issueId,
  state: 'In Progress',
  labels: [...existingLabels, 'agent-in-progress'],
});
```

### Create Comment
```typescript
await mcp__linear__create_comment({
  issueId: issueId,
  body: commentText,
});
```

---

## Complete Usage Example

```typescript
async function executeLinearIssue(issueId: string) {
  // STEP 0: Check if issue is available
  const issue = await mcp__linear__get_issue({ id: issueId });

  // Prevent race condition: Check if already in progress
  if (issue.state.name === 'In Progress') {
    console.log('⚠️ Issue already being worked on - aborting');
    return { success: false, reason: 'already_in_progress' };
  }

  // Check if issue is in a workable state
  const WORKABLE_STATES = ['Backlog', 'Todo', 'Ready'];
  if (!WORKABLE_STATES.includes(issue.state.name)) {
    console.log(`⚠️ Issue state "${issue.state.name}" not workable - aborting`);
    return { success: false, reason: 'invalid_state' };
  }

  // STEP 1: Atomically claim the issue
  try {
    await mcp__linear__update_issue({
      id: issueId,
      state: 'In Progress',
    });

    await mcp__linear__create_comment({
      issueId,
      body: '🤖 Automated agent execution started\n\n⚠️ Please do not make manual changes.',
    });
  } catch (error) {
    console.error('❌ Failed to claim issue:', error);
    return { success: false, reason: 'claim_failed' }; // DO NOT PROCEED
  }

  // STEP 2: Safe to do work now
  try {
    await doTheActualWork();

    // STEP 3: Update on success
    await mcp__linear__update_issue({
      id: issueId,
      state: 'Done',
    });

    await mcp__linear__create_comment({
      issueId,
      body: '✅ Automated execution completed successfully',
    });

    return { success: true };
  } catch (error) {
    // STEP 3: Update on failure
    await mcp__linear__update_issue({
      id: issueId,
      state: 'Backlog', // Revert for retry
    });

    await mcp__linear__create_comment({
      issueId,
      body: `❌ Automated execution failed\n\nError: ${error.message}`,
    });

    return { success: false, reason: 'execution_failed', error };
  }
}
```

---

## Summary

This is a **lightweight status synchronization mechanism**, not a complex orchestration system.

**Core Requirement**:
1. ✅ **Check status first** - verify issue is not already "In Progress"
2. ✅ Update status to "In Progress" atomically (FIRST operation after check)
3. ✅ Add comment indicating automated work
4. ✅ Add label for visibility (optional)
5. ✅ Fail-fast if claim fails
6. ✅ Clean up status on completion/failure

---

## Quick Reference: Status Conditions

### Before Starting Work

**DO NOT WORK** if issue status is:
- ❌ `In Progress` - Another agent is working on it
- ❌ `Done` - Already completed
- ❌ `Canceled` - Issue was canceled

**SAFE TO WORK** if issue status is:
- ✅ `Backlog` - Available for work
- ✅ `Todo` - Ready to start
- ✅ `Ready` - Prepared for execution

### Status Transitions

```
Backlog/Todo/Ready → In Progress (agent claims)
In Progress → Done (work successful)
In Progress → Backlog (work failed, allow retry)
```

**Keep it simple.**

---

**Created**: 2025-11-02
**Purpose**: Race condition prevention via atomic status claiming
