/**
 * executeToolWithRetry() Function Tests
 * ONEK-82: Add Retry Logic and Error Handling for Tool Execution
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

// Mock dependencies
const createMockMCPClient = () => ({
  callTool: vi.fn(),
});

const createMockEncoder = () => ({
  encode: vi.fn((text: string) => new Uint8Array(Buffer.from(text))),
});

const createMockController = () => ({
  enqueue: vi.fn(),
  close: vi.fn(),
  error: vi.fn(),
});

describe('executeToolWithRetry()', () => {
  let mockClient: ReturnType<typeof createMockMCPClient>;
  let mockEncoder: ReturnType<typeof createMockEncoder>;
  let mockController: ReturnType<typeof createMockController>;

  beforeEach(() => {
    mockClient = createMockMCPClient();
    mockEncoder = createMockEncoder();
    mockController = createMockController();
    vi.clearAllMocks();
  });

  describe('Successful Execution on First Try', () => {
    it('should execute successfully without retries', async () => {
      const mockResult = {
        content: [{ type: 'text', text: JSON.stringify({ success: true }) }],
      };
      mockClient.callTool.mockResolvedValue(mockResult);

      const executeToolWithRetry = (await import('@/app/api/chat/respond/route')).executeToolWithRetry;
      const result = await executeToolWithRetry(
        'search_flights',
        { departure: 'KJFK' },
        mockClient as unknown as Client,
        mockEncoder as any,
        mockController as any
      );

      expect(mockClient.callTool).toHaveBeenCalledTimes(1);
      expect(result).toContain('success');
    });

    it('should not emit retry events on first success', async () => {
      const mockResult = {
        content: [{ type: 'text', text: '{}' }],
      };
      mockClient.callTool.mockResolvedValue(mockResult);

      const executeToolWithRetry = (await import('@/app/api/chat/respond/route')).executeToolWithRetry;
      await executeToolWithRetry('search_flights', {}, mockClient as unknown as Client, mockEncoder as any, mockController as any);

      // Should emit tool_call_start and tool_call_result, but NOT tool_call_retry
      const enqueueCalls = mockController.enqueue.mock.calls;
      const retryEvents = enqueueCalls.filter((call) => {
        const data = new TextDecoder().decode(call[0]);
        return data.includes('"type":"tool_call_retry"');
      });

      expect(retryEvents).toHaveLength(0);
    });
  });

  describe('Retry on Transient Errors', () => {
    it('should retry up to 3 times on network errors', async () => {
      mockClient.callTool
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: '{"success": true}' }],
        });

      const executeToolWithRetry = (await import('@/app/api/chat/respond/route')).executeToolWithRetry;
      const result = await executeToolWithRetry('search_flights', {}, mockClient as unknown as Client, mockEncoder as any, mockController as any);

      expect(mockClient.callTool).toHaveBeenCalledTimes(3);
      expect(result).toContain('success');
    });

    it('should use exponential backoff (1s, 2s, 4s)', async () => {
      const delays: number[] = [];
      const startTime = Date.now();

      mockClient.callTool
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: '{}' }],
        });

      // Mock Math.random to remove jitter (always return 0)
      const originalMathRandom = Math.random;
      Math.random = vi.fn(() => 0);

      // Mock setTimeout to track delays
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn((fn: any, delay: number) => {
        delays.push(delay);
        return originalSetTimeout(fn, 0); // Execute immediately for test
      }) as any;

      const executeToolWithRetry = (await import('@/app/api/chat/respond/route')).executeToolWithRetry;
      await executeToolWithRetry('search_flights', {}, mockClient as unknown as Client, mockEncoder as any, mockController as any);

      global.setTimeout = originalSetTimeout;
      Math.random = originalMathRandom;

      expect(delays).toHaveLength(2); // 2 retries = 2 delays
      expect(delays[0]).toBe(1000); // 1s
      expect(delays[1]).toBe(2000); // 2s
    });

    it('should emit tool_call_retry SSE events with backoff delay', async () => {
      mockClient.callTool
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: '{}' }],
        });

      // Mock Math.random to remove jitter (always return 0)
      const originalMathRandom = Math.random;
      Math.random = vi.fn(() => 0);

      const executeToolWithRetry = (await import('@/app/api/chat/respond/route')).executeToolWithRetry;
      await executeToolWithRetry('search_flights', {}, mockClient as unknown as Client, mockEncoder as any, mockController as any);

      Math.random = originalMathRandom;

      const retryEvent = mockController.enqueue.mock.calls.find((call) => {
        const data = new TextDecoder().decode(call[0]);
        return data.includes('"type":"tool_call_retry"');
      });

      expect(retryEvent).toBeDefined();
      const data = new TextDecoder().decode(retryEvent![0]);
      expect(data).toContain('"attempt":1');
      expect(data).toContain('"maxRetries":3');
      expect(data).toContain('"nextRetryDelay":1000');
    });

    it('should retry on timeout errors', async () => {
      mockClient.callTool
        .mockRejectedValueOnce(new Error('Tool execution timeout after 30s'))
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: '{}' }],
        });

      const executeToolWithRetry = (await import('@/app/api/chat/respond/route')).executeToolWithRetry;
      const result = await executeToolWithRetry('search_flights', {}, mockClient as unknown as Client, mockEncoder as any, mockController as any);

      expect(mockClient.callTool).toHaveBeenCalledTimes(2);
      expect(result).toBeDefined();
    });

    it('should retry on 503 Service Unavailable', async () => {
      mockClient.callTool
        .mockRejectedValueOnce(new Error('HTTP 503: Service Unavailable'))
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: '{}' }],
        });

      const executeToolWithRetry = (await import('@/app/api/chat/respond/route')).executeToolWithRetry;
      await executeToolWithRetry('search_flights', {}, mockClient as unknown as Client, mockEncoder as any, mockController as any);

      expect(mockClient.callTool).toHaveBeenCalledTimes(2);
    });

    it('should retry on 504 Gateway Timeout', async () => {
      mockClient.callTool
        .mockRejectedValueOnce(new Error('HTTP 504: Gateway Timeout'))
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: '{}' }],
        });

      const executeToolWithRetry = (await import('@/app/api/chat/respond/route')).executeToolWithRetry;
      await executeToolWithRetry('search_flights', {}, mockClient as unknown as Client, mockEncoder as any, mockController as any);

      expect(mockClient.callTool).toHaveBeenCalledTimes(2);
    });
  });

  describe('No Retry on Permanent Errors', () => {
    it('should not retry on validation errors', async () => {
      mockClient.callTool.mockRejectedValue(new Error('Invalid arguments: missing required field'));

      const executeToolWithRetry = (await import('@/app/api/chat/respond/route')).executeToolWithRetry;

      await expect(
        executeToolWithRetry('search_flights', {}, mockClient as unknown as Client, mockEncoder as any, mockController as any)
      ).rejects.toThrow('Invalid arguments');

      expect(mockClient.callTool).toHaveBeenCalledTimes(1); // No retries
    });

    it('should not retry on tool not found errors', async () => {
      mockClient.callTool.mockRejectedValue(new Error('Tool not found: invalid_tool'));

      const executeToolWithRetry = (await import('@/app/api/chat/respond/route')).executeToolWithRetry;

      await expect(
        executeToolWithRetry('invalid_tool', {}, mockClient as unknown as Client, mockEncoder as any, mockController as any)
      ).rejects.toThrow('Tool not found');

      expect(mockClient.callTool).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 400 Bad Request', async () => {
      mockClient.callTool.mockRejectedValue(new Error('HTTP 400: Bad Request'));

      const executeToolWithRetry = (await import('@/app/api/chat/respond/route')).executeToolWithRetry;

      await expect(
        executeToolWithRetry('search_flights', {}, mockClient as unknown as Client, mockEncoder as any, mockController as any)
      ).rejects.toThrow('Bad Request');

      expect(mockClient.callTool).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 401 Unauthorized', async () => {
      mockClient.callTool.mockRejectedValue(new Error('HTTP 401: Unauthorized'));

      const executeToolWithRetry = (await import('@/app/api/chat/respond/route')).executeToolWithRetry;

      await expect(
        executeToolWithRetry('search_flights', {}, mockClient as unknown as Client, mockEncoder as any, mockController as any)
      ).rejects.toThrow('Unauthorized');

      expect(mockClient.callTool).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 404 Not Found', async () => {
      mockClient.callTool.mockRejectedValue(new Error('HTTP 404: Not Found'));

      const executeToolWithRetry = (await import('@/app/api/chat/respond/route')).executeToolWithRetry;

      await expect(
        executeToolWithRetry('search_flights', {}, mockClient as unknown as Client, mockEncoder as any, mockController as any)
      ).rejects.toThrow('Not Found');

      expect(mockClient.callTool).toHaveBeenCalledTimes(1);
    });
  });

  describe('Max Retries Exceeded', () => {
    it('should throw after 3 failed attempts', async () => {
      mockClient.callTool.mockRejectedValue(new Error('ETIMEDOUT'));

      const executeToolWithRetry = (await import('@/app/api/chat/respond/route')).executeToolWithRetry;

      await expect(
        executeToolWithRetry('search_flights', {}, mockClient as unknown as Client, mockEncoder as any, mockController as any)
      ).rejects.toThrow('ETIMEDOUT');

      expect(mockClient.callTool).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should emit final error event after max retries', async () => {
      mockClient.callTool.mockRejectedValue(new Error('Network error'));

      const executeToolWithRetry = (await import('@/app/api/chat/respond/route')).executeToolWithRetry;

      await expect(
        executeToolWithRetry('search_flights', {}, mockClient as unknown as Client, mockEncoder as any, mockController as any)
      ).rejects.toThrow();

      const errorEvent = mockController.enqueue.mock.calls.find((call) => {
        const data = new TextDecoder().decode(call[0]);
        return data.includes('"type":"tool_call_error"');
      });

      expect(errorEvent).toBeDefined();
      const data = new TextDecoder().decode(errorEvent![0]);
      expect(data).toContain('Network error');
    });

    it('should log all retry attempts', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      mockClient.callTool.mockRejectedValue(new Error('Timeout'));

      const executeToolWithRetry = (await import('@/app/api/chat/respond/route')).executeToolWithRetry;

      await expect(
        executeToolWithRetry('search_flights', {}, mockClient as unknown as Client, mockEncoder as any, mockController as any)
      ).rejects.toThrow();

      // Check for retry log messages (format: "[executeToolWithRetry] Retrying search_flights (attempt 1/3) after 1000ms")
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[executeToolWithRetry] Retrying search_flights (attempt 1/3)'),
        expect.anything()
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[executeToolWithRetry] Retrying search_flights (attempt 2/3)'),
        expect.anything()
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Retry Configuration', () => {
    it('should respect custom max retries option', async () => {
      mockClient.callTool.mockRejectedValue(new Error('ETIMEDOUT'));

      // Mock setTimeout to execute immediately (no actual delays)
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn((fn: any, _delay: number) => {
        return originalSetTimeout(fn, 0); // Execute immediately
      }) as any;

      const executeToolWithRetry = (await import('@/app/api/chat/respond/route')).executeToolWithRetry;

      await expect(
        executeToolWithRetry(
          'search_flights',
          {},
          mockClient as unknown as Client,
          mockEncoder as any,
          mockController as any,
          { maxRetries: 5 }
        )
      ).rejects.toThrow();

      global.setTimeout = originalSetTimeout;

      expect(mockClient.callTool).toHaveBeenCalledTimes(5);
    });

    it('should respect custom backoff delays', async () => {
      const delays: number[] = [];
      mockClient.callTool
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({ content: [{ type: 'text', text: '{}' }] });

      // Mock Math.random to remove jitter (always return 0)
      const originalMathRandom = Math.random;
      Math.random = vi.fn(() => 0);

      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn((fn: any, delay: number) => {
        delays.push(delay);
        return originalSetTimeout(fn, 0);
      }) as any;

      const executeToolWithRetry = (await import('@/app/api/chat/respond/route')).executeToolWithRetry;
      await executeToolWithRetry(
        'search_flights',
        {},
        mockClient as unknown as Client,
        mockEncoder as any,
        mockController as any,
        { baseDelay: 500 }
      );

      global.setTimeout = originalSetTimeout;
      Math.random = originalMathRandom;

      expect(delays[0]).toBe(500); // Custom base delay
    });

    it('should support timeout per attempt', async () => {
      mockClient.callTool.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ content: [{ type: 'text', text: '{}' }] }), 100)
          )
      );

      const executeToolWithRetry = (await import('@/app/api/chat/respond/route')).executeToolWithRetry;
      const result = await executeToolWithRetry(
        'search_flights',
        {},
        mockClient as unknown as Client,
        mockEncoder as any,
        mockController as any,
        { timeout: 5000 }
      );

      expect(result).toBeDefined();
    });
  });

  describe('Error Classification', () => {
    it('should identify retryable network errors', async () => {
      const retryableErrors = [
        'ECONNREFUSED',
        'ETIMEDOUT',
        'ENOTFOUND',
        'ECONNRESET',
        'Service Unavailable',
        'Gateway Timeout',
      ];

      for (const errorMsg of retryableErrors) {
        mockClient.callTool
          .mockRejectedValueOnce(new Error(errorMsg))
          .mockResolvedValueOnce({ content: [{ type: 'text', text: '{}' }] });

        const executeToolWithRetry = (await import('@/app/api/chat/respond/route')).executeToolWithRetry;
        await executeToolWithRetry('search_flights', {}, mockClient as unknown as Client, mockEncoder as any, mockController as any);

        expect(mockClient.callTool).toHaveBeenCalledTimes(2);
        mockClient.callTool.mockClear();
      }
    });

    it('should identify permanent validation errors', async () => {
      const permanentErrors = [
        'Invalid arguments',
        'Tool not found',
        'Bad Request',
        'Unauthorized',
        'Forbidden',
        'Not Found',
      ];

      for (const errorMsg of permanentErrors) {
        mockClient.callTool.mockRejectedValue(new Error(errorMsg));

        const executeToolWithRetry = (await import('@/app/api/chat/respond/route')).executeToolWithRetry;

        await expect(
          executeToolWithRetry('search_flights', {}, mockClient as unknown as Client, mockEncoder as any, mockController as any)
        ).rejects.toThrow();

        expect(mockClient.callTool).toHaveBeenCalledTimes(1);
        mockClient.callTool.mockClear();
      }
    });
  });
});
