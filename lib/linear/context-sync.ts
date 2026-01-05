/**
 * Linear Context Synchronization
 * Syncs .context/ directory status with Linear project management
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { linear } from './linear-tool';

export interface ContextTaskStatus {
  identifier: string; // e.g., ONEK-93, DES-111
  title: string;
  status: 'complete' | 'in_progress' | 'pending' | 'blocked';
  completionPercentage?: number;
  lastUpdated?: Date;
  source: string; // Which .context file this came from
}

export interface SyncResult {
  success: boolean;
  synced: string[];
  failed: string[];
  skipped: string[];
  errors: Array<{ identifier: string; error: string }>;
  timestamp: Date;
}

/**
 * Extract task identifiers and status from .context/ files
 */
export async function parseContextDirectory(contextPath: string): Promise<ContextTaskStatus[]> {
  const tasks: ContextTaskStatus[] = [];
  
  // Patterns to match Linear IDs (ONEK-XX, DES-XX) and status indicators
  const linearIdPattern = /(ONEK|DES)-\d+/gi;
  const completionPattern = /(\d+)%/g;
  const statusPatterns = {
    complete: /✅|complete|done|finished|merged/i,
    in_progress: /🟡|in progress|working|started|partial/i,
    pending: /❌|pending|not started|todo/i,
    blocked: /⛔|blocked|blocker/i,
  };

  try {
    // Read all markdown files in .context/ recursively
    const files = await findMarkdownFiles(contextPath);
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const matches = line.match(linearIdPattern);
        
        if (matches) {
          for (const identifier of matches) {
            // Determine status from surrounding context
            const contextLines = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 3)).join(' ');
            
            let status: ContextTaskStatus['status'] = 'pending';
            if (statusPatterns.complete.test(contextLines)) {
              status = 'complete';
            } else if (statusPatterns.blocked.test(contextLines)) {
              status = 'blocked';
            } else if (statusPatterns.pending.test(contextLines)) {
              status = 'pending';
            } else if (statusPatterns.in_progress.test(contextLines)) {
              status = 'in_progress';
            }
            
            // Extract completion percentage if present
            const percentMatches = Array.from(contextLines.matchAll(completionPattern));
            const completionPercentage = percentMatches.length > 0
              ? parseInt(percentMatches[percentMatches.length - 1][1], 10)
              : undefined;
            
            tasks.push({
              identifier: identifier.toUpperCase(),
              title: line.trim().replace(/^[#\-*\s]+/, '').substring(0, 100),
              status,
              completionPercentage,
              source: path.relative(contextPath, file),
            });
          }
        }
      }
    }
    
    // Deduplicate tasks (keep most recent status)
    const taskMap = new Map<string, ContextTaskStatus>();
    const statusPriority: Record<ContextTaskStatus['status'], number> = {
      complete: 3,
      in_progress: 2,
      blocked: 1,
      pending: 0,
    };

    for (const task of tasks) {
      const existing = taskMap.get(task.identifier);
      if (!existing || statusPriority[task.status] > statusPriority[existing.status]) {
        taskMap.set(task.identifier, task);
      }
    }
    
    return Array.from(taskMap.values());
  } catch (error) {
    console.error('[ContextSync] Error parsing context directory:', error);
    return [];
  }
}

/**
 * Recursively find all markdown files in a directory
 */
async function findMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        files.push(...await findMarkdownFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`[ContextSync] Error reading directory ${dir}:`, error);
  }
  
  return files;
}

/**
 * Map context status to Linear state
 */
function mapStatusToLinearState(status: ContextTaskStatus['status']): string {
  const stateMap: Record<string, string> = {
    complete: 'Done',
    in_progress: 'In Progress',
    pending: 'Todo',
    blocked: 'Blocked',
  };
  
  return stateMap[status] || 'Todo';
}

/**
 * Sync context tasks to Linear
 */
export async function syncContextToLinear(
  contextPath: string,
  teamId: string,
  dryRun: boolean = false
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    synced: [],
    failed: [],
    skipped: [],
    errors: [],
    timestamp: new Date(),
  };

  try {
    // Parse .context/ directory
    console.log('[ContextSync] Parsing .context/ directory...');
    const tasks = await parseContextDirectory(contextPath);
    console.log(`[ContextSync] Found ${tasks.length} unique task references`);

    // Sync each task to Linear
    for (const task of tasks) {
      try {
        if (dryRun) {
          console.log(`[ContextSync] [DRY RUN] Would sync ${task.identifier}: ${task.status}`);
          result.synced.push(task.identifier);
          continue;
        }

        // Find issue in Linear
        const issue = await linear.findIssue(task.identifier, teamId);

        if (!issue) {
          console.log(`[ContextSync] Issue ${task.identifier} not found in Linear, skipping`);
          result.skipped.push(task.identifier);
          continue;
        }

        // Check if status needs updating
        const targetState = mapStatusToLinearState(task.status);
        const currentState = issue.state?.name || 'Unknown';

        if (currentState === targetState) {
          console.log(`[ContextSync] ${task.identifier} already in state "${targetState}", skipping`);
          result.skipped.push(task.identifier);
          continue;
        }

        // Update Linear issue
        await linear.updateIssueState(task.identifier, targetState, teamId);

        // Add comment with sync metadata
        const comment = `🔄 **Status synced from codebase analysis**\n\n` +
          `- **Local Status**: ${task.status}\n` +
          `- **Source**: \`.context/${task.source}\`\n` +
          `- **Completion**: ${task.completionPercentage || 'N/A'}%\n` +
          `- **Synced At**: ${new Date().toISOString()}\n\n` +
          `_Automated sync via analyze_codebase command_`;

        await linear.addComment(task.identifier, comment, teamId);

        console.log(`[ContextSync] ✅ Synced ${task.identifier}: ${currentState} → ${targetState}`);
        result.synced.push(task.identifier);

      } catch (error) {
        console.error(`[ContextSync] ❌ Failed to sync ${task.identifier}:`, error);
        result.failed.push(task.identifier);
        result.errors.push({
          identifier: task.identifier,
          error: error instanceof Error ? error.message : String(error),
        });
        result.success = false;
      }
    }

    return result;
  } catch (error) {
    console.error('[ContextSync] Fatal error during sync:', error);
    result.success = false;
    result.errors.push({
      identifier: 'SYNC_PROCESS',
      error: error instanceof Error ? error.message : String(error),
    });
    return result;
  }
}

/**
 * Generate sync report for logging
 */
export function generateSyncReport(result: SyncResult): string {
  const lines = [
    '# Linear Context Sync Report',
    `**Timestamp**: ${result.timestamp.toISOString()}`,
    `**Status**: ${result.success ? '✅ Success' : '❌ Failed'}`,
    '',
    '## Summary',
    `- **Synced**: ${result.synced.length} issues`,
    `- **Skipped**: ${result.skipped.length} issues`,
    `- **Failed**: ${result.failed.length} issues`,
    '',
  ];

  if (result.synced.length > 0) {
    lines.push('## Synced Issues');
    result.synced.forEach(id => lines.push(`- ✅ ${id}`));
    lines.push('');
  }

  if (result.skipped.length > 0) {
    lines.push('## Skipped Issues');
    result.skipped.forEach(id => lines.push(`- ⏭️ ${id}`));
    lines.push('');
  }

  if (result.failed.length > 0) {
    lines.push('## Failed Issues');
    result.errors.forEach(({ identifier, error }) => {
      lines.push(`- ❌ ${identifier}: ${error}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}
