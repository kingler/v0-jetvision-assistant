/**
 * Client-Side Streaming Response Hook
 * Consumes SSE streams from /api/chat/respond endpoint
 * Provides real-time token updates and tool call handling
 */

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * SSE message types from server
 */
type SSEMessageType =
  | 'token'
  | 'tool_call_start'
  | 'tool_call_progress'
  | 'tool_call_complete'
  | 'tool_call_retry'
  | 'tool_call_result'
  | 'tool_call_error'
  | 'workflow_update'
  | 'complete'
  | 'error';

interface SSEMessage {
  type: SSEMessageType;
  data: unknown;
}

/**
 * Tool call tracking
 */
interface ToolCall {
  id: string;
  name: string;
  status: 'starting' | 'in_progress' | 'complete' | 'error';
  arguments?: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

/**
 * Streaming state
 */
type StreamingState = 'idle' | 'connecting' | 'streaming' | 'completed' | 'error';

/**
 * Hook options
 */
interface UseStreamingResponseOptions {
  endpoint?: string;
  onToken?: (token: string) => void;
  onToolCall?: (toolCall: ToolCall) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
  autoConnect?: boolean;
}

/**
 * Hook return value
 */
interface UseStreamingResponseReturn {
  // State
  content: string;
  state: StreamingState;
  error: string | null;
  toolCalls: ToolCall[];
  isStreaming: boolean;

  // Actions
  startStreaming: (body: Record<string, unknown>) => Promise<void>;
  stopStreaming: () => void;
  reset: () => void;
}

/**
 * Custom hook for consuming SSE streaming responses
 */
export function useStreamingResponse(
  options: UseStreamingResponseOptions = {}
): UseStreamingResponseReturn {
  const {
    endpoint = '/api/chat/respond',
    onToken,
    onToolCall,
    onComplete,
    onError,
    autoConnect = false,
  } = options;

  // State
  const [content, setContent] = useState<string>('');
  const [state, setState] = useState<StreamingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);

  // Refs for abort control and reconnection
  const abortControllerRef = useRef<AbortController | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  /**
   * Parse SSE data line
   */
  const parseSSEMessage = useCallback((line: string): SSEMessage | null => {
    if (!line.startsWith('data: ')) return null;

    try {
      const jsonStr = line.slice(6); // Remove 'data: ' prefix
      return JSON.parse(jsonStr) as SSEMessage;
    } catch (err) {
      console.error('[useStreamingResponse] Failed to parse SSE message:', err);
      return null;
    }
  }, []);

  /**
   * Handle SSE message
   */
  const handleMessage = useCallback(
    (message: SSEMessage) => {
      switch (message.type) {
        case 'token': {
          const tokenData = message.data as { token: string };
          setContent((prev) => prev + tokenData.token);
          if (onToken) {
            onToken(tokenData.token);
          }
          break;
        }

        case 'tool_call_start': {
          const toolData = message.data as { toolCallId: string; toolName: string };
          const newToolCall: ToolCall = {
            id: toolData.toolCallId,
            name: toolData.toolName,
            status: 'starting',
          };
          setToolCalls((prev) => [...prev, newToolCall]);
          if (onToolCall) {
            onToolCall(newToolCall);
          }
          break;
        }

        case 'tool_call_progress': {
          const toolData = message.data as { toolCallId: string; toolName: string };
          setToolCalls((prev) =>
            prev.map((tc) =>
              tc.id === toolData.toolCallId ? { ...tc, status: 'in_progress' as const } : tc
            )
          );
          break;
        }

        case 'tool_call_complete': {
          const toolData = message.data as {
            toolCallId: string;
            toolName: string;
            arguments: Record<string, unknown>;
            result?: unknown;
          };
          setToolCalls((prev) =>
            prev.map((tc) =>
              tc.id === toolData.toolCallId
                ? {
                    ...tc,
                    status: 'complete' as const,
                    arguments: toolData.arguments,
                    result: toolData.result,
                  }
                : tc
            )
          );
          const updatedToolCall = toolCalls.find((tc) => tc.id === toolData.toolCallId);
          if (updatedToolCall && onToolCall) {
            onToolCall({ ...updatedToolCall, status: 'complete' });
          }
          break;
        }

        case 'tool_call_retry': {
          const retryData = message.data as {
            toolName: string;
            attempt: number;
            maxRetries: number;
            nextRetryDelay: number;
            error: string;
          };
          console.log(
            `[useStreamingResponse] Tool retry: ${retryData.toolName} (attempt ${retryData.attempt}/${retryData.maxRetries}) in ${retryData.nextRetryDelay}ms`
          );
          // Could emit to parent component if needed
          break;
        }

        case 'tool_call_result': {
          const resultData = message.data as {
            toolName: string;
            result: string;
          };
          console.log(`[useStreamingResponse] Tool result: ${resultData.toolName}`);
          // Tool result is already handled in tool_call_complete
          break;
        }

        case 'tool_call_error': {
          const errorData = message.data as {
            toolName: string;
            error: string;
          };
          console.error(`[useStreamingResponse] Tool error: ${errorData.toolName}`, errorData.error);
          setToolCalls((prev) =>
            prev.map((tc) =>
              tc.name === errorData.toolName
                ? {
                    ...tc,
                    status: 'error' as const,
                    error: errorData.error,
                  }
                : tc
            )
          );
          break;
        }

        case 'workflow_update': {
          // Workflow updates can be handled by parent component via onWorkflowUpdate callback
          // For now, just log
          console.log('[useStreamingResponse] Workflow update:', message.data);
          break;
        }

        case 'complete': {
          setState('completed');
          if (onComplete) {
            onComplete();
          }
          break;
        }

        case 'error': {
          const errorData = message.data as { error: string };
          setError(errorData.error);
          setState('error');
          if (onError) {
            onError(errorData.error);
          }
          break;
        }

        default:
          console.warn('[useStreamingResponse] Unknown message type:', message.type);
      }
    },
    [onToken, onToolCall, onComplete, onError, toolCalls]
  );

  /**
   * Start streaming
   */
  const startStreaming = useCallback(
    async (body: Record<string, unknown>) => {
      // Reset state
      setContent('');
      setError(null);
      setToolCalls([]);
      setState('connecting');

      // Create abort controller
      abortControllerRef.current = new AbortController();

      try {
        // Start SSE connection using fetch with streaming
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error('Response body is null');
        }

        setState('streaming');

        // Read stream
        const reader = response.body.getReader();
        readerRef.current = reader;

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          // Decode chunk and add to buffer
          buffer += decoder.decode(value, { stream: true });

          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.trim() === '') continue;

            const message = parseSSEMessage(line);
            if (message) {
              handleMessage(message);
            }
          }
        }

        // Process any remaining buffer
        if (buffer.trim()) {
          const message = parseSSEMessage(buffer);
          if (message) {
            handleMessage(message);
          }
        }

        // If we reach here without completion message, mark as completed
        if (state !== 'completed' && state !== 'error') {
          setState('completed');
          if (onComplete) {
            onComplete();
          }
        }
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('[useStreamingResponse] Stream aborted by user');
          setState('idle');
          return;
        }

        console.error('[useStreamingResponse] Streaming error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown streaming error';
        setError(errorMessage);
        setState('error');
        if (onError) {
          onError(errorMessage);
        }
      } finally {
        readerRef.current = null;
      }
    },
    [endpoint, parseSSEMessage, handleMessage, onComplete, onError, state]
  );

  /**
   * Stop streaming
   */
  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (readerRef.current) {
      readerRef.current.cancel();
      readerRef.current = null;
    }

    setState('idle');
  }, []);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    stopStreaming();
    setContent('');
    setError(null);
    setToolCalls([]);
    setState('idle');
  }, [stopStreaming]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, [stopStreaming]);

  return {
    // State
    content,
    state,
    error,
    toolCalls,
    isStreaming: state === 'connecting' || state === 'streaming',

    // Actions
    startStreaming,
    stopStreaming,
    reset,
  };
}
