/**
 * Chat API Service
 *
 * Client-side service for chat API interactions.
 * Wraps fetch calls to /api/chat with proper typing and error handling.
 *
 * Extracted from: components/chat-interface.tsx (lines 580-640, 1127-1145)
 */

import type { SSEParseResult } from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface ConversationHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface SendMessageParams {
  /** The message content to send */
  message: string;
  /** Avinode trip ID if available */
  tripId?: string;
  /** Request ID for conversation persistence */
  requestId?: string;
  /** Conversation ID for session tracking */
  conversationId?: string;
  /** Previous conversation history for context */
  conversationHistory: ConversationHistoryItem[];
}

export interface SendMessageResult {
  /** The fetch Response object for streaming */
  response: Response;
  /** AbortController to cancel the request */
  abortController: AbortController;
}

export interface FetchRFQsParams {
  /** Avinode trip ID to fetch RFQs for */
  tripId: string;
  /** Previous conversation history for context */
  conversationHistory: ConversationHistoryItem[];
  /** Request ID for conversation persistence */
  requestId?: string;
  /** Conversation ID for session tracking */
  conversationId?: string;
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Send a chat message and return the streaming response.
 *
 * Returns the raw Response object for SSE streaming.
 * Use parseSSEStream from lib/chat to process the stream.
 *
 * @example
 * ```ts
 * const { response, abortController } = await chatApi.sendMessage({
 *   message: 'I need a flight from KTEB to KLAX',
 *   conversationHistory: [],
 * });
 *
 * const reader = response.body?.getReader();
 * const result = await parseSSEStream(reader, handlers, abortController.signal);
 * ```
 *
 * @throws Error if the API returns non-ok status
 */
export async function sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
  const abortController = new AbortController();

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: params.message,
      tripId: params.tripId,
      requestId: params.requestId,
      context: {
        conversationId: params.conversationId,
        tripId: params.tripId,
      },
      conversationHistory: params.conversationHistory,
    }),
    signal: abortController.signal,
  });

  if (!response.ok) {
    throw new Error(`Chat API error: ${response.status} ${response.statusText}`);
  }

  return { response, abortController };
}

/**
 * Fetch RFQs for a given trip ID.
 *
 * This sends a special message to trigger the get_rfq tool.
 * Returns the raw Response object for SSE streaming.
 *
 * @example
 * ```ts
 * const response = await chatApi.fetchRFQs({
 *   tripId: 'atrip-123456',
 *   conversationHistory: [],
 * });
 *
 * const reader = response.body?.getReader();
 * const result = await parseSSEStream(reader);
 * // result.rfqData contains the RFQ information
 * ```
 *
 * @throws Error if the API returns non-ok status
 */
export async function fetchRFQs(params: FetchRFQsParams): Promise<Response> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `Get RFQs for Trip ID ${params.tripId}`,
      tripId: params.tripId,
      conversationHistory: params.conversationHistory,
      requestId: params.requestId,
      context: {
        conversationId: params.conversationId,
        tripId: params.tripId,
      },
      skipMessagePersistence: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`RFQ API error: ${response.status} ${response.statusText}`);
  }

  return response;
}

/**
 * Build conversation history from chat messages.
 *
 * Converts internal message format to API-expected format.
 *
 * @param messages - Array of chat messages
 * @returns Conversation history for API calls
 */
export function buildConversationHistory(
  messages: Array<{ type: 'user' | 'agent'; content: string }>
): ConversationHistoryItem[] {
  return messages.map((msg) => ({
    role: msg.type === 'user' ? 'user' : 'assistant',
    content: msg.content,
  }));
}

// =============================================================================
// EXPORTS
// =============================================================================

export const chatApi = {
  sendMessage,
  fetchRFQs,
  buildConversationHistory,
};
