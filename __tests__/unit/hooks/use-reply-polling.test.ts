/**
 * Tests for useReplyPolling hook (ONEK-232)
 *
 * @vitest-environment jsdom
 * @see lib/chat/hooks/use-reply-polling.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReplyPolling } from '@/lib/chat/hooks/use-reply-polling';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useReplyPolling', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not poll when requestId is null', () => {
    renderHook(() => useReplyPolling({ requestId: null }));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('does not poll when disabled', () => {
    renderHook(() => useReplyPolling({ requestId: 'req-1', enabled: false }));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('polls immediately when enabled with requestId', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          results: [{ hasReply: false }],
        }),
    });

    renderHook(() => useReplyPolling({ requestId: 'req-1' }));

    // Let the useEffect + async fetch resolve
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/inbox/poll-replies',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ requestId: 'req-1' }),
      })
    );
  });

  it('fires onReplyDetected when reply found', async () => {
    const onReplyDetected = vi.fn();

    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          results: [
            {
              hasReply: true,
              replySnippet: 'Sounds great!',
              replyDate: '2026-02-20T10:00:00Z',
            },
          ],
        }),
    });

    const { result } = renderHook(() =>
      useReplyPolling({
        requestId: 'req-1',
        onReplyDetected,
      })
    );

    // Let the useEffect + async fetch resolve
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.replyDetected).toBe(true);
    expect(onReplyDetected).toHaveBeenCalledWith({
      hasReply: true,
      replySnippet: 'Sounds great!',
      replyDate: '2026-02-20T10:00:00Z',
    });
    expect(result.current.replySnippet).toBe('Sounds great!');
    expect(result.current.replyDate).toBe('2026-02-20T10:00:00Z');
  });

  it('stops polling after reply detected', async () => {
    vi.useFakeTimers();

    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          results: [{ hasReply: true, replySnippet: 'OK' }],
        }),
    });

    renderHook(() =>
      useReplyPolling({ requestId: 'req-1', pollInterval: 5000 })
    );

    // Flush initial poll
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    const callCount = mockFetch.mock.calls.length;

    // Advance past another poll interval
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    // Should not have polled again after reply detected
    expect(mockFetch.mock.calls.length).toBe(callCount);

    vi.useRealTimers();
  });

  it('increments errorCount on fetch failure', async () => {
    // Use a non-ok response to trigger error path (avoids unhandled rejection)
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.resolve({ success: false }),
    });

    const { result } = renderHook(() =>
      useReplyPolling({ requestId: 'req-1', pollInterval: 60000 })
    );

    // Let the useEffect + async fetch resolve
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.errorCount).toBeGreaterThan(0);
  });

  it('provides checkNow for manual trigger', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          results: [{ hasReply: false }],
        }),
    });

    const { result } = renderHook(() =>
      useReplyPolling({ requestId: 'req-1', enabled: false })
    );

    // Manual trigger even though polling is disabled
    await act(async () => {
      await result.current.checkNow();
    });

    expect(mockFetch).toHaveBeenCalled();
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() =>
      useReplyPolling({ requestId: null })
    );

    expect(result.current.isPolling).toBe(false);
    expect(result.current.lastCheckTime).toBeNull();
    expect(result.current.replyDetected).toBe(false);
    expect(result.current.replySnippet).toBeNull();
    expect(result.current.replyDate).toBeNull();
    expect(result.current.errorCount).toBe(0);
  });
});
