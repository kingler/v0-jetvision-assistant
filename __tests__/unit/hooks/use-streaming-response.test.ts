// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useStreamingResponse } from '@/hooks/use-streaming-response';

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

  cancel() {
    // Mock implementation
  }
}

describe('useStreamingResponse', () => {
  let mockAbortController: AbortController;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAbortController = new AbortController();
    global.AbortController = vi.fn(() => mockAbortController) as unknown as typeof AbortController;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should return initial state with no content', () => {
      const { result } = renderHook(() => useStreamingResponse());

      expect(result.current.content).toBe('');
      expect(result.current.isStreaming).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.state).toBe('idle');
      expect(result.current.toolCalls).toEqual([]);
      expect(typeof result.current.startStreaming).toBe('function');
      expect(typeof result.current.stopStreaming).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('Starting Stream', () => {
    it('should set state to connecting when starting', async () => {
      const mockResponse = {
        ok: true,
        body: new MockReadableStream([
          'data: {"type":"token","data":{"token":"Hello"}}\n',
          'data: {"type":"complete"}\n',
        ]) as unknown as ReadableStream<Uint8Array>,
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useStreamingResponse());

      act(() => {
        result.current.startStreaming({ message: 'test' });
      });

      // State should be connecting or streaming
      expect(['connecting', 'streaming']).toContain(result.current.state);

      await waitFor(() => {
        expect(result.current.state).toBe('completed');
      });
    });

    it('should make fetch request with correct parameters', async () => {
      const mockResponse = {
        ok: true,
        body: new MockReadableStream(['data: {"type":"complete"}\n']) as unknown as ReadableStream<Uint8Array>,
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useStreamingResponse({
        endpoint: '/api/chat/respond',
      }));

      await act(async () => {
        await result.current.startStreaming({
          message: 'Hello',
          sessionId: 'session-456',
        });
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/chat/respond',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: 'Hello',
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
          'data: {"type":"token","data":{"token":"Hello"}}\n',
          'data: {"type":"token","data":{"token":" World"}}\n',
          'data: {"type":"token","data":{"token":"!"}}\n',
          'data: {"type":"complete"}\n',
        ]) as unknown as ReadableStream<Uint8Array>,
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useStreamingResponse());

      await act(async () => {
        await result.current.startStreaming({ message: 'test' });
      });

      await waitFor(() => {
        expect(result.current.content).toBe('Hello World!');
      });
    });

    it('should call onToken callback for each token', async () => {
      const onToken = vi.fn();
      const mockResponse = {
        ok: true,
        body: new MockReadableStream([
          'data: {"type":"token","data":{"token":"Hello"}}\n',
          'data: {"type":"token","data":{"token":" World"}}\n',
          'data: {"type":"complete"}\n',
        ]) as unknown as ReadableStream<Uint8Array>,
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useStreamingResponse({ onToken }));

      await act(async () => {
        await result.current.startStreaming({ message: 'test' });
      });

      await waitFor(() => {
        expect(onToken).toHaveBeenCalledWith('Hello');
        expect(onToken).toHaveBeenCalledWith(' World');
      });
    });
  });

  describe('Tool Calls', () => {
    it('should track tool call start', async () => {
      const mockResponse = {
        ok: true,
        body: new MockReadableStream([
          'data: {"type":"tool_call_start","data":{"toolCallId":"tool-1","toolName":"search"}}\n',
          'data: {"type":"complete"}\n',
        ]) as unknown as ReadableStream<Uint8Array>,
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useStreamingResponse());

      await act(async () => {
        await result.current.startStreaming({ message: 'test' });
      });

      await waitFor(() => {
        expect(result.current.toolCalls).toContainEqual(
          expect.objectContaining({
            id: 'tool-1',
            name: 'search',
            status: 'starting',
          })
        );
      });
    });

    it('should track tool call progress', async () => {
      const mockResponse = {
        ok: true,
        body: new MockReadableStream([
          'data: {"type":"tool_call_start","data":{"toolCallId":"tool-1","toolName":"search"}}\n',
          'data: {"type":"tool_call_progress","data":{"toolCallId":"tool-1","toolName":"search"}}\n',
          'data: {"type":"complete"}\n',
        ]) as unknown as ReadableStream<Uint8Array>,
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useStreamingResponse());

      await act(async () => {
        await result.current.startStreaming({ message: 'test' });
      });

      await waitFor(() => {
        const toolCall = result.current.toolCalls.find(tc => tc.id === 'tool-1');
        expect(toolCall?.status).toBe('in_progress');
      });
    });

    it('should track tool call completion', async () => {
      const mockResponse = {
        ok: true,
        body: new MockReadableStream([
          'data: {"type":"tool_call_start","data":{"toolCallId":"tool-1","toolName":"search"}}\n',
          'data: {"type":"tool_call_complete","data":{"toolCallId":"tool-1","toolName":"search","arguments":{"query":"test"},"result":"found"}}\n',
          'data: {"type":"complete"}\n',
        ]) as unknown as ReadableStream<Uint8Array>,
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useStreamingResponse());

      await act(async () => {
        await result.current.startStreaming({ message: 'test' });
      });

      await waitFor(() => {
        const toolCall = result.current.toolCalls.find(tc => tc.id === 'tool-1');
        expect(toolCall?.status).toBe('complete');
        expect(toolCall?.arguments).toEqual({ query: 'test' });
        expect(toolCall?.result).toBe('found');
      });
    });
  });

  describe('Error Handling', () => {
    it('should set error state on HTTP error', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useStreamingResponse());

      await act(async () => {
        await result.current.startStreaming({ message: 'test' });
      });

      await waitFor(() => {
        expect(result.current.state).toBe('error');
        expect(result.current.error).toContain('500');
      });
    });

    it('should set error state on SSE error event', async () => {
      const mockResponse = {
        ok: true,
        body: new MockReadableStream([
          'data: {"type":"error","data":{"error":"Something went wrong"}}\n',
        ]) as unknown as ReadableStream<Uint8Array>,
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useStreamingResponse());

      await act(async () => {
        await result.current.startStreaming({ message: 'test' });
      });

      await waitFor(() => {
        expect(result.current.state).toBe('error');
        expect(result.current.error).toBe('Something went wrong');
      });
    });

    it('should call onError callback on error', async () => {
      const onError = vi.fn();
      const mockResponse = {
        ok: true,
        body: new MockReadableStream([
          'data: {"type":"error","data":{"error":"Test error"}}\n',
        ]) as unknown as ReadableStream<Uint8Array>,
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useStreamingResponse({ onError }));

      await act(async () => {
        await result.current.startStreaming({ message: 'test' });
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Test error');
      });
    });
  });

  describe('Completion', () => {
    it('should set state to completed on complete event', async () => {
      const mockResponse = {
        ok: true,
        body: new MockReadableStream([
          'data: {"type":"token","data":{"token":"Done"}}\n',
          'data: {"type":"complete"}\n',
        ]) as unknown as ReadableStream<Uint8Array>,
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useStreamingResponse());

      await act(async () => {
        await result.current.startStreaming({ message: 'test' });
      });

      await waitFor(() => {
        expect(result.current.state).toBe('completed');
        expect(result.current.isStreaming).toBe(false);
      });
    });

    it('should call onComplete callback', async () => {
      const onComplete = vi.fn();
      const mockResponse = {
        ok: true,
        body: new MockReadableStream([
          'data: {"type":"complete"}\n',
        ]) as unknown as ReadableStream<Uint8Array>,
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useStreamingResponse({ onComplete }));

      await act(async () => {
        await result.current.startStreaming({ message: 'test' });
      });

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
      });
    });
  });

  describe('Abort/Stop', () => {
    it('should stop streaming when stopStreaming is called', async () => {
      const mockResponse = {
        ok: true,
        body: new MockReadableStream([
          'data: {"type":"token","data":{"token":"Hello"}}\n',
          // Intentionally no complete event
        ]) as unknown as ReadableStream<Uint8Array>,
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useStreamingResponse());

      act(() => {
        result.current.startStreaming({ message: 'test' });
      });

      // Stop streaming
      act(() => {
        result.current.stopStreaming();
      });

      expect(result.current.state).toBe('idle');
    });
  });

  describe('Reset', () => {
    it('should reset all state', async () => {
      const mockResponse = {
        ok: true,
        body: new MockReadableStream([
          'data: {"type":"token","data":{"token":"Hello"}}\n',
          'data: {"type":"complete"}\n',
        ]) as unknown as ReadableStream<Uint8Array>,
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useStreamingResponse());

      await act(async () => {
        await result.current.startStreaming({ message: 'test' });
      });

      await waitFor(() => {
        expect(result.current.content).toBe('Hello');
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.content).toBe('');
      expect(result.current.state).toBe('idle');
      expect(result.current.toolCalls).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });
});
