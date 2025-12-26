/**
 * Error Monitor Agent Unit Tests
 *
 * Tests for the ErrorMonitorAgent which monitors errors and implements retry logic.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { AgentContext, AgentResult } from '@agents/core/types';
import { AgentType, AgentStatus } from '@agents/core/types';

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

describe('ErrorMonitorAgent', () => {
  let ErrorMonitorAgent: any;
  let agent: any;
  let mockContext: AgentContext;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup test context with error data
    mockContext = {
      requestId: 'req-123',
      userId: 'user-abc',
      sessionId: 'session-xyz',
      metadata: {
        error: {
          message: 'Connection timeout',
          code: 'TIMEOUT',
          source: 'FlightSearchAgent',
          timestamp: new Date().toISOString(),
          severity: 'medium',
        },
        attemptNumber: 1,
        maxRetries: 3,
      },
    };

    // Dynamic import
    const module = await import('@agents/implementations/error-monitor-agent');
    ErrorMonitorAgent = module.ErrorMonitorAgent;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with correct agent type', async () => {
      agent = new ErrorMonitorAgent({
        type: AgentType.ERROR_MONITOR,
        name: 'Error Monitor',
      });

      await agent.initialize();

      expect(agent.type).toBe(AgentType.ERROR_MONITOR);
      expect(agent.status).toBe(AgentStatus.IDLE);
      expect(agent.name).toBe('Error Monitor');
    });

    it('should have a unique ID', () => {
      const agent1 = new ErrorMonitorAgent({
        type: AgentType.ERROR_MONITOR,
        name: 'Monitor 1',
      });
      const agent2 = new ErrorMonitorAgent({
        type: AgentType.ERROR_MONITOR,
        name: 'Monitor 2',
      });

      expect(agent1.id).toBeDefined();
      expect(agent2.id).toBeDefined();
      expect(agent1.id).not.toBe(agent2.id);
    });
  });

  describe('Error Analysis', () => {
    beforeEach(async () => {
      agent = new ErrorMonitorAgent({
        type: AgentType.ERROR_MONITOR,
        name: 'Error Monitor',
      });
      await agent.initialize();
    });

    it('should analyze error details', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.success).toBe(true);
      expect((result.data as any).errorAnalysis).toBeDefined();
    });

    it('should extract error message', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect((result.data as any).errorAnalysis.message).toBe('Connection timeout');
    });

    it('should identify error source agent', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect((result.data as any).errorAnalysis.source).toBe('FlightSearchAgent');
    });

    it('should categorize error severity', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect((result.data as any).errorAnalysis.severity).toBeDefined();
      expect(['low', 'medium', 'high', 'critical']).toContain(
        (result.data as any).errorAnalysis.severity
      );
    });

    it('should validate error data exists', async () => {
      const invalidContext = {
        requestId: 'req-123',
        metadata: {},
      };

      const result: AgentResult = await agent.execute(invalidContext);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('error');
    });
  });

  describe('Retry Logic', () => {
    beforeEach(async () => {
      agent = new ErrorMonitorAgent({
        type: AgentType.ERROR_MONITOR,
        name: 'Error Monitor',
      });
      await agent.initialize();
    });

    it('should determine if retry is recommended', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect((result.data as any).shouldRetry).toBeDefined();
      expect(typeof (result.data as any).shouldRetry).toBe('boolean');
    });

    it('should recommend retry for transient errors', async () => {
      const transientContext = {
        ...mockContext,
        metadata: {
          error: {
            message: 'Network timeout',
            code: 'TIMEOUT',
            source: 'FlightSearchAgent',
          },
          attemptNumber: 1,
          maxRetries: 3,
        },
      };

      const result: AgentResult = await agent.execute(transientContext);

      expect((result.data as any).shouldRetry).toBe(true);
    });

    it('should not recommend retry after max attempts', async () => {
      const maxAttemptsContext = {
        ...mockContext,
        metadata: {
          error: mockContext.metadata?.error,
          attemptNumber: 3,
          maxRetries: 3,
        },
      };

      const result: AgentResult = await agent.execute(maxAttemptsContext);

      expect((result.data as any).shouldRetry).toBe(false);
      expect((result.data as any).reason.toLowerCase()).toContain('max');
    });

    it('should calculate retry delay with backoff', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      if ((result.data as any).shouldRetry) {
        expect((result.data as any).retryDelay).toBeDefined();
        expect((result.data as any).retryDelay).toBeGreaterThan(0);
      }
    });

    it('should increase delay with attempt number (exponential backoff)', async () => {
      const attempt1 = await agent.execute({
        ...mockContext,
        metadata: { ...mockContext.metadata, attemptNumber: 1 },
      });

      const attempt2 = await agent.execute({
        ...mockContext,
        metadata: { ...mockContext.metadata, attemptNumber: 2 },
      });

      if (attempt1.data.shouldRetry && attempt2.data.shouldRetry) {
        expect(attempt2.data.retryDelay).toBeGreaterThan(attempt1.data.retryDelay);
      }
    });
  });

  describe('Error Classification', () => {
    beforeEach(async () => {
      agent = new ErrorMonitorAgent({
        type: AgentType.ERROR_MONITOR,
        name: 'Error Monitor',
      });
      await agent.initialize();
    });

    it('should classify network errors as transient', async () => {
      const networkError = {
        ...mockContext,
        metadata: {
          error: {
            message: 'Network request failed',
            code: 'NETWORK_ERROR',
            source: 'FlightSearchAgent',
          },
          attemptNumber: 1,
        },
      };

      const result: AgentResult = await agent.execute(networkError);

      expect((result.data as any).errorAnalysis.isTransient).toBe(true);
    });

    it('should classify validation errors as non-transient', async () => {
      const validationError = {
        ...mockContext,
        metadata: {
          error: {
            message: 'Invalid email format',
            code: 'VALIDATION_ERROR',
            source: 'CommunicationAgent',
          },
          attemptNumber: 1,
        },
      };

      const result: AgentResult = await agent.execute(validationError);

      expect((result.data as any).errorAnalysis.isTransient).toBe(false);
    });

    it('should identify error type', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect((result.data as any).errorAnalysis.errorType).toBeDefined();
      expect(typeof (result.data as any).errorAnalysis.errorType).toBe('string');
    });
  });

  describe('Error Recovery Suggestions', () => {
    beforeEach(async () => {
      agent = new ErrorMonitorAgent({
        type: AgentType.ERROR_MONITOR,
        name: 'Error Monitor',
      });
      await agent.initialize();
    });

    it('should provide recovery suggestions', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect((result.data as any).recoverySuggestions).toBeDefined();
      expect(Array.isArray((result.data as any).recoverySuggestions)).toBe(true);
    });

    it('should suggest retry for transient errors', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      if ((result.data as any).errorAnalysis.isTransient && (result.data as any).shouldRetry) {
        const suggestionsLower = (result.data as any).recoverySuggestions.map((s: string) => s.toLowerCase());
        expect(suggestionsLower.some((s: string) => s.includes('retry'))).toBe(true);
      }
    });

    it('should suggest validation fix for validation errors', async () => {
      const validationError = {
        ...mockContext,
        metadata: {
          error: {
            message: 'Missing required field',
            code: 'VALIDATION_ERROR',
            source: 'OrchestratorAgent',
          },
          attemptNumber: 1,
        },
      };

      const result: AgentResult = await agent.execute(validationError);

      expect((result.data as any).recoverySuggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Error Logging', () => {
    beforeEach(async () => {
      agent = new ErrorMonitorAgent({
        type: AgentType.ERROR_MONITOR,
        name: 'Error Monitor',
      });
      await agent.initialize();
    });

    it('should log error details', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect((result.data as any).logged).toBe(true);
    });

    it('should include timestamp in log', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect((result.data as any).logEntry.timestamp).toBeDefined();
      expect((result.data as any).logEntry.timestamp).toBeInstanceOf(Date);
    });

    it('should track error count for patterns', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect((result.data as any).errorCount).toBeDefined();
      expect(typeof (result.data as any).errorCount).toBe('number');
    });
  });

  describe('Alert Generation', () => {
    beforeEach(async () => {
      agent = new ErrorMonitorAgent({
        type: AgentType.ERROR_MONITOR,
        name: 'Error Monitor',
      });
      await agent.initialize();
    });

    it('should determine if alert is needed', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect((result.data as any).alertRequired).toBeDefined();
      expect(typeof (result.data as any).alertRequired).toBe('boolean');
    });

    it('should trigger alert for critical errors', async () => {
      const criticalError = {
        ...mockContext,
        metadata: {
          error: {
            message: 'Database connection failed',
            code: 'DB_ERROR',
            source: 'ClientDataAgent',
            severity: 'critical',
          },
          attemptNumber: 1,
        },
      };

      const result: AgentResult = await agent.execute(criticalError);

      expect((result.data as any).alertRequired).toBe(true);
    });

    it('should not alert for low severity errors', async () => {
      const lowSeverityError = {
        ...mockContext,
        metadata: {
          error: {
            message: 'Cache miss',
            code: 'CACHE_MISS',
            source: 'ClientDataAgent',
            severity: 'low',
          },
          attemptNumber: 1,
        },
      };

      const result: AgentResult = await agent.execute(lowSeverityError);

      expect((result.data as any).alertRequired).toBe(false);
    });
  });

  describe('Context Enrichment', () => {
    beforeEach(async () => {
      agent = new ErrorMonitorAgent({
        type: AgentType.ERROR_MONITOR,
        name: 'Error Monitor',
      });
      await agent.initialize();
    });

    it('should preserve request ID', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect((result.data as any).requestId).toBe(mockContext.requestId);
    });

    it('should include session ID', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect((result.data as any).sessionId).toBe(mockContext.sessionId);
    });

    it('should specify recovery agent if needed', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      if ((result.data as any).shouldRetry) {
        expect((result.data as any).nextAgent).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      agent = new ErrorMonitorAgent({
        type: AgentType.ERROR_MONITOR,
        name: 'Error Monitor',
      });
      await agent.initialize();
    });

    it('should handle missing error data', async () => {
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

    it('should handle malformed error data', async () => {
      const malformedContext = {
        ...mockContext,
        metadata: {
          error: {
            // Missing required fields
          },
        },
      };

      const result: AgentResult = await agent.execute(malformedContext);

      // Should handle gracefully
      expect(result).toBeDefined();
    });
  });

  describe('Metrics Tracking', () => {
    beforeEach(async () => {
      agent = new ErrorMonitorAgent({
        type: AgentType.ERROR_MONITOR,
        name: 'Error Monitor',
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
  });
});
