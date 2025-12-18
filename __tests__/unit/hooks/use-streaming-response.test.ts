// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useStreamingResponse } from '@/lib/hooks/use-streaming-response';

// Mock ReadableStream and TextDecoder for SSE streaming
class MockReadableStream {
  private reader: MockReadableStreamReader;

  constructor(chunks: string[]) {
    this.reader = new MockReadableStreamReader(chunks);
  }

  getReader() {
    return this.reader;
  }
}

class MockReadableStreamReader {
  private chunks: string[];
  private index: number = 0;

  constructor(chunks: string[]) {
    this.chunks = chunks;
  }

  async read() {
    if (this.index >= this.chunks.length) {
      return { done: true, value: undefined };
    }
    const value = new TextEncoder().encode(this.chunks[this.index]);
    this.index++;
    return { done: false, value };
  }

  releaseLock() {
    // Mock implementation
  }
}

describe('useStreamingResponse', () => {
  let mockAbortController: AbortController;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAbortController = new AbortController();
    global.AbortController = vi.fn(() => mockAbortController) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should return initial state with no data', () => {
      const { result } = renderHook(() => useStreamingResponse());

      expect(result.current.data).toBe('');
      expect(result.current.isStreaming).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isComplete).toBe(false);
      expect(typeof result.current.startStreaming).toBe('function');
      expect(typeof result.current.abort).toBe('function');
    });

    it('should provide metadata object', () => {
      const { result } = renderHook(() => useStreamingResponse());

      expect(result.current.metadata).toEqual({
        requestId: null,
        tokensReceived: 0,
        duration: 0,
      });
    });
  });

  describe('Starting Stream', () => {
    it('should set isStreaming to true when starting', async () => {
      const mockResponse = {
        ok: true,
        body: new MockReadableStream([
          'data: {"type":"text","content":"Hello"}\n\n',
          'data: {"type":"done"}\n\n',
        ]) as any,
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useStreamingResponse());

      act(() => {
        result.current.startStreaming('/api/responses/stream', {
          requestId: 'req-123',
        });
      });

      expect(result.current.isStreaming).toBe(true);

      await waitFor(() => {
        expect(result.current.isComplete).toBe(true);
      });
    });

    it('should make fetch request with correct parameters', async () => {
      const mockResponse = {
        ok: true,
        body: new MockReadableStream(['data: {"type":"done"}\n\n']) as any,
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useStreamingResponse());

      await act(async () => {
        await result.current.startStreaming('/api/responses/stream', {
          requestId: 'req-123',
          sessionId: 'session-456',
        });
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/responses/stream',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requestId: 'req-123',
            sessionId: 'session-456',
          }),
          signal: mockAbortController.signal,
        })
      );
    });
  });

  describe('Text Streaming', () => {
    it('should accumulate text tokens progressively', async () => {
      const mockResponse = {
        ok: true,
        body: new MockReadableStream([
          'data: {"type":"text","content":"Hello"}\n\n',
          'data: {"type":"text","content":" World"}\n\n',
          'data: {"type":"text","content":"!"}\n\n',
          'data: {"type":"done"}\n\n',
        ]) as any,
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useStreamingResponse());

      await act(async () => {
        await result.current.startStreaming('/api/responses/stream', {
          requestId: 'req-123',
        });
      });

      await waitFor(() => {
        expect(result.current.data).toBe('Hello World!');
        expect(result.current.isComplete).toBe(true);
      });
    });

    it('should update tokens received count', async () => {
      const mockResponse = {
        ok: true,
        body: new MockReadableStream([
          'data: {"type":"text","content":"Token1"}\n\n',
          'data: {"type":"text","content":"Token2"}\n\n',
          'data: {"type":"text","content":"Token3"}\n\n',
          'data: {"type":"done"}\n\n',
        ]) as any,
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useStreamingResponse());

      await act(async () => {
        await result.current.startStreaming('/api/responses/stream', {
          requestId: 'req-123',
        });
      });

      await waitFor(() => {
        expect(result.current.metadata.tokensReceived).toBe(3);
      });
    });
  });

  describe('Tool Call Events', () => {
    it('should handle tool_call events', async () => {
      const mockResponse = {
        ok: true,
        body: new MockReadableStream([
          'data: {"type":"tool_call","toolName":"searchFlights","arguments":{"from":"JFK","to":"LAX"}}\n\n',
          'data: {"type":"done"}\n\n',
        ]) as any,
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const onToolCall = vi.fn();
      const { result } = renderHook(() =>
        useStreamingResponse({ onToolCall })
      );

      await act(async () => {
        await result.current.startStreaming('/api/responses/stream', {
          requestId: 'req-123',
        });
      });

      await waitFor(() => {
        expect(onToolCall).toHaveBeenCalledWith({
          toolName: 'searchFlights',
          arguments: { from: 'JFK', to: 'LAX' },
        });
      });
    });

    it('should not throw if onToolCall is not provided', async () => {
      const mockResponse = {
        ok: true,
        body: new MockReadableStream([
          'data: {"type":"tool_call","toolName":"test"}\n\n',
          'data: {"type":"done"}\n\n',
        ]) as any,
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useStreamingResponse());

      await act(async () => {
        await result.current.startStreaming('/api/responses/stream', {
          requestId: 'req-123',
        });
      });

      await waitFor(() => {
        expect(result.current.isComplete).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle error events from SSE stream', async () => {
      const mockResponse = {
        ok: true,
        body: new MockReadableStream([
          'data: {"type":"error","message":"API rate limit exceeded"}\n\n',
        ]) as any,
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useStreamingResponse());

      await act(async () => {
        await result.current.startStreaming('/api/responses/stream', {
          requestId: 'req-123',
        });
      });

      await waitFor(() => {
        expect(result.current.error).toBe('API rate limit exceeded');
        expect(result.current.isStreaming).toBe(false);
      });
    });

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useStreamingResponse());

      await act(async () => {
        await result.current.startStreaming('/api/responses/stream', {
          requestId: 'req-123',
        });
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
        expect(result.current.isStreaming).toBe(false);
      });
    });

    it('should handle non-ok HTTP responses', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useStreamingResponse());

      await act(async () => {
        await result.current.startStreaming('/api/responses/stream', {
          requestId: 'req-123',
        });
      });

      await waitFor(() => {
        expect(result.current.error).toContain('500');
        expect(result.current.isStreaming).toBe(false);
      });
    });

    it('should handle malformed JSON in SSE events', async () => {
      const mockResponse = {
        ok: true,
        body: new MockReadableStream([
          'data: {invalid json}\n\n',
          'data: {"type":"done"}\n\n',
        ]) as any,
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useStreamingResponse());

      await act(async () => {
        await result.current.startStreaming('/api/responses/stream', {
          requestId: 'req-123',
        });
      });

      // Should skip invalid JSON and continue
      await waitFor(() => {
        expect(result.current.isComplete).toBe(true);
      });
    });
  });

  describe('Abort Controller', () => {
    it('should abort the stream when abort is called', async () => {
      const mockResponse = {
        ok: true,
        body: new MockReadableStream([
          'data: {"type":"text","content":"Starting"}\n\n',
          'data: {"type":"text","content":"Should not receive"}\n\n',
        ]) as any,
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useStreamingResponse());

      act(() => {
        result.current.startStreaming('/api/responses/stream', {
          requestId: 'req-123',
        });
      });

      act(() => {
        result.current.abort();
      });

      await waitFor(() => {
        expect(result.current.isStreaming).toBe(false);
        expect(mockAbortController.signal.aborted).toBe(true);
      });
    });

    it('should handle abort errors gracefully', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';

      global.fetch = vi.fn().mockRejectedValue(abortError);

      const { result } = renderHook(() => useStreamingResponse());

      await act(async () => {
        await result.current.startStreaming('/api/responses/stream', {
          requestId: 'req-123',
        });
      });

      act(() => {
        result.current.abort();
      });

      await waitFor(() => {
        expect(result.current.isStreaming).toBe(false);
        // Abort errors should not set error state
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe('Reconnection Logic', () => {
    it('should attempt reconnection on network error', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          body: new MockReadableStream(['data: {"type":"done"}\n\n']) as any,
        });
      });

      const { result } = renderHook(() =>
        useStreamingResponse({ maxRetries: 2, retryDelay: 100 })
      );

      await act(async () => {
        await result.current.startStreaming('/api/responses/stream', {
          requestId: 'req-123',
        });
      });

      await waitFor(() => {
        expect(callCount).toBe(2);
        expect(result.current.isComplete).toBe(true);
      }, { timeout: 5000 });
    });

    it('should respect maxRetries limit', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useStreamingResponse({ maxRetries: 2, retryDelay: 100 })
      );

      await act(async () => {
        await result.current.startStreaming('/api/responses/stream', {
          requestId: 'req-123',
        });
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
        expect(result.current.error).toBe('Network error');
      }, { timeout: 5000 });
    });

    it('should not retry on non-network errors', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const { result } = renderHook(() =>
        useStreamingResponse({ maxRetries: 2 })
      );

      await act(async () => {
        await result.current.startStreaming('/api/responses/stream', {
          requestId: 'req-123',
        });
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1); // No retries
        expect(result.current.error).toContain('400');
      });
    });
  });

  describe('Done Event', () => {
    it('should set isComplete to true on done event', async () => {
      const mockResponse = {
        ok: true,
        body: new MockReadableStream([
          'data: {"type":"text","content":"Complete"}\n\n',
          'data: {"type":"done"}\n\n',
        ]) as any,
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useStreamingResponse());

      await act(async () => {
        await result.current.startStreaming('/api/responses/stream', {
          requestId: 'req-123',
        });
      });

      await waitFor(() => {
        expect(result.current.isComplete).toBe(true);
        expect(result.current.isStreaming).toBe(false);
      });
    });

    it('should call onComplete callback', async () => {
      const mockResponse = {
        ok: true,
        body: new MockReadableStream([
          'data: {"type":"text","content":"Done"}\n\n',
          'data: {"type":"done","requestId":"req-123"}\n\n',
        ]) as any,
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const onComplete = vi.fn();
      const { result } = renderHook(() =>
        useStreamingResponse({ onComplete })
      );

      await act(async () => {
        await result.current.startStreaming('/api/responses/stream', {
          requestId: 'req-123',
        });
      });

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledWith({
          data: 'Done',
          requestId: 'req-123',
        });
      });
    });
  });

  describe('Metadata Tracking', () => {
    it('should track request ID', async () => {
      const mockResponse = {
        ok: true,
        body: new MockReadableStream(['data: {"type":"done"}\n\n']) as any,
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useStreamingResponse());

      await act(async () => {
        await result.current.startStreaming('/api/responses/stream', {
          requestId: 'req-123',
        });
      });

      await waitFor(() => {
        expect(result.current.metadata.requestId).toBe('req-123');
      });
    });

    it('should track stream duration', async () => {
      const mockResponse = {
        ok: true,
        body: new MockReadableStream([
          'data: {"type":"text","content":"Test"}\n\n',
          'data: {"type":"done"}\n\n',
        ]) as any,
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useStreamingResponse());

      await act(async () => {
        await result.current.startStreaming('/api/responses/stream', {
          requestId: 'req-123',
        });
      });

      await waitFor(() => {
        expect(result.current.isComplete).toBe(true);
        expect(result.current.metadata.duration).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty SSE stream', async () => {
      const mockResponse = {
        ok: true,
        body: new MockReadableStream([]) as any,
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useStreamingResponse());

      await act(async () => {
        await result.current.startStreaming('/api/responses/stream', {
          requestId: 'req-123',
        });
      });

      await waitFor(() => {
        expect(result.current.isStreaming).toBe(false);
        expect(result.current.data).toBe('');
      });
    });

    it('should handle multiple startStreaming calls', async () => {
      const mockResponse = {
        ok: true,
        body: new MockReadableStream(['data: {"type":"done"}\n\n']) as any,
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useStreamingResponse());

      await act(async () => {
        result.current.startStreaming('/api/responses/stream', {
          requestId: 'req-1',
        });
        // Second call should abort the first
        await result.current.startStreaming('/api/responses/stream', {
          requestId: 'req-2',
        });
      });

      await waitFor(() => {
        expect(result.current.metadata.requestId).toBe('req-2');
      });
    });

    it('should clean up on unmount', async () => {
      const mockResponse = {
        ok: true,
        body: new MockReadableStream([
          'data: {"type":"text","content":"Test"}\n\n',
        ]) as any,
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const { result, unmount } = renderHook(() => useStreamingResponse());

      act(() => {
        result.current.startStreaming('/api/responses/stream', {
          requestId: 'req-123',
        });
      });

      unmount();

      expect(mockAbortController.signal.aborted).toBe(true);
    });
  });

  describe('SSE Event Parsing', () => {
    it('should handle SSE events with id and retry fields', async () => {
      const mockResponse = {
        ok: true,
        body: new MockReadableStream([
          'id: 1\n',
          'retry: 1000\n',
          'data: {"type":"text","content":"With metadata"}\n\n',
          'data: {"type":"done"}\n\n',
        ]) as any,
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useStreamingResponse());

      await act(async () => {
        await result.current.startStreaming('/api/responses/stream', {
          requestId: 'req-123',
        });
      });

      await waitFor(() => {
        expect(result.current.data).toBe('With metadata');
      });
    });

    it('should handle multi-line data events', async () => {
      const mockResponse = {
        ok: true,
        body: new MockReadableStream([
          'data: {"type":"text",\n',
          'data: "content":"Multi-line"}\n\n',
          'data: {"type":"done"}\n\n',
        ]) as any,
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useStreamingResponse());

      await act(async () => {
        await result.current.startStreaming('/api/responses/stream', {
          requestId: 'req-123',
        });
      });

      await waitFor(() => {
        expect(result.current.data).toBe('Multi-line');
      });
    });

    it('should ignore comment lines', async () => {
      const mockResponse = {
        ok: true,
        body: new MockReadableStream([
          ': This is a comment\n',
          'data: {"type":"text","content":"Actual data"}\n\n',
          'data: {"type":"done"}\n\n',
        ]) as any,
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useStreamingResponse());

      await act(async () => {
        await result.current.startStreaming('/api/responses/stream', {
          requestId: 'req-123',
        });
      });

      await waitFor(() => {
        expect(result.current.data).toBe('Actual data');
      });
    });
  });
});
