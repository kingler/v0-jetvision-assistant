/**
 * Proposal Analysis Agent Implementation
 *
 * Scores and ranks flight quotes from operators.
 * Analyzes proposals based on price, quality, and reputation.
 */

import { BaseAgent } from '../core/base-agent';
import type {
  AgentContext,
  AgentResult,
  AgentConfig,
} from '../core/types';
import { AgentType, AgentStatus } from '../core/types';

interface Quote {
  quoteId: string;
  operator: string;
  aircraftType: string;
  price: number;
  departureTime: string;
  arrivalTime?: string;
  operatorRating?: number;
  aircraftAge?: number;
}

interface AnalyzedQuote extends Quote {
  score: number;
  rank: number;
  scoreBreakdown: {
    priceScore: number;
    qualityScore: number;
    reputationScore: number;
  };
  overBudget: boolean;
  budgetVariance: number;
}

interface Recommendation {
  quoteId: string;
  rank: number;
  score: number;
  reasoning: string;
}

interface Analysis {
  priceRange: {
    min: number;
    max: number;
  };
  averagePrice: number;
  bestValue: {
    quoteId: string;
    score: number;
  };
}

/**
 * ProposalAnalysisAgent
 * Scores and ranks flight quotes
 */
export class ProposalAnalysisAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super({
      ...config,
      type: AgentType.PROPOSAL_ANALYSIS,
    });
  }

  /**
   * Initialize the agent
   */
  async initialize(): Promise<void> {
    await super.initialize();
    console.log(`[${this.name}] ProposalAnalysisAgent initialized`);
  }

  /**
   * Execute the agent
   * Analyzes and ranks flight quotes
   */
  async execute(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    this._status = AgentStatus.RUNNING;

    try {
      // Extract and validate data
      const rfpId = this.extractRFPId(context);
      const quotes = this.extractQuotes(context);
      const clientPreferences = this.extractClientPreferences(context);

      this.validateRFPId(rfpId);
      this.validateQuotes(quotes);
      // After validation, we know quotes is defined
      const validQuotes = quotes!;

      // Handle empty quotes
      if (validQuotes.length === 0) {
        this.metrics.totalExecutions++;
        this.metrics.successfulExecutions++;
        this._status = AgentStatus.COMPLETED;

        return {
          success: true,
          data: {
            rfpId,
            analyzedQuotes: [],
            recommendation: null,
            quotesAnalyzed: 0,
            requestId: context.requestId,
            sessionId: context.sessionId,
            nextAgent: AgentType.COMMUNICATION,
          },
          metadata: {
            executionTime: Date.now() - startTime,
          },
        };
      }

      // Analyze quotes
      const analyzedQuotes = await this.analyzeQuotes(
        validQuotes,
        clientPreferences
      );

      // Rank quotes by score
      const rankedQuotes = this.rankQuotes(analyzedQuotes);

      // Get top recommendation
      const recommendation = this.getRecommendation(rankedQuotes);

      // Calculate comparative analysis
      const analysis = this.calculateAnalysis(rankedQuotes);

      // Update metrics
      this.metrics.totalExecutions++;
      this.metrics.successfulExecutions++;
      this._status = AgentStatus.COMPLETED;

      const executionTime = Date.now() - startTime;
      this.updateAverageExecutionTime(executionTime);

      return {
        success: true,
        data: {
          rfpId,
          analyzedQuotes: rankedQuotes,
          recommendation,
          analysis,
          quotesAnalyzed: validQuotes.length,
          requestId: context.requestId,
          sessionId: context.sessionId,
          nextAgent: AgentType.COMMUNICATION,
        },
        metadata: {
          executionTime,
          toolCalls: this.metrics.toolCallsCount,
        },
      };
    } catch (error) {
      // Handle errors
      this.metrics.totalExecutions++;
      this.metrics.failedExecutions++;
      this._status = AgentStatus.ERROR;

      const executionTime = Date.now() - startTime;

      return {
        success: false,
        error: error as Error,
        metadata: {
          executionTime,
        },
      };
    }
  }

  /**
   * Extract RFP ID from context
   */
  private extractRFPId(context: AgentContext): string | undefined {
    return context.metadata?.rfpId as string | undefined;
  }

  /**
   * Extract quotes from context
   */
  private extractQuotes(context: AgentContext): Quote[] | undefined {
    return context.metadata?.quotes as Quote[] | undefined;
  }

  /**
   * Extract client preferences from context
   */
  private extractClientPreferences(context: AgentContext): any {
    return (context.metadata?.clientData as any)?.preferences || {};
  }

  /**
   * Validate RFP ID
   */
  private validateRFPId(rfpId: string | undefined): void {
    if (!rfpId) {
      throw new Error('Missing required field: rfpId');
    }
  }

  /**
   * Validate quotes
   */
  private validateQuotes(quotes: Quote[] | undefined): void {
    if (!quotes || !Array.isArray(quotes)) {
      throw new Error('Missing required field: quotes');
    }
  }

  /**
   * Analyze all quotes
   */
  private async analyzeQuotes(
    quotes: Quote[],
    preferences: any
  ): Promise<AnalyzedQuote[]> {
    const budget = preferences.budget;
    const prioritize = preferences.prioritize || 'balance';

    return quotes.map((quote) => {
      const scoreBreakdown = this.calculateScoreBreakdown(
        quote,
        quotes,
        prioritize
      );
      const score = this.calculateOverallScore(scoreBreakdown, prioritize);
      const overBudget = budget ? quote.price > budget : false;
      const budgetVariance = budget ? quote.price - budget : 0;

      return {
        ...quote,
        score,
        rank: 0, // Will be set during ranking
        scoreBreakdown,
        overBudget,
        budgetVariance,
      };
    });
  }

  /**
   * Calculate score breakdown for a quote
   */
  private calculateScoreBreakdown(
    quote: Quote,
    allQuotes: Quote[],
    prioritize: string
  ): { priceScore: number; qualityScore: number; reputationScore: number } {
    // Calculate price score (lower price = higher score)
    const prices = allQuotes.map((q) => q.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    const priceScore =
      priceRange > 0 ? ((maxPrice - quote.price) / priceRange) * 100 : 100;

    // Calculate quality score (newer aircraft = higher score)
    const aircraftAge = quote.aircraftAge || 5;
    const qualityScore = Math.max(0, 100 - aircraftAge * 10);

    // Calculate reputation score (higher rating = higher score)
    const operatorRating = quote.operatorRating || 4.0;
    const reputationScore = (operatorRating / 5.0) * 100;

    return {
      priceScore,
      qualityScore,
      reputationScore,
    };
  }

  /**
   * Calculate overall score based on breakdown and client priorities
   */
  private calculateOverallScore(
    breakdown: { priceScore: number; qualityScore: number; reputationScore: number },
    prioritize: string
  ): number {
    const { priceScore, qualityScore, reputationScore } = breakdown;

    // Adjust weights based on client preference
    let weights = { price: 0.4, quality: 0.3, reputation: 0.3 };

    if (prioritize === 'price') {
      weights = { price: 0.6, quality: 0.2, reputation: 0.2 };
    } else if (prioritize === 'quality') {
      weights = { price: 0.2, quality: 0.5, reputation: 0.3 };
    }

    const score =
      priceScore * weights.price +
      qualityScore * weights.quality +
      reputationScore * weights.reputation;

    return Math.round(score * 100) / 100; // Round to 2 decimals
  }

  /**
   * Rank quotes by score (highest first)
   */
  private rankQuotes(quotes: AnalyzedQuote[]): AnalyzedQuote[] {
    const sorted = [...quotes].sort((a, b) => b.score - a.score);

    return sorted.map((quote, index) => ({
      ...quote,
      rank: index + 1,
    }));
  }

  /**
   * Get top recommendation
   */
  private getRecommendation(rankedQuotes: AnalyzedQuote[]): Recommendation {
    const topQuote = rankedQuotes[0];

    let reasoning = `Best overall option based on comprehensive analysis. `;
    reasoning += `Score: ${topQuote.score.toFixed(1)}/100. `;
    reasoning += `Price: $${topQuote.price.toLocaleString()}. `;
    reasoning += `Operator: ${topQuote.operator} (${topQuote.operatorRating || 'N/A'} rating). `;
    reasoning += `Aircraft: ${topQuote.aircraftType} (${topQuote.aircraftAge || 'N/A'} years old).`;

    return {
      quoteId: topQuote.quoteId,
      rank: topQuote.rank,
      score: topQuote.score,
      reasoning,
    };
  }

  /**
   * Calculate comparative analysis
   */
  private calculateAnalysis(quotes: AnalyzedQuote[]): Analysis {
    const prices = quotes.map((q) => q.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const averagePrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;

    const bestValueQuote = quotes.reduce((best, current) => {
      // Best value = highest score among quotes within reasonable price range
      const priceThreshold = averagePrice * 1.1; // Within 10% of average
      if (current.price <= priceThreshold && current.score > best.score) {
        return current;
      }
      return best;
    }, quotes[0]);

    return {
      priceRange: {
        min: minPrice,
        max: maxPrice,
      },
      averagePrice: Math.round(averagePrice),
      bestValue: {
        quoteId: bestValueQuote.quoteId,
        score: bestValueQuote.score,
      },
    };
  }

  /**
   * Update average execution time
   */
  private updateAverageExecutionTime(executionTime: number): void {
    const totalExecutions = this.metrics.totalExecutions;
    const currentAverage = this.metrics.averageExecutionTime;

    this.metrics.averageExecutionTime =
      (currentAverage * (totalExecutions - 1) + executionTime) / totalExecutions;
  }
}
