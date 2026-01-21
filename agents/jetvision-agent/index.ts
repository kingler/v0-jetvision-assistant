/**
 * JetvisionAgent - Single Agent Architecture
 *
 * A unified agent that handles all charter flight operations with access to:
 * - Avinode MCP (flight search, trips, quotes)
 * - Database MCP (CRM tables)
 * - Gmail MCP (email sending)
 *
 * Simplified design: Let OpenAI handle conversation flow naturally.
 * No redundant state tracking - the LLM manages context via conversation history.
 */

import OpenAI from 'openai';
import type { AgentContext, ToolResult, ToolName } from './types';
import { ALL_TOOLS } from './tools';
import { ToolExecutor, createToolExecutor } from './tool-executor';

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEFAULT_MODEL = 'gpt-4o';

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
- Use \`send_proposal_email\` or \`send_quote_email\` to email clients

## Response Guidelines
- Be concise and professional
- Format quotes clearly: operator, aircraft, price
- Always show the Avinode deep link when a trip is created
- If tools fail, explain what went wrong

## Common Airport Codes
KTEB = Teterboro, KJFK = JFK, KLAX = Los Angeles, KORD = Chicago O'Hare,
KMIA = Miami, KDEN = Denver, KLAS = Las Vegas, KVNY = Van Nuys`;

// =============================================================================
// JETVISION AGENT CLASS
// =============================================================================

export class JetvisionAgent {
  private openai: OpenAI;
  private toolExecutor: ToolExecutor;
  private context: AgentContext;

  constructor(context: AgentContext) {
    this.context = context;
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
  setGmailMCP(mcp: {
    sendEmail: (params: {
      to: string;
      subject: string;
      body_html: string;
      body_text?: string;
      cc?: string[];
      bcc?: string[];
    }) => Promise<{ messageId: string; threadId: string }>;
  }): void {
    this.toolExecutor.setGmailMCP(mcp);
  }

  /**
   * Execute agent with conversation history
   */
  async execute(
    userMessage: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): Promise<{
    message: string;
    toolResults: ToolResult[];
    tripId?: string;
    deepLink?: string;
    rfpData?: {
      departure_airport?: string;
      arrival_airport?: string;
      departure_date?: string;
      passengers?: number;
      return_date?: string;
      special_requirements?: string;
    };
  }> {
    // Build messages for OpenAI
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: userMessage },
    ];

    // Detect if this is a forced tool call (e.g., "get_rfq TRIPID" or "Get RFQs for Trip ID TRIPID")
    // Force tool_choice when message matches known patterns to ensure reliable tool invocation
    let toolChoice: 'auto' | { type: 'function'; function: { name: string } } = 'auto';

    // Pattern 1: "get_rfq TRIPID" - raw command format
    const getRfqMatch = userMessage.match(/^get_rfq\s+([A-Z0-9-]+)/i);
    // Pattern 2: "Get RFQs for Trip ID TRIPID" - natural language format from frontend
    const getRfqNaturalMatch = userMessage.match(/Get\s+RFQs?\s+for\s+Trip\s+ID\s+([A-Z0-9-]+)/i);

    if (getRfqMatch) {
      toolChoice = { type: 'function', function: { name: 'get_rfq' } };
      console.log(`[JetvisionAgent] Forcing get_rfq tool call for trip (raw format): ${getRfqMatch[1]}`);
    } else if (getRfqNaturalMatch) {
      toolChoice = { type: 'function', function: { name: 'get_rfq' } };
      console.log(`[JetvisionAgent] Forcing get_rfq tool call for trip (natural format): ${getRfqNaturalMatch[1]}`);
    }

    // First call - use forced tool_choice if pattern matched, otherwise let OpenAI decide
    const response = await this.openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages,
      tools: ALL_TOOLS as OpenAI.ChatCompletionTool[],
      tool_choice: toolChoice,
      temperature: 0.7,
    });

    const choice = response.choices[0];
    const toolCalls = choice.message.tool_calls;

    // No tools called - return direct response
    if (!toolCalls || toolCalls.length === 0) {
      return {
        message: choice.message.content || '',
        toolResults: [],
      };
    }

    // Execute tool calls
    const toolResults: ToolResult[] = [];
    const toolMessages: OpenAI.ChatCompletionMessageParam[] = [];
    // Store create_trip params for rfpData extraction
    let createTripParams: Record<string, unknown> | undefined;

    // Add assistant message with tool calls
    toolMessages.push({
      role: 'assistant',
      content: choice.message.content || null,
      tool_calls: toolCalls,
    });

    for (const tc of toolCalls) {
      // Type guard for function tool calls
      if (tc.type !== 'function') {
        console.warn(`[JetvisionAgent] Skipping non-function tool call: ${tc.type}`);
        continue;
      }
      const { name, arguments: argsJson } = tc.function;
      let params: Record<string, unknown>;

      try {
        params = JSON.parse(argsJson);
      } catch {
        console.error(`[JetvisionAgent] Failed to parse args: ${argsJson}`);
        toolResults.push({ name: name as ToolName, success: false, error: 'Invalid arguments' });
        toolMessages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify({ error: 'Invalid arguments' }),
        });
        continue;
      }

      console.log(`[JetvisionAgent] Executing: ${name}`, params);

      // Capture create_trip params for rfpData
      if (name === 'create_trip') {
        createTripParams = params;
      }

      const result = await this.toolExecutor.execute(name as ToolName, params);
      toolResults.push(result);

      toolMessages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: JSON.stringify(result.success ? result.data : { error: result.error }),
      });
    }

    // Get final response with tool results
    const finalResponse = await this.openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [...messages, ...toolMessages],
      temperature: 0.7,
    });

    const finalMessage = finalResponse.choices[0].message.content || '';

    // Extract trip data if present
    let tripId: string | undefined;
    let deepLink: string | undefined;

    for (const result of toolResults) {
      if (result.success && result.name === 'create_trip') {
        const data = result.data as { trip_id?: string; deep_link?: string } | undefined;
        tripId = data?.trip_id;
        deepLink = data?.deep_link;
      }
    }

    // Build rfpData from create_trip params if available
    const rfpData = createTripParams ? {
      departure_airport: createTripParams.departure_airport as string | undefined,
      arrival_airport: createTripParams.arrival_airport as string | undefined,
      departure_date: createTripParams.departure_date as string | undefined,
      passengers: createTripParams.passengers as number | undefined,
      return_date: createTripParams.return_date as string | undefined,
      special_requirements: createTripParams.special_requirements as string | undefined,
    } : undefined;

    return {
      message: finalMessage,
      toolResults,
      tripId,
      deepLink,
      rfpData,
    };
  }
}

// =============================================================================
// FACTORY & EXPORTS
// =============================================================================

export function createJetvisionAgent(context: AgentContext): JetvisionAgent {
  return new JetvisionAgent(context);
}

export * from './types';
export * from './tools';
export { ToolExecutor, createToolExecutor } from './tool-executor';
