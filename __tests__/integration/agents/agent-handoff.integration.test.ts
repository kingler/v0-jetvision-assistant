/**
 * Agent Handoff Integration Tests
 * 
 * Tests the agent handoff and task delegation workflow including:
 * - HandoffManager task delegation
 * - Agent-to-agent handoffs
 * - Task acceptance and rejection
 * - Handoff statistics and history
 * - Terminal-based handoffs (Claude Code orchestration)
 * 
 * @module __tests__/integration/agents/agent-handoff.integration.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { HandoffManager, handoffManager } from '@/agents/coordination/handoff-manager'
import { AgentRegistry } from '@/agents/core/agent-registry'
import { messageBus, MessageType } from '@/agents/coordination/message-bus'
import { AgentType, AgentStatus } from '@/agents/core/types'
import {
  createMockAgent,
  createMockAgentTask,
  createMockAgentContext,
  createMockFlightSearchTask,
} from '@tests/mocks/agents'

// Mock terminal manager to avoid actual spawning
vi.mock('@/agents/coordination/terminal-manager', () => ({
  terminalManager: {
    spawnTerminal: vi.fn().mockResolvedValue({
      id: 'terminal-test-123',
      pid: 12345,
      status: 'running',
      config: {},
      worktreePath: '/tmp/test-worktree',
      output: [],
      errors: [],
    }),
    terminateTerminal: vi.fn().mockResolvedValue(undefined),
    getTerminal: vi.fn(),
    on: vi.fn(),
  },
  TerminalStatus: {
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
  },
}))

describe('Agent Handoff Integration', () => {
  let registry: AgentRegistry

  beforeEach(() => {
    // Reset singletons for clean test state
    handoffManager.reset()
    messageBus.reset()
    
    // Get fresh registry instance
    registry = AgentRegistry.getInstance()
    registry.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ===========================================================================
  // Basic Handoff Tests
  // ===========================================================================

  describe('Basic Handoff Operations', () => {
    it('should successfully hand off task between agents', async () => {
      // Register mock agents
      const orchestrator = createMockAgent(AgentType.ORCHESTRATOR, { id: 'orchestrator-1' })
      const flightSearch = createMockAgent(AgentType.FLIGHT_SEARCH, { id: 'flight-search-1' })
      
      registry.register(orchestrator)
      registry.register(flightSearch)
      
      // Create task and context
      const task = createMockFlightSearchTask()
      const context = createMockAgentContext()
      
      // Perform handoff
      await handoffManager.handoff({
        fromAgent: orchestrator.id,
        toAgent: flightSearch.id,
        task,
        context,
        reason: 'Delegating flight search to specialized agent',
      })
      
      // Verify handoff is pending
      const pendingHandoffs = handoffManager.getPendingHandoffs(flightSearch.id)
      expect(pendingHandoffs).toHaveLength(1)
      expect(pendingHandoffs[0].task.id).toBe(task.id)
    })

    it('should throw error when target agent is not registered', async () => {
      const orchestrator = createMockAgent(AgentType.ORCHESTRATOR, { id: 'orchestrator-1' })
      registry.register(orchestrator)
      
      const task = createMockAgentTask()
      const context = createMockAgentContext()
      
      // Attempt handoff to non-existent agent
      await expect(
        handoffManager.handoff({
          fromAgent: orchestrator.id,
          toAgent: 'non-existent-agent',
          task,
          context,
          reason: 'Test handoff',
        })
      ).rejects.toThrow('Target agent not found')
    })

    it('should update task status on handoff', async () => {
      const orchestrator = createMockAgent(AgentType.ORCHESTRATOR, { id: 'orchestrator-1' })
      const flightSearch = createMockAgent(AgentType.FLIGHT_SEARCH, { id: 'flight-search-1' })
      
      registry.register(orchestrator)
      registry.register(flightSearch)
      
      const task = createMockAgentTask({ status: 'in_progress' })
      const context = createMockAgentContext()
      
      await handoffManager.handoff({
        fromAgent: orchestrator.id,
        toAgent: flightSearch.id,
        task,
        context,
        reason: 'Delegation',
      })
      
      // Task should be marked pending for handoff
      expect(task.status).toBe('pending')
      expect(task.sourceAgent).toBe(orchestrator.id)
      expect(task.targetAgent).toBe(flightSearch.id)
    })
  })

  // ===========================================================================
  // Handoff Acceptance/Rejection Tests
  // ===========================================================================

  describe('Handoff Acceptance and Rejection', () => {
    it('should allow target agent to accept handoff', async () => {
      const orchestrator = createMockAgent(AgentType.ORCHESTRATOR, { id: 'orchestrator-1' })
      const flightSearch = createMockAgent(AgentType.FLIGHT_SEARCH, { id: 'flight-search-1' })
      
      registry.register(orchestrator)
      registry.register(flightSearch)
      
      const task = createMockAgentTask()
      const context = createMockAgentContext()
      
      // Create handoff
      await handoffManager.handoff({
        fromAgent: orchestrator.id,
        toAgent: flightSearch.id,
        task,
        context,
        reason: 'Test handoff',
      })
      
      // Accept handoff
      const acceptedTask = await handoffManager.acceptHandoff(task.id, flightSearch.id)
      
      expect(acceptedTask.id).toBe(task.id)
      expect(acceptedTask.status).toBe('in_progress')
      
      // Should no longer be in pending
      const pendingHandoffs = handoffManager.getPendingHandoffs(flightSearch.id)
      expect(pendingHandoffs).toHaveLength(0)
    })

    it('should reject handoff acceptance from wrong agent', async () => {
      const orchestrator = createMockAgent(AgentType.ORCHESTRATOR, { id: 'orchestrator-1' })
      const flightSearch = createMockAgent(AgentType.FLIGHT_SEARCH, { id: 'flight-search-1' })
      const wrongAgent = createMockAgent(AgentType.CLIENT_DATA, { id: 'client-data-1' })
      
      registry.register(orchestrator)
      registry.register(flightSearch)
      registry.register(wrongAgent)
      
      const task = createMockAgentTask()
      const context = createMockAgentContext()
      
      await handoffManager.handoff({
        fromAgent: orchestrator.id,
        toAgent: flightSearch.id,
        task,
        context,
        reason: 'Test handoff',
      })
      
      // Wrong agent tries to accept
      await expect(
        handoffManager.acceptHandoff(task.id, wrongAgent.id)
      ).rejects.toThrow('not the intended recipient')
    })

    it('should allow target agent to reject handoff with reason', async () => {
      const orchestrator = createMockAgent(AgentType.ORCHESTRATOR, { id: 'orchestrator-1' })
      const flightSearch = createMockAgent(AgentType.FLIGHT_SEARCH, { id: 'flight-search-1' })
      
      registry.register(orchestrator)
      registry.register(flightSearch)
      
      const task = createMockAgentTask()
      const context = createMockAgentContext()
      
      await handoffManager.handoff({
        fromAgent: orchestrator.id,
        toAgent: flightSearch.id,
        task,
        context,
        reason: 'Test handoff',
      })
      
      // Reject handoff
      await handoffManager.rejectHandoff(
        task.id,
        flightSearch.id,
        'Agent is currently overloaded'
      )
      
      // Task should be marked failed
      expect(task.status).toBe('failed')
      expect(task.error?.message).toContain('rejected')
      
      // Should no longer be in pending
      const pendingHandoffs = handoffManager.getPendingHandoffs(flightSearch.id)
      expect(pendingHandoffs).toHaveLength(0)
    })

    it('should throw error when accepting non-existent handoff', async () => {
      const flightSearch = createMockAgent(AgentType.FLIGHT_SEARCH, { id: 'flight-search-1' })
      registry.register(flightSearch)
      
      await expect(
        handoffManager.acceptHandoff('non-existent-task', flightSearch.id)
      ).rejects.toThrow('No pending handoff found')
    })
  })

  // ===========================================================================
  // Handoff History and Statistics Tests
  // ===========================================================================

  describe('Handoff History and Statistics', () => {
    it('should track handoff history', async () => {
      const orchestrator = createMockAgent(AgentType.ORCHESTRATOR, { id: 'orchestrator-1' })
      const flightSearch = createMockAgent(AgentType.FLIGHT_SEARCH, { id: 'flight-search-1' })
      const clientData = createMockAgent(AgentType.CLIENT_DATA, { id: 'client-data-1' })
      
      registry.register(orchestrator)
      registry.register(flightSearch)
      registry.register(clientData)
      
      const context = createMockAgentContext()
      
      // Perform multiple handoffs
      await handoffManager.handoff({
        fromAgent: orchestrator.id,
        toAgent: flightSearch.id,
        task: createMockAgentTask({ id: 'task-1' }),
        context,
        reason: 'Flight search delegation',
      })
      
      await handoffManager.handoff({
        fromAgent: orchestrator.id,
        toAgent: clientData.id,
        task: createMockAgentTask({ id: 'task-2' }),
        context,
        reason: 'Client data lookup',
      })
      
      // Get full history
      const history = handoffManager.getHistory()
      expect(history).toHaveLength(2)
      
      // Filter by source agent
      const orchestratorHistory = handoffManager.getHistory({ fromAgent: orchestrator.id })
      expect(orchestratorHistory).toHaveLength(2)
      
      // Filter by target agent
      const flightSearchHistory = handoffManager.getHistory({ toAgent: flightSearch.id })
      expect(flightSearchHistory).toHaveLength(1)
    })

    it('should calculate handoff statistics', async () => {
      const orchestrator = createMockAgent(AgentType.ORCHESTRATOR, { id: 'orchestrator-1' })
      const flightSearch = createMockAgent(AgentType.FLIGHT_SEARCH, { id: 'flight-search-1' })
      
      registry.register(orchestrator)
      registry.register(flightSearch)
      
      const context = createMockAgentContext()
      
      // Create some handoffs
      await handoffManager.handoff({
        fromAgent: orchestrator.id,
        toAgent: flightSearch.id,
        task: createMockAgentTask({ id: 'task-1' }),
        context,
        reason: 'Test 1',
      })
      
      await handoffManager.handoff({
        fromAgent: orchestrator.id,
        toAgent: flightSearch.id,
        task: createMockAgentTask({ id: 'task-2' }),
        context,
        reason: 'Test 2',
      })
      
      // Accept one
      await handoffManager.acceptHandoff('task-1', flightSearch.id)
      
      const stats = handoffManager.getStats()
      
      expect(stats.totalHandoffs).toBe(2)
      expect(stats.pendingHandoffs).toBe(1)
      expect(stats.handoffsByAgent[orchestrator.id].sent).toBe(2)
      expect(stats.handoffsByAgent[flightSearch.id].received).toBe(2)
    })

    it('should clear handoff history', async () => {
      const orchestrator = createMockAgent(AgentType.ORCHESTRATOR, { id: 'orchestrator-1' })
      const flightSearch = createMockAgent(AgentType.FLIGHT_SEARCH, { id: 'flight-search-1' })
      
      registry.register(orchestrator)
      registry.register(flightSearch)
      
      const context = createMockAgentContext()
      
      await handoffManager.handoff({
        fromAgent: orchestrator.id,
        toAgent: flightSearch.id,
        task: createMockAgentTask(),
        context,
        reason: 'Test',
      })
      
      expect(handoffManager.getHistory()).toHaveLength(1)
      
      handoffManager.clearHistory()
      
      expect(handoffManager.getHistory()).toHaveLength(0)
    })
  })

  // ===========================================================================
  // Message Bus Integration Tests
  // ===========================================================================

  describe('Message Bus Integration', () => {
    it('should publish handoff message to message bus', async () => {
      const publishSpy = vi.spyOn(messageBus, 'publish')
      
      const orchestrator = createMockAgent(AgentType.ORCHESTRATOR, { id: 'orchestrator-1' })
      const flightSearch = createMockAgent(AgentType.FLIGHT_SEARCH, { id: 'flight-search-1' })
      
      registry.register(orchestrator)
      registry.register(flightSearch)
      
      const task = createMockAgentTask()
      const context = createMockAgentContext()
      
      await handoffManager.handoff({
        fromAgent: orchestrator.id,
        toAgent: flightSearch.id,
        task,
        context,
        reason: 'Test handoff',
      })
      
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MessageType.AGENT_HANDOFF,
          sourceAgent: orchestrator.id,
          targetAgent: flightSearch.id,
        })
      )
    })

    it('should publish task failed message on rejection', async () => {
      const publishSpy = vi.spyOn(messageBus, 'publish')
      
      const orchestrator = createMockAgent(AgentType.ORCHESTRATOR, { id: 'orchestrator-1' })
      const flightSearch = createMockAgent(AgentType.FLIGHT_SEARCH, { id: 'flight-search-1' })
      
      registry.register(orchestrator)
      registry.register(flightSearch)
      
      const task = createMockAgentTask()
      const context = createMockAgentContext()
      
      await handoffManager.handoff({
        fromAgent: orchestrator.id,
        toAgent: flightSearch.id,
        task,
        context,
        reason: 'Test',
      })
      
      await handoffManager.rejectHandoff(task.id, flightSearch.id, 'Overloaded')
      
      // Should have published TASK_FAILED message
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MessageType.TASK_FAILED,
          sourceAgent: flightSearch.id,
          targetAgent: orchestrator.id,
        })
      )
    })
  })

  // ===========================================================================
  // Terminal Handoff Tests
  // ===========================================================================

  describe('Terminal-based Handoffs', () => {
    it('should spawn terminal for handoff', async () => {
      const { terminalManager } = await import('@/agents/coordination/terminal-manager')
      
      const task = createMockAgentTask()
      const context = createMockAgentContext()
      
      const terminal = await handoffManager.handoffToTerminal(
        task,
        {
          linearIssueId: 'ONEK-123',
          branch: 'feature/test',
          phase: 1,
          agentType: 'flight-search',
          prompt: 'Search for flights',
          timeout: 60000,
        },
        context
      )
      
      expect(terminalManager.spawnTerminal).toHaveBeenCalled()
      expect(terminal.id).toBe('terminal-test-123')
      expect(task.status).toBe('in_progress')
    })

    it('should track terminal by task ID', async () => {
      const task = createMockAgentTask({ id: 'task-terminal-1' })
      const context = createMockAgentContext()
      
      await handoffManager.handoffToTerminal(
        task,
        {
          branch: 'feature/test',
          phase: 1,
          agentType: 'flight-search',
          prompt: 'Test prompt',
        },
        context
      )
      
      const terminal = handoffManager.getTerminalForTask('task-terminal-1')
      expect(terminal).toBeDefined()
      expect(terminal?.id).toBe('terminal-test-123')
    })

    it('should batch handoff multiple tasks to terminals', async () => {
      const context = createMockAgentContext()
      
      const tasks = [
        {
          task: createMockAgentTask({ id: 'batch-task-1' }),
          config: {
            branch: 'feature/task1',
            phase: 1,
            agentType: 'flight-search',
            prompt: 'Task 1',
          },
        },
        {
          task: createMockAgentTask({ id: 'batch-task-2' }),
          config: {
            branch: 'feature/task2',
            phase: 2,
            agentType: 'proposal-analysis',
            prompt: 'Task 2',
          },
        },
      ]
      
      const results = await handoffManager.batchHandoffToTerminals(tasks, context)
      
      expect(results.size).toBe(2)
      expect(results.has('batch-task-1')).toBe(true)
      expect(results.has('batch-task-2')).toBe(true)
    })

    it('should get terminal handoff statistics', async () => {
      const task = createMockAgentTask()
      const context = createMockAgentContext()
      
      await handoffManager.handoffToTerminal(
        task,
        {
          branch: 'feature/test',
          phase: 1,
          agentType: 'test',
          prompt: 'Test',
        },
        context
      )
      
      const stats = handoffManager.getTerminalStats()
      
      expect(stats.total).toBeGreaterThanOrEqual(1)
      expect(stats.running).toBeGreaterThanOrEqual(0)
    })

    it('should terminate terminal handoff', async () => {
      const { terminalManager } = await import('@/agents/coordination/terminal-manager')
      
      const task = createMockAgentTask({ id: 'task-to-terminate' })
      const context = createMockAgentContext()
      
      await handoffManager.handoffToTerminal(
        task,
        {
          branch: 'feature/test',
          phase: 1,
          agentType: 'test',
          prompt: 'Test',
        },
        context
      )
      
      await handoffManager.terminateTerminalHandoff('task-to-terminate', 'User cancelled')
      
      expect(terminalManager.terminateTerminal).toHaveBeenCalledWith(
        'terminal-test-123',
        'User cancelled'
      )
    })

    it('should publish terminal spawn message', async () => {
      const publishSpy = vi.spyOn(messageBus, 'publish')
      
      const task = createMockAgentTask()
      const context = createMockAgentContext()
      
      await handoffManager.handoffToTerminal(
        task,
        {
          linearIssueId: 'ONEK-456',
          branch: 'feature/test',
          phase: 1,
          agentType: 'flight-search',
          prompt: 'Search flights',
        },
        context
      )
      
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MessageType.TERMINAL_SPAWNED,
          payload: expect.objectContaining({
            taskId: task.id,
            linearIssueId: 'ONEK-456',
            branch: 'feature/test',
          }),
        })
      )
    })
  })

  // ===========================================================================
  // Manager Reset Tests
  // ===========================================================================

  describe('Manager Reset', () => {
    it('should reset all state', async () => {
      const orchestrator = createMockAgent(AgentType.ORCHESTRATOR, { id: 'orchestrator-1' })
      const flightSearch = createMockAgent(AgentType.FLIGHT_SEARCH, { id: 'flight-search-1' })
      
      registry.register(orchestrator)
      registry.register(flightSearch)
      
      const context = createMockAgentContext()
      
      // Add some state
      await handoffManager.handoff({
        fromAgent: orchestrator.id,
        toAgent: flightSearch.id,
        task: createMockAgentTask(),
        context,
        reason: 'Test',
      })
      
      expect(handoffManager.getStats().totalHandoffs).toBe(1)
      
      // Reset
      handoffManager.reset()
      
      expect(handoffManager.getStats().totalHandoffs).toBe(0)
      expect(handoffManager.getStats().pendingHandoffs).toBe(0)
    })
  })
})
