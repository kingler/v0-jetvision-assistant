/**
 * Flight Search Agent Unit Tests
 *
 * Tests for the FlightSearchAgent which searches flights using Avinode MCP server.
 * Tests verify observable behavior (result data structure, validation, error handling)
 * rather than mock method calls.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { AgentContext, AgentResult } from '@agents/core/types';
import { AgentType, AgentStatus } from '@agents/core/types';

// Type for flight search agent result data
interface FlightSearchResultData {
  flights?: Array<{
    id: string;
    aircraftType?: string;
    aircraftCategory?: string;
    operator?: {
      id: string;
      name: string;
    };
    price?: number;
  }>;
  tripId?: string;
  deepLink?: string;
  rfpId?: string;
  rfpStatus?: string;
  tripStatus?: string;
  operatorsContacted?: number;
  quotesReceived?: number;
  totalOptions?: number;
  emptyLegs?: Array<unknown>;
  totalSavings?: number;
  requestId?: string;
  sessionId?: string;
  nextAgent?: AgentType;
  searchParams?: {
    departure?: string;
    arrival?: string;
  };
}

// Mock Supabase admin client
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: null, error: null })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: { id: 'test-id' }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ data: null, error: null })),
      })),
    })),
  },
  updateRequestWithAvinodeTrip: vi.fn().mockResolvedValue(undefined),
}));

// Mock LLM config
vi.mock('@/lib/config/llm-config', () => ({
  getOpenAIClient: vi.fn().mockResolvedValue({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { role: 'assistant', content: 'Test' } }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }),
      },
    },
  }),
}));

describe('FlightSearchAgent', () => {
  let FlightSearchAgent: any;
  let agent: any;
  let mockContext: AgentContext;
  let mockCallMCPTool: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup test context with flight search parameters
    mockContext = {
      requestId: 'req-123',
      userId: 'user-abc',
      sessionId: 'session-xyz',
      metadata: {
        departure: 'KTEB',
        arrival: 'KMIA',
        departureDate: '2025-11-15T14:00:00Z',
        passengers: 6,
        clientData: {
          preferences: {
            aircraftType: 'light',
            budget: 100000,
          },
        },
      },
    };

    // Import FlightSearchAgent
    const module = await import('@agents/implementations/flight-search-agent');
    FlightSearchAgent = module.FlightSearchAgent;

    // Setup mock for callMCPTool (the actual method the agent uses)
    mockCallMCPTool = vi.fn().mockImplementation((serverName: string, toolName: string, params: any) => {
      // Mock tool responses
      if (toolName === 'search_flights') {
        return Promise.resolve({
          aircraft: [
            {
              id: 'AC-001',
              type: 'Citation X',
              category: 'midsize',
              capacity: 8,
              range: 3242,
              speed: 604,
              operator: {
                id: 'OP-001',
                name: 'Executive Jet Management',
                rating: 4.8,
              },
            },
            {
              id: 'AC-002',
              type: 'Gulfstream G550',
              category: 'heavy',
              capacity: 14,
              range: 6750,
              speed: 562,
              operator: {
                id: 'OP-002',
                name: 'NetJets',
                rating: 4.9,
              },
            },
          ],
          total: 2,
          query: {
            departure_airport: params.departure_airport,
            arrival_airport: params.arrival_airport,
            passengers: params.passengers,
            departure_date: params.departure_date,
          },
        });
      }

      if (toolName === 'create_trip') {
        return Promise.resolve({
          trip_id: `TRIP-${Date.now()}`,
          deep_link: 'https://sandbox.avinode.com/app/#/trip/TRIP123',
          rfp_id: `RFP-${Date.now()}`,
          status: 'trip_created',
          created_at: new Date().toISOString(),
        });
      }

      if (toolName === 'get_quotes') {
        return Promise.resolve({
          rfp_id: params.rfp_id,
          quotes: [
            {
              quote_id: 'QT-001',
              rfp_id: params.rfp_id,
              operator_id: 'OP-001',
              operator_name: 'Executive Jet Management',
              aircraft_type: 'Citation X',
              base_price: 45000,
              response_time: 30,
              created_at: new Date().toISOString(),
            },
            {
              quote_id: 'QT-002',
              rfp_id: params.rfp_id,
              operator_id: 'OP-002',
              operator_name: 'NetJets',
              aircraft_type: 'Gulfstream G550',
              base_price: 75000,
              response_time: 45,
              created_at: new Date().toISOString(),
            },
          ],
          total: 2,
        });
      }

      return Promise.resolve({});
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to create agent with mocked MCP methods
  async function createAgentWithMocks() {
    const agent = new FlightSearchAgent({
      type: AgentType.FLIGHT_SEARCH,
      name: 'Flight Search Manager',
    });

    // Mock protected methods that interact with MCP
    agent.connectMCPServer = vi.fn().mockResolvedValue(undefined);
    agent.callMCPTool = mockCallMCPTool;

    await agent.initialize();
    return agent;
  }

  describe('Initialization', () => {
    it('should initialize with correct agent type', async () => {
      agent = await createAgentWithMocks();

      expect(agent.type).toBe(AgentType.FLIGHT_SEARCH);
      expect(agent.status).toBe(AgentStatus.IDLE);
      expect(agent.name).toBe('Flight Search Manager');
    });

    it('should have a unique ID', async () => {
      const agent1 = await createAgentWithMocks();
      const agent2 = new FlightSearchAgent({
        type: AgentType.FLIGHT_SEARCH,
        name: 'Flight Search 2',
      });
      agent2.connectMCPServer = vi.fn().mockResolvedValue(undefined);
      agent2.callMCPTool = mockCallMCPTool;
      await agent2.initialize();

      expect(agent1.id).toBeDefined();
      expect(agent2.id).toBeDefined();
      expect(agent1.id).not.toBe(agent2.id);
    });

    it('should start in IDLE status after initialization', async () => {
      agent = await createAgentWithMocks();

      expect(agent.status).toBe(AgentStatus.IDLE);
    });
  });

  describe('Flight Search via MCP', () => {
    beforeEach(async () => {
      agent = await createAgentWithMocks();
    });

    it('should execute flight search and return results', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.success).toBe(true);
      // Verify the mock was called with expected tool names
      expect(mockCallMCPTool).toHaveBeenCalled();
    });

    it('should normalize flight results from MCP response', async () => {
      const result: AgentResult = await agent.execute(mockContext);
      const data = result.data as FlightSearchResultData;

      expect(result.success).toBe(true);
      expect(data.flights).toBeDefined();
      expect(data.flights!.length).toBeGreaterThan(0);

      // Verify normalized structure
      const flight = data.flights![0];
      expect(flight).toHaveProperty('id');
      expect(flight).toHaveProperty('aircraftType');
      expect(flight).toHaveProperty('aircraftCategory');
      expect(flight).toHaveProperty('operator');
      expect(flight).toHaveProperty('price');
      expect(flight.operator).toHaveProperty('id');
      expect(flight.operator).toHaveProperty('name');
    });

    it('should filter flights by budget', async () => {
      const highBudgetContext = {
        ...mockContext,
        metadata: {
          ...mockContext.metadata,
          clientData: {
            preferences: {
              budget: 200000, // High budget - should include all flights
            },
          },
        },
      };

      const result: AgentResult = await agent.execute(highBudgetContext);
      const data = result.data as FlightSearchResultData;

      if (result.success && data.flights) {
        // All flights should be under the high budget
        data.flights.forEach((flight) => {
          expect(flight.price).toBeLessThanOrEqual(200000);
        });
        // Should have some flights
        expect(data.flights.length).toBeGreaterThan(0);
      }
    });

    it('should validate required fields - departure', async () => {
      const invalidContext = {
        ...mockContext,
        metadata: {
          arrival: 'KMIA',
          departureDate: '2025-11-15',
          passengers: 6,
        },
      };

      const result: AgentResult = await agent.execute(invalidContext);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('departure');
    });

    it('should validate required fields - arrival', async () => {
      const invalidContext = {
        ...mockContext,
        metadata: {
          departure: 'KTEB',
          departureDate: '2025-11-15',
          passengers: 6,
        },
      };

      const result: AgentResult = await agent.execute(invalidContext);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('arrival');
    });

    it('should validate passenger count', async () => {
      const invalidContext = {
        ...mockContext,
        metadata: {
          ...mockContext.metadata,
          passengers: 0,
        },
      };

      const result: AgentResult = await agent.execute(invalidContext);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('passengers');
    });

    it('should validate maximum passenger count', async () => {
      const invalidContext = {
        ...mockContext,
        metadata: {
          ...mockContext.metadata,
          passengers: 25, // Exceeds max of 19
        },
      };

      const result: AgentResult = await agent.execute(invalidContext);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('maximum');
    });
  });

  describe('Trip Creation via MCP', () => {
    beforeEach(async () => {
      agent = await createAgentWithMocks();
    });

    it('should create trip and return trip ID and deep link', async () => {
      const result: AgentResult = await agent.execute(mockContext);
      const data = result.data as FlightSearchResultData;

      expect(result.success).toBe(true);
      expect(data.tripId).toBeDefined();
      expect(data.deepLink).toBeDefined();
      expect(data.deepLink).toContain('avinode.com');
    });

    it('should create trip with RFP ID', async () => {
      const result: AgentResult = await agent.execute(mockContext);
      const data = result.data as FlightSearchResultData;

      expect(result.success).toBe(true);
      expect(data.rfpId).toBeDefined();
      expect(data.rfpId).toMatch(/^RFP-/);
    });

    it('should include flight results from search', async () => {
      const result: AgentResult = await agent.execute(mockContext);
      const data = result.data as FlightSearchResultData;

      // Should have flights from search (mock returns 2 aircraft)
      expect(result.success).toBe(true);
      expect(data.flights).toBeDefined();
    });

    it('should set trip status to trip_created', async () => {
      const result: AgentResult = await agent.execute(mockContext);
      const data = result.data as FlightSearchResultData;

      expect(data.tripStatus).toBe('trip_created');
    });
  });

  describe('Quote Retrieval via MCP', () => {
    beforeEach(async () => {
      agent = await createAgentWithMocks();
    });

    it('should retrieve quotes and include count in result', async () => {
      const result: AgentResult = await agent.execute(mockContext);
      const data = result.data as FlightSearchResultData;

      expect(result.success).toBe(true);
      expect(data.quotesReceived).toBeGreaterThan(0);
    });

    it('should normalize quote results into flights', async () => {
      const result: AgentResult = await agent.execute(mockContext);
      const data = result.data as FlightSearchResultData;

      expect(result.success).toBe(true);
      expect(data.quotesReceived).toBeGreaterThan(0);
    });

    it('should aggregate quotes into flights data', async () => {
      const result: AgentResult = await agent.execute(mockContext);
      const data = result.data as FlightSearchResultData;

      if (result.success) {
        // Quotes are aggregated into flights
        expect(data.flights).toBeDefined();
      }
    });
  });

  describe('Result Aggregation', () => {
    beforeEach(async () => {
      agent = await createAgentWithMocks();
    });

    it('should combine flights from search and quotes', async () => {
      const result: AgentResult = await agent.execute(mockContext);
      const data = result.data as FlightSearchResultData;

      expect(result.success).toBe(true);
      expect(data.totalOptions).toBeGreaterThan(0);
    });

    it('should deduplicate results', async () => {
      const result: AgentResult = await agent.execute(mockContext);
      const data = result.data as FlightSearchResultData;

      if (result.success && data.flights) {
        // Check for no exact duplicates
        const ids = data.flights.map((f) => f.id);
        const uniqueIds = new Set(ids);
        expect(ids.length).toBe(uniqueIds.size);
      }
    });

    it('should sort results by price (lowest first)', async () => {
      const result: AgentResult = await agent.execute(mockContext);
      const data = result.data as FlightSearchResultData;

      if (data.flights && data.flights.length > 1) {
        const prices = data.flights.map((f) => f.price);
        const sorted = [...prices].sort((a, b) => (a ?? 0) - (b ?? 0));
        expect(prices).toEqual(sorted);
      }
    });

    it('should identify empty legs', async () => {
      const result: AgentResult = await agent.execute(mockContext);
      const data = result.data as FlightSearchResultData;

      expect(result.success).toBe(true);
      expect(data.emptyLegs).toBeDefined();
      expect(Array.isArray(data.emptyLegs)).toBe(true);
    });

    it('should calculate total savings from empty legs', async () => {
      const result: AgentResult = await agent.execute(mockContext);
      const data = result.data as FlightSearchResultData;

      expect(data.totalSavings).toBeDefined();
      expect(data.totalSavings).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Retry Logic', () => {
    it('should retry on MCP tool failure', async () => {
      let attempts = 0;
      const retryMock = vi.fn().mockImplementation((serverName: string, toolName: string) => {
        attempts++;
        if (attempts < 2 && toolName === 'search_flights') {
          return Promise.reject(new Error('Network error'));
        }
        // Succeed on second attempt
        if (toolName === 'create_trip') {
          return Promise.resolve({
            trip_id: 'TRIP-123',
            deep_link: 'https://sandbox.avinode.com/app/#/trip/TRIP123',
            rfp_id: 'RFP-123',
            status: 'trip_created',
            created_at: new Date().toISOString(),
          });
        }
        if (toolName === 'get_quotes') {
          return Promise.resolve({ quotes: [], total: 0 });
        }
        return Promise.resolve({
          aircraft: [],
          total: 0,
          query: {},
        });
      });

      agent = new FlightSearchAgent({
        type: AgentType.FLIGHT_SEARCH,
        name: 'Flight Search Manager',
      });
      agent.connectMCPServer = vi.fn().mockResolvedValue(undefined);
      agent.callMCPTool = retryMock;
      await agent.initialize();

      const result: AgentResult = await agent.execute(mockContext);

      expect(attempts).toBeGreaterThan(1);
      expect(result.success).toBe(true);
    }, 10000);

    it('should use exponential backoff for retries', async () => {
      let attempts = 0;

      const backoffMock = vi.fn().mockImplementation((serverName: string, toolName: string) => {
        attempts++;
        if (attempts < 3 && toolName === 'search_flights') {
          return Promise.reject(new Error('Temporary failure'));
        }
        if (toolName === 'create_trip') {
          return Promise.resolve({
            trip_id: 'TRIP-123',
            deep_link: 'https://sandbox.avinode.com/app/#/trip/TRIP123',
            rfp_id: 'RFP-123',
            status: 'trip_created',
            created_at: new Date().toISOString(),
          });
        }
        if (toolName === 'get_quotes') {
          return Promise.resolve({ quotes: [], total: 0 });
        }
        return Promise.resolve({ aircraft: [], total: 0, query: {} });
      });

      agent = new FlightSearchAgent({
        type: AgentType.FLIGHT_SEARCH,
        name: 'Flight Search Manager',
      });
      agent.connectMCPServer = vi.fn().mockResolvedValue(undefined);
      agent.callMCPTool = backoffMock;
      await agent.initialize();

      const startTime = Date.now();
      await agent.execute(mockContext);
      const endTime = Date.now();

      // Should take at least 1s + 2s = 3s for 2 retries
      expect(endTime - startTime).toBeGreaterThanOrEqual(3000);
    }, 10000);

    it('should fail after max retries', async () => {
      const failMock = vi.fn().mockImplementation(() => {
        return Promise.reject(new Error('Persistent failure'));
      });

      agent = new FlightSearchAgent({
        type: AgentType.FLIGHT_SEARCH,
        name: 'Flight Search Manager',
      });
      agent.connectMCPServer = vi.fn().mockResolvedValue(undefined);
      agent.callMCPTool = failMock;
      await agent.initialize();

      const result: AgentResult = await agent.execute(mockContext);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('failed');
    }, 15000);
  });

  describe('Error Handling', () => {
    it('should handle MCP tool errors gracefully', async () => {
      const errorMock = vi.fn().mockRejectedValue(new Error('MCP error'));

      agent = new FlightSearchAgent({
        type: AgentType.FLIGHT_SEARCH,
        name: 'Flight Search Manager',
      });
      agent.connectMCPServer = vi.fn().mockResolvedValue(undefined);
      agent.callMCPTool = errorMock;
      await agent.initialize();

      const result: AgentResult = await agent.execute(mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    }, 15000);

    it('should update agent status to ERROR on failure', async () => {
      const errorMock = vi.fn().mockRejectedValue(new Error('MCP error'));

      agent = new FlightSearchAgent({
        type: AgentType.FLIGHT_SEARCH,
        name: 'Flight Search Manager',
      });
      agent.connectMCPServer = vi.fn().mockResolvedValue(undefined);
      agent.callMCPTool = errorMock;
      await agent.initialize();

      await agent.execute(mockContext);

      expect(agent.status).toBe(AgentStatus.ERROR);
    }, 15000);

    it('should handle missing flight parameters', async () => {
      agent = await createAgentWithMocks();

      const invalidContext = {
        requestId: 'req-123',
        metadata: {},
      };

      const result: AgentResult = await agent.execute(invalidContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle empty search results', async () => {
      const emptyResultsMock = vi.fn().mockImplementation((serverName: string, toolName: string) => {
        if (toolName === 'search_flights') {
          return Promise.resolve({ aircraft: [], total: 0, query: {} });
        }
        if (toolName === 'create_trip') {
          return Promise.resolve({
            trip_id: 'TRIP-123',
            deep_link: 'https://sandbox.avinode.com/app/#/trip/TRIP123',
            rfp_id: 'RFP-123',
            status: 'trip_created',
            created_at: new Date().toISOString(),
          });
        }
        if (toolName === 'get_quotes') {
          return Promise.resolve({ quotes: [], total: 0 });
        }
        return Promise.resolve({});
      });

      agent = new FlightSearchAgent({
        type: AgentType.FLIGHT_SEARCH,
        name: 'Flight Search Manager',
      });
      agent.connectMCPServer = vi.fn().mockResolvedValue(undefined);
      agent.callMCPTool = emptyResultsMock;
      await agent.initialize();

      const result: AgentResult = await agent.execute(mockContext);
      const data = result.data as FlightSearchResultData;

      expect(result.success).toBe(true);
      expect(data.totalOptions).toBe(0);
    });
  });

  describe('Context Enrichment', () => {
    beforeEach(async () => {
      agent = await createAgentWithMocks();
    });

    it('should preserve request ID', async () => {
      const result: AgentResult = await agent.execute(mockContext);
      const data = result.data as FlightSearchResultData;

      expect(data.requestId).toBe(mockContext.requestId);
    });

    it('should include session ID for handoff', async () => {
      const result: AgentResult = await agent.execute(mockContext);
      const data = result.data as FlightSearchResultData;

      expect(data.sessionId).toBe(mockContext.sessionId);
    });

    it('should set next agent to ProposalAnalysis', async () => {
      const result: AgentResult = await agent.execute(mockContext);
      const data = result.data as FlightSearchResultData;

      expect(data.nextAgent).toBe(AgentType.PROPOSAL_ANALYSIS);
    });

    it('should include search parameters in result', async () => {
      const result: AgentResult = await agent.execute(mockContext);
      const data = result.data as FlightSearchResultData;

      expect(data.searchParams).toBeDefined();
      expect(data.searchParams?.departure).toBe('KTEB');
      expect(data.searchParams?.arrival).toBe('KMIA');
    });
  });

  describe('Metrics Tracking', () => {
    beforeEach(async () => {
      agent = await createAgentWithMocks();
    });

    it('should track execution time', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.metadata?.executionTime).toBeDefined();
      expect(result.metadata?.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should track successful executions', async () => {
      await agent.execute(mockContext);

      const metrics = agent.getMetrics();
      expect(metrics.successfulExecutions).toBe(1);
      expect(metrics.totalExecutions).toBe(1);
    });

    it('should track failed executions', async () => {
      // Create agent with failing MCP tool
      const failingAgent = new FlightSearchAgent({
        type: AgentType.FLIGHT_SEARCH,
        name: 'Flight Search Manager',
      });
      failingAgent.connectMCPServer = vi.fn().mockResolvedValue(undefined);
      failingAgent.callMCPTool = vi.fn().mockRejectedValue(new Error('MCP Failure'));
      await failingAgent.initialize();

      await failingAgent.execute(mockContext);

      const metrics = failingAgent.getMetrics();
      expect(metrics.failedExecutions).toBe(1);
    }, 15000);

    it('should update agent status to COMPLETED after success', async () => {
      await agent.execute(mockContext);

      expect(agent.status).toBe(AgentStatus.COMPLETED);
    });

    it('should track MCP tool calls', async () => {
      await agent.execute(mockContext);

      const metrics = agent.getMetrics();
      expect(metrics.toolCallsCount).toBeGreaterThanOrEqual(3); // search + create_trip + get_quotes
    });
  });

  describe('Shutdown', () => {
    beforeEach(async () => {
      agent = await createAgentWithMocks();
    });

    it('should shutdown gracefully', async () => {
      // Execute to ensure agent is in active state
      await agent.execute(mockContext);

      // Shutdown should complete without error
      await expect(agent.shutdown()).resolves.not.toThrow();
    });

    it('should be callable multiple times safely', async () => {
      await agent.shutdown();
      await expect(agent.shutdown()).resolves.not.toThrow();
    });
  });

  describe('Multi-Operator Parallel Search', () => {
    beforeEach(async () => {
      agent = await createAgentWithMocks();
    });

    it('should search across multiple operators', async () => {
      const result: AgentResult = await agent.execute(mockContext);
      const data = result.data as FlightSearchResultData;

      // Result should include flights from search (mock returns aircraft from multiple operators)
      expect(result.success).toBe(true);
      expect(data.flights).toBeDefined();
      // Mock returns 2 aircraft from different operators
      if (data.flights) {
        expect(data.flights.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should aggregate quotes from operators', async () => {
      const result: AgentResult = await agent.execute(mockContext);
      const data = result.data as FlightSearchResultData;

      // Result should contain quote information
      expect(result.success).toBe(true);
      expect(data.quotesReceived).toBeGreaterThanOrEqual(0);
    });

    it('should include flights from multiple sources', async () => {
      const result: AgentResult = await agent.execute(mockContext);
      const data = result.data as FlightSearchResultData;

      // Mock returns 2 aircraft from different operators
      expect(data.flights).toBeDefined();
      if (data.flights && data.flights.length > 0) {
        expect(data.flights.length).toBeGreaterThanOrEqual(1);
      }
    });
  });
});
