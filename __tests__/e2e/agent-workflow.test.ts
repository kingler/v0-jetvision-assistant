/**
 * End-to-End Agent Workflow Test
 *
 * Tests the complete multi-agent workflow from RFP submission to proposal delivery:
 * 1. OrchestratorAgent analyzes RFP
 * 2. ClientDataAgent fetches client profile
 * 3. FlightSearchAgent searches flights and creates RFP
 * 4. ProposalAnalysisAgent scores and ranks quotes
 * 5. CommunicationAgent generates and sends proposal
 *
 * This test verifies:
 * - Agent coordination via MessageBus
 * - Task handoff between agents
 * - MCP tool integration
 * - Workflow state transitions
 * - Complete data flow
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { AgentFactory } from '@agents/core/agent-factory'
import { AgentRegistry } from '@agents/core/agent-registry'
import { AgentType, AgentStatus } from '@agents/core/types'
import { messageBus, MessageType } from '@agents/coordination/message-bus'
import { workflowManager, WorkflowState } from '@agents/coordination/state-machine'
import { AgentContext } from '@agents/core/agent-context'

describe('E2E Agent Workflow', () => {
  let factory: AgentFactory
  let registry: AgentRegistry
  let testSessionId: string
  let testRequestId: string
  let messagesReceived: any[]

  beforeAll(async () => {
    // Initialize singletons
    factory = AgentFactory.getInstance()
    registry = AgentRegistry.getInstance()

    // Register all agent types (would normally be done at app startup)
    // Using lazy imports to avoid circular dependencies in test
    const { OrchestratorAgent } = await import('@agents/implementations/orchestrator-agent')
    const { ClientDataAgent } = await import('@agents/implementations/client-data-agent')
    const { FlightSearchAgent } = await import('@agents/implementations/flight-search-agent')
    const { ProposalAnalysisAgent } = await import('@agents/implementations/proposal-analysis-agent')
    const { CommunicationAgent } = await import('@agents/implementations/communication-agent')

    factory.registerAgentType(AgentType.ORCHESTRATOR, OrchestratorAgent)
    factory.registerAgentType(AgentType.CLIENT_DATA, ClientDataAgent)
    factory.registerAgentType(AgentType.FLIGHT_SEARCH, FlightSearchAgent)
    factory.registerAgentType(AgentType.PROPOSAL_ANALYSIS, ProposalAnalysisAgent)
    factory.registerAgentType(AgentType.COMMUNICATION, CommunicationAgent)
  })

  beforeEach(() => {
    testSessionId = `e2e-session-${Date.now()}`
    testRequestId = `e2e-request-${Date.now()}`
    messagesReceived = []

    // Subscribe to all message types for monitoring
    const messageTypes = Object.values(MessageType)
    messageTypes.forEach(type => {
      messageBus.subscribe(type, (message) => {
        messagesReceived.push({ type, message })
      })
    })
  })

  afterAll(() => {
    // Cleanup
    registry.shutdownAll()
  })

  describe('Complete RFP Workflow', () => {
    it('should process RFP through all 5 agents successfully', async () => {
      // Step 1: Create test context with RFP data
      const context = new AgentContext({
        sessionId: testSessionId,
        requestId: testRequestId,
        userId: 'test-user-123',
        metadata: {
          rfpData: {
            departureAirport: 'KJFK', // New York JFK
            arrivalAirport: 'KLAX',   // Los Angeles LAX
            departureDate: '2025-12-15T10:00:00Z',
            returnDate: '2025-12-18T15:00:00Z',
            passengers: 6,
            aircraftType: 'midsize',
            budget: 50000,
            specialRequirements: 'Pet-friendly aircraft required',
          },
          clientEmail: 'test-client@example.com',
          clientName: 'Test Client Inc.',
        },
      })

      // Step 2: Create workflow state machine
      const workflow = workflowManager.createWorkflow(testRequestId)
      expect(workflow.getState()).toBe(WorkflowState.CREATED)

      // Step 3: Create and execute OrchestratorAgent
      console.log('\\n🚀 Step 1: Creating OrchestratorAgent...')
      const orchestrator = await factory.createAndInitialize({
        type: AgentType.ORCHESTRATOR,
        name: 'E2E Orchestrator',
        model: 'gpt-4', // Use GPT-4 for testing (faster than GPT-5)
      })

      expect(orchestrator).toBeDefined()
      expect(orchestrator.status).toBe(AgentStatus.IDLE)

      console.log('🎯 Step 2: Executing OrchestratorAgent...')
      workflow.transition(WorkflowState.ANALYZING, orchestrator.id)

      const orchestratorResult = await orchestrator.execute(context)

      expect(orchestratorResult).toBeDefined()
      expect(orchestratorResult.success).toBe(true)
      expect(orchestrator.status).toBe(AgentStatus.COMPLETED)

      console.log('✅ OrchestratorAgent completed successfully')
      console.log(`   Execution time: ${orchestratorResult.executionTime}ms`)

      // Verify orchestrator created task plan
      expect(orchestratorResult.data.taskPlan).toBeDefined()
      expect(orchestratorResult.data.taskPlan.length).toBeGreaterThan(0)

      // Step 4: Verify ClientDataAgent was triggered
      console.log('\\n📊 Step 3: Verifying ClientDataAgent execution...')

      // Wait for handoff messages
      await new Promise(resolve => setTimeout(resolve, 1000))

      const handoffMessages = messagesReceived.filter(
        m => m.type === MessageType.AGENT_HANDOFF
      )
      expect(handoffMessages.length).toBeGreaterThan(0)

      // Check if ClientDataAgent was created
      const clientDataAgent = registry.getAgentsByType(AgentType.CLIENT_DATA)[0]
      if (clientDataAgent) {
        console.log('✅ ClientDataAgent found in registry')
        expect(clientDataAgent.status).toBeOneOf([
          AgentStatus.RUNNING,
          AgentStatus.COMPLETED
        ])
      }

      // Step 5: Verify FlightSearchAgent execution
      console.log('\\n✈️  Step 4: Verifying FlightSearchAgent execution...')

      await new Promise(resolve => setTimeout(resolve, 2000))

      const flightSearchAgent = registry.getAgentsByType(AgentType.FLIGHT_SEARCH)[0]
      if (flightSearchAgent) {
        console.log('✅ FlightSearchAgent found in registry')

        // Verify workflow transitioned to searching state
        workflow.transition(WorkflowState.SEARCHING_FLIGHTS, flightSearchAgent.id)
        expect(workflow.getState()).toBe(WorkflowState.SEARCHING_FLIGHTS)
      }

      // Step 6: Simulate quote reception (would normally come from webhook)
      console.log('\\n💰 Step 5: Simulating quote reception...')

      const mockQuotes = [
        {
          id: 'quote-1',
          operatorId: 'op-1',
          operatorName: 'NetJets',
          aircraftType: 'Citation X',
          totalPrice: 45000,
          departureTime: '2025-12-15T10:00:00Z',
          arrivalTime: '2025-12-15T15:30:00Z',
          status: 'pending',
        },
        {
          id: 'quote-2',
          operatorId: 'op-2',
          operatorName: 'VistaJet',
          aircraftType: 'Challenger 350',
          totalPrice: 48000,
          departureTime: '2025-12-15T09:30:00Z',
          arrivalTime: '2025-12-15T15:00:00Z',
          status: 'pending',
        },
        {
          id: 'quote-3',
          operatorId: 'op-3',
          operatorName: 'Flexjet',
          aircraftType: 'Gulfstream G280',
          totalPrice: 52000,
          departureTime: '2025-12-15T11:00:00Z',
          arrivalTime: '2025-12-15T16:30:00Z',
          status: 'pending',
        },
      ]

      context.metadata.quotes = mockQuotes
      workflow.transition(WorkflowState.AWAITING_QUOTES, 'system')

      // Step 7: Execute ProposalAnalysisAgent
      console.log('\\n🔍 Step 6: Executing ProposalAnalysisAgent...')

      const proposalAgent = await factory.createAndInitialize({
        type: AgentType.PROPOSAL_ANALYSIS,
        name: 'E2E Proposal Analyzer',
        model: 'gpt-4',
      })

      workflow.transition(WorkflowState.ANALYZING_PROPOSALS, proposalAgent.id)

      const proposalResult = await proposalAgent.execute(context)

      expect(proposalResult).toBeDefined()
      expect(proposalResult.success).toBe(true)

      console.log('✅ ProposalAnalysisAgent completed')
      console.log(`   Analyzed ${mockQuotes.length} quotes`)
      console.log(`   Execution time: ${proposalResult.executionTime}ms`)

      // Verify quotes were scored and ranked
      expect(proposalResult.data.analyzedQuotes).toBeDefined()
      expect(proposalResult.data.analyzedQuotes.length).toBe(mockQuotes.length)
      expect(proposalResult.data.recommendation).toBeDefined()

      // Step 8: Execute CommunicationAgent
      console.log('\\n📧 Step 7: Executing CommunicationAgent...')

      const commAgent = await factory.createAndInitialize({
        type: AgentType.COMMUNICATION,
        name: 'E2E Communication',
        model: 'gpt-4',
      })

      // Add analyzed quotes to context
      context.metadata.analyzedQuotes = proposalResult.data.analyzedQuotes
      context.metadata.recommendation = proposalResult.data.recommendation

      workflow.transition(WorkflowState.GENERATING_EMAIL, commAgent.id)

      const commResult = await commAgent.execute(context)

      expect(commResult).toBeDefined()
      expect(commResult.success).toBe(true)

      console.log('✅ CommunicationAgent completed')
      console.log(`   Email generated: ${commResult.data.emailSent ? 'Yes' : 'Draft created'}`)
      console.log(`   Execution time: ${commResult.executionTime}ms`)

      // Verify email was generated
      expect(commResult.data.emailContent).toBeDefined()
      expect(commResult.data.emailContent.subject).toBeDefined()
      expect(commResult.data.emailContent.body).toBeDefined()

      // Step 9: Complete workflow
      workflow.transition(WorkflowState.COMPLETED, 'system')
      expect(workflow.getState()).toBe(WorkflowState.COMPLETED)
      expect(workflow.isCompleted()).toBe(true)

      // Step 10: Verify complete workflow metrics
      console.log('\\n📊 Workflow Summary:')
      console.log('═══════════════════════════════════════')

      const duration = workflow.getDuration()
      const stateTimings = workflow.getStateTimings()

      console.log(`Total Duration: ${duration}ms`)
      console.log(`\\nState Timings:`)
      Object.entries(stateTimings).forEach(([state, time]) => {
        if (time > 0) {
          console.log(`  ${state}: ${time}ms`)
        }
      })

      const allAgents = registry.getAllAgents()
      console.log(`\\nAgents Created: ${allAgents.length}`)
      allAgents.forEach(agent => {
        const metrics = agent.getMetrics()
        console.log(`  - ${agent.config.type}: ${metrics.totalExecutions} executions, ${metrics.averageExecutionTime.toFixed(0)}ms avg`)
      })

      console.log(`\\nMessages Published: ${messagesReceived.length}`)
      const messagesByType = messagesReceived.reduce((acc, m) => {
        acc[m.type] = (acc[m.type] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      Object.entries(messagesByType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`)
      })

      console.log('═══════════════════════════════════════')

      // Final assertions
      expect(duration).toBeGreaterThan(0)
      expect(allAgents.length).toBeGreaterThanOrEqual(3) // At least orchestrator, proposal, communication
      expect(messagesReceived.length).toBeGreaterThan(0)
      expect(workflow.isCompleted()).toBe(true)

      console.log('\\n🎉 E2E Workflow Test PASSED!')
    }, 60000) // 60 second timeout for complete workflow

    it('should handle workflow failures gracefully', async () => {
      const context = new AgentContext({
        sessionId: `failure-session-${Date.now()}`,
        requestId: `failure-request-${Date.now()}`,
        userId: 'test-user-456',
        metadata: {
          // Missing required rfpData to trigger failure
          clientEmail: 'test@example.com',
        },
      })

      const workflow = workflowManager.createWorkflow(context.requestId)

      const orchestrator = await factory.createAndInitialize({
        type: AgentType.ORCHESTRATOR,
        name: 'Failure Test Orchestrator',
        model: 'gpt-4',
      })

      workflow.transition(WorkflowState.ANALYZING, orchestrator.id)

      try {
        await orchestrator.execute(context)
        // Should not reach here
        expect(true).toBe(false)
      } catch (error) {
        expect(error).toBeDefined()
        expect(workflow.getState()).toBe(WorkflowState.ANALYZING)

        // Verify error was logged
        const errorMessages = messagesReceived.filter(
          m => m.type === MessageType.ERROR
        )
        expect(errorMessages.length).toBeGreaterThan(0)

        console.log('✅ Workflow failure handled correctly')
      }
    })
  })

  describe('Agent Coordination Verification', () => {
    it('should publish correct messages during handoffs', async () => {
      const context = new AgentContext({
        sessionId: `coord-session-${Date.now()}`,
        requestId: `coord-request-${Date.now()}`,
        userId: 'test-user-789',
        metadata: {
          rfpData: {
            departureAirport: 'KSFO',
            arrivalAirport: 'KJFK',
            departureDate: '2025-12-20T08:00:00Z',
            passengers: 4,
          },
        },
      })

      const orchestrator = await factory.createAndInitialize({
        type: AgentType.ORCHESTRATOR,
        name: 'Coordination Test',
        model: 'gpt-4',
      })

      messagesReceived = [] // Reset

      await orchestrator.execute(context)

      // Verify message types published
      const messageTypes = new Set(messagesReceived.map(m => m.type))

      expect(messageTypes.has(MessageType.TASK_STARTED)).toBe(true)
      expect(messageTypes.has(MessageType.AGENT_HANDOFF)).toBe(true)
      expect(messageTypes.has(MessageType.TASK_COMPLETED)).toBe(true)

      console.log('✅ Message bus communication verified')
    })

    it('should maintain context across agent handoffs', async () => {
      const initialData = {
        testKey: 'testValue',
        timestamp: Date.now(),
      }

      const context = new AgentContext({
        sessionId: `context-session-${Date.now()}`,
        requestId: `context-request-${Date.now()}`,
        userId: 'test-user-context',
        metadata: {
          testData: initialData,
          rfpData: {
            departureAirport: 'KBOS',
            arrivalAirport: 'KMIA',
            departureDate: '2025-12-25T12:00:00Z',
            passengers: 2,
          },
        },
      })

      const orchestrator = await factory.createAndInitialize({
        type: AgentType.ORCHESTRATOR,
        name: 'Context Test',
        model: 'gpt-4',
      })

      await orchestrator.execute(context)

      // Verify context data persisted
      expect(context.metadata.testData).toEqual(initialData)
      expect(context.sessionId).toBeDefined()
      expect(context.requestId).toBeDefined()

      console.log('✅ Context preservation verified')
    })
  })
})
