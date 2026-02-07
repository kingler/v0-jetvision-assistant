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
import {
  buildSystemPromptWithWorkingMemory,
  detectForcedTool,
  detectForcedToolFromContext,
  detectIntentWithHistory,
  getIntentPrompt,
} from '@/lib/prompts';

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEFAULT_MODEL = 'gpt-5.2';

// System prompt is now built dynamically from lib/prompts module

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
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
    workingMemory?: Record<string, unknown> | null
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
    // Detect intent from message AND conversation history
    // This fixes the multi-turn bug where clarification responses lose context
    const intent = detectIntentWithHistory(userMessage, conversationHistory);
    let systemPrompt = buildSystemPromptWithWorkingMemory(workingMemory);

    // Append intent-specific instructions if detected
    if (intent) {
      const intentPrompt = getIntentPrompt(intent);
      if (intentPrompt) {
        systemPrompt += '\n\n---\n\n' + intentPrompt;
        console.log(`[JetvisionAgent] Detected intent: ${intent}`);
      }
    }

    // Build messages for OpenAI
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: userMessage },
    ];

    // Detect forced tool: message patterns first, then context (e.g. airport clarification follow-up)
    let toolChoice: 'auto' | { type: 'function'; function: { name: string } } = 'auto';
    const forcedFromMessage = detectForcedTool(userMessage);
    let forcedTool = forcedFromMessage;
    if (!forcedTool && conversationHistory.length > 0) {
      forcedTool = detectForcedToolFromContext(conversationHistory, userMessage) ?? null;
    }
    if (forcedTool) {
      toolChoice = { type: 'function', function: { name: forcedTool } };
      console.log(
        forcedFromMessage
          ? `[JetvisionAgent] Forcing ${forcedTool} tool call based on message pattern`
          : `[JetvisionAgent] Forcing ${forcedTool} from context (airport clarification follow-up)`
      );
    }

    // First call - use forced tool_choice if pattern matched, otherwise let OpenAI decide
    const response = await this.openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages,
      tools: ALL_TOOLS as OpenAI.ChatCompletionTool[],
      tool_choice: toolChoice,
      temperature: 0,
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
      temperature: 0,
    });

    const finalMessage = finalResponse.choices[0].message.content || '';

    // Extract trip data if present
    let tripId: string | undefined;
    let deepLink: string | undefined;

    for (const result of toolResults) {
      if (result.name === 'create_trip') {
        // DEBUG: Log create_trip result to diagnose sidebar update issue
        console.log('[JetvisionAgent] 🔍 create_trip tool result:', {
          success: result.success,
          hasData: !!result.data,
          trip_id: (result.data as any)?.trip_id,
          deep_link: (result.data as any)?.deep_link ? 'SET' : undefined,
          error: result.error,
        });
        if (result.success) {
          const data = result.data as { trip_id?: string; deep_link?: string } | undefined;
          tripId = data?.trip_id;
          deepLink = data?.deep_link;
        }
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
