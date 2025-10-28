/**
 * Streaming Chat Response API Route
 * Uses OpenAI Responses API with Server-Sent Events (SSE) for real-time streaming
 * Supports hosted MCP servers and tool call indicators
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { auth } from '@clerk/nextjs/server';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORGANIZATION_ID,
});

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

          // Configure hosted MCP tools (if available)
          const tools = buildMCPTools();

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
  const basePrompt = `You are JetVision AI Assistant, a helpful agent for booking private jet flights.

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
 * Build MCP tool configurations
 * NOTE: This will be updated to use hosted MCP servers in Phase 3
 */
function buildMCPTools(): Array<OpenAI.Chat.Completions.ChatCompletionTool> {
  // For now, return standard function tools
  // Phase 3 will convert to hosted MCP tool format:
  // {
  //   type: 'mcp',
  //   mcp: {
  //     server: 'supabase-mcp',
  //     connector: { url: 'https://...', headers: {...} }
  //   }
  // }

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
