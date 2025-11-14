/**
 * Linear Integration Module
 * Barrel exports for Linear-GitHub synchronization
 */

// Enums (value exports)
export { LinearIssueState, GitHubPRState } from './types';

// Types (type-only exports)
export type {
  TaskPRMapping,
  PRLifecycleEvent,
  LinearStatusUpdate,
  SyncResult,
  MappingPatterns,
  LinearSyncConfig,
  LinearIssue,
  GitHubPR,
} from './types';

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
