/**
 * GPT-5 Agent Configurations
 *
 * Recommended GPT-5 settings for each agent type based on use case.
 * See docs/GPT5_CHATKIT_INTEGRATION.md for detailed rationale.
 */

import type { AgentConfig, AgentType, ReasoningEffort, TextVerbosity } from './types'

/**
 * GPT-5 Configuration Template
 */
interface GPT5ConfigTemplate {
  model: string
  reasoning: {
    effort: ReasoningEffort
  }
  text: {
    verbosity: TextVerbosity
  }
  maxOutputTokens: number
  description: string
}

/**
 * Recommended GPT-5 configurations by agent type
 */
const GPT5_CONFIGS: Record<AgentType, GPT5ConfigTemplate> = {
  orchestrator: {
    model: 'gpt-5',
    reasoning: {
      effort: 'medium', // Balance between speed and thoroughness for RFP analysis
    },
    text: {
      verbosity: 'medium', // Detailed but concise task planning
    },
    maxOutputTokens: 4096,
    description: 'RFP analysis, task planning, workflow orchestration',
  },

  client_data: {
    model: 'gpt-5-mini',
    reasoning: {
      effort: 'minimal', // Fast response for simple data fetching
    },
    text: {
      verbosity: 'low', // Concise output for structured data
    },
    maxOutputTokens: 2048,
    description: 'Simple data fetching from Google Sheets',
  },

  flight_search: {
    model: 'gpt-5',
    reasoning: {
      effort: 'low', // Fast flight search and data filtering
    },
    text: {
      verbosity: 'medium', // Structured flight data output
    },
    maxOutputTokens: 4096,
    description: 'Flight search, data filtering, RFP creation',
  },

  proposal_analysis: {
    model: 'gpt-5',
    reasoning: {
      effort: 'medium', // Complex multi-criteria scoring
    },
    text: {
      verbosity: 'medium', // Detailed scoring explanations
    },
    maxOutputTokens: 4096,
    description: 'Multi-criteria scoring, ranking logic',
  },

  communication: {
    model: 'gpt-5',
    reasoning: {
      effort: 'low', // Fast email generation
    },
    text: {
      verbosity: 'high', // Detailed, professional email content
    },
    maxOutputTokens: 8192, // Longer emails
    description: 'Email generation with detailed content',
  },

  error_monitor: {
    model: 'gpt-5-mini',
    reasoning: {
      effort: 'minimal', // Fast error classification
    },
    text: {
      verbosity: 'low', // Concise error reports
    },
    maxOutputTokens: 2048,
    description: 'Error classification, retry logic',
  },
}

/**
 * Get recommended GPT-5 configuration for an agent type
 *
 * @param type - Agent type
 * @param overrides - Optional config overrides
 * @returns Partial AgentConfig with GPT-5 settings
 */
export function getGPT5Config(
  type: AgentType,
  overrides?: Partial<AgentConfig>
): Partial<AgentConfig> {
  const template = GPT5_CONFIGS[type]

  if (!template) {
    throw new Error(`No GPT-5 configuration available for agent type: ${type}`)
  }

  return {
    model: template.model,
    reasoning: template.reasoning,
    text: template.text,
    maxOutputTokens: template.maxOutputTokens,
    ...overrides,
  }
}

/**
 * Create a complete AgentConfig with GPT-5 settings
 *
 * @param type - Agent type
 * @param name - Agent name
 * @param additionalConfig - Additional configuration options
 * @returns Complete AgentConfig
 */
export function createGPT5AgentConfig(
  type: AgentType,
  name: string,
  additionalConfig?: Partial<AgentConfig>
): AgentConfig {
  const gpt5Config = getGPT5Config(type, additionalConfig)

  return {
    type,
    name,
    ...gpt5Config,
    ...additionalConfig,
  } as AgentConfig
}

/**
 * Get all GPT-5 configurations (for documentation/reference)
 */
export function getAllGPT5Configs(): Record<AgentType, GPT5ConfigTemplate> {
  return { ...GPT5_CONFIGS }
}

/**
 * Check if a model is GPT-5
 */
export function isGPT5Model(model: string): boolean {
  return model.startsWith('gpt-5')
}

/**
 * Validate GPT-5 configuration
 */
export function validateGPT5Config(config: AgentConfig): {
  valid: boolean
  warnings: string[]
} {
  const warnings: string[] = []

  if (config.model && isGPT5Model(config.model)) {
    // Check for deprecated parameters
    if (config.temperature !== undefined) {
      warnings.push(
        'GPT-5 does not support temperature. Use reasoning.effort instead.'
      )
    }
    if (config.maxTokens !== undefined) {
      warnings.push(
        'GPT-5 uses maxOutputTokens instead of maxTokens.'
      )
    }

    // Check for missing recommended parameters
    if (!config.reasoning?.effort) {
      warnings.push(
        'GPT-5 configuration missing reasoning.effort (recommended: medium)'
      )
    }
    if (!config.text?.verbosity) {
      warnings.push(
        'GPT-5 configuration missing text.verbosity (recommended: medium)'
      )
    }
  }

  return {
    valid: warnings.length === 0,
    warnings,
  }
}

/**
 * Example Usage:
 *
 * ```typescript
 * import { AgentFactory } from '@agents/core'
 * import { createGPT5AgentConfig } from '@agents/core/gpt5-configs'
 *
 * const factory = AgentFactory.getInstance()
 *
 * // Create agent with recommended GPT-5 settings
 * const orchestrator = await factory.createAndInitialize(
 *   createGPT5AgentConfig(AgentType.ORCHESTRATOR, 'RFP Orchestrator')
 * )
 *
 * // Create agent with custom overrides
 * const customAgent = await factory.createAndInitialize(
 *   createGPT5AgentConfig(
 *     AgentType.COMMUNICATION,
 *     'Email Manager',
 *     {
 *       reasoning: { effort: 'high' }, // Override default 'low'
 *       systemPrompt: 'Custom prompt...',
 *     }
 *   )
 * )
 * ```
 */
