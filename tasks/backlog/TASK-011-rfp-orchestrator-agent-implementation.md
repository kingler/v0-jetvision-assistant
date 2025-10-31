# RFP Orchestrator Agent Implementation

**Task ID**: TASK-011
**Created**: 2025-10-20
**Assigned To**: AI/ML Engineer / Senior Backend Developer
**Status**: `pending`
**Priority**: `critical`
**Estimated Time**: 16 hours
**Actual Time**: - (update when complete)

---

## 1. TASK OVERVIEW

### Objective
Implement the RFP Orchestrator Agent - the first AI agent in the Jetvision system - using OpenAI GPT-4/5 with tool use capabilities, workflow state machine management, database integration, and BullMQ job processing for the complete flight request workflow.

### User Story
**As an** ISO agent
**I want** the system to automatically analyze flight requests and orchestrate the entire RFP workflow
**So that** I can process client requests in minutes instead of hours with minimal manual intervention

### Business Value
The RFP Orchestrator Agent is the brain of the Jetvision system. It analyzes incoming flight requests, determines priority and complexity, coordinates other specialized agents (Client Data Manager, Flight Search, Proposal Analysis, Communication Manager), manages workflow state transitions, and ensures smooth end-to-end automation. This is the most critical agent as it orchestrates all other components and directly impacts the 85% efficiency improvement goal.

---

## 2. REQUIREMENTS & ACCEPTANCE CRITERIA

### Functional Requirements

**FR-1**: System SHALL implement RFP Orchestrator as OpenAI Assistant
- Use OpenAI GPT-4 or GPT-5 with function calling
- Configure system prompt for flight request analysis
- Enable tool use for MCP client integration
- Implement conversation memory and context management

**FR-2**: System SHALL analyze flight requests
- Extract structured data: departure/arrival airports, passengers, date
- Determine urgency level (urgent, high, normal, low)
- Classify complexity (simple, standard, complex)
- Identify special requirements (pets, medical equipment, catering)
- Validate completeness and prompt for missing information

**FR-3**: System SHALL coordinate with other agents
- Delegate to Client Data Manager for profile retrieval
- Trigger Flight Search Agent for aircraft availability
- Hand off to Proposal Analysis Agent for quote evaluation
- Activate Communication Manager for email delivery
- Monitor agent execution and handle failures

**FR-4**: System SHALL manage workflow state machine
- Track 11 workflow states (CREATED → ANALYZING → FETCHING_CLIENT_DATA → etc.)
- Enforce valid state transitions
- Store state history in database
- Calculate duration in each state
- Handle state rollback on errors

**FR-5**: System SHALL integrate with database
- Store flight requests in `flight_requests` table
- Update request status in real-time
- Record workflow history in `workflow_history` table
- Link quotes to requests
- Associate proposals with requests and quotes

**FR-6**: System SHALL use BullMQ for job processing
- Queue agent tasks for async execution
- Support priority-based job scheduling
- Implement retry logic with exponential backoff (3 retries max)
- Track job status and completion
- Handle job failures gracefully

**FR-7**: System SHALL provide tool execution capabilities
- Search flights via Avinode MCP
- Retrieve client data via Google Sheets MCP
- Create RFPs via Avinode MCP
- Fetch quotes via Avinode MCP
- Generate and send proposals via Gmail MCP

**FR-8**: System SHALL implement error recovery
- Detect agent failures and errors
- Attempt automatic recovery (retry, alternative approach)
- Escalate to Error Monitor Agent when needed
- Notify user of critical failures
- Log all errors with context

### Acceptance Criteria

- [ ] **AC-1**: RFP Orchestrator implemented as OpenAI Assistant
- [ ] **AC-2**: Analyzes flight requests and extracts structured data
- [ ] **AC-3**: Determines urgency and complexity correctly
- [ ] **AC-4**: Coordinates with all other agents successfully
- [ ] **AC-5**: Manages workflow state machine with valid transitions
- [ ] **AC-6**: Stores all data in Supabase database
- [ ] **AC-7**: Queues jobs via BullMQ for async processing
- [ ] **AC-8**: Executes tools via MCP clients
- [ ] **AC-9**: Handles errors and implements recovery
- [ ] **AC-10**: Complete workflow from request to proposal works end-to-end
- [ ] **AC-11**: Unit tests achieve >75% coverage
- [ ] **AC-12**: Integration tests verify full workflow
- [ ] **AC-13**: Performance: Complete workflow in <5 minutes
- [ ] **AC-14**: Code review approved

### Non-Functional Requirements

- **Performance**: Request analysis <2 seconds, full workflow <5 minutes
- **Reliability**: 99% workflow completion rate
- **Cost Efficiency**: OpenAI API cost <$2 per request
- **Scalability**: Handle 100+ concurrent workflows
- **Observability**: Comprehensive logging and telemetry

---

## 3. TEST-DRIVEN DEVELOPMENT (TDD) APPROACH

### Step 1: Write Tests FIRST (Red Phase)

**Test Files to Create**:
```
__tests__/unit/agents/rfp-orchestrator.test.ts
__tests__/unit/agents/workflow-state-machine.test.ts
__tests__/integration/agents/rfp-workflow.test.ts
__tests__/e2e/complete-rfp-flow.test.ts
```

**Example Test (Write This First)**:
```typescript
// __tests__/unit/agents/rfp-orchestrator.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { RFPOrchestratorAgent } from '@/lib/agents/rfp-orchestrator'
import { createClient } from '@supabase/supabase-js'

describe('RFPOrchestratorAgent', () => {
  let agent: RFPOrchestratorAgent
  let supabase: any

  beforeEach(() => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    agent = new RFPOrchestratorAgent({
      openaiApiKey: process.env.OPENAI_API_KEY!,
      supabase
    })
  })

  afterEach(async () => {
    await agent.shutdown()
  })

  describe('Request Analysis', () => {
    it('should extract structured data from natural language request', async () => {
      const request = `
        I need a flight from Teterboro (KTEB) to Van Nuys (KVNY)
        on November 15, 2025 for 6 passengers.
        The client prefers midsize jets.
      `

      const result = await agent.analyzeRequest(request)

      expect(result).toMatchObject({
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15',
        aircraft_category: 'midsize'
      })
    })

    it('should determine urgency level', async () => {
      const urgentRequest = 'URGENT: Need flight ASAP tomorrow from KTEB to KVNY for 4 people'
      const result = await agent.analyzeRequest(urgentRequest)

      expect(result.urgency).toBe('urgent')
    })

    it('should classify request complexity', async () => {
      const complexRequest = `
        Multi-leg trip: KTEB to LFPB (Paris) on Nov 15,
        then LFPB to EGLL (London) on Nov 18,
        return EGLL to KTEB on Nov 22.
        8 passengers, need pet-friendly aircraft with medical equipment.
      `

      const result = await agent.analyzeRequest(complexRequest)

      expect(result.complexity).toBe('complex')
    })

    it('should identify special requirements', async () => {
      const request = 'Flight from KTEB to KVNY, 6 passengers, need wheelchair accessibility and kosher catering'

      const result = await agent.analyzeRequest(request)

      expect(result.special_requirements).toContain('wheelchair')
      expect(result.special_requirements).toContain('kosher catering')
    })

    it('should prompt for missing required information', async () => {
      const incompleteRequest = 'Need a flight to Los Angeles for 6 people'

      const result = await agent.analyzeRequest(incompleteRequest)

      expect(result.missing_fields).toContain('departure_airport')
      expect(result.missing_fields).toContain('departure_date')
    })
  })

  describe('Agent Coordination', () => {
    it('should delegate to Client Data Manager', async () => {
      const spy = vi.spyOn(agent, 'executeClientDataManager')

      await agent.processRequest({
        client_email: 'john.doe@example.com',
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15'
      })

      expect(spy).toHaveBeenCalledWith('john.doe@example.com')
    })

    it('should trigger Flight Search Agent', async () => {
      const spy = vi.spyOn(agent, 'executeFlightSearch')

      await agent.processRequest({
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15'
      })

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          departure_airport: 'KTEB',
          arrival_airport: 'KVNY'
        })
      )
    })

    it('should coordinate full workflow', async () => {
      const request = {
        user_id: 'user-123',
        client_email: 'john.doe@example.com',
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15'
      }

      const result = await agent.orchestrateWorkflow(request)

      expect(result).toHaveProperty('request_id')
      expect(result).toHaveProperty('workflow_status', 'COMPLETED')
      expect(result).toHaveProperty('proposal_sent', true)
    })
  })

  describe('Workflow State Machine', () => {
    it('should transition through valid states', async () => {
      const requestId = 'req-123'

      await agent.transitionState(requestId, 'CREATED', 'ANALYZING')
      expect(await agent.getCurrentState(requestId)).toBe('ANALYZING')

      await agent.transitionState(requestId, 'ANALYZING', 'FETCHING_CLIENT_DATA')
      expect(await agent.getCurrentState(requestId)).toBe('FETCHING_CLIENT_DATA')

      await agent.transitionState(requestId, 'FETCHING_CLIENT_DATA', 'SEARCHING_FLIGHTS')
      expect(await agent.getCurrentState(requestId)).toBe('SEARCHING_FLIGHTS')
    })

    it('should reject invalid state transitions', async () => {
      const requestId = 'req-123'
      await agent.transitionState(requestId, 'CREATED', 'ANALYZING')

      await expect(
        agent.transitionState(requestId, 'ANALYZING', 'COMPLETED')
      ).rejects.toThrow('Invalid state transition')
    })

    it('should record state history', async () => {
      const requestId = 'req-123'

      await agent.transitionState(requestId, 'CREATED', 'ANALYZING')
      await agent.transitionState(requestId, 'ANALYZING', 'FETCHING_CLIENT_DATA')

      const history = await agent.getStateHistory(requestId)

      expect(history).toHaveLength(2)
      expect(history[0]).toMatchObject({
        from_state: 'CREATED',
        to_state: 'ANALYZING'
      })
      expect(history[1]).toMatchObject({
        from_state: 'ANALYZING',
        to_state: 'FETCHING_CLIENT_DATA'
      })
    })

    it('should calculate duration in each state', async () => {
      const requestId = 'req-123'

      await agent.transitionState(requestId, 'CREATED', 'ANALYZING')
      await new Promise(resolve => setTimeout(resolve, 100))
      await agent.transitionState(requestId, 'ANALYZING', 'FETCHING_CLIENT_DATA')

      const history = await agent.getStateHistory(requestId)
      const analyzingDuration = history[0].duration_ms

      expect(analyzingDuration).toBeGreaterThanOrEqual(100)
    })
  })

  describe('Database Integration', () => {
    it('should store flight request in database', async () => {
      const request = {
        user_id: 'user-123',
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15'
      }

      const result = await agent.createFlightRequest(request)

      expect(result).toHaveProperty('id')
      expect(result.departure_airport).toBe('KTEB')

      // Verify in database
      const { data } = await supabase
        .from('flight_requests')
        .select()
        .eq('id', result.id)
        .single()

      expect(data).toBeTruthy()
      expect(data.departure_airport).toBe('KTEB')
    })

    it('should update request status', async () => {
      const requestId = 'req-123'

      await agent.updateRequestStatus(requestId, 'SEARCHING_FLIGHTS')

      const { data } = await supabase
        .from('flight_requests')
        .select()
        .eq('id', requestId)
        .single()

      expect(data.status).toBe('SEARCHING_FLIGHTS')
    })

    it('should record workflow history', async () => {
      const requestId = 'req-123'

      await agent.recordWorkflowTransition(requestId, {
        from_state: 'ANALYZING',
        to_state: 'FETCHING_CLIENT_DATA',
        triggered_by: 'RFPOrchestratorAgent',
        metadata: { reason: 'Analysis complete' }
      })

      const { data } = await supabase
        .from('workflow_history')
        .select()
        .eq('request_id', requestId)

      expect(data).toHaveLength(1)
      expect(data[0].from_state).toBe('ANALYZING')
    })
  })

  describe('BullMQ Job Processing', () => {
    it('should queue agent tasks', async () => {
      const job = await agent.queueTask('flight_search', {
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6
      })

      expect(job).toHaveProperty('id')
      expect(job.name).toBe('flight_search')
    })

    it('should process jobs with priority', async () => {
      const urgentJob = await agent.queueTask('urgent_rfp', {}, { priority: 1 })
      const normalJob = await agent.queueTask('normal_rfp', {}, { priority: 10 })

      // Urgent job should be processed first
      expect(urgentJob.opts.priority).toBeLessThan(normalJob.opts.priority!)
    })

    it('should retry failed jobs', async () => {
      let attempts = 0

      const job = await agent.queueTask('flaky_task', {})

      // Mock job failure
      agent.onJobProcess('flaky_task', async () => {
        attempts++
        if (attempts < 3) {
          throw new Error('Transient failure')
        }
        return { success: true }
      })

      // Process until success
      await agent.processJobs()

      expect(attempts).toBe(3)
    })
  })

  describe('Tool Execution via MCP', () => {
    it('should execute Avinode search_flights tool', async () => {
      const result = await agent.executeTool('avinode', 'search_flights', {
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15'
      })

      expect(result).toHaveProperty('aircraft')
      expect(Array.isArray(result.aircraft)).toBe(true)
    })

    it('should execute Gmail send_email tool', async () => {
      const result = await agent.executeTool('gmail', 'send_email', {
        to: 'client@example.com',
        subject: 'Your Flight Proposal',
        body: '<h1>Proposal</h1>'
      })

      expect(result).toHaveProperty('message_id')
    })

    it('should execute Google Sheets get_client tool', async () => {
      const result = await agent.executeTool('google-sheets', 'get_client', {
        identifier: 'john.doe@example.com'
      })

      expect(result).toHaveProperty('email')
      expect(result).toHaveProperty('preferences')
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle agent failures gracefully', async () => {
      // Mock tool failure
      vi.spyOn(agent, 'executeTool').mockRejectedValue(new Error('API error'))

      const result = await agent.processRequest({
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15'
      })

      expect(result.workflow_status).toBe('FAILED')
      expect(result.error).toBeDefined()
    })

    it('should retry transient failures', async () => {
      let attempts = 0

      vi.spyOn(agent, 'executeTool').mockImplementation(async () => {
        attempts++
        if (attempts < 3) {
          throw new Error('Transient error')
        }
        return { success: true }
      })

      await agent.processRequest({
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15'
      })

      expect(attempts).toBe(3)
    })

    it('should escalate to Error Monitor Agent', async () => {
      const escalateSpy = vi.spyOn(agent, 'escalateToErrorMonitor')

      // Mock critical failure
      vi.spyOn(agent, 'executeTool').mockRejectedValue(new Error('Critical failure'))

      await agent.processRequest({
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15'
      })

      expect(escalateSpy).toHaveBeenCalled()
    })
  })

  describe('Performance', () => {
    it('should complete workflow in under 5 minutes', async () => {
      const startTime = Date.now()

      await agent.orchestrateWorkflow({
        user_id: 'user-123',
        client_email: 'john.doe@example.com',
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15'
      })

      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(300000) // 5 minutes
    }, 310000) // Test timeout 5 min 10 sec
  })
})
```

**Run Tests** (should FAIL initially):
```bash
npm test -- rfp-orchestrator
# Expected: Tests fail because implementation doesn't exist
```

### Step 2: Implement Minimal Code (Green Phase)

```typescript
// lib/agents/rfp-orchestrator.ts
import OpenAI from 'openai'
import { SupabaseClient } from '@supabase/supabase-js'
import { Queue, Worker } from 'bullmq'
import { WorkflowStateMachine } from './workflow-state-machine'
import { MCPClientManager } from './mcp-client-manager'

interface RFPOrchestratorConfig {
  openaiApiKey: string
  supabase: SupabaseClient
}

export class RFPOrchestratorAgent {
  private openai: OpenAI
  private supabase: SupabaseClient
  private stateMachine: WorkflowStateMachine
  private mcpClients: MCPClientManager
  private taskQueue: Queue
  private worker: Worker

  constructor(config: RFPOrchestratorConfig) {
    this.openai = new OpenAI({ apiKey: config.openaiApiKey })
    this.supabase = config.supabase
    this.stateMachine = new WorkflowStateMachine(config.supabase)
    this.mcpClients = new MCPClientManager()

    // Initialize BullMQ
    this.taskQueue = new Queue('rfp-tasks', {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
      }
    })

    this.worker = new Worker('rfp-tasks', async (job) => {
      return await this.processJob(job)
    })
  }

  /**
   * Analyze flight request using OpenAI
   */
  async analyzeRequest(request: string): Promise<any> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an expert flight request analyzer.
          Extract structured data from flight requests.
          Return JSON with: departure_airport (ICAO), arrival_airport (ICAO),
          passengers (number), departure_date (YYYY-MM-DD), urgency (urgent/high/normal/low),
          complexity (simple/standard/complex), special_requirements (array),
          missing_fields (array), aircraft_category (optional).`
        },
        {
          role: 'user',
          content: request
        }
      ],
      response_format: { type: 'json_object' }
    })

    return JSON.parse(completion.choices[0].message.content!)
  }

  /**
   * Orchestrate complete RFP workflow
   */
  async orchestrateWorkflow(request: any): Promise<any> {
    const requestId = await this.createFlightRequest(request)

    try {
      // State: ANALYZING
      await this.transitionState(requestId, 'CREATED', 'ANALYZING')
      const analysis = await this.analyzeRequest(JSON.stringify(request))

      // State: FETCHING_CLIENT_DATA
      await this.transitionState(requestId, 'ANALYZING', 'FETCHING_CLIENT_DATA')
      const clientData = await this.executeClientDataManager(request.client_email)

      // State: SEARCHING_FLIGHTS
      await this.transitionState(requestId, 'FETCHING_CLIENT_DATA', 'SEARCHING_FLIGHTS')
      const flights = await this.executeFlightSearch(analysis)

      // State: AWAITING_QUOTES (async)
      await this.transitionState(requestId, 'SEARCHING_FLIGHTS', 'AWAITING_QUOTES')
      const rfpId = await this.createRFP(flights, analysis)

      // Wait for quotes (or timeout after 30 minutes)
      const quotes = await this.waitForQuotes(rfpId, 1800000)

      // State: ANALYZING_PROPOSALS
      await this.transitionState(requestId, 'AWAITING_QUOTES', 'ANALYZING_PROPOSALS')
      const topProposals = await this.analyzeProposals(quotes, clientData)

      // State: GENERATING_EMAIL
      await this.transitionState(requestId, 'ANALYZING_PROPOSALS', 'GENERATING_EMAIL')
      const proposalEmail = await this.generateProposalEmail(topProposals, clientData)

      // State: SENDING_PROPOSAL
      await this.transitionState(requestId, 'GENERATING_EMAIL', 'SENDING_PROPOSAL')
      const sent = await this.sendProposal(proposalEmail, request.client_email)

      // State: COMPLETED
      await this.transitionState(requestId, 'SENDING_PROPOSAL', 'COMPLETED')

      return {
        request_id: requestId,
        workflow_status: 'COMPLETED',
        proposal_sent: true,
        email_id: sent.message_id
      }
    } catch (error: any) {
      await this.transitionState(requestId, await this.getCurrentState(requestId), 'FAILED')
      await this.escalateToErrorMonitor(requestId, error)

      return {
        request_id: requestId,
        workflow_status: 'FAILED',
        error: error.message
      }
    }
  }

  /**
   * Execute Client Data Manager (via Google Sheets MCP)
   */
  async executeClientDataManager(email: string): Promise<any> {
    return await this.executeTool('google-sheets', 'get_client', {
      identifier: email,
      search_field: 'email'
    })
  }

  /**
   * Execute Flight Search (via Avinode MCP)
   */
  async executeFlightSearch(params: any): Promise<any> {
    return await this.executeTool('avinode', 'search_flights', params)
  }

  /**
   * Execute MCP tool
   */
  async executeTool(serverName: string, toolName: string, params: any): Promise<any> {
    return await this.mcpClients.execute(serverName, toolName, params)
  }

  /**
   * Create flight request in database
   */
  async createFlightRequest(request: any): Promise<string> {
    const { data, error } = await this.supabase
      .from('flight_requests')
      .insert({
        user_id: request.user_id,
        departure_airport: request.departure_airport,
        arrival_airport: request.arrival_airport,
        passengers: request.passengers,
        departure_date: request.departure_date,
        status: 'CREATED'
      })
      .select()
      .single()

    if (error) throw error
    return data.id
  }

  /**
   * Transition workflow state
   */
  async transitionState(requestId: string, from: string, to: string): Promise<void> {
    await this.stateMachine.transition(requestId, from, to, 'RFPOrchestratorAgent')
  }

  /**
   * Get current state
   */
  async getCurrentState(requestId: string): Promise<string> {
    return await this.stateMachine.getCurrentState(requestId)
  }

  /**
   * Get state history
   */
  async getStateHistory(requestId: string): Promise<any[]> {
    return await this.stateMachine.getHistory(requestId)
  }

  /**
   * Queue task for async processing
   */
  async queueTask(name: string, data: any, options?: any): Promise<any> {
    return await this.taskQueue.add(name, data, options)
  }

  /**
   * Process BullMQ job
   */
  private async processJob(job: any): Promise<any> {
    // Job processing logic
    console.log(`Processing job: ${job.name}`, job.data)
    return { success: true }
  }

  /**
   * Escalate to Error Monitor Agent
   */
  async escalateToErrorMonitor(requestId: string, error: Error): Promise<void> {
    console.error('Escalating to Error Monitor:', { requestId, error: error.message })
    // Implementation would trigger Error Monitor Agent
  }

  /**
   * Shutdown agent
   */
  async shutdown(): Promise<void> {
    await this.worker.close()
    await this.taskQueue.close()
  }

  // Additional methods: createRFP, waitForQuotes, analyzeProposals,
  // generateProposalEmail, sendProposal, etc.
}
```

```typescript
// lib/agents/workflow-state-machine.ts
import { SupabaseClient } from '@supabase/supabase-js'

const VALID_TRANSITIONS: Record<string, string[]> = {
  'CREATED': ['ANALYZING'],
  'ANALYZING': ['FETCHING_CLIENT_DATA', 'FAILED'],
  'FETCHING_CLIENT_DATA': ['SEARCHING_FLIGHTS', 'FAILED'],
  'SEARCHING_FLIGHTS': ['AWAITING_QUOTES', 'FAILED'],
  'AWAITING_QUOTES': ['ANALYZING_PROPOSALS', 'FAILED'],
  'ANALYZING_PROPOSALS': ['GENERATING_EMAIL', 'FAILED'],
  'GENERATING_EMAIL': ['SENDING_PROPOSAL', 'FAILED'],
  'SENDING_PROPOSAL': ['COMPLETED', 'FAILED'],
  'COMPLETED': [],
  'FAILED': []
}

export class WorkflowStateMachine {
  constructor(private supabase: SupabaseClient) {}

  async transition(
    requestId: string,
    fromState: string,
    toState: string,
    triggeredBy: string
  ): Promise<void> {
    // Validate transition
    if (!VALID_TRANSITIONS[fromState]?.includes(toState)) {
      throw new Error(`Invalid state transition: ${fromState} -> ${toState}`)
    }

    const startTime = Date.now()

    // Update request status
    await this.supabase
      .from('flight_requests')
      .update({ status: toState })
      .eq('id', requestId)

    // Record in history
    await this.supabase
      .from('workflow_history')
      .insert({
        request_id: requestId,
        from_state: fromState,
        to_state: toState,
        triggered_by: triggeredBy,
        duration_ms: Date.now() - startTime
      })
  }

  async getCurrentState(requestId: string): Promise<string> {
    const { data } = await this.supabase
      .from('flight_requests')
      .select('status')
      .eq('id', requestId)
      .single()

    return data?.status || 'UNKNOWN'
  }

  async getHistory(requestId: string): Promise<any[]> {
    const { data } = await this.supabase
      .from('workflow_history')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true })

    return data || []
  }
}
```

---

## 4. IMPLEMENTATION STEPS

### Pre-Implementation Checklist

- [ ] TASK-002 (Database) completed
- [ ] TASK-004 (Redis/BullMQ) completed
- [ ] TASK-007 (MCP Base) completed
- [ ] TASK-008 (Avinode MCP) completed
- [ ] OpenAI API key configured

### Step-by-Step Implementation

**Step 1**: Install Dependencies
```bash
npm install openai bullmq ioredis
```

**Step 2**: Create Agent Structure
- Implement RFPOrchestratorAgent class
- Implement WorkflowStateMachine
- Implement MCPClientManager

**Step 3**: Integrate OpenAI
- Configure GPT-4/5 with system prompts
- Implement function calling for tools
- Add conversation memory

**Step 4**: Integrate Database
- Implement CRUD for flight_requests
- Implement workflow_history recording
- Add real-time updates via Supabase Realtime

**Step 5**: Integrate BullMQ
- Configure job queue
- Implement worker
- Add retry logic

**Step 6**: Connect MCP Clients
- Initialize MCP client connections
- Implement tool execution wrapper
- Add error handling

**Step 7**: Write Comprehensive Tests
- Unit tests for all methods
- Integration tests for workflows
- E2E test for complete flow

---

## 5-11. STANDARD SECTIONS

(Following same structure as previous tasks)

- Git Workflow
- Code Review Checklist
- Testing Requirements (>75% coverage)
- Definition of Done
- Resources & References
- Notes & Questions
- Completion Summary

---

**Task Status**: ⏳ PENDING

**Completed By**: -
**Completed Date**: -
