/**
 * Task-PR-Feature Mapping Extractor
 * Identifies relationships between Linear tasks, GitHub PRs, and feature branches
 */

import type {
  TaskPRMapping,
  MappingPatterns,
  GitHubPR,
  LinearIssue,
  LinearIssueState,
} from './types';

/**
 * Default patterns for extracting task/issue IDs
 */
export const DEFAULT_PATTERNS: MappingPatterns = {
  // Matches: DES-123, DES-73, etc.
  linearIdPattern: /DES-\d+/gi,

  // Matches: TASK-001, TASK-123, etc.
  taskIdPattern: /TASK-\d{3}/gi,

  // Matches: #123, PR #45, pull/123, etc.
  prPattern: /#(\d+)|pull\/(\d+)/gi,
};

/**
 * Extract Linear issue ID from text (branch name, PR title, commit message)
 */
export function extractLinearId(text: string): string | null {
  const matches = text.match(DEFAULT_PATTERNS.linearIdPattern);
  return matches ? matches[0] : null;
}

/**
 * Extract task ID from text
 */
export function extractTaskId(text: string): string | null {
  const matches = text.match(DEFAULT_PATTERNS.taskIdPattern);
  return matches ? matches[0] : null;
}

/**
 * Extract PR number from text
 */
export function extractPRNumber(text: string): number | null {
  const matches = text.match(DEFAULT_PATTERNS.prPattern);
  if (!matches) return null;

  // Extract the number from the match
  const numberMatch = matches[0].match(/\d+/);
  return numberMatch ? parseInt(numberMatch[0], 10) : null;
}

/**
 * Parse branch name to extract task and Linear IDs
 *
 * Branch naming conventions supported:
 * - feat/TASK-001-clerk-auth
 * - fix/TASK-000-typescript-errors
 * - docs/workflow-system
 * - feat/DES-78-clerk-integration
 */
export function parseBranchName(branchName: string): {
  taskId: string | null;
  linearId: string | null;
  type: string | null;
  description: string | null;
} {
  const taskId = extractTaskId(branchName);
  const linearId = extractLinearId(branchName);

  // Extract branch type and description
  const parts = branchName.split('/');
  const type = parts.length > 1 ? parts[0] : null;
  const description = parts.length > 1 ? parts.slice(1).join('/') : parts[0];

  return {
    taskId,
    linearId,
    type,
    description,
  };
}

/**
 * Parse PR title to extract task and Linear IDs
 *
 * PR title conventions supported:
 * - "feat: Implement Clerk Auth (TASK-001)"
 * - "fix: TypeScript errors - DES-73"
 * - "docs: Git Workflow Protocol"
 */
export function parsePRTitle(title: string): {
  taskId: string | null;
  linearId: string | null;
  type: string | null;
  description: string;
} {
  const taskId = extractTaskId(title);
  const linearId = extractLinearId(title);

  // Extract type from conventional commit format
  const typeMatch = title.match(/^(\w+)(?:\([^)]+\))?:/);
  const type = typeMatch ? typeMatch[1] : null;

  // Description is everything after the type prefix
  const description = typeMatch
    ? title.substring(typeMatch[0].length).trim()
    : title;

  return {
    taskId,
    linearId,
    type,
    description,
  };
}

/**
 * Parse commit message to extract task and Linear IDs
 */
export function parseCommitMessage(message: string): {
  taskId: string | null;
  linearId: string | null;
  prNumber: number | null;
} {
  const taskId = extractTaskId(message);
  const linearId = extractLinearId(message);
  const prNumber = extractPRNumber(message);

  return {
    taskId,
    linearId,
    prNumber,
  };
}

/**
 * Create task-PR mapping from GitHub PR
 *
 * Attempts to extract task/issue IDs from:
 * 1. Branch name
 * 2. PR title
 * 3. PR description
 */
export function createMappingFromPR(pr: GitHubPR): TaskPRMapping | null {
  // Try branch name first
  const branchData = parseBranchName(pr.headBranch);

  // Try PR title
  const titleData = parsePRTitle(pr.title);

  // Try PR description
  const descLinearId = extractLinearId(pr.body);
  const descTaskId = extractTaskId(pr.body);

  // Determine task and Linear IDs (prefer branch > title > description)
  const taskId = branchData.taskId || titleData.taskId || descTaskId;
  const linearId = branchData.linearId || titleData.linearId || descLinearId;

  // Must have at least a task ID or Linear ID
  if (!taskId && !linearId) {
    return null;
  }

  // Map PR state to Linear state
  let status: LinearIssueState;
  switch (pr.state) {
    case 'draft':
      status = LinearIssueState.IN_PROGRESS;
      break;
    case 'open':
      status = LinearIssueState.IN_REVIEW;
      break;
    case 'approved':
      status = LinearIssueState.IN_REVIEW;
      break;
    case 'merged':
      status = LinearIssueState.DONE;
      break;
    case 'closed':
      status = LinearIssueState.CANCELED;
      break;
    default:
      status = LinearIssueState.TODO;
  }

  return {
    taskId: taskId || '',
    linearId: linearId || '',
    prNumber: pr.number,
    branchName: pr.headBranch,
    prUrl: pr.url,
    status,
    lastSynced: new Date(),
    errors: [],
  };
}

/**
 * Create task-PR mapping from Linear issue
 */
export function createMappingFromLinearIssue(issue: LinearIssue): Partial<TaskPRMapping> {
  // Extract task ID from issue title or description
  const taskId = extractTaskId(issue.title) || extractTaskId(issue.description || '');

  // Extract PR reference from description
  const prNumber = extractPRNumber(issue.description || '');

  return {
    linearId: issue.id,
    taskId: taskId || '',
    status: issue.state,
    prNumber: prNumber || undefined,
    lastSynced: new Date(),
  };
}

/**
 * Validate mapping completeness
 */
export function validateMapping(mapping: TaskPRMapping): {
  valid: boolean;
  missingFields: string[];
  warnings: string[];
} {
  const missingFields: string[] = [];
  const warnings: string[] = [];

  if (!mapping.taskId && !mapping.linearId) {
    missingFields.push('taskId or linearId (at least one required)');
  }

  if (!mapping.branchName) {
    missingFields.push('branchName');
  }

  if (!mapping.linearId) {
    warnings.push('No Linear ID - cannot sync to Linear');
  }

  if (!mapping.taskId) {
    warnings.push('No task ID - cannot link to local task file');
  }

  if (!mapping.prNumber) {
    warnings.push('No PR number - mapping is incomplete');
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
    warnings,
  };
}

/**
 * Merge multiple partial mappings into a complete mapping
 * Useful when combining data from different sources (branch, PR, issue, etc.)
 */
export function mergeMappings(
  mappings: Partial<TaskPRMapping>[]
): TaskPRMapping | null {
  if (mappings.length === 0) return null;

  // Merge all mappings, with later ones overriding earlier ones
  const merged = mappings.reduce((acc, mapping) => ({
    ...acc,
    ...mapping,
  }), {} as Partial<TaskPRMapping>);

  // Ensure required fields exist
  if (!merged.taskId && !merged.linearId) return null;
  if (!merged.branchName) return null;

  return {
    taskId: merged.taskId || '',
    linearId: merged.linearId || '',
    branchName: merged.branchName,
    prNumber: merged.prNumber,
    prUrl: merged.prUrl,
    status: merged.status || LinearIssueState.TODO,
    lastSynced: merged.lastSynced || new Date(),
    errors: merged.errors || [],
  };
}

/**
 * Find best matching Linear issue for a PR
 * Returns the most likely Linear issue ID based on PR data
 */
export function findBestLinearMatch(
  pr: GitHubPR,
  linearIssues: LinearIssue[]
): string | null {
  const mapping = createMappingFromPR(pr);
  if (!mapping) return null;

  // If we found a Linear ID directly, return it
  if (mapping.linearId) {
    // Verify it exists in the provided issues
    const exists = linearIssues.some(issue => issue.id === mapping.linearId);
    return exists ? mapping.linearId : null;
  }

  // Try to find by task ID in issue titles/descriptions
  if (mapping.taskId) {
    const match = linearIssues.find(issue =>
      extractTaskId(issue.title) === mapping.taskId ||
      extractTaskId(issue.description || '') === mapping.taskId
    );
    return match ? match.id : null;
  }

  return null;
}
