/**
 * OpenAI Model Configuration
 *
 * This file contains the configuration for OpenAI models used throughout the application.
 * Update these values to use different models as they become available.
 *
 * Latest available model: GPT-5 (as of October 2025)
 * Reference: https://openai.github.io/openai-agents-python/ref/
 */

export const OPENAI_CONFIG = {
  /**
   * Primary model for all AI agents
   * Current: gpt-5 (Enhanced reasoning, 256K context window)
   *
   * Note: Using the OpenAI Agents Python SDK with GPT-5
   * Alternative models:
   * - gpt-5-preview (preview version)
   * - o1 (reasoning model)
   * - gpt-4-turbo-preview (fallback)
   */
  DEFAULT_MODEL: 'gpt-5',

  /**
   * Model for specific agent types
   * Allows customization per agent if needed
   * All agents use GPT-5 for optimal performance
   */
  AGENT_MODELS: {
    orchestrator: 'gpt-5',
    clientData: 'gpt-5',
    flightSearch: 'gpt-5',
    proposalAnalysis: 'gpt-5',
    communication: 'gpt-5',
    errorMonitor: 'gpt-5',
  },

  /**
   * Model parameters
   * Optimized for GPT-5 capabilities
   */
  PARAMETERS: {
    temperature: 0.7,
    maxTokens: 8192, // Increased for GPT-5 (supports up to 256K context)
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
  },

  /**
   * OpenAI Agents Python SDK configuration
   * Reference: https://openai.github.io/openai-agents-python/ref/tool_context/
   */
  AGENTS: {
    // Use latest API version compatible with GPT-5
    apiVersion: '2024-10-01',

    // Response format for structured outputs
    responseFormat: { type: 'json_object' as const },

    // Tool calling configuration
    parallelToolCalls: true,

    // Agent-specific settings
    streaming: false,

    // Tool configuration (tools defined in agent implementations)
    tools: [],
  },

  /**
   * Assistant API configuration (legacy, for backward compatibility)
   */
  ASSISTANTS: {
    // Use latest Assistants API version
    apiVersion: '2024-10-01',

    // Response format for structured outputs
    responseFormat: { type: 'json_object' as const },

    // Tool configuration
    tools: [],
  },

  /**
   * Rate limiting and retry configuration
   */
  RATE_LIMITING: {
    maxRetries: 3,
    retryDelay: 1000, // milliseconds
    timeout: 30000, // 30 seconds
  },
}

/**
 * Get model for specific agent type
 */
export function getModelForAgent(agentType: keyof typeof OPENAI_CONFIG.AGENT_MODELS): string {
  return OPENAI_CONFIG.AGENT_MODELS[agentType] || OPENAI_CONFIG.DEFAULT_MODEL
}

/**
 * Validate OpenAI configuration
 */
export function validateOpenAIConfig(): void {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required')
  }

  if (!process.env.OPENAI_ORGANIZATION_ID) {
    console.warn('OPENAI_ORGANIZATION_ID is not set. This may cause issues with billing.')
  }

  // Check if all required assistant IDs are configured
  const requiredAssistants = [
    'OPENAI_ORCHESTRATOR_ASSISTANT_ID',
    'OPENAI_CLIENT_DATA_ASSISTANT_ID',
    'OPENAI_FLIGHT_SEARCH_ASSISTANT_ID',
    'OPENAI_PROPOSAL_ANALYSIS_ASSISTANT_ID',
    'OPENAI_COMMUNICATION_ASSISTANT_ID',
    'OPENAI_ERROR_MONITOR_ASSISTANT_ID',
  ]

  const missingAssistants = requiredAssistants.filter((id) => !process.env[id])

  if (missingAssistants.length > 0) {
    throw new Error(
      `Missing required OpenAI Assistant IDs: ${missingAssistants.join(', ')}\n` +
      'Please create assistants in OpenAI Dashboard and add their IDs to .env.local'
    )
  }
}
