/**
 * Handoff Manager
 * Manages task handoffs between agents
 *
 * Enhanced with terminal-based handoffs for Claude Code orchestration:
 * - Supports spawning new Claude Code terminal instances for agent isolation
 * - Integrates with git worktree workspace management
 * - Tracks Linear issues across terminal instances
 */

import type { AgentTask, AgentHandoff, AgentContext, IAgent } from '../core/types'
import { AgentRegistry } from '../core/agent-registry'
import { messageBus, MessageType } from './message-bus'
import { terminalManager, type TerminalConfig, TerminalStatus, type TerminalInstance } from './terminal-manager'

/**
 * Terminal Handoff Configuration
 */
export interface TerminalHandoffConfig {
  /** Linear issue ID (e.g., ONEK-123) */
  linearIssueId?: string
  /** Branch name for git worktree */
  branch: string
  /** SDLC phase (1-9) */
  phase: number
  /** Agent type to run */
  agentType: string
  /** Initial prompt/task for the agent */
  prompt: string
  /** Timeout in milliseconds */
  timeout?: number
  /** Environment variables */
  env?: Record<string, string>
}

/**
 * Handoff Manager
 * Coordinates task delegation between agents
 */
export class HandoffManager {
  private static instance: HandoffManager
  private registry: AgentRegistry
  private pendingHandoffs: Map<string, AgentHandoff> = new Map()
  private handoffHistory: AgentHandoff[] = []
  private terminalHandoffs: Map<string, TerminalInstance> = new Map() // taskId -> terminal

  private constructor() {
    this.registry = AgentRegistry.getInstance()
  }

  /**
   * Get singleton instance
   */
  static getInstance(): HandoffManager {
    if (!HandoffManager.instance) {
      HandoffManager.instance = new HandoffManager()
    }
    return HandoffManager.instance
  }

  /**
   * Handoff task from one agent to another
   */
  async handoff(handoff: AgentHandoff): Promise<void> {
    const { fromAgent, toAgent, task, context, reason } = handoff

    console.log(
      `[HandoffManager] Handoff request: ${fromAgent} -> ${toAgent} (Task: ${task.id})`
    )
    console.log(`[HandoffManager] Reason: ${reason}`)

    // Validate target agent exists
    const targetAgent = this.registry.getAgent(toAgent)
    if (!targetAgent) {
      throw new Error(`Target agent not found: ${toAgent}`)
    }

    // Store pending handoff
    this.pendingHandoffs.set(task.id, handoff)

    // Update task
    task.sourceAgent = fromAgent
    task.targetAgent = toAgent
    task.status = 'pending'

    // Publish handoff message
    await messageBus.publish({
      type: MessageType.AGENT_HANDOFF,
      sourceAgent: fromAgent,
      targetAgent: toAgent,
      payload: {
        handoff,
        task,
      },
      context,
    })

    // Store in history
    this.handoffHistory.push(handoff)

    console.log(`[HandoffManager] Handoff completed: Task ${task.id} transferred`)
  }

  /**
   * Accept a handoff and execute the task
   */
  async acceptHandoff(taskId: string, agentId: string): Promise<AgentTask> {
    const handoff = this.pendingHandoffs.get(taskId)

    if (!handoff) {
      throw new Error(`No pending handoff found for task: ${taskId}`)
    }

    if (handoff.toAgent !== agentId) {
      throw new Error(
        `Agent ${agentId} is not the intended recipient of task ${taskId}`
      )
    }

    // Remove from pending
    this.pendingHandoffs.delete(taskId)

    // Update task status
    handoff.task.status = 'in_progress'

    console.log(`[HandoffManager] Handoff accepted by ${agentId} for task ${taskId}`)

    return handoff.task
  }

  /**
   * Reject a handoff
   */
  async rejectHandoff(taskId: string, agentId: string, reason: string): Promise<void> {
    const handoff = this.pendingHandoffs.get(taskId)

    if (!handoff) {
      throw new Error(`No pending handoff found for task: ${taskId}`)
    }

    if (handoff.toAgent !== agentId) {
      throw new Error(
        `Agent ${agentId} is not the intended recipient of task ${taskId}`
      )
    }

    // Remove from pending
    this.pendingHandoffs.delete(taskId)

    // Update task status
    handoff.task.status = 'failed'
    handoff.task.error = new Error(`Handoff rejected: ${reason}`)

    // Publish rejection message
    await messageBus.publish({
      type: MessageType.TASK_FAILED,
      sourceAgent: agentId,
      targetAgent: handoff.fromAgent,
      payload: {
        taskId,
        reason,
      },
      context: handoff.context,
    })

    console.log(
      `[HandoffManager] Handoff rejected by ${agentId} for task ${taskId}: ${reason}`
    )
  }

  /**
   * Get pending handoffs for an agent
   */
  getPendingHandoffs(agentId: string): AgentHandoff[] {
    return Array.from(this.pendingHandoffs.values()).filter(
      (handoff) => handoff.toAgent === agentId
    )
  }

  /**
   * Get handoff history
   */
  getHistory(filter?: { fromAgent?: string; toAgent?: string }): AgentHandoff[] {
    let history = [...this.handoffHistory]

    if (filter) {
      if (filter.fromAgent) {
        history = history.filter((h) => h.fromAgent === filter.fromAgent)
      }
      if (filter.toAgent) {
        history = history.filter((h) => h.toAgent === filter.toAgent)
      }
    }

    return history
  }

  /**
   * Get handoff statistics
   */
  getStats(): {
    totalHandoffs: number
    pendingHandoffs: number
    handoffsByAgent: Record<string, { sent: number; received: number }>
  } {
    const handoffsByAgent: Record<string, { sent: number; received: number }> = {}

    for (const handoff of this.handoffHistory) {
      if (!handoffsByAgent[handoff.fromAgent]) {
        handoffsByAgent[handoff.fromAgent] = { sent: 0, received: 0 }
      }
      if (!handoffsByAgent[handoff.toAgent]) {
        handoffsByAgent[handoff.toAgent] = { sent: 0, received: 0 }
      }

      handoffsByAgent[handoff.fromAgent].sent++
      handoffsByAgent[handoff.toAgent].received++
    }

    return {
      totalHandoffs: this.handoffHistory.length,
      pendingHandoffs: this.pendingHandoffs.size,
      handoffsByAgent,
    }
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.handoffHistory = []
    console.log('[HandoffManager] Cleared handoff history')
  }

  /**
   * Reset manager (useful for testing)
   */
  reset(): void {
    this.pendingHandoffs.clear()
    this.handoffHistory = []
    this.terminalHandoffs.clear()
  }

  // ============================================
  // Terminal-based Handoff Methods
  // ============================================

  /**
   * Handoff task to a new Claude Code terminal instance
   *
   * This spawns a new Claude Code process in an isolated git worktree,
   * allowing parallel agent execution with workspace isolation.
   *
   * @param task - The task to delegate
   * @param config - Terminal configuration
   * @param context - Agent context
   * @returns The spawned terminal instance
   */
  async handoffToTerminal(
    task: AgentTask,
    config: TerminalHandoffConfig,
    context: AgentContext
  ): Promise<TerminalInstance> {
    console.log(
      `[HandoffManager] Terminal handoff request: Task ${task.id} -> ${config.agentType}`
    )
    console.log(`[HandoffManager] Linear Issue: ${config.linearIssueId || 'N/A'}`)
    console.log(`[HandoffManager] Branch: ${config.branch}, Phase: ${config.phase}`)

    // Build terminal configuration
    const terminalConfig: TerminalConfig = {
      linearIssueId: config.linearIssueId,
      branch: config.branch,
      phase: config.phase,
      agentType: config.agentType,
      prompt: config.prompt,
      timeout: config.timeout || 30 * 60 * 1000, // 30 minutes default
      env: {
        ...config.env,
        TASK_ID: task.id,
        REQUEST_ID: context.requestId || '',
        SESSION_ID: context.sessionId || '',
        USER_ID: context.userId || '',
      },
    }

    try {
      // Spawn terminal
      const terminal = await terminalManager.spawnTerminal(terminalConfig)

      // Track terminal by task
      this.terminalHandoffs.set(task.id, terminal)

      // Update task status
      task.status = 'in_progress'
      task.targetAgent = config.agentType

      // Publish terminal spawn event
      await messageBus.publish({
        type: MessageType.TERMINAL_SPAWNED,
        sourceAgent: 'handoff-manager',
        targetAgent: config.agentType,
        payload: {
          taskId: task.id,
          terminalId: terminal.id,
          linearIssueId: config.linearIssueId,
          branch: config.branch,
          phase: config.phase,
          worktreePath: terminal.worktreePath,
        },
        context,
      })

      // Set up terminal completion handler
      this.setupTerminalCompletionHandler(task, terminal, context)

      console.log(
        `[HandoffManager] Terminal spawned: ${terminal.id} (PID: ${terminal.pid})`
      )

      return terminal
    } catch (error) {
      task.status = 'failed'
      task.error = error as Error

      await messageBus.publish({
        type: MessageType.TERMINAL_FAILED,
        sourceAgent: 'handoff-manager',
        payload: {
          taskId: task.id,
          error: (error as Error).message,
        },
        context,
      })

      throw error
    }
  }

  /**
   * Set up completion handler for terminal
   */
  private setupTerminalCompletionHandler(
    task: AgentTask,
    terminal: TerminalInstance,
    context: AgentContext
  ): void {
    terminalManager.on('exit', async ({ terminalId, exitCode }) => {
      if (terminalId !== terminal.id) return

      task.completedAt = new Date()
      task.status = exitCode === 0 ? 'completed' : 'failed'

      // Remove from tracking
      this.terminalHandoffs.delete(task.id)

      await messageBus.publish({
        type: exitCode === 0 ? MessageType.TERMINAL_COMPLETED : MessageType.TERMINAL_FAILED,
        sourceAgent: 'handoff-manager',
        targetAgent: terminal.config.agentType,
        payload: {
          taskId: task.id,
          terminalId,
          exitCode,
          linearIssueId: terminal.config.linearIssueId,
          branch: terminal.config.branch,
          output: terminal.output,
          errors: terminal.errors,
        },
        context,
      })
    })
  }

  /**
   * Batch handoff multiple tasks to separate terminal instances
   *
   * Useful for parallel execution of independent Linear issues.
   *
   * @param tasks - Array of tasks with their configurations
   * @param context - Shared agent context
   * @returns Map of task IDs to terminal instances
   */
  async batchHandoffToTerminals(
    tasks: Array<{ task: AgentTask; config: TerminalHandoffConfig }>,
    context: AgentContext
  ): Promise<Map<string, TerminalInstance>> {
    console.log(
      `[HandoffManager] Batch terminal handoff: ${tasks.length} tasks`
    )

    const results = new Map<string, TerminalInstance>()

    // Spawn terminals in parallel
    const promises = tasks.map(async ({ task, config }) => {
      try {
        const terminal = await this.handoffToTerminal(task, config, context)
        results.set(task.id, terminal)
      } catch (error) {
        console.error(
          `[HandoffManager] Failed to spawn terminal for task ${task.id}:`,
          error
        )
      }
    })

    await Promise.allSettled(promises)

    console.log(
      `[HandoffManager] Batch handoff complete: ${results.size}/${tasks.length} terminals spawned`
    )

    return results
  }

  /**
   * Get terminal for a task
   */
  getTerminalForTask(taskId: string): TerminalInstance | undefined {
    return this.terminalHandoffs.get(taskId)
  }

  /**
   * Get all active terminal handoffs
   */
  getActiveTerminalHandoffs(): Map<string, TerminalInstance> {
    const active = new Map<string, TerminalInstance>()
    this.terminalHandoffs.forEach((terminal, taskId) => {
      if (terminal.status === TerminalStatus.RUNNING) {
        active.set(taskId, terminal)
      }
    })
    return active
  }

  /**
   * Terminate a terminal handoff
   */
  async terminateTerminalHandoff(taskId: string, reason?: string): Promise<void> {
    const terminal = this.terminalHandoffs.get(taskId)
    if (!terminal) {
      throw new Error(`No terminal found for task: ${taskId}`)
    }

    await terminalManager.terminateTerminal(terminal.id, reason)
    this.terminalHandoffs.delete(taskId)

    await messageBus.publish({
      type: MessageType.TERMINAL_TERMINATED,
      sourceAgent: 'handoff-manager',
      payload: {
        taskId,
        terminalId: terminal.id,
        reason,
      },
      context: {},
    })
  }

  /**
   * Get terminal handoff statistics
   */
  getTerminalStats(): {
    total: number
    running: number
    completed: number
    failed: number
  } {
    const terminals = Array.from(this.terminalHandoffs.values())
    return {
      total: terminals.length,
      running: terminals.filter((t) => t.status === TerminalStatus.RUNNING).length,
      completed: terminals.filter((t) => t.status === TerminalStatus.COMPLETED).length,
      failed: terminals.filter((t) => t.status === TerminalStatus.FAILED).length,
    }
  }
}

/**
 * Singleton instance
 */
export const handoffManager = HandoffManager.getInstance()
