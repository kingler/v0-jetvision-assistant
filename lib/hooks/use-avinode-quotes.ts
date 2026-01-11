/**
 * useAvinodeQuotes Hook
 * Real-time quote subscription for Avinode trips
 *
 * Features:
 * - Initial fetch of existing quotes
 * - Real-time subscription for INSERT/UPDATE events
 * - Quote selection tracking
 * - Quote comparison helper
 * - Automatic cleanup on unmount
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Quote as DBQuote } from '@/lib/types/database';

/** Default currency for quotes when not specified in database */
const DEFAULT_CURRENCY = 'USD';

/**
 * Transformed quote interface with nested structure
 * Matches the Linear issue requirements
 */
export interface Quote {
  quoteId: string;
  tripId: string;
  operator: {
    name: string;
    rating?: number;
  };
  aircraft: {
    type: string;
    model?: string;
  };
  pricing: {
    total: number;
    currency: string;
  };
  status: 'quoted' | 'declined' | 'pending' | 'expired';
  validUntil: string;
  receivedAt: string;
}

/**
 * Hook return type
 */
export interface UseAvinodeQuotesReturn {
  quotes: DBQuote[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  selectedQuoteId: string | null;
  selectQuote: (quoteId: string | null) => void;
  compareQuotes: (quoteIds: string[]) => DBQuote[];
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
}

/**
 * Custom hook for managing Avinode quotes with real-time updates
 *
 * @param tripId - The Avinode trip ID (maps to request_id in database)
 * @returns Quote data, loading state, error state, and control functions
 *
 * @example
 * ```tsx
 * function QuotesList({ tripId }: { tripId: string }) {
 *   const {
 *     quotes,
 *     isLoading,
 *     error,
 *     selectedQuoteId,
 *     selectQuote,
 *     compareQuotes,
 *   } = useAvinodeQuotes(tripId);
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <ErrorAlert error={error} />;
 *
 *   return (
 *     <div>
 *       {quotes.map(quote => (
 *         <QuoteCard
 *           key={quote.id}
 *           quote={quote}
 *           isSelected={quote.id === selectedQuoteId}
 *           onSelect={() => selectQuote(quote.id)}
 *         />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAvinodeQuotes(tripId: string): UseAvinodeQuotesReturn {
  // State management
  const [quotes, setQuotes] = useState<DBQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Initialize error state if tripId is missing (instead of throwing during render)
  const [error, setError] = useState<Error | null>(
    tripId ? null : new Error('tripId is required')
  );
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'connecting' | 'disconnected'
  >('connecting');

  /**
   * Fetch quotes from database
   * Memoized to prevent unnecessary re-creation
   */
  const fetchQuotes = useCallback(async () => {
    // Don't fetch if tripId is empty - preserve the error state set in useState
    if (!tripId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('quotes')
        .select('*')
        .eq('request_id', tripId)
        .order('score', { ascending: false, nullsFirst: false });

      if (fetchError) {
        throw fetchError;
      }

      setQuotes(data || []);
    } catch (err) {
      const fetchError = err instanceof Error ? err : new Error('Failed to fetch quotes');
      setError(fetchError);
    } finally {
      setIsLoading(false);
    }
  }, [tripId]);

  /**
   * Manual refetch function
   * Exposed to users for manual refresh
   */
  const refetch = useCallback(async () => {
    await fetchQuotes();
  }, [fetchQuotes]);

  /**
   * Select a quote by ID
   * Pass null to clear selection
   */
  const selectQuote = useCallback((quoteId: string | null) => {
    setSelectedQuoteId(quoteId);
  }, []);

  /**
   * Compare multiple quotes by filtering the quote list
   * Returns quotes in the order of the provided IDs
   *
   * @param quoteIds - Array of quote IDs to compare
   * @returns Array of matching quotes
   */
  const compareQuotes = useCallback(
    (quoteIds: string[]): DBQuote[] => {
      return quoteIds
        .map((id) => quotes.find((quote) => quote.id === id))
        .filter((quote): quote is DBQuote => quote !== undefined);
    },
    [quotes]
  );

  /**
   * Initial fetch on mount or tripId change
   */
  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  /**
   * Real-time subscription setup
   * Subscribes to INSERT and UPDATE events for the specific trip
   */
  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    const setupRealtimeSubscription = () => {
      setConnectionStatus('connecting');

      // Create channel for this specific trip
      channel = supabase.channel(`quotes-${tripId}`);

      // Subscribe to postgres changes
      channel
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'quotes',
            filter: `request_id=eq.${tripId}`,
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              // Add new quote to the list
              setQuotes((prev) => [...prev, payload.new as DBQuote]);
            } else if (payload.eventType === 'UPDATE') {
              // Update existing quote
              setQuotes((prev) =>
                prev.map((quote) =>
                  quote.id === (payload.new as DBQuote).id ? (payload.new as DBQuote) : quote
                )
              );
            } else if (payload.eventType === 'DELETE') {
              // Remove deleted quote
              setQuotes((prev) => prev.filter((quote) => quote.id !== (payload.old as DBQuote).id));
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            setConnectionStatus('disconnected');
          }
        });
    };

    setupRealtimeSubscription();

    // Cleanup subscription on unmount or tripId change
    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [tripId]);

  /**
   * Return hook API
   * All callbacks are memoized for stability
   */
  return useMemo(
    () => ({
      quotes,
      isLoading,
      error,
      refetch,
      selectedQuoteId,
      selectQuote,
      compareQuotes,
      connectionStatus,
    }),
    [
      quotes,
      isLoading,
      error,
      refetch,
      selectedQuoteId,
      selectQuote,
      compareQuotes,
      connectionStatus,
    ]
  );
}

/**
 * Transform database quote to API quote format
 * Useful for components that need the nested structure
 *
 * @param dbQuote - Quote from database
 * @returns Transformed quote with nested structure
 */
export function transformQuote(dbQuote: DBQuote): Quote {
  // Extract aircraft details from JSON field
  const aircraftDetails = dbQuote.aircraft_details as Record<string, any> | null;

  // Map database status to API status
  const statusMap: Record<string, Quote['status']> = {
    pending: 'pending',
    received: 'quoted',
    analyzed: 'quoted',
    accepted: 'quoted',
    rejected: 'declined',
    expired: 'expired',
  };

  return {
    quoteId: dbQuote.id,
    tripId: dbQuote.request_id,
    operator: {
      name: dbQuote.operator_name,
      rating: aircraftDetails?.rating,
    },
    aircraft: {
      type: dbQuote.aircraft_type,
      model: aircraftDetails?.model,
    },
    pricing: {
      total: dbQuote.total_price,
      currency: DEFAULT_CURRENCY,
    },
    status: statusMap[dbQuote.status] || 'pending',
    validUntil: dbQuote.valid_until || '',
    receivedAt: dbQuote.created_at || '',
  };
}

/**
 * Transform array of database quotes to API format
 *
 * @param dbQuotes - Array of quotes from database
 * @returns Array of transformed quotes
 */
export function transformQuotes(dbQuotes: DBQuote[]): Quote[] {
  return dbQuotes.map(transformQuote);
}
