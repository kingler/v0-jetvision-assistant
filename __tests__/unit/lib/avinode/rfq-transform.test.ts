/**
 * @vitest-environment node
 */

/**
 * RFQ Transform Tests
 *
 * Tests for normalizeRfqFlights function which transforms
 * raw API quotes into normalized RFQFlight objects.
 *
 * Includes round-trip leg type extraction tests.
 */

import { describe, it, expect } from 'vitest';
import { normalizeRfqFlights } from '@/lib/avinode/rfq-transform';
import type { RFQFlight } from '@/components/avinode/rfq-flight-card';

// =============================================================================
// TEST DATA
// =============================================================================

const baseQuote = {
  id: 'quote-001',
  operator: {
    name: 'Executive Jets',
    rating: 4.5,
  },
  aircraft: {
    type: 'Heavy Jet',
    model: 'Gulfstream G650',
    capacity: 16,
  },
  sellerPrice: {
    price: 45000,
    currency: 'USD',
  },
  schedule: {
    flightDuration: 330, // minutes
  },
  sourcingDisplayStatus: 'Accepted',
};

const baseRoute = {
  departureAirport: { icao: 'KTEB', name: 'Teterboro', city: 'NJ' },
  arrivalAirport: { icao: 'KVNY', name: 'Van Nuys', city: 'CA' },
  departureDate: '2025-01-15',
};

// =============================================================================
// TESTS
// =============================================================================

describe('normalizeRfqFlights', () => {
  describe('Basic Normalization', () => {
    it('returns empty array for null input', () => {
      const result = normalizeRfqFlights(null as any);
      expect(result).toEqual([]);
    });

    it('returns empty array for undefined input', () => {
      const result = normalizeRfqFlights(undefined as any);
      expect(result).toEqual([]);
    });

    it('returns empty array for empty quotes', () => {
      const result = normalizeRfqFlights({ quotes: [] });
      expect(result).toEqual([]);
    });

    it('normalizes a basic quote', () => {
      const result = normalizeRfqFlights({
        quotes: [baseQuote],
        route: baseRoute,
      });

      expect(result).toHaveLength(1);
      expect(result[0].operatorName).toBe('Executive Jets');
      expect(result[0].totalPrice).toBe(45000);
      expect(result[0].currency).toBe('USD');
    });

    it('extracts airport information from route', () => {
      const result = normalizeRfqFlights({
        quotes: [baseQuote],
        route: baseRoute,
      });

      expect(result[0].departureAirport.icao).toBe('KTEB');
      expect(result[0].arrivalAirport.icao).toBe('KVNY');
    });

    it('formats flight duration from minutes', () => {
      const result = normalizeRfqFlights({
        quotes: [baseQuote],
        route: baseRoute,
      });

      expect(result[0].flightDuration).toBe('5h 30m');
    });
  });

  describe('Price Extraction', () => {
    it('extracts price from sellerPrice.price', () => {
      const result = normalizeRfqFlights({
        quotes: [{ ...baseQuote, sellerPrice: { price: 50000, currency: 'USD' } }],
        route: baseRoute,
      });

      expect(result[0].totalPrice).toBe(50000);
    });

    it('extracts price from pricing.total', () => {
      const result = normalizeRfqFlights({
        quotes: [{ ...baseQuote, sellerPrice: undefined, pricing: { total: 48000 } }],
        route: baseRoute,
      });

      expect(result[0].totalPrice).toBe(48000);
    });

    it('extracts price from estimatedPrice for unanswered RFQs', () => {
      const result = normalizeRfqFlights({
        quotes: [{
          ...baseQuote,
          sellerPrice: undefined,
          pricing: undefined,
          estimatedPrice: { amount: 42000, currency: 'EUR' },
          sourcingDisplayStatus: 'Unanswered',
        }],
        route: baseRoute,
      });

      expect(result[0].totalPrice).toBe(42000);
      expect(result[0].currency).toBe('EUR');
    });
  });

  describe('Status Mapping', () => {
    it('maps Accepted status to quoted', () => {
      const result = normalizeRfqFlights({
        quotes: [{ ...baseQuote, sourcingDisplayStatus: 'Accepted' }],
        route: baseRoute,
      });

      expect(result[0].rfqStatus).toBe('quoted');
    });

    it('maps Declined status to declined', () => {
      const result = normalizeRfqFlights({
        quotes: [{ ...baseQuote, sourcingDisplayStatus: 'Declined' }],
        route: baseRoute,
      });

      expect(result[0].rfqStatus).toBe('declined');
    });

    it('updates status to quoted when price exists', () => {
      const result = normalizeRfqFlights({
        quotes: [{
          ...baseQuote,
          sourcingDisplayStatus: 'Pending',
          sellerPrice: { price: 45000, currency: 'USD' },
        }],
        route: baseRoute,
      });

      expect(result[0].rfqStatus).toBe('quoted');
    });
  });

  // =============================================================================
  // ROUND-TRIP LEG TYPE EXTRACTION TESTS
  // =============================================================================

  describe('Round-Trip Leg Type Extraction', () => {
    it('extracts legType from quote.legType', () => {
      const result = normalizeRfqFlights({
        quotes: [{ ...baseQuote, legType: 'outbound' }],
        route: baseRoute,
      });

      expect(result[0].legType).toBe('outbound');
    });

    it('extracts legType from quote.leg_type (snake_case)', () => {
      const result = normalizeRfqFlights({
        quotes: [{ ...baseQuote, leg_type: 'return' }],
        route: baseRoute,
      });

      expect(result[0].legType).toBe('return');
    });

    it('extracts legType from quote.legDirection', () => {
      const result = normalizeRfqFlights({
        quotes: [{ ...baseQuote, legDirection: 'outbound' }],
        route: baseRoute,
      });

      expect(result[0].legType).toBe('outbound');
    });

    it('extracts legSequence from quote.legSequence', () => {
      const result = normalizeRfqFlights({
        quotes: [{ ...baseQuote, legSequence: 1 }],
        route: baseRoute,
      });

      expect(result[0].legSequence).toBe(1);
    });

    it('extracts legSequence from quote.leg_sequence (snake_case)', () => {
      const result = normalizeRfqFlights({
        quotes: [{ ...baseQuote, leg_sequence: 2 }],
        route: baseRoute,
      });

      expect(result[0].legSequence).toBe(2);
    });

    it('infers legType return from legSequence 2', () => {
      const result = normalizeRfqFlights({
        quotes: [{ ...baseQuote, legSequence: 2 }],
        route: baseRoute,
      });

      expect(result[0].legType).toBe('return');
    });

    it('infers legSequence 1 from legType outbound', () => {
      const result = normalizeRfqFlights({
        quotes: [{ ...baseQuote, legType: 'outbound' }],
        route: baseRoute,
      });

      expect(result[0].legSequence).toBe(1);
    });

    it('infers legSequence 2 from legType return', () => {
      const result = normalizeRfqFlights({
        quotes: [{ ...baseQuote, legType: 'return' }],
        route: baseRoute,
      });

      expect(result[0].legSequence).toBe(2);
    });

    it('handles quotes without leg information (one-way)', () => {
      const result = normalizeRfqFlights({
        quotes: [baseQuote], // No leg info
        route: baseRoute,
      });

      expect(result[0].legType).toBeUndefined();
      expect(result[0].legSequence).toBeUndefined();
    });

    it('correctly groups outbound and return flights', () => {
      const outboundQuote = { ...baseQuote, id: 'out-1', legType: 'outbound', legSequence: 1 };
      const returnQuote = {
        ...baseQuote,
        id: 'ret-1',
        legType: 'return',
        legSequence: 2,
      };

      const result = normalizeRfqFlights({
        quotes: [outboundQuote, returnQuote],
        route: baseRoute,
      });

      expect(result).toHaveLength(2);

      const outbound = result.find((f: RFQFlight) => f.legType === 'outbound');
      const returnFlight = result.find((f: RFQFlight) => f.legType === 'return');

      expect(outbound).toBeDefined();
      expect(outbound?.legSequence).toBe(1);
      expect(returnFlight).toBeDefined();
      expect(returnFlight?.legSequence).toBe(2);
    });
  });

  describe('Deduplication', () => {
    it('removes duplicate quotes by ID', () => {
      const result = normalizeRfqFlights({
        quotes: [
          { ...baseQuote, id: 'quote-001' },
          { ...baseQuote, id: 'quote-001' }, // Duplicate
        ],
        route: baseRoute,
      });

      expect(result).toHaveLength(1);
    });

    it('keeps quotes with different IDs', () => {
      const result = normalizeRfqFlights({
        quotes: [
          { ...baseQuote, id: 'quote-001' },
          { ...baseQuote, id: 'quote-002' },
        ],
        route: baseRoute,
      });

      expect(result).toHaveLength(2);
    });
  });

  describe('Already Normalized Flights', () => {
    it('passes through already normalized RFQFlight objects', () => {
      const normalizedFlight: RFQFlight = {
        id: 'flight-001',
        quoteId: 'quote-001',
        departureAirport: { icao: 'KTEB', name: 'Teterboro' },
        arrivalAirport: { icao: 'KVNY', name: 'Van Nuys' },
        departureDate: '2025-01-15',
        flightDuration: '5h 30m',
        aircraftType: 'Heavy Jet',
        aircraftModel: 'G650',
        passengerCapacity: 16,
        operatorName: 'Executive Jets',
        totalPrice: 45000,
        currency: 'USD',
        amenities: { wifi: true, pets: false, smoking: false, galley: true, lavatory: true, medical: false },
        rfqStatus: 'quoted',
        lastUpdated: '2025-01-01T00:00:00Z',
        legType: 'outbound',
        legSequence: 1,
      };

      const result = normalizeRfqFlights({
        quotes: [normalizedFlight as any],
        route: baseRoute,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(normalizedFlight);
    });
  });
});
