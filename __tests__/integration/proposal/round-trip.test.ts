/**
 * @vitest-environment node
 */

/**
 * Round-Trip Proposal Integration Tests
 *
 * Integration tests for the complete round-trip proposal flow.
 */

import { describe, it, expect } from 'vitest';
import { normalizeRfqFlights } from '@/lib/avinode/rfq-transform';

// =============================================================================
// TEST DATA
// =============================================================================

const mockOutboundQuote = {
  id: 'quote-outbound-001',
  operator: { name: 'Executive Jets', rating: 4.5 },
  aircraft: { type: 'Heavy Jet', model: 'Gulfstream G650', capacity: 16 },
  sellerPrice: { price: 45000, currency: 'USD' },
  schedule: { flightDuration: 330 },
  sourcingDisplayStatus: 'Accepted',
  legType: 'outbound',
  legSequence: 1,
};

const mockReturnQuote = {
  id: 'quote-return-001',
  operator: { name: 'Executive Jets', rating: 4.5 },
  aircraft: { type: 'Heavy Jet', model: 'Gulfstream G650', capacity: 16 },
  sellerPrice: { price: 42000, currency: 'USD' },
  schedule: { flightDuration: 310 },
  sourcingDisplayStatus: 'Accepted',
  legType: 'return',
  legSequence: 2,
};

const mockRoute = {
  departureAirport: { icao: 'KTEB', name: 'Teterboro', city: 'NJ' },
  arrivalAirport: { icao: 'KLAX', name: 'Los Angeles Intl', city: 'CA' },
  departureDate: '2025-02-15',
};

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe('Round-Trip Proposal Integration', () => {
  describe('RFQ Data Transformation', () => {
    it('transforms raw API quotes into normalized flights with leg info', () => {
      const result = normalizeRfqFlights({
        quotes: [mockOutboundQuote, mockReturnQuote],
        route: mockRoute,
      });

      expect(result).toHaveLength(2);

      // Check outbound flight
      const outbound = result.find((f) => f.legType === 'outbound');
      expect(outbound).toBeDefined();
      expect(outbound?.legSequence).toBe(1);
      expect(outbound?.totalPrice).toBe(45000);
      expect(outbound?.departureAirport.icao).toBe('KTEB');
      expect(outbound?.arrivalAirport.icao).toBe('KLAX');

      // Check return flight
      const returnFlight = result.find((f) => f.legType === 'return');
      expect(returnFlight).toBeDefined();
      expect(returnFlight?.legSequence).toBe(2);
      expect(returnFlight?.totalPrice).toBe(42000);
    });

    it('calculates combined pricing for round-trip', () => {
      const result = normalizeRfqFlights({
        quotes: [mockOutboundQuote, mockReturnQuote],
        route: mockRoute,
      });

      const outbound = result.find((f) => f.legType === 'outbound');
      const returnFlight = result.find((f) => f.legType === 'return');

      const combinedTotal = (outbound?.totalPrice ?? 0) + (returnFlight?.totalPrice ?? 0);
      expect(combinedTotal).toBe(87000); // 45000 + 42000
    });

    it('preserves flight details for both legs', () => {
      const result = normalizeRfqFlights({
        quotes: [mockOutboundQuote, mockReturnQuote],
        route: mockRoute,
      });

      result.forEach((flight) => {
        expect(flight.operatorName).toBe('Executive Jets');
        expect(flight.aircraftType).toBe('Heavy Jet');
        expect(flight.aircraftModel).toBe('Gulfstream G650');
        expect(flight.passengerCapacity).toBe(16);
        expect(flight.currency).toBe('USD');
        expect(flight.rfqStatus).toBe('quoted');
      });
    });
  });

  describe('Quote Grouping for Round-Trip Display', () => {
    it('separates outbound and return quotes correctly', () => {
      const quotes = [
        { ...mockOutboundQuote, id: 'out-1' },
        { ...mockOutboundQuote, id: 'out-2', sellerPrice: { price: 48000, currency: 'USD' } },
        { ...mockReturnQuote, id: 'ret-1' },
        { ...mockReturnQuote, id: 'ret-2', sellerPrice: { price: 44000, currency: 'USD' } },
      ];

      const result = normalizeRfqFlights({ quotes, route: mockRoute });

      const outboundFlights = result.filter((f) => f.legType === 'outbound');
      const returnFlights = result.filter((f) => f.legType === 'return');

      expect(outboundFlights).toHaveLength(2);
      expect(returnFlights).toHaveLength(2);
    });

    it('allows selecting different operators for each leg', () => {
      const quotes = [
        { ...mockOutboundQuote, id: 'out-1', operator: { name: 'Jet A', rating: 4.8 } },
        { ...mockReturnQuote, id: 'ret-1', operator: { name: 'Jet B', rating: 4.6 } },
      ];

      const result = normalizeRfqFlights({ quotes, route: mockRoute });

      const outbound = result.find((f) => f.legType === 'outbound');
      const returnFlight = result.find((f) => f.legType === 'return');

      expect(outbound?.operatorName).toBe('Jet A');
      expect(returnFlight?.operatorName).toBe('Jet B');
    });
  });

  describe('Backward Compatibility', () => {
    it('handles one-way quotes without leg information', () => {
      const oneWayQuote = {
        ...mockOutboundQuote,
        id: 'one-way-001',
        legType: undefined,
        legSequence: undefined,
      };

      const result = normalizeRfqFlights({
        quotes: [oneWayQuote],
        route: mockRoute,
      });

      expect(result).toHaveLength(1);
      expect(result[0].legType).toBeUndefined();
      expect(result[0].legSequence).toBeUndefined();
      expect(result[0].totalPrice).toBe(45000);
    });

    it('handles mixed quotes (some with leg info, some without)', () => {
      const quotes = [
        { ...mockOutboundQuote, id: 'with-leg' },
        { ...mockOutboundQuote, id: 'without-leg', legType: undefined, legSequence: undefined },
      ];

      const result = normalizeRfqFlights({ quotes, route: mockRoute });

      expect(result).toHaveLength(2);

      const withLeg = result.find((f) => f.id === 'with-leg');
      const withoutLeg = result.find((f) => f.id === 'without-leg');

      expect(withLeg?.legType).toBe('outbound');
      expect(withoutLeg?.legType).toBeUndefined();
    });
  });
});
