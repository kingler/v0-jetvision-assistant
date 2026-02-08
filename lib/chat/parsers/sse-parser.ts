/**
 * SSE Stream Parser
 *
 * Unified utility for parsing Server-Sent Events from the /api/chat endpoint.
 * Eliminates duplicate parsing logic that existed in:
 * - sendMessageWithStreaming (chat-interface.tsx:807-1325)
 * - handleTripIdSubmit (chat-interface.tsx:2080-3285)
 */

import { SSEConfig, WorkflowStatus, type WorkflowStatusType } from '../constants';
import type {
  SSEStreamData,
  SSEParseResult,
  ToolCallResult,
  ToolResultWithInput,
  TripData,
  RFPData,
  RFQData,
  PipelineData,
  Quote,
  AgentMetadata,
} from '../types';

/**
 * Logger interface for structured logging
 */
interface Logger {
  debug: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
}

/**
 * Default console logger (only logs in development)
 */
const defaultLogger: Logger = {
  debug: (message, data) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SSE] ${message}`, data ?? '');
    }
  },
  warn: (message, data) => {
    console.warn(`[SSE] ${message}`, data ?? '');
  },
  error: (message, data) => {
    console.error(`[SSE] ${message}`, data ?? '');
  },
};

/**
 * Handlers for SSE stream events
 */
export interface SSEHandlers {
  /** Called when content is received (streaming text) */
  onContent?: (content: string, accumulated: string) => void;
  /** Called when the stream is complete */
  onDone?: (result: SSEParseResult) => void;
  /** Called when an error occurs */
  onError?: (error: Error) => void;
  /** Called for each tool call result */
  onToolCall?: (toolCall: ToolCallResult) => void;
  /** Logger instance */
  logger?: Logger;
}

/**
 * Parse a single SSE data line
 */
export function parseSSELine(line: string): SSEStreamData | null {
  if (!line.startsWith(SSEConfig.DATA_PREFIX)) {
    return null;
  }

  const jsonStr = line.slice(SSEConfig.DATA_PREFIX.length);

  try {
    return JSON.parse(jsonStr) as SSEStreamData;
  } catch {
    return null;
  }
}

/**
 * Extract error from SSE data
 * Handles both legacy string errors and new structured format
 */
export function extractSSEError(data: SSEStreamData): Error | null {
  if (!data.error) {
    return null;
  }

  // New structured format: { code, message, recoverable }
  if (typeof data.error === 'object' && data.error.message) {
    const errorInfo = data.error;
    return new Error(`[${errorInfo.code}] ${errorInfo.message}`);
  }

  // Legacy string format
  if (typeof data.error === 'string') {
    return new Error(data.message || data.error);
  }

  return new Error('Unknown stream error');
}

/**
 * Process a single SSE data object and update the result
 * Returns true if the stream is complete (done signal received)
 */
function processSSEData(
  data: SSEStreamData,
  result: SSEParseResult,
  handlers: SSEHandlers,
  logger: Logger
): boolean {
  // Check for errors first
  const error = extractSSEError(data);
  if (error) {
    result.error = error.message;
    handlers.onError?.(error);
    throw error;
  }

  // Handle content streaming
  if (data.content) {
    result.content += data.content;
    handlers.onContent?.(data.content, result.content);
  }

  // Extract RFQ data (sent in separate chunk BEFORE done signal)
  if (data.rfq_data) {
    result.rfqData = data.rfq_data;
    logger.debug('RFQ data received', {
      hasFlights: !!data.rfq_data.flights,
      flightsCount: data.rfq_data.flights?.length || 0,
      hasQuotes: !!data.rfq_data.quotes,
      quotesCount: data.rfq_data.quotes?.length || 0,
    });
  }

  // Extract trip data (sent in separate chunk BEFORE done signal)
  if (data.trip_data) {
    result.tripData = data.trip_data;
    logger.debug('Trip data received', { tripId: data.trip_data.trip_id });
  }

  // Extract RFP data (sent in separate chunk BEFORE done signal)
  if (data.rfp_data) {
    result.rfpData = data.rfp_data;
    logger.debug('RFP data received', { tripId: data.rfp_data.trip_id });
  }

  // Extract email approval data (sent in separate chunk BEFORE done signal)
  if (data.email_approval_data) {
    result.emailApprovalData = data.email_approval_data;
    logger.debug('Email approval data received', {
      proposalId: data.email_approval_data.proposalId,
      to: data.email_approval_data.to,
    });
  }

  // Extract session info from ALL events (sent with initial content, not just done)
  // This ensures the frontend can update session state with the database ID
  if (data.conversation_id) {
    result.conversationId = data.conversation_id;
    logger.debug('Conversation ID received', { conversationId: data.conversation_id });
  }
  if (data.chat_session_id) {
    result.chatSessionId = data.chat_session_id;
  }
  if (data.conversation_type) {
    result.conversationType = data.conversation_type;
  }

  // Handle completion
  if (data.done) {
    result.done = true;

    // Extract debug info
    if (data._debug) {
      result.debug = data._debug;
      logger.debug('Server debug info', data._debug);
    }

    // Extract agent metadata
    if (data.agent) {
      result.agentMetadata = data.agent;
      logger.debug('Agent metadata', {
        intent: data.agent.intent,
        phase: data.agent.conversationState?.phase,
      });
    }

    // Extract tool calls
    if (data.tool_calls && Array.isArray(data.tool_calls)) {
      result.toolCalls = data.tool_calls;
      for (const toolCall of data.tool_calls) {
        handlers.onToolCall?.(toolCall);
      }
    }

    // Extract tool results with input (for MCP UI registry)
    if (data.tool_results && Array.isArray(data.tool_results)) {
      result.toolResults = data.tool_results;
    }

    // Extract trip data
    if (data.trip_data) {
      result.tripData = data.trip_data;
    }

    // Extract RFP data
    if (data.rfp_data) {
      result.rfpData = data.rfp_data;
    }

    // Extract RFQ data
    if (data.rfq_data) {
      result.rfqData = data.rfq_data;
    }

    // Extract pipeline data
    if (data.pipeline_data) {
      result.pipelineData = data.pipeline_data;
    }

    // Extract email approval data
    if (data.email_approval_data) {
      result.emailApprovalData = data.email_approval_data;
    }

    // Extract quotes
    if (data.quotes && Array.isArray(data.quotes)) {
      result.quotes = data.quotes;
    }

    // Note: conversation_id, chat_session_id, and conversation_type are now
    // extracted from ALL events (above), not just the done event

    handlers.onDone?.(result);
    return true; // Signal to stop processing
  }

  return false; // Continue processing
}

/**
 * Parse SSE stream from a ReadableStream
 *
 * @param reader - The stream reader from fetch response
 * @param handlers - Event handlers for the stream
 * @param signal - Optional AbortSignal for cancellation
 * @returns Promise resolving to the complete parse result
 */
export async function parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  handlers: SSEHandlers = {},
  signal?: AbortSignal
): Promise<SSEParseResult> {
  const logger = handlers.logger ?? defaultLogger;
  const decoder = new TextDecoder();

  // Accumulated result
  const result: SSEParseResult = {
    content: '',
    done: false,
    toolCalls: [],
    quotes: [],
  };

  // Buffer for incomplete lines across chunks
  // SSE messages can be split across multiple chunks, so we need to buffer
  let lineBuffer = '';

  try {
    while (true) {
      // Check for abort signal
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      const { done, value } = await reader.read();

      if (done) {
        // Process any remaining buffered content
        if (lineBuffer.trim()) {
          const data = parseSSELine(lineBuffer);
          if (data) {
            processSSEData(data, result, handlers, logger);
          }
        }
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      // Prepend any buffered partial line from previous chunk
      const fullChunk = lineBuffer + chunk;
      const lines = fullChunk.split('\n');

      // The last element might be incomplete if chunk didn't end with newline
      // Keep it in the buffer for the next iteration
      lineBuffer = lines.pop() || '';

      for (const line of lines) {
        const data = parseSSELine(line);

        if (!data) {
          continue;
        }

        const shouldReturn = processSSEData(data, result, handlers, logger);
        if (shouldReturn) {
          return result;
        }
      }
    }

    // Stream ended without explicit done signal
    if (result.content) {
      result.done = true;
      handlers.onDone?.(result);
    }

    return result;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      // Request was cancelled - don't treat as error
      return result;
    }

    const err = error instanceof Error ? error : new Error(String(error));
    handlers.onError?.(err);
    throw err;
  }
}

/**
 * Extract quotes from various locations in SSE data
 *
 * Quotes can be found in:
 * - data.quotes (direct)
 * - data.rfq_data.quotes
 * - data.trip_data.quotes
 * - tool_calls[].result.quotes
 * - tool_calls[].result.rfqs[].quotes
 */
export function extractQuotesFromSSEData(data: SSEStreamData): Quote[] {
  let quotes: Quote[] = [];

  // Direct quotes array
  if (data.quotes && Array.isArray(data.quotes)) {
    quotes = data.quotes;
  }
  // From rfq_data
  else if (data.rfq_data?.quotes && Array.isArray(data.rfq_data.quotes)) {
    quotes = data.rfq_data.quotes;
  }
  // From trip_data
  else if ((data as any).trip_data?.quotes && Array.isArray((data as any).trip_data.quotes)) {
    quotes = (data as any).trip_data.quotes;
  }

  // Also check tool_calls for quote results
  if (quotes.length === 0 && data.tool_calls) {
    for (const toolCall of data.tool_calls) {
      if (!toolCall.result) continue;

      const result = toolCall.result as Record<string, unknown>;

      // get_rfq with quotes
      if (toolCall.name === 'get_rfq') {
        if (result.quotes && Array.isArray(result.quotes)) {
          quotes = result.quotes as Quote[];
          break;
        }
        // Extract from rfqs array
        if (result.rfqs && Array.isArray(result.rfqs)) {
          quotes = (result.rfqs as unknown[]).flatMap((rfq: any) => rfq.quotes || []);
          break;
        }
      }

      // get_quotes or get_quote_status
      if (toolCall.name === 'get_quotes' || toolCall.name === 'get_quote_status') {
        if (result.quotes && Array.isArray(result.quotes)) {
          quotes = result.quotes as Quote[];
          break;
        }
        // Result itself might be an array
        if (Array.isArray(result)) {
          quotes = result as Quote[];
          break;
        }
      }
    }
  }

  return quotes;
}

/**
 * Extract deep link data from SSE response
 */
export function extractDeepLinkData(data: SSEStreamData): {
  tripData?: TripData;
  rfpData?: RFPData;
  showDeepLink: boolean;
} {
  let tripData: TripData | undefined;
  let rfpData: RFPData | undefined;
  let showDeepLink = false;

  // Check direct data fields
  if (data.trip_data) {
    tripData = data.trip_data;
    showDeepLink = true;
  }

  if (data.rfp_data) {
    rfpData = data.rfp_data;
    showDeepLink = true;
  }

  // Check tool calls
  if (data.tool_calls) {
    for (const toolCall of data.tool_calls) {
      if (!toolCall.result) continue;

      const result = toolCall.result as Record<string, unknown>;

      if (toolCall.name === 'create_trip' || toolCall.name === 'get_rfq') {
        showDeepLink = true;
        tripData = {
          trip_id: result.trip_id as string,
          deep_link: (result.deep_link as string) ||
            'https://sandbox.avinode.com/marketplace/mvc/search#preSearch',
          departure_airport: result.departure_airport as any,
          arrival_airport: result.arrival_airport as any,
          departure_date: (result.route as any)?.departure?.date || result.departure_date as string,
          passengers: result.passengers as number,
        };
      }

      if (toolCall.name === 'create_rfp') {
        showDeepLink = true;
        rfpData = {
          trip_id: result.trip_id as string,
          // Map API's rfp_id to internal rfq_id for naming consistency
          rfq_id: (result.rfq_id || result.rfp_id) as string,
          deep_link: (result.deep_link as string) ||
            'https://sandbox.avinode.com/marketplace/mvc/search#preSearch',
          departure_airport: result.departure_airport as any,
          arrival_airport: result.arrival_airport as any,
          departure_date: (result.route as any)?.departure?.date || result.departure_date as string,
          passengers: result.passengers as number,
        };
      }
    }
  }

  return { tripData, rfpData, showDeepLink };
}

/**
 * Determine workflow status from SSE data
 */
export function determineWorkflowStatus(
  data: SSEStreamData,
  currentStatus: WorkflowStatusType = WorkflowStatus.UNDERSTANDING_REQUEST
): { status: WorkflowStatusType; step: number } {
  let status: WorkflowStatusType = currentStatus;
  let step = 1;

  // Check agent metadata first
  const phase = data.agent?.conversationState?.phase;
  if (phase === 'gathering_info') {
    status = WorkflowStatus.UNDERSTANDING_REQUEST;
    step = 1;
  } else if (phase === 'confirming') {
    status = WorkflowStatus.SEARCHING_AIRCRAFT;
    step = 2;
  } else if (phase === 'processing') {
    status = WorkflowStatus.REQUESTING_QUOTES;
    step = 3;
  } else if (phase === 'complete') {
    status = WorkflowStatus.PROPOSAL_READY;
    step = 5;
  }

  // Check intent
  if (data.agent?.intent === 'RFP_CREATION') {
    status = WorkflowStatus.SEARCHING_AIRCRAFT;
    step = 2;
  }

  // Check tool calls for more specific status
  if (data.tool_calls) {
    for (const toolCall of data.tool_calls) {
      switch (toolCall.name) {
        case 'search_flights':
          status = WorkflowStatus.SEARCHING_AIRCRAFT;
          step = 2;
          break;
        case 'create_trip':
        case 'create_rfp':
          status = WorkflowStatus.REQUESTING_QUOTES;
          step = 3;
          break;
        case 'get_quotes':
        case 'get_quote_status':
        case 'get_rfq':
          status = WorkflowStatus.ANALYZING_OPTIONS;
          step = 4;
          break;
      }
    }
  }

  // Check for trip/rfp data
  if (data.trip_data || data.rfp_data) {
    status = WorkflowStatus.REQUESTING_QUOTES;
    step = 3;
  }

  return { status, step };
}
