/**
 * useRFQPolling - RFQ Quote Polling Hook
 *
 * Handles periodic polling of RFQ quotes to detect new quotes
 * and status changes. Includes rate limiting and backoff logic.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { PollingConfig, RFQStatus } from '../constants';
import type { RFQFlight } from '../types';
import type { UseTripIdSubmitReturn } from './use-trip-id-submit';
import type { UseChatStateReturn } from './use-chat-state';

/**
 * Options for the RFQ polling hook
 */
export interface UseRFQPollingOptions {
  /** Chat state from useChatState */
  chatState: UseChatStateReturn;
  /** Trip ID submit hook */
  tripIdSubmit: UseTripIdSubmitReturn;
  /** Polling interval in milliseconds */
  pollInterval?: number;
  /** Minimum polling interval */
  minPollInterval?: number;
  /** Maximum backoff time for rate limiting */
  maxBackoffTime?: number;
  /** Whether polling is enabled */
  enabled?: boolean;
  /** Callback when new quotes are detected */
  onNewQuotes?: (newQuotes: RFQFlight[]) => void;
  /** Callback when quote status changes */
  onStatusChange?: (flight: RFQFlight, previousStatus: string) => void;
}

/**
 * Polling state
 */
export interface PollingState {
  isPolling: boolean;
  lastPollTime: number | null;
  pollCount: number;
  errorCount: number;
  currentInterval: number;
}

/**
 * Custom hook for polling RFQ quotes
 */
export function useRFQPolling(options: UseRFQPollingOptions) {
  const {
    chatState,
    tripIdSubmit,
    pollInterval = PollingConfig.RFQ_POLL_INTERVAL_MS,
    minPollInterval = PollingConfig.MIN_POLL_INTERVAL_MS,
    maxBackoffTime = PollingConfig.MAX_RATE_LIMIT_BACKOFF_MS,
    enabled = true,
    onNewQuotes,
    onStatusChange,
  } = options;

  const { state, actions } = chatState;
  const { refreshQuotes } = tripIdSubmit;

  // Polling state
  const [pollingState, setPollingState] = useState<PollingState>({
    isPolling: false,
    lastPollTime: null,
    pollCount: 0,
    errorCount: 0,
    currentInterval: pollInterval,
  });

  // Refs
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousFlightsRef = useRef<Map<string, RFQFlight>>(new Map());
  const isPollingRef = useRef(false);

  /**
   * Calculate backoff interval based on error count
   */
  const calculateBackoffInterval = useCallback(
    (errorCount: number): number => {
      if (errorCount === 0) {
        return pollInterval;
      }

      // Exponential backoff: interval * 2^errorCount, capped at max
      const backoff = Math.min(
        pollInterval * Math.pow(2, errorCount),
        maxBackoffTime
      );

      return Math.max(backoff, minPollInterval);
    },
    [pollInterval, minPollInterval, maxBackoffTime]
  );

  /**
   * Detect changes between previous and current flights
   */
  const detectChanges = useCallback(
    (currentFlights: RFQFlight[]): {
      newQuotes: RFQFlight[];
      statusChanges: Array<{ flight: RFQFlight; previousStatus: string }>;
    } => {
      const newQuotes: RFQFlight[] = [];
      const statusChanges: Array<{ flight: RFQFlight; previousStatus: string }> = [];

      for (const flight of currentFlights) {
        const previous = previousFlightsRef.current.get(flight.id);

        if (!previous) {
          // New flight/quote
          if (flight.rfqStatus === RFQStatus.QUOTED) {
            newQuotes.push(flight);
          }
        } else if (previous.rfqStatus !== flight.rfqStatus) {
          // Status changed
          statusChanges.push({
            flight,
            previousStatus: previous.rfqStatus,
          });

          // If changed to quoted, it's also a new quote
          if (
            flight.rfqStatus === RFQStatus.QUOTED &&
            previous.rfqStatus !== RFQStatus.QUOTED
          ) {
            newQuotes.push(flight);
          }
        }
      }

      // Update previous flights map
      previousFlightsRef.current = new Map(
        currentFlights.map((f) => [f.id, f])
      );

      return { newQuotes, statusChanges };
    },
    []
  );

  /**
   * Execute a single poll
   */
  const executePoll = useCallback(async (): Promise<void> => {
    // Prevent concurrent polls
    if (isPollingRef.current) {
      return;
    }

    isPollingRef.current = true;
    setPollingState((prev) => ({ ...prev, isPolling: true }));

    try {
      const result = await refreshQuotes();

      if (result.success && result.flights) {
        // Detect changes
        const { newQuotes, statusChanges } = detectChanges(result.flights);

        // Notify of new quotes
        if (newQuotes.length > 0) {
          onNewQuotes?.(newQuotes);
        }

        // Notify of status changes
        for (const change of statusChanges) {
          onStatusChange?.(change.flight, change.previousStatus);
        }

        // Reset error count on success
        setPollingState((prev) => ({
          ...prev,
          isPolling: false,
          lastPollTime: Date.now(),
          pollCount: prev.pollCount + 1,
          errorCount: 0,
          currentInterval: pollInterval,
        }));
      } else {
        // Handle failure
        setPollingState((prev) => {
          const newErrorCount = prev.errorCount + 1;
          return {
            ...prev,
            isPolling: false,
            lastPollTime: Date.now(),
            pollCount: prev.pollCount + 1,
            errorCount: newErrorCount,
            currentInterval: calculateBackoffInterval(newErrorCount),
          };
        });
      }
    } catch (error) {
      console.error('Polling error:', error);
      setPollingState((prev) => {
        const newErrorCount = prev.errorCount + 1;
        return {
          ...prev,
          isPolling: false,
          lastPollTime: Date.now(),
          errorCount: newErrorCount,
          currentInterval: calculateBackoffInterval(newErrorCount),
        };
      });
    } finally {
      isPollingRef.current = false;
    }
  }, [
    refreshQuotes,
    detectChanges,
    pollInterval,
    calculateBackoffInterval,
    onNewQuotes,
    onStatusChange,
  ]);

  /**
   * Start polling
   */
  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      return; // Already polling
    }

    // Initialize previous flights map
    previousFlightsRef.current = new Map(
      state.rfqFlights.map((f) => [f.id, f])
    );

    // Execute first poll immediately
    executePoll();

    // Set up interval
    intervalRef.current = setInterval(() => {
      executePoll();
    }, pollingState.currentInterval);
  }, [state.rfqFlights, executePoll, pollingState.currentInterval]);

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isPollingRef.current = false;
    setPollingState((prev) => ({ ...prev, isPolling: false }));
  }, []);

  /**
   * Reset polling state
   */
  const resetPolling = useCallback(() => {
    stopPolling();
    setPollingState({
      isPolling: false,
      lastPollTime: null,
      pollCount: 0,
      errorCount: 0,
      currentInterval: pollInterval,
    });
    previousFlightsRef.current = new Map();
  }, [stopPolling, pollInterval]);

  /**
   * Manually trigger a poll
   */
  const pollNow = useCallback(async (): Promise<void> => {
    // Stop regular polling temporarily
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    await executePoll();

    // Restart polling if enabled
    if (enabled && state.tripId) {
      intervalRef.current = setInterval(() => {
        executePoll();
      }, pollingState.currentInterval);
    }
  }, [enabled, state.tripId, executePoll, pollingState.currentInterval]);

  // Auto-start/stop polling based on enabled and tripId
  useEffect(() => {
    if (enabled && state.tripId && state.rfqFlights.length > 0) {
      // Only poll if we have RFQs that need updates
      const hasUnansweredRFQs = state.rfqFlights.some(
        (f) =>
          f.rfqStatus === RFQStatus.SENT ||
          f.rfqStatus === RFQStatus.UNANSWERED
      );

      if (hasUnansweredRFQs) {
        startPolling();
      } else {
        stopPolling();
      }
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [
    enabled,
    state.tripId,
    state.rfqFlights,
    startPolling,
    stopPolling,
  ]);

  // Update interval when it changes
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        executePoll();
      }, pollingState.currentInterval);
    }
  }, [pollingState.currentInterval, executePoll]);

  return {
    pollingState,
    startPolling,
    stopPolling,
    resetPolling,
    pollNow,
    isPolling: pollingState.isPolling,
  };
}

export type UseRFQPollingReturn = ReturnType<typeof useRFQPolling>;
