# Flight Search Agent Implementation

**Task ID**: TASK-014
**Created**: 2025-10-20
**Assigned To**: AI/ML Engineer / Backend Developer
**Status**: `pending`
**Priority**: `critical`
**Estimated Time**: 8 hours
**Actual Time**: - (update when complete)

---

## 1. TASK OVERVIEW

### Objective
Implement the Flight Search Agent using OpenAI GPT-4/5 to search for available aircraft, integrate with Avinode MCP for flight searches and RFP creation, implement intelligent aircraft selection algorithms, and develop an operator ranking system for optimal proposal generation.

### User Story
**As an** ISO agent
**I want** the system to automatically search for qualified aircraft and operators
**So that** I can send RFPs to the best-matched operators without manual research

### Business Value
The Flight Search Agent is critical to the Jetvision workflow as it connects client requirements to available aircraft inventory. It searches across multiple operators via Avinode, applies intelligent filtering based on route, passenger count, and client preferences, and selects the most suitable operators for RFP distribution. This agent directly impacts proposal quality and quote conversion rates.

---

## 2. REQUIREMENTS & ACCEPTANCE CRITERIA

### Functional Requirements

**FR-1**: System SHALL implement Flight Search Agent as OpenAI Assistant
- Use OpenAI GPT-4 or GPT-5 with function calling
- Configure system prompt for aircraft selection logic
- Enable tool use for Avinode MCP integration
- Implement intelligent decision-making for operator selection

**FR-2**: System SHALL integrate with Avinode MCP
- Search flights by route, passengers, date
- Filter by aircraft category (light, midsize, heavy, ultra-long-range)
- Query operator availability and ratings
- Create RFPs and distribute to selected operators
- Track RFP status and quote responses

**FR-3**: System SHALL implement search algorithm logic
- Match aircraft capacity to passenger count (with 20% buffer)
- Verify aircraft range covers route distance
- Filter by aircraft category preferences
- Apply speed and comfort requirements
- Consider operator location and positioning costs

**FR-4**: System SHALL implement operator ranking system
- **Safety Rating** (40% weight): FAA/EASA ratings, safety record
- **Reliability Score** (25% weight): On-time performance, cancellation rate
- **Response Time** (20% weight): Historical quote response speed
- **Pricing Competitiveness** (15% weight): Average quote vs market
- Composite score calculation (0-100 scale)

**FR-5**: System SHALL select optimal operators for RFP
- Rank all qualified operators by composite score
- Select top 5-10 operators for RFP distribution
- Apply diversity rules (different aircraft types, price ranges)
- Consider client preferences in selection
- Avoid over-soliciting same operators

**FR-6**: System SHALL create and distribute RFPs
- Generate RFP document with flight details
- Include passenger count, route, date, special requirements
- Set response deadline (24-48 hours based on urgency)
- Distribute via Avinode API
- Store RFP ID for tracking

**FR-7**: System SHALL track RFP and quote status
- Monitor RFP delivery status
- Track operator responses in real-time
- Update request status as quotes arrive
- Handle partial quote scenarios (3/5 responded)
- Implement timeout logic for slow responses

### Acceptance Criteria

- [ ] **AC-1**: Flight Search Agent implemented as OpenAI Assistant
- [ ] **AC-2**: Avinode MCP integration searches flights successfully
- [ ] **AC-3**: Search algorithm matches aircraft to requirements with 95%+ accuracy
- [ ] **AC-4**: Operator ranking system produces consistent scores
- [ ] **AC-5**: Selects optimal 5-10 operators for each request
- [ ] **AC-6**: Creates and distributes RFPs via Avinode
- [ ] **AC-7**: Tracks RFP status and quote arrivals
- [ ] **AC-8**: Handles timeout and partial quote scenarios
- [ ] **AC-9**: Unit tests achieve >75% coverage
- [ ] **AC-10**: Integration tests verify Avinode connectivity
- [ ] **AC-11**: Search completes in <30 seconds
- [ ] **AC-12**: Code review approved

### Non-Functional Requirements

- **Performance**: Flight search <30s, RFP creation <10s
- **Reliability**: 99% successful searches and RFP distribution
- **Accuracy**: 95%+ aircraft matching accuracy
- **Scalability**: Handle 100+ concurrent searches
- **Cost Efficiency**: Minimize Avinode API calls

---

## 3. TEST-DRIVEN DEVELOPMENT (TDD) APPROACH

### Step 1: Write Tests FIRST (Red Phase)

**Test Files to Create**:
```
__tests__/unit/agents/flight-search-agent.test.ts
__tests__/unit/agents/operator-ranking.test.ts
__tests__/integration/agents/avinode-search.test.ts
```

**Example Test (Write This First)**:
```typescript
// __tests__/unit/agents/flight-search-agent.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { FlightSearchAgent } from '@/lib/agents/flight-search-agent'
import { createClient } from '@supabase/supabase-js'

describe('FlightSearchAgent', () => {
  let agent: FlightSearchAgent
  let supabase: any

  beforeEach(() => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    agent = new FlightSearchAgent({
      openaiApiKey: process.env.OPENAI_API_KEY!,
      supabase,
      mcpServerPath: './mcp-servers/avinode'
    })
  })

  afterEach(async () => {
    await agent.shutdown()
  })

  describe('Aircraft Search', () => {
    it('should search flights by route and date', async () => {
      const result = await agent.searchFlights({
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15'
      })

      expect(result).toHaveProperty('aircraft')
      expect(Array.isArray(result.aircraft)).toBe(true)
      expect(result.aircraft.length).toBeGreaterThan(0)
    })

    it('should filter aircraft by capacity', async () => {
      const result = await agent.searchFlights({
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15'
      })

      // All aircraft should have capacity >= 6 (with 20% buffer = 7.2, so >= 8)
      result.aircraft.forEach((aircraft: any) => {
        expect(aircraft.capacity).toBeGreaterThanOrEqual(8)
      })
    })

    it('should filter aircraft by category', async () => {
      const result = await agent.searchFlights({
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15',
        aircraft_category: 'midsize'
      })

      result.aircraft.forEach((aircraft: any) => {
        expect(aircraft.category).toBe('midsize')
      })
    })

    it('should verify aircraft range covers route', async () => {
      const result = await agent.searchFlights({
        departure_airport: 'KTEB',
        arrival_airport: 'LFPB', // Paris (long distance)
        passengers: 8,
        departure_date: '2025-11-15'
      })

      // All aircraft should have sufficient range
      result.aircraft.forEach((aircraft: any) => {
        expect(aircraft.range_nm).toBeGreaterThanOrEqual(3500) // TEB-LFPB ~3100nm
      })
    })

    it('should return aircraft specifications', async () => {
      const result = await agent.searchFlights({
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15'
      })

      const aircraft = result.aircraft[0]
      expect(aircraft).toHaveProperty('type')
      expect(aircraft).toHaveProperty('capacity')
      expect(aircraft).toHaveProperty('range_nm')
      expect(aircraft).toHaveProperty('speed_kts')
      expect(aircraft).toHaveProperty('category')
    })

    it('should include operator information', async () => {
      const result = await agent.searchFlights({
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15'
      })

      const aircraft = result.aircraft[0]
      expect(aircraft).toHaveProperty('operator_name')
      expect(aircraft).toHaveProperty('operator_id')
      expect(aircraft).toHaveProperty('base_location')
    })

    it('should handle no results gracefully', async () => {
      const result = await agent.searchFlights({
        departure_airport: 'KTEB',
        arrival_airport: 'ZZZZ', // Invalid airport
        passengers: 6,
        departure_date: '2025-11-15'
      })

      expect(result.aircraft).toEqual([])
    })
  })

  describe('Operator Ranking', () => {
    it('should calculate composite operator scores', async () => {
      const operators = [
        {
          id: 'op-1',
          safety_rating: 95,
          reliability_score: 88,
          avg_response_time_hours: 2,
          pricing_competitiveness: 90
        },
        {
          id: 'op-2',
          safety_rating: 85,
          reliability_score: 92,
          avg_response_time_hours: 4,
          pricing_competitiveness: 85
        }
      ]

      const ranked = await agent.rankOperators(operators)

      expect(ranked[0]).toHaveProperty('composite_score')
      expect(ranked[0].composite_score).toBeGreaterThanOrEqual(0)
      expect(ranked[0].composite_score).toBeLessThanOrEqual(100)
    })

    it('should weight safety rating at 40%', async () => {
      const highSafety = {
        id: 'op-1',
        safety_rating: 100,
        reliability_score: 50,
        avg_response_time_hours: 10,
        pricing_competitiveness: 50
      }

      const scored = await agent.calculateOperatorScore(highSafety)

      // 40% of 100 = 40, plus other weights
      expect(scored.score_breakdown.safety_contribution).toBe(40)
    })

    it('should rank operators by composite score', async () => {
      const operators = [
        { id: 'op-1', safety_rating: 70, reliability_score: 70, avg_response_time_hours: 5, pricing_competitiveness: 70 },
        { id: 'op-2', safety_rating: 90, reliability_score: 90, avg_response_time_hours: 2, pricing_competitiveness: 90 },
        { id: 'op-3', safety_rating: 80, reliability_score: 80, avg_response_time_hours: 3, pricing_competitiveness: 80 }
      ]

      const ranked = await agent.rankOperators(operators)

      expect(ranked[0].id).toBe('op-2') // Highest scores
      expect(ranked[1].id).toBe('op-3')
      expect(ranked[2].id).toBe('op-1')
    })

    it('should provide score breakdown', async () => {
      const operator = {
        id: 'op-1',
        safety_rating: 95,
        reliability_score: 88,
        avg_response_time_hours: 2,
        pricing_competitiveness: 90
      }

      const scored = await agent.calculateOperatorScore(operator)

      expect(scored.score_breakdown).toHaveProperty('safety_contribution')
      expect(scored.score_breakdown).toHaveProperty('reliability_contribution')
      expect(scored.score_breakdown).toHaveProperty('response_time_contribution')
      expect(scored.score_breakdown).toHaveProperty('pricing_contribution')
    })
  })

  describe('Operator Selection', () => {
    it('should select top 5-10 operators', async () => {
      const searchResult = await agent.searchFlights({
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15'
      })

      const selected = await agent.selectOperatorsForRFP(searchResult)

      expect(selected.length).toBeGreaterThanOrEqual(5)
      expect(selected.length).toBeLessThanOrEqual(10)
    })

    it('should apply diversity rules', async () => {
      const searchResult = await agent.searchFlights({
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15'
      })

      const selected = await agent.selectOperatorsForRFP(searchResult)

      // Should have mix of aircraft categories
      const categories = selected.map((s: any) => s.aircraft_category)
      const uniqueCategories = new Set(categories)
      expect(uniqueCategories.size).toBeGreaterThan(1)
    })

    it('should consider client preferences', async () => {
      const searchResult = await agent.searchFlights({
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15',
        aircraft_category: 'midsize'
      })

      const clientPreferences = {
        aircraft: { category: 'midsize' }
      }

      const selected = await agent.selectOperatorsForRFP(searchResult, clientPreferences)

      // Prefer midsize jets
      const midsizeCount = selected.filter((s: any) => s.aircraft_category === 'midsize').length
      expect(midsizeCount).toBeGreaterThan(selected.length / 2)
    })

    it('should avoid over-soliciting same operators', async () => {
      // Track recent RFPs to operator
      await agent.recordRFPSent('op-1')
      await agent.recordRFPSent('op-1')
      await agent.recordRFPSent('op-1')

      const searchResult = await agent.searchFlights({
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15'
      })

      const selected = await agent.selectOperatorsForRFP(searchResult)

      // op-1 should be deprioritized (3 recent RFPs)
      const op1Index = selected.findIndex((s: any) => s.operator_id === 'op-1')
      expect(op1Index).toBeGreaterThan(2) // Not in top 3
    })
  })

  describe('RFP Creation and Distribution', () => {
    it('should create RFP with flight details', async () => {
      const rfp = await agent.createRFP({
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15',
        special_requirements: ['catering', 'ground transport']
      }, [{ operator_id: 'op-1', aircraft_type: 'Citation XLS' }])

      expect(rfp).toHaveProperty('rfp_id')
      expect(rfp).toHaveProperty('operators')
      expect(rfp.operators).toHaveLength(1)
    })

    it('should set response deadline based on urgency', async () => {
      const urgentRFP = await agent.createRFP({
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15',
        urgency: 'urgent'
      }, [{ operator_id: 'op-1', aircraft_type: 'Citation XLS' }])

      expect(urgentRFP.response_deadline_hours).toBe(24)

      const normalRFP = await agent.createRFP({
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15',
        urgency: 'normal'
      }, [{ operator_id: 'op-1', aircraft_type: 'Citation XLS' }])

      expect(normalRFP.response_deadline_hours).toBe(48)
    })

    it('should distribute RFP via Avinode MCP', async () => {
      const mcpSpy = vi.spyOn(agent, 'executeMCPTool')

      await agent.createRFP({
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15'
      }, [{ operator_id: 'op-1', aircraft_type: 'Citation XLS' }])

      expect(mcpSpy).toHaveBeenCalledWith('create_rfp', expect.any(Object))
    })

    it('should store RFP ID in database', async () => {
      const rfp = await agent.createRFP({
        request_id: 'req-123',
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15'
      }, [{ operator_id: 'op-1', aircraft_type: 'Citation XLS' }])

      const { data } = await supabase
        .from('flight_requests')
        .select('rfp_id')
        .eq('id', 'req-123')
        .single()

      expect(data.rfp_id).toBe(rfp.rfp_id)
    })
  })

  describe('RFP Tracking', () => {
    it('should track RFP status', async () => {
      const status = await agent.getRFPStatus('rfp-123')

      expect(status).toHaveProperty('rfp_id', 'rfp-123')
      expect(status).toHaveProperty('status')
      expect(status).toHaveProperty('quotes_received')
      expect(status).toHaveProperty('quotes_pending')
    })

    it('should monitor quote arrivals', async () => {
      const quotes = await agent.getQuotesForRFP('rfp-123')

      expect(Array.isArray(quotes)).toBe(true)
      expect(quotes[0]).toHaveProperty('operator_id')
      expect(quotes[0]).toHaveProperty('base_price')
      expect(quotes[0]).toHaveProperty('aircraft_type')
    })

    it('should handle partial quote scenarios', async () => {
      const status = await agent.getRFPStatus('rfp-123')

      if (status.quotes_received < status.operators_contacted) {
        expect(status.status).toBe('partial')
        expect(status.quotes_pending).toBeGreaterThan(0)
      }
    })

    it('should implement timeout logic', async () => {
      const timeout = 30 * 60 * 1000 // 30 minutes

      const result = await agent.waitForQuotes('rfp-123', timeout)

      expect(result).toHaveProperty('quotes')
      expect(result).toHaveProperty('timeout_occurred')
    })
  })

  describe('Error Handling', () => {
    it('should handle Avinode API errors', async () => {
      vi.spyOn(agent, 'executeMCPTool').mockRejectedValue(
        new Error('Avinode API error')
      )

      await expect(
        agent.searchFlights({
          departure_airport: 'KTEB',
          arrival_airport: 'KVNY',
          passengers: 6,
          departure_date: '2025-11-15'
        })
      ).rejects.toThrow('Avinode API error')
    })

    it('should retry on transient failures', async () => {
      let attempts = 0
      vi.spyOn(agent, 'executeMCPTool').mockImplementation(async () => {
        attempts++
        if (attempts < 3) {
          throw new Error('Transient error')
        }
        return { aircraft: [] }
      })

      await agent.searchFlights({
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15'
      })

      expect(attempts).toBe(3)
    })

    it('should log errors to Sentry', async () => {
      const sentrySpy = vi.spyOn(console, 'error')

      vi.spyOn(agent, 'executeMCPTool').mockRejectedValue(
        new Error('Critical error')
      )

      await expect(
        agent.searchFlights({
          departure_airport: 'KTEB',
          arrival_airport: 'KVNY',
          passengers: 6,
          departure_date: '2025-11-15'
        })
      ).rejects.toThrow()

      expect(sentrySpy).toHaveBeenCalled()
    })
  })

  describe('Performance', () => {
    it('should complete search in under 30 seconds', async () => {
      const start = Date.now()

      await agent.searchFlights({
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15'
      })

      const duration = Date.now() - start
      expect(duration).toBeLessThan(30000)
    })

    it('should create RFP in under 10 seconds', async () => {
      const start = Date.now()

      await agent.createRFP({
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15'
      }, [{ operator_id: 'op-1', aircraft_type: 'Citation XLS' }])

      const duration = Date.now() - start
      expect(duration).toBeLessThan(10000)
    })
  })
})
```

**Run Tests** (should FAIL initially):
```bash
npm test -- flight-search-agent
# Expected: Tests fail because implementation doesn't exist
```

### Step 2: Implement Minimal Code (Green Phase)

```typescript
// lib/agents/flight-search-agent.ts
import OpenAI from 'openai'
import { SupabaseClient } from '@supabase/supabase-js'
import { MCPClient } from '@/lib/mcp/client'

interface FlightSearchAgentConfig {
  openaiApiKey: string
  supabase: SupabaseClient
  mcpServerPath: string
}

interface SearchParams {
  departure_airport: string
  arrival_airport: string
  passengers: number
  departure_date: string
  aircraft_category?: string
  urgency?: 'urgent' | 'high' | 'normal' | 'low'
  special_requirements?: string[]
  request_id?: string
}

interface OperatorScore {
  id: string
  safety_rating: number
  reliability_score: number
  avg_response_time_hours: number
  pricing_competitiveness: number
  composite_score?: number
  score_breakdown?: {
    safety_contribution: number
    reliability_contribution: number
    response_time_contribution: number
    pricing_contribution: number
  }
}

export class FlightSearchAgent {
  private openai: OpenAI
  private supabase: SupabaseClient
  private mcpClient: MCPClient

  // Operator ranking weights
  private readonly WEIGHTS = {
    safety: 0.40,
    reliability: 0.25,
    response_time: 0.20,
    pricing: 0.15
  }

  constructor(config: FlightSearchAgentConfig) {
    this.openai = new OpenAI({ apiKey: config.openaiApiKey })
    this.supabase = config.supabase
    this.mcpClient = new MCPClient({
      serverPath: config.mcpServerPath,
      serverName: 'avinode'
    })
  }

  /**
   * Search for available flights via Avinode MCP
   */
  async searchFlights(params: SearchParams): Promise<any> {
    try {
      const result = await this.executeMCPTool('search_flights', {
        departure_airport: params.departure_airport,
        arrival_airport: params.arrival_airport,
        passengers: params.passengers,
        departure_date: params.departure_date,
        aircraft_category: params.aircraft_category
      })

      // Apply intelligent filtering
      const filtered = await this.filterAircraft(result.aircraft, params)

      return {
        ...result,
        aircraft: filtered
      }
    } catch (error: any) {
      console.error('Flight search error:', error)
      throw error
    }
  }

  /**
   * Filter aircraft by capacity, range, and preferences
   */
  private async filterAircraft(aircraft: any[], params: SearchParams): Promise<any[]> {
    const capacityBuffer = 1.2 // 20% buffer
    const minCapacity = Math.ceil(params.passengers * capacityBuffer)

    return aircraft.filter((ac: any) => {
      // Capacity check
      if (ac.capacity < minCapacity) return false

      // Category filter (if specified)
      if (params.aircraft_category && ac.category !== params.aircraft_category) {
        return false
      }

      // Range check (calculate route distance)
      const routeDistance = this.calculateRouteDistance(
        params.departure_airport,
        params.arrival_airport
      )
      if (ac.range_nm < routeDistance * 1.1) return false // 10% safety margin

      return true
    })
  }

  /**
   * Calculate route distance (simplified - would use real API in production)
   */
  private calculateRouteDistance(departure: string, arrival: string): number {
    // This would call a route calculation API
    // Simplified for now
    return 2400 // Example: TEB-VNY distance
  }

  /**
   * Rank operators by composite score
   */
  async rankOperators(operators: OperatorScore[]): Promise<OperatorScore[]> {
    const scored = operators.map(op => this.calculateOperatorScore(op))

    return scored.sort((a, b) => b.composite_score! - a.composite_score!)
  }

  /**
   * Calculate composite operator score
   */
  calculateOperatorScore(operator: OperatorScore): OperatorScore {
    const safetyContribution = operator.safety_rating * this.WEIGHTS.safety
    const reliabilityContribution = operator.reliability_score * this.WEIGHTS.reliability

    // Response time: convert hours to score (faster = higher)
    const responseTimeScore = Math.max(0, 100 - (operator.avg_response_time_hours * 10))
    const responseTimeContribution = responseTimeScore * this.WEIGHTS.response_time

    const pricingContribution = operator.pricing_competitiveness * this.WEIGHTS.pricing

    const compositeScore = safetyContribution + reliabilityContribution +
                          responseTimeContribution + pricingContribution

    return {
      ...operator,
      composite_score: compositeScore,
      score_breakdown: {
        safety_contribution: safetyContribution,
        reliability_contribution: reliabilityContribution,
        response_time_contribution: responseTimeContribution,
        pricing_contribution: pricingContribution
      }
    }
  }

  /**
   * Select top operators for RFP distribution
   */
  async selectOperatorsForRFP(
    searchResult: any,
    clientPreferences?: any
  ): Promise<any[]> {
    // Extract unique operators
    const operatorMap = new Map()
    searchResult.aircraft.forEach((ac: any) => {
      if (!operatorMap.has(ac.operator_id)) {
        operatorMap.set(ac.operator_id, {
          operator_id: ac.operator_id,
          operator_name: ac.operator_name,
          aircraft_type: ac.type,
          aircraft_category: ac.category,
          safety_rating: ac.operator_safety_rating || 85,
          reliability_score: ac.operator_reliability || 85,
          avg_response_time_hours: ac.operator_avg_response_time || 3,
          pricing_competitiveness: ac.operator_pricing_score || 85
        })
      }
    })

    const operators = Array.from(operatorMap.values())

    // Rank operators
    const ranked = await this.rankOperators(operators)

    // Apply diversity rules
    const diverse = this.applyDiversityRules(ranked)

    // Select top 5-10
    return diverse.slice(0, 10)
  }

  /**
   * Apply diversity rules (mix of categories and price ranges)
   */
  private applyDiversityRules(operators: any[]): any[] {
    // Simple diversity: ensure mix of categories
    const categories = new Set()
    const diverse: any[] = []

    for (const op of operators) {
      if (!categories.has(op.aircraft_category) || diverse.length < 5) {
        diverse.push(op)
        categories.add(op.aircraft_category)
      }

      if (diverse.length >= 10) break
    }

    return diverse
  }

  /**
   * Create and distribute RFP
   */
  async createRFP(params: SearchParams, operators: any[]): Promise<any> {
    const responseDeadlineHours = params.urgency === 'urgent' ? 24 : 48

    const rfp = await this.executeMCPTool('create_rfp', {
      departure_airport: params.departure_airport,
      arrival_airport: params.arrival_airport,
      passengers: params.passengers,
      departure_date: params.departure_date,
      special_requirements: params.special_requirements || [],
      operators: operators.map(op => ({
        operator_id: op.operator_id,
        aircraft_type: op.aircraft_type
      })),
      response_deadline_hours: responseDeadlineHours
    })

    // Store RFP ID if request_id provided
    if (params.request_id) {
      await this.supabase
        .from('flight_requests')
        .update({ rfp_id: rfp.rfp_id })
        .eq('id', params.request_id)
    }

    return {
      ...rfp,
      operators,
      response_deadline_hours: responseDeadlineHours
    }
  }

  /**
   * Get RFP status
   */
  async getRFPStatus(rfpId: string): Promise<any> {
    return await this.executeMCPTool('get_rfp_status', { rfp_id: rfpId })
  }

  /**
   * Get quotes for RFP
   */
  async getQuotesForRFP(rfpId: string): Promise<any[]> {
    const result = await this.executeMCPTool('get_quotes', { rfp_id: rfpId })
    return result.quotes || []
  }

  /**
   * Wait for quotes with timeout
   */
  async waitForQuotes(rfpId: string, timeoutMs: number): Promise<any> {
    const startTime = Date.now()
    let quotes: any[] = []
    let timeoutOccurred = false

    while (Date.now() - startTime < timeoutMs) {
      const status = await this.getRFPStatus(rfpId)

      if (status.status === 'completed') {
        quotes = await this.getQuotesForRFP(rfpId)
        break
      }

      // Wait 30 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 30000))
    }

    if (quotes.length === 0) {
      timeoutOccurred = true
      quotes = await this.getQuotesForRFP(rfpId) // Get partial results
    }

    return {
      quotes,
      timeout_occurred: timeoutOccurred
    }
  }

  /**
   * Record RFP sent to operator (for over-solicitation prevention)
   */
  async recordRFPSent(operatorId: string): Promise<void> {
    await this.supabase
      .from('rfp_tracking')
      .insert({
        operator_id: operatorId,
        sent_at: new Date().toISOString()
      })
  }

  /**
   * Execute MCP tool
   */
  async executeMCPTool(toolName: string, params: any): Promise<any> {
    return await this.mcpClient.executeTool(toolName, params)
  }

  /**
   * Shutdown agent
   */
  async shutdown(): Promise<void> {
    await this.mcpClient.close()
  }
}
```

**Run Tests Again**:
```bash
npm test -- flight-search-agent
# Expected: Tests now pass ✓
```

### Step 3: Refactor (Blue Phase)

**Refactoring Checklist**:
- [ ] Extract operator ranking to separate class
- [ ] Improve route distance calculation with real API
- [ ] Add comprehensive error messages
- [ ] Optimize operator selection algorithm
- [ ] Add JSDoc comments

---

## 4. IMPLEMENTATION STEPS

### Pre-Implementation Checklist

- [ ] Review PRD.md section on Flight Search (FR-5)
- [ ] TASK-008 (Avinode MCP) completed
- [ ] TASK-012 (Agent Tools) completed
- [ ] TASK-002 (Database) has required tables
- [ ] Avinode API credentials configured

### Step-by-Step Implementation

**Step 1**: Install Dependencies
```bash
npm install openai @supabase/supabase-js
```

**Step 2**: Create Agent Structure
File: `lib/agents/flight-search-agent.ts`
- Implement FlightSearchAgent class
- Add search algorithm logic
- Implement operator ranking system

**Step 3**: Integrate Avinode MCP
- Initialize MCP client connection
- Implement search_flights tool
- Implement create_rfp tool
- Add RFP tracking methods

**Step 4**: Implement Operator Ranking
File: `lib/agents/operator-ranking.ts`
- Create scoring algorithm
- Apply weights (safety 40%, reliability 25%, response 20%, pricing 15%)
- Add diversity rules

**Step 5**: Add RFP Management
- Create RFP generation logic
- Implement distribution via Avinode
- Add status tracking
- Implement timeout logic

**Step 6**: Write Tests
- Unit tests for all methods
- Integration tests for Avinode
- Performance tests

**Step 7**: Create API Endpoint
File: `app/api/agents/flight-search/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { FlightSearchAgent } from '@/lib/agents/flight-search-agent'

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const params = await request.json()

  const supabase = createClient()
  const agent = new FlightSearchAgent({
    openaiApiKey: process.env.OPENAI_API_KEY!,
    supabase,
    mcpServerPath: './mcp-servers/avinode'
  })

  try {
    const searchResult = await agent.searchFlights(params)
    const selectedOperators = await agent.selectOperatorsForRFP(searchResult)
    const rfp = await agent.createRFP(params, selectedOperators)

    return NextResponse.json({
      search_result: searchResult,
      selected_operators: selectedOperators,
      rfp
    })
  } catch (error: any) {
    console.error('Flight search error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    await agent.shutdown()
  }
}
```

---

## 5-11. STANDARD SECTIONS

(Following same structure as TASK-013)

- Git Workflow
- Code Review Checklist
- Testing Requirements (>75% coverage)
- Definition of Done
- Resources & References
- Notes & Questions
- Completion Summary

---

**Dependencies**:
- TASK-008: Avinode MCP Server Implementation
- TASK-012: Agent Tools & Helper Functions

**Task Status**: ⏳ PENDING

**Completed By**: -
**Completed Date**: -
**Reviewed By**: -
**Review Date**: -
