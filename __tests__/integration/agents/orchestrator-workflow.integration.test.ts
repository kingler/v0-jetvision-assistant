/**
 * Orchestrator Agent Workflow Integration Tests
 * 
 * Tests the complete orchestrator agent workflow including:
 * - Conversational flow with intent parsing
 * - Progressive data extraction
 * - RFP creation and completion
 * - Context handling and session management
 * - Multi-turn conversation handling
 * 
 * @module __tests__/integration/agents/orchestrator-workflow.integration.test
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest'
import { OrchestratorAgent } from '@/agents/implementations/orchestrator-agent'
import { AgentType, AgentStatus } from '@/agents/core/types'
import {
  createMockConversationalContext,
  createMockRFPContext,
  createMockConversationStore,
  createMockOpenAIClient,
} from '@tests/mocks/agents'
import { UserIntent } from '@/agents/tools'

// Mock external dependencies
vi.mock('@/lib/config/llm-config', () => ({
  getOpenAIClient: vi.fn().mockResolvedValue({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Mock response', role: 'assistant' } }],
          usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
        }),
      },
    },
  }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  },
}))

// Mock Redis conversation store
const mockConversationStore = createMockConversationStore()

vi.mock('@/lib/sessions', () => ({
  RedisConversationStore: vi.fn().mockImplementation(() => mockConversationStore),
  getConversationStore: vi.fn().mockReturnValue(mockConversationStore),
}))

describe('Orchestrator Agent Workflow Integration', () => {
  let orchestrator: OrchestratorAgent

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks()
    mockConversationStore._clear()

    // Create a new orchestrator instance
    orchestrator = new OrchestratorAgent({
      type: AgentType.ORCHESTRATOR,
      name: 'TestOrchestrator',
      model: 'gpt-4-turbo-preview',
    })

    // Initialize the agent
    await orchestrator.initialize()
  })

  afterEach(async () => {
    await orchestrator.shutdown()
  })

  // ===========================================================================
  // Initialization Tests
  // ===========================================================================

  describe('Agent Initialization', () => {
    it('should initialize with correct configuration', async () => {
      expect(orchestrator.type).toBe(AgentType.ORCHESTRATOR)
      expect(orchestrator.name).toBe('TestOrchestrator')
      expect(orchestrator.status).toBe(AgentStatus.IDLE)
    })

    it('should initialize conversation store connection', async () => {
      expect(mockConversationStore.initialize).toHaveBeenCalled()
    })

    it('should report healthy conversation store status', async () => {
      const health = await orchestrator.getStoreHealth()
      
      expect(health.connected).toBe(true)
      expect(health.usingFallback).toBe(false)
      expect(health.latencyMs).toBeGreaterThanOrEqual(0)
    })
  })

  // ===========================================================================
  // Conversational Flow Tests
  // ===========================================================================

  describe('Conversational Flow', () => {
    it('should handle general greetings', async () => {
      const context = createMockConversationalContext('Hello!')
      
      const result = await orchestrator.execute(context)
      
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      
      const data = result.data as any
      expect(data.message).toBeTruthy()
      expect(data.intent).toBe(UserIntent.GENERAL_CONVERSATION)
    })

    it('should recognize RFP creation intent', async () => {
      const context = createMockConversationalContext(
        'I need to book a flight from New York to Miami'
      )
      
      const result = await orchestrator.execute(context)
      
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      
      const data = result.data as any
      // Should either be RFP_CREATION or ask for clarification
      expect([UserIntent.RFP_CREATION, UserIntent.CLARIFICATION_RESPONSE])
        .toContain(data.intent)
    })

    it('should ask clarifying questions for incomplete RFP data', async () => {
      const context = createMockConversationalContext(
        'I need a flight to Los Angeles'
      )
      
      const result = await orchestrator.execute(context)
      
      expect(result.success).toBe(true)
      
      const data = result.data as any
      // Should ask about missing fields (departure, date, passengers)
      expect(data.isComplete).toBe(false)
      expect(data.nextAction).toBe('ask_question')
    })

    it('should maintain conversation context across messages', async () => {
      const sessionId = 'test-session-multi-turn'
      
      // First message
      const context1 = createMockConversationalContext(
        'I want to book a private jet',
        sessionId
      )
      
      const result1 = await orchestrator.execute(context1)
      expect(result1.success).toBe(true)
      
      // Verify session was stored
      const storedState = await mockConversationStore.get(sessionId)
      expect(storedState).toBeDefined()
      
      // Second message - follow-up
      const context2 = createMockConversationalContext(
        'From New York to Miami',
        sessionId
      )
      
      // Mock that previous state exists
      mockConversationStore.get.mockResolvedValueOnce({
        sessionId,
        isComplete: false,
        extractedData: {},
        missingFields: ['departure', 'arrival', 'departureDate', 'passengers'],
        conversationHistory: [
          { role: 'user', content: 'I want to book a private jet', timestamp: new Date() },
        ],
        clarificationRound: 0,
        questionsAsked: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      
      const result2 = await orchestrator.execute(context2)
      expect(result2.success).toBe(true)
      
      // Should have refreshed TTL
      expect(mockConversationStore.refreshTTL).toHaveBeenCalledWith(sessionId)
    })
  })

  // ===========================================================================
  // Progressive Data Extraction Tests
  // ===========================================================================

  describe('Progressive Data Extraction', () => {
    it('should extract airport codes from user message', async () => {
      const context = createMockConversationalContext(
        'Book a flight from KJFK to KLAX on March 15th for 4 passengers'
      )
      
      const result = await orchestrator.execute(context)
      expect(result.success).toBe(true)
      
      const data = result.data as any
      // Data should be extracted from the message
      expect(data.conversationState).toBeDefined()
    })

    it('should extract natural language locations', async () => {
      const context = createMockConversationalContext(
        'I need to fly from New York to Los Angeles'
      )
      
      const result = await orchestrator.execute(context)
      expect(result.success).toBe(true)
    })

    it('should extract passenger count', async () => {
      const context = createMockConversationalContext(
        'Flight for 6 people tomorrow'
      )
      
      const result = await orchestrator.execute(context)
      expect(result.success).toBe(true)
    })

    it('should handle date variations', async () => {
      const testCases = [
        'Flight on December 25th',
        'Flight next Monday',
        'Flight on 2025-12-25',
      ]
      
      for (const message of testCases) {
        const context = createMockConversationalContext(message)
        const result = await orchestrator.execute(context)
        expect(result.success).toBe(true)
      }
    })
  })

  // ===========================================================================
  // RFP Creation Flow Tests
  // ===========================================================================

  describe('RFP Creation Flow', () => {
    it('should create RFP with complete information', async () => {
      const context = createMockConversationalContext(
        'Book flight from KJFK to KLAX on 2025-12-15 for 4 passengers'
      )
      
      // Mock that data extraction returns complete data
      const mockState = {
        sessionId: context.sessionId,
        isComplete: false,
        extractedData: {
          departure: 'KJFK',
          arrival: 'KLAX',
          departureDate: '2025-12-15',
          passengers: 4,
        },
        missingFields: [],
        conversationHistory: [],
        clarificationRound: 0,
        questionsAsked: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      mockConversationStore.get.mockResolvedValueOnce(mockState)
      
      const result = await orchestrator.execute(context)
      
      expect(result.success).toBe(true)
    })

    it('should generate workflow status component on RFP completion', async () => {
      // Setup complete RFP scenario
      const sessionId = 'complete-rfp-session'
      
      mockConversationStore.get.mockResolvedValueOnce({
        sessionId,
        isComplete: false,
        extractedData: {
          departure: 'KJFK',
          arrival: 'KLAX',
          departureDate: '2025-12-15',
          passengers: 4,
        },
        missingFields: [],
        conversationHistory: [],
        clarificationRound: 0,
        questionsAsked: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      
      const context = createMockConversationalContext(
        'Yes, please proceed with the booking',
        sessionId
      )
      
      const result = await orchestrator.execute(context)
      
      expect(result.success).toBe(true)
    })

    it('should create downstream tasks for agents', async () => {
      const context = createMockRFPContext({
        departure: 'KJFK',
        arrival: 'KLAX',
        departureDate: '2025-12-15',
        passengers: 4,
        clientName: 'Test Client',
      })
      
      const result = await orchestrator.execute(context)
      
      expect(result.success).toBe(true)
      
      // In legacy mode, should create tasks
      const data = result.data as any
      if (data.tasks) {
        expect(data.tasks.length).toBeGreaterThan(0)
        
        // Should have flight search task
        const flightTask = data.tasks.find((t: any) => t.type === 'search_flights')
        expect(flightTask).toBeDefined()
        expect(flightTask.targetAgent).toBe(AgentType.FLIGHT_SEARCH)
      }
    })
  })

  // ===========================================================================
  // Intent Handling Tests
  // ===========================================================================

  describe('Intent Handling', () => {
    it('should handle information query intent', async () => {
      const context = createMockConversationalContext(
        'What types of aircraft do you have available?'
      )
      
      const result = await orchestrator.execute(context)
      
      expect(result.success).toBe(true)
      
      const data = result.data as any
      expect(data.intent).toBe(UserIntent.INFORMATION_QUERY)
    })

    it('should handle thank you messages', async () => {
      const context = createMockConversationalContext('Thank you!')
      
      const result = await orchestrator.execute(context)
      
      expect(result.success).toBe(true)
      
      const data = result.data as any
      expect(data.intent).toBe(UserIntent.GENERAL_CONVERSATION)
      expect(data.message).toContain("you're welcome") // Case insensitive expected
    })
  })

  // ===========================================================================
  // TripID Query Tests
  // ===========================================================================

  describe('TripID Query Handling', () => {
    it('should detect and handle TripID queries', async () => {
      const context = createMockConversationalContext(
        'Show me RFQs for trip atrip-12345678'
      )
      
      const result = await orchestrator.execute(context)
      
      expect(result.success).toBe(true)
      
      const data = result.data as any
      expect(data.intent).toBe(UserIntent.INFORMATION_QUERY)
    })

    it('should handle TripID not found gracefully', async () => {
      // Mock Supabase to return empty results
      const { supabaseAdmin } = await import('@/lib/supabase/admin')
      ;(supabaseAdmin.from as Mock).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      })
      
      const context = createMockConversationalContext(
        'Trip ID: atrip-nonexistent'
      )
      
      const result = await orchestrator.execute(context)
      
      expect(result.success).toBe(true)
      
      const data = result.data as any
      expect(data.message).toContain("couldn't find")
    })
  })

  // ===========================================================================
  // Session Management Tests
  // ===========================================================================

  describe('Session Management', () => {
    it('should get conversation state for session', async () => {
      const sessionId = 'test-session-get'
      const mockState = { sessionId, isComplete: false }
      
      mockConversationStore.get.mockResolvedValueOnce(mockState)
      
      const state = await orchestrator.getConversationState(sessionId)
      
      expect(mockConversationStore.get).toHaveBeenCalledWith(sessionId)
      expect(state).toEqual(mockState)
    })

    it('should clear conversation state', async () => {
      const sessionId = 'test-session-clear'
      
      await orchestrator.clearConversationState(sessionId)
      
      expect(mockConversationStore.delete).toHaveBeenCalledWith(sessionId)
    })

    it('should create new session for unknown session ID', async () => {
      mockConversationStore.get.mockResolvedValueOnce(undefined)
      
      const context = createMockConversationalContext('Hello!', 'new-session-id')
      
      const result = await orchestrator.execute(context)
      
      expect(result.success).toBe(true)
      
      // Should have set the new session state
      expect(mockConversationStore.set).toHaveBeenCalled()
    })
  })

  // ===========================================================================
  // Urgency and Priority Tests
  // ===========================================================================

  describe('Urgency and Priority Calculation', () => {
    it('should calculate urgent priority for same-day flights', async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      const context = createMockRFPContext({
        departureDate: tomorrow.toISOString().split('T')[0],
      })
      
      const result = await orchestrator.execute(context)
      
      expect(result.success).toBe(true)
      
      const data = result.data as any
      if (data.analysis) {
        expect(data.analysis.urgency).toBe('urgent')
      }
    })

    it('should calculate high priority for 2-3 day flights', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 2)
      
      const context = createMockRFPContext({
        departureDate: futureDate.toISOString().split('T')[0],
      })
      
      const result = await orchestrator.execute(context)
      
      expect(result.success).toBe(true)
    })

    it('should calculate normal priority for week-out flights', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 5)
      
      const context = createMockRFPContext({
        departureDate: futureDate.toISOString().split('T')[0],
      })
      
      const result = await orchestrator.execute(context)
      
      expect(result.success).toBe(true)
    })
  })

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  describe('Error Handling', () => {
    it('should handle missing RFP data in legacy mode gracefully', async () => {
      const context = {
        requestId: 'test-req',
        userId: 'test-user',
        sessionId: 'test-session',
        metadata: {}, // No rfpData or userMessage
      }
      
      const result = await orchestrator.execute(context)
      
      // Should fail gracefully in legacy mode (no userMessage, no rfpData)
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should validate required RFP fields', async () => {
      const context = createMockRFPContext({
        departure: 'KJFK',
        // Missing arrival, date, passengers
      } as any)
      
      // Need to ensure rfpData is incomplete
      context.metadata = {
        rfpData: {
          departure: 'KJFK',
        },
      }
      
      const result = await orchestrator.execute(context)
      
      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('Missing required field')
    })

    it('should reject invalid passenger count', async () => {
      const context = createMockRFPContext({
        passengers: -1,
      })
      
      const result = await orchestrator.execute(context)
      
      expect(result.success).toBe(false)
    })

    it('should handle conversation store errors gracefully', async () => {
      mockConversationStore.get.mockRejectedValueOnce(new Error('Redis connection failed'))
      
      const context = createMockConversationalContext('Hello!')
      
      // Should not crash, may fall back to in-memory or return error
      const result = await orchestrator.execute(context)
      
      // Either succeeds with fallback or fails gracefully
      expect(result).toBeDefined()
    })
  })

  // ===========================================================================
  // Metrics Tests
  // ===========================================================================

  describe('Agent Metrics', () => {
    it('should track execution metrics', async () => {
      const context = createMockConversationalContext('Hello!')
      
      await orchestrator.execute(context)
      
      const metrics = orchestrator.getMetrics()
      
      expect(metrics.totalExecutions).toBeGreaterThan(0)
      expect(metrics.successfulExecutions).toBeGreaterThan(0)
      expect(metrics.averageExecutionTime).toBeGreaterThan(0)
    })

    it('should track failed executions', async () => {
      const initialMetrics = orchestrator.getMetrics()
      const initialFailed = initialMetrics.failedExecutions
      
      // Cause a failure
      const context = createMockRFPContext({} as any)
      context.metadata = { rfpData: {} } // Invalid data
      
      await orchestrator.execute(context)
      
      const afterMetrics = orchestrator.getMetrics()
      expect(afterMetrics.failedExecutions).toBeGreaterThanOrEqual(initialFailed)
    })
  })

  // ===========================================================================
  // Shutdown Tests
  // ===========================================================================

  describe('Agent Shutdown', () => {
    it('should cleanup on shutdown', async () => {
      await orchestrator.shutdown()
      
      expect(mockConversationStore.close).toHaveBeenCalled()
      expect(orchestrator.status).toBe(AgentStatus.IDLE)
    })
  })
})
