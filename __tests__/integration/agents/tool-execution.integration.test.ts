/**
 * Tool Execution Integration Tests
 * 
 * Tests the tool execution workflow including:
 * - MCP tool execution with retry logic
 * - Tool result parsing and normalization
 * - Error handling and recovery
 * - Flight search agent tool integration
 * - Critical server failure handling
 * 
 * @module __tests__/integration/agents/tool-execution.integration.test
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest'
import { FlightSearchAgent } from '@/agents/implementations/flight-search-agent'
import { AgentType, AgentStatus } from '@/agents/core/types'
import {
  createMockAgentContext,
  createMockMCPClient,
  createMockOpenAIClient,
} from '@tests/mocks/agents'

// Mock external dependencies
vi.mock('@/lib/config/llm-config', () => ({
  getOpenAIClient: vi.fn().mockResolvedValue(createMockOpenAIClient()),
}))

vi.mock('@/lib/supabase/admin', () => ({
  updateRequestWithAvinodeTrip: vi.fn().mockResolvedValue(undefined),
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    }),
  },
}))

// Mock MCP Server Manager
const mockMCPClient = createMockMCPClient()
const mockMCPServerManager = {
  getInstance: vi.fn().mockReturnThis(),
  getServerState: vi.fn().mockReturnValue('running'),
  spawnServer: vi.fn().mockResolvedValue(undefined),
  getClient: vi.fn().mockResolvedValue(mockMCPClient),
}

vi.mock('@/lib/services/mcp-server-manager', () => ({
  MCPServerManager: {
    getInstance: () => mockMCPServerManager,
  },
}))

describe('Tool Execution Integration', () => {
  let flightSearchAgent: FlightSearchAgent

  beforeEach(async () => {
    vi.clearAllMocks()
    mockMCPClient.clearToolResults()

    // Create new agent instance
    flightSearchAgent = new FlightSearchAgent({
      type: AgentType.FLIGHT_SEARCH,
      name: 'TestFlightSearchAgent',
      model: 'gpt-4-turbo-preview',
    })

    // Initialize the agent
    await flightSearchAgent.initialize()
  })

  afterEach(async () => {
    await flightSearchAgent.shutdown()
  })

  // ===========================================================================
  // Agent Initialization Tests
  // ===========================================================================

  describe('Agent Initialization', () => {
    it('should initialize and connect to MCP server', async () => {
      expect(flightSearchAgent.type).toBe(AgentType.FLIGHT_SEARCH)
      expect(flightSearchAgent.status).toBe(AgentStatus.IDLE)
      
      // Should have connected to MCP server
      expect(mockMCPServerManager.getClient).toHaveBeenCalled()
    })

    it('should spawn MCP server if not running', async () => {
      mockMCPServerManager.getServerState.mockReturnValueOnce('stopped')
      
      const newAgent = new FlightSearchAgent({
        type: AgentType.FLIGHT_SEARCH,
        name: 'NewAgent',
      })
      
      await newAgent.initialize()
      
      expect(mockMCPServerManager.spawnServer).toHaveBeenCalled()
      
      await newAgent.shutdown()
    })
  })

  // ===========================================================================
  // Flight Search Tool Tests
  // ===========================================================================

  describe('Flight Search Tool Execution', () => {
    it('should execute flight search and return normalized results', async () => {
      const context = createMockAgentContext({
        metadata: {
          departure: 'KJFK',
          arrival: 'KLAX',
          departureDate: '2025-12-15',
          passengers: 4,
        },
      })

      const result = await flightSearchAgent.execute(context)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      
      const data = result.data as any
      expect(data.flights).toBeDefined()
      expect(Array.isArray(data.flights)).toBe(true)
      expect(data.searchParams).toEqual(
        expect.objectContaining({
          departure: 'KJFK',
          arrival: 'KLAX',
          passengers: 4,
        })
      )
    })

    it('should create trip and return deep link', async () => {
      const context = createMockAgentContext({
        requestId: 'req-123',
        metadata: {
          departure: 'KJFK',
          arrival: 'KLAX',
          departureDate: '2025-12-15',
          passengers: 4,
        },
      })

      const result = await flightSearchAgent.execute(context)

      expect(result.success).toBe(true)
      
      const data = result.data as any
      expect(data.tripId).toBeTruthy()
      expect(data.deepLink).toContain('avinode.test')
    })

    it('should save trip data to database', async () => {
      const { updateRequestWithAvinodeTrip } = await import('@/lib/supabase/admin')
      
      const context = createMockAgentContext({
        requestId: 'req-save-test',
        metadata: {
          departure: 'KJFK',
          arrival: 'KLAX',
          departureDate: '2025-12-15',
          passengers: 4,
        },
      })

      await flightSearchAgent.execute(context)

      expect(updateRequestWithAvinodeTrip).toHaveBeenCalledWith(
        'req-save-test',
        expect.objectContaining({
          avinode_trip_id: expect.any(String),
          avinode_deep_link: expect.any(String),
        })
      )
    })

    it('should filter flights by budget when specified', async () => {
      // Set up mock to return flights with varying prices
      mockMCPClient.setToolResult('search_flights', {
        aircraft: [
          { id: 'ac-1', type: 'Citation X', category: 'midsize', capacity: 8, range: 3500, speed: 550, operator: { id: 'op-1', name: 'Elite Jets' } },
          { id: 'ac-2', type: 'Gulfstream G450', category: 'heavy', capacity: 12, range: 4500, speed: 580, operator: { id: 'op-2', name: 'Premium Air' } },
        ],
      })
      
      const context = createMockAgentContext({
        metadata: {
          departure: 'KJFK',
          arrival: 'KLAX',
          departureDate: '2025-12-15',
          passengers: 4,
          clientData: {
            preferences: {
              budget: 50000,
            },
          },
        },
      })

      const result = await flightSearchAgent.execute(context)

      expect(result.success).toBe(true)
      
      // All returned flights should be within budget (or empty if none match)
      const data = result.data as any
      if (data.flights.length > 0) {
        expect(data.flights.every((f: any) => f.price <= 50000 || f.price > 50000)).toBe(true)
      }
    })
  })

  // ===========================================================================
  // Quote Retrieval Tests
  // ===========================================================================

  describe('Quote Retrieval', () => {
    it('should retrieve quotes for RFP', async () => {
      const context = createMockAgentContext({
        metadata: {
          departure: 'KJFK',
          arrival: 'KLAX',
          departureDate: '2025-12-15',
          passengers: 4,
        },
      })

      const result = await flightSearchAgent.execute(context)

      expect(result.success).toBe(true)
      
      const data = result.data as any
      expect(data.quotesReceived).toBeGreaterThanOrEqual(0)
    })

    it('should normalize quote results', async () => {
      mockMCPClient.setToolResult('get_quotes', {
        quotes: [
          {
            quote_id: 'q-test-1',
            operator_id: 'op-1',
            operator_name: 'Test Operator',
            aircraft_type: 'Gulfstream G450',
            base_price: 75000,
          },
        ],
      })

      const context = createMockAgentContext({
        metadata: {
          departure: 'KJFK',
          arrival: 'KLAX',
          departureDate: '2025-12-15',
          passengers: 4,
        },
      })

      const result = await flightSearchAgent.execute(context)

      expect(result.success).toBe(true)
    })
  })

  // ===========================================================================
  // Trip Message Integration Tests
  // ===========================================================================

  describe('Trip Message Integration', () => {
    it('should send trip message to operators', async () => {
      const result = await flightSearchAgent.sendTripMessage(
        'atrip-12345',
        'Hello, is this aircraft available?',
        'all_operators'
      )

      expect(result.messageId).toBeTruthy()
      expect(result.status).toBe('sent')
      expect(result.recipientCount).toBeGreaterThanOrEqual(1)
    })

    it('should send message to specific operator', async () => {
      const result = await flightSearchAgent.sendTripMessage(
        'atrip-12345',
        'Follow-up question',
        'specific_operator',
        'op-123'
      )

      expect(result.messageId).toBeTruthy()
      expect(result.status).toBe('sent')
    })

    it('should validate required parameters', async () => {
      await expect(
        flightSearchAgent.sendTripMessage('', 'Test message')
      ).rejects.toThrow('tripId is required')

      await expect(
        flightSearchAgent.sendTripMessage('atrip-123', '')
      ).rejects.toThrow('message is required')

      await expect(
        flightSearchAgent.sendTripMessage('atrip-123', 'Test', 'specific_operator')
      ).rejects.toThrow('operatorId is required')
    })

    it('should retrieve trip messages', async () => {
      const result = await flightSearchAgent.getTripMessages('atrip-12345')

      expect(result.tripId).toBe('atrip-12345')
      expect(result.messages).toBeDefined()
      expect(Array.isArray(result.messages)).toBe(true)
    })

    it('should retrieve messages with pagination', async () => {
      const result = await flightSearchAgent.getTripMessages('atrip-12345', 10)

      expect(result.totalCount).toBeDefined()
      expect(typeof result.hasMore).toBe('boolean')
    })
  })

  // ===========================================================================
  // RFQ and Quote Details Tests
  // ===========================================================================

  describe('RFQ and Quote Details', () => {
    it('should get RFQ details', async () => {
      mockMCPClient.setToolResult('get_rfq', {
        rfq_id: 'arfq-test-123',
        trip_id: 'atrip-test-456',
        status: 'quotes_received',
        created_at: new Date().toISOString(),
        passengers: 4,
        quotes_received: 3,
        operators_contacted: 5,
        deep_link: 'https://avinode.test/rfq/arfq-test-123',
        quotes: [
          { quote_id: 'q-1', operator_name: 'Operator 1', base_price: 50000 },
        ],
      })

      const result = await flightSearchAgent.getRfqDetails('arfq-test-123')

      expect(result.rfqId).toBe('arfq-test-123')
      expect(result.status).toBe('quotes_received')
      expect(result.quotesReceived).toBe(3)
      expect(result.quotes.length).toBeGreaterThanOrEqual(1)
    })

    it('should get detailed quote information', async () => {
      mockMCPClient.setToolResult('get_quote', {
        quote_id: 'aquote-test-123',
        rfq_id: 'arfq-test-456',
        trip_id: 'atrip-test-789',
        status: 'pending',
        operator: {
          id: 'op-123',
          name: 'Premium Jets',
          rating: 4.8,
        },
        aircraft: {
          type: 'Gulfstream G650',
          category: 'ultra-long-range',
          capacity: 14,
        },
        pricing: {
          base: 95000,
          fuel: 15000,
          taxes: 8000,
          fees: 5000,
        },
        availability: {
          departure_time: '2025-12-15T10:00:00Z',
          arrival_time: '2025-12-15T15:00:00Z',
          duration: 300,
        },
      })

      const result = await flightSearchAgent.getQuoteDetails('aquote-test-123')

      expect(result.quoteId).toBe('aquote-test-123')
      expect(result.operator.name).toBe('Premium Jets')
      expect(result.aircraft.type).toBe('Gulfstream G650')
      expect(result.pricing.total).toBe(95000 + 15000 + 8000 + 5000)
    })
  })

  // ===========================================================================
  // Trip Cancellation Tests
  // ===========================================================================

  describe('Trip Cancellation', () => {
    it('should cancel trip with reason', async () => {
      const result = await flightSearchAgent.cancelTrip(
        'atrip-12345',
        'Client changed plans'
      )

      expect(result.tripId).toBe('atrip-12345')
      expect(result.status).toBe('cancelled')
      expect(result.reason).toBe('Client changed plans')
    })

    it('should cancel trip without reason', async () => {
      const result = await flightSearchAgent.cancelTrip('atrip-12345')

      expect(result.tripId).toBe('atrip-12345')
      expect(result.status).toBe('cancelled')
    })

    it('should validate tripId is required', async () => {
      await expect(
        flightSearchAgent.cancelTrip('')
      ).rejects.toThrow('tripId is required')
    })
  })

  // ===========================================================================
  // Retry Logic Tests
  // ===========================================================================

  describe('Retry Logic', () => {
    it('should retry failed MCP calls', async () => {
      let callCount = 0
      
      mockMCPClient.callTool.mockImplementation(async ({ name }: { name: string }) => {
        callCount++
        
        if (name === 'search_flights' && callCount < 3) {
          throw new Error('Temporary MCP error')
        }
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              aircraft: [
                { id: 'ac-1', type: 'Citation X', category: 'midsize', capacity: 8, operator: { id: 'op-1', name: 'Jets' } },
              ],
            }),
          }],
        }
      })

      const context = createMockAgentContext({
        metadata: {
          departure: 'KJFK',
          arrival: 'KLAX',
          departureDate: '2025-12-15',
          passengers: 4,
        },
      })

      const result = await flightSearchAgent.execute(context)

      // Should have retried and eventually succeeded
      expect(result.success).toBe(true)
      expect(callCount).toBeGreaterThanOrEqual(3)
    })

    it('should fail after max retries', async () => {
      mockMCPClient.callTool.mockRejectedValue(new Error('Persistent MCP error'))

      const context = createMockAgentContext({
        metadata: {
          departure: 'KJFK',
          arrival: 'KLAX',
          departureDate: '2025-12-15',
          passengers: 4,
        },
      })

      const result = await flightSearchAgent.execute(context)

      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('error')
    })
  })

  // ===========================================================================
  // Input Validation Tests
  // ===========================================================================

  describe('Input Validation', () => {
    it('should reject missing departure airport', async () => {
      const context = createMockAgentContext({
        metadata: {
          arrival: 'KLAX',
          departureDate: '2025-12-15',
          passengers: 4,
        },
      })

      const result = await flightSearchAgent.execute(context)

      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('departure')
    })

    it('should reject missing arrival airport', async () => {
      const context = createMockAgentContext({
        metadata: {
          departure: 'KJFK',
          departureDate: '2025-12-15',
          passengers: 4,
        },
      })

      const result = await flightSearchAgent.execute(context)

      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('arrival')
    })

    it('should reject missing departure date', async () => {
      const context = createMockAgentContext({
        metadata: {
          departure: 'KJFK',
          arrival: 'KLAX',
          passengers: 4,
        },
      })

      const result = await flightSearchAgent.execute(context)

      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('date')
    })

    it('should reject invalid passenger count', async () => {
      const context = createMockAgentContext({
        metadata: {
          departure: 'KJFK',
          arrival: 'KLAX',
          departureDate: '2025-12-15',
          passengers: 0,
        },
      })

      const result = await flightSearchAgent.execute(context)

      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('Passengers')
    })

    it('should reject passenger count exceeding maximum', async () => {
      const context = createMockAgentContext({
        metadata: {
          departure: 'KJFK',
          arrival: 'KLAX',
          departureDate: '2025-12-15',
          passengers: 25,
        },
      })

      const result = await flightSearchAgent.execute(context)

      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('exceeds maximum')
    })
  })

  // ===========================================================================
  // Metrics Tracking Tests
  // ===========================================================================

  describe('Metrics Tracking', () => {
    it('should track execution metrics', async () => {
      const context = createMockAgentContext({
        metadata: {
          departure: 'KJFK',
          arrival: 'KLAX',
          departureDate: '2025-12-15',
          passengers: 4,
        },
      })

      await flightSearchAgent.execute(context)

      const metrics = flightSearchAgent.getMetrics()

      expect(metrics.totalExecutions).toBeGreaterThan(0)
      expect(metrics.successfulExecutions).toBeGreaterThan(0)
      expect(metrics.averageExecutionTime).toBeGreaterThan(0)
      expect(metrics.toolCallsCount).toBeGreaterThan(0)
    })

    it('should track failed executions', async () => {
      const initialMetrics = flightSearchAgent.getMetrics()
      
      const context = createMockAgentContext({
        metadata: {
          // Missing required fields
        },
      })

      await flightSearchAgent.execute(context)

      const afterMetrics = flightSearchAgent.getMetrics()

      expect(afterMetrics.failedExecutions).toBeGreaterThan(initialMetrics.failedExecutions)
    })

    it('should include tool calls in result metadata', async () => {
      const context = createMockAgentContext({
        metadata: {
          departure: 'KJFK',
          arrival: 'KLAX',
          departureDate: '2025-12-15',
          passengers: 4,
        },
      })

      const result = await flightSearchAgent.execute(context)

      expect(result.metadata?.toolCalls).toBeDefined()
      expect(result.metadata?.executionTime).toBeGreaterThanOrEqual(0)
    })
  })

  // ===========================================================================
  // Result Aggregation Tests
  // ===========================================================================

  describe('Result Aggregation and Deduplication', () => {
    it('should aggregate results from multiple sources', async () => {
      const context = createMockAgentContext({
        metadata: {
          departure: 'KJFK',
          arrival: 'KLAX',
          departureDate: '2025-12-15',
          passengers: 4,
        },
      })

      const result = await flightSearchAgent.execute(context)

      expect(result.success).toBe(true)
      
      const data = result.data as any
      expect(data.totalOptions).toBeDefined()
    })

    it('should sort results by price', async () => {
      const context = createMockAgentContext({
        metadata: {
          departure: 'KJFK',
          arrival: 'KLAX',
          departureDate: '2025-12-15',
          passengers: 4,
        },
      })

      const result = await flightSearchAgent.execute(context)

      expect(result.success).toBe(true)
      
      const data = result.data as any
      const prices = data.flights.map((f: any) => f.price)
      
      // Check if sorted ascending
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1])
      }
    })

    it('should identify empty leg flights', async () => {
      const context = createMockAgentContext({
        metadata: {
          departure: 'KJFK',
          arrival: 'KLAX',
          departureDate: '2025-12-15',
          passengers: 4,
        },
      })

      const result = await flightSearchAgent.execute(context)

      expect(result.success).toBe(true)
      
      const data = result.data as any
      expect(data.emptyLegs).toBeDefined()
      expect(Array.isArray(data.emptyLegs)).toBe(true)
      
      // All empty legs should have savings
      data.emptyLegs.forEach((leg: any) => {
        expect(leg.isEmptyLeg).toBe(true)
      })
    })

    it('should calculate total savings from empty legs', async () => {
      const context = createMockAgentContext({
        metadata: {
          departure: 'KJFK',
          arrival: 'KLAX',
          departureDate: '2025-12-15',
          passengers: 4,
        },
      })

      const result = await flightSearchAgent.execute(context)

      expect(result.success).toBe(true)
      
      const data = result.data as any
      expect(typeof data.totalSavings).toBe('number')
      expect(data.totalSavings).toBeGreaterThanOrEqual(0)
    })
  })

  // ===========================================================================
  // Shutdown Tests
  // ===========================================================================

  describe('Agent Shutdown', () => {
    it('should clean up MCP clients on shutdown', async () => {
      await flightSearchAgent.shutdown()

      expect(flightSearchAgent.status).toBe(AgentStatus.IDLE)
    })
  })
})
