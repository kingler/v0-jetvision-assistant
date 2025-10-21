/**
 * Linear Integration Types
 * Type definitions for Linear-GitHub synchronization
 */

/**
 * Linear issue states
 */
export enum LinearIssueState {
  BACKLOG = 'backlog',
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  IN_REVIEW = 'in_review',
  DONE = 'done',
  CANCELED = 'canceled',
}

/**
 * GitHub PR states
 */
export enum GitHubPRState {
  DRAFT = 'draft',
  OPEN = 'open',
  APPROVED = 'approved',
  MERGED = 'merged',
  CLOSED = 'closed',
}

/**
 * Task-PR-Feature mapping
 */
export interface TaskPRMapping {
  /** Local task ID (e.g., "TASK-001") */
  taskId: string;
  /** Linear issue ID (e.g., "DES-78") */
  linearId: string;
  /** GitHub PR number */
  prNumber?: number;
  /** Git branch name */
  branchName: string;
  /** GitHub PR URL */
  prUrl?: string;
  /** Current status */
  status: LinearIssueState;
  /** Last sync timestamp */
  lastSynced: Date;
  /** Sync errors if any */
  errors?: string[];
}

/**
 * PR lifecycle event
 */
export interface PRLifecycleEvent {
  /** Event type */
  type: 'created' | 'ready_for_review' | 'approved' | 'merged' | 'closed';
  /** PR number */
  prNumber: number;
  /** PR title */
  title: string;
  /** Branch name */
  branch: string;
  /** PR URL */
  url: string;
  /** Timestamp */
  timestamp: Date;
  /** Associated Linear issue ID (extracted from title/branch) */
  linearId?: string;
  /** Associated task ID (extracted from title/branch) */
  taskId?: string;
}

/**
 * Linear status update request
 */
export interface LinearStatusUpdate {
  /** Linear issue ID */
  issueId: string;
  /** New state */
  state: LinearIssueState;
  /** Optional comment to add */
  comment?: string;
  /** PR URL to reference */
  prUrl?: string;
  /** Task details */
  taskDetails?: {
    taskId: string;
    branchName: string;
  };
}

/**
 * Sync result
 */
export interface SyncResult {
  /** Whether sync was successful */
  success: boolean;
  /** Linear issue ID */
  issueId: string;
  /** Previous state */
  previousState?: LinearIssueState;
  /** New state */
  newState: LinearIssueState;
  /** Timestamp */
  timestamp: Date;
  /** Error message if failed */
  error?: string;
  /** Warning messages */
  warnings?: string[];
}

/**
 * Mapping extraction patterns
 */
export interface MappingPatterns {
  /** Pattern to extract Linear ID from text */
  linearIdPattern: RegExp;
  /** Pattern to extract task ID from text */
  taskIdPattern: RegExp;
  /** Pattern to extract PR reference from text */
  prPattern: RegExp;
}

/**
 * Linear sync configuration
 */
export interface LinearSyncConfig {
  /** Enable/disable auto-sync */
  enabled: boolean;
  /** Linear API key (from environment) */
  apiKey: string;
  /** GitHub token (from environment) */
  githubToken: string;
  /** Default patterns for extraction */
  patterns: MappingPatterns;
  /** State mapping: GitHub PR state → Linear issue state */
  stateMapping: Record<GitHubPRState, LinearIssueState>;
  /** Retry configuration */
  retry: {
    /** Maximum retries */
    maxRetries: number;
    /** Delay between retries (ms) */
    retryDelay: number;
  };
}

/**
 * Linear issue metadata
 */
export interface LinearIssue {
  /** Linear issue ID */
  id: string;
  /** Issue title */
  title: string;
  /** Issue description */
  description?: string;
  /** Current state */
  state: LinearIssueState;
  /** Assignee */
  assignee?: {
    id: string;
    name: string;
    email: string;
  };
  /** Labels */
  labels: string[];
  /** Priority (1-4, 1 is urgent) */
  priority: number;
  /** Due date */
  dueDate?: Date;
  /** Created at */
  createdAt: Date;
  /** Updated at */
  updatedAt: Date;
  /** URL */
  url: string;
}

/**
 * GitHub PR metadata
 */
export interface GitHubPR {
  /** PR number */
  number: number;
  /** PR title */
  title: string;
  /** PR description/body */
  body: string;
  /** PR state */
  state: GitHubPRState;
  /** Branch name */
  headBranch: string;
  /** Base branch (usually 'main') */
  baseBranch: string;
  /** PR URL */
  url: string;
  /** Author */
  author: string;
  /** Created at */
  createdAt: Date;
  /** Updated at */
  updatedAt: Date;
  /** Merged at */
  mergedAt?: Date;
}
