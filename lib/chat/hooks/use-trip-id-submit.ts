/**
 * useTripIdSubmit - Trip ID Submission Hook
 *
 * Encapsulates the handleTripIdSubmit logic from chat-interface.tsx.
 * Handles RFQ fetching, quote processing, and state updates.
 */

import { useCallback, useRef, useState } from 'react';
import { parseSSEStream, extractQuotesFromSSEData } from '../parsers';
import {
  convertQuoteToRFQFlight,
  convertRfqToRFQFlight,
  mergeQuoteDetailsIntoFlights,
  extractRouteParts,
} from '../transformers';
import { WorkflowStatus, RFQStatus, PollingConfig, ToolName } from '../constants';
import type {
  ChatMessage,
  Quote,
  RFQFlight,
  RFQItem,
  QuoteDetailsMap,
  DeepLinkData,
  SSEParseResult,
} from '../types';
import type { UseChatStateReturn } from './use-chat-state';

/**
 * Options for the trip ID submit hook
 */
export interface UseTripIdSubmitOptions {
  /** Chat state from useChatState */
  chatState: UseChatStateReturn;
  /** Callback when RFQs are loaded */
  onRFQsLoaded?: (flights: RFQFlight[]) => void;
  /** Callback when quotes are updated */
  onQuotesUpdated?: (flights: RFQFlight[]) => void;
  /** Callback when error occurs */
  onError?: (error: Error) => void;
  /** API endpoint */
  apiEndpoint?: string;
}

/**
 * Result of trip ID submission
 */
export interface TripIdSubmitResult {
  success: boolean;
  flights?: RFQFlight[];
  error?: string;
}

/**
 * Custom hook for handling trip ID submission and RFQ loading
 */
export function useTripIdSubmit(options: UseTripIdSubmitOptions) {
  const {
    chatState,
    onRFQsLoaded,
    onQuotesUpdated,
    onError,
    apiEndpoint = '/api/chat',
  } = options;

  const { state, actions } = chatState;
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Cancel ongoing request
   */
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * Fetch quote details for a specific quote ID
   */
  const fetchQuoteDetails = useCallback(
    async (quoteId: string): Promise<Quote | null> => {
      try {
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `get_quote ${quoteId}`,
            tripId: state.tripId,
          }),
        });

        if (!response.ok) {
          console.warn(`Failed to fetch quote details for ${quoteId}`);
          return null;
        }

        if (!response.body) {
          return null;
        }

        const reader = response.body.getReader();
        let quoteDetails: Quote | null = null;

        await parseSSEStream(reader, {
          onDone: (result) => {
            // Look for quote details in tool calls
            for (const toolCall of result.toolCalls) {
              if (toolCall.name === ToolName.GET_QUOTE && toolCall.result) {
                const res = toolCall.result as Record<string, unknown>;
                if (res.quote) {
                  quoteDetails = res.quote as Quote;
                  break;
                }
              }
            }
          },
        });

        return quoteDetails;
      } catch (error) {
        console.warn(`Error fetching quote details for ${quoteId}:`, error);
        return null;
      }
    },
    [apiEndpoint, state.tripId]
  );

  /**
   * Process RFQ items and extract flights
   */
  const processRFQItems = useCallback(
    async (
      rfqs: RFQItem[],
      routeParts: [string, string],
      date?: string
    ): Promise<{ flights: RFQFlight[]; quoteDetails: QuoteDetailsMap }> => {
      const flights: RFQFlight[] = [];
      const quoteDetails: QuoteDetailsMap = {};

      for (const rfq of rfqs) {
        // Check if RFQ has quotes
        const rfqQuotes = rfq.quotes || [];

        if (rfqQuotes.length > 0) {
          // Process quotes
          for (const quote of rfqQuotes) {
            const flight = convertQuoteToRFQFlight(quote, routeParts, date);
            if (flight) {
              flights.push(flight);

              // Store quote details
              const quoteId = quote.quote_id || quote.quoteId || quote.id;
              if (quoteId) {
                quoteDetails[quoteId] = quote;
              }
            }
          }
        } else {
          // Create placeholder flight for RFQ without quotes
          const flight = convertRfqToRFQFlight(rfq, routeParts, date);
          flights.push(flight);
        }
      }

      return { flights, quoteDetails };
    },
    []
  );

  /**
   * Submit a trip ID and fetch RFQ data
   */
  const submitTripId = useCallback(
    async (
      tripId: string,
      context?: { route?: string; date?: string }
    ): Promise<TripIdSubmitResult> => {
      if (!tripId.trim() || isSubmitting) {
        return { success: false, error: 'Invalid trip ID or already submitting' };
      }

      // Cancel any existing request
      cancelRequest();

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      setIsSubmitting(true);
      actions.setLoading(true);
      actions.setTripId(tripId);
      actions.setWorkflowStatus(WorkflowStatus.REQUESTING_QUOTES, 3);

      // Generate message ID for status updates
      const statusMessageId = `status-${Date.now()}`;
      const statusMessage: ChatMessage = {
        id: statusMessageId,
        type: 'agent',
        content: 'Fetching RFQ data...',
        timestamp: new Date(),
        showWorkflow: true,
      };
      actions.addMessage(statusMessage);

      let result: TripIdSubmitResult = { success: false };

      try {
        // Send request to fetch RFQs
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `get_rfq ${tripId}`,
            tripId,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error('No response body');
        }

        const reader = response.body.getReader();

        // Track extracted data
        let extractedRFQs: RFQItem[] = [];
        let extractedQuotes: Quote[] = [];
        let accumulatedContent = '';
        let deepLinkData: DeepLinkData | null = null;

        // Parse route from context
        const routeParts = extractRouteParts(context?.route);

        // Parse the SSE stream
        await parseSSEStream(
          reader,
          {
            onContent: (content, accumulated) => {
              accumulatedContent = accumulated;
              actions.updateMessage(statusMessageId, { content: accumulated });
            },
            onToolCall: (toolCall) => {
              if (toolCall.name === ToolName.GET_RFQ && toolCall.result) {
                const res = toolCall.result as Record<string, unknown>;

                // Extract RFQs
                if (res.rfqs && Array.isArray(res.rfqs)) {
                  extractedRFQs = res.rfqs as RFQItem[];
                }

                // Extract quotes
                if (res.quotes && Array.isArray(res.quotes)) {
                  extractedQuotes = res.quotes as Quote[];
                }

                // Extract deep link
                if (res.trip_id || res.deep_link) {
                  deepLinkData = {
                    tripId: res.trip_id as string,
                    deepLink: res.deep_link as string,
                    departureAirport: res.departure_airport as any,
                    arrivalAirport: res.arrival_airport as any,
                    departureDate: (res.route as any)?.departure?.date || res.departure_date as string,
                    passengers: res.passengers as number,
                  };
                }
              }
            },
            onDone: (finalResult) => {
              // Check for quotes in final result
              if (finalResult.quotes && finalResult.quotes.length > 0) {
                extractedQuotes = finalResult.quotes;
              }

              // Check rfqData
              if (finalResult.rfqData?.rfqs) {
                extractedRFQs = finalResult.rfqData.rfqs;
              }
            },
            onError: (error) => {
              actions.setError(error.message);
              onError?.(error);
            },
          },
          abortControllerRef.current.signal
        );

        // Process RFQ items
        const { flights, quoteDetails } = await processRFQItems(
          extractedRFQs,
          routeParts,
          context?.date
        );

        // Also convert direct quotes
        for (const quote of extractedQuotes) {
          const flight = convertQuoteToRFQFlight(quote, routeParts, context?.date);
          if (flight && !flights.some((f) => f.id === flight.id)) {
            flights.push(flight);

            const quoteId = quote.quote_id || quote.quoteId || quote.id;
            if (quoteId) {
              quoteDetails[quoteId] = quote;
            }
          }
        }

        // Merge quote details to ensure accurate status
        const mergedFlights = mergeQuoteDetailsIntoFlights(flights, quoteDetails);

        // Update state
        actions.setRFQFlights(mergedFlights);
        actions.setQuoteDetails(quoteDetails);

        if (deepLinkData) {
          actions.setDeepLink(true, deepLinkData);
        }

        // Update status message
        const quotedCount = mergedFlights.filter((f) => f.rfqStatus === RFQStatus.QUOTED).length;
        const summaryContent =
          mergedFlights.length > 0
            ? `Found ${mergedFlights.length} RFQ(s) with ${quotedCount} quote(s).`
            : 'No RFQs found for this trip.';

        actions.updateMessage(statusMessageId, {
          content: accumulatedContent || summaryContent,
          showWorkflow: false,
          showQuotes: mergedFlights.length > 0,
        });

        // Update workflow status
        if (quotedCount > 0) {
          actions.setWorkflowStatus(WorkflowStatus.ANALYZING_OPTIONS, 4);
        } else if (mergedFlights.length > 0) {
          actions.setWorkflowStatus(WorkflowStatus.REQUESTING_QUOTES, 3);
        }

        // Show quotes if available
        if (mergedFlights.length > 0) {
          actions.showQuotes(true);
          onRFQsLoaded?.(mergedFlights);
        }

        result = {
          success: true,
          flights: mergedFlights,
        };
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          result = { success: false, error: 'Request cancelled' };
        } else {
          const err = error instanceof Error ? error : new Error(String(error));
          actions.setError(err.message);
          actions.updateMessage(statusMessageId, {
            content: `Error: ${err.message}`,
            showWorkflow: false,
          });
          onError?.(err);
          result = { success: false, error: err.message };
        }
      } finally {
        setIsSubmitting(false);
        actions.setLoading(false);
        abortControllerRef.current = null;
      }

      return result;
    },
    [
      isSubmitting,
      actions,
      apiEndpoint,
      cancelRequest,
      processRFQItems,
      onRFQsLoaded,
      onError,
    ]
  );

  /**
   * Refresh quote data for existing RFQ flights
   */
  const refreshQuotes = useCallback(async (): Promise<TripIdSubmitResult> => {
    if (!state.tripId) {
      return { success: false, error: 'No trip ID set' };
    }

    actions.setPolling(true);

    try {
      const result = await submitTripId(state.tripId);

      if (result.success && result.flights) {
        onQuotesUpdated?.(result.flights);
      }

      return result;
    } finally {
      actions.setPolling(false);
    }
  }, [state.tripId, submitTripId, actions, onQuotesUpdated]);

  /**
   * Fetch detailed quote information for flights
   */
  const fetchDetailedQuotes = useCallback(
    async (flightIds?: string[]): Promise<void> => {
      const flights = flightIds
        ? state.rfqFlights.filter((f) => flightIds.includes(f.id))
        : state.rfqFlights;

      const quotesToFetch = flights.filter(
        (f) =>
          f.rfqStatus === RFQStatus.QUOTED &&
          !state.quoteDetailsMap[f.quoteId]
      );

      if (quotesToFetch.length === 0) {
        return;
      }

      actions.setLoading(true);

      try {
        const fetchPromises = quotesToFetch.map((flight) =>
          fetchQuoteDetails(flight.quoteId).then((details) => ({
            quoteId: flight.quoteId,
            details,
          }))
        );

        const results = await Promise.allSettled(fetchPromises);

        const newQuoteDetails: QuoteDetailsMap = {};
        for (const result of results) {
          if (result.status === 'fulfilled' && result.value.details) {
            newQuoteDetails[result.value.quoteId] = result.value.details;
          }
        }

        if (Object.keys(newQuoteDetails).length > 0) {
          // Merge new details
          const updatedDetails = { ...state.quoteDetailsMap, ...newQuoteDetails };
          actions.setQuoteDetails(updatedDetails);

          // Update flights with new details
          const updatedFlights = mergeQuoteDetailsIntoFlights(
            state.rfqFlights,
            updatedDetails
          );
          actions.setRFQFlights(updatedFlights);
          onQuotesUpdated?.(updatedFlights);
        }
      } catch (error) {
        console.error('Error fetching detailed quotes:', error);
      } finally {
        actions.setLoading(false);
      }
    },
    [
      state.rfqFlights,
      state.quoteDetailsMap,
      actions,
      fetchQuoteDetails,
      onQuotesUpdated,
    ]
  );

  return {
    submitTripId,
    refreshQuotes,
    fetchDetailedQuotes,
    cancelRequest,
    isSubmitting,
  };
}

export type UseTripIdSubmitReturn = ReturnType<typeof useTripIdSubmit>;
