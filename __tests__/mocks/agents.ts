/**
 * Mock Agent Factories for Integration Testing
 * 
 * Provides mock implementations of agents and their dependencies
 * for comprehensive integration testing of the agent workflow.
 * 
 * @module __tests__/mocks/agents
 */

import { vi, type Mock } from 'vitest'
import type {
  IAgent,
  AgentConfig,
  AgentContext,
  AgentResult,
  AgentTask,
  AgentMetrics,
  AgentTool,
} from '@/agents/core/types'
import { AgentType, AgentStatus } from '@/agents/core/types'

// ============================================================================
// Mock Agent Context Factory
// ============================================================================

/**
 * Creates a mock agent context with sensible defaults
 * @param overrides - Partial context to override defaults
 * @returns Complete AgentContext for testing
 */
export function createMockAgentContext(
  overrides: Partial<AgentContext> = {}
): AgentContext {
  return {
    requestId: `req-${Date.now()}`,
    userId: 'user-test-123',
    sessionId: `session-${Date.now()}`,
    metadata: {},
    history: [],
    ...overrides,
  }
}

/**
 * Creates a mock RFP context with flight search parameters
 * @param rfpData - RFP data overrides
 * @returns AgentContext configured for RFP processing
 */
export function createMockRFPContext(
  rfpData: Partial<{
    departure: string
    arrival: string
    departureDate: string
    passengers: number
    clientName?: string
    returnDate?: string
  }> = {}
): AgentContext {
  return createMockAgentContext({
    metadata: {
      rfpData: {
        departure: 'KJFK',
        arrival: 'KLAX',
        departureDate: '2025-03-15',
        passengers: 4,
        ...rfpData,
      },
    },
  })
}

/**
 * Creates a mock conversational context with user message
 * @param userMessage - The user's message
 * @param sessionId - Optional session ID for conversation continuity
 * @returns AgentContext configured for conversational mode
 */
export function createMockConversationalContext(
  userMessage: string,
  sessionId?: string
): AgentContext {
  return createMockAgentContext({
    sessionId: sessionId || `session-${Date.now()}`,
    metadata: {
      userMessage,
    },
  })
}

// ============================================================================
// Mock Agent Task Factory
// ============================================================================

/**
 * Creates a mock agent task
 * @param overrides - Partial task to override defaults
 * @returns Complete AgentTask for testing
 */
export function createMockAgentTask(
  overrides: Partial<AgentTask> = {}
): AgentTask {
  return {
    id: `task-${Date.now()}`,
    type: 'test_task',
    payload: {},
    priority: 'normal',
    status: 'pending',
    createdAt: new Date(),
    ...overrides,
  }
}

/**
 * Creates a flight search task
 * @param searchParams - Flight search parameters
 * @returns AgentTask configured for flight search
 */
export function createMockFlightSearchTask(
  searchParams: Partial<{
    departure: string
    arrival: string
    departureDate: string
    passengers: number
  }> = {}
): AgentTask {
  return createMockAgentTask({
    type: 'search_flights',
    targetAgent: AgentType.FLIGHT_SEARCH,
    payload: {
      departure: 'KJFK',
      arrival: 'KLAX',
      departureDate: '2025-03-15',
      passengers: 4,
      ...searchParams,
    },
  })
}

// ============================================================================
// Mock Agent Result Factory
// ============================================================================

/**
 * Creates a successful agent result
 * @param data - Result data
 * @param executionTime - Execution time in ms
 * @returns Successful AgentResult
 */
export function createMockSuccessResult(
  data: unknown = {},
  executionTime: number = 100
): AgentResult {
  return {
    success: true,
    data,
    metadata: {
      executionTime,
    },
  }
}

/**
 * Creates a failed agent result
 * @param error - Error object or message
 * @param executionTime - Execution time in ms
 * @returns Failed AgentResult
 */
export function createMockFailedResult(
  error: Error | string,
  executionTime: number = 50
): AgentResult {
  return {
    success: false,
    error: error instanceof Error ? error : new Error(error),
    metadata: {
      executionTime,
    },
  }
}

// ============================================================================
// Mock Agent Implementation
// ============================================================================

/**
 * Creates a mock agent implementing the IAgent interface
 * @param type - Agent type
 * @param overrides - Method overrides
 * @returns Mock agent for testing
 */
export function createMockAgent(
  type: AgentType = AgentType.ORCHESTRATOR,
  overrides: Partial<{
    id: string
    name: string
    status: AgentStatus
    execute: Mock
    initialize: Mock
    registerTool: Mock
    handoff: Mock
    getMetrics: Mock
    shutdown: Mock
  }> = {}
): IAgent {
  const id = overrides.id || `agent-${type}-${Date.now()}`
  const name = overrides.name || `Mock${type}Agent`
  let status = overrides.status || AgentStatus.IDLE

  const metrics: AgentMetrics = {
    agentId: id,
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    averageExecutionTime: 0,
    totalTokensUsed: 0,
    toolCallsCount: 0,
  }

  return {
    id,
    type,
    name,
    get status() {
      return status
    },
    initialize: overrides.initialize || vi.fn().mockResolvedValue(undefined),
    execute: overrides.execute || vi.fn().mockResolvedValue(createMockSuccessResult()),
    registerTool: overrides.registerTool || vi.fn(),
    handoff: overrides.handoff || vi.fn().mockResolvedValue(undefined),
    getMetrics: overrides.getMetrics || vi.fn().mockReturnValue(metrics),
    shutdown: overrides.shutdown || vi.fn().mockResolvedValue(undefined),
  }
}

// ============================================================================
// Mock Tool Factory
// ============================================================================

/**
 * Creates a mock agent tool
 * @param name - Tool name
 * @param handler - Optional custom handler
 * @returns Mock AgentTool for testing
 */
export function createMockTool(
  name: string,
  handler?: (params: Record<string, unknown>) => Promise<unknown>
): AgentTool {
  return {
    name,
    description: `Mock tool: ${name}`,
    parameters: {
      type: 'object',
      properties: {
        input: { type: 'string' },
      },
      required: [],
    },
    handler: handler || vi.fn().mockResolvedValue({ success: true }),
  }
}

// ============================================================================
// Mock MCP Client Factory
// ============================================================================

/**
 * Mock MCP tool result
 */
export interface MockMCPToolResult {
  content: Array<{ type: string; text: string }>
}

/**
 * Creates a mock MCP client for testing MCP tool integration
 * @param tools - Array of tool names the mock client should expose
 * @returns Mock MCP client
 */
export function createMockMCPClient(
  tools: string[] = ['search_flights', 'create_trip', 'get_quotes']
) {
  const toolResults: Map<string, unknown> = new Map()

  return {
    listTools: vi.fn().mockResolvedValue({
      tools: tools.map((name) => ({
        name,
        description: `Mock MCP tool: ${name}`,
        inputSchema: { type: 'object', properties: {} },
      })),
    }),
    callTool: vi.fn().mockImplementation(async ({ name, arguments: args }: { name: string; arguments: unknown }) => {
      // Check if there's a custom result for this tool
      if (toolResults.has(name)) {
        return {
          content: [{ type: 'text', text: JSON.stringify(toolResults.get(name)) }],
        }
      }

      // Default mock responses per tool
      switch (name) {
        case 'search_flights':
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                aircraft: [
                  { id: 'ac-1', type: 'Citation X', category: 'midsize', capacity: 8, range: 3500, speed: 550, operator: { id: 'op-1', name: 'Elite Jets', rating: 4.8 } },
                  { id: 'ac-2', type: 'Gulfstream G450', category: 'heavy', capacity: 12, range: 4500, speed: 580, operator: { id: 'op-2', name: 'Premium Air', rating: 4.9 } },
                ],
                query: args,
              }),
            }],
          }
        case 'create_trip':
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                trip_id: `atrip-${Date.now()}`,
                deep_link: 'https://avinode.test/trip/atrip-12345',
                rfp_id: `arfq-${Date.now()}`,
                status: 'trip_created',
                created_at: new Date().toISOString(),
              }),
            }],
          }
        case 'get_quotes':
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                quotes: [
                  { quote_id: 'q-1', operator_id: 'op-1', operator_name: 'Elite Jets', aircraft_type: 'Citation X', base_price: 45000 },
                  { quote_id: 'q-2', operator_id: 'op-2', operator_name: 'Premium Air', aircraft_type: 'Gulfstream G450', base_price: 75000 },
                ],
              }),
            }],
          }
        case 'send_trip_message':
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                message_id: `msg-${Date.now()}`,
                status: 'sent',
                sent_at: new Date().toISOString(),
                recipient_count: 3,
              }),
            }],
          }
        case 'get_trip_messages':
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                messages: [
                  { message_id: 'msg-1', sender_id: 'op-1', sender_name: 'Elite Jets', sender_type: 'operator', content: 'Aircraft confirmed available.', sent_at: new Date().toISOString() },
                ],
                total_count: 1,
                has_more: false,
              }),
            }],
          }
        default:
          return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }] }
      }
    }),

    // Helper to set custom tool results for testing
    setToolResult: (toolName: string, result: unknown) => {
      toolResults.set(toolName, result)
    },

    // Helper to clear custom tool results
    clearToolResults: () => {
      toolResults.clear()
    },
  }
}

// ============================================================================
// Mock Conversation State Factory
// ============================================================================

/**
 * Creates a mock conversation state for orchestrator testing
 * @param overrides - State overrides
 * @returns Mock conversation state
 */
export function createMockConversationState(
  overrides: Partial<{
    sessionId: string
    userId: string
    requestId: string
    isComplete: boolean
    extractedData: Record<string, unknown>
    missingFields: string[]
    clarificationRound: number
    questionsAsked: string[]
    conversationHistory: Array<{ role: string; content: string; timestamp: Date }>
  }> = {}
) {
  return {
    sessionId: overrides.sessionId || `session-${Date.now()}`,
    userId: overrides.userId,
    requestId: overrides.requestId,
    isComplete: overrides.isComplete || false,
    extractedData: overrides.extractedData || {},
    missingFields: overrides.missingFields || ['departure', 'arrival', 'departureDate', 'passengers'],
    intent: null,
    clarificationRound: overrides.clarificationRound || 0,
    questionsAsked: overrides.questionsAsked || [],
    conversationHistory: overrides.conversationHistory || [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

// ============================================================================
// Mock Redis Store Factory
// ============================================================================

/**
 * Creates a mock Redis conversation store for orchestrator testing
 * @returns Mock conversation store with in-memory storage
 */
export function createMockConversationStore() {
  const storage = new Map<string, unknown>()

  return {
    initialize: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockImplementation(async (sessionId: string) => storage.get(sessionId)),
    set: vi.fn().mockImplementation(async (sessionId: string, state: unknown) => {
      storage.set(sessionId, state)
    }),
    delete: vi.fn().mockImplementation(async (sessionId: string) => {
      storage.delete(sessionId)
    }),
    refreshTTL: vi.fn().mockResolvedValue(undefined),
    getHealth: vi.fn().mockResolvedValue({
      connected: true,
      latencyMs: 1,
      usingFallback: false,
    }),
    close: vi.fn().mockResolvedValue(undefined),
    
    // Helpers for testing
    _storage: storage,
    _clear: () => storage.clear(),
  }
}

// ============================================================================
// Mock OpenAI Client Factory
// ============================================================================

/**
 * Creates a mock OpenAI client for agent testing
 * @param responses - Array of mock responses
 * @returns Mock OpenAI client
 */
export function createMockOpenAIClient(
  responses: Array<{
    content: string
    toolCalls?: Array<{
      id: string
      type: 'function'
      function: { name: string; arguments: string }
    }>
  }> = [{ content: 'Mock assistant response' }]
) {
  let responseIndex = 0

  return {
    chat: {
      completions: {
        create: vi.fn().mockImplementation(async () => {
          const response = responses[responseIndex] || responses[responses.length - 1]
          responseIndex++

          return {
            id: `chatcmpl-${Date.now()}`,
            object: 'chat.completion',
            created: Date.now(),
            model: 'gpt-4-turbo-preview',
            choices: [{
              index: 0,
              message: {
                role: 'assistant',
                content: response.content,
                tool_calls: response.toolCalls,
              },
              finish_reason: response.toolCalls ? 'tool_calls' : 'stop',
            }],
            usage: {
              prompt_tokens: 100,
              completion_tokens: 50,
              total_tokens: 150,
            },
          }
        }),
      },
    },
    // Mock for GPT-5 Responses API (if needed)
    responses: {
      create: vi.fn().mockImplementation(async () => ({
        id: `resp-${Date.now()}`,
        object: 'response',
        created: Date.now(),
        model: 'gpt-5',
        output: responses[0]?.content || 'Mock response',
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      })),
    },
  }
}

// ============================================================================
// Export all factories
// ============================================================================

export const MockFactories = {
  createMockAgentContext,
  createMockRFPContext,
  createMockConversationalContext,
  createMockAgentTask,
  createMockFlightSearchTask,
  createMockSuccessResult,
  createMockFailedResult,
  createMockAgent,
  createMockTool,
  createMockMCPClient,
  createMockConversationState,
  createMockConversationStore,
  createMockOpenAIClient,
}
