/**
 * GPT-5 Configuration Helper Tests
 *
 * Tests for GPT-5 agent configuration utilities
 */

import { describe, it, expect } from 'vitest'
import {
  getGPT5Config,
  createGPT5AgentConfig,
  getAllGPT5Configs,
  isGPT5Model,
  validateGPT5Config,
} from '@agents/core/gpt5-configs'
import { AgentType } from '@agents/core/types'

describe('GPT-5 Configuration Helpers', () => {
  describe('getGPT5Config', () => {
    it('should return GPT-5 config for OrchestratorAgent', () => {
      const config = getGPT5Config(AgentType.ORCHESTRATOR)

      expect(config.model).toBe('gpt-5')
      expect(config.reasoning?.effort).toBe('medium')
      expect(config.text?.verbosity).toBe('medium')
      expect(config.maxOutputTokens).toBe(4096)
    })

    it('should return GPT-5-mini config for ClientDataAgent', () => {
      const config = getGPT5Config(AgentType.CLIENT_DATA)

      expect(config.model).toBe('gpt-5-mini')
      expect(config.reasoning?.effort).toBe('minimal')
      expect(config.text?.verbosity).toBe('low')
      expect(config.maxOutputTokens).toBe(2048)
    })

    it('should return GPT-5 config for FlightSearchAgent', () => {
      const config = getGPT5Config(AgentType.FLIGHT_SEARCH)

      expect(config.model).toBe('gpt-5')
      expect(config.reasoning?.effort).toBe('low')
      expect(config.text?.verbosity).toBe('medium')
      expect(config.maxOutputTokens).toBe(4096)
    })

    it('should return GPT-5 config for ProposalAnalysisAgent', () => {
      const config = getGPT5Config(AgentType.PROPOSAL_ANALYSIS)

      expect(config.model).toBe('gpt-5')
      expect(config.reasoning?.effort).toBe('medium')
      expect(config.text?.verbosity).toBe('medium')
      expect(config.maxOutputTokens).toBe(4096)
    })

    it('should return GPT-5 config for CommunicationAgent with high verbosity', () => {
      const config = getGPT5Config(AgentType.COMMUNICATION)

      expect(config.model).toBe('gpt-5')
      expect(config.reasoning?.effort).toBe('low')
      expect(config.text?.verbosity).toBe('high')
      expect(config.maxOutputTokens).toBe(8192)
    })

    it('should return GPT-5-mini config for ErrorMonitorAgent', () => {
      const config = getGPT5Config(AgentType.ERROR_MONITOR)

      expect(config.model).toBe('gpt-5-mini')
      expect(config.reasoning?.effort).toBe('minimal')
      expect(config.text?.verbosity).toBe('low')
      expect(config.maxOutputTokens).toBe(2048)
    })

    it('should allow overriding model', () => {
      const config = getGPT5Config(AgentType.ORCHESTRATOR, {
        model: 'gpt-5-turbo',
      })

      expect(config.model).toBe('gpt-5-turbo')
    })

    it('should allow overriding reasoning effort', () => {
      const config = getGPT5Config(AgentType.CLIENT_DATA, {
        reasoning: { effort: 'high' },
      })

      expect(config.reasoning?.effort).toBe('high')
    })

    it('should allow overriding text verbosity', () => {
      const config = getGPT5Config(AgentType.COMMUNICATION, {
        text: { verbosity: 'low' },
      })

      expect(config.text?.verbosity).toBe('low')
    })

    it('should allow overriding maxOutputTokens', () => {
      const config = getGPT5Config(AgentType.ORCHESTRATOR, {
        maxOutputTokens: 16384,
      })

      expect(config.maxOutputTokens).toBe(16384)
    })
  })

  describe('createGPT5AgentConfig', () => {
    it('should create complete config for OrchestratorAgent', () => {
      const config = createGPT5AgentConfig(
        AgentType.ORCHESTRATOR,
        'RFP Orchestrator'
      )

      expect(config.type).toBe(AgentType.ORCHESTRATOR)
      expect(config.name).toBe('RFP Orchestrator')
      expect(config.model).toBe('gpt-5')
      expect(config.reasoning?.effort).toBe('medium')
      expect(config.text?.verbosity).toBe('medium')
      expect(config.maxOutputTokens).toBe(4096)
    })

    it('should create complete config for ClientDataAgent', () => {
      const config = createGPT5AgentConfig(
        AgentType.CLIENT_DATA,
        'Client Data Manager'
      )

      expect(config.type).toBe(AgentType.CLIENT_DATA)
      expect(config.name).toBe('Client Data Manager')
      expect(config.model).toBe('gpt-5-mini')
    })

    it('should merge additional config options', () => {
      const config = createGPT5AgentConfig(
        AgentType.ORCHESTRATOR,
        'Test Agent',
        {
          systemPrompt: 'Custom prompt',
          metadata: { test: true },
        }
      )

      expect(config.systemPrompt).toBe('Custom prompt')
      expect(config.metadata).toEqual({ test: true })
    })

    it('should allow overriding GPT-5 defaults with additional config', () => {
      const config = createGPT5AgentConfig(
        AgentType.CLIENT_DATA,
        'Custom Agent',
        {
          model: 'gpt-5',
          reasoning: { effort: 'high' },
        }
      )

      expect(config.model).toBe('gpt-5')
      expect(config.reasoning?.effort).toBe('high')
    })
  })

  describe('getAllGPT5Configs', () => {
    it('should return all agent configurations', () => {
      const configs = getAllGPT5Configs()

      expect(Object.keys(configs)).toHaveLength(6)
      expect(configs[AgentType.ORCHESTRATOR]).toBeDefined()
      expect(configs[AgentType.CLIENT_DATA]).toBeDefined()
      expect(configs[AgentType.FLIGHT_SEARCH]).toBeDefined()
      expect(configs[AgentType.PROPOSAL_ANALYSIS]).toBeDefined()
      expect(configs[AgentType.COMMUNICATION]).toBeDefined()
      expect(configs[AgentType.ERROR_MONITOR]).toBeDefined()
    })

    it('should include description for each config', () => {
      const configs = getAllGPT5Configs()

      Object.values(configs).forEach((config) => {
        expect(config.description).toBeDefined()
        expect(config.description.length).toBeGreaterThan(0)
      })
    })

    it('should include all required fields for each config', () => {
      const configs = getAllGPT5Configs()

      Object.values(configs).forEach((config) => {
        expect(config.model).toBeDefined()
        expect(config.reasoning?.effort).toBeDefined()
        expect(config.text?.verbosity).toBeDefined()
        expect(config.maxOutputTokens).toBeDefined()
      })
    })
  })

  describe('isGPT5Model', () => {
    it('should return true for gpt-5 models', () => {
      expect(isGPT5Model('gpt-5')).toBe(true)
      expect(isGPT5Model('gpt-5-mini')).toBe(true)
      expect(isGPT5Model('gpt-5-turbo')).toBe(true)
      expect(isGPT5Model('gpt-5-nano')).toBe(true)
    })

    it('should return false for non-GPT-5 models', () => {
      expect(isGPT5Model('gpt-4')).toBe(false)
      expect(isGPT5Model('gpt-4-turbo-preview')).toBe(false)
      expect(isGPT5Model('gpt-3.5-turbo')).toBe(false)
      expect(isGPT5Model('claude-3')).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(isGPT5Model('')).toBe(false)
      expect(isGPT5Model('gpt5')).toBe(false) // No hyphen
      expect(isGPT5Model('GPT-5')).toBe(false) // Case sensitive
    })
  })

  describe('validateGPT5Config', () => {
    it('should validate correct GPT-5 config', () => {
      const config = createGPT5AgentConfig(
        AgentType.ORCHESTRATOR,
        'Test Agent'
      )

      const result = validateGPT5Config(config)

      expect(result.valid).toBe(true)
      expect(result.warnings).toHaveLength(0)
    })

    it('should warn about deprecated temperature parameter', () => {
      const config = createGPT5AgentConfig(
        AgentType.ORCHESTRATOR,
        'Test Agent',
        {
          temperature: 0.7,
        }
      )

      const result = validateGPT5Config(config)

      expect(result.valid).toBe(false)
      expect(result.warnings).toContain(
        'GPT-5 does not support temperature. Use reasoning.effort instead.'
      )
    })

    it('should warn about deprecated maxTokens parameter', () => {
      const config = createGPT5AgentConfig(
        AgentType.ORCHESTRATOR,
        'Test Agent',
        {
          maxTokens: 4096,
        }
      )

      const result = validateGPT5Config(config)

      expect(result.valid).toBe(false)
      expect(result.warnings).toContain(
        'GPT-5 uses maxOutputTokens instead of maxTokens.'
      )
    })

    it('should warn about missing reasoning.effort', () => {
      const config = {
        type: AgentType.ORCHESTRATOR,
        name: 'Test Agent',
        model: 'gpt-5',
        text: { verbosity: 'medium' as const },
        maxOutputTokens: 4096,
      }

      const result = validateGPT5Config(config)

      expect(result.valid).toBe(false)
      expect(result.warnings).toContain(
        'GPT-5 configuration missing reasoning.effort (recommended: medium)'
      )
    })

    it('should warn about missing text.verbosity', () => {
      const config = {
        type: AgentType.ORCHESTRATOR,
        name: 'Test Agent',
        model: 'gpt-5',
        reasoning: { effort: 'medium' as const },
        maxOutputTokens: 4096,
      }

      const result = validateGPT5Config(config)

      expect(result.valid).toBe(false)
      expect(result.warnings).toContain(
        'GPT-5 configuration missing text.verbosity (recommended: medium)'
      )
    })

    it('should not validate non-GPT-5 models', () => {
      const config = {
        type: AgentType.ORCHESTRATOR,
        name: 'Test Agent',
        model: 'gpt-4-turbo-preview',
        temperature: 0.7,
        maxTokens: 4096,
      }

      const result = validateGPT5Config(config)

      expect(result.valid).toBe(true)
      expect(result.warnings).toHaveLength(0)
    })

    it('should accumulate multiple warnings', () => {
      const config = {
        type: AgentType.ORCHESTRATOR,
        name: 'Test Agent',
        model: 'gpt-5',
        temperature: 0.7,
        maxTokens: 4096,
      }

      const result = validateGPT5Config(config)

      expect(result.valid).toBe(false)
      expect(result.warnings.length).toBeGreaterThan(1)
    })
  })

  describe('Configuration Consistency', () => {
    it('should use gpt-5-mini for lightweight agents', () => {
      const clientDataConfig = getGPT5Config(AgentType.CLIENT_DATA)
      const errorMonitorConfig = getGPT5Config(AgentType.ERROR_MONITOR)

      expect(clientDataConfig.model).toBe('gpt-5-mini')
      expect(errorMonitorConfig.model).toBe('gpt-5-mini')
    })

    it('should use gpt-5 for complex reasoning agents', () => {
      const orchestratorConfig = getGPT5Config(AgentType.ORCHESTRATOR)
      const proposalConfig = getGPT5Config(AgentType.PROPOSAL_ANALYSIS)

      expect(orchestratorConfig.model).toBe('gpt-5')
      expect(proposalConfig.model).toBe('gpt-5')
    })

    it('should use minimal effort for simple tasks', () => {
      const clientDataConfig = getGPT5Config(AgentType.CLIENT_DATA)
      const errorMonitorConfig = getGPT5Config(AgentType.ERROR_MONITOR)

      expect(clientDataConfig.reasoning?.effort).toBe('minimal')
      expect(errorMonitorConfig.reasoning?.effort).toBe('minimal')
    })

    it('should use high verbosity for communication agent', () => {
      const communicationConfig = getGPT5Config(AgentType.COMMUNICATION)

      expect(communicationConfig.text?.verbosity).toBe('high')
      expect(communicationConfig.maxOutputTokens).toBe(8192)
    })

    it('should use medium reasoning for analysis tasks', () => {
      const orchestratorConfig = getGPT5Config(AgentType.ORCHESTRATOR)
      const proposalConfig = getGPT5Config(AgentType.PROPOSAL_ANALYSIS)

      expect(orchestratorConfig.reasoning?.effort).toBe('medium')
      expect(proposalConfig.reasoning?.effort).toBe('medium')
    })
  })
})
