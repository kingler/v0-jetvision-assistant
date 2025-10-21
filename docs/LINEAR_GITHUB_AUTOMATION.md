# Linear-GitHub Automation System
## Automated Task Status Updates and PR Synchronization

**Version**: 1.0
**Created**: October 21, 2025
**Status**: ✅ Implemented

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Task-PR-Feature Mapping](#task-pr-feature-mapping)
4. [Automated Status Updates](#automated-status-updates)
5. [GitHub Actions Integration](#github-actions-integration)
6. [Usage Guide](#usage-guide)
7. [Error Handling](#error-handling)
8. [Configuration](#configuration)
9. [API Reference](#api-reference)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Linear-GitHub Automation System provides automated synchronization between GitHub pull requests and Linear issues, ensuring that task status is always up-to-date without manual intervention.

### Key Features

- ✅ **Automatic task-PR-feature relationship identification**
- ✅ **Real-time Linear status updates based on PR lifecycle**
- ✅ **Smart ID extraction from branch names, PR titles, and descriptions**
- ✅ **GitHub Actions integration for hands-free operation**
- ✅ **Comprehensive error handling and logging**
- ✅ **Validation and conflict resolution**

### Benefits

1. **Eliminates Manual Updates**: No more manual Linear status changes
2. **Improved Visibility**: Always know the current status of tasks
3. **Better Coordination**: Teams stay in sync automatically
4. **Audit Trail**: Complete history of all status changes
5. **Time Savings**: Reduces administrative overhead

---

## System Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌────────────────┐
│   GitHub PR     │────────▶│  Linear-GitHub   │────────▶│  Linear Issue  │
│   (Lifecycle)   │         │  Automation      │         │  (Status)      │
└─────────────────┘         └──────────────────┘         └────────────────┘
        │                            │                           │
        │                            │                           │
        ▼                            ▼                           ▼
  Branch Name               Mapping Extractor            State Transition
  PR Title/Desc             Sync Service                 Comment Creation
  Commit Messages           GitHub Actions               History Tracking
```

### Components

1. **Mapping Extractor** (`lib/linear/mapping-extractor.ts`)
   - Extracts task/issue IDs from text
   - Parses branch names, PR titles, commit messages
   - Creates and validates task-PR mappings

2. **Sync Service** (`lib/linear/sync-service.ts`)
   - Manages synchronization logic
   - Maps PR states to Linear states
   - Handles API calls and retries

3. **GitHub Actions Workflow** (`.github/workflows/linear-sync.yml`)
   - Triggered on PR events
   - Automatically updates Linear
   - Adds sync status comments

4. **Type Definitions** (`lib/linear/types.ts`)
   - Comprehensive type safety
   - Clear data structures
   - Configuration interfaces

---

## Task-PR-Feature Mapping

### How Mapping Works

The system identifies relationships by extracting IDs from three sources:

#### 1. Branch Naming Convention

```bash
# Format: <type>/<TASK-ID or LINEAR-ID>-<description>

✅ feat/TASK-001-clerk-authentication
✅ fix/TASK-000-typescript-errors
✅ feat/DES-78-clerk-integration
✅ docs/workflow-system
```

**Extraction Logic**:
- **Task ID Pattern**: `TASK-\d{3}` (e.g., TASK-001, TASK-123)
- **Linear ID Pattern**: `DES-\d+` (e.g., DES-73, DES-109)
- **Type**: First segment before `/` (feat, fix, docs, etc.)

#### 2. PR Title Convention

```bash
# Format: <type>: <description> (TASK-ID or LINEAR-ID)

✅ "feat: Implement Clerk Authentication (TASK-001)"
✅ "fix: TypeScript compilation errors - DES-73"
✅ "docs: Add Linear sync documentation"
```

**Extraction Logic**:
- **Conventional Commits** format supported
- IDs extracted from anywhere in title
- Fallback to description if not in title

#### 3. PR Description/Body

```markdown
## Summary
Implements Clerk authentication integration

## Related Issues
- Linear: DES-78
- Task: TASK-001
- Closes #42
```

**Extraction Logic**:
- Searches for Linear ID pattern
- Searches for Task ID pattern
- Searches for PR references

### Mapping Priority

When multiple sources contain IDs, priority is:

1. **Branch Name** (highest priority)
2. **PR Title**
3. **PR Description** (lowest priority)

### Validation

```typescript
// Example validation
const mapping = createMappingFromPR(pr);
const validation = validateMapping(mapping);

if (!validation.valid) {
  console.log('Missing fields:', validation.missingFields);
  console.log('Warnings:', validation.warnings);
}
```

**Validation Rules**:
- ✅ Must have at least one ID (Task ID or Linear ID)
- ✅ Must have branch name
- ⚠️ Warning if no Linear ID (cannot sync to Linear)
- ⚠️ Warning if no Task ID (cannot link to local file)

---

## Automated Status Updates

### PR Lifecycle → Linear State Mapping

| PR Event | PR State | Linear State | Comment |
|----------|----------|--------------|---------|
| **Created (Draft)** | `draft` | `In Progress` | 🔄 PR created |
| **Ready for Review** | `open` | `In Review` | 👀 PR ready for review |
| **Approved** | `approved` | `In Review` | ✅ PR approved |
| **Merged** | `merged` | `Done` | 🎉 PR merged |
| **Closed** | `closed` | `Canceled` | ❌ PR closed |

### State Transition Flow

```
Backlog → Todo → In Progress → In Review → Done
                      ↑              ↑         ↑
                   (Draft)      (Open)    (Merged)
                      ↓              ↓         ↓
                   DES-73        DES-73    DES-73
```

### Automatic Comments

When a PR status changes, a comment is automatically added to the Linear issue:

**Example Comments**:

```markdown
🔄 PR created: [#42](https://github.com/user/repo/pull/42)
Branch: `feat/TASK-001-clerk-auth`

👀 PR ready for review: [#42](https://github.com/user/repo/pull/42)

✅ PR approved: [#42](https://github.com/user/repo/pull/42)
Ready to merge

🎉 PR merged: [#42](https://github.com/user/repo/pull/42)
Task completed
```

---

## GitHub Actions Integration

### Trigger Events

The workflow (`.github/workflows/linear-sync.yml`) triggers on:

```yaml
on:
  pull_request:
    types:
      - opened           # PR created
      - ready_for_review # Converted from draft
      - closed           # Merged or closed
  pull_request_review:
    types:
      - submitted        # Review approved/requested changes
```

### Workflow Steps

1. **Extract IDs**: Parse branch, title, description for task/issue IDs
2. **Determine State**: Map PR event to Linear state
3. **Update Linear**: Call Linear API or MCP tool
4. **Add Comment**: Post sync status to PR
5. **Handle Errors**: Log failures and notify

### Permissions Required

```yaml
permissions:
  contents: read         # Read repository code
  pull-requests: read    # Read PR details
```

### Environment Variables

Required in repository secrets:

```bash
LINEAR_API_KEY=lin_api_...    # Linear API key
GITHUB_TOKEN=ghp_...           # Auto-provided by GitHub Actions
```

---

## Usage Guide

### For Developers

#### 1. Create Feature Branch

```bash
# Include task ID or Linear ID in branch name
git checkout -b feat/TASK-001-clerk-authentication

# or
git checkout -b feat/DES-78-clerk-integration
```

#### 2. Create Pull Request

```bash
# Include ID in title
gh pr create \
  --title "feat: Implement Clerk Authentication (TASK-001)" \
  --body "Implements authentication using Clerk\n\nRelated: DES-78"

# or use GitHub web interface
```

#### 3. Automatic Sync

- ✅ **Draft created**: Linear moves to "In Progress"
- ✅ **Ready for review**: Linear moves to "In Review"
- ✅ **Approved**: Comment added to Linear
- ✅ **Merged**: Linear moves to "Done"

### For Project Managers

#### 1. Monitor Status

- Linear issues automatically reflect PR status
- Check Linear board for real-time progress
- Comments contain PR links and details

#### 2. Review Sync History

```typescript
import { getLinearSyncService } from '@/lib/linear';

const service = getLinearSyncService();
const history = service.getSyncHistory('DES-78');

console.log('Sync history:', history);
```

#### 3. View Statistics

```typescript
const stats = service.getSyncStats();
console.log('Success rate:', stats.successRate);
console.log('Total syncs:', stats.total);
```

### For Administrators

#### 1. Configure Sync

```typescript
// lib/linear/config.ts
import { getLinearSyncService } from '@/lib/linear';

const service = getLinearSyncService({
  enabled: true,
  retry: {
    maxRetries: 5,
    retryDelay: 2000,
  },
});
```

#### 2. Enable/Disable Sync

```bash
# In repository settings
Settings → Secrets → Actions

# Add or remove LINEAR_API_KEY to enable/disable
```

#### 3. Monitor Workflow

```bash
# Check workflow runs
gh run list --workflow=linear-sync.yml

# View specific run
gh run view <run-id>
```

---

## Error Handling

### Common Errors and Solutions

#### Error 1: No Linear ID Found

**Symptom**:
```
⚠️  No Linear ID found in branch name, PR title, or description
```

**Solution**:
- Include Linear ID (DES-XXX) or Task ID (TASK-XXX) in branch name
- Or add to PR title: `feat: Feature name (DES-73)`
- Or add to PR description: `Related: DES-73`

#### Error 2: Linear API Authentication Failed

**Symptom**:
```
❌ Failed to update DES-73: Authentication failed
```

**Solution**:
- Check `LINEAR_API_KEY` in repository secrets
- Verify API key has not expired
- Ensure key has write permissions

#### Error 3: Multiple IDs Found

**Symptom**:
```
⚠️  Multiple Linear IDs found: DES-73, DES-78
```

**Solution**:
- Remove extra IDs from branch name
- Keep only one Linear ID per PR
- Or specify primary ID in PR description

### Retry Logic

Failed syncs are automatically retried:

```typescript
const config = {
  retry: {
    maxRetries: 3,        // Try up to 3 times
    retryDelay: 1000,     // Wait 1 second between retries
  },
};
```

### Logging

All sync attempts are logged:

```typescript
// View sync log
const service = getLinearSyncService();
const log = service.getSyncHistory('DES-78');

log.forEach(result => {
  console.log(`${result.timestamp}: ${result.success ? '✅' : '❌'}`);
  if (result.error) {
    console.log(`  Error: ${result.error}`);
  }
});
```

---

## Configuration

### Environment Variables

```bash
# .env.local
LINEAR_API_KEY=lin_api_...     # Required for Linear updates
GITHUB_TOKEN=ghp_...            # Required for GitHub API
```

### Sync Configuration

```typescript
// lib/linear/config.ts
export const syncConfig = {
  enabled: true,                 // Enable/disable sync
  apiKey: process.env.LINEAR_API_KEY,
  githubToken: process.env.GITHUB_TOKEN,

  // ID extraction patterns
  patterns: {
    linearIdPattern: /DES-\d+/gi,
    taskIdPattern: /TASK-\d{3}/gi,
    prPattern: /#(\d+)|pull\/(\d+)/gi,
  },

  // State mapping
  stateMapping: {
    draft: 'in_progress',
    open: 'in_review',
    approved: 'in_review',
    merged: 'done',
    closed: 'canceled',
  },

  // Retry configuration
  retry: {
    maxRetries: 3,
    retryDelay: 1000,
  },
};
```

---

## API Reference

### Mapping Extractor

```typescript
import {
  extractLinearId,
  extractTaskId,
  parseBranchName,
  parsePRTitle,
  createMappingFromPR,
  validateMapping,
} from '@/lib/linear';

// Extract IDs from text
const linearId = extractLinearId('feat/DES-78-feature'); // 'DES-78'
const taskId = extractTaskId('TASK-001 implementation'); // 'TASK-001'

// Parse branch name
const branchData = parseBranchName('feat/TASK-001-clerk-auth');
// { taskId: 'TASK-001', linearId: null, type: 'feat', description: 'clerk-auth' }

// Parse PR title
const titleData = parsePRTitle('feat: Clerk Auth (DES-78)');
// { taskId: null, linearId: 'DES-78', type: 'feat', description: 'Clerk Auth' }

// Create mapping from PR
const mapping = createMappingFromPR(pr);

// Validate mapping
const validation = validateMapping(mapping);
if (!validation.valid) {
  console.error('Invalid mapping:', validation.missingFields);
}
```

### Sync Service

```typescript
import { getLinearSyncService } from '@/lib/linear';

const service = getLinearSyncService();

// Sync PR event
const result = await service.syncPREvent({
  type: 'merged',
  prNumber: 42,
  title: 'feat: Clerk Auth (DES-78)',
  branch: 'feat/TASK-001-clerk-auth',
  url: 'https://github.com/user/repo/pull/42',
  timestamp: new Date(),
  linearId: 'DES-78',
  taskId: 'TASK-001',
});

// Check result
if (result.success) {
  console.log('✅ Synced successfully');
} else {
  console.error('❌ Sync failed:', result.error);
}

// Get sync statistics
const stats = service.getSyncStats();
console.log(`Success rate: ${stats.successRate}%`);
```

---

## Troubleshooting

### Sync Not Triggering

**Check**:
1. Workflow file exists: `.github/workflows/linear-sync.yml`
2. Workflow is enabled in repository settings
3. PR includes Linear ID or Task ID
4. `LINEAR_API_KEY` is set in secrets

**Debug**:
```bash
# Check workflow status
gh workflow view linear-sync.yml

# View recent runs
gh run list --workflow=linear-sync.yml
```

### Wrong Linear State

**Check**:
1. PR event type matches expected transition
2. State mapping is correct in config
3. No manual Linear updates conflicting

**Fix**:
```typescript
// Update state mapping
const config = {
  stateMapping: {
    draft: 'in_progress',    // Customize as needed
    open: 'in_review',
    merged: 'done',
  },
};
```

### Duplicate Syncs

**Check**:
1. Multiple IDs in branch/title
2. Workflow triggering multiple times

**Fix**:
- Use only one Linear ID per PR
- Check workflow triggers configuration

---

## Future Enhancements

### Phase 2: Linear MCP Integration

- Direct Linear MCP tool integration
- Real-time bidirectional sync
- Advanced comment formatting

### Phase 3: Advanced Features

- Automatic task assignment based on PR author
- Effort tracking and time estimates
- Sprint/milestone integration
- Custom state transitions

### Phase 4: Analytics

- Sync success dashboard
- PR-to-done time metrics
- Team velocity tracking

---

## Related Documentation

- **Linear Setup**: [LINEAR_SETUP_SUMMARY.md](./LINEAR_SETUP_SUMMARY.md)
- **Task Sync Guide**: [LINEAR_TASK_SYNC.md](./LINEAR_TASK_SYNC.md)
- **Git Workflow**: [GIT_WORKFLOW_PROTOCOL.md](./GIT_WORKFLOW_PROTOCOL.md)
- **SubAgent Workflow**: [LINEAR_SUBAGENT_WORKFLOW.md](./LINEAR_SUBAGENT_WORKFLOW.md)

---

**Document Owner**: Development Team
**Review Frequency**: Monthly
**Last Updated**: October 21, 2025
**Next Review**: November 21, 2025

**Questions?** Create issue with label `SubAgent:Planner`
