# Proposal Analysis Agent Implementation

**Task ID**: TASK-015
**Created**: 2025-10-20
**Assigned To**: AI/ML Engineer / Backend Developer
**Status**: `pending`
**Priority**: `critical`
**Estimated Time**: 8 hours
**Actual Time**: - (update when complete)

---

## 1. TASK OVERVIEW

### Objective
Implement the Proposal Analysis Agent using OpenAI GPT-4/5 to analyze and score operator quotes, implement multi-factor scoring algorithm (price, aircraft suitability, operator rating, response time), select top 3 proposals for client presentation, and generate detailed recommendation rationale.

### User Story
**As an** ISO agent
**I want** the system to automatically analyze quotes and recommend the best options
**So that** I can send clients the most competitive and suitable proposals without manual comparison

### Business Value
The Proposal Analysis Agent transforms raw operator quotes into actionable recommendations by applying sophisticated scoring algorithms that balance price, quality, and suitability. This ensures clients receive optimal options while maintaining profit margins for the broker. The agent's ability to explain its reasoning builds trust and reduces second-guessing.

---

## 2. REQUIREMENTS & ACCEPTANCE CRITERIA

### Functional Requirements

**FR-1**: System SHALL implement Proposal Analysis Agent as OpenAI Assistant
- Use OpenAI GPT-4/5 for intelligent quote evaluation
- Apply multi-factor scoring algorithm
- Generate human-readable rationale for recommendations
- Support configurable scoring weights

**FR-2**: System SHALL implement scoring algorithm with weighted factors
- **Price Score** (40% weight): Lower price = higher score, with markup consideration
- **Aircraft Suitability** (25% weight): Capacity match, range, speed, amenities
- **Operator Rating** (20% weight): Safety rating, reliability, reputation
- **Response Time** (15% weight): Faster response = higher score
- Composite score calculation (0-100 scale)

**FR-3**: System SHALL select top 3 proposals
- Rank all quotes by composite score
- Ensure diversity (different aircraft types, price ranges)
- Consider client preferences in selection
- Include rationale for each recommendation

**FR-4**: System SHALL generate recommendation rationale
- Explain why each option was selected
- Highlight key benefits and trade-offs
- Personalize based on client preferences
- Provide comparison insights

**FR-5**: System SHALL calculate profit margins
- Apply configurable markup (percentage or fixed amount)
- Calculate total client price
- Show profit per quote
- Support custom markup per request

**FR-6**: System SHALL handle quote variations
- Process quotes with different aircraft types
- Handle multi-leg pricing
- Manage incomplete quote data
- Deal with outlier pricing

### Acceptance Criteria

- [ ] **AC-1**: Proposal Analysis Agent implemented as OpenAI Assistant
- [ ] **AC-2**: Multi-factor scoring algorithm produces consistent scores
- [ ] **AC-3**: Top 3 selection includes diverse options
- [ ] **AC-4**: Recommendation rationale is clear and persuasive
- [ ] **AC-5**: Profit margin calculations are accurate
- [ ] **AC-6**: Handles all quote variations gracefully
- [ ] **AC-7**: Unit tests achieve >75% coverage
- [ ] **AC-8**: Integration tests verify end-to-end analysis
- [ ] **AC-9**: Analysis completes in <5 seconds
- [ ] **AC-10**: Code review approved

### Non-Functional Requirements

- **Performance**: Quote analysis <5s for up to 20 quotes
- **Accuracy**: 99%+ calculation accuracy
- **Consistency**: Same quotes = same scores (deterministic)
- **Explainability**: Clear rationale for all recommendations

---

## 3. TEST-DRIVEN DEVELOPMENT (TDD) APPROACH

### Step 1: Write Tests FIRST (Red Phase)

**Test Files to Create**:
```
__tests__/unit/agents/proposal-analysis-agent.test.ts
__tests__/unit/agents/quote-scoring.test.ts
__tests__/integration/agents/proposal-selection.test.ts
```

**Example Test (Write This First)**:
```typescript
// __tests__/unit/agents/proposal-analysis-agent.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { ProposalAnalysisAgent } from '@/lib/agents/proposal-analysis-agent'
import { createClient } from '@supabase/supabase-js'

describe('ProposalAnalysisAgent', () => {
  let agent: ProposalAnalysisAgent
  let supabase: any

  beforeEach(() => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    agent = new ProposalAnalysisAgent({
      openaiApiKey: process.env.OPENAI_API_KEY!,
      supabase
    })
  })

  describe('Quote Scoring', () => {
    it('should score quotes with multi-factor algorithm', async () => {
      const quote = {
        id: 'quote-1',
        base_price: 25000,
        aircraft_type: 'Citation XLS',
        aircraft_capacity: 8,
        aircraft_range_nm: 2100,
        operator_rating: 95,
        response_time_hours: 2
      }

      const request = {
        passengers: 6,
        route_distance_nm: 2400
      }

      const scored = await agent.scoreQuote(quote, request)

      expect(scored).toHaveProperty('composite_score')
      expect(scored.composite_score).toBeGreaterThanOrEqual(0)
      expect(scored.composite_score).toBeLessThanOrEqual(100)
    })

    it('should weight price at 40%', async () => {
      const quote = {
        base_price: 20000, // Excellent price
        aircraft_capacity: 8,
        aircraft_range_nm: 2100,
        operator_rating: 50, // Poor rating
        response_time_hours: 10 // Slow response
      }

      const scored = await agent.scoreQuote(quote, { passengers: 6 })

      // Price contribution should be 40 points (40% of 100 for best price)
      expect(scored.score_breakdown.price_contribution).toBeGreaterThan(30)
    })

    it('should provide detailed score breakdown', async () => {
      const quote = {
        base_price: 25000,
        aircraft_capacity: 8,
        operator_rating: 90,
        response_time_hours: 2
      }

      const scored = await agent.scoreQuote(quote, { passengers: 6 })

      expect(scored.score_breakdown).toHaveProperty('price_contribution')
      expect(scored.score_breakdown).toHaveProperty('suitability_contribution')
      expect(scored.score_breakdown).toHaveProperty('rating_contribution')
      expect(scored.score_breakdown).toHaveProperty('response_time_contribution')
    })

    it('should normalize scores across all quotes', async () => {
      const quotes = [
        { id: '1', base_price: 20000, aircraft_capacity: 8, operator_rating: 90, response_time_hours: 2 },
        { id: '2', base_price: 30000, aircraft_capacity: 8, operator_rating: 85, response_time_hours: 4 },
        { id: '3', base_price: 25000, aircraft_capacity: 8, operator_rating: 95, response_time_hours: 1 }
      ]

      const scored = await agent.scoreQuotes(quotes, { passengers: 6 })

      // Highest score should be 100 after normalization
      const maxScore = Math.max(...scored.map((s: any) => s.composite_score))
      expect(maxScore).toBeCloseTo(100, 1)
    })
  })

  describe('Top 3 Selection', () => {
    it('should select top 3 proposals by score', async () => {
      const quotes = [
        { id: '1', base_price: 25000, aircraft_capacity: 8, operator_rating: 90, response_time_hours: 2 },
        { id: '2', base_price: 30000, aircraft_capacity: 8, operator_rating: 85, response_time_hours: 4 },
        { id: '3', base_price: 20000, aircraft_capacity: 8, operator_rating: 95, response_time_hours: 1 },
        { id: '4', base_price: 35000, aircraft_capacity: 8, operator_rating: 80, response_time_hours: 6 },
        { id: '5', base_price: 22000, aircraft_capacity: 8, operator_rating: 92, response_time_hours: 3 }
      ]

      const top3 = await agent.selectTop3(quotes, { passengers: 6 })

      expect(top3).toHaveLength(3)
      expect(top3[0].composite_score).toBeGreaterThanOrEqual(top3[1].composite_score)
      expect(top3[1].composite_score).toBeGreaterThanOrEqual(top3[2].composite_score)
    })

    it('should ensure diversity in top 3', async () => {
      const quotes = [
        { id: '1', base_price: 25000, aircraft_type: 'Citation XLS', aircraft_category: 'midsize' },
        { id: '2', base_price: 26000, aircraft_type: 'Citation XLS+', aircraft_category: 'midsize' },
        { id: '3', base_price: 35000, aircraft_type: 'Gulfstream G280', aircraft_category: 'heavy' },
        { id: '4', base_price: 18000, aircraft_type: 'Phenom 300', aircraft_category: 'light' }
      ]

      const top3 = await agent.selectTop3(quotes, { passengers: 6 })

      const categories = top3.map((q: any) => q.aircraft_category)
      const uniqueCategories = new Set(categories)
      expect(uniqueCategories.size).toBeGreaterThan(1) // Diverse categories
    })

    it('should consider client preferences', async () => {
      const quotes = [
        { id: '1', base_price: 25000, aircraft_category: 'midsize' },
        { id: '2', base_price: 24000, aircraft_category: 'light' },
        { id: '3', base_price: 35000, aircraft_category: 'heavy' }
      ]

      const preferences = {
        aircraft: { category: 'midsize' }
      }

      const top3 = await agent.selectTop3(quotes, { passengers: 6 }, preferences)

      // Midsize should be ranked higher
      expect(top3[0].aircraft_category).toBe('midsize')
    })
  })

  describe('Recommendation Rationale', () => {
    it('should generate rationale for each proposal', async () => {
      const quote = {
        id: 'quote-1',
        base_price: 25000,
        aircraft_type: 'Citation XLS',
        operator_rating: 95,
        composite_score: 92
      }

      const rationale = await agent.generateRationale(quote, { passengers: 6 })

      expect(rationale).toBeDefined()
      expect(rationale.length).toBeGreaterThan(50) // Meaningful explanation
      expect(rationale).toContain('Citation XLS')
    })

    it('should highlight key benefits', async () => {
      const quote = {
        base_price: 20000, // Best price
        aircraft_type: 'Citation XLS',
        operator_rating: 95 // Excellent rating
      }

      const rationale = await agent.generateRationale(quote, { passengers: 6 })

      expect(rationale.toLowerCase()).toMatch(/price|value|competitive/)
      expect(rationale.toLowerCase()).toMatch(/safety|rating|reliable/)
    })

    it('should explain trade-offs', async () => {
      const quote = {
        base_price: 35000, // Higher price
        aircraft_type: 'Gulfstream G280', // Premium aircraft
        operator_rating: 98
      }

      const rationale = await agent.generateRationale(quote, { passengers: 6 })

      expect(rationale.toLowerCase()).toMatch(/premium|luxury|comfort/)
    })

    it('should personalize based on client history', async () => {
      const quote = {
        base_price: 25000,
        aircraft_type: 'Citation XLS'
      }

      const clientPreferences = {
        catering: { dietary_restrictions: ['kosher'] }
      }

      const rationale = await agent.generateRationale(
        quote,
        { passengers: 6 },
        clientPreferences
      )

      expect(rationale).toBeDefined()
    })
  })

  describe('Profit Margin Calculation', () => {
    it('should calculate profit with percentage markup', async () => {
      const quote = {
        base_price: 25000
      }

      const markup = { type: 'percentage', value: 15 } // 15%

      const proposal = await agent.calculateProposal(quote, markup)

      expect(proposal.total_price).toBe(28750) // 25000 * 1.15
      expect(proposal.markup_amount).toBe(3750)
      expect(proposal.profit_margin).toBeCloseTo(0.15, 2)
    })

    it('should calculate profit with fixed markup', async () => {
      const quote = {
        base_price: 25000
      }

      const markup = { type: 'fixed', value: 5000 }

      const proposal = await agent.calculateProposal(quote, markup)

      expect(proposal.total_price).toBe(30000)
      expect(proposal.markup_amount).toBe(5000)
      expect(proposal.profit_margin).toBeCloseTo(0.20, 2) // 5000/25000
    })

    it('should support custom markup per request', async () => {
      const quote = {
        base_price: 25000
      }

      const customMarkup = { type: 'percentage', value: 20 } // VIP client

      const proposal = await agent.calculateProposal(quote, customMarkup)

      expect(proposal.total_price).toBe(30000)
    })
  })

  describe('Performance', () => {
    it('should analyze 20 quotes in under 5 seconds', async () => {
      const quotes = Array.from({ length: 20 }, (_, i) => ({
        id: `quote-${i}`,
        base_price: 25000 + (i * 1000),
        aircraft_capacity: 8,
        operator_rating: 85 + i,
        response_time_hours: 2
      }))

      const start = Date.now()
      await agent.analyzeQuotes(quotes, { passengers: 6 })
      const duration = Date.now() - start

      expect(duration).toBeLessThan(5000)
    })
  })
})
```

### Step 2: Implement Minimal Code (Green Phase)

```typescript
// lib/agents/proposal-analysis-agent.ts
import OpenAI from 'openai'
import { SupabaseClient } from '@supabase/supabase-js'

interface ProposalAnalysisAgentConfig {
  openaiApiKey: string
  supabase: SupabaseClient
}

export class ProposalAnalysisAgent {
  private openai: OpenAI
  private supabase: SupabaseClient

  private readonly WEIGHTS = {
    price: 0.40,
    suitability: 0.25,
    rating: 0.20,
    response_time: 0.15
  }

  constructor(config: ProposalAnalysisAgentConfig) {
    this.openai = new OpenAI({ apiKey: config.openaiApiKey })
    this.supabase = config.supabase
  }

  /**
   * Score individual quote
   */
  async scoreQuote(quote: any, request: any): Promise<any> {
    const priceScore = this.calculatePriceScore(quote.base_price)
    const suitabilityScore = this.calculateSuitabilityScore(quote, request)
    const ratingScore = quote.operator_rating || 85
    const responseTimeScore = this.calculateResponseTimeScore(quote.response_time_hours)

    const compositeScore =
      (priceScore * this.WEIGHTS.price) +
      (suitabilityScore * this.WEIGHTS.suitability) +
      (ratingScore * this.WEIGHTS.rating) +
      (responseTimeScore * this.WEIGHTS.response_time)

    return {
      ...quote,
      composite_score: compositeScore,
      score_breakdown: {
        price_contribution: priceScore * this.WEIGHTS.price,
        suitability_contribution: suitabilityScore * this.WEIGHTS.suitability,
        rating_contribution: ratingScore * this.WEIGHTS.rating,
        response_time_contribution: responseTimeScore * this.WEIGHTS.response_time
      }
    }
  }

  /**
   * Score all quotes and normalize
   */
  async scoreQuotes(quotes: any[], request: any): Promise<any[]> {
    const scored = await Promise.all(
      quotes.map(q => this.scoreQuote(q, request))
    )

    // Normalize to 0-100 scale
    const maxScore = Math.max(...scored.map(s => s.composite_score))
    return scored.map(s => ({
      ...s,
      composite_score: (s.composite_score / maxScore) * 100
    }))
  }

  /**
   * Select top 3 proposals
   */
  async selectTop3(
    quotes: any[],
    request: any,
    clientPreferences?: any
  ): Promise<any[]> {
    const scored = await this.scoreQuotes(quotes, request)

    // Apply client preference boost
    if (clientPreferences?.aircraft?.category) {
      scored.forEach(q => {
        if (q.aircraft_category === clientPreferences.aircraft.category) {
          q.composite_score *= 1.1 // 10% boost
        }
      })
    }

    // Sort by score
    scored.sort((a, b) => b.composite_score - a.composite_score)

    // Apply diversity rules
    const diverse = this.applyDiversityRules(scored)

    return diverse.slice(0, 3)
  }

  /**
   * Generate recommendation rationale
   */
  async generateRationale(
    quote: any,
    request: any,
    clientPreferences?: any
  ): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an expert flight proposal analyst. Generate a compelling,
          concise rationale (2-3 sentences) explaining why this quote is recommended.
          Highlight key benefits and value proposition.`
        },
        {
          role: 'user',
          content: JSON.stringify({
            quote,
            request,
            clientPreferences
          })
        }
      ]
    })

    return completion.choices[0].message.content!
  }

  /**
   * Calculate proposal with markup
   */
  async calculateProposal(quote: any, markup: any): Promise<any> {
    let markupAmount = 0
    let totalPrice = quote.base_price

    if (markup.type === 'percentage') {
      markupAmount = quote.base_price * (markup.value / 100)
      totalPrice = quote.base_price + markupAmount
    } else if (markup.type === 'fixed') {
      markupAmount = markup.value
      totalPrice = quote.base_price + markup.value
    }

    return {
      quote_id: quote.id,
      base_price: quote.base_price,
      markup_type: markup.type,
      markup_value: markup.value,
      markup_amount: markupAmount,
      total_price: totalPrice,
      profit_margin: markupAmount / quote.base_price
    }
  }

  /**
   * Analyze all quotes and generate proposals
   */
  async analyzeQuotes(
    quotes: any[],
    request: any,
    clientPreferences?: any,
    markup?: any
  ): Promise<any> {
    const top3 = await this.selectTop3(quotes, request, clientPreferences)

    const proposals = await Promise.all(
      top3.map(async (quote) => {
        const rationale = await this.generateRationale(quote, request, clientPreferences)
        const proposal = await this.calculateProposal(quote, markup || { type: 'percentage', value: 15 })

        return {
          ...proposal,
          quote,
          rationale,
          rank: top3.indexOf(quote) + 1
        }
      })
    )

    return proposals
  }

  // Helper methods
  private calculatePriceScore(price: number): number {
    // Lower price = higher score (inverse relationship)
    const maxPrice = 50000
    return Math.max(0, 100 - ((price / maxPrice) * 100))
  }

  private calculateSuitabilityScore(quote: any, request: any): number {
    let score = 100

    // Capacity check
    if (quote.aircraft_capacity < request.passengers * 1.2) {
      score -= 20
    }

    // Range check
    if (quote.aircraft_range_nm && request.route_distance_nm) {
      if (quote.aircraft_range_nm < request.route_distance_nm) {
        score -= 50
      }
    }

    return Math.max(0, score)
  }

  private calculateResponseTimeScore(hours: number): number {
    return Math.max(0, 100 - (hours * 10))
  }

  private applyDiversityRules(quotes: any[]): any[] {
    const categories = new Set()
    const diverse: any[] = []

    for (const quote of quotes) {
      if (!categories.has(quote.aircraft_category) || diverse.length < 3) {
        diverse.push(quote)
        categories.add(quote.aircraft_category)
      }

      if (diverse.length >= 5) break
    }

    return diverse
  }
}
```

---

## 4. IMPLEMENTATION STEPS

### Pre-Implementation Checklist

- [ ] Review PRD.md section on Quote Analysis (FR-6)
- [ ] TASK-012 (Agent Tools) completed
- [ ] TASK-002 (Database) has `quotes` and `proposals` tables
- [ ] OpenAI API key configured

### Step-by-Step Implementation

**Step 1**: Create Agent Core
- Implement ProposalAnalysisAgent class
- Add scoring algorithm
- Implement selection logic

**Step 2**: Add Rationale Generation
- Integrate OpenAI for explanations
- Personalize based on client data
- Format for readability

**Step 3**: Implement Profit Calculations
- Support percentage markup
- Support fixed markup
- Calculate margins

**Step 4**: Write Tests
- Unit tests for scoring
- Integration tests for full analysis

**Step 5**: Create API Endpoint
File: `app/api/agents/proposal-analysis/route.ts`

---

## 5-11. STANDARD SECTIONS

(Following same structure as previous tasks)

**Dependencies**:
- TASK-012: Agent Tools & Helper Functions

**Task Status**: ⏳ PENDING

**Completed By**: -
**Completed Date**: -
