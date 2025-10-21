/**
 * Handoff Manager
 * Manages task handoffs between agents
 */

import type { AgentTask, AgentHandoff, AgentContext, IAgent } from '../core/types'
import { AgentRegistry } from '../core/agent-registry'
import { messageBus, MessageType } from './message-bus'

/**
 * Handoff Manager
 * Coordinates task delegation between agents
 */
export class HandoffManager {
  private static instance: HandoffManager
  private registry: AgentRegistry
  private pendingHandoffs: Map<string, AgentHandoff> = new Map()
  private handoffHistory: AgentHandoff[] = []

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
  }
}

/**
 * Singleton instance
 */
export const handoffManager = HandoffManager.getInstance()
