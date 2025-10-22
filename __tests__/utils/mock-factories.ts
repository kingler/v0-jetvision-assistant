/**
 * Mock Data Factories
 *
 * Factory functions for creating mock data objects used in tests.
 * Provides consistent, realistic test data across the test suite.
 */

import { randomString, randomUUID, randomInt } from './test-helpers';

/**
 * Agent-related mock factories
 */

export const mockAgentConfig = (overrides = {}) => ({
  type: 'orchestrator',
  name: `Test Agent ${randomString(5)}`,
  model: 'gpt-4-turbo-preview',
  temperature: 0.7,
  maxTokens: 4000,
  ...overrides,
});

export const mockAgentContext = (overrides = {}) => ({
  sessionId: `session-${randomUUID()}`,
  requestId: `request-${randomUUID()}`,
  userId: `user-${randomUUID()}`,
  timestamp: new Date().toISOString(),
  metadata: {},
  ...overrides,
});

export const mockAgentResult = (overrides = {}) => ({
  success: true,
  data: { message: 'Operation completed successfully' },
  metadata: {
    executionTime: randomInt(100, 500),
    tokensUsed: randomInt(100, 1000),
  },
  ...overrides,
});

export const mockAgentTask = (overrides = {}) => ({
  id: `task-${randomUUID()}`,
  type: 'analyze_rfp',
  payload: { requestId: `request-${randomUUID()}` },
  priority: 'normal',
  status: 'pending',
  createdAt: new Date().toISOString(),
  ...overrides,
});

export const mockAgentMetrics = (overrides = {}) => ({
  totalExecutions: randomInt(0, 100),
  successfulExecutions: randomInt(0, 100),
  failedExecutions: randomInt(0, 10),
  averageExecutionTime: randomInt(100, 1000),
  totalTokensUsed: randomInt(1000, 10000),
  lastExecutionAt: new Date().toISOString(),
  ...overrides,
});

/**
 * Database-related mock factories
 */

export const mockISOAgent = (overrides = {}) => ({
  id: randomUUID(),
  name: `Test ISO Agent ${randomString(5)}`,
  api_key: `key_${randomString(32)}`,
  is_active: true,
  metadata: {
    description: 'Test ISO agent for automated testing',
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const mockClientProfile = (overrides = {}) => ({
  id: randomUUID(),
  iso_agent_id: randomUUID(),
  company_name: `${randomString(8)} Corporation`,
  contact_name: `${randomString(6)} ${randomString(8)}`,
  contact_email: `${randomString(8)}@example.com`,
  contact_phone: `+1${randomInt(1000000000, 9999999999)}`,
  preferences: {
    preferredAircraft: ['Citation X', 'Gulfstream G650'],
    budgetRange: { min: 50000, max: 150000 },
    emailFormat: 'detailed',
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const mockRFPRequest = (overrides = {}) => ({
  id: randomUUID(),
  iso_agent_id: randomUUID(),
  client_profile_id: randomUUID(),
  departure_airport: 'KJFK',
  arrival_airport: 'KLAX',
  departure_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  return_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  passengers: randomInt(4, 12),
  status: 'draft',
  workflow_state: 'created',
  metadata: {
    notes: 'Test RFP request',
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const mockQuote = (overrides = {}) => ({
  id: randomUUID(),
  request_id: randomUUID(),
  iso_agent_id: randomUUID(),
  operator_name: `${randomString(8)} Aviation`,
  aircraft_type: 'Citation X',
  price: randomInt(50000, 150000),
  ai_score: Math.random() * 100,
  response_data: {
    tailNumber: `N${randomInt(100, 999)}XX`,
    availability: 'confirmed',
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const mockWorkflowStateTransition = (overrides = {}) => ({
  id: randomUUID(),
  request_id: randomUUID(),
  from_state: 'created',
  to_state: 'analyzing',
  transitioned_by: 'orchestrator-agent',
  metadata: {
    reason: 'Test state transition',
  },
  transitioned_at: new Date().toISOString(),
  ...overrides,
});

export const mockAgentExecutionLog = (overrides = {}) => ({
  id: randomUUID(),
  request_id: randomUUID(),
  agent_type: 'orchestrator',
  action: 'analyze_rfp',
  status: 'success',
  duration_ms: randomInt(100, 5000),
  metadata: {
    tokensUsed: randomInt(100, 1000),
  },
  executed_at: new Date().toISOString(),
  ...overrides,
});

/**
 * MCP-related mock factories
 */

export const mockMCPToolDefinition = (overrides = {}) => ({
  name: `test_tool_${randomString(8)}`,
  description: 'A test tool for automated testing',
  inputSchema: {
    type: 'object',
    properties: {
      message: { type: 'string' },
    },
    required: ['message'],
  },
  execute: async (params: any) => ({ result: params.message }),
  ...overrides,
});

export const mockMCPMessage = (overrides = {}) => ({
  jsonrpc: '2.0',
  id: randomInt(1, 1000),
  method: 'tools/execute',
  params: {
    name: 'test_tool',
    arguments: { message: 'Hello, World!' },
  },
  ...overrides,
});

export const mockMCPServerConfig = (overrides = {}) => ({
  name: `test-mcp-server-${randomString(8)}`,
  version: '1.0.0',
  transport: 'stdio',
  ...overrides,
});

/**
 * Supabase-related mock factories
 */

export const mockSupabaseQueryResult = <T>(data: T[], overrides = {}) => ({
  data,
  error: null,
  count: data.length,
  status: 200,
  statusText: 'OK',
  ...overrides,
});

export const mockSupabaseError = (message = 'Database error', overrides = {}) => ({
  data: null,
  error: {
    message,
    details: 'Test error details',
    hint: 'Check your query',
    code: 'PGRST116',
  },
  count: null,
  status: 400,
  statusText: 'Bad Request',
  ...overrides,
});

/**
 * Authentication-related mock factories
 */

export const mockUser = (overrides = {}) => ({
  id: randomUUID(),
  email: `${randomString(8)}@example.com`,
  name: `${randomString(6)} ${randomString(8)}`,
  role: 'user',
  createdAt: new Date().toISOString(),
  ...overrides,
});

export const mockSession = (overrides = {}) => ({
  sessionId: randomUUID(),
  userId: randomUUID(),
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  createdAt: new Date().toISOString(),
  ...overrides,
});

/**
 * API Response mock factories
 */

export const mockAPISuccessResponse = <T>(data: T, overrides = {}) => ({
  success: true,
  data,
  message: 'Request completed successfully',
  timestamp: new Date().toISOString(),
  ...overrides,
});

export const mockAPIErrorResponse = (message = 'An error occurred', overrides = {}) => ({
  success: false,
  error: {
    message,
    code: 'INTERNAL_ERROR',
    details: 'Test error details',
  },
  timestamp: new Date().toISOString(),
  ...overrides,
});

/**
 * OpenAI-related mock factories
 */

export const mockChatCompletion = (content = 'This is a test response', overrides = {}) => ({
  id: `chatcmpl-${randomString(16)}`,
  object: 'chat.completion',
  created: Math.floor(Date.now() / 1000),
  model: 'gpt-4-turbo-preview',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content,
      },
      finish_reason: 'stop',
    },
  ],
  usage: {
    prompt_tokens: randomInt(50, 200),
    completion_tokens: randomInt(50, 500),
    total_tokens: randomInt(100, 700),
  },
  ...overrides,
});

export const mockChatMessage = (content: string, role: 'user' | 'assistant' | 'system' = 'user') => ({
  role,
  content,
});

/**
 * Helper function to create multiple mock objects
 */
export const createMockArray = <T>(factory: (index?: number) => T, count: number): T[] => {
  return Array.from({ length: count }, (_, index) => factory(index));
};
