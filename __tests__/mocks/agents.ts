/**
 * Mock Factories for JetvisionAgent Testing
 *
 * Provides mock implementations for testing the JetvisionAgent
 * and its tool integrations with MCP servers.
 *
 * @module __tests__/mocks/agents
 */

import { vi, type Mock } from 'vitest';
import type {
  AgentContext,
  AgentResult,
  AvinodeQuote,
  ClientProfile,
  FlightRequest,
  ConversationState,
} from '../../agents/jetvision-agent/types';

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
    sessionId: `session-${Date.now()}`,
    userId: 'user-test-123',
    isoAgentId: 'iso-agent-test-456',
    requestId: undefined,
    conversationHistory: [],
    metadata: {},
    ...overrides,
  };
}

/**
 * Creates a mock RFP context with flight search parameters
 * @param rfpData - RFP data overrides
 * @returns AgentContext configured for RFP processing
 */
export function createMockRFPContext(
  rfpData: Partial<{
    departure: string;
    arrival: string;
    departureDate: string;
    passengers: number;
    clientName?: string;
    returnDate?: string;
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
  });
}

// ============================================================================
// Mock Agent Result Factory
// ============================================================================

/**
 * Creates a successful agent result
 * @param data - Result data
 * @returns Successful AgentResult
 */
export function createMockSuccessResult(
  data: AgentResult['data'] = {}
): AgentResult {
  return {
    success: true,
    message: 'Operation completed successfully',
    data,
    toolsUsed: [],
    nextAction: 'await_user',
  };
}

/**
 * Creates a failed agent result
 * @param message - Error message
 * @returns Failed AgentResult
 */
export function createMockFailedResult(message: string): AgentResult {
  return {
    success: false,
    message,
    toolsUsed: [],
  };
}

// ============================================================================
// Mock MCP Client Factory
// ============================================================================

/**
 * Mock MCP tool result
 */
export interface MockMCPToolResult {
  content: Array<{ type: string; text: string }>;
}

/**
 * Creates a mock MCP client for testing MCP tool integration
 * @param tools - Array of tool names the mock client should expose
 * @returns Mock MCP client
 */
export function createMockMCPClient(
  tools: string[] = ['create_trip', 'get_rfq', 'get_quote', 'send_trip_message']
) {
  const toolResults: Map<string, unknown> = new Map();

  return {
    listTools: vi.fn().mockResolvedValue({
      tools: tools.map((name) => ({
        name,
        description: `Mock MCP tool: ${name}`,
        inputSchema: { type: 'object', properties: {} },
      })),
    }),
    callTool: vi.fn().mockImplementation(
      async ({ name, arguments: args }: { name: string; arguments: unknown }) => {
        // Check if there's a custom result for this tool
        if (toolResults.has(name)) {
          return {
            content: [{ type: 'text', text: JSON.stringify(toolResults.get(name)) }],
          };
        }

        // Default mock responses per tool
        switch (name) {
          case 'create_trip':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    trip_id: `atrip-${Date.now()}`,
                    deep_link: 'https://avinode.test/trip/atrip-12345',
                    rfq_id: `arfq-${Date.now()}`,
                    status: 'trip_created',
                    created_at: new Date().toISOString(),
                  }),
                },
              ],
            };
          case 'get_rfq':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    trip_id: 'atrip-12345',
                    rfq_id: 'arfq-12345',
                    status: 'pending',
                    flights: [],
                    deep_link: 'https://avinode.test/trip/atrip-12345',
                  }),
                },
              ],
            };
          case 'get_quote':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    quoteId: 'q-1',
                    rfqId: 'arfq-12345',
                    operatorId: 'op-1',
                    operatorName: 'Elite Jets',
                    aircraftType: 'Citation X',
                    totalPrice: 45000,
                    currency: 'USD',
                    rfqStatus: 'quoted',
                  } as AvinodeQuote),
                },
              ],
            };
          case 'send_trip_message':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    message_id: `msg-${Date.now()}`,
                    sent_at: new Date().toISOString(),
                  }),
                },
              ],
            };
          case 'get_trip_messages':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    messages: [
                      {
                        id: 'msg-1',
                        threadId: 'thread-1',
                        senderId: 'op-1',
                        senderName: 'Elite Jets',
                        senderType: 'seller',
                        content: 'Aircraft confirmed available.',
                        sentAt: new Date().toISOString(),
                        isRead: false,
                      },
                    ],
                  }),
                },
              ],
            };
          case 'get_client':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    id: 'client-123',
                    iso_agent_id: 'iso-agent-test-456',
                    company_name: 'Test Corp',
                    contact_name: 'John Doe',
                    email: 'john@test.com',
                    is_active: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  } as ClientProfile),
                },
              ],
            };
          case 'get_request':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    id: 'req-123',
                    iso_agent_id: 'iso-agent-test-456',
                    departure_airport: 'KJFK',
                    arrival_airport: 'KLAX',
                    departure_date: '2025-03-15',
                    passengers: 4,
                    status: 'pending',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  } as FlightRequest),
                },
              ],
            };
          case 'send_email':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    message_id: `msg-${Date.now()}`,
                    thread_id: `thread-${Date.now()}`,
                    sent_at: new Date().toISOString(),
                  }),
                },
              ],
            };
          default:
            return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }] };
        }
      }
    ),

    // Helper to set custom tool results for testing
    setToolResult: (toolName: string, result: unknown) => {
      toolResults.set(toolName, result);
    },

    // Helper to clear custom tool results
    clearToolResults: () => {
      toolResults.clear();
    },
  };
}

// ============================================================================
// Mock Conversation State Factory
// ============================================================================

/**
 * Creates a mock conversation state for agent testing
 * @param overrides - State overrides
 * @returns Mock conversation state
 */
export function createMockConversationState(
  overrides: Partial<ConversationState> = {}
): ConversationState {
  return {
    sessionId: `session-${Date.now()}`,
    userId: 'user-test-123',
    history: [],
    extractedData: {},
    missingFields: ['departureAirport', 'arrivalAirport', 'departureDate', 'passengers'],
    clarificationRound: 0,
    isComplete: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================================================
// Mock Redis Store Factory
// ============================================================================

/**
 * Creates a mock Redis conversation store for agent testing
 * @returns Mock conversation store with in-memory storage
 */
export function createMockConversationStore() {
  const storage = new Map<string, unknown>();

  return {
    initialize: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockImplementation(async (sessionId: string) => storage.get(sessionId)),
    set: vi.fn().mockImplementation(async (sessionId: string, state: unknown) => {
      storage.set(sessionId, state);
    }),
    delete: vi.fn().mockImplementation(async (sessionId: string) => {
      storage.delete(sessionId);
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
  };
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
    content: string;
    toolCalls?: Array<{
      id: string;
      type: 'function';
      function: { name: string; arguments: string };
    }>;
  }> = [{ content: 'Mock assistant response' }]
) {
  let responseIndex = 0;

  return {
    chat: {
      completions: {
        create: vi.fn().mockImplementation(async () => {
          const response = responses[responseIndex] || responses[responses.length - 1];
          responseIndex++;

          return {
            id: `chatcmpl-${Date.now()}`,
            object: 'chat.completion',
            created: Date.now(),
            model: 'gpt-4-turbo-preview',
            choices: [
              {
                index: 0,
                message: {
                  role: 'assistant',
                  content: response.content,
                  tool_calls: response.toolCalls,
                },
                finish_reason: response.toolCalls ? 'tool_calls' : 'stop',
              },
            ],
            usage: {
              prompt_tokens: 100,
              completion_tokens: 50,
              total_tokens: 150,
            },
          };
        }),
      },
    },
  };
}

// ============================================================================
// Export all factories
// ============================================================================

export const MockFactories = {
  createMockAgentContext,
  createMockRFPContext,
  createMockSuccessResult,
  createMockFailedResult,
  createMockMCPClient,
  createMockConversationState,
  createMockConversationStore,
  createMockOpenAIClient,
};
