/**
 * findFlightWithFallbacks
 *
 * Looks up an RFQFlight by ID using multiple data sources with fallbacks.
 * This fixes the "Book Flight" button silent failure (ONEK-337) where
 * `rfqFlights.find()` returns null after page reload because the useMemo
 * depends on `activeChat.rfqFlights` which may be stale or empty.
 *
 * Lookup order:
 *   1. rfqFlights memo (primary — freshest computed data)
 *   2. activeChat.rfqFlights (may have fresher data than the memo)
 *   3. activeChat.quotes converted to RFQFlight (legacy quote format)
 */

import type { RFQFlight } from '@/lib/chat/types';

/**
 * Minimal shape of activeChat fields needed for fallback lookup.
 * Keeps the function decoupled from the full ChatSession type.
 */
export interface FlightLookupSources {
  /** The memoized rfqFlights array (primary source) */
  rfqFlightsMemo: RFQFlight[];
  /** Raw rfqFlights from activeChat (fallback 1) */
  activeChatRfqFlights?: RFQFlight[];
  /** Raw quotes from activeChat (fallback 2 — legacy format) */
  activeChatQuotes?: Array<{
    id: string;
    operatorName: string;
    aircraftType: string;
    price: number;
    [key: string]: unknown;
  }>;
}

export interface FlightLookupResult {
  flight: RFQFlight | null;
  source: 'memo' | 'activeChat' | 'quotes' | 'not_found';
}

/**
 * Find an RFQFlight by ID, trying multiple data sources with fallbacks.
 *
 * @param flightId - The flight ID to search for
 * @param sources  - Data sources to search through
 * @returns        - The flight and which source it was found in
 */
export function findFlightWithFallbacks(
  flightId: string,
  sources: FlightLookupSources,
): FlightLookupResult {
  if (!flightId) {
    return { flight: null, source: 'not_found' };
  }

  // 1. Primary: search memoized rfqFlights
  const fromMemo = sources.rfqFlightsMemo?.find(f => f.id === flightId);
  if (fromMemo) {
    return { flight: fromMemo, source: 'memo' };
  }

  // 2. Fallback 1: search activeChat.rfqFlights directly (may differ from memo)
  const fromActiveChat = sources.activeChatRfqFlights?.find(f => f.id === flightId);
  if (fromActiveChat) {
    return { flight: fromActiveChat, source: 'activeChat' };
  }

  // 3. Fallback 2: search activeChat.quotes (legacy format — partial RFQFlight)
  //    Quotes have a different shape but share the `id` field.
  //    We construct a minimal RFQFlight from the quote data.
  const fromQuotes = sources.activeChatQuotes?.find(q => q.id === flightId);
  if (fromQuotes) {
    const minimalFlight: RFQFlight = {
      id: fromQuotes.id,
      quoteId: (fromQuotes as Record<string, unknown>).quoteId as string || fromQuotes.id,
      departureAirport: { icao: 'N/A', name: 'Unknown' },
      arrivalAirport: { icao: 'N/A', name: 'Unknown' },
      departureDate: '',
      flightDuration: (fromQuotes as Record<string, unknown>).flightDuration as string || '',
      aircraftType: fromQuotes.aircraftType || 'Unknown',
      aircraftModel: (fromQuotes as Record<string, unknown>).aircraftModel as string || fromQuotes.aircraftType || 'Unknown',
      passengerCapacity: 0,
      operatorName: fromQuotes.operatorName || 'Unknown',
      totalPrice: fromQuotes.price || 0,
      currency: (fromQuotes as Record<string, unknown>).currency as string || 'USD',
      amenities: {
        wifi: false,
        pets: false,
        smoking: false,
        galley: false,
        lavatory: false,
        medical: false,
      },
      rfqStatus: 'quoted',
      lastUpdated: new Date().toISOString(),
    };
    return { flight: minimalFlight, source: 'quotes' };
  }

  return { flight: null, source: 'not_found' };
}
