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
import { executeToolWithRetry } from '@/lib/mcp/tool-executor';

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
  | 'tool_call_retry'
  | 'tool_call_result'
  | 'tool_call_error'
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

          // Get MCP client for tool execution
          const mcpClient: Client = await mcpManager.getClient(MCP_SERVER_CONFIG.name);

          // Multi-turn conversation loop for tool calling
          // ONEK-83: Integrate Tool Execution into OpenAI Streaming Loop
          const MAX_TOOL_DEPTH = 5; // Prevent infinite loops
          let conversationMessages: OpenAI.ChatCompletionMessageParam[] = [...messages];
          let toolCallDepth = 0;

          while (toolCallDepth < MAX_TOOL_DEPTH) {
            // Create streaming response
            const response = await openai.chat.completions.create({
              model: 'gpt-5.2',
              messages: conversationMessages,
              tools: tools.length > 0 ? tools : undefined,
              stream: true,
              max_tokens: 4096,
              temperature: 0,
            });

            let fullContent = '';
            let toolCalls: Array<{ id: string; name: string; arguments: string }> = [];
            let currentToolCall: { id: string; name: string; arguments: string } | null = null;

            // Stream response chunks
            for await (const chunk of response) {
              const delta = chunk.choices[0]?.delta;
              const finishReason = chunk.choices[0]?.finish_reason;

              // Handle text tokens
              if (delta?.content) {
                fullContent += delta.content;
                sendSSE({
                  type: 'token',
                  data: { token: delta.content },
                });
              }

              // Handle tool calls (streaming)
              if (delta?.tool_calls) {
                for (const toolCall of delta.tool_calls) {
                  const index = toolCall.index ?? 0;

                  if (!toolCalls[index]) {
                    toolCalls[index] = {
                      id: toolCall.id || '',
                      name: toolCall.function?.name || '',
                      arguments: toolCall.function?.arguments || '',
                    };
                    currentToolCall = toolCalls[index];

                    sendSSE({
                      type: 'tool_call_progress',
                      data: {
                        toolCallId: currentToolCall.id,
                        toolName: currentToolCall.name,
                      },
                    });
                  } else {
                    // Accumulate arguments
                    if (toolCall.function?.arguments) {
                      toolCalls[index].arguments += toolCall.function.arguments;
                    }
                    if (toolCall.function?.name) {
                      toolCalls[index].name = toolCall.function.name;
                    }
                  }
                }
              }

              // Handle tool call completion
              if (finishReason === 'tool_calls' && toolCalls.length > 0) {
                // Add assistant message with tool calls to history
                conversationMessages.push({
                  role: 'assistant',
                  content: fullContent || '',
                  tool_calls: toolCalls.map((tc) => ({
                    id: tc.id,
                    type: 'function' as const,
                    function: {
                      name: tc.name,
                      arguments: tc.arguments,
                    },
                  })),
                });

                // Execute all tool calls
                for (const toolCall of toolCalls) {
                  try {
                    // Parse tool arguments with error handling
                    let toolArgs: Record<string, any>;
                    try {
                      toolArgs = JSON.parse(toolCall.arguments);
                    } catch (parseError) {
                      const errorMsg = parseError instanceof Error ? parseError.message : 'Invalid JSON';
                      console.error(`[ChatRespond] Failed to parse tool arguments for ${toolCall.name}:`, errorMsg);

                      sendSSE({
                        type: 'tool_call_error',
                        data: {
                          toolCallId: toolCall.id,
                          toolName: toolCall.name,
                          error: `Failed to parse tool arguments: ${errorMsg}`,
                        },
                      });

                      // Add error to conversation and continue
                      conversationMessages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: JSON.stringify({
                          error: `Invalid tool arguments: ${errorMsg}`,
                          toolName: toolCall.name,
                        }),
                      });
                      continue;
                    }

                    sendSSE({
                      type: 'tool_call_complete',
                      data: {
                        toolCallId: toolCall.id,
                        toolName: toolCall.name,
                        arguments: toolArgs,
                      },
                    });

                    // Execute tool with retry logic
                    const result = await executeToolWithRetry(
                      toolCall.name,
                      toolArgs,
                      mcpClient,
                      encoder,
                      controller
                    );

                    // Add tool result to conversation
                    conversationMessages.push({
                      role: 'tool',
                      tool_call_id: toolCall.id,
                      content: result,
                    });
                  } catch (error) {
                    console.error(`[ChatRespond] Tool execution failed: ${toolCall.name}`, error);

                    // Add error result to conversation
                    conversationMessages.push({
                      role: 'tool',
                      tool_call_id: toolCall.id,
                      content: JSON.stringify({
                        error: error instanceof Error ? error.message : 'Unknown error',
                        toolName: toolCall.name,
                      }),
                    });
                  }
                }

                // Increment depth and continue conversation with tool results
                toolCallDepth++;
                break; // Exit streaming loop to start next iteration
              }

              // Handle final completion
              if (finishReason === 'stop') {
                sendSSE({
                  type: 'complete',
                  data: {
                    messageId,
                    sessionId,
                    finishReason: 'stop',
                  },
                });

                controller.close();
                return; // Exit completely
              }
            }

            // If no tool calls were made, we're done
            if (toolCalls.length === 0) {
              sendSSE({
                type: 'complete',
                data: {
                  messageId,
                  sessionId,
                  finishReason: 'stop',
                },
              });
              controller.close();
              return;
            }
          }

          // Max tool depth reached
          if (toolCallDepth >= MAX_TOOL_DEPTH) {
            sendSSE({
              type: 'error',
              data: { error: 'Maximum tool call depth exceeded (5 levels)' },
            });
            controller.close();
            return;
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
  const basePrompt = `You are Jetvision, an AI assistant for charter flight brokers (ISO agents).

## Your Capabilities
1. **Flight Requests** - Create trips in Avinode, search flights, get quotes
2. **CRM Management** - Look up clients, create client profiles, manage requests
3. **Quote Management** - View quotes, compare options, accept/reject quotes
4. **Proposals** - Create and send proposals to clients
5. **Communication** - Send emails to clients with quotes or proposals

## Creating a Flight Request
When the user wants a flight, you need these details before calling \`create_trip\`:
- Departure airport (ICAO code like KTEB, KJFK)
- Arrival airport (ICAO code)
- Departure date (YYYY-MM-DD)
- Number of passengers

If ANY information is missing, ask the user for it. Don't assume values.

## Looking Up Trips
- Use \`get_rfq\` when given a trip ID (6-char code like LPZ8VC or atrip-*)
- The tool returns quotes from operators

## Client & Quote Management
- Use \`get_client\` or \`list_clients\` to find clients
- Use \`get_quotes\` to see quotes for a request
- Use \`send_proposal_email\` or \`send_quote_email\` to email clients
- Always confirm with the user before sending emails

## Response Guidelines
- Be concise and professional
- Format quotes clearly: operator, aircraft, price
- Always show the Avinode deep link when a trip is created
- If tools fail, explain what went wrong

## Common Airport Codes
KTEB = Teterboro, KJFK = JFK, KLAX = Los Angeles, KORD = Chicago O'Hare,
KMIA = Miami, KDEN = Denver, KLAS = Las Vegas, KVNY = Van Nuys`;

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
