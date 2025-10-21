/**
 * Agent Message Bus
 * Internal message bus for agent-to-agent communication
 */

import EventEmitter from 'events'
import type { AgentTask, AgentContext } from '../core/types'

/**
 * Message Types
 */
export enum MessageType {
  TASK_CREATED = 'task_created',
  TASK_STARTED = 'task_started',
  TASK_COMPLETED = 'task_completed',
  TASK_FAILED = 'task_failed',
  AGENT_HANDOFF = 'agent_handoff',
  CONTEXT_UPDATE = 'context_update',
  ERROR = 'error',
}

/**
 * Agent Message
 */
export interface AgentBusMessage {
  id: string
  type: MessageType
  sourceAgent: string
  targetAgent?: string
  payload: unknown
  timestamp: Date
  context?: AgentContext
}

/**
 * Message Handler
 */
export type MessageHandler = (message: AgentBusMessage) => Promise<void> | void

/**
 * Agent Message Bus
 * Facilitates communication between agents
 */
export class AgentMessageBus extends EventEmitter {
  private static instance: AgentMessageBus
  private handlers: Map<string, Set<MessageHandler>> = new Map()
  private messageHistory: AgentBusMessage[] = []
  private maxHistorySize = 1000

  private constructor() {
    super()
    this.setMaxListeners(100) // Support many agents
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AgentMessageBus {
    if (!AgentMessageBus.instance) {
      AgentMessageBus.instance = new AgentMessageBus()
    }
    return AgentMessageBus.instance
  }

  /**
   * Publish a message to the bus
   */
  async publish(message: Omit<AgentBusMessage, 'id' | 'timestamp'>): Promise<void> {
    const fullMessage: AgentBusMessage = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...message,
    }

    // Store in history
    this.addToHistory(fullMessage)

    // Log the message
    console.log(
      `[MessageBus] ${fullMessage.type}: ${fullMessage.sourceAgent} -> ${fullMessage.targetAgent || 'all'}`
    )

    // Emit to EventEmitter listeners
    this.emit(fullMessage.type, fullMessage)

    // Call registered handlers
    await this.callHandlers(fullMessage)
  }

  /**
   * Subscribe to specific message types
   */
  subscribe(type: MessageType | string, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }

    this.handlers.get(type)!.add(handler)

    // Return unsubscribe function
    return () => {
      this.handlers.get(type)?.delete(handler)
    }
  }

  /**
   * Subscribe to all messages from a specific agent
   */
  subscribeToAgent(agentId: string, handler: MessageHandler): () => void {
    const wrappedHandler = async (message: AgentBusMessage) => {
      if (
        message.sourceAgent === agentId ||
        message.targetAgent === agentId
      ) {
        await handler(message)
      }
    }

    // Subscribe to all message types
    const unsubscribers = Object.values(MessageType).map((type) =>
      this.subscribe(type, wrappedHandler)
    )

    // Return combined unsubscribe function
    return () => {
      unsubscribers.forEach((unsub) => unsub())
    }
  }

  /**
   * Call registered handlers for a message
   */
  private async callHandlers(message: AgentBusMessage): Promise<void> {
    const handlers = this.handlers.get(message.type)
    if (!handlers) return

    const promises = Array.from(handlers).map((handler) => {
      try {
        return Promise.resolve(handler(message))
      } catch (error) {
        console.error('[MessageBus] Handler error:', error)
        return Promise.resolve()
      }
    })

    await Promise.allSettled(promises)
  }

  /**
   * Add message to history
   */
  private addToHistory(message: AgentBusMessage): void {
    this.messageHistory.push(message)

    // Trim history if too large
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory = this.messageHistory.slice(-this.maxHistorySize)
    }
  }

  /**
   * Get message history
   */
  getHistory(filter?: {
    type?: MessageType
    sourceAgent?: string
    targetAgent?: string
    since?: Date
  }): AgentBusMessage[] {
    let history = [...this.messageHistory]

    if (filter) {
      if (filter.type) {
        history = history.filter((msg) => msg.type === filter.type)
      }
      if (filter.sourceAgent) {
        history = history.filter((msg) => msg.sourceAgent === filter.sourceAgent)
      }
      if (filter.targetAgent) {
        history = history.filter((msg) => msg.targetAgent === filter.targetAgent)
      }
      if (filter.since) {
        history = history.filter((msg) => msg.timestamp >= filter.since!)
      }
    }

    return history
  }

  /**
   * Clear message history
   */
  clearHistory(): void {
    this.messageHistory = []
  }

  /**
   * Get bus statistics
   */
  getStats(): {
    totalMessages: number
    messagesByType: Record<string, number>
    activeHandlers: number
  } {
    const messagesByType: Record<string, number> = {}

    for (const message of this.messageHistory) {
      messagesByType[message.type] = (messagesByType[message.type] || 0) + 1
    }

    const activeHandlers = Array.from(this.handlers.values()).reduce(
      (total, handlers) => total + handlers.size,
      0
    )

    return {
      totalMessages: this.messageHistory.length,
      messagesByType,
      activeHandlers,
    }
  }

  /**
   * Reset the message bus (useful for testing)
   */
  reset(): void {
    this.removeAllListeners()
    this.handlers.clear()
    this.messageHistory = []
  }
}

/**
 * Singleton instance
 */
export const messageBus = AgentMessageBus.getInstance()
