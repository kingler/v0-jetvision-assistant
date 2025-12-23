/**
 * OpenAI Model Configuration
 *
 * This file contains the configuration for OpenAI models used throughout the application.
 * Now loads from database (admin-configured) with fallback to environment variables.
 *
 * Latest available model: GPT-4 (default, configurable via admin panel)
 * Reference: https://openai.github.io/openai-agents-python/ref/
 */

import { getLLMConfig, getModelForAgent as getDBModelForAgent, getModelParameters } from './llm-config';

/**
 * Legacy static configuration (for backward compatibility)
 * Use getLLMConfig() for database-backed configuration
 * 
 * @deprecated Use getLLMConfig() instead for admin-configured settings
 */
export const OPENAI_CONFIG = {
  /**
   * Primary model for all AI agents
   * @deprecated Use getLLMConfig() to get the configured default model
   */
  DEFAULT_MODEL: 'gpt-4',

  /**
   * Model for specific agent types
   * @deprecated Use getModelForAgent() instead
   */
  AGENT_MODELS: {
    orchestrator: 'gpt-4',
    clientData: 'gpt-4',
    flightSearch: 'gpt-4',
    proposalAnalysis: 'gpt-4',
    communication: 'gpt-4',
    errorMonitor: 'gpt-4',
  },

  /**
   * Model parameters
   * @deprecated Use getModelParameters() instead
   */
  PARAMETERS: {
    temperature: 0.7,
    maxTokens: 8192,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
  },

  /**
   * OpenAI Agents Python SDK configuration
   * Reference: https://openai.github.io/openai-agents-python/ref/tool_context/
   */
  AGENTS: {
    // Use latest API version compatible with GPT-4
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
 * Now loads from database configuration
 * 
 * @param agentType - Agent type identifier
 * @returns Model name to use for the agent
 */
export async function getModelForAgent(agentType: keyof typeof OPENAI_CONFIG.AGENT_MODELS): Promise<string> {
  try {
    return await getDBModelForAgent(agentType);
  } catch (error) {
    console.warn('Failed to load model from database, using fallback:', error);
    return OPENAI_CONFIG.AGENT_MODELS[agentType] || OPENAI_CONFIG.DEFAULT_MODEL;
  }
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
