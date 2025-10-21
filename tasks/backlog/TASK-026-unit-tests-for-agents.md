# Unit Tests for Agents (Target: 85% Coverage)

**Task ID**: TASK-026
**Created**: 2025-10-20
**Assigned To**: QA Engineer / Senior Developer
**Status**: `pending`
**Priority**: `high`
**Estimated Time**: 16 hours
**Actual Time**: - (update when complete)

---

## 1. TASK OVERVIEW

### Objective
Implement comprehensive unit tests for all 6 AI agents (RFP Orchestrator, Client Data Manager, Flight Search, Proposal Analysis, Communication Manager, Error Monitor) targeting 85% code coverage with mocked OpenAI API responses and MCP server tools.

### User Story
**As a** developer
**I want** comprehensive unit tests for all AI agents
**So that** I can ensure agent reliability, catch regressions early, and maintain code quality as the system evolves

### Business Value
Unit testing is critical for the JetVision system's reliability and maintainability. With 85% coverage of all agents, we ensure that the core automation logic is thoroughly tested, reducing production bugs by 70%+, enabling confident refactoring, and providing documentation through test cases. This directly supports the 99.9% uptime goal and reduces customer-facing errors.

---

## 2. REQUIREMENTS & ACCEPTANCE CRITERIA

### Functional Requirements

**FR-1**: System SHALL implement unit tests for RFP Orchestrator Agent
- Test request analysis and data extraction
- Test agent coordination and delegation
- Test workflow state machine integration
- Test database operations (CRUD)
- Test BullMQ job queueing
- Test error handling and recovery
- Mock all external dependencies (OpenAI, MCP, Supabase)

**FR-2**: System SHALL implement unit tests for Client Data Manager Agent
- Test client profile retrieval from Google Sheets
- Test returning client identification
- Test preference extraction and caching
- Test client data synchronization
- Mock Google Sheets MCP responses

**FR-3**: System SHALL implement unit tests for Flight Search Agent
- Test aircraft search via Avinode
- Test RFP creation and distribution
- Test operator selection logic
- Test quote status tracking
- Mock Avinode MCP responses

**FR-4**: System SHALL implement unit tests for Proposal Analysis Agent
- Test multi-factor scoring algorithm
- Test quote ranking and selection
- Test comparison table generation
- Test profit margin calculations
- Mock quote data from database

**FR-5**: System SHALL implement unit tests for Communication Manager Agent
- Test email composition with personalization
- Test PDF proposal generation
- Test Gmail sending via MCP
- Test delivery tracking
- Mock Gmail MCP responses

**FR-6**: System SHALL implement unit tests for Error Monitor Agent
- Test error detection and classification
- Test automatic recovery strategies
- Test retry logic with exponential backoff
- Test Sentry integration
- Mock Sentry API

**FR-7**: System SHALL achieve 85%+ test coverage
- Statement coverage >85%
- Branch coverage >80%
- Function coverage >90%
- Line coverage >85%

**FR-8**: System SHALL use Vitest framework
- Fast test execution (<2 min for all agent tests)
- Watch mode for development
- Coverage reporting with HTML output
- Snapshot testing for complex objects

### Acceptance Criteria

- [ ] **AC-1**: RFP Orchestrator Agent has >85% coverage (30+ tests)
- [ ] **AC-2**: Client Data Manager Agent has >85% coverage (20+ tests)
- [ ] **AC-3**: Flight Search Agent has >85% coverage (25+ tests)
- [ ] **AC-4**: Proposal Analysis Agent has >85% coverage (20+ tests)
- [ ] **AC-5**: Communication Manager Agent has >85% coverage (20+ tests)
- [ ] **AC-6**: Error Monitor Agent has >85% coverage (15+ tests)
- [ ] **AC-7**: All OpenAI API calls are mocked
- [ ] **AC-8**: All MCP tool calls are mocked
- [ ] **AC-9**: All database calls are mocked or use test database
- [ ] **AC-10**: Tests run in <2 minutes total
- [ ] **AC-11**: Coverage report generated with HTML output
- [ ] **AC-12**: All tests pass in CI/CD pipeline
- [ ] **AC-13**: Test isolation - no shared state between tests
- [ ] **AC-14**: Code review approved

### Non-Functional Requirements

- **Performance**: Test suite completes in <2 minutes
- **Reliability**: Tests are deterministic (no flaky tests)
- **Maintainability**: Tests are readable and well-documented
- **Coverage**: 85%+ across all metrics
- **Isolation**: Each test can run independently

---

## 3. TEST-DRIVEN DEVELOPMENT (TDD) APPROACH

### Step 1: Write Tests FIRST (Red Phase)

**Test Files to Create**:
```
__tests__/unit/agents/rfp-orchestrator.test.ts
__tests__/unit/agents/client-data-manager.test.ts
__tests__/unit/agents/flight-search.test.ts
__tests__/unit/agents/proposal-analysis.test.ts
__tests__/unit/agents/communication-manager.test.ts
__tests__/unit/agents/error-monitor.test.ts
__tests__/unit/agents/workflow-state-machine.test.ts
__tests__/helpers/mock-openai.ts
__tests__/helpers/mock-mcp.ts
__tests__/helpers/test-data.ts
```

**Example Test - RFP Orchestrator Agent**:
```typescript
// __tests__/unit/agents/rfp-orchestrator.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { RFPOrchestratorAgent } from '@/lib/agents/rfp-orchestrator'
import { mockOpenAI } from '../helpers/mock-openai'
import { mockMCPClient } from '../helpers/mock-mcp'
import { testFlightRequest } from '../helpers/test-data'

describe('RFPOrchestratorAgent', () => {
  let agent: RFPOrchestratorAgent
  let mockSupabase: any
  let mockQueue: any

  beforeEach(() => {
    // Mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null })
    }

    // Mock BullMQ
    mockQueue = {
      add: vi.fn().mockResolvedValue({ id: 'job-1', name: 'test-job' }),
      close: vi.fn()
    }

    agent = new RFPOrchestratorAgent({
      openai: mockOpenAI(),
      supabase: mockSupabase,
      mcpClients: mockMCPClient(),
      taskQueue: mockQueue
    })
  })

  afterEach(async () => {
    await agent.shutdown()
    vi.clearAllMocks()
  })

  describe('Request Analysis', () => {
    it('should extract departure airport from natural language', async () => {
      const request = 'Flight from Teterboro to Van Nuys on Nov 15 for 6 passengers'

      mockOpenAI.mockChatCompletion({
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15'
      })

      const result = await agent.analyzeRequest(request)

      expect(result.departure_airport).toBe('KTEB')
      expect(result.arrival_airport).toBe('KVNY')
    })

    it('should extract arrival airport from natural language', async () => {
      const request = 'Need to go from LAX to JFK tomorrow'

      mockOpenAI.mockChatCompletion({
        departure_airport: 'KLAX',
        arrival_airport: 'KJFK',
        departure_date: '2025-10-21'
      })

      const result = await agent.analyzeRequest(request)

      expect(result.arrival_airport).toBe('KJFK')
    })

    it('should extract passenger count', async () => {
      const request = 'Flight for 8 people from KTEB to KVNY'

      mockOpenAI.mockChatCompletion({
        passengers: 8,
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY'
      })

      const result = await agent.analyzeRequest(request)

      expect(result.passengers).toBe(8)
    })

    it('should extract departure date', async () => {
      const request = 'Need flight on December 25, 2025'

      mockOpenAI.mockChatCompletion({
        departure_date: '2025-12-25'
      })

      const result = await agent.analyzeRequest(request)

      expect(result.departure_date).toBe('2025-12-25')
    })

    it('should determine URGENT priority for ASAP requests', async () => {
      const request = 'URGENT: Need flight ASAP tomorrow'

      mockOpenAI.mockChatCompletion({
        urgency: 'urgent',
        departure_date: '2025-10-21'
      })

      const result = await agent.analyzeRequest(request)

      expect(result.urgency).toBe('urgent')
    })

    it('should determine HIGH priority for same-week requests', async () => {
      const request = 'Need flight this Friday'

      mockOpenAI.mockChatCompletion({
        urgency: 'high'
      })

      const result = await agent.analyzeRequest(request)

      expect(result.urgency).toBe('high')
    })

    it('should determine NORMAL priority for future requests', async () => {
      const request = 'Looking for flight next month'

      mockOpenAI.mockChatCompletion({
        urgency: 'normal'
      })

      const result = await agent.analyzeRequest(request)

      expect(result.urgency).toBe('normal')
    })

    it('should classify SIMPLE requests (domestic, standard)', async () => {
      const request = 'Flight from KTEB to KVNY for 6 passengers'

      mockOpenAI.mockChatCompletion({
        complexity: 'simple'
      })

      const result = await agent.analyzeRequest(request)

      expect(result.complexity).toBe('simple')
    })

    it('should classify COMPLEX requests (multi-leg, international)', async () => {
      const request = `
        Multi-leg trip: KTEB to LFPB (Paris) on Nov 15,
        then LFPB to EGLL (London) on Nov 18,
        return EGLL to KTEB on Nov 22
      `

      mockOpenAI.mockChatCompletion({
        complexity: 'complex',
        legs: 3
      })

      const result = await agent.analyzeRequest(request)

      expect(result.complexity).toBe('complex')
    })

    it('should identify special requirement: pets', async () => {
      const request = 'Flight with my dog, small breed'

      mockOpenAI.mockChatCompletion({
        special_requirements: ['pet-friendly']
      })

      const result = await agent.analyzeRequest(request)

      expect(result.special_requirements).toContain('pet-friendly')
    })

    it('should identify special requirement: medical equipment', async () => {
      const request = 'Need oxygen equipment on board'

      mockOpenAI.mockChatCompletion({
        special_requirements: ['medical-equipment']
      })

      const result = await agent.analyzeRequest(request)

      expect(result.special_requirements).toContain('medical-equipment')
    })

    it('should identify special requirement: wheelchair accessibility', async () => {
      const request = 'Passenger requires wheelchair access'

      mockOpenAI.mockChatCompletion({
        special_requirements: ['wheelchair-accessible']
      })

      const result = await agent.analyzeRequest(request)

      expect(result.special_requirements).toContain('wheelchair-accessible')
    })

    it('should identify missing departure airport', async () => {
      const request = 'Flight to Van Nuys for 6 people'

      mockOpenAI.mockChatCompletion({
        missing_fields: ['departure_airport'],
        arrival_airport: 'KVNY',
        passengers: 6
      })

      const result = await agent.analyzeRequest(request)

      expect(result.missing_fields).toContain('departure_airport')
    })

    it('should identify missing departure date', async () => {
      const request = 'Flight from KTEB to KVNY'

      mockOpenAI.mockChatCompletion({
        missing_fields: ['departure_date']
      })

      const result = await agent.analyzeRequest(request)

      expect(result.missing_fields).toContain('departure_date')
    })

    it('should handle ambiguous airport names and suggest ICAO codes', async () => {
      const request = 'Flight from New York to Los Angeles'

      mockOpenAI.mockChatCompletion({
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        suggestions: {
          departure: ['KTEB', 'KJFK', 'KEWR', 'KLGA'],
          arrival: ['KVNY', 'KLAX', 'KSNA', 'KBUR']
        }
      })

      const result = await agent.analyzeRequest(request)

      expect(result.suggestions.departure).toContain('KTEB')
      expect(result.suggestions.arrival).toContain('KVNY')
    })
  })

  describe('Agent Coordination', () => {
    it('should delegate to Client Data Manager when client email provided', async () => {
      const executeSpy = vi.spyOn(agent, 'executeClientDataManager')

      await agent.orchestrateWorkflow({
        ...testFlightRequest,
        client_email: 'john@example.com'
      })

      expect(executeSpy).toHaveBeenCalledWith('john@example.com')
    })

    it('should skip Client Data Manager for new clients', async () => {
      const executeSpy = vi.spyOn(agent, 'executeClientDataManager')

      await agent.orchestrateWorkflow({
        ...testFlightRequest,
        client_email: null
      })

      expect(executeSpy).not.toHaveBeenCalled()
    })

    it('should trigger Flight Search Agent with correct parameters', async () => {
      const executeSpy = vi.spyOn(agent, 'executeFlightSearch')

      await agent.orchestrateWorkflow(testFlightRequest)

      expect(executeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          departure_airport: testFlightRequest.departure_airport,
          arrival_airport: testFlightRequest.arrival_airport,
          passengers: testFlightRequest.passengers
        })
      )
    })

    it('should pass client preferences to Flight Search', async () => {
      const executeSpy = vi.spyOn(agent, 'executeFlightSearch')

      mockMCPClient.mockToolResponse('google-sheets', 'get_client', {
        preferences: {
          aircraft_category: 'midsize',
          avoid_turboprops: true
        }
      })

      await agent.orchestrateWorkflow({
        ...testFlightRequest,
        client_email: 'john@example.com'
      })

      expect(executeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          aircraft_category: 'midsize'
        })
      )
    })

    it('should trigger Proposal Analysis Agent after quotes received', async () => {
      const executeSpy = vi.spyOn(agent, 'executeProposalAnalysis')

      mockMCPClient.mockToolResponse('avinode', 'get_quotes', {
        quotes: [
          { operator: 'ABC Jets', price: 50000 },
          { operator: 'XYZ Aviation', price: 48000 }
        ]
      })

      await agent.orchestrateWorkflow(testFlightRequest)

      expect(executeSpy).toHaveBeenCalled()
    })

    it('should trigger Communication Manager with top 3 proposals', async () => {
      const executeSpy = vi.spyOn(agent, 'executeCommunicationManager')

      await agent.orchestrateWorkflow(testFlightRequest)

      expect(executeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          proposals: expect.arrayContaining([
            expect.objectContaining({ rank: 1 }),
            expect.objectContaining({ rank: 2 }),
            expect.objectContaining({ rank: 3 })
          ])
        })
      )
    })

    it('should handle agent handoff failures gracefully', async () => {
      vi.spyOn(agent, 'executeFlightSearch').mockRejectedValue(
        new Error('Avinode API unavailable')
      )

      const result = await agent.orchestrateWorkflow(testFlightRequest)

      expect(result.workflow_status).toBe('FAILED')
      expect(result.error).toContain('Avinode API unavailable')
    })
  })

  describe('Workflow State Machine', () => {
    it('should start in CREATED state', async () => {
      const requestId = await agent.createFlightRequest(testFlightRequest)

      const state = await agent.getCurrentState(requestId)

      expect(state).toBe('CREATED')
    })

    it('should transition from CREATED to ANALYZING', async () => {
      const requestId = await agent.createFlightRequest(testFlightRequest)

      await agent.transitionState(requestId, 'CREATED', 'ANALYZING')

      expect(await agent.getCurrentState(requestId)).toBe('ANALYZING')
    })

    it('should transition through complete workflow', async () => {
      const requestId = await agent.createFlightRequest(testFlightRequest)

      const states = [
        'ANALYZING',
        'FETCHING_CLIENT_DATA',
        'SEARCHING_FLIGHTS',
        'AWAITING_QUOTES',
        'ANALYZING_PROPOSALS',
        'GENERATING_EMAIL',
        'SENDING_PROPOSAL',
        'COMPLETED'
      ]

      let currentState = 'CREATED'
      for (const nextState of states) {
        await agent.transitionState(requestId, currentState, nextState)
        expect(await agent.getCurrentState(requestId)).toBe(nextState)
        currentState = nextState
      }
    })

    it('should reject invalid state transition', async () => {
      const requestId = await agent.createFlightRequest(testFlightRequest)
      await agent.transitionState(requestId, 'CREATED', 'ANALYZING')

      await expect(
        agent.transitionState(requestId, 'ANALYZING', 'COMPLETED')
      ).rejects.toThrow('Invalid state transition')
    })

    it('should allow transition to FAILED from any state', async () => {
      const requestId = await agent.createFlightRequest(testFlightRequest)
      await agent.transitionState(requestId, 'CREATED', 'ANALYZING')

      await agent.transitionState(requestId, 'ANALYZING', 'FAILED')

      expect(await agent.getCurrentState(requestId)).toBe('FAILED')
    })

    it('should record state history', async () => {
      const requestId = await agent.createFlightRequest(testFlightRequest)

      await agent.transitionState(requestId, 'CREATED', 'ANALYZING')
      await agent.transitionState(requestId, 'ANALYZING', 'FETCHING_CLIENT_DATA')

      const history = await agent.getStateHistory(requestId)

      expect(history).toHaveLength(2)
      expect(history[0].from_state).toBe('CREATED')
      expect(history[0].to_state).toBe('ANALYZING')
      expect(history[1].from_state).toBe('ANALYZING')
      expect(history[1].to_state).toBe('FETCHING_CLIENT_DATA')
    })

    it('should calculate duration in each state', async () => {
      const requestId = await agent.createFlightRequest(testFlightRequest)

      await agent.transitionState(requestId, 'CREATED', 'ANALYZING')
      await new Promise(resolve => setTimeout(resolve, 100))
      await agent.transitionState(requestId, 'ANALYZING', 'FETCHING_CLIENT_DATA')

      const history = await agent.getStateHistory(requestId)

      expect(history[0].duration_ms).toBeGreaterThanOrEqual(100)
    })

    it('should record triggered_by in state history', async () => {
      const requestId = await agent.createFlightRequest(testFlightRequest)

      await agent.transitionState(requestId, 'CREATED', 'ANALYZING')

      const history = await agent.getStateHistory(requestId)

      expect(history[0].triggered_by).toBe('RFPOrchestratorAgent')
    })
  })

  describe('Database Integration', () => {
    it('should create flight request in database', async () => {
      const result = await agent.createFlightRequest(testFlightRequest)

      expect(mockSupabase.from).toHaveBeenCalledWith('flight_requests')
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          departure_airport: testFlightRequest.departure_airport,
          arrival_airport: testFlightRequest.arrival_airport
        })
      )
      expect(result).toBe('test-id')
    })

    it('should update request status', async () => {
      const requestId = 'test-id'

      await agent.updateRequestStatus(requestId, 'SEARCHING_FLIGHTS')

      expect(mockSupabase.from).toHaveBeenCalledWith('flight_requests')
      expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'SEARCHING_FLIGHTS' })
    })

    it('should handle database errors gracefully', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' }
      })

      await expect(
        agent.createFlightRequest(testFlightRequest)
      ).rejects.toThrow('Database connection failed')
    })
  })

  describe('BullMQ Job Processing', () => {
    it('should queue flight search job', async () => {
      const job = await agent.queueTask('flight_search', {
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY'
      })

      expect(mockQueue.add).toHaveBeenCalledWith(
        'flight_search',
        expect.objectContaining({
          departure_airport: 'KTEB'
        })
      )
      expect(job.id).toBe('job-1')
    })

    it('should queue with URGENT priority (priority=1)', async () => {
      await agent.queueTask('urgent_rfp', {}, { priority: 1 })

      expect(mockQueue.add).toHaveBeenCalledWith(
        'urgent_rfp',
        {},
        expect.objectContaining({ priority: 1 })
      )
    })

    it('should queue with NORMAL priority (priority=10)', async () => {
      await agent.queueTask('normal_rfp', {}, { priority: 10 })

      expect(mockQueue.add).toHaveBeenCalledWith(
        'normal_rfp',
        {},
        expect.objectContaining({ priority: 10 })
      )
    })
  })

  describe('Tool Execution via MCP', () => {
    it('should execute Avinode search_flights tool', async () => {
      mockMCPClient.mockToolResponse('avinode', 'search_flights', {
        aircraft: [
          { type: 'Citation X', capacity: 8, operator: 'ABC Jets' },
          { type: 'Gulfstream G650', capacity: 12, operator: 'XYZ Aviation' }
        ]
      })

      const result = await agent.executeTool('avinode', 'search_flights', {
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6
      })

      expect(result.aircraft).toHaveLength(2)
      expect(result.aircraft[0].type).toBe('Citation X')
    })

    it('should execute Gmail send_email tool', async () => {
      mockMCPClient.mockToolResponse('gmail', 'send_email', {
        message_id: 'msg-123',
        status: 'sent'
      })

      const result = await agent.executeTool('gmail', 'send_email', {
        to: 'client@example.com',
        subject: 'Your Flight Proposal',
        body: '<h1>Proposal</h1>'
      })

      expect(result.message_id).toBe('msg-123')
      expect(result.status).toBe('sent')
    })

    it('should handle MCP tool errors', async () => {
      mockMCPClient.mockToolError('avinode', 'search_flights', 'API rate limit exceeded')

      await expect(
        agent.executeTool('avinode', 'search_flights', {})
      ).rejects.toThrow('API rate limit exceeded')
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should catch and log agent failures', async () => {
      const consoleSpy = vi.spyOn(console, 'error')

      vi.spyOn(agent, 'executeFlightSearch').mockRejectedValue(
        new Error('API error')
      )

      await agent.orchestrateWorkflow(testFlightRequest)

      expect(consoleSpy).toHaveBeenCalled()
    })

    it('should transition to FAILED state on error', async () => {
      vi.spyOn(agent, 'executeFlightSearch').mockRejectedValue(
        new Error('API error')
      )

      const result = await agent.orchestrateWorkflow(testFlightRequest)

      expect(result.workflow_status).toBe('FAILED')
    })

    it('should retry transient failures up to 3 times', async () => {
      let attempts = 0

      vi.spyOn(agent, 'executeFlightSearch').mockImplementation(async () => {
        attempts++
        if (attempts < 3) {
          throw new Error('Transient error')
        }
        return { success: true, aircraft: [] }
      })

      await agent.orchestrateWorkflow(testFlightRequest)

      expect(attempts).toBe(3)
    })

    it('should escalate to Error Monitor Agent after max retries', async () => {
      const escalateSpy = vi.spyOn(agent, 'escalateToErrorMonitor')

      vi.spyOn(agent, 'executeFlightSearch').mockRejectedValue(
        new Error('Persistent error')
      )

      await agent.orchestrateWorkflow(testFlightRequest)

      expect(escalateSpy).toHaveBeenCalled()
    })
  })

  describe('Performance', () => {
    it('should analyze request in <2 seconds', async () => {
      const startTime = Date.now()

      await agent.analyzeRequest('Flight from KTEB to KVNY for 6 passengers')

      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(2000)
    })

    it('should complete full workflow in <5 minutes', async () => {
      const startTime = Date.now()

      await agent.orchestrateWorkflow(testFlightRequest)

      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(300000) // 5 minutes
    }, 310000) // Test timeout: 5 min 10 sec
  })
})
```

**Mock Helpers**:
```typescript
// __tests__/helpers/mock-openai.ts
import { vi } from 'vitest'

export const mockOpenAI = () => {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  departure_airport: 'KTEB',
                  arrival_airport: 'KVNY',
                  passengers: 6,
                  departure_date: '2025-11-15'
                })
              }
            }
          ]
        })
      }
    },
    mockChatCompletion: (response: any) => {
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(response) } }]
      })
    }
  }
}
```

```typescript
// __tests__/helpers/mock-mcp.ts
import { vi } from 'vitest'

export const mockMCPClient = () => {
  const client = {
    execute: vi.fn(),
    mockToolResponse: (server: string, tool: string, response: any) => {
      client.execute.mockImplementation((s, t, params) => {
        if (s === server && t === tool) {
          return Promise.resolve(response)
        }
        return Promise.reject(new Error('Tool not found'))
      })
    },
    mockToolError: (server: string, tool: string, error: string) => {
      client.execute.mockImplementation((s, t, params) => {
        if (s === server && t === tool) {
          return Promise.reject(new Error(error))
        }
        return Promise.reject(new Error('Tool not found'))
      })
    }
  }
  return client
}
```

```typescript
// __tests__/helpers/test-data.ts
export const testFlightRequest = {
  user_id: 'user-123',
  client_email: 'john@example.com',
  departure_airport: 'KTEB',
  arrival_airport: 'KVNY',
  passengers: 6,
  departure_date: '2025-11-15'
}

export const testClientProfile = {
  id: 'client-123',
  name: 'John Doe',
  email: 'john@example.com',
  preferences: {
    catering: 'vegetarian',
    ground_transport: true,
    aircraft_category: 'midsize'
  }
}

export const testQuotes = [
  {
    id: 'quote-1',
    operator_name: 'ABC Jets',
    aircraft_type: 'Citation X',
    base_price: 50000,
    response_time: 15,
    specifications: {
      capacity: 8,
      range: 3200,
      speed: 600,
      category: 'midsize'
    },
    rating: 4.8
  },
  {
    id: 'quote-2',
    operator_name: 'XYZ Aviation',
    aircraft_type: 'Gulfstream G650',
    base_price: 75000,
    response_time: 20,
    specifications: {
      capacity: 12,
      range: 7000,
      speed: 650,
      category: 'heavy'
    },
    rating: 4.9
  }
]
```

**Run Tests** (should FAIL initially):
```bash
npm test -- rfp-orchestrator
# Expected: Tests fail because implementation incomplete
```

### Step 2: Implement Minimal Code (Green Phase)

Write minimal code to make tests pass:

```typescript
// lib/agents/rfp-orchestrator.ts
export class RFPOrchestratorAgent {
  async analyzeRequest(request: string) {
    // Minimal implementation to pass tests
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'Extract flight data...' },
        { role: 'user', content: request }
      ],
      response_format: { type: 'json_object' }
    })
    return JSON.parse(completion.choices[0].message.content!)
  }

  async orchestrateWorkflow(request: any) {
    // Minimal workflow orchestration
    const requestId = await this.createFlightRequest(request)

    try {
      await this.transitionState(requestId, 'CREATED', 'ANALYZING')
      await this.transitionState(requestId, 'ANALYZING', 'COMPLETED')

      return {
        request_id: requestId,
        workflow_status: 'COMPLETED',
        proposal_sent: true
      }
    } catch (error: any) {
      return {
        request_id: requestId,
        workflow_status: 'FAILED',
        error: error.message
      }
    }
  }

  // Other minimal implementations...
}
```

**Run Tests Again**:
```bash
npm test -- rfp-orchestrator
# Expected: More tests pass ✓
```

### Step 3: Refactor (Blue Phase)

Improve code quality while keeping tests passing:
- Extract common logic into helper functions
- Add proper error handling
- Improve naming and documentation
- Optimize performance

**Run Tests After Refactoring**:
```bash
npm test
# Expected: All tests still pass ✓
```

---

## 4. IMPLEMENTATION STEPS

### Pre-Implementation Checklist

- [ ] TASK-011 (RFP Orchestrator) completed
- [ ] TASK-013 (Client Data Manager) completed
- [ ] TASK-014 (Flight Search) completed
- [ ] TASK-015 (Proposal Analysis) completed
- [ ] TASK-016 (Communication Manager) completed
- [ ] TASK-017 (Error Monitor) completed
- [ ] Vitest configured in project
- [ ] Coverage reporter installed

### Step-by-Step Implementation

**Step 1**: Configure Vitest with Coverage
```bash
npm install -D vitest @vitest/coverage-v8
```

File: `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['lib/agents/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.spec.ts', '**/types.ts'],
      thresholds: {
        statements: 85,
        branches: 80,
        functions: 90,
        lines: 85
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './')
    }
  }
})
```

**Step 2**: Create Test Helpers and Mocks
- Create `__tests__/helpers/mock-openai.ts`
- Create `__tests__/helpers/mock-mcp.ts`
- Create `__tests__/helpers/mock-supabase.ts`
- Create `__tests__/helpers/test-data.ts`

**Step 3**: Write Unit Tests for RFP Orchestrator (30+ tests)
- Request analysis (15 tests)
- Agent coordination (8 tests)
- Workflow state machine (10 tests)
- Database integration (5 tests)
- BullMQ job processing (4 tests)
- Tool execution (5 tests)
- Error handling (5 tests)
- Performance (2 tests)

**Step 4**: Write Unit Tests for Client Data Manager (20+ tests)
- Client profile retrieval (8 tests)
- Returning client identification (5 tests)
- Preference extraction (4 tests)
- Data synchronization (3 tests)

**Step 5**: Write Unit Tests for Flight Search Agent (25+ tests)
- Aircraft search (10 tests)
- RFP creation (6 tests)
- Operator selection (5 tests)
- Quote tracking (4 tests)

**Step 6**: Write Unit Tests for Proposal Analysis Agent (20+ tests)
- Scoring algorithm (8 tests)
- Quote ranking (5 tests)
- Comparison table (4 tests)
- Profit margins (3 tests)

**Step 7**: Write Unit Tests for Communication Manager (20+ tests)
- Email composition (8 tests)
- PDF generation (6 tests)
- Gmail sending (4 tests)
- Delivery tracking (2 tests)

**Step 8**: Write Unit Tests for Error Monitor Agent (15+ tests)
- Error detection (5 tests)
- Recovery strategies (5 tests)
- Retry logic (3 tests)
- Sentry integration (2 tests)

**Step 9**: Run Coverage Report
```bash
npm run test:coverage
```

**Step 10**: Fix Coverage Gaps
- Identify uncovered lines/branches from report
- Add tests for missing coverage
- Re-run coverage until >85%

### Implementation Validation

After each step:
- [ ] Tests pass (`npm test`)
- [ ] Coverage meets thresholds (`npm run test:coverage`)
- [ ] No test warnings or deprecations
- [ ] Tests run in <2 minutes

---

## 5. GIT WORKFLOW

### Branch Creation
```bash
git checkout main
git pull origin main
git checkout -b test/agent-unit-tests
```

### Commit Guidelines
```bash
# Commit test files
git add __tests__/unit/agents/rfp-orchestrator.test.ts
git commit -m "test(agents): add RFP Orchestrator unit tests (30+ tests)"

git add __tests__/unit/agents/client-data-manager.test.ts
git commit -m "test(agents): add Client Data Manager unit tests (20+ tests)"

git add __tests__/helpers/mock-openai.ts __tests__/helpers/mock-mcp.ts
git commit -m "test(helpers): add OpenAI and MCP mock utilities"

git add vitest.config.ts
git commit -m "test(config): configure Vitest with coverage thresholds"

# Push to remote
git push origin test/agent-unit-tests
```

### Pull Request Process
```bash
gh pr create --title "Test: Comprehensive Unit Tests for All Agents (85% Coverage)" \
  --body "Implements 130+ unit tests for all 6 AI agents with mocked dependencies.

**Coverage Achieved:**
- RFP Orchestrator: 87%
- Client Data Manager: 89%
- Flight Search: 86%
- Proposal Analysis: 88%
- Communication Manager: 85%
- Error Monitor: 86%

**Overall Coverage: 86.5%**

Closes #TASK-026"
```

---

## 6. CODE REVIEW CHECKLIST

### Reviewer Checklist

**Testing Quality**:
- [ ] Tests are comprehensive and cover happy path, edge cases, errors
- [ ] Test coverage exceeds 85% for all agents
- [ ] All external dependencies are mocked
- [ ] Tests are deterministic (no randomness or timing issues)
- [ ] Test names are clear and descriptive

**Code Quality**:
- [ ] Mock helpers are reusable and well-documented
- [ ] Test data is realistic and representative
- [ ] No code duplication in tests
- [ ] Proper setup and teardown in beforeEach/afterEach

**Performance**:
- [ ] Test suite runs in <2 minutes
- [ ] No unnecessary async/await
- [ ] Mocks are efficient

**Documentation**:
- [ ] Test file headers explain purpose
- [ ] Complex test logic is commented
- [ ] Coverage report is readable

---

## 7. TESTING REQUIREMENTS

### Coverage Targets

**Overall Target**: 85%+
- Statement coverage: >85%
- Branch coverage: >80%
- Function coverage: >90%
- Line coverage: >85%

**Per-Agent Targets**:
- RFP Orchestrator: >85% (most critical)
- Client Data Manager: >85%
- Flight Search: >85%
- Proposal Analysis: >85%
- Communication Manager: >85%
- Error Monitor: >85%

### Running Tests

```bash
# Run all unit tests
npm test

# Run specific agent tests
npm test -- rfp-orchestrator

# Run in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run with UI
npm run test:ui
```

### Coverage Report

After running coverage:
- HTML report: `coverage/index.html`
- LCOV report: `coverage/lcov.info`
- Text summary in terminal

---

## 8. DEFINITION OF DONE

- [ ] All 6 agents have comprehensive unit tests (130+ total tests)
- [ ] Overall coverage >85% achieved
- [ ] All tests pass consistently
- [ ] Test suite runs in <2 minutes
- [ ] Coverage HTML report generated
- [ ] All external dependencies mocked
- [ ] Tests are isolated and deterministic
- [ ] Code review approved
- [ ] PR merged to main
- [ ] CI/CD pipeline passes

---

## 9. RESOURCES & REFERENCES

### Documentation
- [Vitest Documentation](https://vitest.dev/)
- [Vitest Coverage](https://vitest.dev/guide/coverage.html)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

### Related Tasks
- TASK-011: RFP Orchestrator Agent Implementation
- TASK-013: Client Data Manager Agent
- TASK-014: Flight Search Agent
- TASK-015: Proposal Analysis Agent
- TASK-016: Communication Manager Agent
- TASK-017: Error Monitor Agent
- TASK-027: Integration Tests
- TASK-028: E2E Tests

---

## 10. NOTES & QUESTIONS

### Implementation Notes
- Use `vi.mock()` for module-level mocking
- Use `vi.spyOn()` for method-level spying
- Always clean up mocks in `afterEach()`
- Use snapshot testing for complex objects

### Open Questions
- [ ] Should we test OpenAI prompt engineering specifically?
- [ ] Do we need separate tests for retry logic edge cases?
- [ ] Should we mock Redis/BullMQ or use test instance?

### Assumptions
- OpenAI API responses are deterministic for same inputs
- MCP tools return consistent data structures
- Database operations can be fully mocked

### Risks/Blockers
- Risk: Mocking complexity may hide integration issues
  - Mitigation: Complement with integration tests (TASK-027)
- Risk: Tests may become brittle with frequent agent changes
  - Mitigation: Focus on behavior over implementation

---

## 11. COMPLETION SUMMARY

### What Was Accomplished
[Fill out after task completion]
- Created 130+ unit tests across 6 agents
- Achieved 86.5% overall coverage
- Implemented mock helpers for OpenAI, MCP, Supabase
- Configured Vitest with coverage thresholds

### Changes Made
[List all files created/modified]
- Created: `__tests__/unit/agents/rfp-orchestrator.test.ts`
- Created: `__tests__/unit/agents/client-data-manager.test.ts`
- Created: `__tests__/unit/agents/flight-search.test.ts`
- Created: `__tests__/unit/agents/proposal-analysis.test.ts`
- Created: `__tests__/unit/agents/communication-manager.test.ts`
- Created: `__tests__/unit/agents/error-monitor.test.ts`
- Created: `__tests__/helpers/mock-openai.ts`
- Created: `__tests__/helpers/mock-mcp.ts`
- Created: `__tests__/helpers/mock-supabase.ts`
- Created: `__tests__/helpers/test-data.ts`
- Modified: `vitest.config.ts`
- Modified: `package.json` (added test scripts)

### Test Results
```
Test Suites: 6 passed, 6 total
Tests:       132 passed, 132 total
Coverage:    86.5% statements, 82.3% branches, 91.2% functions, 86.8% lines
Time:        1m 47s
```

### Known Issues/Future Work
- Add performance benchmarking tests
- Consider adding mutation testing
- Expand edge case coverage for complex workflows

### Time Tracking
- **Estimated**: 16 hours
- **Actual**: [X hours]
- **Variance**: +/- X hours

### Lessons Learned
- Mocking OpenAI requires careful response structure matching
- MCP client mocking simplified with helper utilities
- Test isolation critical for reliable test suite

---

**Task Status**: ⏳ PENDING

**Completed By**: -
**Completed Date**: -
**Reviewed By**: -
**Review Date**: -
