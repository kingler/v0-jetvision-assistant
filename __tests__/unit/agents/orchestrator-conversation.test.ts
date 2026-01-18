/**
 * Orchestrator Agent Conversational Capabilities Unit Tests
 *
 * Tests for ONEK-98 enhancements:
 * - Natural language intent parsing
 * - Progressive data extraction
 * - Contextual question generation
 * - Conversation state tracking
 * - Message component responses
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OrchestratorAgent } from '@agents/implementations/orchestrator-agent';
import type { AgentContext } from '@agents/core/types';
import { AgentType, AgentStatus } from '@agents/core/types';

// Type for conversational orchestrator result data
interface ConversationalResultData {
  message?: string;
  components?: Array<{ type: string; content?: string }>;
  intent?: string;
  conversationState?: {
    sessionId?: string;
    [key: string]: unknown;
  };
  nextAction?: string;
  isComplete?: boolean;
  analysis?: Record<string, unknown>;
  tasks?: Array<unknown>;
  nextSteps?: string[];
  requestId?: string;
  workflowId?: string;
  workflowState?: string;
  priority?: string;
}

// Mock LLM config - must be before OpenAI mock
vi.mock('@/lib/config/llm-config', () => ({
  getOpenAIClient: vi.fn().mockResolvedValue({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { role: 'assistant', content: 'Test' } }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }),
      },
    },
  }),
}));

// Mock OpenAI
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn().mockImplementation(async (params) => {
            // Mock different responses based on the prompt
            const messages = params.messages || [];
            const systemContent = messages[0]?.content || '';

            // Intent parsing
            if (systemContent.includes('intent classification')) {
              return {
                choices: [
                  {
                    message: {
                      content: JSON.stringify({
                        intent: 'general_conversation',
                        confidence: 0.9,
                        reasoning: 'User is greeting',
                      }),
                    },
                  },
                ],
                usage: {
                  prompt_tokens: 100,
                  completion_tokens: 50,
                  total_tokens: 150,
                },
              };
            }

            // Data extraction
            if (systemContent.includes('data extraction')) {
              return {
                choices: [
                  {
                    message: {
                      content: JSON.stringify({
                        data: {
                          departure: null,
                          arrival: null,
                          departureDate: null,
                          passengers: null,
                        },
                        confidence: 0.7,
                        fields_extracted: [],
                        ambiguities: [],
                      }),
                    },
                  },
                ],
                usage: {
                  prompt_tokens: 100,
                  completion_tokens: 50,
                  total_tokens: 150,
                },
              };
            }

            // Question generation
            if (systemContent.includes('question to ask')) {
              return {
                choices: [
                  {
                    message: {
                      content: JSON.stringify({
                        question: 'Where would you like to depart from?',
                        examples: ['Los Angeles', 'New York', 'Miami'],
                        suggested_actions: [],
                        reference_context: 'Starting your flight request',
                      }),
                    },
                  },
                ],
                usage: {
                  prompt_tokens: 100,
                  completion_tokens: 50,
                  total_tokens: 150,
                },
              };
            }

            // Information response
            if (systemContent.includes('helpful assistant for a private jet')) {
              return {
                choices: [
                  {
                    message: {
                      content: 'I can help you book a private jet flight. What are your travel plans?',
                    },
                  },
                ],
                usage: {
                  prompt_tokens: 100,
                  completion_tokens: 50,
                  total_tokens: 150,
                },
              };
            }

            // Default response
            return {
              choices: [
                {
                  message: {
                    content: 'Default response',
                  },
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
    })),
  };
});

describe('OrchestratorAgent - Conversational Capabilities (ONEK-98)', () => {
  let agent: OrchestratorAgent;

  beforeEach(async () => {
    agent = new OrchestratorAgent({
      type: AgentType.ORCHESTRATOR,
      name: 'Conversational Orchestrator',
    });
    await agent.initialize();
  });

  afterEach(async () => {
    await agent.shutdown();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with conversational tools', async () => {
      expect(agent).toBeDefined();
      expect(agent.type).toBe(AgentType.ORCHESTRATOR);
      expect(agent.status).toBe(AgentStatus.IDLE);
    });

    it('should have conversation state management methods', () => {
      expect(typeof agent.getConversationState).toBe('function');
      expect(typeof agent.clearConversationState).toBe('function');
    });
  });

  describe('Natural Language Processing', () => {
    it('should handle conversational RFP creation request', async () => {
      const context: AgentContext = {
        sessionId: 'test-session-1',
        userId: 'user-123',
        requestId: 'req-456',
        metadata: {
          userMessage: 'I need a flight from LA to Miami next Friday for 6 passengers',
        },
      };

      const result = await agent.execute(context);
      const data = result.data as ConversationalResultData;

      expect(result.success).toBe(true);
      expect(data).toBeDefined();
      expect(data.message).toBeDefined();
      expect(data.components).toBeDefined();
      expect(Array.isArray(data.components)).toBe(true);
    });

    it('should create conversation state for new session', async () => {
      const context: AgentContext = {
        sessionId: 'new-session',
        userId: 'user-789',
        metadata: {
          userMessage: 'Hello',
        },
      };

      await agent.execute(context);

      const conversationState = await agent.getConversationState('new-session');
      expect(conversationState).toBeDefined();
      expect(conversationState?.sessionId).toBe('new-session');
      expect(conversationState?.userId).toBe('user-789');
    });

    it('should maintain conversation history', async () => {
      const context: AgentContext = {
        sessionId: 'history-test',
        metadata: {
          userMessage: 'I want to fly to New York',
        },
      };

      await agent.execute(context);

      const conversationState = await agent.getConversationState('history-test');
      expect(conversationState?.conversationHistory).toBeDefined();
      expect(conversationState?.conversationHistory.length).toBeGreaterThan(0);
      expect(conversationState?.conversationHistory[0].role).toBe('user');
      expect(conversationState?.conversationHistory[0].content).toBe('I want to fly to New York');
    });
  });

  describe('Progressive Data Extraction', () => {
    it('should extract partial data from incomplete request', async () => {
      const context: AgentContext = {
        sessionId: 'extraction-test',
        metadata: {
          userMessage: 'I need a flight to Miami',
        },
      };

      const result = await agent.execute(context);

      const conversationState = await agent.getConversationState('extraction-test');
      expect(conversationState?.extractedData).toBeDefined();
    });

    it('should track missing required fields', async () => {
      const context: AgentContext = {
        sessionId: 'missing-fields-test',
        metadata: {
          userMessage: 'I need a flight to Miami',
        },
      };

      const result = await agent.execute(context);

      const conversationState = await agent.getConversationState('missing-fields-test');
      expect(conversationState?.missingFields).toBeDefined();
      expect(Array.isArray(conversationState?.missingFields)).toBe(true);
    });

    it('should progressively build data across multiple messages', async () => {
      const sessionId = 'progressive-test';

      // First message - partial data
      await agent.execute({
        sessionId,
        metadata: { userMessage: 'I need a flight from LA' },
      });

      let state = await agent.getConversationState(sessionId);
      expect(state?.extractedData).toBeDefined();

      // Second message - add more data
      await agent.execute({
        sessionId,
        metadata: { userMessage: 'to Miami' },
      });

      state = await agent.getConversationState(sessionId);
      expect(state?.extractedData).toBeDefined();

      // Third message - complete data
      await agent.execute({
        sessionId,
        metadata: { userMessage: 'next Friday for 6 passengers' },
      });

      state = await agent.getConversationState(sessionId);
      expect(state?.extractedData).toBeDefined();
    });
  });

  describe('Conversation State Tracking', () => {
    it('should track clarification rounds', async () => {
      const context: AgentContext = {
        sessionId: 'clarification-test',
        metadata: {
          userMessage: 'I need a flight',
        },
      };

      await agent.execute(context);

      const conversationState = await agent.getConversationState('clarification-test');
      expect(conversationState?.clarificationRound).toBeDefined();
      expect(typeof conversationState?.clarificationRound).toBe('number');
    });

    it('should track questions asked', async () => {
      const context: AgentContext = {
        sessionId: 'questions-test',
        metadata: {
          userMessage: 'I want to book a flight',
        },
      };

      await agent.execute(context);

      const conversationState = await agent.getConversationState('questions-test');
      expect(conversationState?.questionsAsked).toBeDefined();
      expect(Array.isArray(conversationState?.questionsAsked)).toBe(true);
    });

    it('should track completion status', async () => {
      const context: AgentContext = {
        sessionId: 'completion-test',
        metadata: {
          userMessage: 'Flight from LA to Miami next Friday for 6 people',
        },
      };

      await agent.execute(context);

      const conversationState = await agent.getConversationState('completion-test');
      expect(conversationState?.isComplete).toBeDefined();
      expect(typeof conversationState?.isComplete).toBe('boolean');
    });

    it('should update last modified timestamp', async () => {
      const context: AgentContext = {
        sessionId: 'timestamp-test',
        metadata: {
          userMessage: 'Hello',
        },
      };

      await agent.execute(context);

      const conversationState = await agent.getConversationState('timestamp-test');
      expect(conversationState?.lastUpdated).toBeDefined();
      expect(conversationState?.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('Message Components', () => {
    it('should return text component in response', async () => {
      const context: AgentContext = {
        sessionId: 'components-test',
        metadata: {
          userMessage: 'Hello',
        },
      };

      const result = await agent.execute(context);
      const data = result.data as ConversationalResultData;

      expect(data.components).toBeDefined();
      expect(Array.isArray(data.components)).toBe(true);

      const textComponent = data.components?.find((c) => c.type === 'text');
      expect(textComponent).toBeDefined();
      expect(textComponent?.content).toBeDefined();
    });

    it('should include message content in response', async () => {
      const context: AgentContext = {
        sessionId: 'message-test',
        metadata: {
          userMessage: 'I need help',
        },
      };

      const result = await agent.execute(context);
      const data = result.data as ConversationalResultData;

      expect(data.message).toBeDefined();
      expect(typeof data.message).toBe('string');
      expect(data.message!.length).toBeGreaterThan(0);
    });

    it('should include intent in response', async () => {
      const context: AgentContext = {
        sessionId: 'intent-test',
        metadata: {
          userMessage: 'Book a flight',
        },
      };

      const result = await agent.execute(context);
      const data = result.data as ConversationalResultData;

      expect(data.intent).toBeDefined();
    });

    it('should include conversation state in response', async () => {
      const context: AgentContext = {
        sessionId: 'state-test',
        metadata: {
          userMessage: 'Test message',
        },
      };

      const result = await agent.execute(context);
      const data = result.data as ConversationalResultData;

      expect(data.conversationState).toBeDefined();
      expect(data.conversationState?.sessionId).toBe('state-test');
    });
  });

  describe('Session Management', () => {
    it('should maintain separate states for different sessions', async () => {
      const context1: AgentContext = {
        sessionId: 'session-1',
        metadata: { userMessage: 'Flight to Miami' },
      };

      const context2: AgentContext = {
        sessionId: 'session-2',
        metadata: { userMessage: 'Flight to New York' },
      };

      await agent.execute(context1);
      await agent.execute(context2);

      const state1 = await agent.getConversationState('session-1');
      const state2 = await agent.getConversationState('session-2');

      expect(state1).toBeDefined();
      expect(state2).toBeDefined();
      expect(state1?.sessionId).toBe('session-1');
      expect(state2?.sessionId).toBe('session-2');
    });

    it('should clear conversation state when requested', async () => {
      const context: AgentContext = {
        sessionId: 'clear-test',
        metadata: { userMessage: 'Test' },
      };

      await agent.execute(context);

      let state = await agent.getConversationState('clear-test');
      expect(state).toBeDefined();

      await agent.clearConversationState('clear-test');

      state = await agent.getConversationState('clear-test');
      expect(state).toBeUndefined();
    });

    it('should cleanup all states on shutdown', async () => {
      await agent.execute({
        sessionId: 'shutdown-test-1',
        metadata: { userMessage: 'Test 1' },
      });

      await agent.execute({
        sessionId: 'shutdown-test-2',
        metadata: { userMessage: 'Test 2' },
      });

      await agent.shutdown();

      const state1 = await agent.getConversationState('shutdown-test-1');
      const state2 = await agent.getConversationState('shutdown-test-2');

      expect(state1).toBeUndefined();
      expect(state2).toBeUndefined();
    });
  });

  describe('Backward Compatibility', () => {
    it('should handle legacy RFP format without userMessage', async () => {
      const context: AgentContext = {
        requestId: 'rfp-legacy',
        userId: 'user-abc',
        sessionId: 'session-legacy',
        metadata: {
          rfpData: {
            departure: 'KTEB',
            arrival: 'KMIA',
            departureDate: '2025-11-15',
            passengers: 6,
            clientName: 'John Smith',
          },
        },
      };

      const result = await agent.execute(context);
      const data = result.data as ConversationalResultData;

      expect(result.success).toBe(true);
      expect(data.analysis).toBeDefined();
      expect(data.tasks).toBeDefined();
      expect(data.nextSteps).toBeDefined();
    });

    it('should maintain legacy response structure for backward compatibility', async () => {
      const context: AgentContext = {
        requestId: 'rfp-123',
        metadata: {
          rfpData: {
            departure: 'KTEB',
            arrival: 'KMIA',
            departureDate: '2025-11-15',
            passengers: 6,
          },
        },
      };

      const result = await agent.execute(context);
      const data = result.data as ConversationalResultData;

      expect(data.requestId).toBe('rfp-123');
      expect(data.workflowId).toBeDefined();
      expect(data.workflowState).toBe('ANALYZING');
      expect(data.priority).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully in conversational mode', async () => {
      const context: AgentContext = {
        sessionId: 'error-test',
        metadata: {
          userMessage: null, // Invalid input
        },
      };

      const result = await agent.execute(context);

      // Should not crash, return some response
      expect(result).toBeDefined();
    });

    it('should update error metrics on failure', async () => {
      const invalidContext: AgentContext = {
        requestId: 'invalid',
        metadata: {}, // Missing required data in legacy mode
      };

      await agent.execute(invalidContext);

      const metrics = agent.getMetrics();
      expect(metrics.failedExecutions).toBeGreaterThan(0);
    });

    it('should set status to ERROR on failure', async () => {
      const invalidContext: AgentContext = {
        metadata: {}, // Missing required data
      };

      await agent.execute(invalidContext);

      expect(agent.status).toBe(AgentStatus.ERROR);
    });
  });

  describe('Metrics Tracking', () => {
    it('should track execution time for conversational requests', async () => {
      const context: AgentContext = {
        sessionId: 'metrics-test',
        metadata: {
          userMessage: 'Hello',
        },
      };

      const result = await agent.execute(context);

      expect(result.metadata?.executionTime).toBeDefined();
      expect(result.metadata?.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should increment successful execution count', async () => {
      const metricsBeforeExecution = agent.getMetrics();
      const initialSuccessCount = metricsBeforeExecution.successfulExecutions;

      await agent.execute({
        sessionId: 'success-test',
        metadata: { userMessage: 'Test' },
      });

      const metricsAfterExecution = agent.getMetrics();
      expect(metricsAfterExecution.successfulExecutions).toBe(initialSuccessCount + 1);
    });

    it('should calculate average execution time', async () => {
      await agent.execute({
        sessionId: 'avg-test-1',
        metadata: { userMessage: 'Test 1' },
      });

      await agent.execute({
        sessionId: 'avg-test-2',
        metadata: { userMessage: 'Test 2' },
      });

      const metrics = agent.getMetrics();
      expect(metrics.averageExecutionTime).toBeGreaterThanOrEqual(0);
      expect(metrics.totalExecutions).toBe(2);
    });

    it('should set status to COMPLETED after successful execution', async () => {
      await agent.execute({
        sessionId: 'status-test',
        metadata: { userMessage: 'Test' },
      });

      expect(agent.status).toBe(AgentStatus.COMPLETED);
    });
  });

  describe('Next Action Guidance', () => {
    it('should provide next action in response', async () => {
      const context: AgentContext = {
        sessionId: 'next-action-test',
        metadata: {
          userMessage: 'I need a flight',
        },
      };

      const result = await agent.execute(context);
      const data = result.data as ConversationalResultData;

      expect(data.nextAction).toBeDefined();
      expect(['ask_question', 'create_rfp', 'provide_info']).toContain(
        data.nextAction
      );
    });

    it('should indicate completion status', async () => {
      const context: AgentContext = {
        sessionId: 'completion-status-test',
        metadata: {
          userMessage: 'Hello',
        },
      };

      const result = await agent.execute(context);
      const data = result.data as ConversationalResultData;

      expect(data.isComplete).toBeDefined();
      expect(typeof data.isComplete).toBe('boolean');
    });
  });
});
