/**
 * Unit Tests for useAvinodeQuotes Hook
 * TDD - RED Phase: Tests written before implementation
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useAvinodeQuotes } from '@/lib/hooks/use-avinode-quotes';
import { supabase } from '@/lib/supabase/client';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
  },
}));

// Mock data
const mockQuotes = [
  {
    id: 'quote-1',
    request_id: 'trip-123',
    operator_id: 'op-1',
    operator_name: 'Elite Jets',
    aircraft_type: 'Gulfstream G650',
    aircraft_details: { model: 'G650ER', rating: 5 },
    base_price: 45000,
    fees: 2000,
    fuel_surcharge: 3000,
    taxes: 5000,
    total_price: 55000,
    status: 'received' as const,
    valid_until: '2025-12-25T00:00:00Z',
    created_at: '2025-12-18T10:00:00Z',
    updated_at: '2025-12-18T10:00:00Z',
    ranking: 1,
    score: 95,
    availability_confirmed: true,
    aircraft_tail_number: 'N123AB',
    analysis_notes: null,
    metadata: null,
  },
  {
    id: 'quote-2',
    request_id: 'trip-123',
    operator_id: 'op-2',
    operator_name: 'Sky Charter',
    aircraft_type: 'Bombardier Global 7500',
    aircraft_details: { model: 'Global 7500', rating: 4 },
    base_price: 48000,
    fees: 2200,
    fuel_surcharge: 3200,
    taxes: 5200,
    total_price: 58600,
    status: 'received' as const,
    valid_until: '2025-12-26T00:00:00Z',
    created_at: '2025-12-18T11:00:00Z',
    updated_at: '2025-12-18T11:00:00Z',
    ranking: 2,
    score: 88,
    availability_confirmed: true,
    aircraft_tail_number: 'N456CD',
    analysis_notes: null,
    metadata: null,
  },
];

describe('useAvinodeQuotes', () => {
  let mockChannel: Partial<RealtimeChannel>;
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockEq: ReturnType<typeof vi.fn>;
  let mockOrder: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup realtime channel mock
    mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn().mockResolvedValue({ error: null }),
    };

    // Setup query chain mocks
    mockOrder = vi.fn().mockResolvedValue({ data: mockQuotes, error: null });
    mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    // Setup supabase mocks
    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as any);

    vi.mocked(supabase.channel).mockReturnValue(mockChannel as RealtimeChannel);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should return initial loading state', () => {
      const { result } = renderHook(() => useAvinodeQuotes('trip-123'));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.quotes).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(result.current.selectedQuoteId).toBeNull();
      expect(result.current.connectionStatus).toBe('connecting');
    });

    it('should set error state if tripId is empty', async () => {
      // Hook sets error in state instead of throwing (for React 18 compatibility)
      const { result } = renderHook(() => useAvinodeQuotes(''));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('tripId is required');
      expect(result.current.quotes).toEqual([]);
    });
  });

  describe('Data Fetching', () => {
    it('should fetch quotes on mount', async () => {
      const { result } = renderHook(() => useAvinodeQuotes('trip-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabase.from).toHaveBeenCalledWith('quotes');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('request_id', 'trip-123');
      expect(mockOrder).toHaveBeenCalledWith('score', { ascending: false, nullsFirst: false });
      expect(result.current.quotes).toEqual(mockQuotes);
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch errors gracefully', async () => {
      const fetchError = new Error('Database connection failed');
      mockOrder.mockResolvedValue({ data: null, error: fetchError });

      const { result } = renderHook(() => useAvinodeQuotes('trip-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toContain('Database connection failed');
      expect(result.current.quotes).toEqual([]);
    });

    it('should handle empty quote list', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useAvinodeQuotes('trip-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.quotes).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Realtime Subscription', () => {
    it('should subscribe to realtime updates on mount', async () => {
      renderHook(() => useAvinodeQuotes('trip-123'));

      await waitFor(() => {
        expect(supabase.channel).toHaveBeenCalledWith('quotes-trip-123');
      });

      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quotes',
          filter: 'request_id=eq.trip-123',
        },
        expect.any(Function)
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it('should handle new quote insertion via realtime', async () => {
      let realtimeCallback: ((payload: any) => void) | null = null;

      // Capture the realtime callback
      mockChannel.on = vi.fn().mockImplementation((event, config, callback) => {
        realtimeCallback = callback;
        return mockChannel;
      });

      const { result } = renderHook(() => useAvinodeQuotes('trip-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate new quote insertion
      const newQuote = {
        id: 'quote-3',
        request_id: 'trip-123',
        operator_id: 'op-3',
        operator_name: 'Premium Air',
        aircraft_type: 'Cessna Citation X',
        aircraft_details: { model: 'Citation X+', rating: 4 },
        base_price: 35000,
        fees: 1500,
        fuel_surcharge: 2500,
        taxes: 4000,
        total_price: 43000,
        status: 'received' as const,
        valid_until: '2025-12-27T00:00:00Z',
        created_at: '2025-12-18T12:00:00Z',
        updated_at: '2025-12-18T12:00:00Z',
        ranking: 3,
        score: 82,
        availability_confirmed: true,
        aircraft_tail_number: 'N789EF',
        analysis_notes: null,
        metadata: null,
      };

      act(() => {
        realtimeCallback?.({
          eventType: 'INSERT',
          new: newQuote,
          old: {},
          schema: 'public',
          table: 'quotes',
        });
      });

      await waitFor(() => {
        expect(result.current.quotes).toHaveLength(3);
      });

      expect(result.current.quotes[2]).toEqual(newQuote);
    });

    it('should handle quote updates via realtime', async () => {
      let realtimeCallback: ((payload: any) => void) | null = null;

      mockChannel.on = vi.fn().mockImplementation((event, config, callback) => {
        realtimeCallback = callback;
        return mockChannel;
      });

      const { result } = renderHook(() => useAvinodeQuotes('trip-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate quote update
      const updatedQuote = {
        ...mockQuotes[0],
        status: 'accepted' as const,
        updated_at: '2025-12-18T13:00:00Z',
      };

      act(() => {
        realtimeCallback?.({
          eventType: 'UPDATE',
          new: updatedQuote,
          old: mockQuotes[0],
          schema: 'public',
          table: 'quotes',
        });
      });

      await waitFor(() => {
        expect(result.current.quotes[0].status).toBe('accepted');
      });
    });

    it('should update connection status to connected after subscription', async () => {
      // Mock successful subscription
      mockChannel.subscribe = vi.fn().mockImplementation((callback) => {
        setTimeout(() => callback?.('SUBSCRIBED'), 0);
        return mockChannel;
      });

      const { result } = renderHook(() => useAvinodeQuotes('trip-123'));

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });
    });

    it('should cleanup subscription on unmount', async () => {
      const { unmount } = renderHook(() => useAvinodeQuotes('trip-123'));

      await waitFor(() => {
        expect(mockChannel.subscribe).toHaveBeenCalled();
      });

      unmount();

      await waitFor(() => {
        expect(mockChannel.unsubscribe).toHaveBeenCalled();
      });
    });
  });

  describe('Quote Selection', () => {
    it('should select a quote by ID', async () => {
      const { result } = renderHook(() => useAvinodeQuotes('trip-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.selectQuote('quote-1');
      });

      expect(result.current.selectedQuoteId).toBe('quote-1');
    });

    it('should clear selection when selecting null', async () => {
      const { result } = renderHook(() => useAvinodeQuotes('trip-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.selectQuote('quote-1');
      });

      expect(result.current.selectedQuoteId).toBe('quote-1');

      act(() => {
        result.current.selectQuote(null);
      });

      expect(result.current.selectedQuoteId).toBeNull();
    });

    it('should maintain selection stability across re-renders', async () => {
      const { result, rerender } = renderHook(() => useAvinodeQuotes('trip-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.selectQuote('quote-2');
      });

      rerender();

      expect(result.current.selectedQuoteId).toBe('quote-2');
    });
  });

  describe('Quote Comparison', () => {
    it('should return filtered quotes for comparison', async () => {
      const { result } = renderHook(() => useAvinodeQuotes('trip-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const compared = result.current.compareQuotes(['quote-1', 'quote-2']);

      expect(compared).toHaveLength(2);
      expect(compared[0].id).toBe('quote-1');
      expect(compared[1].id).toBe('quote-2');
    });

    it('should return empty array for non-existent quote IDs', async () => {
      const { result } = renderHook(() => useAvinodeQuotes('trip-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const compared = result.current.compareQuotes(['non-existent-1', 'non-existent-2']);

      expect(compared).toEqual([]);
    });

    it('should return partial matches when some IDs are invalid', async () => {
      const { result } = renderHook(() => useAvinodeQuotes('trip-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const compared = result.current.compareQuotes(['quote-1', 'non-existent']);

      expect(compared).toHaveLength(1);
      expect(compared[0].id).toBe('quote-1');
    });

    it('should maintain original quote order in comparison', async () => {
      const { result } = renderHook(() => useAvinodeQuotes('trip-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Request in reverse order
      const compared = result.current.compareQuotes(['quote-2', 'quote-1']);

      expect(compared[0].id).toBe('quote-2');
      expect(compared[1].id).toBe('quote-1');
    });
  });

  describe('Manual Refetch', () => {
    it('should refetch quotes when refetch is called', async () => {
      const { result } = renderHook(() => useAvinodeQuotes('trip-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear mock to verify new call
      vi.clearAllMocks();
      mockOrder.mockResolvedValue({ data: mockQuotes, error: null });
      mockEq.mockReturnValue({ order: mockOrder });
      mockSelect.mockReturnValue({ eq: mockEq });
      vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

      await act(async () => {
        await result.current.refetch();
      });

      expect(supabase.from).toHaveBeenCalledWith('quotes');
      expect(mockSelect).toHaveBeenCalledWith('*');
    });

    it('should set loading state during refetch', async () => {
      const { result } = renderHook(() => useAvinodeQuotes('trip-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Setup delayed response
      mockOrder.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ data: mockQuotes, error: null }), 100);
          })
      );

      let refetchPromise: Promise<void>;
      act(() => {
        refetchPromise = result.current.refetch();
      });

      // Should be loading during refetch
      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        await refetchPromise!;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should handle refetch errors', async () => {
      const { result } = renderHook(() => useAvinodeQuotes('trip-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const refetchError = new Error('Refetch failed');
      mockOrder.mockResolvedValue({ data: null, error: refetchError });
      mockEq.mockReturnValue({ order: mockOrder });
      mockSelect.mockReturnValue({ eq: mockEq });
      vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toContain('Refetch failed');
    });
  });

  describe('Callback Stability', () => {
    it('should memoize selectQuote callback', async () => {
      const { result, rerender } = renderHook(() => useAvinodeQuotes('trip-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const firstSelectQuote = result.current.selectQuote;
      rerender();
      const secondSelectQuote = result.current.selectQuote;

      expect(firstSelectQuote).toBe(secondSelectQuote);
    });

    it('should memoize compareQuotes callback', async () => {
      const { result, rerender } = renderHook(() => useAvinodeQuotes('trip-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const firstCompareQuotes = result.current.compareQuotes;
      rerender();
      const secondCompareQuotes = result.current.compareQuotes;

      expect(firstCompareQuotes).toBe(secondCompareQuotes);
    });

    it('should memoize refetch callback', async () => {
      const { result, rerender } = renderHook(() => useAvinodeQuotes('trip-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const firstRefetch = result.current.refetch;
      rerender();
      const secondRefetch = result.current.refetch;

      expect(firstRefetch).toBe(secondRefetch);
    });
  });

  describe('Edge Cases', () => {
    it('should handle tripId change by resubscribing', async () => {
      const { rerender } = renderHook(
        ({ tripId }) => useAvinodeQuotes(tripId),
        { initialProps: { tripId: 'trip-123' } }
      );

      await waitFor(() => {
        expect(mockChannel.subscribe).toHaveBeenCalled();
      });

      const firstUnsubscribe = mockChannel.unsubscribe;

      // Change tripId
      rerender({ tripId: 'trip-456' });

      await waitFor(() => {
        expect(firstUnsubscribe).toHaveBeenCalled();
      });

      expect(supabase.channel).toHaveBeenCalledWith('quotes-trip-456');
    });

    it('should handle realtime connection errors', async () => {
      mockChannel.subscribe = vi.fn().mockImplementation((callback) => {
        setTimeout(() => callback?.('CHANNEL_ERROR'), 0);
        return mockChannel;
      });

      const { result } = renderHook(() => useAvinodeQuotes('trip-123'));

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('disconnected');
      });
    });

    it('should handle null quote data from database', async () => {
      mockOrder.mockResolvedValue({ data: null, error: null });

      const { result } = renderHook(() => useAvinodeQuotes('trip-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.quotes).toEqual([]);
    });

    it('should handle DELETE events via realtime', async () => {
      let realtimeCallback: ((payload: any) => void) | null = null;

      mockChannel.on = vi.fn().mockImplementation((event, config, callback) => {
        realtimeCallback = callback;
        return mockChannel;
      });

      const { result } = renderHook(() => useAvinodeQuotes('trip-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.quotes).toHaveLength(2);

      // Simulate quote deletion
      act(() => {
        realtimeCallback?.({
          eventType: 'DELETE',
          new: {},
          old: mockQuotes[0],
          schema: 'public',
          table: 'quotes',
        });
      });

      await waitFor(() => {
        expect(result.current.quotes).toHaveLength(1);
      });

      expect(result.current.quotes[0].id).toBe('quote-2');
    });
  });
});

// Import the transform functions
import { transformQuote, transformQuotes } from '@/lib/hooks/use-avinode-quotes';

describe('transformQuote', () => {
  it('should transform database quote to API format', () => {
    const dbQuote = mockQuotes[0];
    const apiQuote = transformQuote(dbQuote);

    expect(apiQuote).toEqual({
      quoteId: 'quote-1',
      tripId: 'trip-123',
      operator: {
        name: 'Elite Jets',
        rating: 5,
      },
      aircraft: {
        type: 'Gulfstream G650',
        model: 'G650ER',
      },
      pricing: {
        total: 55000,
        currency: 'USD',
      },
      status: 'quoted',
      validUntil: '2025-12-25T00:00:00Z',
      receivedAt: '2025-12-18T10:00:00Z',
    });
  });

  it('should handle quote with null aircraft details', () => {
    const dbQuote = {
      ...mockQuotes[0],
      aircraft_details: null,
    };
    const apiQuote = transformQuote(dbQuote);

    expect(apiQuote.operator.rating).toBeUndefined();
    expect(apiQuote.aircraft.model).toBeUndefined();
  });

  it('should map all quote statuses correctly', () => {
    const statuses = ['pending', 'received', 'analyzed', 'accepted', 'rejected'];
    const expectedMappings = {
      pending: 'pending',
      received: 'quoted',
      analyzed: 'quoted',
      accepted: 'quoted',
      rejected: 'declined',
    };

    statuses.forEach((status) => {
      const dbQuote = {
        ...mockQuotes[0],
        status: status as any,
      };
      const apiQuote = transformQuote(dbQuote);
      expect(apiQuote.status).toBe(expectedMappings[status as keyof typeof expectedMappings]);
    });
  });

  it('should default to pending for unknown status', () => {
    const dbQuote = {
      ...mockQuotes[0],
      status: 'unknown_status' as any,
    };
    const apiQuote = transformQuote(dbQuote);
    expect(apiQuote.status).toBe('pending');
  });

  it('should handle null valid_until and created_at', () => {
    const dbQuote = {
      ...mockQuotes[0],
      valid_until: null,
      created_at: null,
    };
    const apiQuote = transformQuote(dbQuote);

    expect(apiQuote.validUntil).toBe('');
    expect(apiQuote.receivedAt).toBe('');
  });
});

describe('transformQuotes', () => {
  it('should transform array of database quotes', () => {
    const apiQuotes = transformQuotes(mockQuotes);

    expect(apiQuotes).toHaveLength(2);
    expect(apiQuotes[0].quoteId).toBe('quote-1');
    expect(apiQuotes[1].quoteId).toBe('quote-2');
  });

  it('should handle empty array', () => {
    const apiQuotes = transformQuotes([]);
    expect(apiQuotes).toEqual([]);
  });
});
