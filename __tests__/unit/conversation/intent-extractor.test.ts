/**
 * Intent Extractor Unit Tests
 *
 * Tests for natural language intent extraction from user input.
 * Following TDD: RED phase - write failing tests first
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('IntentExtractor', () => {
  let IntentExtractor: any;
  let extractor: any;

  beforeEach(async () => {
    const module = await import('@/lib/conversation/intent-extractor');
    IntentExtractor = module.IntentExtractor;
    extractor = new IntentExtractor();
  });

  describe('Route Extraction', () => {
    it('should extract full city names', () => {
      const result = extractor.extractRoute('From New York to Los Angeles');

      expect(result.departure).toBe('New York');
      expect(result.arrival).toBe('Los Angeles');
    });

    it('should extract airport codes', () => {
      const result = extractor.extractRoute('JFK to LAX');

      expect(result.departure).toContain('JFK');
      expect(result.arrival).toContain('LAX');
    });

    it('should handle various phrasings', () => {
      const inputs = [
        'From New York to Los Angeles',
        'Flying from NYC to LA',
        'New York JFK to Los Angeles LAX',
        'I need to go from Boston to Miami',
      ];

      inputs.forEach((input) => {
        const result = extractor.extractRoute(input);
        expect(result.departure).toBeDefined();
        expect(result.arrival).toBeDefined();
      });
    });

    it('should handle incomplete route', () => {
      const result = extractor.extractRoute('Just New York');

      expect(result.departure).toBeDefined();
      expect(result.arrival).toBeUndefined();
    });
  });

  describe('Date Extraction', () => {
    it('should extract explicit dates', () => {
      const result = extractor.extractDates('December 25th, 2024');

      expect(result.departureDate).toBeDefined();
    });

    it('should handle relative dates', () => {
      const inputs = [
        'tomorrow',
        'next week',
        'in 3 days',
        'next Monday',
      ];

      inputs.forEach((input) => {
        const result = extractor.extractDates(input);
        expect(result.departureDate).toBeDefined();
      });
    });

    it('should extract both departure and return dates', () => {
      const result = extractor.extractDates('Leave December 25th, return December 28th');

      expect(result.departureDate).toBeDefined();
      expect(result.returnDate).toBeDefined();
    });

    it('should handle round trip indicators', () => {
      const result = extractor.extractDates('Tomorrow, returning in 3 days');

      expect(result.departureDate).toBeDefined();
      expect(result.returnDate).toBeDefined();
    });
  });

  describe('Passenger Extraction', () => {
    it('should extract passenger count from numbers', () => {
      const result = extractor.extractPassengers('5 passengers');

      expect(result.passengers).toBe(5);
    });

    it('should handle various phrasings', () => {
      const testCases = [
        { input: '8 passengers', expected: 8 },
        { input: 'for 3 people', expected: 3 },
        { input: 'party of 6', expected: 6 },
        { input: 'just me', expected: 1 },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = extractor.extractPassengers(input);
        expect(result.passengers).toBe(expected);
      });
    });

    it('should handle written numbers', () => {
      const result = extractor.extractPassengers('five passengers');

      expect(result.passengers).toBe(5);
    });
  });

  describe('Aircraft Type Extraction', () => {
    it('should extract common aircraft types', () => {
      const testCases = [
        'Light jet',
        'Midsize jet',
        'Heavy jet',
        'Turboprop',
      ];

      testCases.forEach((input) => {
        const result = extractor.extractAircraftType(input);
        expect(result.aircraftType).toBeDefined();
      });
    });

    it('should handle specific aircraft models', () => {
      const result = extractor.extractAircraftType('Citation X');

      expect(result.aircraftType).toContain('Citation');
    });

    it('should return empty for no preference', () => {
      const result = extractor.extractAircraftType('no preference');

      expect(result.aircraftType).toBeUndefined();
    });
  });

  describe('Budget Extraction', () => {
    it('should extract numeric budget values', () => {
      const result = extractor.extractBudget('Budget is $50,000');

      expect(result.budget).toBe(50000);
    });

    it('should handle various currency formats', () => {
      const testCases = [
        { input: '$50,000', expected: 50000 },
        { input: '50k', expected: 50000 },
        { input: 'around $75,000', expected: 75000 },
        { input: 'up to 100000', expected: 100000 },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = extractor.extractBudget(input);
        expect(result.budget).toBe(expected);
      });
    });

    it('should extract special requirements', () => {
      const result = extractor.extractBudget('Need WiFi and catering');

      expect(result.specialRequirements).toBeDefined();
      expect(result.specialRequirements).toContain('WiFi');
    });
  });

  describe('Ambiguity Handling', () => {
    it('should detect ambiguous dates', () => {
      const result = extractor.extractDates('next month');

      if (!result.departureDate) {
        expect(result).toHaveProperty('ambiguous');
      }
    });

    it('should provide confidence scores', () => {
      const result = extractor.extractRoute('From somewhere to LAX');

      expect(result).toHaveProperty('confidence');
    });
  });
});
