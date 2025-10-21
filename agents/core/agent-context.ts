/**
 * Agent Context
 * Manages shared context and state across agents
 */

import type { AgentContext, AgentMessage } from './types'

/**
 * Context Manager
 * Manages execution context for agents
 */
export class AgentContextManager {
  private contexts: Map<string, AgentContext> = new Map()

  /**
   * Create a new context
   */
  createContext(
    sessionId: string,
    initialData?: Partial<AgentContext>
  ): AgentContext {
    const context: AgentContext = {
      sessionId,
      history: [],
      metadata: {},
      ...initialData,
    }

    this.contexts.set(sessionId, context)
    console.log(`[ContextManager] Created context: ${sessionId}`)

    return context
  }

  /**
   * Get context by session ID
   */
  getContext(sessionId: string): AgentContext | undefined {
    return this.contexts.get(sessionId)
  }

  /**
   * Update context
   */
  updateContext(sessionId: string, updates: Partial<AgentContext>): void {
    const context = this.contexts.get(sessionId)
    if (!context) {
      throw new Error(`Context not found: ${sessionId}`)
    }

    Object.assign(context, updates)
    this.contexts.set(sessionId, context)
  }

  /**
   * Add message to context history
   */
  addMessage(sessionId: string, message: AgentMessage): void {
    const context = this.contexts.get(sessionId)
    if (!context) {
      throw new Error(`Context not found: ${sessionId}`)
    }

    if (!context.history) {
      context.history = []
    }

    context.history.push(message)
    this.contexts.set(sessionId, context)
  }

  /**
   * Get context history
   */
  getHistory(sessionId: string): AgentMessage[] {
    const context = this.contexts.get(sessionId)
    return context?.history || []
  }

  /**
   * Clear context history
   */
  clearHistory(sessionId: string): void {
    const context = this.contexts.get(sessionId)
    if (context) {
      context.history = []
      this.contexts.set(sessionId, context)
    }
  }

  /**
   * Delete context
   */
  deleteContext(sessionId: string): void {
    this.contexts.delete(sessionId)
    console.log(`[ContextManager] Deleted context: ${sessionId}`)
  }

  /**
   * Get all active contexts
   */
  getAllContexts(): AgentContext[] {
    return Array.from(this.contexts.values())
  }

  /**
   * Clear all contexts
   */
  clearAll(): void {
    this.contexts.clear()
    console.log('[ContextManager] Cleared all contexts')
  }

  /**
   * Get context count
   */
  getCount(): number {
    return this.contexts.size
  }
}

/**
 * Singleton instance
 */
export const contextManager = new AgentContextManager()
