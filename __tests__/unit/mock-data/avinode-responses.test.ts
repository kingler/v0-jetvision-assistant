/**
 * Test Suite: Avinode API Response Mocks
 * ONEK-76: Comprehensive testing of mock response generators
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateMockFlightResults,
  generateMockRFPResponse,
  generateMockQuotes,
  storeRFP,
  getStoredQuotes,
  simulateAPIDelay,
  clearStoredRFPs,
  getAllStoredRFPs,
  getExampleResponses,
} from '@/lib/mock-data/avinode-responses';
import type { FlightSearchParams } from '@/mcp-servers/avinode-mcp-server/src/types';

describe('avinode-responses', () => {
  beforeEach(() => {
    clearStoredRFPs();
  });

  describe('generateMockFlightResults', () => {
    const baseParams: FlightSearchParams = {
      departure_airport: 'KTEB',
      arrival_airport: 'KPBI',
      departure_date: '2025-12-15',
      passengers: 6,
    };

    it('should return 3-8 flight results for valid params', () => {
      const results = generateMockFlightResults(baseParams);

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThanOrEqual(3);
      expect(results.length).toBeLessThanOrEqual(8);
    });

    it('should return proper FlightResult structure', () => {
      const results = generateMockFlightResults(baseParams);
      const result = results[0];

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('operator');
      expect(result).toHaveProperty('aircraft');
      expect(result).toHaveProperty('schedule');
      expect(result).toHaveProperty('pricing');
      expect(result).toHaveProperty('availability');

      expect(result.operator).toHaveProperty('id');
      expect(result.operator).toHaveProperty('name');
      expect(result.operator).toHaveProperty('rating');

      expect(result.aircraft).toHaveProperty('type');
      expect(result.aircraft).toHaveProperty('model');
      expect(result.aircraft).toHaveProperty('registration');
      expect(result.aircraft).toHaveProperty('capacity');
    });

    it('should filter by passenger capacity', () => {
      const params: FlightSearchParams = {
        ...baseParams,
        passengers: 15, // Requires heavy or ultra-long-range jets
      };

      const results = generateMockFlightResults(params);

      results.forEach((result) => {
        expect(result.aircraft.capacity).toBeGreaterThanOrEqual(15);
      });
    });

    it('should filter by aircraft types when specified', () => {
      const params: FlightSearchParams = {
        ...baseParams,
        aircraft_types: ['light', 'midsize'],
      };

      const results = generateMockFlightResults(params);

      results.forEach((result) => {
        expect(['light', 'midsize']).toContain(result.aircraft.type);
      });
    });

    it('should filter by max budget when specified', () => {
      const params: FlightSearchParams = {
        ...baseParams,
        max_budget: 3000,
      };

      const results = generateMockFlightResults(params);

      results.forEach((result) => {
        if (result.pricing.price_per_hour) {
          expect(result.pricing.price_per_hour).toBeLessThanOrEqual(3000);
        }
      });
    });

    it('should filter by minimum operator rating when specified', () => {
      const params: FlightSearchParams = {
        ...baseParams,
        min_operator_rating: 4.8,
      };

      const results = generateMockFlightResults(params);

      results.forEach((result) => {
        expect(result.operator.rating).toBeGreaterThanOrEqual(4.8);
      });
    });

    it('should return varied pricing tiers (competitive, market, premium)', () => {
      const results = generateMockFlightResults(baseParams);

      const prices = results
        .filter((r) => r.pricing.price_per_hour)
        .map((r) => r.pricing.price_per_hour!);

      // Should have price variation
      const uniquePrices = new Set(prices);
      expect(uniquePrices.size).toBeGreaterThan(1);
    });

    it('should calculate realistic flight times', () => {
      const results = generateMockFlightResults(baseParams);

      results.forEach((result) => {
        expect(result.schedule.duration_minutes).toBeGreaterThan(0);
        expect(result.schedule.duration_minutes).toBeLessThan(1000); // Less than ~16 hours
      });
    });

    it('should generate proper flight schedule with departure and arrival times', () => {
      const results = generateMockFlightResults(baseParams);
      const result = results[0];

      expect(result.schedule.departure_time).toBeTruthy();
      expect(result.schedule.arrival_time).toBeTruthy();

      const departureTime = new Date(result.schedule.departure_time);
      const arrivalTime = new Date(result.schedule.arrival_time);

      expect(arrivalTime.getTime()).toBeGreaterThan(departureTime.getTime());
    });

    it('should include amenities based on aircraft category', () => {
      const results = generateMockFlightResults(baseParams);

      results.forEach((result) => {
        expect(result.aircraft.amenities).toBeInstanceOf(Array);
        if (result.aircraft.amenities && result.aircraft.amenities.length > 0) {
          expect(result.aircraft.amenities.length).toBeGreaterThan(0);
        }
      });
    });

    it('should return empty array when no aircraft match filters', () => {
      const params: FlightSearchParams = {
        ...baseParams,
        passengers: 100, // Unrealistic capacity
        max_budget: 100, // Unrealistically low budget
      };

      const results = generateMockFlightResults(params);

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBe(0);
    });

    it('should generate unique flight IDs', () => {
      const results = generateMockFlightResults(baseParams);

      const ids = results.map((r) => r.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should use default departure time when not specified', () => {
      const params: FlightSearchParams = {
        departure_airport: 'KTEB',
        arrival_airport: 'KPBI',
        departure_date: '2025-12-15',
        passengers: 6,
        // No departure_time specified
      };

      const results = generateMockFlightResults(params);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].schedule.departure_time).toBeTruthy();
    });

    it('should handle empty aircraft types filter gracefully', () => {
      const params: FlightSearchParams = {
        ...baseParams,
        aircraft_types: [],
      };

      const results = generateMockFlightResults(params);

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle zero max budget', () => {
      const params: FlightSearchParams = {
        ...baseParams,
        max_budget: 0,
      };

      const results = generateMockFlightResults(params);

      expect(results).toBeInstanceOf(Array);
      // May be empty or filtered
    });

    it('should handle minimum passenger count', () => {
      const params: FlightSearchParams = {
        ...baseParams,
        passengers: 1,
      };

      const results = generateMockFlightResults(params);

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('generateMockRFPResponse', () => {
    const baseParams: FlightSearchParams = {
      departure_airport: 'KTEB',
      arrival_airport: 'KPBI',
      departure_date: '2025-12-15',
      passengers: 6,
    };

    it('should generate RFP with unique ID format', () => {
      const rfp = generateMockRFPResponse(baseParams, 'Test Client');

      expect(rfp.rfp_id).toMatch(/^RFP-\d{8}-\d{3}$/);
    });

    it('should generate unique RFP IDs on multiple calls', () => {
      const rfp1 = generateMockRFPResponse(baseParams, 'Client 1');
      const rfp2 = generateMockRFPResponse(baseParams, 'Client 2');

      expect(rfp1.rfp_id).not.toBe(rfp2.rfp_id);
    });

    it('should return status as sent', () => {
      const rfp = generateMockRFPResponse(baseParams, 'Test Client');

      expect(rfp.status).toBe('sent');
    });

    it('should estimate 2-5 operators contacted', () => {
      const rfp = generateMockRFPResponse(baseParams, 'Test Client');

      expect(rfp.operators_contacted).toBeGreaterThanOrEqual(2);
      expect(rfp.operators_contacted).toBeLessThanOrEqual(5);
    });

    it('should include created_at timestamp', () => {
      const rfp = generateMockRFPResponse(baseParams, 'Test Client');

      expect(rfp.created_at).toBeTruthy();
      const createdDate = new Date(rfp.created_at);
      expect(createdDate.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should include quote_deadline from params', () => {
      const deadline = '2025-12-13T18:00:00Z';
      const rfp = generateMockRFPResponse(baseParams, 'Test Client', deadline);

      expect(rfp.quote_deadline).toBe(deadline);
    });

    it('should include watch_url with RFP ID', () => {
      const rfp = generateMockRFPResponse(baseParams, 'Test Client');

      expect(rfp.watch_url).toBeTruthy();
      expect(rfp.watch_url).toContain(rfp.rfp_id);
    });

    it('should return proper RFPResponse structure', () => {
      const rfp = generateMockRFPResponse(baseParams, 'Test Client');

      expect(rfp).toHaveProperty('rfp_id');
      expect(rfp).toHaveProperty('status');
      expect(rfp).toHaveProperty('created_at');
      expect(rfp).toHaveProperty('operators_contacted');
      expect(rfp).toHaveProperty('quote_deadline');
      expect(rfp).toHaveProperty('watch_url');
    });

    it('should use default 48-hour deadline when not provided', () => {
      const rfp = generateMockRFPResponse(baseParams, 'Test Client');

      expect(rfp.quote_deadline).toBeTruthy();
      const deadline = new Date(rfp.quote_deadline!);
      const now = Date.now();
      const hoursDiff = (deadline.getTime() - now) / (1000 * 60 * 60);

      expect(hoursDiff).toBeGreaterThan(47);
      expect(hoursDiff).toBeLessThan(49);
    });
  });

  describe('generateMockQuotes', () => {
    it('should generate 2-5 quotes', () => {
      const quotes = generateMockQuotes('RFP-20251101-001');

      expect(quotes.length).toBeGreaterThanOrEqual(2);
      expect(quotes.length).toBeLessThanOrEqual(5);
    });

    it('should generate unique quote IDs', () => {
      const quotes = generateMockQuotes('RFP-20251101-001');

      const ids = quotes.map((q) => q.quote_id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should include pricing breakdown with calculations', () => {
      const quotes = generateMockQuotes('RFP-20251101-001');

      quotes.forEach((quote) => {
        expect(quote.pricing).toHaveProperty('total');
        expect(quote.pricing).toHaveProperty('currency');
        expect(quote.pricing.currency).toBe('USD');

        if (quote.pricing.breakdown) {
          expect(quote.pricing.breakdown).toHaveProperty('base_price');
          expect(quote.pricing.breakdown).toHaveProperty('fuel_surcharge');
          expect(quote.pricing.breakdown).toHaveProperty('taxes_fees');
        }
      });
    });

    it('should include operator information', () => {
      const quotes = generateMockQuotes('RFP-20251101-001');

      quotes.forEach((quote) => {
        expect(quote.operator).toHaveProperty('id');
        expect(quote.operator).toHaveProperty('name');
        expect(quote.operator).toHaveProperty('rating');
        expect(quote.operator.rating).toBeGreaterThanOrEqual(0);
        expect(quote.operator.rating).toBeLessThanOrEqual(5);
      });
    });

    it('should include aircraft information', () => {
      const quotes = generateMockQuotes('RFP-20251101-001');

      quotes.forEach((quote) => {
        expect(quote.aircraft).toHaveProperty('type');
        expect(quote.aircraft).toHaveProperty('model');
        expect(quote.aircraft).toHaveProperty('registration');
      });
    });

    it('should include terms with cancellation policy and payment terms', () => {
      const quotes = generateMockQuotes('RFP-20251101-001');

      quotes.forEach((quote) => {
        if (quote.terms) {
          expect(quote.terms).toHaveProperty('cancellation_policy');
          expect(quote.terms).toHaveProperty('payment_terms');
        }
      });
    });

    it('should include valid_until timestamp (48-96 hours in future)', () => {
      const quotes = generateMockQuotes('RFP-20251101-001');

      quotes.forEach((quote) => {
        expect(quote.valid_until).toBeTruthy();
        const validUntil = new Date(quote.valid_until);
        const now = Date.now();
        const hoursDiff = (validUntil.getTime() - now) / (1000 * 60 * 60);

        expect(hoursDiff).toBeGreaterThan(47);
        expect(hoursDiff).toBeLessThan(97);
      });
    });

    it('should include received_at timestamp (1-12 hours ago)', () => {
      const quotes = generateMockQuotes('RFP-20251101-001');

      quotes.forEach((quote) => {
        expect(quote.received_at).toBeTruthy();
        const receivedAt = new Date(quote.received_at);
        const now = Date.now();
        const hoursDiff = (now - receivedAt.getTime()) / (1000 * 60 * 60);

        expect(hoursDiff).toBeGreaterThan(0);
        expect(hoursDiff).toBeLessThan(13);
      });
    });

    it('should include optional notes on some quotes', () => {
      const quotes = generateMockQuotes('RFP-20251101-001');

      // First quote should have notes
      expect(quotes[0].notes).toBeTruthy();
    });

    it('should have pricing variation across quotes', () => {
      const quotes = generateMockQuotes('RFP-20251101-001');

      const totals = quotes.map((q) => q.pricing.total);
      const uniqueTotals = new Set(totals);

      // Should have at least 2 different prices
      expect(uniqueTotals.size).toBeGreaterThan(1);
    });

    it('should return proper Quote structure', () => {
      const quotes = generateMockQuotes('RFP-20251101-001');
      const quote = quotes[0];

      expect(quote).toHaveProperty('quote_id');
      expect(quote).toHaveProperty('operator');
      expect(quote).toHaveProperty('aircraft');
      expect(quote).toHaveProperty('pricing');
      expect(quote).toHaveProperty('valid_until');
      expect(quote).toHaveProperty('received_at');
    });
  });

  describe('RFP storage', () => {
    const baseParams: FlightSearchParams = {
      departure_airport: 'KTEB',
      arrival_airport: 'KPBI',
      departure_date: '2025-12-15',
      passengers: 6,
    };

    it('should store and retrieve RFP quotes', () => {
      const rfpId = 'RFP-20251101-001';
      storeRFP(rfpId, baseParams, 'Test Client');

      const quotes = getStoredQuotes(rfpId);

      expect(quotes).not.toBeNull();
      expect(quotes).toBeInstanceOf(Array);
      expect(quotes!.length).toBeGreaterThanOrEqual(2);
    });

    it('should return null for non-existent RFP ID', () => {
      const quotes = getStoredQuotes('NON-EXISTENT-RFP');

      expect(quotes).toBeNull();
    });

    it('should store flight params and client reference', () => {
      const rfpId = 'RFP-20251101-002';
      storeRFP(rfpId, baseParams, 'Test Client');

      const allRFPs = getAllStoredRFPs();
      const storedRFP = allRFPs.find((r) => r.rfpId === rfpId);

      expect(storedRFP).toBeTruthy();
      expect(storedRFP!.params).toEqual(baseParams);
      expect(storedRFP!.clientName).toBe('Test Client');
    });

    it('should initialize status as in_progress', () => {
      const rfpId = 'RFP-20251101-003';
      storeRFP(rfpId, baseParams, 'Test Client');

      const allRFPs = getAllStoredRFPs();
      const storedRFP = allRFPs.find((r) => r.rfpId === rfpId);

      expect(storedRFP!.status).toBe('in_progress');
    });

    it('should update status to completed when quotes are retrieved', () => {
      const rfpId = 'RFP-20251101-004';
      storeRFP(rfpId, baseParams, 'Test Client');

      getStoredQuotes(rfpId);

      const allRFPs = getAllStoredRFPs();
      const storedRFP = allRFPs.find((r) => r.rfpId === rfpId);

      expect(storedRFP!.status).toBe('completed');
    });

    it('should store multiple RFPs independently', () => {
      storeRFP('RFP-001', baseParams, 'Client 1');
      storeRFP('RFP-002', baseParams, 'Client 2');
      storeRFP('RFP-003', baseParams, 'Client 3');

      const allRFPs = getAllStoredRFPs();

      expect(allRFPs.length).toBe(3);
    });

    it('should clear all stored RFPs', () => {
      storeRFP('RFP-001', baseParams, 'Client 1');
      storeRFP('RFP-002', baseParams, 'Client 2');

      clearStoredRFPs();

      const allRFPs = getAllStoredRFPs();
      expect(allRFPs.length).toBe(0);
    });

    it('should generate quotes automatically on storage', () => {
      const rfpId = 'RFP-20251101-005';
      storeRFP(rfpId, baseParams, 'Test Client');

      const allRFPs = getAllStoredRFPs();
      const storedRFP = allRFPs.find((r) => r.rfpId === rfpId);

      expect(storedRFP!.quotes).toBeInstanceOf(Array);
      expect(storedRFP!.quotes.length).toBeGreaterThan(0);
    });
  });

  describe('getAllStoredRFPs', () => {
    const baseParams: FlightSearchParams = {
      departure_airport: 'KTEB',
      arrival_airport: 'KPBI',
      departure_date: '2025-12-15',
      passengers: 6,
    };

    it('should return empty array when no RFPs stored', () => {
      const allRFPs = getAllStoredRFPs();

      expect(allRFPs).toBeInstanceOf(Array);
      expect(allRFPs.length).toBe(0);
    });

    it('should return all stored RFPs', () => {
      storeRFP('RFP-001', baseParams, 'Client 1');
      storeRFP('RFP-002', baseParams, 'Client 2');

      const allRFPs = getAllStoredRFPs();

      expect(allRFPs.length).toBe(2);
    });

    it('should include all RFP data', () => {
      storeRFP('RFP-001', baseParams, 'Client 1');

      const allRFPs = getAllStoredRFPs();
      const rfp = allRFPs[0];

      expect(rfp).toHaveProperty('rfpId');
      expect(rfp).toHaveProperty('params');
      expect(rfp).toHaveProperty('clientName');
      expect(rfp).toHaveProperty('quotes');
      expect(rfp).toHaveProperty('status');
      expect(rfp).toHaveProperty('createdAt');
    });
  });

  describe('simulateAPIDelay', () => {
    it('should return a Promise', () => {
      const result = simulateAPIDelay();

      expect(result).toBeInstanceOf(Promise);
    });

    it('should delay between 300-800ms', async () => {
      const start = Date.now();
      await simulateAPIDelay();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(300);
      expect(elapsed).toBeLessThanOrEqual(850); // 50ms buffer
    }, 10000);

    it('should actually wait before resolving', async () => {
      let resolved = false;

      const promise = simulateAPIDelay().then(() => {
        resolved = true;
      });

      expect(resolved).toBe(false);

      await promise;

      expect(resolved).toBe(true);
    });

    it('should have random delay on multiple calls', async () => {
      const start1 = Date.now();
      await simulateAPIDelay();
      const delay1 = Date.now() - start1;

      const start2 = Date.now();
      await simulateAPIDelay();
      const delay2 = Date.now() - start2;

      const start3 = Date.now();
      await simulateAPIDelay();
      const delay3 = Date.now() - start3;

      // At least one delay should be different (very high probability)
      const delays = [delay1, delay2, delay3];
      const uniqueDelays = new Set(delays);

      expect(uniqueDelays.size).toBeGreaterThan(1);
    }, 15000);
  });

  describe('getExampleResponses', () => {
    it('should return example responses object', () => {
      const examples = getExampleResponses();

      expect(examples).toHaveProperty('flightSearch');
      expect(examples).toHaveProperty('rfpCreation');
      expect(examples).toHaveProperty('quotes');
    });

    it('should return valid flight search example', () => {
      const examples = getExampleResponses();

      expect(examples.flightSearch).toBeInstanceOf(Array);
      expect(examples.flightSearch.length).toBeGreaterThan(0);
    });

    it('should return valid RFP creation example', () => {
      const examples = getExampleResponses();

      expect(examples.rfpCreation).toHaveProperty('rfp_id');
      expect(examples.rfpCreation).toHaveProperty('status');
    });

    it('should return valid quotes example', () => {
      const examples = getExampleResponses();

      expect(examples.quotes).toBeInstanceOf(Array);
      expect(examples.quotes.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle unknown route with fallback distance', () => {
      const params: FlightSearchParams = {
        departure_airport: 'KXXX', // Unknown airport
        arrival_airport: 'KYYY', // Unknown airport
        departure_date: '2025-12-15',
        passengers: 6,
      };

      const results = generateMockFlightResults(params);

      // Should still return results with fallback distance
      expect(results).toBeInstanceOf(Array);
    });

    it('should handle very high minimum operator rating', () => {
      const params: FlightSearchParams = {
        departure_airport: 'KTEB',
        arrival_airport: 'KPBI',
        departure_date: '2025-12-15',
        passengers: 6,
        min_operator_rating: 5.0, // Only perfect ratings
      };

      const results = generateMockFlightResults(params);

      // May return empty or only 5.0 rated operators
      expect(results).toBeInstanceOf(Array);
    });

    it('should handle past departure date', () => {
      const params: FlightSearchParams = {
        departure_airport: 'KTEB',
        arrival_airport: 'KPBI',
        departure_date: '2020-01-01', // Past date
        passengers: 6,
      };

      const results = generateMockFlightResults(params);

      // Should still generate results (mock doesn't validate dates)
      expect(results).toBeInstanceOf(Array);
    });

    it('should handle multiple filters combined', () => {
      const params: FlightSearchParams = {
        departure_airport: 'KTEB',
        arrival_airport: 'KPBI',
        departure_date: '2025-12-15',
        passengers: 8,
        aircraft_types: ['midsize', 'heavy'],
        max_budget: 6000,
        min_operator_rating: 4.7,
      };

      const results = generateMockFlightResults(params);

      expect(results).toBeInstanceOf(Array);

      results.forEach((result) => {
        expect(result.aircraft.capacity).toBeGreaterThanOrEqual(8);
        expect(['midsize', 'heavy']).toContain(result.aircraft.type);
        expect(result.operator.rating).toBeGreaterThanOrEqual(4.7);
      });
    });
  });
});
