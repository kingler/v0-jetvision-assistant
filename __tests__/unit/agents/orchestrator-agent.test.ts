/**
 * Orchestrator Agent Unit Tests
 *
 * Tests for the OrchestratorAgent which analyzes RFP requests and delegates tasks to other agents.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { AgentContext, AgentResult } from '@agents/core/types';
import { AgentType, AgentStatus } from '@agents/core/types';

describe('OrchestratorAgent', () => {
  let OrchestratorAgent: any;
  let agent: any;
  let mockContext: AgentContext;

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();

    // Setup test context with RFP data
    mockContext = {
      requestId: 'rfp-123',
      userId: 'user-abc',
      sessionId: 'session-xyz',
      metadata: {
        rfpData: {
          departure: 'KTEB',
          arrival: 'KMIA',
          departureDate: '2025-11-15',
          passengers: 6,
          clientName: 'John Smith',
        },
      },
    };

    // Dynamic import to ensure fresh module
    const module = await import('@agents/implementations/orchestrator-agent');
    OrchestratorAgent = module.OrchestratorAgent;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with correct agent type', async () => {
      agent = new OrchestratorAgent({
        type: AgentType.ORCHESTRATOR,
        name: 'RFP Orchestrator',
      });

      await agent.initialize();

      expect(agent.type).toBe(AgentType.ORCHESTRATOR);
      expect(agent.status).toBe(AgentStatus.IDLE);
      expect(agent.name).toBe('RFP Orchestrator');
    });

    it('should have a unique ID', () => {
      const agent1 = new OrchestratorAgent({
        type: AgentType.ORCHESTRATOR,
        name: 'Orchestrator 1',
      });
      const agent2 = new OrchestratorAgent({
        type: AgentType.ORCHESTRATOR,
        name: 'Orchestrator 2',
      });

      expect(agent1.id).toBeDefined();
      expect(agent2.id).toBeDefined();
      expect(agent1.id).not.toBe(agent2.id);
    });

    it('should start with IDLE status', () => {
      agent = new OrchestratorAgent({
        type: AgentType.ORCHESTRATOR,
        name: 'RFP Orchestrator',
      });

      expect(agent.status).toBe(AgentStatus.IDLE);
    });
  });

  describe('RFP Analysis', () => {
    beforeEach(async () => {
      agent = new OrchestratorAgent({
        type: AgentType.ORCHESTRATOR,
        name: 'RFP Orchestrator',
      });
      await agent.initialize();
    });

    it('should analyze RFP request and extract key information', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.analysis).toBeDefined();
      expect(result.data.analysis.departure).toBe('KTEB');
      expect(result.data.analysis.arrival).toBe('KMIA');
      expect(result.data.analysis.passengers).toBe(6);
      expect(result.data.analysis.clientName).toBe('John Smith');
    });

    it('should identify required next steps', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.data.nextSteps).toBeDefined();
      expect(Array.isArray(result.data.nextSteps)).toBe(true);
      expect(result.data.nextSteps).toContain('fetch_client_data');
      expect(result.data.nextSteps).toContain('search_flights');
    });

    it('should validate RFP has required fields - departure', async () => {
      const invalidContext = {
        ...mockContext,
        metadata: {
          rfpData: {
            arrival: 'KMIA',
            departureDate: '2025-11-15',
            passengers: 6,
          },
        },
      };

      const result: AgentResult = await agent.execute(invalidContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('departure');
    });

    it('should validate RFP has required fields - arrival', async () => {
      const invalidContext = {
        ...mockContext,
        metadata: {
          rfpData: {
            departure: 'KTEB',
            departureDate: '2025-11-15',
            passengers: 6,
          },
        },
      };

      const result: AgentResult = await agent.execute(invalidContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('arrival');
    });

    it('should validate RFP has required fields - passengers', async () => {
      const invalidContext = {
        ...mockContext,
        metadata: {
          rfpData: {
            departure: 'KTEB',
            arrival: 'KMIA',
            departureDate: '2025-11-15',
          },
        },
      };

      const result: AgentResult = await agent.execute(invalidContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should determine priority level based on RFP urgency', async () => {
      const urgentContext = {
        ...mockContext,
        metadata: {
          rfpData: {
            ...mockContext.metadata?.rfpData,
            departureDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          },
        },
      };

      const result: AgentResult = await agent.execute(urgentContext);

      expect(result.success).toBe(true);
      expect(result.data.priority).toBe('urgent');
    });
  });

  describe('Workflow Creation', () => {
    beforeEach(async () => {
      agent = new OrchestratorAgent({
        type: AgentType.ORCHESTRATOR,
        name: 'RFP Orchestrator',
      });
      await agent.initialize();
    });

    it('should create workflow for the request', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.data.workflowId).toBeDefined();
      expect(result.data.workflowId).toBe(mockContext.requestId);
    });

    it('should set initial workflow state', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.data.workflowState).toBeDefined();
      expect(result.data.workflowState).toBe('ANALYZING');
    });
  });

  describe('Task Delegation', () => {
    beforeEach(async () => {
      agent = new OrchestratorAgent({
        type: AgentType.ORCHESTRATOR,
        name: 'RFP Orchestrator',
      });
      await agent.initialize();
    });

    it('should create tasks for downstream agents', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.data.tasks).toBeDefined();
      expect(Array.isArray(result.data.tasks)).toBe(true);
      expect(result.data.tasks.length).toBeGreaterThan(0);
    });

    it('should create client data fetch task', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      const clientDataTask = result.data.tasks?.find(
        (t: any) => t.type === 'fetch_client_data'
      );

      expect(clientDataTask).toBeDefined();
      expect(clientDataTask?.targetAgent).toBe(AgentType.CLIENT_DATA);
      expect(clientDataTask?.payload).toMatchObject({
        clientName: 'John Smith',
      });
    });

    it('should create flight search task', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      const flightSearchTask = result.data.tasks?.find(
        (t: any) => t.type === 'search_flights'
      );

      expect(flightSearchTask).toBeDefined();
      expect(flightSearchTask?.targetAgent).toBe(AgentType.FLIGHT_SEARCH);
      expect(flightSearchTask?.payload).toMatchObject({
        departure: 'KTEB',
        arrival: 'KMIA',
        passengers: 6,
      });
    });

    it('should set task priority based on urgency', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      const tasks = result.data.tasks || [];
      tasks.forEach((task: any) => {
        expect(task.priority).toBeDefined();
        expect(['urgent', 'high', 'normal', 'low']).toContain(task.priority);
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      agent = new OrchestratorAgent({
        type: AgentType.ORCHESTRATOR,
        name: 'RFP Orchestrator',
      });
      await agent.initialize();
    });

    it('should handle missing RFP data gracefully', async () => {
      const invalidContext = {
        requestId: 'rfp-123',
        userId: 'user-abc',
        sessionId: 'session-xyz',
        metadata: {},
      };

      const result: AgentResult = await agent.execute(invalidContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('RFP data');
    });

    it('should update agent status to ERROR on failure', async () => {
      const invalidContext = {
        requestId: 'rfp-123',
        metadata: {},
      };

      await agent.execute(invalidContext);

      expect(agent.status).toBe(AgentStatus.ERROR);
    });

    it('should include error details in result', async () => {
      const invalidContext = {
        requestId: 'rfp-123',
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
      agent = new OrchestratorAgent({
        type: AgentType.ORCHESTRATOR,
        name: 'RFP Orchestrator',
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

    it('should calculate average execution time', async () => {
      await agent.execute(mockContext);
      await agent.execute(mockContext);

      const metrics = agent.getMetrics();
      expect(metrics.averageExecutionTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Context Preservation', () => {
    beforeEach(async () => {
      agent = new OrchestratorAgent({
        type: AgentType.ORCHESTRATOR,
        name: 'RFP Orchestrator',
      });
      await agent.initialize();
    });

    it('should preserve request ID in result', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.data.requestId).toBe(mockContext.requestId);
    });

    it('should preserve session ID in tasks', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      const tasks = result.data.tasks || [];
      tasks.forEach((task: any) => {
        expect(task.payload.sessionId).toBe(mockContext.sessionId);
      });
    });

    it('should include original RFP data in tasks', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      const tasks = result.data.tasks || [];
      tasks.forEach((task: any) => {
        expect(task.payload.rfpData).toBeDefined();
      });
    });
  });
});
