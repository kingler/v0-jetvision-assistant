/**
 * Tests for findFlightWithFallbacks (ONEK-337)
 *
 * Verifies that the flight lookup falls back through multiple data sources
 * when the primary rfqFlights memo is empty/stale after page reload.
 */

import { describe, it, expect } from 'vitest';
import {
  findFlightWithFallbacks,
  type FlightLookupSources,
} from '@/lib/chat/find-flight';
import type { RFQFlight } from '@/lib/chat/types';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeRFQFlight(overrides: Partial<RFQFlight> = {}): RFQFlight {
  return {
    id: 'flight-1',
    quoteId: 'quote-1',
    departureAirport: { icao: 'KTEB', name: 'Teterboro' },
    arrivalAirport: { icao: 'KLAX', name: 'Los Angeles' },
    departureDate: '2026-04-01',
    flightDuration: '5h 30m',
    aircraftType: 'Gulfstream G650',
    aircraftModel: 'G650',
    passengerCapacity: 14,
    operatorName: 'NetJets',
    totalPrice: 45000,
    currency: 'USD',
    amenities: {
      wifi: true,
      pets: false,
      smoking: false,
      galley: true,
      lavatory: true,
      medical: false,
    },
    rfqStatus: 'quoted',
    lastUpdated: '2026-03-01T12:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('findFlightWithFallbacks', () => {
  describe('primary lookup: rfqFlightsMemo', () => {
    it('should find flight in memo and return source "memo"', () => {
      const flight = makeRFQFlight({ id: 'abc-123' });
      const sources: FlightLookupSources = {
        rfqFlightsMemo: [flight],
      };

      const result = findFlightWithFallbacks('abc-123', sources);

      expect(result.flight).toEqual(flight);
      expect(result.source).toBe('memo');
    });

    it('should return the exact flight object from memo (not a copy)', () => {
      const flight = makeRFQFlight({ id: 'abc-123' });
      const sources: FlightLookupSources = {
        rfqFlightsMemo: [flight],
      };

      const result = findFlightWithFallbacks('abc-123', sources);

      expect(result.flight).toBe(flight);
    });
  });

  describe('fallback 1: activeChatRfqFlights', () => {
    it('should find flight in activeChat.rfqFlights when memo is empty', () => {
      const flight = makeRFQFlight({ id: 'abc-123' });
      const sources: FlightLookupSources = {
        rfqFlightsMemo: [], // empty after reload
        activeChatRfqFlights: [flight],
      };

      const result = findFlightWithFallbacks('abc-123', sources);

      expect(result.flight).toEqual(flight);
      expect(result.source).toBe('activeChat');
    });

    it('should find flight in activeChat when memo has different flights', () => {
      const memoFlight = makeRFQFlight({ id: 'other-flight' });
      const activeChatFlight = makeRFQFlight({ id: 'abc-123' });
      const sources: FlightLookupSources = {
        rfqFlightsMemo: [memoFlight],
        activeChatRfqFlights: [activeChatFlight],
      };

      const result = findFlightWithFallbacks('abc-123', sources);

      expect(result.flight).toEqual(activeChatFlight);
      expect(result.source).toBe('activeChat');
    });

    it('should prefer memo over activeChat when both have the flight', () => {
      const memoFlight = makeRFQFlight({ id: 'abc-123', totalPrice: 50000 });
      const activeChatFlight = makeRFQFlight({ id: 'abc-123', totalPrice: 45000 });
      const sources: FlightLookupSources = {
        rfqFlightsMemo: [memoFlight],
        activeChatRfqFlights: [activeChatFlight],
      };

      const result = findFlightWithFallbacks('abc-123', sources);

      expect(result.flight).toBe(memoFlight);
      expect(result.source).toBe('memo');
    });
  });

  describe('fallback 2: activeChatQuotes (legacy)', () => {
    it('should construct minimal RFQFlight from legacy quote data', () => {
      const sources: FlightLookupSources = {
        rfqFlightsMemo: [],
        activeChatRfqFlights: [],
        activeChatQuotes: [
          {
            id: 'quote-legacy',
            operatorName: 'XO Jets',
            aircraftType: 'Citation X',
            price: 30000,
          },
        ],
      };

      const result = findFlightWithFallbacks('quote-legacy', sources);

      expect(result.flight).not.toBeNull();
      expect(result.source).toBe('quotes');
      expect(result.flight!.id).toBe('quote-legacy');
      expect(result.flight!.operatorName).toBe('XO Jets');
      expect(result.flight!.aircraftType).toBe('Citation X');
      expect(result.flight!.totalPrice).toBe(30000);
      expect(result.flight!.currency).toBe('USD');
    });

    it('should handle quote with extra fields gracefully', () => {
      const sources: FlightLookupSources = {
        rfqFlightsMemo: [],
        activeChatRfqFlights: undefined,
        activeChatQuotes: [
          {
            id: 'q-1',
            operatorName: 'VistaJet',
            aircraftType: 'Global 7500',
            price: 85000,
            quoteId: 'avnd-q-1',
            currency: 'EUR',
            flightDuration: '4h 15m',
            aircraftModel: 'Global 7500',
          },
        ],
      };

      const result = findFlightWithFallbacks('q-1', sources);

      expect(result.flight).not.toBeNull();
      expect(result.source).toBe('quotes');
      expect(result.flight!.quoteId).toBe('avnd-q-1');
      expect(result.flight!.currency).toBe('EUR');
      expect(result.flight!.flightDuration).toBe('4h 15m');
      expect(result.flight!.aircraftModel).toBe('Global 7500');
    });
  });

  describe('not found', () => {
    it('should return null when flight is not in any source', () => {
      const sources: FlightLookupSources = {
        rfqFlightsMemo: [makeRFQFlight({ id: 'other' })],
        activeChatRfqFlights: [makeRFQFlight({ id: 'another' })],
        activeChatQuotes: [
          { id: 'legacy', operatorName: 'Op', aircraftType: 'A', price: 0 },
        ],
      };

      const result = findFlightWithFallbacks('nonexistent', sources);

      expect(result.flight).toBeNull();
      expect(result.source).toBe('not_found');
    });

    it('should return null when all sources are empty', () => {
      const sources: FlightLookupSources = {
        rfqFlightsMemo: [],
        activeChatRfqFlights: [],
        activeChatQuotes: [],
      };

      const result = findFlightWithFallbacks('abc-123', sources);

      expect(result.flight).toBeNull();
      expect(result.source).toBe('not_found');
    });

    it('should return null when all sources are undefined', () => {
      const sources: FlightLookupSources = {
        rfqFlightsMemo: [],
      };

      const result = findFlightWithFallbacks('abc-123', sources);

      expect(result.flight).toBeNull();
      expect(result.source).toBe('not_found');
    });
  });

  describe('edge cases', () => {
    it('should return not_found for empty flightId', () => {
      const sources: FlightLookupSources = {
        rfqFlightsMemo: [makeRFQFlight({ id: 'flight-1' })],
      };

      const result = findFlightWithFallbacks('', sources);

      expect(result.flight).toBeNull();
      expect(result.source).toBe('not_found');
    });

    it('should handle multiple flights and find the correct one', () => {
      const target = makeRFQFlight({ id: 'target', operatorName: 'Target Op' });
      const sources: FlightLookupSources = {
        rfqFlightsMemo: [
          makeRFQFlight({ id: 'first' }),
          target,
          makeRFQFlight({ id: 'third' }),
        ],
      };

      const result = findFlightWithFallbacks('target', sources);

      expect(result.flight).toBe(target);
      expect(result.source).toBe('memo');
    });

    it('should handle undefined activeChatRfqFlights gracefully', () => {
      const sources: FlightLookupSources = {
        rfqFlightsMemo: [],
        activeChatRfqFlights: undefined,
        activeChatQuotes: undefined,
      };

      const result = findFlightWithFallbacks('abc-123', sources);

      expect(result.flight).toBeNull();
      expect(result.source).toBe('not_found');
    });

    it('should handle quote with zero price', () => {
      const sources: FlightLookupSources = {
        rfqFlightsMemo: [],
        activeChatQuotes: [
          { id: 'zero-price', operatorName: 'Op', aircraftType: 'Jet', price: 0 },
        ],
      };

      const result = findFlightWithFallbacks('zero-price', sources);

      expect(result.flight).not.toBeNull();
      expect(result.flight!.totalPrice).toBe(0);
      expect(result.source).toBe('quotes');
    });
  });
});
