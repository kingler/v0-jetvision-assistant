# Linear Integration Library

Automated synchronization between GitHub pull requests and Linear issues.

## Quick Start

```typescript
import { getLinearSyncService, createMappingFromPR } from '@/lib/linear';

// Create sync service
const service = getLinearSyncService();

// Create mapping from PR
const mapping = createMappingFromPR(pr);

// Sync PR event to Linear
const result = await service.syncPREvent({
  type: 'merged',
  prNumber: 42,
  title: 'feat: Feature (DES-78)',
  branch: 'feat/TASK-001-feature',
  url: 'https://github.com/user/repo/pull/42',
  timestamp: new Date(),
  linearId: 'DES-78',
  taskId: 'TASK-001',
});

console.log(result.success ? '✅ Synced' : '❌ Failed');
```

## Modules

### Types (`types.ts`)

Comprehensive type definitions for Linear-GitHub integration:

- `LinearIssueState` - Linear issue states enum
- `GitHubPRState` - GitHub PR states enum
- `TaskPRMapping` - Task-PR-Feature relationship
- `PRLifecycleEvent` - PR lifecycle events
- `LinearStatusUpdate` - Status update requests
- `SyncResult` - Sync operation results

### Mapping Extractor (`mapping-extractor.ts`)

Identifies task-PR-feature relationships:

```typescript
import {
  extractLinearId,
  extractTaskId,
  parseBranchName,
  parsePRTitle,
  createMappingFromPR,
} from '@/lib/linear';

// Extract IDs
const linearId = extractLinearId('feat/DES-78-feature'); // 'DES-78'
const taskId = extractTaskId('TASK-001 description'); // 'TASK-001'

// Parse branch
const branch = parseBranchName('feat/TASK-001-clerk-auth');
// { taskId: 'TASK-001', linearId: null, type: 'feat', ... }

// Parse PR title
const title = parsePRTitle('feat: Clerk Auth (DES-78)');
// { taskId: null, linearId: 'DES-78', type: 'feat', ... }

// Create full mapping
const mapping = createMappingFromPR(pr);
```

### Sync Service (`sync-service.ts`)

Manages synchronization between GitHub and Linear:

```typescript
import { getLinearSyncService } from '@/lib/linear';

const service = getLinearSyncService({
  enabled: true,
  retry: {
    maxRetries: 3,
    retryDelay: 1000,
  },
});

// Sync single event
await service.syncPREvent(event);

// Sync batch
await service.syncBatch([event1, event2, event3]);

// Get statistics
const stats = service.getSyncStats();
console.log(`Success rate: ${stats.successRate}%`);

// View history
const history = service.getSyncHistory('DES-78');
```

## Patterns

### ID Extraction Patterns

```typescript
// Linear ID: DES-\d+ (e.g., DES-73, DES-109)
const linearPattern = /DES-\d+/gi;

// Task ID: TASK-\d{3} (e.g., TASK-001, TASK-037)
const taskPattern = /TASK-\d{3}/gi;

// PR Number: #\d+ or pull/\d+ (e.g., #42, pull/123)
const prPattern = /#(\d+)|pull\/(\d+)/gi;
```

### Branch Naming Conventions

```bash
# Recommended formats
feat/TASK-001-description    # Feature with task ID
fix/TASK-000-bug-fix         # Fix with task ID
feat/DES-78-description      # Feature with Linear ID
docs/workflow-system          # Docs without ID
```

### PR Title Conventions

```bash
# Recommended formats
feat: Description (TASK-001)         # With task ID
fix: Bug fix - DES-73                # With Linear ID
docs: Add documentation              # Without ID
```

## State Mapping

### GitHub PR → Linear Issue

| PR State | Linear State | Description |
|----------|--------------|-------------|
| `draft` | `In Progress` | Work in progress |
| `open` | `In Review` | Ready for review |
| `approved` | `In Review` | Approved, awaiting merge |
| `merged` | `Done` | Completed |
| `closed` | `Canceled` | Closed without merge |

## Configuration

### Environment Variables

```bash
LINEAR_API_KEY=lin_api_...    # Required
GITHUB_TOKEN=ghp_...           # Required
```

### Config Object

```typescript
const config = {
  enabled: true,
  apiKey: process.env.LINEAR_API_KEY,
  githubToken: process.env.GITHUB_TOKEN,
  patterns: {
    linearIdPattern: /DES-\d+/gi,
    taskIdPattern: /TASK-\d{3}/gi,
    prPattern: /#(\d+)|pull\/(\d+)/gi,
  },
  stateMapping: {
    draft: 'in_progress',
    open: 'in_review',
    approved: 'in_review',
    merged: 'done',
    closed: 'canceled',
  },
  retry: {
    maxRetries: 3,
    retryDelay: 1000,
  },
};
```

## Error Handling

### Validation

```typescript
import { validateMapping } from '@/lib/linear';

const validation = validateMapping(mapping);

if (!validation.valid) {
  console.error('Missing:', validation.missingFields);
  console.warn('Warnings:', validation.warnings);
}
```

### Retry Logic

Automatic retries on failure:

```typescript
const config = {
  retry: {
    maxRetries: 3,     // Try up to 3 times
    retryDelay: 1000,  // Wait 1s between retries
  },
};
```

### Sync Results

```typescript
const result = await service.syncPREvent(event);

if (result.success) {
  console.log('✅ Synced to Linear');
  console.log('Issue:', result.issueId);
  console.log('New state:', result.newState);
} else {
  console.error('❌ Sync failed');
  console.error('Error:', result.error);
  console.warn('Warnings:', result.warnings);
}
```

## Testing

### Unit Tests

```typescript
import { extractLinearId, extractTaskId } from '@/lib/linear';

describe('Mapping Extractor', () => {
  it('extracts Linear ID from branch name', () => {
    expect(extractLinearId('feat/DES-78-feature')).toBe('DES-78');
  });

  it('extracts task ID from PR title', () => {
    expect(extractTaskId('feat: Feature (TASK-001)')).toBe('TASK-001');
  });
});
```

### Integration Tests

```typescript
import { getLinearSyncService } from '@/lib/linear';

describe('Linear Sync Service', () => {
  it('syncs PR merge to Linear', async () => {
    const service = getLinearSyncService();
    const result = await service.syncPREvent({
      type: 'merged',
      prNumber: 42,
      linearId: 'DES-78',
      // ...
    });

    expect(result.success).toBe(true);
    expect(result.newState).toBe('done');
  });
});
```

## Examples

### Example 1: Extract IDs from PR

```typescript
import { createMappingFromPR } from '@/lib/linear';

const pr = {
  number: 42,
  title: 'feat: Clerk Auth (DES-78)',
  body: 'Implements authentication\n\nTask: TASK-001',
  headBranch: 'feat/TASK-001-clerk-auth',
  state: 'open',
  url: 'https://github.com/user/repo/pull/42',
  // ...
};

const mapping = createMappingFromPR(pr);
console.log(mapping);
// {
//   taskId: 'TASK-001',
//   linearId: 'DES-78',
//   prNumber: 42,
//   branchName: 'feat/TASK-001-clerk-auth',
//   status: 'in_review',
//   ...
// }
```

### Example 2: Sync PR Event

```typescript
import { getLinearSyncService } from '@/lib/linear';

const service = getLinearSyncService();

// PR was merged
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

if (result.success) {
  console.log('✅ Linear issue DES-78 marked as Done');
}
```

### Example 3: Batch Sync

```typescript
import { getLinearSyncService } from '@/lib/linear';

const service = getLinearSyncService();

const events = [
  { type: 'created', prNumber: 40, linearId: 'DES-77', ... },
  { type: 'ready_for_review', prNumber: 41, linearId: 'DES-78', ... },
  { type: 'merged', prNumber: 42, linearId: 'DES-79', ... },
];

const results = await service.syncBatch(events);

const successful = results.filter(r => r.success).length;
console.log(`✅ ${successful}/${results.length} synced successfully`);
```

## API Reference

See [LINEAR_GITHUB_AUTOMATION.md](../../docs/LINEAR_GITHUB_AUTOMATION.md) for complete API documentation.

## Troubleshooting

### Issue: "No Linear ID found"

**Solution**: Include Linear ID (DES-XXX) or Task ID (TASK-XXX) in:
- Branch name: `feat/DES-78-feature`
- PR title: `feat: Feature (DES-78)`
- PR description: `Related: DES-78`

### Issue: "Sync failed - Authentication error"

**Solution**: Check `LINEAR_API_KEY` environment variable is set and valid.

### Issue: "Multiple IDs found"

**Solution**: Use only one Linear ID per PR to avoid ambiguity.

## Related Documentation

- [LINEAR_GITHUB_AUTOMATION.md](../../docs/LINEAR_GITHUB_AUTOMATION.md) - Complete documentation
- [LINEAR_SETUP_SUMMARY.md](../../docs/LINEAR_SETUP_SUMMARY.md) - Linear setup guide
- [LINEAR_TASK_SYNC.md](../../docs/LINEAR_TASK_SYNC.md) - Task synchronization guide

---

**Version**: 1.0
**Last Updated**: October 21, 2025
