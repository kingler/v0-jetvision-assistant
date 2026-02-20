/**
 * useReplyPolling - Customer Reply Detection Hook (ONEK-232)
 *
 * Client-side hook that periodically checks whether a customer has
 * replied to a proposal email. When a reply is detected, fires the
 * `onReplyDetected` callback so the chat UI can display a notification.
 *
 * Uses the `/api/inbox/poll-replies` endpoint (single-request mode)
 * with exponential backoff on errors.
 *
 * @see ONEK-232
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface ReplyDetection {
  hasReply: boolean;
  replySnippet?: string;
  replyDate?: string;
}

export interface UseReplyPollingOptions {
  /** Request ID to monitor for replies */
  requestId: string | null;
  /** Whether polling is enabled (default: true) */
  enabled?: boolean;
  /** Polling interval in ms (default: 120000 = 2 minutes) */
  pollInterval?: number;
  /** Maximum backoff time in ms (default: 600000 = 10 minutes) */
  maxBackoff?: number;
  /** Called when a reply is first detected */
  onReplyDetected?: (reply: ReplyDetection) => void;
}

export interface ReplyPollingState {
  isPolling: boolean;
  lastCheckTime: number | null;
  replyDetected: boolean;
  replySnippet: string | null;
  replyDate: string | null;
  errorCount: number;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_POLL_INTERVAL = 120_000; // 2 minutes
const DEFAULT_MAX_BACKOFF = 600_000; // 10 minutes

// =============================================================================
// Hook
// =============================================================================

export function useReplyPolling(options: UseReplyPollingOptions) {
  const {
    requestId,
    enabled = true,
    pollInterval = DEFAULT_POLL_INTERVAL,
    maxBackoff = DEFAULT_MAX_BACKOFF,
    onReplyDetected,
  } = options;

  const [state, setState] = useState<ReplyPollingState>({
    isPolling: false,
    lastCheckTime: null,
    replyDetected: false,
    replySnippet: null,
    replyDate: null,
    errorCount: 0,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCheckingRef = useRef(false);
  const replyDetectedRef = useRef(false);
  const errorCountRef = useRef(0);
  const onReplyDetectedRef = useRef(onReplyDetected);
  onReplyDetectedRef.current = onReplyDetected;

  /**
   * Calculate backoff interval
   */
  const getInterval = useCallback(
    (errCount: number): number => {
      if (errCount === 0) return pollInterval;
      return Math.min(pollInterval * Math.pow(2, errCount), maxBackoff);
    },
    [pollInterval, maxBackoff]
  );

  /**
   * Execute a single check
   */
  const checkForReply = useCallback(async () => {
    if (!requestId || isCheckingRef.current || replyDetectedRef.current) {
      return;
    }

    isCheckingRef.current = true;
    setState((prev) => ({ ...prev, isPolling: true }));

    try {
      const res = await fetch('/api/inbox/poll-replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      if (data.results?.[0]?.hasReply) {
        const result = data.results[0];
        replyDetectedRef.current = true;
        errorCountRef.current = 0;

        setState((prev) => ({
          ...prev,
          isPolling: false,
          lastCheckTime: Date.now(),
          replyDetected: true,
          replySnippet: result.replySnippet || null,
          replyDate: result.replyDate || null,
          errorCount: 0,
        }));

        // Stop polling
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        onReplyDetectedRef.current?.({
          hasReply: true,
          replySnippet: result.replySnippet,
          replyDate: result.replyDate,
        });
      } else {
        errorCountRef.current = 0;
        setState((prev) => ({
          ...prev,
          isPolling: false,
          lastCheckTime: Date.now(),
          errorCount: 0,
        }));
      }
    } catch (error) {
      console.error('[useReplyPolling] Check failed:', error);
      errorCountRef.current += 1;
      const newErrorCount = errorCountRef.current;

      setState((prev) => ({
        ...prev,
        isPolling: false,
        lastCheckTime: Date.now(),
        errorCount: newErrorCount,
      }));

      // Reschedule with backoff (don't rely on state dep to avoid loops)
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      const backoff = getInterval(newErrorCount);
      intervalRef.current = setInterval(checkForReply, backoff);
    } finally {
      isCheckingRef.current = false;
    }
  }, [requestId, getInterval]);

  /**
   * Manually trigger a check
   */
  const checkNow = useCallback(async () => {
    await checkForReply();
  }, [checkForReply]);

  /**
   * Auto-start/stop polling based on enabled + requestId
   */
  useEffect(() => {
    // Cleanup previous interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!enabled || !requestId || replyDetectedRef.current) {
      return;
    }

    // Initial check
    checkForReply();

    // Set up recurring interval
    intervalRef.current = setInterval(checkForReply, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, requestId, checkForReply, pollInterval]);

  return {
    ...state,
    checkNow,
  };
}

export type UseReplyPollingReturn = ReturnType<typeof useReplyPolling>;
