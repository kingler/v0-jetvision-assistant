/**
 * Core Agent Types
 * TypeScript type definitions for the Multi-Agent System
 */

import { OpenAI } from 'openai'

/**
 * Agent Type Enum
 */
export enum AgentType {
  ORCHESTRATOR = 'orchestrator',
  CLIENT_DATA = 'client_data',
  FLIGHT_SEARCH = 'flight_search',
  PROPOSAL_ANALYSIS = 'proposal_analysis',
  COMMUNICATION = 'communication',
  ERROR_MONITOR = 'error_monitor',
}

/**
 * Agent Status
 */
export enum AgentStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  WAITING = 'waiting',
  COMPLETED = 'completed',
  ERROR = 'error',
}

/**
 * Agent Configuration
 */
export interface AgentConfig {
  type: AgentType
  name: string
  model?: string
  temperature?: number
  maxTokens?: number
  tools?: AgentTool[]
  systemPrompt?: string
  metadata?: Record<string, unknown>
}

/**
 * Agent Tool Definition
 */
export interface AgentTool {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
  handler: (params: Record<string, unknown>) => Promise<unknown>
}

/**
 * Agent Execution Context
 */
export interface AgentContext {
  requestId?: string
  userId?: string
  sessionId?: string
  metadata?: Record<string, unknown>
  history?: AgentMessage[]
}

/**
 * Agent Message
 */
export interface AgentMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  name?: string
  toolCallId?: string
  timestamp: Date
  metadata?: Record<string, unknown>
}

/**
 * Agent Execution Result
 */
export interface AgentResult<T = unknown> {
  success: boolean
  data?: T
  error?: Error
  metadata?: {
    executionTime: number
    tokenUsage?: {
      prompt: number
      completion: number
      total: number
    }
    toolCalls?: number
  }
}

/**
 * Agent Task
 */
export interface AgentTask {
  id: string
  type: string
  payload: Record<string, unknown>
  priority: 'low' | 'normal' | 'high' | 'urgent'
  sourceAgent?: string
  targetAgent?: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  createdAt: Date
  completedAt?: Date
  result?: unknown
  error?: Error
}

/**
 * Agent Handoff
 */
export interface AgentHandoff {
  fromAgent: string
  toAgent: string
  task: AgentTask
  context: AgentContext
  reason: string
}

/**
 * Agent Metrics
 */
export interface AgentMetrics {
  agentId: string
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  averageExecutionTime: number
  totalTokensUsed: number
  toolCallsCount: number
  lastExecutionAt?: Date
}

/**
 * Base Agent Interface
 */
export interface IAgent {
  readonly id: string
  readonly type: AgentType
  readonly name: string
  readonly status: AgentStatus

  /**
   * Initialize the agent
   */
  initialize(): Promise<void>

  /**
   * Execute the agent's main task
   */
  execute(context: AgentContext): Promise<AgentResult>

  /**
   * Register a tool with the agent
   */
  registerTool(tool: AgentTool): void

  /**
   * Hand off task to another agent
   */
  handoff(toAgent: string, task: AgentTask): Promise<void>

  /**
   * Get agent metrics
   */
  getMetrics(): AgentMetrics

  /**
   * Cleanup and shutdown
   */
  shutdown(): Promise<void>
}

/**
 * Agent Factory Interface
 */
export interface IAgentFactory {
  createAgent(config: AgentConfig): IAgent
  getAgent(id: string): IAgent | undefined
  getAllAgents(): IAgent[]
}

/**
 * Agent Registry Interface
 */
export interface IAgentRegistry {
  register(agent: IAgent): void
  unregister(agentId: string): void
  getAgent(agentId: string): IAgent | undefined
  getAgentsByType(type: AgentType): IAgent[]
  getAllAgents(): IAgent[]
}
