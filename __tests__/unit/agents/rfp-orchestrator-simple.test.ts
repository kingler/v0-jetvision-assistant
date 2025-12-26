/**
 * Simple RFP Orchestrator Agent Tests
 * Basic tests to verify core functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RFPOrchestratorAgent } from '@/lib/agents/rfp-orchestrator';
import { AgentType, AgentStatus } from '@/agents/core/types';
import { WorkflowState } from '@/agents/coordination/state-machine';

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

// Mock OpenAI
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  departure_airport: 'KTEB',
                  arrival_airport: 'KVNY',
                  passengers: 6,
                  departure_date: '2025-11-15',
                  urgency: 'normal',
                  complexity: 'simple',
                  special_requirements: [],
                  missing_fields: [],
                }),
              },
            }],
            usage: {
              prompt_tokens: 100,
              completion_tokens: 200,
              total_tokens: 300,
            },
          }),
        },
      },
    })),
  };
});

describe('RFPOrchestratorAgent - Basic Tests', () => {
  let agent: RFPOrchestratorAgent;
  let mockSupabase: any;

  beforeEach(() => {
    // Setup mock Supabase client
    mockSupabase = {
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { id: 'request-123' },
              error: null,
            })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: null,
            error: null,
          })),
        })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { status: 'analyzing' },
              error: null,
            })),
            order: vi.fn(() => ({
              data: [],
              error: null,
            })),
          })),
          order: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      })),
    };

    // Create agent instance
    agent = new RFPOrchestratorAgent({
      type: AgentType.ORCHESTRATOR,
      name: 'Test RFP Orchestrator',
      supabase: mockSupabase as any,
    });
  });

  afterEach(async () => {
    await agent.shutdown();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create an instance', () => {
      expect(agent).toBeDefined();
    });

    it('should have correct agent type', () => {
      expect(agent.type).toBe(AgentType.ORCHESTRATOR);
    });

    it('should have a unique ID', () => {
      expect(agent.id).toBeDefined();
      expect(typeof agent.id).toBe('string');
    });

    it('should initialize successfully', async () => {
      await agent.initialize();
      expect(agent.status).toBe(AgentStatus.IDLE);
    });
  });

  describe('Request Analysis', () => {
    it('should analyze a simple flight request', async () => {
      const request = 'Flight from KTEB to KVNY on Nov 15, 2025 for 6 passengers';

      const result = await agent.analyzeRequest(request);

      expect(result).toBeDefined();
      expect(result.departure_airport).toBeDefined();
      expect(result.arrival_airport).toBeDefined();
    });

    it('should return analysis with required fields', async () => {
      const request = 'Flight request test';

      const result = await agent.analyzeRequest(request);

      expect(result).toHaveProperty('urgency');
      expect(result).toHaveProperty('complexity');
      expect(result).toHaveProperty('special_requirements');
      expect(result).toHaveProperty('missing_fields');
    });
  });

  describe('Database Operations', () => {
    it('should create a request in the database', async () => {
      const requestData = {
        iso_agent_id: 'agent-123',
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15',
      };

      const requestId = await agent.createRequest(requestData);

      expect(requestId).toBe('request-123');
      expect(mockSupabase.from).toHaveBeenCalledWith('requests');
    });

    it('should update request status', async () => {
      const requestId = 'request-123';

      await agent.updateRequestStatus(requestId, WorkflowState.ANALYZING);

      expect(mockSupabase.from).toHaveBeenCalledWith('requests');
    });

    it('should get current state', async () => {
      const requestId = 'request-123';

      const state = await agent.getCurrentState(requestId);

      expect(state).toBeDefined();
      expect(mockSupabase.from).toHaveBeenCalledWith('requests');
    });

    it('should get state history', async () => {
      const requestId = 'request-123';

      const history = await agent.getStateHistory(requestId);

      expect(Array.isArray(history)).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('workflow_states');
    });
  });

  describe('Workflow State Transitions', () => {
    it('should transition from CREATED to ANALYZING', async () => {
      const requestId = 'request-123';

      await agent.transitionState(requestId, WorkflowState.CREATED, WorkflowState.ANALYZING);

      // Should not throw error
      expect(true).toBe(true);
    });

    it('should record state transition in database', async () => {
      const requestId = 'request-123';

      await agent.recordStateTransition(requestId, {
        from_state: WorkflowState.CREATED,
        to_state: WorkflowState.ANALYZING,
        agent_id: agent.id,
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('workflow_states');
    });
  });

  describe('Workflow Orchestration', () => {
    it('should start workflow orchestration', async () => {
      const requestData = {
        iso_agent_id: 'agent-123',
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15',
        client_email: 'test@example.com',
      };

      const result = await agent.orchestrateWorkflow(requestData);

      expect(result).toBeDefined();
      expect(result.request_id).toBeDefined();
      expect(result.workflow_status).toBeDefined();
    });

    it('should return workflow result with required fields', async () => {
      const requestData = {
        iso_agent_id: 'agent-123',
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15',
        client_email: 'test@example.com',
      };

      const result = await agent.orchestrateWorkflow(requestData);

      expect(result).toHaveProperty('request_id');
      expect(result).toHaveProperty('workflow_id');
      expect(result).toHaveProperty('workflow_status');
    });
  });

  describe('Agent Metrics', () => {
    it('should track agent metrics', () => {
      const metrics = agent.getMetrics();

      expect(metrics).toBeDefined();
      expect(metrics).toHaveProperty('totalExecutions');
      expect(metrics).toHaveProperty('successfulExecutions');
      expect(metrics).toHaveProperty('failedExecutions');
    });
  });

  describe('Cleanup', () => {
    it('should shutdown cleanly', async () => {
      await agent.shutdown();

      expect(agent.status).toBe(AgentStatus.IDLE);
    });
  });
});
