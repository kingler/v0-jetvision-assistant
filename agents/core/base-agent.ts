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
   * Create a response with GPT-5 Responses API (Recommended)
   *
   * Use this method for all GPT-5 model interactions.
   * Automatically falls back to Chat Completions for non-GPT-5 models.
   *
   * @param input - The input prompt or query
   * @param context - Optional agent context with metadata
   * @returns Response from GPT-5 or Chat Completions API
   */
  protected async createResponse(
    input: string,
    context?: AgentContext
  ): Promise<any> {
    this._status = AgentStatus.RUNNING
    const startTime = Date.now()

    try {
      const model = this.config.model || 'gpt-5'
      const isGPT5 = model.startsWith('gpt-5')

      let response: any

      if (isGPT5) {
        // Use Responses API for GPT-5 models
        const requestParams: any = {
          model,
          input,
          reasoning: {
            effort: this.config.reasoning?.effort || 'medium',
          },
          text: {
            verbosity: this.config.text?.verbosity || 'medium',
          },
          max_output_tokens: this.config.maxOutputTokens || 4096,
          tools: this.getToolDefinitions().length > 0
            ? this.getToolDefinitions()
            : undefined,
        }

        // Chain of thought: pass previous response ID if available
        if (context?.metadata?.previousResponseId) {
          requestParams.previous_response_id = context.metadata.previousResponseId
        }

        response = await (this.openai as any).responses.create(requestParams)
      } else {
        // Fallback to Chat Completions for non-GPT-5 models
        // Pass trackMetrics=false to prevent double counting
        const messages: AgentMessage[] = [
          {
            role: 'system',
            content: this.getSystemPrompt(),
            timestamp: new Date(),
          },
          {
            role: 'user',
            content: input,
            timestamp: new Date(),
          },
        ]
        response = await this.createChatCompletionLegacy(messages, context, false)
      }

      // Update metrics (centralized for all paths)
      this.recordExecutionMetrics(response, startTime, true)

      return response
    } catch (error) {
      this.metrics.failedExecutions++
      this._status = AgentStatus.ERROR
      throw error
    }
  }

  /**
   * Create a chat completion with OpenAI (Legacy)
   *
   * @deprecated Use createResponse() for GPT-5 models
   * This method is kept for backward compatibility with GPT-4 and earlier models.
   * @param messages - Array of chat messages
   * @param context - Optional agent context
   * @param trackMetrics - Whether to update metrics (default: true). Set to false when called from createResponse to prevent double counting.
   */
  protected async createChatCompletionLegacy(
    messages: AgentMessage[],
    context?: AgentContext,
    trackMetrics: boolean = true
  ): Promise<OpenAI.Chat.ChatCompletion> {
    this._status = AgentStatus.RUNNING

    const startTime = Date.now()

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model || 'gpt-4-turbo-preview',
        messages: messages.map((msg) => {
          const baseMessage: OpenAI.Chat.ChatCompletionMessageParam = {
            role: msg.role,
            content: msg.content,
          } as OpenAI.Chat.ChatCompletionMessageParam;

          if (msg.role === 'tool' && msg.toolCallId) {
            return {
              role: 'tool',
              content: msg.content,
              tool_call_id: msg.toolCallId,
            } as OpenAI.Chat.ChatCompletionToolMessageParam;
          }

          if (msg.name) {
            return {
              ...baseMessage,
              name: msg.name,
            } as OpenAI.Chat.ChatCompletionMessageParam;
          }

          return baseMessage;
        }),
        tools: this.getToolDefinitions(),
        temperature: this.config.temperature ?? 0.7,
        max_tokens: this.config.maxTokens ?? 4096,
      })

      // Update metrics only if tracking is enabled
      if (trackMetrics) {
        this.recordExecutionMetrics(response, startTime, true)
      }

      return response
    } catch (error) {
      if (trackMetrics) {
        this.metrics.failedExecutions++
      }
      this._status = AgentStatus.ERROR
      throw error
    }
  }

  /**
   * Create a chat completion with OpenAI
   * @deprecated Use createResponse() for GPT-5 or createChatCompletionLegacy() for older models
   */
  protected async createChatCompletion(
    messages: AgentMessage[],
    context?: AgentContext
  ): Promise<OpenAI.Chat.ChatCompletion> {
    return this.createChatCompletionLegacy(messages, context, true)
  }

  /**
   * Record execution metrics after a successful API call
   * Centralized metrics updating to prevent double counting
   * @param response - The API response containing usage information
   * @param startTime - The start time of the execution
   * @param success - Whether the execution was successful
   */
  private recordExecutionMetrics(response: any, startTime: number, success: boolean): void {
    const executionTime = Date.now() - startTime
    this.metrics.totalExecutions++
    
    if (success) {
      this.metrics.successfulExecutions++
      this._status = AgentStatus.COMPLETED
    }
    
    // Update average execution time
    this.metrics.averageExecutionTime =
      (this.metrics.averageExecutionTime * (this.metrics.totalExecutions - 1) +
        executionTime) /
      this.metrics.totalExecutions

    // Update token usage if available
    if (response.usage) {
      this.metrics.totalTokensUsed += response.usage.total_tokens
    }

    this.metrics.lastExecutionAt = new Date()
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
