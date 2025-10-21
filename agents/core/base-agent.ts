/**
 * Base Agent Class
 * Foundation for all AI agents in the system
 */

import OpenAI from 'openai'
import { v4 as uuidv4 } from 'uuid'
import {
  type IAgent,
  type AgentConfig,
  type AgentContext,
  type AgentResult,
  type AgentTool,
  type AgentTask,
  type AgentMetrics,
  AgentType,
  AgentStatus,
  type AgentMessage,
} from './types'

/**
 * Base Agent Abstract Class
 * All specific agents extend this class
 */
export abstract class BaseAgent implements IAgent {
  public readonly id: string
  public readonly type: AgentType
  public readonly name: string

  protected openai: OpenAI
  protected config: AgentConfig
  protected tools: Map<string, AgentTool> = new Map()
  protected _status: AgentStatus = AgentStatus.IDLE
  protected metrics: AgentMetrics

  constructor(config: AgentConfig) {
    this.id = uuidv4()
    this.type = config.type
    this.name = config.name
    this.config = config

    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    // Initialize metrics
    this.metrics = {
      agentId: this.id,
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      totalTokensUsed: 0,
      toolCallsCount: 0,
    }

    // Register initial tools if provided
    if (config.tools) {
      config.tools.forEach((tool) => this.registerTool(tool))
    }
  }

  /**
   * Get current agent status
   */
  get status(): AgentStatus {
    return this._status
  }

  /**
   * Initialize the agent
   * Override in subclasses for custom initialization
   */
  async initialize(): Promise<void> {
    console.log(`[${this.name}] Initializing agent...`)
    this._status = AgentStatus.IDLE
  }

  /**
   * Execute the agent's main task
   * Must be implemented by subclasses
   */
  abstract execute(context: AgentContext): Promise<AgentResult>

  /**
   * Register a tool with the agent
   */
  registerTool(tool: AgentTool): void {
    this.tools.set(tool.name, tool)
    console.log(`[${this.name}] Registered tool: ${tool.name}`)
  }

  /**
   * Get all registered tools
   */
  protected getToolDefinitions(): OpenAI.Chat.ChatCompletionTool[] {
    return Array.from(this.tools.values()).map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }))
  }

  /**
   * Execute a tool by name
   */
  protected async executeTool(
    toolName: string,
    parameters: Record<string, unknown>
  ): Promise<unknown> {
    const tool = this.tools.get(toolName)
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`)
    }

    console.log(`[${this.name}] Executing tool: ${toolName}`)
    this.metrics.toolCallsCount++

    try {
      return await tool.handler(parameters)
    } catch (error) {
      console.error(`[${this.name}] Tool execution failed:`, error)
      throw error
    }
  }

  /**
   * Create a chat completion with OpenAI
   */
  protected async createChatCompletion(
    messages: AgentMessage[],
    context?: AgentContext
  ): Promise<OpenAI.Chat.ChatCompletion> {
    this._status = AgentStatus.RUNNING

    const startTime = Date.now()

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model || 'gpt-4-turbo-preview',
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
          ...(msg.name && { name: msg.name }),
          ...(msg.toolCallId && { tool_call_id: msg.toolCallId }),
        })),
        tools: this.getToolDefinitions(),
        temperature: this.config.temperature ?? 0.7,
        max_tokens: this.config.maxTokens ?? 4096,
      })

      // Update metrics
      const executionTime = Date.now() - startTime
      this.metrics.totalExecutions++
      this.metrics.successfulExecutions++
      this.metrics.averageExecutionTime =
        (this.metrics.averageExecutionTime * (this.metrics.totalExecutions - 1) +
          executionTime) /
        this.metrics.totalExecutions

      if (response.usage) {
        this.metrics.totalTokensUsed += response.usage.total_tokens
      }

      this.metrics.lastExecutionAt = new Date()
      this._status = AgentStatus.COMPLETED

      return response
    } catch (error) {
      this.metrics.failedExecutions++
      this._status = AgentStatus.ERROR
      throw error
    }
  }

  /**
   * Hand off task to another agent
   * Delegates to the coordination layer
   */
  async handoff(toAgent: string, task: AgentTask): Promise<void> {
    console.log(`[${this.name}] Handing off task ${task.id} to ${toAgent}`)

    // This will be implemented by the coordination layer
    // For now, just log the handoff
    task.sourceAgent = this.id
    task.targetAgent = toAgent
    task.status = 'pending'
  }

  /**
   * Get agent metrics
   */
  getMetrics(): AgentMetrics {
    return { ...this.metrics }
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    console.log(`[${this.name}] Shutting down...`)
    this._status = AgentStatus.IDLE
    this.tools.clear()
  }

  /**
   * Get system prompt for the agent
   * Override in subclasses for custom prompts
   */
  protected getSystemPrompt(): string {
    return (
      this.config.systemPrompt ||
      `You are ${this.name}, a specialized AI agent for the JetVision system.`
    )
  }
}
