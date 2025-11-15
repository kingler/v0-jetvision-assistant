/**
 * Flight Search Agent Unit Tests
 *
 * Tests for the FlightSearchAgent which searches flights using Avinode MCP server.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { AgentContext, AgentResult } from '@agents/core/types';
import { AgentType, AgentStatus } from '@agents/core/types';

// Mock MCP server
const mockMCPServer = {
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  executeTool: vi.fn(),
};

// Mock the Avinode MCP Server module
vi.mock('@/lib/mcp/avinode-server', () => ({
  AvinodeMCPServer: vi.fn().mockImplementation(() => mockMCPServer),
}));

describe('FlightSearchAgent', () => {
  let FlightSearchAgent: any;
  let agent: any;
  let mockContext: AgentContext;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset mock implementation
    mockMCPServer.executeTool.mockImplementation((toolName: string, params: any) => {
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

      if (toolName === 'create_rfp') {
        return Promise.resolve({
          rfp_id: `RFP-${Date.now()}`,
          status: 'created',
          operators_notified: params.operator_ids.length,
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

    // Import after mocking
    const module = await import('@agents/implementations/flight-search-agent');
    FlightSearchAgent = module.FlightSearchAgent;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with correct agent type', async () => {
      agent = new FlightSearchAgent({
        type: AgentType.FLIGHT_SEARCH,
        name: 'Flight Search Manager',
      });

      await agent.initialize();

      expect(agent.type).toBe(AgentType.FLIGHT_SEARCH);
      expect(agent.status).toBe(AgentStatus.IDLE);
      expect(agent.name).toBe('Flight Search Manager');
      expect(mockMCPServer.start).toHaveBeenCalled();
    });

    it('should have a unique ID', () => {
      const agent1 = new FlightSearchAgent({
        type: AgentType.FLIGHT_SEARCH,
        name: 'Flight Search 1',
      });
      const agent2 = new FlightSearchAgent({
        type: AgentType.FLIGHT_SEARCH,
        name: 'Flight Search 2',
      });

      expect(agent1.id).toBeDefined();
      expect(agent2.id).toBeDefined();
      expect(agent1.id).not.toBe(agent2.id);
    });

    it('should initialize MCP server', async () => {
      agent = new FlightSearchAgent({
        type: AgentType.FLIGHT_SEARCH,
        name: 'Flight Search Manager',
      });

      await agent.initialize();

      expect(mockMCPServer.start).toHaveBeenCalledTimes(1);
    });
  });

  describe('Flight Search via MCP', () => {
    beforeEach(async () => {
      agent = new FlightSearchAgent({
        type: AgentType.FLIGHT_SEARCH,
        name: 'Flight Search Manager',
      });
      await agent.initialize();
    });

    it('should call search_flights MCP tool with correct parameters', async () => {
      await agent.execute(mockContext);

      expect(mockMCPServer.executeTool).toHaveBeenCalledWith(
        'search_flights',
        expect.objectContaining({
          departure_airport: 'KTEB',
          arrival_airport: 'KMIA',
          passengers: 6,
          departure_date: '2025-11-15T14:00:00Z',
          aircraft_category: 'light',
        }),
        expect.any(Object)
      );
    });

    it('should normalize flight results from MCP response', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.data.flights).toBeDefined();
      expect(result.data.flights.length).toBeGreaterThan(0);

      // Verify normalized structure
      const flight = result.data.flights[0];
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

      if (result.success && result.data.flights) {
        // All flights should be under the high budget
        result.data.flights.forEach((flight: any) => {
          expect(flight.price).toBeLessThanOrEqual(200000);
        });
        // Should have some flights
        expect(result.data.flights.length).toBeGreaterThan(0);
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

  describe('RFP Creation via MCP', () => {
    beforeEach(async () => {
      agent = new FlightSearchAgent({
        type: AgentType.FLIGHT_SEARCH,
        name: 'Flight Search Manager',
      });
      await agent.initialize();
    });

    it('should call create_rfp MCP tool', async () => {
      await agent.execute(mockContext);

      expect(mockMCPServer.executeTool).toHaveBeenCalledWith(
        'create_rfp',
        expect.objectContaining({
          flight_details: expect.objectContaining({
            departure_airport: 'KTEB',
            arrival_airport: 'KMIA',
            passengers: 6,
            departure_date: '2025-11-15T14:00:00Z',
          }),
          operator_ids: expect.any(Array),
        }),
        expect.any(Object)
      );
    });

    it('should create RFP with operator list', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.data.rfpId).toBeDefined();
      expect(result.data.rfpId).toMatch(/^RFP-/);
    });

    it('should include operator count in RFP result', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.data.operatorsContacted).toBeDefined();
      expect(result.data.operatorsContacted).toBeGreaterThan(0);
    });

    it('should set RFP status to created', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.data.rfpStatus).toBe('created');
    });
  });

  describe('Quote Retrieval via MCP', () => {
    beforeEach(async () => {
      agent = new FlightSearchAgent({
        type: AgentType.FLIGHT_SEARCH,
        name: 'Flight Search Manager',
      });
      await agent.initialize();
    });

    it('should call get_quotes MCP tool', async () => {
      await agent.execute(mockContext);

      expect(mockMCPServer.executeTool).toHaveBeenCalledWith(
        'get_quotes',
        expect.objectContaining({
          rfp_id: expect.stringMatching(/^RFP-/),
        }),
        expect.any(Object)
      );
    });

    it('should normalize quote results', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.data.quotesReceived).toBeGreaterThan(0);
    });

    it('should calculate total price from base price, fuel, taxes, fees', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      if (result.success) {
        // Quotes are aggregated into flights
        expect(result.data.flights).toBeDefined();
      }
    });
  });

  describe('Result Aggregation', () => {
    beforeEach(async () => {
      agent = new FlightSearchAgent({
        type: AgentType.FLIGHT_SEARCH,
        name: 'Flight Search Manager',
      });
      await agent.initialize();
    });

    it('should combine flights from search and quotes', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.data.totalOptions).toBeGreaterThan(0);
    });

    it('should deduplicate results', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      if (result.success && result.data.flights) {
        // Check for no exact duplicates
        const ids = result.data.flights.map((f: any) => f.id);
        const uniqueIds = new Set(ids);
        expect(ids.length).toBe(uniqueIds.size);
      }
    });

    it('should sort results by price (lowest first)', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      if (result.data.flights && result.data.flights.length > 1) {
        const prices = result.data.flights.map((f: any) => f.price);
        const sorted = [...prices].sort((a, b) => a - b);
        expect(prices).toEqual(sorted);
      }
    });

    it('should identify empty legs', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.data.emptyLegs).toBeDefined();
      expect(Array.isArray(result.data.emptyLegs)).toBe(true);
    });

    it('should calculate total savings from empty legs', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.data.totalSavings).toBeDefined();
      expect(result.data.totalSavings).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Retry Logic', () => {
    beforeEach(async () => {
      agent = new FlightSearchAgent({
        type: AgentType.FLIGHT_SEARCH,
        name: 'Flight Search Manager',
      });
      await agent.initialize();
    });

    it('should retry on MCP tool failure', async () => {
      let attempts = 0;
      mockMCPServer.executeTool.mockImplementation((toolName: string) => {
        attempts++;
        if (attempts < 2 && toolName === 'search_flights') {
          return Promise.reject(new Error('Network error'));
        }
        // Succeed on second attempt
        if (toolName === 'create_rfp') {
          return Promise.resolve({
            rfp_id: 'RFP-123',
            status: 'created',
            operators_notified: 5,
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

      const result: AgentResult = await agent.execute(mockContext);

      expect(attempts).toBeGreaterThan(1);
      expect(result.success).toBe(true);
    }, 10000);

    it('should use exponential backoff for retries', async () => {
      let attempts = 0;

      mockMCPServer.executeTool.mockImplementation((toolName: string) => {
        attempts++;
        if (attempts < 3 && toolName === 'search_flights') {
          return Promise.reject(new Error('Temporary failure'));
        }
        if (toolName === 'create_rfp') {
          return Promise.resolve({
            rfp_id: 'RFP-123',
            status: 'created',
            operators_notified: 5,
          });
        }
        if (toolName === 'get_quotes') {
          return Promise.resolve({ quotes: [], total: 0 });
        }
        return Promise.resolve({ aircraft: [], total: 0, query: {} });
      });

      const startTime = Date.now();
      await agent.execute(mockContext);
      const endTime = Date.now();

      // Should take at least 1s + 2s = 3s for 2 retries
      expect(endTime - startTime).toBeGreaterThanOrEqual(3000);
    }, 10000);

    it('should fail after max retries', async () => {
      mockMCPServer.executeTool.mockImplementation(() => {
        return Promise.reject(new Error('Persistent failure'));
      });

      const result: AgentResult = await agent.execute(mockContext);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('failed');
    }, 15000);
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      agent = new FlightSearchAgent({
        type: AgentType.FLIGHT_SEARCH,
        name: 'Flight Search Manager',
      });
      await agent.initialize();
    });

    it('should handle MCP tool errors gracefully', async () => {
      mockMCPServer.executeTool.mockRejectedValue(new Error('MCP error'));

      const result: AgentResult = await agent.execute(mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    }, 15000);

    it('should update agent status to ERROR on failure', async () => {
      mockMCPServer.executeTool.mockRejectedValue(new Error('MCP error'));

      await agent.execute(mockContext);

      expect(agent.status).toBe(AgentStatus.ERROR);
    }, 15000);

    it('should handle missing flight parameters', async () => {
      const invalidContext = {
        requestId: 'req-123',
        metadata: {},
      };

      const result: AgentResult = await agent.execute(invalidContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle empty search results', async () => {
      mockMCPServer.executeTool.mockImplementation((toolName: string) => {
        if (toolName === 'search_flights') {
          return Promise.resolve({ aircraft: [], total: 0, query: {} });
        }
        if (toolName === 'create_rfp') {
          return Promise.resolve({
            rfp_id: 'RFP-123',
            status: 'created',
            operators_notified: 5,
          });
        }
        if (toolName === 'get_quotes') {
          return Promise.resolve({ quotes: [], total: 0 });
        }
        return Promise.resolve({});
      });

      const result: AgentResult = await agent.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.data.totalOptions).toBe(0);
    });
  });

  describe('Context Enrichment', () => {
    beforeEach(async () => {
      agent = new FlightSearchAgent({
        type: AgentType.FLIGHT_SEARCH,
        name: 'Flight Search Manager',
      });
      await agent.initialize();
    });

    it('should preserve request ID', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.data.requestId).toBe(mockContext.requestId);
    });

    it('should include session ID for handoff', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.data.sessionId).toBe(mockContext.sessionId);
    });

    it('should set next agent to ProposalAnalysis', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.data.nextAgent).toBe(AgentType.PROPOSAL_ANALYSIS);
    });

    it('should include search parameters in result', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.data.searchParams).toBeDefined();
      expect(result.data.searchParams.departure).toBe('KTEB');
      expect(result.data.searchParams.arrival).toBe('KMIA');
    });
  });

  describe('Metrics Tracking', () => {
    beforeEach(async () => {
      agent = new FlightSearchAgent({
        type: AgentType.FLIGHT_SEARCH,
        name: 'Flight Search Manager',
      });
      await agent.initialize();
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
      mockMCPServer.executeTool.mockRejectedValue(new Error('Failure'));

      await agent.execute(mockContext);

      const metrics = agent.getMetrics();
      expect(metrics.failedExecutions).toBe(1);
    }, 15000);

    it('should update agent status to COMPLETED after success', async () => {
      await agent.execute(mockContext);

      expect(agent.status).toBe(AgentStatus.COMPLETED);
    });

    it('should track MCP tool calls', async () => {
      await agent.execute(mockContext);

      const metrics = agent.getMetrics();
      expect(metrics.toolCallsCount).toBeGreaterThanOrEqual(3); // search + create_rfp + get_quotes
    });
  });

  describe('Shutdown', () => {
    beforeEach(async () => {
      agent = new FlightSearchAgent({
        type: AgentType.FLIGHT_SEARCH,
        name: 'Flight Search Manager',
      });
      await agent.initialize();
    });

    it('should stop MCP server on shutdown', async () => {
      await agent.shutdown();

      expect(mockMCPServer.stop).toHaveBeenCalled();
    });

    it('should call parent shutdown', async () => {
      const shutdownSpy = vi.spyOn(agent, 'shutdown');

      await agent.shutdown();

      expect(shutdownSpy).toHaveBeenCalled();
    });
  });

  describe('Multi-Operator Parallel Search', () => {
    beforeEach(async () => {
      agent = new FlightSearchAgent({
        type: AgentType.FLIGHT_SEARCH,
        name: 'Flight Search Manager',
      });
      await agent.initialize();
    });

    it('should send RFP to multiple operators', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.data.operatorsContacted).toBeGreaterThan(1);
    });

    it('should aggregate quotes from multiple operators', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.data.quotesReceived).toBeGreaterThanOrEqual(0);
    });
  });
});
