/**
 * LLM Configuration Loader
 * 
 * Loads LLM configuration from database (admin-configured) with fallback to environment variables.
 * This module provides a unified interface for accessing LLM settings across the application.
 * 
 * @module lib/config/llm-config
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/utils/encryption';
import OpenAI from 'openai';

/**
 * LLM Configuration Interface
 */
export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'azure';
  provider_name: string;
  api_key: string;
  default_model: string;
  available_models: string[];
  default_temperature: number;
  default_max_tokens: number;
  default_top_p: number;
  default_frequency_penalty: number;
  default_presence_penalty: number;
  organization_id?: string;
}

/**
 * Cache for LLM configuration (to avoid repeated database queries)
 */
let configCache: {
  config: LLMConfig | null;
  timestamp: number;
  ttl: number; // Time to live in milliseconds (5 minutes)
} = {
  config: null,
  timestamp: 0,
  ttl: 5 * 60 * 1000, // 5 minutes
};

/**
 * Get default LLM configuration from database
 * Falls back to environment variables if no database config exists
 * 
 * @returns LLM configuration object
 * @throws Error if no configuration is available
 */
export async function getLLMConfig(): Promise<LLMConfig> {
  // Check cache first
  const now = Date.now();
  if (configCache.config && (now - configCache.timestamp) < configCache.ttl) {
    return configCache.config;
  }

  try {
    const supabase = supabaseAdmin;

    // Fetch default active configuration from database
    const { data, error } = await supabase
      .from('llm_config')
      .select('*')
      .eq('is_default', true)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      // Fallback to environment variables
      return getFallbackConfig();
    }

    // Decrypt API key
    let apiKey: string;
    try {
      apiKey = decrypt(data.api_key_encrypted);
    } catch (decryptError) {
      console.error('Failed to decrypt API key, falling back to environment:', decryptError);
      return getFallbackConfig();
    }

    // Build configuration object
    const config: LLMConfig = {
      provider: data.provider as LLMConfig['provider'],
      provider_name: data.provider_name,
      api_key: apiKey,
      default_model: data.default_model,
      available_models: data.available_models || [],
      default_temperature: data.default_temperature ?? 0.7,
      default_max_tokens: data.default_max_tokens ?? 8192,
      default_top_p: data.default_top_p ?? 1.0,
      default_frequency_penalty: data.default_frequency_penalty ?? 0.0,
      default_presence_penalty: data.default_presence_penalty ?? 0.0,
      organization_id: data.organization_id || undefined,
    };

    // Update cache
    configCache = {
      config,
      timestamp: now,
      ttl: configCache.ttl,
    };

    return config;
  } catch (error) {
    console.error('Error loading LLM config from database:', error);
    return getFallbackConfig();
  }
}

/**
 * Get fallback configuration from environment variables
 * 
 * @returns LLM configuration from environment
 */
function getFallbackConfig(): LLMConfig {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error(
      'No LLM configuration found in database and OPENAI_API_KEY environment variable is not set. ' +
      'Please configure LLM settings in the admin panel or set OPENAI_API_KEY in environment variables.'
    );
  }

  return {
    provider: 'openai',
    provider_name: 'OpenAI',
    api_key: apiKey,
    default_model: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4',
    available_models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    default_temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
    default_max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || '8192'),
    default_top_p: parseFloat(process.env.OPENAI_TOP_P || '1.0'),
    default_frequency_penalty: parseFloat(process.env.OPENAI_FREQUENCY_PENALTY || '0.0'),
    default_presence_penalty: parseFloat(process.env.OPENAI_PRESENCE_PENALTY || '0.0'),
    organization_id: process.env.OPENAI_ORGANIZATION_ID,
  };
}

/**
 * Get OpenAI client instance using configured settings
 * 
 * @returns Configured OpenAI client
 */
export async function getOpenAIClient(): Promise<OpenAI> {
  const config = await getLLMConfig();

  if (config.provider !== 'openai') {
    throw new Error(`Provider ${config.provider} is not yet supported. Only OpenAI is currently supported.`);
  }

  return new OpenAI({
    apiKey: config.api_key,
    organization: config.organization_id,
  });
}

/**
 * Get model configuration for a specific agent type
 * 
 * @param agentType - Agent type identifier
 * @returns Model name to use for the agent
 */
export async function getModelForAgent(agentType: string): Promise<string> {
  const config = await getLLMConfig();
  return config.default_model;
}

/**
 * Clear the configuration cache
 * Useful after updating LLM configuration in admin panel
 */
export function clearLLMConfigCache(): void {
  configCache = {
    config: null,
    timestamp: 0,
    ttl: configCache.ttl,
  };
}

/**
 * Get model parameters from configuration
 * 
 * @returns Model parameters object
 */
export async function getModelParameters() {
  const config = await getLLMConfig();
  return {
    temperature: config.default_temperature,
    max_tokens: config.default_max_tokens,
    top_p: config.default_top_p,
    frequency_penalty: config.default_frequency_penalty,
    presence_penalty: config.default_presence_penalty,
  };
}

