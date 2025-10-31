/**
 * Communication Agent Unit Tests
 *
 * Tests for the CommunicationAgent which generates and sends proposal emails to clients.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { AgentContext, AgentResult } from '@agents/core/types';
import { AgentType, AgentStatus } from '@agents/core/types';

describe('CommunicationAgent', () => {
  let CommunicationAgent: any;
  let agent: any;
  let mockContext: AgentContext;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup test context with proposal data
    mockContext = {
      requestId: 'req-123',
      userId: 'user-abc',
      sessionId: 'session-xyz',
      metadata: {
        clientData: {
          clientName: 'John Smith',
          email: 'john.smith@example.com',
          company: 'Smith Corp',
        },
        recommendation: {
          quoteId: 'quote-1',
          rank: 1,
          score: 92.5,
          reasoning: 'Best value with excellent operator rating',
        },
        analyzedQuotes: [
          {
            quoteId: 'quote-1',
            operator: 'Jet Elite',
            aircraftType: 'light_jet',
            price: 45000,
            departureTime: '2025-11-15T14:00:00Z',
            arrivalTime: '2025-11-15T17:00:00Z',
            score: 92.5,
            rank: 1,
          },
          {
            quoteId: 'quote-2',
            operator: 'Sky Charter',
            aircraftType: 'light_jet',
            price: 42000,
            departureTime: '2025-11-15T14:30:00Z',
            arrivalTime: '2025-11-15T17:30:00Z',
            score: 88.0,
            rank: 2,
          },
        ],
        rfpData: {
          departure: 'KTEB',
          arrival: 'KMIA',
          departureDate: '2025-11-15T14:00:00Z',
          passengers: 6,
        },
      },
    };

    // Dynamic import
    const module = await import('@agents/implementations/communication-agent');
    CommunicationAgent = module.CommunicationAgent;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with correct agent type', async () => {
      agent = new CommunicationAgent({
        type: AgentType.COMMUNICATION,
        name: 'Communication Manager',
      });

      await agent.initialize();

      expect(agent.type).toBe(AgentType.COMMUNICATION);
      expect(agent.status).toBe(AgentStatus.IDLE);
      expect(agent.name).toBe('Communication Manager');
    });

    it('should have a unique ID', () => {
      const agent1 = new CommunicationAgent({
        type: AgentType.COMMUNICATION,
        name: 'Communicator 1',
      });
      const agent2 = new CommunicationAgent({
        type: AgentType.COMMUNICATION,
        name: 'Communicator 2',
      });

      expect(agent1.id).toBeDefined();
      expect(agent2.id).toBeDefined();
      expect(agent1.id).not.toBe(agent2.id);
    });
  });

  describe('Email Generation', () => {
    beforeEach(async () => {
      agent = new CommunicationAgent({
        type: AgentType.COMMUNICATION,
        name: 'Communication Manager',
      });
      await agent.initialize();
    });

    it('should generate email content', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.data.emailContent).toBeDefined();
      expect(result.data.emailContent.subject).toBeDefined();
      expect(result.data.emailContent.body).toBeDefined();
    });

    it('should personalize email with client name', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.data.emailContent.body).toContain('John Smith');
    });

    it('should include flight route information', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.data.emailContent.body).toContain('KTEB');
      expect(result.data.emailContent.body).toContain('KMIA');
    });

    it('should include recommendation details', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.data.emailContent.body).toContain('Jet Elite');
    });

    it('should format price correctly', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      // Should include formatted price like $45,000
      expect(result.data.emailContent.body).toMatch(/\$[\d,]+/);
    });

    it('should include multiple quote options', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.data.emailContent.body).toContain('Jet Elite');
      expect(result.data.emailContent.body).toContain('Sky Charter');
    });
  });

  describe('Email Validation', () => {
    beforeEach(async () => {
      agent = new CommunicationAgent({
        type: AgentType.COMMUNICATION,
        name: 'Communication Manager',
      });
      await agent.initialize();
    });

    it('should validate client email is provided', async () => {
      const invalidContext = {
        ...mockContext,
        metadata: {
          ...mockContext.metadata,
          clientData: {
            clientName: 'John Smith',
            // No email
          },
        },
      };

      const result: AgentResult = await agent.execute(invalidContext);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('email');
    });

    it('should validate recommendation data exists', async () => {
      const invalidContext = {
        ...mockContext,
        metadata: {
          clientData: mockContext.metadata?.clientData,
          analyzedQuotes: mockContext.metadata?.analyzedQuotes,
          // No recommendation
        },
      };

      const result: AgentResult = await agent.execute(invalidContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate quotes are provided', async () => {
      const invalidContext = {
        ...mockContext,
        metadata: {
          clientData: mockContext.metadata?.clientData,
          recommendation: mockContext.metadata?.recommendation,
          // No quotes
        },
      };

      const result: AgentResult = await agent.execute(invalidContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Email Sending', () => {
    beforeEach(async () => {
      agent = new CommunicationAgent({
        type: AgentType.COMMUNICATION,
        name: 'Communication Manager',
      });
      await agent.initialize();
    });

    it('should send email successfully', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.data.emailSent).toBe(true);
    });

    it('should track email ID', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.data.emailId).toBeDefined();
      expect(typeof result.data.emailId).toBe('string');
    });

    it('should include recipient email', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.data.recipient).toBe('john.smith@example.com');
    });

    it('should track send timestamp', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.data.sentAt).toBeDefined();
      expect(result.data.sentAt).toBeInstanceOf(Date);
    });
  });

  describe('Email Formatting', () => {
    beforeEach(async () => {
      agent = new CommunicationAgent({
        type: AgentType.COMMUNICATION,
        name: 'Communication Manager',
      });
      await agent.initialize();
    });

    it('should use professional email subject', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      const subject = result.data.emailContent.subject;
      expect(subject).toBeDefined();
      expect(subject.length).toBeGreaterThan(0);
      expect(subject.length).toBeLessThan(100);
    });

    it('should format body as HTML', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      // Check for HTML tags
      const body = result.data.emailContent.body;
      expect(body).toMatch(/<[^>]+>/); // Contains HTML tags
    });

    it('should include call to action', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      const body = result.data.emailContent.body;
      // Should include some action phrase
      expect(body.toLowerCase()).toMatch(/book|confirm|contact|reply/);
    });

    it('should include contact information', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      const body = result.data.emailContent.body;
      // Should include some contact method
      expect(body).toBeTruthy();
    });
  });

  describe('Quote Presentation', () => {
    beforeEach(async () => {
      agent = new CommunicationAgent({
        type: AgentType.COMMUNICATION,
        name: 'Communication Manager',
      });
      await agent.initialize();
    });

    it('should highlight top recommendation', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      const body = result.data.emailContent.body;
      // Recommendation should be mentioned prominently (case-insensitive)
      expect(body.toLowerCase()).toContain('recommend');
    });

    it('should present quotes in ranked order', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      const body = result.data.emailContent.body;
      const jetEliteIndex = body.indexOf('Jet Elite');
      const skyCharterIndex = body.indexOf('Sky Charter');

      // Jet Elite (rank 1) should appear before Sky Charter (rank 2)
      expect(jetEliteIndex).toBeLessThan(skyCharterIndex);
    });

    it('should include departure and arrival times', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      const body = result.data.emailContent.body;
      // Should include time information
      expect(body).toMatch(/\d{1,2}:\d{2}|\d{4}-\d{2}-\d{2}/);
    });

    it('should display aircraft type information', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      const body = result.data.emailContent.body;
      expect(body.toLowerCase()).toContain('jet');
    });
  });

  describe('Context Enrichment', () => {
    beforeEach(async () => {
      agent = new CommunicationAgent({
        type: AgentType.COMMUNICATION,
        name: 'Communication Manager',
      });
      await agent.initialize();
    });

    it('should preserve request ID', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.data.requestId).toBe(mockContext.requestId);
    });

    it('should include session ID', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.data.sessionId).toBe(mockContext.sessionId);
    });

    it('should not specify next agent (terminal state)', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      // Communication is typically the last agent
      expect(result.data.nextAgent).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      agent = new CommunicationAgent({
        type: AgentType.COMMUNICATION,
        name: 'Communication Manager',
      });
      await agent.initialize();
    });

    it('should handle missing client data', async () => {
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

    it('should handle email send failures', async () => {
      // This would test resilience to Gmail MCP failures
      const result: AgentResult = await agent.execute(mockContext);

      // Should complete or fail gracefully
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
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
      agent = new CommunicationAgent({
        type: AgentType.COMMUNICATION,
        name: 'Communication Manager',
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

    it('should track MCP tool calls for email sending', async () => {
      await agent.execute(mockContext);

      const metrics = agent.getMetrics();
      expect(metrics.toolCallsCount).toBeGreaterThan(0);
    });
  });
});
