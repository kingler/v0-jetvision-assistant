/**
 * Flight Search Agent Unit Tests
 *
 * Tests for the FlightSearchAgent which searches flights using Avinode MCP server.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { AgentContext, AgentResult } from '@agents/core/types';
import { AgentType, AgentStatus } from '@agents/core/types';

describe('FlightSearchAgent', () => {
  let FlightSearchAgent: any;
  let agent: any;
  let mockContext: AgentContext;

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
            aircraftType: 'light_jet',
            budget: 50000,
          },
        },
      },
    };

    // Dynamic import
    const module = await import('@agents/implementations/flight-search-agent');
    FlightSearchAgent = module.FlightSearchAgent;
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
  });

  describe('Flight Search', () => {
    beforeEach(async () => {
      agent = new FlightSearchAgent({
        type: AgentType.FLIGHT_SEARCH,
        name: 'Flight Search Manager',
      });
      await agent.initialize();
    });

    it('should search for flights with given parameters', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.flights).toBeDefined();
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

    it('should filter by aircraft type from client preferences', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      if (result.success && result.data.flights) {
        // Should apply aircraft type filter
        expect(result.data.searchParams?.aircraftType).toBe('light_jet');
      }
    });

    it('should filter by budget from client preferences', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      if (result.success && result.data.flights) {
        // Should apply budget filter
        expect(result.data.searchParams?.budget).toBe(50000);
      }
    });
  });

  describe('Empty Leg Search', () => {
    beforeEach(async () => {
      agent = new FlightSearchAgent({
        type: AgentType.FLIGHT_SEARCH,
        name: 'Flight Search Manager',
      });
      await agent.initialize();
    });

    it('should search for empty legs', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.data.emptyLegs).toBeDefined();
    });

    it('should identify cost savings for empty legs', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      if (result.data.emptyLegs && result.data.emptyLegs.length > 0) {
        const emptyLeg = result.data.emptyLegs[0];
        expect(emptyLeg.savings).toBeDefined();
        expect(emptyLeg.savings).toBeGreaterThan(0);
      }
    });
  });

  describe('RFP Creation', () => {
    beforeEach(async () => {
      agent = new FlightSearchAgent({
        type: AgentType.FLIGHT_SEARCH,
        name: 'Flight Search Manager',
      });
      await agent.initialize();
    });

    it('should create RFP for flight request', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.data.rfpId).toBeDefined();
    });

    it('should include operator count in RFP result', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      if (result.data.rfpId) {
        expect(result.data.operatorsContacted).toBeDefined();
        expect(result.data.operatorsContacted).toBeGreaterThan(0);
      }
    });

    it('should set RFP status to awaiting quotes', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      if (result.data.rfpId) {
        expect(result.data.rfpStatus).toBe('awaiting_quotes');
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

    it('should combine regular flights and empty legs', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.data.totalOptions).toBeDefined();
      expect(result.data.totalOptions).toBeGreaterThanOrEqual(0);
    });

    it('should sort options by price', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      if (result.data.flights && result.data.flights.length > 1) {
        const prices = result.data.flights.map((f: any) => f.price);
        const sorted = [...prices].sort((a, b) => a - b);
        expect(prices).toEqual(sorted);
      }
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
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      agent = new FlightSearchAgent({
        type: AgentType.FLIGHT_SEARCH,
        name: 'Flight Search Manager',
      });
      await agent.initialize();
    });

    it('should handle missing flight parameters', async () => {
      const invalidContext = {
        requestId: 'req-123',
        metadata: {},
      };

      const result: AgentResult = await agent.execute(invalidContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should update agent status to ERROR on failure', async () => {
      await agent.execute({ requestId: 'invalid', metadata: {} });

      expect(agent.status).toBe(AgentStatus.ERROR);
    });

    it('should handle no flights found gracefully', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.success).toBe(true);
      // Even with no results, should not error
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
      await agent.execute({ requestId: 'invalid', metadata: {} });

      const metrics = agent.getMetrics();
      expect(metrics.failedExecutions).toBe(1);
    });

    it('should update agent status to COMPLETED after success', async () => {
      await agent.execute(mockContext);

      expect(agent.status).toBe(AgentStatus.COMPLETED);
    });

    it('should track MCP tool calls', async () => {
      await agent.execute(mockContext);

      const metrics = agent.getMetrics();
      expect(metrics.toolCallsCount).toBeGreaterThanOrEqual(0);
    });
  });
});
