/**
 * useStreamingChat - SSE Streaming Chat Hook
 *
 * Encapsulates the sendMessageWithStreaming logic from chat-interface.tsx.
 * Handles SSE connection, message streaming, and state updates.
 */

import { useCallback, useRef } from 'react';
import { parseSSEStream, extractQuotesFromSSEData, extractDeepLinkData, determineWorkflowStatus } from '../parsers';
import { convertQuotesToRFQFlights, extractRouteParts } from '../transformers';
import { WorkflowStatus, PollingConfig, SSEConfig, ToolName } from '../constants';
import type {
  ChatMessage,
  ConversationMessage,
  Quote,
  SSEParseResult,
  DeepLinkData,
  RFQFlight,
} from '../types';
import type { UseChatStateReturn } from './use-chat-state';

/**
 * Options for the streaming chat hook
 */
export interface UseStreamingChatOptions {
  /** Chat state from useChatState */
  chatState: UseChatStateReturn;
  /** Callback when quotes are received */
  onQuotesReceived?: (quotes: Quote[], flights: RFQFlight[]) => void;
  /** Callback when deep link is received */
  onDeepLinkReceived?: (data: DeepLinkData) => void;
  /** Callback when message is complete */
  onMessageComplete?: (result: SSEParseResult) => void;
  /** Callback when error occurs */
  onError?: (error: Error) => void;
  /** API endpoint */
  apiEndpoint?: string;
}

/**
 * Result of sending a message
 */
export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  quotes?: Quote[];
  flights?: RFQFlight[];
}

/**
 * Custom hook for streaming chat messages via SSE
 */
export function useStreamingChat(options: UseStreamingChatOptions) {
  const {
    chatState,
    onQuotesReceived,
    onDeepLinkReceived,
    onMessageComplete,
    onError,
    apiEndpoint = '/api/chat',
  } = options;

  const { state, actions } = chatState;
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamReaderRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  /**
   * Cancel ongoing request
   */
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (streamReaderRef.current) {
      streamReaderRef.current.cancel();
      streamReaderRef.current = null;
    }
  }, []);

  /**
   * Build conversation history for API
   */
  const buildConversationHistory = useCallback(
    (currentMessage: string): ConversationMessage[] => {
      const history = state.conversationHistory.slice(-10); // Keep last 10 messages

      return [
        ...history,
        { role: 'user' as const, content: currentMessage },
      ];
    },
    [state.conversationHistory]
  );

  /**
   * Send a message and stream the response
   */
  const sendMessage = useCallback(
    async (message: string, context?: { route?: string; date?: string }): Promise<SendMessageResult> => {
      if (!message.trim() || state.isSending) {
        return { success: false, error: 'Invalid message or already sending' };
      }

      // Cancel any existing request
      cancelRequest();

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      // Generate message ID
      const userMessageId = `user-${Date.now()}`;
      const assistantMessageId = `assistant-${Date.now()}`;

      // Reset state for new message
      actions.resetForNewMessage();
      actions.setSending(true);

      // Add user message
      const userMessage: ChatMessage = {
        id: userMessageId,
        type: 'user',
        content: message,
        timestamp: new Date(),
      };
      actions.addMessage(userMessage);

      // Add to conversation history
      actions.addToConversationHistory({ role: 'user', content: message });

      // Add placeholder assistant message
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        type: 'agent',
        content: '',
        timestamp: new Date(),
        showWorkflow: true,
      };
      actions.addMessage(assistantMessage);

      let result: SendMessageResult = { success: false };

      try {
        // Build request body
        const conversationHistory = buildConversationHistory(message);
        const requestBody = {
          message,
          conversationHistory,
          tripId: state.tripId || undefined,
        };

        // Send request
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error('No response body');
        }

        // Get stream reader
        const reader = response.body.getReader();
        streamReaderRef.current = reader;

        // Track accumulated content and extracted data
        let accumulatedContent = '';
        let extractedQuotes: Quote[] = [];
        let extractedFlights: RFQFlight[] = [];
        let extractedDeepLink: DeepLinkData | null = null;

        // Parse route from context or message
        const routeParts = extractRouteParts(context?.route || message);

        // Parse the SSE stream
        const parseResult = await parseSSEStream(
          reader,
          {
            onContent: (content, accumulated) => {
              accumulatedContent = accumulated;
              actions.appendStreamingContent(content);

              // Update assistant message
              actions.updateMessage(assistantMessageId, { content: accumulated });
            },
            onToolCall: (toolCall) => {
              // Handle tool calls for workflow status updates
              const toolName = toolCall.name;

              if (toolName === ToolName.SEARCH_FLIGHTS) {
                actions.setWorkflowStatus(WorkflowStatus.SEARCHING_AIRCRAFT, 2);
              } else if (toolName === ToolName.CREATE_TRIP || toolName === ToolName.CREATE_RFP) {
                actions.setWorkflowStatus(WorkflowStatus.REQUESTING_QUOTES, 3);
              } else if (
                toolName === ToolName.GET_QUOTES ||
                toolName === ToolName.GET_QUOTE_STATUS ||
                toolName === ToolName.GET_RFQ
              ) {
                actions.setWorkflowStatus(WorkflowStatus.ANALYZING_OPTIONS, 4);
              }

              // Extract quotes from tool call results
              if (toolCall.result) {
                const resultQuotes = (toolCall.result as any).quotes;
                if (Array.isArray(resultQuotes) && resultQuotes.length > 0) {
                  extractedQuotes = resultQuotes;
                  extractedFlights = convertQuotesToRFQFlights(resultQuotes, routeParts, context?.date);
                }
              }
            },
            onDone: (finalResult) => {
              // Extract quotes from final result
              if (finalResult.quotes && finalResult.quotes.length > 0) {
                extractedQuotes = finalResult.quotes;
                extractedFlights = convertQuotesToRFQFlights(finalResult.quotes, routeParts, context?.date);
              }

              // Extract deep link data
              if (finalResult.tripData) {
                extractedDeepLink = {
                  tripId: finalResult.tripData.trip_id,
                  deepLink: finalResult.tripData.deep_link,
                  departureAirport: finalResult.tripData.departure_airport,
                  arrivalAirport: finalResult.tripData.arrival_airport,
                  departureDate: finalResult.tripData.departure_date,
                  passengers: finalResult.tripData.passengers,
                };
              }

              if (finalResult.rfpData) {
                extractedDeepLink = {
                  tripId: finalResult.rfpData.trip_id,
                  rfpId: finalResult.rfpData.rfp_id,
                  deepLink: finalResult.rfpData.deep_link,
                  departureAirport: finalResult.rfpData.departure_airport,
                  arrivalAirport: finalResult.rfpData.arrival_airport,
                  departureDate: finalResult.rfpData.departure_date,
                  passengers: finalResult.rfpData.passengers,
                };
              }
            },
            onError: (error) => {
              actions.setError(error.message);
              onError?.(error);
            },
          },
          abortControllerRef.current.signal
        );

        // Update final message state
        actions.updateMessage(assistantMessageId, {
          content: accumulatedContent,
          showWorkflow: false,
          showDeepLink: !!extractedDeepLink,
          deepLinkData: extractedDeepLink || undefined,
          showQuotes: extractedFlights.length > 0,
        });

        // Add to conversation history
        actions.addToConversationHistory({
          role: 'assistant',
          content: accumulatedContent,
        });

        // Handle extracted quotes
        if (extractedFlights.length > 0) {
          actions.setRFQFlights(extractedFlights);
          actions.showQuotes(true);
          onQuotesReceived?.(extractedQuotes, extractedFlights);
        }

        // Handle deep link
        if (extractedDeepLink !== null) {
          const deepLink = extractedDeepLink as DeepLinkData;
          actions.setDeepLink(true, deepLink);
          if (deepLink.tripId) {
            actions.setTripId(deepLink.tripId);
          }
          onDeepLinkReceived?.(deepLink);
        }

        // Update workflow status
        if (extractedFlights.length > 0) {
          actions.setWorkflowStatus(WorkflowStatus.PROPOSAL_READY, 5);
        }

        // Call completion callback
        onMessageComplete?.(parseResult);

        result = {
          success: true,
          messageId: assistantMessageId,
          quotes: extractedQuotes,
          flights: extractedFlights,
        };
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          // Request was cancelled
          result = { success: false, error: 'Request cancelled' };
        } else {
          const err = error instanceof Error ? error : new Error(String(error));
          actions.setError(err.message);
          actions.updateMessage(assistantMessageId, {
            content: `Error: ${err.message}`,
            showWorkflow: false,
          });
          onError?.(err);
          result = { success: false, error: err.message };
        }
      } finally {
        actions.setSending(false);
        actions.clearStreaming();
        abortControllerRef.current = null;
        streamReaderRef.current = null;
      }

      return result;
    },
    [
      state.isSending,
      state.tripId,
      state.conversationHistory,
      actions,
      apiEndpoint,
      buildConversationHistory,
      cancelRequest,
      onQuotesReceived,
      onDeepLinkReceived,
      onMessageComplete,
      onError,
    ]
  );

  /**
   * Submit the current input value
   */
  const submitInput = useCallback(
    async (context?: { route?: string; date?: string }): Promise<SendMessageResult> => {
      const message = state.inputValue.trim();
      if (!message) {
        return { success: false, error: 'Empty message' };
      }
      return sendMessage(message, context);
    },
    [state.inputValue, sendMessage]
  );

  return {
    sendMessage,
    submitInput,
    cancelRequest,
    isStreaming: state.isStreaming,
    isSending: state.isSending,
    streamingContent: state.streamingContent,
  };
}

export type UseStreamingChatReturn = ReturnType<typeof useStreamingChat>;
