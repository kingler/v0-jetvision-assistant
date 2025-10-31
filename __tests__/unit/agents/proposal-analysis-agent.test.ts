/**
 * Proposal Analysis Agent Unit Tests
 *
 * Tests for the ProposalAnalysisAgent which scores and ranks flight quotes from operators.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { AgentContext, AgentResult } from '@agents/core/types';
import { AgentType, AgentStatus } from '@agents/core/types';

describe('ProposalAnalysisAgent', () => {
  let ProposalAnalysisAgent: any;
  let agent: any;
  let mockContext: AgentContext;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup test context with flight quotes
    mockContext = {
      requestId: 'req-123',
      userId: 'user-abc',
      sessionId: 'session-xyz',
      metadata: {
        rfpId: 'rfp-123',
        quotes: [
          {
            quoteId: 'quote-1',
            operator: 'Jet Elite',
            aircraftType: 'light_jet',
            price: 45000,
            departureTime: '2025-11-15T14:00:00Z',
            arrivalTime: '2025-11-15T17:00:00Z',
            operatorRating: 4.8,
            aircraftAge: 2,
          },
          {
            quoteId: 'quote-2',
            operator: 'Sky Charter',
            aircraftType: 'light_jet',
            price: 42000,
            departureTime: '2025-11-15T14:30:00Z',
            arrivalTime: '2025-11-15T17:30:00Z',
            operatorRating: 4.5,
            aircraftAge: 5,
          },
          {
            quoteId: 'quote-3',
            operator: 'Premium Air',
            aircraftType: 'light_jet',
            price: 48000,
            departureTime: '2025-11-15T13:45:00Z',
            arrivalTime: '2025-11-15T16:45:00Z',
            operatorRating: 4.9,
            aircraftAge: 1,
          },
        ],
        clientData: {
          preferences: {
            budget: 50000,
            prioritize: 'price', // 'price' | 'quality' | 'balance'
          },
        },
      },
    };

    // Dynamic import
    const module = await import('@agents/implementations/proposal-analysis-agent');
    ProposalAnalysisAgent = module.ProposalAnalysisAgent;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with correct agent type', async () => {
      agent = new ProposalAnalysisAgent({
        type: AgentType.PROPOSAL_ANALYSIS,
        name: 'Proposal Analyzer',
      });

      await agent.initialize();

      expect(agent.type).toBe(AgentType.PROPOSAL_ANALYSIS);
      expect(agent.status).toBe(AgentStatus.IDLE);
      expect(agent.name).toBe('Proposal Analyzer');
    });

    it('should have a unique ID', () => {
      const agent1 = new ProposalAnalysisAgent({
        type: AgentType.PROPOSAL_ANALYSIS,
        name: 'Analyzer 1',
      });
      const agent2 = new ProposalAnalysisAgent({
        type: AgentType.PROPOSAL_ANALYSIS,
        name: 'Analyzer 2',
      });

      expect(agent1.id).toBeDefined();
      expect(agent2.id).toBeDefined();
      expect(agent1.id).not.toBe(agent2.id);
    });
  });

  describe('Quote Analysis', () => {
    beforeEach(async () => {
      agent = new ProposalAnalysisAgent({
        type: AgentType.PROPOSAL_ANALYSIS,
        name: 'Proposal Analyzer',
      });
      await agent.initialize();
    });

    it('should analyze all quotes', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.data.analyzedQuotes).toBeDefined();
      expect(result.data.analyzedQuotes.length).toBe(3);
    });

    it('should validate required fields - quotes', async () => {
      const invalidContext = {
        ...mockContext,
        metadata: {
          rfpId: 'rfp-123',
        },
      };

      const result: AgentResult = await agent.execute(invalidContext);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('quotes');
    });

    it('should validate required fields - rfpId', async () => {
      const invalidContext = {
        ...mockContext,
        metadata: {
          quotes: mockContext.metadata?.quotes,
        },
      };

      const result: AgentResult = await agent.execute(invalidContext);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('rfpId');
    });

    it('should handle empty quotes array', async () => {
      const emptyContext = {
        ...mockContext,
        metadata: {
          rfpId: 'rfp-123',
          quotes: [],
        },
      };

      const result: AgentResult = await agent.execute(emptyContext);

      expect(result.success).toBe(true);
      expect(result.data.analyzedQuotes).toHaveLength(0);
      expect(result.data.recommendation).toBeNull();
    });
  });

  describe('Scoring Algorithm', () => {
    beforeEach(async () => {
      agent = new ProposalAnalysisAgent({
        type: AgentType.PROPOSAL_ANALYSIS,
        name: 'Proposal Analyzer',
      });
      await agent.initialize();
    });

    it('should calculate score for each quote', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      result.data.analyzedQuotes.forEach((quote: any) => {
        expect(quote.score).toBeDefined();
        expect(quote.score).toBeGreaterThanOrEqual(0);
        expect(quote.score).toBeLessThanOrEqual(100);
      });
    });

    it('should include score breakdown', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      result.data.analyzedQuotes.forEach((quote: any) => {
        expect(quote.scoreBreakdown).toBeDefined();
        expect(quote.scoreBreakdown.priceScore).toBeDefined();
        expect(quote.scoreBreakdown.qualityScore).toBeDefined();
        expect(quote.scoreBreakdown.reputationScore).toBeDefined();
      });
    });

    it('should prioritize price when client preference is price', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      // Lowest price quote should have higher score
      const lowestPriceQuote = result.data.analyzedQuotes.find(
        (q: any) => q.price === 42000
      );
      const highestPriceQuote = result.data.analyzedQuotes.find(
        (q: any) => q.price === 48000
      );

      expect(lowestPriceQuote.scoreBreakdown.priceScore).toBeGreaterThan(
        highestPriceQuote.scoreBreakdown.priceScore
      );
    });

    it('should consider operator rating in quality score', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      const highRatingQuote = result.data.analyzedQuotes.find(
        (q: any) => q.operatorRating === 4.9
      );
      const lowRatingQuote = result.data.analyzedQuotes.find(
        (q: any) => q.operatorRating === 4.5
      );

      expect(highRatingQuote.scoreBreakdown.reputationScore).toBeGreaterThan(
        lowRatingQuote.scoreBreakdown.reputationScore
      );
    });

    it('should consider aircraft age in quality score', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      const newAircraftQuote = result.data.analyzedQuotes.find(
        (q: any) => q.aircraftAge === 1
      );
      const oldAircraftQuote = result.data.analyzedQuotes.find(
        (q: any) => q.aircraftAge === 5
      );

      expect(newAircraftQuote.scoreBreakdown.qualityScore).toBeGreaterThanOrEqual(
        oldAircraftQuote.scoreBreakdown.qualityScore
      );
    });
  });

  describe('Ranking', () => {
    beforeEach(async () => {
      agent = new ProposalAnalysisAgent({
        type: AgentType.PROPOSAL_ANALYSIS,
        name: 'Proposal Analyzer',
      });
      await agent.initialize();
    });

    it('should rank quotes by score', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      const scores = result.data.analyzedQuotes.map((q: any) => q.score);
      const sortedScores = [...scores].sort((a, b) => b - a);

      expect(scores).toEqual(sortedScores);
    });

    it('should assign rank to each quote', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      result.data.analyzedQuotes.forEach((quote: any, index: number) => {
        expect(quote.rank).toBe(index + 1);
      });
    });

    it('should identify top recommendation', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.data.recommendation).toBeDefined();
      expect(result.data.recommendation.quoteId).toBe(
        result.data.analyzedQuotes[0].quoteId
      );
      expect(result.data.recommendation.rank).toBe(1);
    });

    it('should include recommendation reasoning', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.data.recommendation.reasoning).toBeDefined();
      expect(typeof result.data.recommendation.reasoning).toBe('string');
      expect(result.data.recommendation.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe('Budget Compliance', () => {
    beforeEach(async () => {
      agent = new ProposalAnalysisAgent({
        type: AgentType.PROPOSAL_ANALYSIS,
        name: 'Proposal Analyzer',
      });
      await agent.initialize();
    });

    it('should flag quotes over budget', async () => {
      const overBudgetContext = {
        ...mockContext,
        metadata: {
          ...mockContext.metadata,
          clientData: {
            preferences: {
              budget: 40000, // Lower than all quotes
            },
          },
        },
      };

      const result: AgentResult = await agent.execute(overBudgetContext);

      result.data.analyzedQuotes.forEach((quote: any) => {
        expect(quote.overBudget).toBe(true);
      });
    });

    it('should identify quotes within budget', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      result.data.analyzedQuotes.forEach((quote: any) => {
        expect(quote.overBudget).toBe(false);
      });
    });

    it('should calculate budget variance', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      result.data.analyzedQuotes.forEach((quote: any) => {
        expect(quote.budgetVariance).toBeDefined();
        expect(typeof quote.budgetVariance).toBe('number');
      });
    });
  });

  describe('Quote Comparison', () => {
    beforeEach(async () => {
      agent = new ProposalAnalysisAgent({
        type: AgentType.PROPOSAL_ANALYSIS,
        name: 'Proposal Analyzer',
      });
      await agent.initialize();
    });

    it('should calculate price range', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.data.analysis).toBeDefined();
      expect(result.data.analysis.priceRange).toBeDefined();
      expect(result.data.analysis.priceRange.min).toBe(42000);
      expect(result.data.analysis.priceRange.max).toBe(48000);
    });

    it('should calculate average price', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.data.analysis.averagePrice).toBeDefined();
      expect(result.data.analysis.averagePrice).toBe(45000); // (45000 + 42000 + 48000) / 3
    });

    it('should identify best value quote', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.data.analysis.bestValue).toBeDefined();
      expect(result.data.analysis.bestValue.quoteId).toBeDefined();
    });
  });

  describe('Context Enrichment', () => {
    beforeEach(async () => {
      agent = new ProposalAnalysisAgent({
        type: AgentType.PROPOSAL_ANALYSIS,
        name: 'Proposal Analyzer',
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

    it('should set next agent to Communication', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.data.nextAgent).toBe(AgentType.COMMUNICATION);
    });

    it('should include RFP ID in result', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.data.rfpId).toBe('rfp-123');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      agent = new ProposalAnalysisAgent({
        type: AgentType.PROPOSAL_ANALYSIS,
        name: 'Proposal Analyzer',
      });
      await agent.initialize();
    });

    it('should handle missing quotes', async () => {
      const invalidContext = {
        requestId: 'req-123',
        metadata: {
          rfpId: 'rfp-123',
        },
      };

      const result: AgentResult = await agent.execute(invalidContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should update agent status to ERROR on failure', async () => {
      await agent.execute({ requestId: 'invalid', metadata: {} });

      expect(agent.status).toBe(AgentStatus.ERROR);
    });

    it('should handle malformed quote data', async () => {
      const malformedContext = {
        ...mockContext,
        metadata: {
          rfpId: 'rfp-123',
          quotes: [
            {
              quoteId: 'quote-1',
              // Missing required fields
            },
          ],
        },
      };

      const result: AgentResult = await agent.execute(malformedContext);

      // Should handle gracefully
      expect(result).toBeDefined();
    });
  });

  describe('Metrics Tracking', () => {
    beforeEach(async () => {
      agent = new ProposalAnalysisAgent({
        type: AgentType.PROPOSAL_ANALYSIS,
        name: 'Proposal Analyzer',
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

    it('should track number of quotes analyzed', async () => {
      const result: AgentResult = await agent.execute(mockContext);

      expect(result.data.quotesAnalyzed).toBe(3);
    });
  });
});
