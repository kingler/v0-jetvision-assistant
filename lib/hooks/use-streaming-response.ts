'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * SSE Event Types
 */
type SSEEventType = 'text' | 'tool_call' | 'error' | 'done';

/**
 * SSE Event Data Structure
 */
interface SSEEvent {
  type: SSEEventType;
  content?: string;
  toolName?: string;
  arguments?: Record<string, unknown>;
  message?: string;
  requestId?: string;
}

/**
 * Tool Call Data
 */
interface ToolCallData {
  toolName: string;
  arguments: Record<string, unknown>;
}

/**
 * Streaming Request Payload
 */
interface StreamingRequestPayload {
  requestId: string;
  sessionId?: string;
  [key: string]: unknown;
}

/**
 * Stream Metadata
 */
interface StreamMetadata {
  requestId: string | null;
  tokensReceived: number;
  duration: number;
}

/**
 * Hook Options
 */
interface UseStreamingResponseOptions {
  onToolCall?: (data: ToolCallData) => void;
  onComplete?: (result: { data: string; requestId?: string }) => void;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Hook Return Type
 */
interface UseStreamingResponseReturn {
  data: string;
  isStreaming: boolean;
  error: string | null;
  isComplete: boolean;
  metadata: StreamMetadata;
  startStreaming: (url: string, payload: StreamingRequestPayload) => Promise<void>;
  abort: () => void;
}

/**
 * useStreamingResponse Hook
 *
 * Custom React hook for consuming Server-Sent Events (SSE) streaming responses
 * from the Responses API endpoint.
 *
 * Features:
 * - SSE connection management with fetch + ReadableStream
 * - Token-by-token state updates
 * - AbortController integration for cancellation
 * - Automatic reconnection logic for network errors
 * - Support for multiple event types: text, tool_call, error, done
 *
 * @param options - Configuration options
 * @returns Hook state and control functions
 *
 * @example
 * ```tsx
 * const { data, isStreaming, startStreaming, abort } = useStreamingResponse({
 *   onToolCall: (toolData) => console.log('Tool called:', toolData),
 *   onComplete: (result) => console.log('Completed:', result),
 *   maxRetries: 3,
 *   retryDelay: 1000,
 * });
 *
 * // Start streaming
 * await startStreaming('/api/responses/stream', {
 *   requestId: 'req-123',
 *   sessionId: 'session-456',
 * });
 *
 * // Abort streaming
 * abort();
 * ```
 */
export function useStreamingResponse(
  options: UseStreamingResponseOptions = {}
): UseStreamingResponseReturn {
  const {
    onToolCall,
    onComplete,
    maxRetries = 3,
    retryDelay = 1000,
  } = options;

  // State
  const [data, setData] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [metadata, setMetadata] = useState<StreamMetadata>({
    requestId: null,
    tokensReceived: 0,
    duration: 0,
  });

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);
  const retryCountRef = useRef<number>(0);
  const dataRef = useRef<string>('');

  /**
   * Abort the current streaming request
   */
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  }, []);

  /**
   * Parse SSE event line
   */
  const parseSSELine = useCallback((line: string): { field: string; value: string } | null => {
    if (!line || line.startsWith(':')) {
      // Empty line or comment
      return null;
    }

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      return { field: line, value: '' };
    }

    const field = line.substring(0, colonIndex);
    let value = line.substring(colonIndex + 1);

    // Remove leading space if present
    if (value.startsWith(' ')) {
      value = value.substring(1);
    }

    return { field, value };
  }, []);

  /**
   * Process SSE event
   */
  const processSSEEvent = useCallback(
    (eventData: string) => {
      try {
        const event: SSEEvent = JSON.parse(eventData);

        switch (event.type) {
          case 'text':
            if (event.content) {
              dataRef.current += event.content;
              setData(dataRef.current);
              setMetadata((prev) => ({
                ...prev,
                tokensReceived: prev.tokensReceived + 1,
              }));
            }
            break;

          case 'tool_call':
            if (event.toolName && onToolCall) {
              onToolCall({
                toolName: event.toolName,
                arguments: event.arguments || {},
              });
            }
            break;

          case 'error':
            setError(event.message || 'Unknown error occurred');
            setIsStreaming(false);
            break;

          case 'done':
            const duration = Date.now() - startTimeRef.current;
            setMetadata((prev) => ({
              ...prev,
              duration,
            }));
            setIsComplete(true);
            setIsStreaming(false);
            if (onComplete) {
              onComplete({
                data: dataRef.current,
                requestId: event.requestId,
              });
            }
            break;
        }
      } catch (err) {
        // Silently skip malformed JSON
        console.warn('Failed to parse SSE event:', eventData, err);
      }
    },
    [data, onToolCall, onComplete]
  );

  /**
   * Process SSE stream
   */
  const processStream = useCallback(
    async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
      const decoder = new TextDecoder();
      let buffer = '';
      let eventData = '';

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');

          // Keep the last incomplete line in buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            const parsed = parseSSELine(line);

            if (!parsed) {
              // Empty line indicates end of event
              if (eventData) {
                processSSEEvent(eventData);
                eventData = '';
              }
              continue;
            }

            const { field, value } = parsed;

            if (field === 'data') {
              // Accumulate multi-line data
              eventData += value;
            }
            // Ignore other fields (id, retry, event)
          }
        }

        // Process any remaining event data
        if (eventData) {
          processSSEEvent(eventData);
        }

        // If stream ended without explicit done event, mark as complete
        const duration = Date.now() - startTimeRef.current;
        setMetadata((prev) => ({
          ...prev,
          duration,
        }));
        setIsComplete(true);
        setIsStreaming(false);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          throw err;
        }
      } finally {
        reader.releaseLock();
      }
    },
    [parseSSELine, processSSEEvent]
  );

  /**
   * Start streaming from the API
   */
  const startStreaming = useCallback(
    async (url: string, payload: StreamingRequestPayload) => {
      // Abort any existing stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Reset state
      setData('');
      dataRef.current = '';
      setError(null);
      setIsComplete(false);
      setIsStreaming(true);
      setMetadata({
        requestId: payload.requestId,
        tokensReceived: 0,
        duration: 0,
      });
      startTimeRef.current = Date.now();
      retryCountRef.current = 0;

      // Create new abort controller
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const attemptStream = async (retryCount: number): Promise<void> => {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });

          if (!response.ok) {
            const errorMessage = `HTTP ${response.status}: ${response.statusText}`;

            // Don't retry on client errors (4xx)
            if (response.status >= 400 && response.status < 500) {
              setError(errorMessage);
              setIsStreaming(false);
              return;
            }

            throw new Error(errorMessage);
          }

          if (!response.body) {
            throw new Error('Response body is null');
          }

          const reader = response.body.getReader();
          await processStream(reader);

          // Update duration
          const duration = Date.now() - startTimeRef.current;
          setMetadata((prev) => ({
            ...prev,
            duration,
          }));
        } catch (err) {
          const error = err as Error;

          // Don't set error for aborts
          if (error.name === 'AbortError') {
            return;
          }

          // Retry on network errors
          if (retryCount < maxRetries) {
            retryCountRef.current = retryCount + 1;
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
            return attemptStream(retryCount + 1);
          }

          // Max retries exceeded
          setError(error.message);
          setIsStreaming(false);
        }
      };

      await attemptStream(0);
    },
    [maxRetries, retryDelay, processStream]
  );

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    isStreaming,
    error,
    isComplete,
    metadata,
    startStreaming,
    abort,
  };
}
