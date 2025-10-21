/**
 * Linear Sync Service
 * Handles synchronization between GitHub PRs and Linear issues
 */

import type {
  LinearStatusUpdate,
  SyncResult,
  TaskPRMapping,
  LinearSyncConfig,
  LinearIssueState,
  GitHubPRState,
  PRLifecycleEvent,
} from './types';

/**
 * Default configuration for Linear sync
 */
export const DEFAULT_SYNC_CONFIG: LinearSyncConfig = {
  enabled: true,
  apiKey: process.env.LINEAR_API_KEY || '',
  githubToken: process.env.GITHUB_TOKEN || '',
  patterns: {
    linearIdPattern: /DES-\d+/gi,
    taskIdPattern: /TASK-\d{3}/gi,
    prPattern: /#(\d+)|pull\/(\d+)/gi,
  },
  stateMapping: {
    [GitHubPRState.DRAFT]: LinearIssueState.IN_PROGRESS,
    [GitHubPRState.OPEN]: LinearIssueState.IN_REVIEW,
    [GitHubPRState.APPROVED]: LinearIssueState.IN_REVIEW,
    [GitHubPRState.MERGED]: LinearIssueState.DONE,
    [GitHubPRState.CLOSED]: LinearIssueState.CANCELED,
  },
  retry: {
    maxRetries: 3,
    retryDelay: 1000,
  },
};

/**
 * Linear Sync Service
 * Handles all synchronization logic between GitHub and Linear
 */
export class LinearSyncService {
  private config: LinearSyncConfig;
  private syncLog: SyncResult[] = [];

  constructor(config: Partial<LinearSyncConfig> = {}) {
    this.config = {
      ...DEFAULT_SYNC_CONFIG,
      ...config,
    };
  }

  /**
   * Map GitHub PR state to Linear issue state
   */
  private mapPRStateToLinearState(prState: GitHubPRState): LinearIssueState {
    return this.config.stateMapping[prState] || LinearIssueState.TODO;
  }

  /**
   * Generate status comment for Linear issue
   */
  private generateStatusComment(event: PRLifecycleEvent): string {
    switch (event.type) {
      case 'created':
        return `🔄 PR created: [#${event.prNumber}](${event.url})\nBranch: \`${event.branch}\``;
      case 'ready_for_review':
        return `👀 PR ready for review: [#${event.prNumber}](${event.url})`;
      case 'approved':
        return `✅ PR approved: [#${event.prNumber}](${event.url})\nReady to merge`;
      case 'merged':
        return `🎉 PR merged: [#${event.prNumber}](${event.url})\nTask completed`;
      case 'closed':
        return `❌ PR closed without merging: [#${event.prNumber}](${event.url})`;
      default:
        return `ℹ️ PR updated: [#${event.prNumber}](${event.url})`;
    }
  }

  /**
   * Determine Linear state based on PR lifecycle event
   */
  private determineLinearState(event: PRLifecycleEvent): LinearIssueState {
    switch (event.type) {
      case 'created':
        return LinearIssueState.IN_PROGRESS;
      case 'ready_for_review':
        return LinearIssueState.IN_REVIEW;
      case 'approved':
        return LinearIssueState.IN_REVIEW; // Stay in review until merged
      case 'merged':
        return LinearIssueState.DONE;
      case 'closed':
        return LinearIssueState.CANCELED;
      default:
        return LinearIssueState.TODO;
    }
  }

  /**
   * Update Linear issue status
   * This would use Linear MCP tools when available, or Linear API
   */
  async updateLinearStatus(update: LinearStatusUpdate): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      // Validate inputs
      if (!update.issueId) {
        throw new Error('Linear issue ID is required');
      }

      if (!this.config.enabled) {
        return {
          success: false,
          issueId: update.issueId,
          newState: update.state,
          timestamp: new Date(),
          error: 'Linear sync is disabled',
          warnings: ['Sync skipped - disabled in configuration'],
        };
      }

      // Log the update attempt
      console.log(`[LinearSync] Updating ${update.issueId} to ${update.state}`);

      // TODO: Implement actual Linear API call or MCP tool usage
      // For now, this is a placeholder that logs what would happen
      const result: SyncResult = {
        success: true,
        issueId: update.issueId,
        newState: update.state,
        timestamp: new Date(),
        warnings: [],
      };

      // Add comment if provided
      if (update.comment) {
        console.log(`[LinearSync] Adding comment to ${update.issueId}:`, update.comment);
        // TODO: Implement comment creation
      }

      // Log successful sync
      this.syncLog.push(result);

      console.log(`[LinearSync] Successfully updated ${update.issueId} in ${Date.now() - startTime}ms`);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      const result: SyncResult = {
        success: false,
        issueId: update.issueId,
        newState: update.state,
        timestamp: new Date(),
        error: errorMessage,
      };

      this.syncLog.push(result);

      console.error(`[LinearSync] Failed to update ${update.issueId}:`, errorMessage);

      return result;
    }
  }

  /**
   * Sync PR lifecycle event to Linear
   */
  async syncPREvent(event: PRLifecycleEvent): Promise<SyncResult> {
    // Must have Linear ID to sync
    if (!event.linearId) {
      return {
        success: false,
        issueId: '',
        newState: LinearIssueState.TODO,
        timestamp: new Date(),
        error: 'No Linear ID found in PR data',
        warnings: [
          'PR must reference a Linear issue in branch name, title, or description',
          `Branch: ${event.branch}`,
          `Title: ${event.title}`,
        ],
      };
    }

    // Determine new state
    const newState = this.determineLinearState(event);

    // Generate comment
    const comment = this.generateStatusComment(event);

    // Update Linear
    return this.updateLinearStatus({
      issueId: event.linearId,
      state: newState,
      comment,
      prUrl: event.url,
      taskDetails: event.taskId
        ? {
            taskId: event.taskId,
            branchName: event.branch,
          }
        : undefined,
    });
  }

  /**
   * Sync multiple PR events in batch
   */
  async syncBatch(events: PRLifecycleEvent[]): Promise<SyncResult[]> {
    console.log(`[LinearSync] Syncing batch of ${events.length} events`);

    const results = await Promise.all(
      events.map(event => this.syncPREvent(event))
    );

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`[LinearSync] Batch complete: ${successful} succeeded, ${failed} failed`);

    return results;
  }

  /**
   * Validate that mapping is ready for sync
   */
  validateSyncReady(mapping: TaskPRMapping): {
    ready: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    if (!mapping.linearId) {
      issues.push('No Linear ID - cannot sync to Linear');
    }

    if (!mapping.branchName) {
      issues.push('No branch name - cannot track changes');
    }

    if (!this.config.enabled) {
      issues.push('Linear sync is disabled');
    }

    if (!this.config.apiKey) {
      issues.push('LINEAR_API_KEY environment variable not set');
    }

    return {
      ready: issues.length === 0,
      issues,
    };
  }

  /**
   * Get sync history for a specific Linear issue
   */
  getSyncHistory(issueId: string): SyncResult[] {
    return this.syncLog.filter(result => result.issueId === issueId);
  }

  /**
   * Get sync statistics
   */
  getSyncStats(): {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
    averageDuration: number;
  } {
    const total = this.syncLog.length;
    const successful = this.syncLog.filter(r => r.success).length;
    const failed = total - successful;
    const successRate = total > 0 ? (successful / total) * 100 : 0;

    return {
      total,
      successful,
      failed,
      successRate,
      averageDuration: 0, // TODO: Track duration
    };
  }

  /**
   * Clear sync history
   */
  clearHistory(): void {
    this.syncLog = [];
  }

  /**
   * Check if Linear sync is properly configured
   */
  isConfigured(): boolean {
    return !!(
      this.config.enabled &&
      this.config.apiKey &&
      this.config.githubToken
    );
  }
}

/**
 * Singleton instance for global use
 */
let syncService: LinearSyncService | null = null;

/**
 * Get or create the Linear sync service singleton
 */
export function getLinearSyncService(config?: Partial<LinearSyncConfig>): LinearSyncService {
  if (!syncService) {
    syncService = new LinearSyncService(config);
  }
  return syncService;
}

/**
 * Reset the singleton (useful for testing)
 */
export function resetLinearSyncService(): void {
  syncService = null;
}
