/**
 * Example usage of Linear-GitHub automation
 * This file demonstrates how to use the Linear integration library
 */

import {
  extractLinearId,
  extractTaskId,
  parseBranchName,
  parsePRTitle,
  createMappingFromPR,
  validateMapping,
  getLinearSyncService,
  type GitHubPR,
  type PRLifecycleEvent,
  GitHubPRState,
} from './index';

// Example 1: Extract IDs from text
console.log('=== Example 1: Extract IDs ===\n');

const branchName = 'feat/TASK-001-clerk-authentication';
const prTitle = 'feat: Implement Clerk Auth (DES-78)';
const prBody = 'Implements authentication\n\nRelated: DES-78, TASK-001';

console.log('Branch:', branchName);
console.log('Linear ID:', extractLinearId(branchName)); // null
console.log('Task ID:', extractTaskId(branchName)); // 'TASK-001'

console.log('\nPR Title:', prTitle);
console.log('Linear ID:', extractLinearId(prTitle)); // 'DES-78'
console.log('Task ID:', extractTaskId(prTitle)); // null

console.log('\nPR Body:', prBody);
console.log('Linear ID:', extractLinearId(prBody)); // 'DES-78'
console.log('Task ID:', extractTaskId(prBody)); // 'TASK-001'

// Example 2: Parse branch name
console.log('\n\n=== Example 2: Parse Branch Name ===\n');

const branchData = parseBranchName(branchName);
console.log('Parsed branch:', JSON.stringify(branchData, null, 2));
// {
//   taskId: 'TASK-001',
//   linearId: null,
//   type: 'feat',
//   description: 'clerk-authentication'
// }

// Example 3: Parse PR title
console.log('\n\n=== Example 3: Parse PR Title ===\n');

const titleData = parsePRTitle(prTitle);
console.log('Parsed title:', JSON.stringify(titleData, null, 2));
// {
//   taskId: null,
//   linearId: 'DES-78',
//   type: 'feat',
//   description: 'Implement Clerk Auth'
// }

// Example 4: Create mapping from PR
console.log('\n\n=== Example 4: Create Mapping from PR ===\n');

const examplePR: GitHubPR = {
  number: 42,
  title: 'feat: Implement Clerk Authentication (DES-78)',
  body: 'Implements Clerk authentication\n\nTask: TASK-001',
  state: GitHubPRState.OPEN,
  headBranch: 'feat/TASK-001-clerk-auth',
  baseBranch: 'main',
  url: 'https://github.com/user/repo/pull/42',
  author: 'developer',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mapping = createMappingFromPR(examplePR);
console.log('Created mapping:', JSON.stringify(mapping, null, 2));

// Example 5: Validate mapping
console.log('\n\n=== Example 5: Validate Mapping ===\n');

if (mapping) {
  const validation = validateMapping(mapping);
  console.log('Validation result:', JSON.stringify(validation, null, 2));

  if (validation.valid) {
    console.log('✅ Mapping is valid');
  } else {
    console.log('❌ Mapping is invalid');
    console.log('Missing fields:', validation.missingFields);
  }

  if (validation.warnings.length > 0) {
    console.log('⚠️  Warnings:', validation.warnings);
  }
}

// Example 6: Sync PR event
console.log('\n\n=== Example 6: Sync PR Event ===\n');

async function syncExample() {
  const service = getLinearSyncService({
    enabled: true,
    retry: {
      maxRetries: 3,
      retryDelay: 1000,
    },
  });

  const event: PRLifecycleEvent = {
    type: 'merged',
    prNumber: 42,
    title: 'feat: Implement Clerk Auth (DES-78)',
    branch: 'feat/TASK-001-clerk-auth',
    url: 'https://github.com/user/repo/pull/42',
    timestamp: new Date(),
    linearId: 'DES-78',
    taskId: 'TASK-001',
  };

  console.log('Syncing event:', event.type);
  console.log('Linear ID:', event.linearId);
  console.log('Task ID:', event.taskId);

  const result = await service.syncPREvent(event);

  console.log('\nSync result:', JSON.stringify(result, null, 2));

  if (result.success) {
    console.log('✅ Successfully synced to Linear');
    console.log('Issue:', result.issueId);
    console.log('New state:', result.newState);
  } else {
    console.log('❌ Sync failed');
    console.log('Error:', result.error);
    if (result.warnings) {
      console.log('Warnings:', result.warnings);
    }
  }

  // Get sync statistics
  console.log('\n\n=== Example 7: Sync Statistics ===\n');
  const stats = service.getSyncStats();
  console.log('Statistics:', JSON.stringify(stats, null, 2));
  console.log(`Success rate: ${stats.successRate.toFixed(2)}%`);

  // Get sync history
  console.log('\n\n=== Example 8: Sync History ===\n');
  const history = service.getSyncHistory('DES-78');
  console.log(`History for DES-78: ${history.length} events`);
  history.forEach((h, i) => {
    console.log(`${i + 1}. ${h.timestamp.toISOString()} - ${h.success ? '✅' : '❌'} ${h.newState}`);
  });
}

// Run async examples
syncExample().catch(console.error);

// Example 9: Batch sync
console.log('\n\n=== Example 9: Batch Sync ===\n');

async function batchSyncExample() {
  const service = getLinearSyncService();

  const events: PRLifecycleEvent[] = [
    {
      type: 'created',
      prNumber: 40,
      title: 'feat: Feature A (DES-76)',
      branch: 'feat/TASK-003-feature-a',
      url: 'https://github.com/user/repo/pull/40',
      timestamp: new Date(),
      linearId: 'DES-76',
      taskId: 'TASK-003',
    },
    {
      type: 'ready_for_review',
      prNumber: 41,
      title: 'fix: Bug fix (DES-77)',
      branch: 'fix/TASK-004-bug-fix',
      url: 'https://github.com/user/repo/pull/41',
      timestamp: new Date(),
      linearId: 'DES-77',
      taskId: 'TASK-004',
    },
    {
      type: 'merged',
      prNumber: 42,
      title: 'feat: Feature B (DES-78)',
      branch: 'feat/TASK-005-feature-b',
      url: 'https://github.com/user/repo/pull/42',
      timestamp: new Date(),
      linearId: 'DES-78',
      taskId: 'TASK-005',
    },
  ];

  console.log(`Syncing batch of ${events.length} events...`);

  const results = await service.syncBatch(events);

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\n✅ ${successful} successful`);
  console.log(`❌ ${failed} failed`);

  results.forEach((result, i) => {
    console.log(`\n${i + 1}. ${result.issueId}:`);
    console.log(`   Status: ${result.success ? '✅' : '❌'}`);
    console.log(`   State: ${result.newState}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
}

// Run batch sync example
setTimeout(() => {
  batchSyncExample().catch(console.error);
}, 2000);
