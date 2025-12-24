/**
 * Base Agent Class
 * Foundation for all AI agents in the system
 */

import OpenAI from 'openai'
import { v4 as uuidv4 } from 'uuid'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { MCPServerManager } from '@/lib/services/mcp-server-manager'
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
  protected mcpClients: Map<string, Client> = new Map() // MCP server clients
  protected mcpServerManager: MCPServerManager
  protected _status: AgentStatus = AgentStatus.IDLE
  protected metrics: AgentMetrics

  constructor(config: AgentConfig) {
    this.id = uuidv4()
    this.type = config.type
    this.name = config.name
    this.config = config

    // Initialize OpenAI client with environment variable (will be updated by initialize method)
    // Note: BaseAgent will use database configuration when initialized
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    })

    // Initialize MCP server manager
    this.mcpServerManager = MCPServerManager.getInstance()

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
   * Loads LLM configuration from database if available
   */
  async initialize(): Promise<void> {
    console.log(`[${this.name}] Initializing agent...`)
    
    // Load LLM configuration from database (admin-configured) with fallback to env vars
    try {
      const { getOpenAIClient } = await import('@/lib/config/llm-config')
      this.openai = await getOpenAIClient()
      console.log(`[${this.name}] Using database-configured LLM settings`)
    } catch (error) {
      console.warn(`[${this.name}] Failed to load database LLM config, using environment variables:`, error)
      // Fallback to environment variable (already set in constructor)
      if (!this.openai.apiKey) {
        throw new Error('No OpenAI API key available from database or environment variables')
      }
    }
    
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
   * Get all registered tools (both agent tools and MCP tools)
   * 
   * @param criticalServers - Optional list of server names that must succeed. If any critical server fails, an error will be thrown.
   * @returns Object containing tools array and failedServers array with server names and errors
   * @throws Error if any critical server fails to load tools
   */
  protected async getToolDefinitions(
    criticalServers?: string[]
  ): Promise<{
    tools: OpenAI.Chat.ChatCompletionTool[]
    failedServers: Array<{ serverName: string; error: Error }>
  }> {
    const agentTools = Array.from(this.tools.values()).map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }))

    // Add MCP tools from connected servers
    const mcpTools: OpenAI.Chat.ChatCompletionTool[] = []
    const failedServers: Array<{ serverName: string; error: Error }> = []
    
    for (const [serverName, client] of this.mcpClients.entries()) {
      try {
        const toolsResponse = await client.listTools()
        const tools = (toolsResponse.tools || []).map((tool) => ({
          type: 'function' as const,
          function: {
            name: tool.name,
            description: tool.description || '',
            parameters: (tool.inputSchema as any) || { type: 'object', properties: {} },
          },
        }))
        mcpTools.push(...tools)
        console.log(`[${this.name}] Loaded ${tools.length} tools from MCP server: ${serverName}`)
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error))
        failedServers.push({ serverName, error: errorObj })
        console.error(`[${this.name}] Failed to load tools from MCP server ${serverName}:`, error)
      }
    }

    // Log warning if any servers failed (concise warning referencing failedServers)
    if (failedServers.length > 0) {
      const failedServerNames = failedServers.map(fs => fs.serverName).join(', ')
      console.warn(
        `[${this.name}] ${failedServers.length} MCP server(s) failed to load tools: ${failedServerNames}. ` +
        `Check failedServers array for details.`
      )
    }

    // Throw error if any critical server failed
    if (criticalServers && criticalServers.length > 0) {
      const criticalFailures = failedServers.filter(fs => criticalServers.includes(fs.serverName))
      if (criticalFailures.length > 0) {
        const criticalServerNames = criticalFailures.map(fs => fs.serverName).join(', ')
        const errorMessages = criticalFailures.map(fs => `${fs.serverName}: ${fs.error.message}`).join('; ')
        throw new Error(
          `Critical MCP server(s) failed to load tools: ${criticalServerNames}. Errors: ${errorMessages}`
        )
      }
    }

    return {
      tools: [...agentTools, ...mcpTools],
      failedServers,
    }
  }

  /**
   * Connect to an MCP server and register its tools
   * 
   * @param serverName - Name of the MCP server
   * @param command - Command to run the server (e.g., 'node')
   * @param args - Arguments for the server command
   * @param config - Optional server configuration
   */
  protected async connectMCPServer(
    serverName: string,
    command: string,
    args: string[],
    config?: { spawnTimeout?: number }
  ): Promise<void> {
    try {
      // Check if already connected
      if (this.mcpClients.has(serverName)) {
        console.log(`[${this.name}] Already connected to MCP server: ${serverName}`)
        return
      }

      // Check server state
      const serverState = this.mcpServerManager.getServerState(serverName)

      if (serverState === 'stopped' || serverState === 'failed' || serverState === 'crashed') {
        // Spawn server if not running
        await this.mcpServerManager.spawnServer(
          serverName,
          command,
          args,
          { spawnTimeout: config?.spawnTimeout || 10000 }
        )
      }

      // Get MCP client
      const client = await this.mcpServerManager.getClient(serverName)
      this.mcpClients.set(serverName, client)

      console.log(`[${this.name}] Connected to MCP server: ${serverName}`)
    } catch (error) {
      console.error(`[${this.name}] Failed to connect to MCP server ${serverName}:`, error)
      throw error
    }
  }

  /**
   * Call an MCP tool via the connected client
   * 
   * @param serverName - Name of the MCP server
   * @param toolName - Name of the tool to call
   * @param params - Tool parameters
   * @returns Tool execution result
   */
  protected async callMCPTool(
    serverName: string,
    toolName: string,
    params: Record<string, unknown>
  ): Promise<unknown> {
    const client = this.mcpClients.get(serverName)
    if (!client) {
      throw new Error(`Not connected to MCP server: ${serverName}`)
    }

    try {
      this.metrics.toolCallsCount++
      console.log(`[${this.name}] Calling MCP tool: ${serverName}.${toolName}`)

      const result = await client.callTool({
        name: toolName,
        arguments: params as any,
      })

      // Parse result from MCP response
      if (result.content && Array.isArray(result.content) && result.content.length > 0) {
        const content = result.content[0]
        if (content.type === 'text' && 'text' in content) {
          try {
            return JSON.parse(content.text)
          } catch {
            return content.text
          }
        }
      }

      return result
    } catch (error) {
      console.error(`[${this.name}] MCP tool call failed: ${serverName}.${toolName}`, error)
      throw error
    }
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
        // Get tool definitions (includes MCP tools)
        const { tools } = await this.getToolDefinitions()
        
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
        }

        // Add tools if available
        if (tools && tools.length > 0) {
          requestParams.tools = tools
        }

        // Chain of thought: pass previous response ID if available
        if (context?.metadata?.previousResponseId) {
          requestParams.previous_response_id = context.metadata.previousResponseId
        }

        response = await (this.openai as any).responses.create(requestParams)
      } else {
        // Fallback to Chat Completions for non-GPT-5 models
        // Get tool definitions (includes MCP tools)
        const { tools } = await this.getToolDefinitions()
        
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

        // Handle tool calls from LLM
        const completion = await this.openai.chat.completions.create({
          model: this.config.model || 'gpt-4-turbo-preview',
          messages: messages.map((msg) => ({
            role: msg.role as 'system' | 'user' | 'assistant',
            content: msg.content,
          })),
          tools: tools.length > 0 ? tools : undefined,
          temperature: this.config.temperature ?? 0.7,
          max_tokens: this.config.maxTokens ?? 4096,
        })

        // Process tool calls if any
        const message = completion.choices[0]?.message
        if (message?.tool_calls && message.tool_calls.length > 0) {
          const toolResults: AgentMessage[] = []
          
          for (const toolCall of message.tool_calls) {
            if (toolCall.type === 'function') {
              try {
                // Check if it's an agent tool or MCP tool
                const isAgentTool = this.tools.has(toolCall.function.name)
                let result: unknown

                if (isAgentTool) {
                  // Execute agent tool
                  result = await this.executeTool(
                    toolCall.function.name,
                    JSON.parse(toolCall.function.arguments || '{}')
                  )
                } else {
                  // Try to find which MCP server has this tool
                  let found = false
                  for (const [serverName] of this.mcpClients.entries()) {
                    try {
                      const client = this.mcpClients.get(serverName)!
                      const toolsResponse = await client.listTools()
                      const toolExists = toolsResponse.tools?.some(t => t.name === toolCall.function.name)
                      
                      if (toolExists) {
                        result = await this.callMCPTool(
                          serverName,
                          toolCall.function.name,
                          JSON.parse(toolCall.function.arguments || '{}')
                        )
                        found = true
                        break
                      }
                    } catch {
                      // Continue to next server
                    }
                  }

                  if (!found) {
                    throw new Error(`Tool not found: ${toolCall.function.name}`)
                  }
                }

                // Add tool result to messages
                toolResults.push({
                  role: 'tool',
                  content: JSON.stringify(result),
                  toolCallId: toolCall.id,
                  timestamp: new Date(),
                })
              } catch (error) {
                // Add error result
                toolResults.push({
                  role: 'tool',
                  content: JSON.stringify({ error: (error as Error).message }),
                  toolCallId: toolCall.id,
                  timestamp: new Date(),
                })
              }
            }
          }

          // Make another call with tool results
          const finalMessages = [
            ...messages,
            {
              role: 'assistant' as const,
              content: message.content || null,
              toolCalls: message.tool_calls,
              timestamp: new Date(),
            },
            ...toolResults.map(tr => ({
              role: tr.role as 'tool',
              content: tr.content,
              tool_call_id: tr.toolCallId!,
            })),
          ]

          response = await this.openai.chat.completions.create({
            model: this.config.model || 'gpt-4-turbo-preview',
            messages: finalMessages as any,
            tools: tools && tools.length > 0 ? tools : undefined,
            temperature: this.config.temperature ?? 0.7,
            max_tokens: this.config.maxTokens ?? 4096,
          })
        } else {
          response = completion
        }
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
      // Get tool definitions (includes MCP tools)
      const { tools } = await this.getToolDefinitions()
      
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
        tools: tools && tools.length > 0 ? tools : undefined,
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
