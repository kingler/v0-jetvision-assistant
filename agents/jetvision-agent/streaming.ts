/**
 * JetvisionAgent Streaming Support
 *
 * Provides SSE streaming integration for real-time responses.
 */

import OpenAI from 'openai';
import type { AgentContext, ToolResult, ToolName } from './types';
import { ALL_TOOLS, getToolCategory } from './tools';
import { ToolExecutor, createToolExecutor } from './tool-executor';

// =============================================================================
// STREAMING TYPES
// =============================================================================

export interface StreamCallbacks {
  onToken?: (token: string) => void;
  onToolStart?: (toolName: string, params: Record<string, unknown>) => void;
  onToolEnd?: (toolName: string, result: ToolResult) => void;
  onComplete?: (fullResponse: string, toolResults: ToolResult[]) => void;
  onError?: (error: Error) => void;
}

export interface StreamingAgentOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

const SYSTEM_PROMPT = `You are Jetvision, an AI assistant for charter flight brokers (ISO agents).

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
- Use \`prepare_proposal_email\` to generate proposal emails for user review (human-in-the-loop approval)
- Only use \`send_proposal_email\` if the user explicitly asks to skip the review step
- Always let the user review and approve emails before sending

## Response Guidelines
- Be concise and professional
- Format quotes clearly: operator, aircraft, price
- Always show the Avinode deep link when a trip is created
- If tools fail, explain what went wrong

## Common Airport Codes
KTEB = Teterboro, KJFK = JFK, KLAX = Los Angeles, KORD = Chicago O'Hare,
KMIA = Miami, KDEN = Denver, KLAS = Las Vegas, KVNY = Van Nuys`;

// =============================================================================
// STREAMING AGENT CLASS
// =============================================================================

export class StreamingJetvisionAgent {
  private openai: OpenAI;
  private toolExecutor: ToolExecutor;
  private context: AgentContext;
  private options: StreamingAgentOptions;
  private conversationHistory: OpenAI.ChatCompletionMessageParam[] = [];

  constructor(
    context: AgentContext,
    options: StreamingAgentOptions = {}
  ) {
    this.context = context;
    this.options = {
      model: options.model || 'gpt-5.2',
      temperature: options.temperature ?? 0,
      maxTokens: options.maxTokens || 4096,
    };
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.toolExecutor = createToolExecutor(context);
  }

  /**
   * Set the Avinode MCP server instance
   */
  setAvinodeMCP(mcp: { callTool: (name: string, params: Record<string, unknown>) => Promise<unknown>; isConnected: () => boolean }): void {
    this.toolExecutor.setAvinodeMCP(mcp);
  }

  /**
   * Set the Gmail MCP server instance
   */
  setGmailMCP(mcp: { sendEmail: (params: { to: string; subject: string; body_html: string; body_text?: string; cc?: string[]; bcc?: string[] }) => Promise<{ messageId: string; threadId: string }> }): void {
    this.toolExecutor.setGmailMCP(mcp);
  }

  /**
   * Execute with streaming response
   */
  async executeStream(
    userMessage: string,
    callbacks: StreamCallbacks
  ): Promise<void> {
    try {
      // Add user message to history
      this.conversationHistory.push({ role: 'user', content: userMessage });

      // Build messages
      const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...this.conversationHistory,
      ];

      // Create streaming completion
      const stream = await this.openai.chat.completions.create({
        model: this.options.model!,
        messages,
        tools: ALL_TOOLS as OpenAI.ChatCompletionTool[],
        tool_choice: 'auto',
        temperature: this.options.temperature,
        max_tokens: this.options.maxTokens,
        stream: true,
      });

      let fullResponse = '';
      let toolCalls: Array<{
        id: string;
        name: string;
        arguments: string;
      }> = [];
      const toolResults: ToolResult[] = [];

      // Process stream
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;

        // Handle content tokens
        if (delta?.content) {
          fullResponse += delta.content;
          callbacks.onToken?.(delta.content);
        }

        // Handle tool calls
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (tc.index !== undefined) {
              // Initialize or update tool call
              if (!toolCalls[tc.index]) {
                toolCalls[tc.index] = {
                  id: tc.id || '',
                  name: tc.function?.name || '',
                  arguments: '',
                };
              }
              if (tc.id) toolCalls[tc.index].id = tc.id;
              if (tc.function?.name) toolCalls[tc.index].name = tc.function.name;
              if (tc.function?.arguments) toolCalls[tc.index].arguments += tc.function.arguments;
            }
          }
        }
      }

      // Execute tool calls if any
      if (toolCalls.length > 0) {
        for (const tc of toolCalls) {
          if (!tc.name) continue;

          let params: Record<string, unknown>;
          try {
            params = JSON.parse(tc.arguments || '{}');
          } catch {
            console.error(`[StreamingAgent] Failed to parse tool arguments: ${tc.arguments}`);
            continue;
          }

          callbacks.onToolStart?.(tc.name, params);

          const result = await this.toolExecutor.execute(tc.name as ToolName, params);
          toolResults.push(result);

          callbacks.onToolEnd?.(tc.name, result);

          // If we have tool results, generate a follow-up response
          fullResponse += this.formatToolResult(result);
        }
      }

      // Add assistant response to history
      this.conversationHistory.push({ role: 'assistant', content: fullResponse });

      // Call completion callback
      callbacks.onComplete?.(fullResponse, toolResults);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      callbacks.onError?.(err);
      throw err;
    }
  }

  /**
   * Format a tool result for display
   */
  private formatToolResult(result: ToolResult): string {
    if (!result.success) {
      return `\n\n**Error:** ${result.error}`;
    }

    const data = result.data as Record<string, unknown> | undefined;
    if (!data) return '';

    switch (result.name) {
      case 'create_trip':
        return `\n\n**Trip Created!**\n- Trip ID: ${data.trip_id}\n- [Open in Avinode](${data.deep_link})`;

      case 'get_rfq': {
        const flights = data.flights as Array<{ operatorName: string; aircraftType: string; totalPrice: number; rfqStatus: string }> | undefined;
        if (flights && flights.length > 0) {
          let result = `\n\n**Quotes for ${data.trip_id}:**\n`;
          flights.forEach((q, i) => {
            result += `${i + 1}. **${q.operatorName}** - ${q.aircraftType} - $${q.totalPrice?.toLocaleString() || 'TBD'}\n`;
          });
          return result;
        }
        return `\n\n**Trip ${data.trip_id}** - No quotes received yet.`;
      }

      case 'list_clients': {
        const clients = (data as { clients: Array<{ company_name: string; contact_name: string }> }).clients;
        if (clients.length > 0) {
          let result = `\n\n**Clients Found:**\n`;
          clients.forEach((c) => {
            result += `- ${c.company_name} (${c.contact_name})\n`;
          });
          return result;
        }
        return '\n\nNo clients found.';
      }

      case 'prepare_proposal_email': {
        // Email preview data is sent separately via email_approval event
        // Return a simple message here
        const to = data.to as { email: string; name: string } | undefined;
        return `\n\n**Email Ready for Review**\nI've prepared an email for ${to?.name || 'the client'}. Please review it below and click "Send Email" when ready.`;
      }

      default:
        return '';
    }
  }

  /**
   * Get current conversation history
   */
  getHistory(): OpenAI.ChatCompletionMessageParam[] {
    return [...this.conversationHistory];
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }
}

// =============================================================================
// SSE STREAM CREATOR
// =============================================================================

/**
 * Create an SSE stream from agent execution
 */
export function createAgentSSEStream(
  agent: StreamingJetvisionAgent,
  userMessage: string
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        await agent.executeStream(userMessage, {
          onToken: (token) => {
            sendEvent('token', { content: token });
          },
          onToolStart: (name, params) => {
            sendEvent('tool_start', { tool: name, params });
          },
          onToolEnd: (name, result) => {
            sendEvent('tool_end', { tool: name, success: result.success, data: result.data, error: result.error });
            // Send special event for email approval workflow
            if (name === 'prepare_proposal_email' && result.success && result.data) {
              sendEvent('email_approval', {
                type: 'email_approval_request',
                data: result.data,
              });
            }
          },
          onComplete: (fullResponse, toolResults) => {
            sendEvent('done', {
              content: fullResponse,
              tool_results: toolResults,
              done: true,
            });
            controller.close();
          },
          onError: (error) => {
            sendEvent('error', { message: error.message });
            controller.close();
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        sendEvent('error', { message: errorMessage });
        controller.close();
      }
    },
  });
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createStreamingAgent(
  context: AgentContext,
  options?: StreamingAgentOptions
): StreamingJetvisionAgent {
  return new StreamingJetvisionAgent(context, options);
}
