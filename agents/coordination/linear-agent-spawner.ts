/**
 * Claude Code Agent Spawner for Linear Issues
 *
 * This module orchestrates the spawning of Claude Code terminal instances
 * for Linear issue implementation tasks. Each Linear issue gets:
 * - An isolated git worktree workspace
 * - A dedicated Claude Code terminal instance
 * - Full MAS Framework compliance (A2A communication, handoffs, etc.)
 *
 * Usage:
 * ```typescript
 * const spawner = LinearAgentSpawner.getInstance()
 *
 * // Spawn agent for a single Linear issue
 * await spawner.spawnAgentForIssue({
 *   issueId: 'ONEK-123',
 *   title: 'Implement user authentication',
 *   description: 'Add login/logout functionality',
 *   agentType: 'backend-developer',
 *   phase: 3,
 * })
 *
 * // Spawn agents for multiple issues in parallel
 * await spawner.spawnAgentsForIssues([...issues])
 * ```
 */

import { v4 as uuidv4 } from 'uuid'
import { handoffManager, type TerminalHandoffConfig } from './handoff-manager'
import { messageBus, MessageType } from './message-bus'
import { terminalManager, TerminalStatus, type TerminalInstance } from './terminal-manager'
import type { AgentTask, AgentContext } from '../core/types'

/**
 * Linear Issue Configuration
 */
export interface LinearIssueConfig {
  /** Linear issue ID (e.g., ONEK-123) */
  issueId: string
  /** Issue title */
  title: string
  /** Issue description */
  description?: string
  /** Agent type to handle the issue */
  agentType: string
  /** SDLC phase (1-9), defaults to 3 (implementation) */
  phase?: number
  /** Priority level */
  priority?: 'urgent' | 'high' | 'normal' | 'low'
  /** Labels from Linear */
  labels?: string[]
  /** Assignee from Linear */
  assignee?: string
  /** Custom branch name (defaults to feat/<issueId>-<slug>) */
  branch?: string
  /** Timeout in milliseconds */
  timeout?: number
}

/**
 * Agent Type to Phase Mapping
 * Maps agent types to their typical SDLC phases
 */
const AGENT_PHASE_MAP: Record<string, number> = {
  // Planning & Architecture
  'architect': 1,
  'system-architect': 1,
  'product-owner': 1,

  // Testing (TDD - RED phase)
  'qa': 2,
  'test-engineer': 2,
  'qa-engineer-seraph': 2,
  'tdd-orchestrator': 2,

  // Implementation (GREEN phase)
  'development': 3,
  'backend-developer': 3,
  'frontend-developer': 3,
  'fullstack-developer': 3,
  'api-engineer': 3,
  'database-engineer': 3,

  // Code Review
  'code-reviewer': 4,
  'code-review-coordinator': 4,
  'morpheus-validator': 4,

  // Iteration (REFACTOR phase)
  'refactor': 5,
  'performance-engineer': 5,
  'legacy-modernizer': 5,

  // PR & Merge
  'git-workflow': 6,
  'devops': 6,
  'deployment-engineer': 9,
}

/**
 * Generate a branch name from Linear issue
 */
function generateBranchName(issueId: string, title: string): string {
  // Create a slug from the title
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50)
    .replace(/-+$/, '')

  return `feat/${issueId.toLowerCase()}-${slug}`
}

/**
 * Build prompt for Claude Code agent
 */
function buildAgentPrompt(config: LinearIssueConfig): string {
  const parts = [
    `You are implementing Linear issue ${config.issueId}: "${config.title}"`,
    '',
    '## Context',
    `- Issue ID: ${config.issueId}`,
    `- Priority: ${config.priority || 'normal'}`,
    config.labels?.length ? `- Labels: ${config.labels.join(', ')}` : '',
    config.assignee ? `- Assignee: ${config.assignee}` : '',
    '',
    '## Task Description',
    config.description || 'No description provided.',
    '',
    '## Instructions',
    '1. Read the MAS-Framework.md and AGENTS.md files to understand project guidelines',
    '2. Follow the TDD workflow: RED (write failing tests) → GREEN (implement) → REFACTOR',
    '3. Use conventional commits (e.g., feat(ONEK-123): add authentication)',
    '4. Create a PR when implementation is complete',
    '5. Update the Linear issue status as you progress',
    '',
    '## Quality Requirements',
    '- All tests must pass',
    '- Code coverage must meet thresholds (75%+)',
    '- No TypeScript errors',
    '- Follow existing code patterns and conventions',
    '',
    'Begin by exploring the relevant codebase areas and understanding the requirements.',
  ]

  return parts.filter(Boolean).join('\n')
}

/**
 * Linear Agent Spawner
 * Orchestrates Claude Code terminal instances for Linear issues
 */
export class LinearAgentSpawner {
  private static instance: LinearAgentSpawner
  private activeSpawns: Map<string, TerminalInstance> = new Map() // issueId -> terminal

  private constructor() {
    // Subscribe to terminal events for tracking
    this.setupEventListeners()
  }

  /**
   * Get singleton instance
   */
  static getInstance(): LinearAgentSpawner {
    if (!LinearAgentSpawner.instance) {
      LinearAgentSpawner.instance = new LinearAgentSpawner()
    }
    return LinearAgentSpawner.instance
  }

  /**
   * Set up event listeners for terminal lifecycle
   */
  private setupEventListeners(): void {
    // Track terminal completions
    messageBus.subscribe(MessageType.TERMINAL_COMPLETED, async (message) => {
      const { linearIssueId, exitCode, output } = message.payload as any
      if (linearIssueId) {
        console.log(
          `[LinearAgentSpawner] Issue ${linearIssueId} completed with exit code ${exitCode}`
        )
        this.activeSpawns.delete(linearIssueId)

        // Could integrate with Linear API here to update issue status
        await this.onIssueComplete(linearIssueId, exitCode === 0, output)
      }
    })

    // Track terminal failures
    messageBus.subscribe(MessageType.TERMINAL_FAILED, async (message) => {
      const { linearIssueId, error, errors } = message.payload as any
      if (linearIssueId) {
        console.error(
          `[LinearAgentSpawner] Issue ${linearIssueId} failed: ${error}`
        )
        this.activeSpawns.delete(linearIssueId)

        await this.onIssueFailed(linearIssueId, error, errors)
      }
    })
  }

  /**
   * Spawn a Claude Code agent for a Linear issue
   */
  async spawnAgentForIssue(config: LinearIssueConfig): Promise<TerminalInstance> {
    const {
      issueId,
      title,
      description,
      agentType,
      phase = AGENT_PHASE_MAP[agentType] || 3,
      priority = 'normal',
      branch = generateBranchName(issueId, title),
      timeout = 30 * 60 * 1000, // 30 minutes default
    } = config

    console.log(`[LinearAgentSpawner] Spawning agent for ${issueId}: ${title}`)
    console.log(`[LinearAgentSpawner] Agent: ${agentType}, Phase: ${phase}, Branch: ${branch}`)

    // Check if already spawned
    if (this.activeSpawns.has(issueId)) {
      throw new Error(`Agent already spawned for issue: ${issueId}`)
    }

    // Create task
    const task: AgentTask = {
      id: `task-${issueId}-${Date.now()}`,
      type: 'linear_issue_implementation',
      payload: {
        linearIssueId: issueId,
        title,
        description,
        priority,
        labels: config.labels,
        assignee: config.assignee,
      },
      priority,
      status: 'pending',
      createdAt: new Date(),
    }

    // Build handoff configuration
    const handoffConfig: TerminalHandoffConfig = {
      linearIssueId: issueId,
      branch,
      phase,
      agentType,
      prompt: buildAgentPrompt(config),
      timeout,
      env: {
        LINEAR_ISSUE_ID: issueId,
        LINEAR_ISSUE_TITLE: title,
        LINEAR_ISSUE_PRIORITY: priority,
      },
    }

    // Create context
    const context: AgentContext = {
      requestId: `req-${issueId}-${Date.now()}`,
      sessionId: `session-${issueId}`,
      metadata: {
        linearIssueId: issueId,
        issueTitle: title,
        agentType,
        phase,
      },
    }

    // Spawn terminal via handoff manager
    const terminal = await handoffManager.handoffToTerminal(task, handoffConfig, context)

    // Track active spawn
    this.activeSpawns.set(issueId, terminal)

    // Publish spawn event
    await messageBus.publish({
      type: MessageType.TERMINAL_SPAWNED,
      sourceAgent: 'linear-agent-spawner',
      targetAgent: agentType,
      payload: {
        linearIssueId: issueId,
        terminalId: terminal.id,
        branch,
        phase,
        worktreePath: terminal.worktreePath,
      },
      context,
    })

    return terminal
  }

  /**
   * Spawn agents for multiple Linear issues in parallel
   */
  async spawnAgentsForIssues(
    issues: LinearIssueConfig[]
  ): Promise<Map<string, TerminalInstance>> {
    console.log(
      `[LinearAgentSpawner] Spawning agents for ${issues.length} issues`
    )

    const results = new Map<string, TerminalInstance>()
    const errors: Array<{ issueId: string; error: Error }> = []

    // Spawn in parallel
    const promises = issues.map(async (issue) => {
      try {
        const terminal = await this.spawnAgentForIssue(issue)
        results.set(issue.issueId, terminal)
      } catch (error) {
        errors.push({ issueId: issue.issueId, error: error as Error })
        console.error(
          `[LinearAgentSpawner] Failed to spawn for ${issue.issueId}:`,
          error
        )
      }
    })

    await Promise.allSettled(promises)

    console.log(
      `[LinearAgentSpawner] Spawned ${results.size}/${issues.length} agents`
    )
    if (errors.length > 0) {
      console.error(
        `[LinearAgentSpawner] ${errors.length} spawn failures:`,
        errors.map((e) => e.issueId).join(', ')
      )
    }

    return results
  }

  /**
   * Get active spawn for an issue
   */
  getActiveSpawn(issueId: string): TerminalInstance | undefined {
    return this.activeSpawns.get(issueId)
  }

  /**
   * Get all active spawns
   */
  getAllActiveSpawns(): Map<string, TerminalInstance> {
    return new Map(this.activeSpawns)
  }

  /**
   * Terminate spawn for an issue
   */
  async terminateSpawn(issueId: string, reason?: string): Promise<void> {
    const terminal = this.activeSpawns.get(issueId)
    if (!terminal) {
      throw new Error(`No active spawn for issue: ${issueId}`)
    }

    await terminalManager.terminateTerminal(terminal.id, reason)
    this.activeSpawns.delete(issueId)
  }

  /**
   * Terminate all spawns
   */
  async terminateAllSpawns(reason?: string): Promise<void> {
    const issues = Array.from(this.activeSpawns.keys())
    await Promise.all(issues.map((id) => this.terminateSpawn(id, reason)))
  }

  /**
   * Get spawner statistics
   */
  getStats(): {
    activeSpawns: number
    byPhase: Record<number, number>
    byAgentType: Record<string, number>
  } {
    const byPhase: Record<number, number> = {}
    const byAgentType: Record<string, number> = {}

    Array.from(this.activeSpawns.values()).forEach((terminal) => {
      const phase = terminal.config.phase
      const agentType = terminal.config.agentType

      byPhase[phase] = (byPhase[phase] || 0) + 1
      byAgentType[agentType] = (byAgentType[agentType] || 0) + 1
    })

    return {
      activeSpawns: this.activeSpawns.size,
      byPhase,
      byAgentType,
    }
  }

  /**
   * Called when an issue implementation completes
   * Override or extend for custom behavior
   */
  protected async onIssueComplete(
    issueId: string,
    success: boolean,
    output: string[]
  ): Promise<void> {
    console.log(
      `[LinearAgentSpawner] Issue ${issueId} implementation ${success ? 'succeeded' : 'completed with errors'}`
    )

    // TODO: Integrate with Linear API to update issue status
    // await linearClient.updateIssueState(issueId, success ? 'Done' : 'Review')

    // Could trigger next phase (e.g., code review after implementation)
    // if (success) {
    //   await this.spawnAgentForIssue({
    //     issueId,
    //     title: `Code review for ${issueId}`,
    //     agentType: 'code-reviewer',
    //     phase: 4,
    //   })
    // }
  }

  /**
   * Called when an issue implementation fails
   * Override or extend for custom behavior
   */
  protected async onIssueFailed(
    issueId: string,
    error: string,
    errors: string[]
  ): Promise<void> {
    console.error(
      `[LinearAgentSpawner] Issue ${issueId} implementation failed: ${error}`
    )

    // TODO: Integrate with Linear API to add comment about failure
    // await linearClient.createComment(issueId, `Implementation failed: ${error}`)

    // Could notify team or retry
  }

  /**
   * Reset spawner (useful for testing)
   */
  reset(): void {
    this.activeSpawns.clear()
  }
}

/**
 * Singleton instance
 */
export const linearAgentSpawner = LinearAgentSpawner.getInstance()

/**
 * Convenience function to spawn agent for Linear issue
 */
export async function spawnAgentForLinearIssue(
  config: LinearIssueConfig
): Promise<TerminalInstance> {
  return linearAgentSpawner.spawnAgentForIssue(config)
}

/**
 * Convenience function to spawn agents for multiple Linear issues
 */
export async function spawnAgentsForLinearIssues(
  issues: LinearIssueConfig[]
): Promise<Map<string, TerminalInstance>> {
  return linearAgentSpawner.spawnAgentsForIssues(issues)
}
