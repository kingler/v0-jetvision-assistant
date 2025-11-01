/**
 * Streaming Chat Response API Route
 * Uses OpenAI Responses API with Server-Sent Events (SSE) for real-time streaming
 * Supports MCP servers via stdio transport (ONEK-79)
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { auth } from '@clerk/nextjs/server';
import { MCPServerManager } from '@/lib/services/mcp-server-manager';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

// Force dynamic rendering - API routes should not be statically generated
export const dynamic = 'force-dynamic';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORGANIZATION_ID,
});

// Get MCPServerManager singleton
const mcpManager = MCPServerManager.getInstance();

// MCP server configuration from environment
const MCP_SERVER_CONFIG = {
  name: 'avinode-mcp',
  command: process.env.MCP_AVINODE_COMMAND || 'node',
  args: (process.env.MCP_AVINODE_ARGS || 'mcp-servers/avinode-mcp-server/dist/mcp-servers/avinode-mcp-server/src/index.js').split(','),
  timeout: parseInt(process.env.MCP_SERVER_TIMEOUT || '10000', 10),
};

/**
 * Request body schema
 */
interface ChatRespondRequest {
  sessionId: string;
  messageId: string;
  content: string;
  intent?: string;
  context?: {
    previousMessages?: Array<{ role: string; content: string }>;
    rfpId?: string;
    workflowId?: string;
  };
}

/**
 * SSE message types
 */
type SSEMessageType =
  | 'token'
  | 'tool_call_start'
  | 'tool_call_progress'
  | 'tool_call_complete'
  | 'workflow_update'
  | 'complete'
  | 'error';

interface SSEMessage {
  type: SSEMessageType;
  data: unknown;
}

/**
 * POST /api/chat/respond
 * Streams AI response using OpenAI Responses API
 */
export async function POST(req: NextRequest) {
  try {
    // Authentication check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body: ChatRespondRequest = await req.json();
    const { sessionId, messageId, content, intent, context } = body;

    // Validate required fields
    if (!sessionId || !messageId || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, messageId, content' },
        { status: 400 }
      );
    }

    // Create ReadableStream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        /**
         * Send SSE message to client
         */
        const sendSSE = (message: SSEMessage) => {
          const data = `data: ${JSON.stringify(message)}\n\n`;
          controller.enqueue(encoder.encode(data));
        };

        /**
         * Send error and close stream
         */
        const sendError = (error: string) => {
          sendSSE({ type: 'error', data: { error } });
          controller.close();
        };

        try {
          // Build message history for context
          const messages = [
            {
              role: 'system' as const,
              content: buildSystemPrompt(intent),
            },
            ...(context?.previousMessages || []).map((msg) => ({
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
            })),
            {
              role: 'user' as const,
              content,
            },
          ];

          // Initialize MCP server connection and fetch tool definitions
          const tools = await initializeMCPAndGetTools();

          // Create streaming response using Responses API
          const response = await openai.chat.completions.create({
            model: 'gpt-4o', // Use gpt-4o for now (Responses API uses different endpoint)
            messages,
            tools: tools.length > 0 ? tools : undefined,
            stream: true,
            max_tokens: 4096,
            temperature: 0.7,
          });

          let currentToolCall: {
            id: string;
            name: string;
            arguments: string;
          } | null = null;

          // Stream response chunks
          for await (const chunk of response) {
            const delta = chunk.choices[0]?.delta;

            // Handle text tokens
            if (delta?.content) {
              sendSSE({
                type: 'token',
                data: { token: delta.content },
              });
            }

            // Handle tool calls
            if (delta?.tool_calls) {
              for (const toolCall of delta.tool_calls) {
                if (toolCall.function?.name && !currentToolCall) {
                  // Tool call started
                  currentToolCall = {
                    id: toolCall.id || '',
                    name: toolCall.function.name,
                    arguments: toolCall.function.arguments || '',
                  };

                  sendSSE({
                    type: 'tool_call_start',
                    data: {
                      toolCallId: currentToolCall.id,
                      toolName: currentToolCall.name,
                    },
                  });
                } else if (toolCall.function?.arguments && currentToolCall) {
                  // Accumulate arguments
                  currentToolCall.arguments += toolCall.function.arguments;

                  sendSSE({
                    type: 'tool_call_progress',
                    data: {
                      toolCallId: currentToolCall.id,
                      toolName: currentToolCall.name,
                    },
                  });
                }
              }
            }

            // Handle tool call completion
            if (chunk.choices[0]?.finish_reason === 'tool_calls' && currentToolCall) {
              sendSSE({
                type: 'tool_call_complete',
                data: {
                  toolCallId: currentToolCall.id,
                  toolName: currentToolCall.name,
                  arguments: JSON.parse(currentToolCall.arguments),
                },
              });

              currentToolCall = null;
            }

            // Handle completion
            if (chunk.choices[0]?.finish_reason === 'stop') {
              sendSSE({
                type: 'complete',
                data: {
                  messageId,
                  sessionId,
                  finishReason: 'stop',
                },
              });
            }
          }

          controller.close();
        } catch (error) {
          console.error('[ChatRespond] Streaming error:', error);
          sendError(error instanceof Error ? error.message : 'Unknown error');
        }
      },

      cancel() {
        // Handle client disconnect
        console.log('[ChatRespond] Stream cancelled by client');
      },
    });

    // Return SSE response
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    });
  } catch (error) {
    console.error('[ChatRespond] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Build system prompt based on intent
 */
function buildSystemPrompt(intent?: string): string {
  const basePrompt = `You are Jetvision AI Assistant, a helpful agent for booking private jet flights.

Your capabilities:
- Create and manage RFPs (Request for Proposals)
- Search for available flights and aircraft
- Analyze and compare quotes from operators
- Provide recommendations based on client preferences
- Answer questions about flight bookings

Always be professional, concise, and helpful. When creating RFPs, extract all relevant details from the user's message.`;

  const intentPrompts: Record<string, string> = {
    create_rfp: `\n\nCurrent task: Create a new RFP. Extract flight details including departure/arrival airports, dates, passenger count, and any special requirements.`,
    get_rfp_status: `\n\nCurrent task: Provide status update on an existing RFP. Include workflow stage, progress, and estimated time remaining.`,
    search_flights: `\n\nCurrent task: Search for available flights. Use flight search tools to find options matching the user's criteria.`,
    get_quotes: `\n\nCurrent task: Analyze and compare quotes. Rank options by AI score and highlight the recommended choice.`,
  };

  return basePrompt + (intent && intentPrompts[intent] ? intentPrompts[intent] : '');
}

/**
 * Initialize MCP server connection and fetch tool definitions
 * Uses lazy initialization - spawns server on first request
 * ONEK-79: stdio Transport Connection
 */
async function initializeMCPAndGetTools(): Promise<Array<OpenAI.Chat.Completions.ChatCompletionTool>> {
  try {
    console.log('[ChatRespond] Initializing MCP server connection...');

    // Check if server is already running
    const serverState = mcpManager.getServerState(MCP_SERVER_CONFIG.name);

    if (serverState === 'stopped' || serverState === 'failed' || serverState === 'crashed') {
      console.log(`[ChatRespond] Spawning MCP server: ${MCP_SERVER_CONFIG.name}`);

      // Spawn server with timeout from config
      await mcpManager.spawnServer(
        MCP_SERVER_CONFIG.name,
        MCP_SERVER_CONFIG.command,
        MCP_SERVER_CONFIG.args,
        { spawnTimeout: MCP_SERVER_CONFIG.timeout }
      );

      console.log(`[ChatRespond] MCP server spawned successfully`);
    } else {
      console.log(`[ChatRespond] Reusing existing MCP server (state: ${serverState})`);
    }

    // Get MCP client
    const mcpClient: Client = await mcpManager.getClient(MCP_SERVER_CONFIG.name);

    // List available tools from MCP server
    const toolsResponse = await mcpClient.listTools();
    console.log(`[ChatRespond] Fetched ${toolsResponse.tools?.length || 0} tools from MCP server`);

    // Convert MCP tools to OpenAI function tools format
    const tools: Array<OpenAI.Chat.Completions.ChatCompletionTool> = (toolsResponse.tools || []).map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description || '',
        parameters: tool.inputSchema || { type: 'object', properties: {} },
      },
    }));

    return tools;
  } catch (error) {
    console.error('[ChatRespond] Failed to initialize MCP server:', error);

    // Fall back to hardcoded tools if MCP server fails
    console.warn('[ChatRespond] Falling back to hardcoded tool definitions');
    return buildFallbackTools();
  }
}

/**
 * Fallback tool definitions (used if MCP server fails)
 * Matches the original buildMCPTools() implementation
 */
function buildFallbackTools(): Array<OpenAI.Chat.Completions.ChatCompletionTool> {
  return [
    {
      type: 'function',
      function: {
        name: 'create_rfp',
        description: 'Create a new Request for Proposal (RFP) for a private jet flight',
        parameters: {
          type: 'object',
          properties: {
            departureAirport: {
              type: 'string',
              description: 'ICAO or IATA code for departure airport (e.g., KJFK, JFK)',
            },
            arrivalAirport: {
              type: 'string',
              description: 'ICAO or IATA code for arrival airport',
            },
            departureDate: {
              type: 'string',
              description: 'Departure date in ISO 8601 format (YYYY-MM-DD)',
            },
            departureTime: {
              type: 'string',
              description: 'Departure time (optional, HH:MM format)',
            },
            passengers: {
              type: 'number',
              description: 'Number of passengers',
            },
            clientName: {
              type: 'string',
              description: 'Client name (optional)',
            },
            clientEmail: {
              type: 'string',
              description: 'Client email (optional)',
            },
            aircraftType: {
              type: 'string',
              description: 'Preferred aircraft type (optional)',
              enum: ['light_jet', 'midsize', 'super_midsize', 'heavy_jet', 'ultra_long_range'],
            },
            specialRequirements: {
              type: 'string',
              description: 'Any special requirements (optional)',
            },
          },
          required: ['departureAirport', 'arrivalAirport', 'departureDate', 'passengers'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'search_flights',
        description: 'Search for available flights matching criteria',
        parameters: {
          type: 'object',
          properties: {
            departureAirport: { type: 'string' },
            arrivalAirport: { type: 'string' },
            departureDate: { type: 'string' },
            passengers: { type: 'number' },
            aircraftType: { type: 'string' },
          },
          required: ['departureAirport', 'arrivalAirport', 'departureDate'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_rfp_status',
        description: 'Get the current status and progress of an RFP',
        parameters: {
          type: 'object',
          properties: {
            rfpId: {
              type: 'string',
              description: 'RFP identifier',
            },
          },
          required: ['rfpId'],
        },
      },
    },
  ];
}

/**
 * Execute MCP tool and emit SSE progress events
 * ONEK-81: Implement executeTool() Function for MCP Tool Invocation
 *
 * This function serves as the bridge between GPT-4o function calling and MCP server tool execution.
 * It handles the complete lifecycle of tool execution with real-time SSE event streaming.
 *
 * **Flow**:
 * 1. Validates all required parameters
 * 2. Emits `tool_call_start` SSE event
 * 3. Executes tool via MCP client.callTool()
 * 4. Extracts text content from MCP response
 * 5. Emits `tool_call_result` SSE event
 * 6. Returns stringified result for GPT-4o message history
 *
 * **Error Handling**:
 * - Emits `tool_call_error` SSE event before throwing
 * - Logs errors with full context
 * - Re-throws error for caller to handle retry logic
 *
 * @param toolName - Name of the MCP tool to execute (e.g., "search_flights", "create_rfp")
 * @param toolArgs - Arguments object matching tool's input schema
 * @param mcpClient - MCP client instance connected to stdio transport
 * @param encoder - TextEncoder for encoding SSE messages
 * @param controller - ReadableStream controller for enqueuing SSE events
 * @returns Stringified tool result for inclusion in GPT-4o context
 *
 * @throws {Error} If tool name is empty
 * @throws {Error} If required parameters (mcpClient, encoder, controller) are missing
 * @throws {Error} If MCP tool execution fails
 *
 * @example
 * ```typescript
 * const result = await executeTool(
 *   'search_flights',
 *   {
 *     departureAirport: 'KJFK',
 *     arrivalAirport: 'KLAX',
 *     departureDate: '2025-11-15',
 *     passengers: 4
 *   },
 *   mcpClient,
 *   encoder,
 *   controller
 * );
 * // Returns: '[{"id":"flight-1","operator":{"name":"NetJets"},...}]'
 * // Emits: tool_call_start, tool_call_result events
 * ```
 *
 * @example Error Handling
 * ```typescript
 * try {
 *   await executeTool('invalid_tool', {}, mcpClient, encoder, controller);
 * } catch (error) {
 *   // tool_call_error event already emitted
 *   // Implement retry logic here
 * }
 * ```
 */
export async function executeTool(
  toolName: string,
  toolArgs: Record<string, any>,
  mcpClient: Client,
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController
): Promise<string> {
  // Validate required parameters
  if (!toolName || toolName.trim() === '') {
    throw new Error('Tool name is required');
  }

  if (!mcpClient) {
    throw new Error('MCP client is required');
  }

  if (!encoder) {
    throw new Error('TextEncoder is required');
  }

  if (!controller) {
    throw new Error('ReadableStream controller is required');
  }

  // Helper to send SSE event
  const sendSSE = (type: string, data: any) => {
    const message = `data: ${JSON.stringify({ type, data })}\n\n`;
    controller.enqueue(encoder.encode(message));
  };

  try {
    // Log tool invocation
    console.log(`[executeTool] Executing MCP tool: ${toolName}`, toolArgs);

    // Emit tool_call_start event
    sendSSE('tool_call_start', {
      toolName,
      arguments: toolArgs,
    });

    // Execute tool via MCP client
    const result = await mcpClient.callTool({
      name: toolName,
      arguments: toolArgs,
    });

    // Extract text content from MCP response
    let resultText = '';
    if (result.content && Array.isArray(result.content)) {
      for (const item of result.content) {
        if (item.type === 'text') {
          resultText += item.text;
        }
      }
    }

    // Emit tool_call_result event
    sendSSE('tool_call_result', {
      toolName,
      result: resultText,
    });

    console.log(`[executeTool] Tool execution successful: ${toolName}`);

    // Return stringified result for GPT-4o context
    return resultText;
  } catch (error) {
    // Log error with context
    console.error(`[executeTool] Tool execution error: ${toolName}`, error);

    // Emit tool_call_error event
    sendSSE('tool_call_error', {
      toolName,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Re-throw error to allow caller to handle
    throw error;
  }
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
