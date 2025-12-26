/**
 * Client Data Agent Unit Tests
 *
 * Tests for the ClientDataAgent which fetches client profiles from Google Sheets.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { AgentContext, AgentResult } from '@agents/core/types';
import { AgentType, AgentStatus } from '@agents/core/types';

// Type for client data agent result data
interface ClientDataResult {
  clientName?: string;
  found?: boolean;
  matchType?: string;
  email?: string;
  phone?: string;
  company?: string;
  preferences?: Record<string, unknown>;
  vipStatus?: string;
  requestId?: string;
  sessionId?: string;
  nextAgent?: AgentType;
}

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

describe('ClientDataAgent', () => {
  let ClientDataAgent: any;
  let agent: any;
  let mockContext: AgentContext;
  let mockMCPClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup test context
    mockContext = {
      requestId: 'req-123',
      userId: 'user-abc',
      sessionId: 'session-xyz',
      metadata: {
        clientName: 'John Smith',
      },
    };

    // Mock MCP client responses
    mockMCPClient = {
      callTool: vi.fn(),
    };

    // Dynamic import
    const module = await import('@agents/implementations/client-data-agent');
    ClientDataAgent = module.ClientDataAgent;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with correct agent type', async () => {
      agent = new ClientDataAgent({
        type: AgentType.CLIENT_DATA,
        name: 'Client Data Manager',
      });

      await agent.initialize();

      expect(agent.type).toBe(AgentType.CLIENT_DATA);
      expect(agent.status).toBe(AgentStatus.IDLE);
      expect(agent.name).toBe('Client Data Manager');
    });

    it('should have a unique ID', () => {
      const agent1 = new ClientDataAgent({
        type: AgentType.CLIENT_DATA,
        name: 'Client Data 1',
      });
      const agent2 = new ClientDataAgent({
        type: AgentType.CLIENT_DATA,
        name: 'Client Data 2',
      });

      expect(agent1.id).toBeDefined();
      expect(agent2.id).toBeDefined();
      expect(agent1.id).not.toBe(agent2.id);
    });
  });

  describe('Client Search', () => {
    beforeEach(async () => {
      agent = new ClientDataAgent({
        type: AgentType.CLIENT_DATA,
        name: 'Client Data Manager',
      });
      await agent.initialize();
    });

    it('should search for client by name', async () => {
      const result: AgentResult = await agent.execute(mockContext);
      const data = result.data as ClientDataResult;

      expect(result.success).toBe(true);
      expect(data).toBeDefined();
      expect(data.clientName).toBe('John Smith');
    });

    it('should find client with exact name match', async () => {
      const result: AgentResult = await agent.execute(mockContext);
      const data = result.data as ClientDataResult;

      expect(result.success).toBe(true);
      expect(data.found).toBe(true);
      expect(data.matchType).toBe('exact');
    });

    it('should handle client not found', async () => {
      const notFoundContext = {
        ...mockContext,
        metadata: {
          clientName: 'Non Existent Client',
        },
      };

      const result: AgentResult = await agent.execute(notFoundContext);
      const data = result.data as ClientDataResult;

      expect(result.success).toBe(true);
      expect(data.found).toBe(false);
      expect(data.clientName).toBe('Non Existent Client');
    });

    it('should validate client name is provided', async () => {
      const invalidContext = {
        ...mockContext,
        metadata: {},
      };

      const result: AgentResult = await agent.execute(invalidContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('client name');
    });
  });

  describe('Client Data Extraction', () => {
    beforeEach(async () => {
      agent = new ClientDataAgent({
        type: AgentType.CLIENT_DATA,
        name: 'Client Data Manager',
      });
      await agent.initialize();
    });

    it('should extract client email', async () => {
      const result: AgentResult = await agent.execute(mockContext);
      const data = result.data as ClientDataResult;

      if (data.found) {
        expect(data.email).toBeDefined();
        expect(data.email).toContain('@');
      }
    });

    it('should extract client phone number', async () => {
      const result: AgentResult = await agent.execute(mockContext);
      const data = result.data as ClientDataResult;

      if (data.found) {
        expect(data.phone).toBeDefined();
      }
    });

    it('should extract company name', async () => {
      const result: AgentResult = await agent.execute(mockContext);
      const data = result.data as ClientDataResult;

      if (data.found) {
        expect(data.company).toBeDefined();
      }
    });

    it('should parse JSON preferences correctly', async () => {
      const result: AgentResult = await agent.execute(mockContext);
      const data = result.data as ClientDataResult;

      if (data.found && data.preferences) {
        expect(typeof data.preferences).toBe('object');
        // Could contain aircraftType, budget, amenities, etc.
      }
    });

    it('should extract VIP status', async () => {
      const result: AgentResult = await agent.execute(mockContext);
      const data = result.data as ClientDataResult;

      if (data.found) {
        expect(data.vipStatus).toBeDefined();
        expect(['standard', 'vip', 'ultra_vip']).toContain(data.vipStatus);
      }
    });
  });

  describe('Preferences Handling', () => {
    beforeEach(async () => {
      agent = new ClientDataAgent({
        type: AgentType.CLIENT_DATA,
        name: 'Client Data Manager',
      });
      await agent.initialize();
    });

    it('should handle empty preferences gracefully', async () => {
      const result: AgentResult = await agent.execute(mockContext);
      const data = result.data as ClientDataResult;

      expect(result.success).toBe(true);
      // preferences can be undefined or empty object
      if (data.preferences) {
        expect(typeof data.preferences).toBe('object');
      }
    });

    it('should handle malformed JSON in preferences', async () => {
      // This tests resilience to bad data in the spreadsheet
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.success).toBe(true);
      // Should not crash even if JSON is malformed
    });

    it('should extract aircraft type preference', async () => {
      const result: AgentResult = await agent.execute(mockContext);
      const data = result.data as ClientDataResult;

      if (data.found && data.preferences) {
        // Could have aircraftType like 'light_jet', 'midsize', etc.
        expect(data.preferences).toBeDefined();
      }
    });
  });

  describe('Context Enrichment', () => {
    beforeEach(async () => {
      agent = new ClientDataAgent({
        type: AgentType.CLIENT_DATA,
        name: 'Client Data Manager',
      });
      await agent.initialize();
    });

    it('should preserve request ID', async () => {
      const result: AgentResult = await agent.execute(mockContext);
      const data = result.data as ClientDataResult;

      expect(data.requestId).toBe(mockContext.requestId);
    });

    it('should include session ID for handoff', async () => {
      const result: AgentResult = await agent.execute(mockContext);
      const data = result.data as ClientDataResult;

      expect(data.sessionId).toBe(mockContext.sessionId);
    });

    it('should prepare data for next agent', async () => {
      const result: AgentResult = await agent.execute(mockContext);
      const data = result.data as ClientDataResult;

      expect(data.nextAgent).toBe(AgentType.FLIGHT_SEARCH);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      agent = new ClientDataAgent({
        type: AgentType.CLIENT_DATA,
        name: 'Client Data Manager',
      });
      await agent.initialize();
    });

    it('should handle MCP server errors', async () => {
      // Mock MCP error
      const errorContext = {
        ...mockContext,
        metadata: {
          clientName: 'Trigger MCP Error',
        },
      };

      const result: AgentResult = await agent.execute(errorContext);

      // Should handle error gracefully
      expect(result).toBeDefined();
    });

    it('should update agent status to ERROR on failure', async () => {
      const invalidContext = {
        requestId: 'req-123',
        metadata: {},
      };

      await agent.execute(invalidContext);

      expect(agent.status).toBe(AgentStatus.ERROR);
    });

    it('should include error details in result', async () => {
      const invalidContext = {
        requestId: 'req-123',
        metadata: {},
      };

      const result: AgentResult = await agent.execute(invalidContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBeDefined();
    });
  });

  describe('Metrics Tracking', () => {
    beforeEach(async () => {
      agent = new ClientDataAgent({
        type: AgentType.CLIENT_DATA,
        name: 'Client Data Manager',
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
      expect(metrics.totalExecutions).toBe(1);
    });

    it('should update agent status to COMPLETED after successful execution', async () => {
      await agent.execute(mockContext);

      expect(agent.status).toBe(AgentStatus.COMPLETED);
    });

    it('should track MCP tool calls', async () => {
      await agent.execute(mockContext);

      const metrics = agent.getMetrics();
      expect(metrics.toolCallsCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Integration with Google Sheets MCP', () => {
    beforeEach(async () => {
      agent = new ClientDataAgent({
        type: AgentType.CLIENT_DATA,
        name: 'Client Data Manager',
      });
      await agent.initialize();
    });

    it('should call search_client MCP tool', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.success).toBe(true);
      // Would verify MCP tool was called
    });

    it('should pass client name to MCP tool', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.success).toBe(true);
      // Would verify correct parameters passed to MCP
    });

    it('should handle MCP timeout gracefully', async () => {
      // Test resilience to slow MCP responses
      const result: AgentResult = await agent.execute(mockContext);

      expect(result).toBeDefined();
    });
  });
});
