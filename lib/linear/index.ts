/**
 * Linear Integration Module
 * Barrel exports for Linear-GitHub synchronization
 */

// Types
export type {
  LinearIssueState,
  GitHubPRState,
  TaskPRMapping,
  PRLifecycleEvent,
  LinearStatusUpdate,
  SyncResult,
  MappingPatterns,
  LinearSyncConfig,
  LinearIssue,
  GitHubPR,
} from './types';

export { LinearIssueState, GitHubPRState } from './types';

// Mapping Extractor
export {
  DEFAULT_PATTERNS,
  extractLinearId,
  extractTaskId,
  extractPRNumber,
  parseBranchName,
  parsePRTitle,
  parseCommitMessage,
  createMappingFromPR,
  createMappingFromLinearIssue,
  validateMapping,
  mergeMappings,
  findBestLinearMatch,
} from './mapping-extractor';

// Sync Service
export {
  DEFAULT_SYNC_CONFIG,
  LinearSyncService,
  getLinearSyncService,
  resetLinearSyncService,
} from './sync-service';
