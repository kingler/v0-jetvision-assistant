/**
 * Agent Message Bus Integration Tests
 * 
 * Tests the message bus pub/sub system including:
 * - Message publishing and subscription
 * - Message type filtering
 * - Agent-specific subscriptions
 * - Message history and statistics
 * - Handler error handling
 * 
 * @module __tests__/integration/agents/message-bus.integration.test
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest'
import { AgentMessageBus, messageBus, MessageType } from '@/agents/coordination/message-bus'
import type { AgentBusMessage, MessageHandler } from '@/agents/coordination/message-bus'
import { createMockAgentContext } from '@tests/mocks/agents'

describe('Agent Message Bus Integration', () => {
  beforeEach(() => {
    // Reset message bus for clean test state
    messageBus.reset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ===========================================================================
  // Basic Publish/Subscribe Tests
  // ===========================================================================

  describe('Basic Publish/Subscribe', () => {
    it('should publish and receive messages', async () => {
      const handler = vi.fn()
      
      // Subscribe to message type
      messageBus.subscribe(MessageType.TASK_CREATED, handler)
      
      // Publish message
      await messageBus.publish({
        type: MessageType.TASK_CREATED,
        sourceAgent: 'orchestrator-1',
        targetAgent: 'flight-search-1',
        payload: { taskId: 'task-1' },
        context: createMockAgentContext(),
      })
      
      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MessageType.TASK_CREATED,
          sourceAgent: 'orchestrator-1',
          payload: { taskId: 'task-1' },
        })
      )
    })

    it('should generate unique message IDs', async () => {
      const handler = vi.fn()
      
      messageBus.subscribe(MessageType.TASK_CREATED, handler)
      
      await messageBus.publish({
        type: MessageType.TASK_CREATED,
        sourceAgent: 'agent-1',
        payload: {},
      })
      
      await messageBus.publish({
        type: MessageType.TASK_CREATED,
        sourceAgent: 'agent-1',
        payload: {},
      })
      
      const calls = handler.mock.calls
      expect(calls[0][0].id).not.toBe(calls[1][0].id)
    })

    it('should add timestamp to messages', async () => {
      const handler = vi.fn()
      const beforeTime = new Date()
      
      messageBus.subscribe(MessageType.TASK_STARTED, handler)
      
      await messageBus.publish({
        type: MessageType.TASK_STARTED,
        sourceAgent: 'agent-1',
        payload: {},
      })
      
      const afterTime = new Date()
      const message = handler.mock.calls[0][0]
      
      expect(message.timestamp).toBeDefined()
      expect(message.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime())
      expect(message.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime())
    })

    it('should return unsubscribe function', async () => {
      const handler = vi.fn()
      
      const unsubscribe = messageBus.subscribe(MessageType.TASK_COMPLETED, handler)
      
      // First message
      await messageBus.publish({
        type: MessageType.TASK_COMPLETED,
        sourceAgent: 'agent-1',
        payload: {},
      })
      
      expect(handler).toHaveBeenCalledTimes(1)
      
      // Unsubscribe
      unsubscribe()
      
      // Second message
      await messageBus.publish({
        type: MessageType.TASK_COMPLETED,
        sourceAgent: 'agent-1',
        payload: {},
      })
      
      // Should still be 1 (not called after unsubscribe)
      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  // ===========================================================================
  // Message Type Filtering Tests
  // ===========================================================================

  describe('Message Type Filtering', () => {
    it('should only receive subscribed message types', async () => {
      const taskCreatedHandler = vi.fn()
      const taskCompletedHandler = vi.fn()
      
      messageBus.subscribe(MessageType.TASK_CREATED, taskCreatedHandler)
      messageBus.subscribe(MessageType.TASK_COMPLETED, taskCompletedHandler)
      
      // Publish TASK_CREATED
      await messageBus.publish({
        type: MessageType.TASK_CREATED,
        sourceAgent: 'agent-1',
        payload: {},
      })
      
      expect(taskCreatedHandler).toHaveBeenCalledTimes(1)
      expect(taskCompletedHandler).toHaveBeenCalledTimes(0)
      
      // Publish TASK_COMPLETED
      await messageBus.publish({
        type: MessageType.TASK_COMPLETED,
        sourceAgent: 'agent-1',
        payload: {},
      })
      
      expect(taskCreatedHandler).toHaveBeenCalledTimes(1)
      expect(taskCompletedHandler).toHaveBeenCalledTimes(1)
    })

    it('should support multiple handlers for same message type', async () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      const handler3 = vi.fn()
      
      messageBus.subscribe(MessageType.AGENT_HANDOFF, handler1)
      messageBus.subscribe(MessageType.AGENT_HANDOFF, handler2)
      messageBus.subscribe(MessageType.AGENT_HANDOFF, handler3)
      
      await messageBus.publish({
        type: MessageType.AGENT_HANDOFF,
        sourceAgent: 'agent-1',
        targetAgent: 'agent-2',
        payload: {},
      })
      
      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).toHaveBeenCalledTimes(1)
      expect(handler3).toHaveBeenCalledTimes(1)
    })

    it('should handle all message types', async () => {
      // Filter out 'error' type as EventEmitter treats it specially (throws if no handler)
      const allTypes = Object.values(MessageType).filter(t => t !== MessageType.ERROR)
      const handlers = new Map<string, Mock>()
      
      // Subscribe to all types
      for (const type of allTypes) {
        const handler = vi.fn()
        handlers.set(type, handler)
        messageBus.subscribe(type, handler)
      }
      
      // Publish each type
      for (const type of allTypes) {
        await messageBus.publish({
          type,
          sourceAgent: 'test-agent',
          payload: { type },
        })
      }
      
      // Verify each handler was called
      for (const type of allTypes) {
        expect(handlers.get(type)).toHaveBeenCalledTimes(1)
      }
    })

    it('should handle error message type with listener', async () => {
      // For 'error' type, EventEmitter requires at least one listener
      const errorHandler = vi.fn()
      
      // Must add listener before publishing error type
      messageBus.on(MessageType.ERROR, errorHandler)
      messageBus.subscribe(MessageType.ERROR, vi.fn())
      
      await messageBus.publish({
        type: MessageType.ERROR,
        sourceAgent: 'test-agent',
        payload: { error: 'test error' },
      })
      
      expect(errorHandler).toHaveBeenCalled()
    })
  })

  // ===========================================================================
  // Agent-Specific Subscription Tests
  // ===========================================================================

  describe('Agent-Specific Subscriptions', () => {
    it('should subscribe to all messages involving a specific agent', async () => {
      const agentHandler = vi.fn()
      
      messageBus.subscribeToAgent('flight-search-1', agentHandler)
      
      // Message from the agent
      await messageBus.publish({
        type: MessageType.TASK_COMPLETED,
        sourceAgent: 'flight-search-1',
        payload: { result: 'flights' },
      })
      
      expect(agentHandler).toHaveBeenCalledTimes(1)
      
      // Message to the agent
      await messageBus.publish({
        type: MessageType.AGENT_HANDOFF,
        sourceAgent: 'orchestrator-1',
        targetAgent: 'flight-search-1',
        payload: { task: 'search' },
      })
      
      expect(agentHandler).toHaveBeenCalledTimes(2)
      
      // Message not involving the agent
      await messageBus.publish({
        type: MessageType.TASK_FAILED,
        sourceAgent: 'other-agent',
        targetAgent: 'another-agent',
        payload: {},
      })
      
      // Should still be 2
      expect(agentHandler).toHaveBeenCalledTimes(2)
    })

    it('should return unsubscribe function for agent subscriptions', async () => {
      const agentHandler = vi.fn()
      
      const unsubscribe = messageBus.subscribeToAgent('agent-123', agentHandler)
      
      await messageBus.publish({
        type: MessageType.TASK_STARTED,
        sourceAgent: 'agent-123',
        payload: {},
      })
      
      expect(agentHandler).toHaveBeenCalledTimes(1)
      
      // Unsubscribe
      unsubscribe()
      
      await messageBus.publish({
        type: MessageType.TASK_STARTED,
        sourceAgent: 'agent-123',
        payload: {},
      })
      
      // Should still be 1
      expect(agentHandler).toHaveBeenCalledTimes(1)
    })
  })

  // ===========================================================================
  // Message History Tests
  // ===========================================================================

  describe('Message History', () => {
    it('should store messages in history', async () => {
      await messageBus.publish({
        type: MessageType.TASK_CREATED,
        sourceAgent: 'agent-1',
        payload: { taskId: 'task-1' },
      })
      
      await messageBus.publish({
        type: MessageType.TASK_STARTED,
        sourceAgent: 'agent-1',
        payload: { taskId: 'task-1' },
      })
      
      const history = messageBus.getHistory()
      
      expect(history).toHaveLength(2)
      expect(history[0].type).toBe(MessageType.TASK_CREATED)
      expect(history[1].type).toBe(MessageType.TASK_STARTED)
    })

    it('should filter history by message type', async () => {
      await messageBus.publish({
        type: MessageType.TASK_CREATED,
        sourceAgent: 'agent-1',
        payload: {},
      })
      
      await messageBus.publish({
        type: MessageType.TASK_COMPLETED,
        sourceAgent: 'agent-1',
        payload: {},
      })
      
      await messageBus.publish({
        type: MessageType.TASK_CREATED,
        sourceAgent: 'agent-2',
        payload: {},
      })
      
      const createdHistory = messageBus.getHistory({ type: MessageType.TASK_CREATED })
      
      expect(createdHistory).toHaveLength(2)
      expect(createdHistory.every(m => m.type === MessageType.TASK_CREATED)).toBe(true)
    })

    it('should filter history by source agent', async () => {
      await messageBus.publish({
        type: MessageType.TASK_STARTED,
        sourceAgent: 'agent-1',
        payload: {},
      })
      
      await messageBus.publish({
        type: MessageType.TASK_STARTED,
        sourceAgent: 'agent-2',
        payload: {},
      })
      
      await messageBus.publish({
        type: MessageType.TASK_COMPLETED,
        sourceAgent: 'agent-1',
        payload: {},
      })
      
      const agent1History = messageBus.getHistory({ sourceAgent: 'agent-1' })
      
      expect(agent1History).toHaveLength(2)
      expect(agent1History.every(m => m.sourceAgent === 'agent-1')).toBe(true)
    })

    it('should filter history by target agent', async () => {
      await messageBus.publish({
        type: MessageType.AGENT_HANDOFF,
        sourceAgent: 'orchestrator',
        targetAgent: 'flight-search',
        payload: {},
      })
      
      await messageBus.publish({
        type: MessageType.AGENT_HANDOFF,
        sourceAgent: 'orchestrator',
        targetAgent: 'client-data',
        payload: {},
      })
      
      const flightSearchHistory = messageBus.getHistory({ targetAgent: 'flight-search' })
      
      expect(flightSearchHistory).toHaveLength(1)
      expect(flightSearchHistory[0].targetAgent).toBe('flight-search')
    })

    it('should filter history by timestamp', async () => {
      const beforeTime = new Date()
      
      await messageBus.publish({
        type: MessageType.TASK_CREATED,
        sourceAgent: 'agent-1',
        payload: { order: 1 },
      })
      
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10))
      const midTime = new Date()
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      await messageBus.publish({
        type: MessageType.TASK_CREATED,
        sourceAgent: 'agent-1',
        payload: { order: 2 },
      })
      
      const recentHistory = messageBus.getHistory({ since: midTime })
      
      expect(recentHistory).toHaveLength(1)
      expect(recentHistory[0].payload).toEqual({ order: 2 })
    })

    it('should clear history', async () => {
      await messageBus.publish({
        type: MessageType.TASK_CREATED,
        sourceAgent: 'agent-1',
        payload: {},
      })
      
      expect(messageBus.getHistory()).toHaveLength(1)
      
      messageBus.clearHistory()
      
      expect(messageBus.getHistory()).toHaveLength(0)
    })

    it('should limit history size', async () => {
      // Publish more than max history size (1000)
      for (let i = 0; i < 1100; i++) {
        await messageBus.publish({
          type: MessageType.TASK_CREATED,
          sourceAgent: 'agent-1',
          payload: { index: i },
        })
      }
      
      const history = messageBus.getHistory()
      
      // Should be limited to maxHistorySize (1000)
      expect(history.length).toBeLessThanOrEqual(1000)
      
      // Should have the most recent messages (trimmed from front)
      const lastMessage = history[history.length - 1]
      expect(lastMessage.payload).toEqual({ index: 1099 })
    })
  })

  // ===========================================================================
  // Statistics Tests
  // ===========================================================================

  describe('Statistics', () => {
    it('should track total messages', async () => {
      await messageBus.publish({
        type: MessageType.TASK_CREATED,
        sourceAgent: 'agent-1',
        payload: {},
      })
      
      await messageBus.publish({
        type: MessageType.TASK_COMPLETED,
        sourceAgent: 'agent-1',
        payload: {},
      })
      
      const stats = messageBus.getStats()
      
      expect(stats.totalMessages).toBe(2)
    })

    it('should track messages by type', async () => {
      await messageBus.publish({
        type: MessageType.TASK_CREATED,
        sourceAgent: 'agent-1',
        payload: {},
      })
      
      await messageBus.publish({
        type: MessageType.TASK_CREATED,
        sourceAgent: 'agent-2',
        payload: {},
      })
      
      await messageBus.publish({
        type: MessageType.TASK_COMPLETED,
        sourceAgent: 'agent-1',
        payload: {},
      })
      
      const stats = messageBus.getStats()
      
      expect(stats.messagesByType[MessageType.TASK_CREATED]).toBe(2)
      expect(stats.messagesByType[MessageType.TASK_COMPLETED]).toBe(1)
    })

    it('should track active handlers', async () => {
      const initialStats = messageBus.getStats()
      const initialHandlers = initialStats.activeHandlers
      
      const unsub1 = messageBus.subscribe(MessageType.TASK_CREATED, vi.fn())
      const unsub2 = messageBus.subscribe(MessageType.TASK_COMPLETED, vi.fn())
      const unsub3 = messageBus.subscribe(MessageType.TASK_CREATED, vi.fn()) // Same type
      
      const afterSubStats = messageBus.getStats()
      expect(afterSubStats.activeHandlers).toBe(initialHandlers + 3)
      
      unsub1()
      unsub2()
      
      const afterUnsubStats = messageBus.getStats()
      expect(afterUnsubStats.activeHandlers).toBe(initialHandlers + 1)
      
      unsub3()
      
      const finalStats = messageBus.getStats()
      expect(finalStats.activeHandlers).toBe(initialHandlers)
    })
  })

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  describe('Error Handling', () => {
    it('should continue processing when handler throws error', async () => {
      const errorHandler = vi.fn().mockImplementation(() => {
        throw new Error('Handler error')
      })
      const successHandler = vi.fn()
      
      // Spy on console.error to suppress test output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      messageBus.subscribe(MessageType.TASK_CREATED, errorHandler)
      messageBus.subscribe(MessageType.TASK_CREATED, successHandler)
      
      await messageBus.publish({
        type: MessageType.TASK_CREATED,
        sourceAgent: 'agent-1',
        payload: {},
      })
      
      // Error handler was called
      expect(errorHandler).toHaveBeenCalledTimes(1)
      
      // Success handler was still called despite error
      expect(successHandler).toHaveBeenCalledTimes(1)
      
      consoleSpy.mockRestore()
    })

    it('should handle async handler errors', async () => {
      const asyncErrorHandler = vi.fn().mockRejectedValue(new Error('Async error'))
      const successHandler = vi.fn()
      
      // Spy on console.error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      messageBus.subscribe(MessageType.TASK_STARTED, asyncErrorHandler)
      messageBus.subscribe(MessageType.TASK_STARTED, successHandler)
      
      await messageBus.publish({
        type: MessageType.TASK_STARTED,
        sourceAgent: 'agent-1',
        payload: {},
      })
      
      expect(asyncErrorHandler).toHaveBeenCalledTimes(1)
      expect(successHandler).toHaveBeenCalledTimes(1)
      
      consoleSpy.mockRestore()
    })
  })

  // ===========================================================================
  // Event Emitter Integration Tests
  // ===========================================================================

  describe('Event Emitter Integration', () => {
    it('should emit events through EventEmitter', async () => {
      const emitHandler = vi.fn()
      
      messageBus.on(MessageType.TASK_FAILED, emitHandler)
      
      await messageBus.publish({
        type: MessageType.TASK_FAILED,
        sourceAgent: 'agent-1',
        payload: { error: 'Test error' },
      })
      
      expect(emitHandler).toHaveBeenCalledTimes(1)
      expect(emitHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MessageType.TASK_FAILED,
          payload: { error: 'Test error' },
        })
      )
    })

    it('should support once listeners', async () => {
      const onceHandler = vi.fn()
      
      messageBus.once(MessageType.CONTEXT_UPDATE, onceHandler)
      
      // First publish
      await messageBus.publish({
        type: MessageType.CONTEXT_UPDATE,
        sourceAgent: 'agent-1',
        payload: { context: 'first' },
      })
      
      // Second publish
      await messageBus.publish({
        type: MessageType.CONTEXT_UPDATE,
        sourceAgent: 'agent-1',
        payload: { context: 'second' },
      })
      
      // Should only be called once
      expect(onceHandler).toHaveBeenCalledTimes(1)
      expect(onceHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: { context: 'first' },
        })
      )
    })
  })

  // ===========================================================================
  // Terminal Events Tests
  // ===========================================================================

  describe('Terminal Lifecycle Events', () => {
    it('should handle terminal spawned events', async () => {
      const handler = vi.fn()
      
      messageBus.subscribe(MessageType.TERMINAL_SPAWNED, handler)
      
      await messageBus.publish({
        type: MessageType.TERMINAL_SPAWNED,
        sourceAgent: 'handoff-manager',
        targetAgent: 'flight-search',
        payload: {
          terminalId: 'term-123',
          taskId: 'task-456',
          linearIssueId: 'ONEK-789',
        },
      })
      
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MessageType.TERMINAL_SPAWNED,
          payload: expect.objectContaining({
            terminalId: 'term-123',
            linearIssueId: 'ONEK-789',
          }),
        })
      )
    })

    it('should handle terminal completed events', async () => {
      const handler = vi.fn()
      
      messageBus.subscribe(MessageType.TERMINAL_COMPLETED, handler)
      
      await messageBus.publish({
        type: MessageType.TERMINAL_COMPLETED,
        sourceAgent: 'handoff-manager',
        payload: {
          terminalId: 'term-123',
          exitCode: 0,
          output: ['Task completed successfully'],
        },
      })
      
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            exitCode: 0,
          }),
        })
      )
    })

    it('should handle terminal failed events', async () => {
      const handler = vi.fn()
      
      messageBus.subscribe(MessageType.TERMINAL_FAILED, handler)
      
      await messageBus.publish({
        type: MessageType.TERMINAL_FAILED,
        sourceAgent: 'handoff-manager',
        payload: {
          terminalId: 'term-123',
          exitCode: 1,
          errors: ['Process exited with error'],
        },
      })
      
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            exitCode: 1,
            errors: ['Process exited with error'],
          }),
        })
      )
    })
  })

  // ===========================================================================
  // Reset Tests
  // ===========================================================================

  describe('Reset', () => {
    it('should reset all state', async () => {
      // Add handlers
      messageBus.subscribe(MessageType.TASK_CREATED, vi.fn())
      messageBus.on(MessageType.TASK_COMPLETED, vi.fn())
      
      // Publish some messages
      await messageBus.publish({
        type: MessageType.TASK_CREATED,
        sourceAgent: 'agent-1',
        payload: {},
      })
      
      expect(messageBus.getHistory()).toHaveLength(1)
      expect(messageBus.getStats().activeHandlers).toBeGreaterThan(0)
      
      // Reset
      messageBus.reset()
      
      expect(messageBus.getHistory()).toHaveLength(0)
      expect(messageBus.getStats().activeHandlers).toBe(0)
      expect(messageBus.getStats().totalMessages).toBe(0)
    })
  })
})
