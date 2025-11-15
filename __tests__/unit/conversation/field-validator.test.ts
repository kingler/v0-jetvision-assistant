/**
 * Field Validator Unit Tests
 *
 * Tests for validating extracted RFP data fields.
 * Following TDD: RED phase - write failing tests first
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('FieldValidator', () => {
  let FieldValidator: any;
  let validator: any;

  beforeEach(async () => {
    const module = await import('@/lib/conversation/field-validator');
    FieldValidator = module.FieldValidator;
    validator = new FieldValidator();
  });

  describe('Route Validation', () => {
    it('should accept valid route with both departure and arrival', () => {
      const result = validator.validateRoute({
        departure: 'New York',
        arrival: 'Los Angeles',
      });

      expect(result.valid).toBe(true);
    });

    it('should reject route missing departure', () => {
      const result = validator.validateRoute({
        arrival: 'Los Angeles',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject route missing arrival', () => {
      const result = validator.validateRoute({
        departure: 'New York',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.suggestions).toBeDefined();
    });

    it('should reject same departure and arrival', () => {
      const result = validator.validateRoute({
        departure: 'New York',
        arrival: 'New York',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('same');
    });
  });

  describe('Date Validation', () => {
    it('should accept future dates', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const result = validator.validateDates({
        departureDate: tomorrow.toISOString(),
      });

      expect(result.valid).toBe(true);
    });

    it('should reject past dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const result = validator.validateDates({
        departureDate: yesterday.toISOString(),
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('future');
    });

    it('should accept return date after departure', () => {
      const departure = new Date();
      departure.setDate(departure.getDate() + 1);

      const returnDate = new Date(departure);
      returnDate.setDate(returnDate.getDate() + 3);

      const result = validator.validateDates({
        departureDate: departure.toISOString(),
        returnDate: returnDate.toISOString(),
      });

      expect(result.valid).toBe(true);
    });

    it('should reject return date before departure', () => {
      const departure = new Date();
      departure.setDate(departure.getDate() + 5);

      const returnDate = new Date();
      returnDate.setDate(returnDate.getDate() + 2);

      const result = validator.validateDates({
        departureDate: departure.toISOString(),
        returnDate: returnDate.toISOString(),
      });

      expect(result.valid).toBe(false);
      expect(result.error?.toLowerCase()).toContain('return');
    });
  });

  describe('Passenger Validation', () => {
    it('should accept positive passenger counts', () => {
      const testCases = [1, 5, 10, 15];

      testCases.forEach((count) => {
        const result = validator.validatePassengers({ passengers: count });
        expect(result.valid).toBe(true);
      });
    });

    it('should reject zero passengers', () => {
      const result = validator.validatePassengers({ passengers: 0 });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 1');
    });

    it('should reject negative passengers', () => {
      const result = validator.validatePassengers({ passengers: -5 });

      expect(result.valid).toBe(false);
    });

    it('should warn about very large passenger counts', () => {
      const result = validator.validatePassengers({ passengers: 50 });

      if (result.valid) {
        expect(result.warning).toBeDefined();
      }
    });
  });

  describe('Error Messages', () => {
    it('should provide helpful error messages', () => {
      const result = validator.validateRoute({ departure: 'New York' });

      expect(result.error).toBeDefined();
      expect(result.error.length).toBeGreaterThan(0);
    });

    it('should provide suggestions for fixing errors', () => {
      const result = validator.validateRoute({ departure: 'New York' });

      expect(result.suggestions).toBeDefined();
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined values', () => {
      const result = validator.validateRoute({});

      expect(result.valid).toBe(false);
    });

    it('should handle empty strings', () => {
      const result = validator.validateRoute({
        departure: '',
        arrival: '',
      });

      expect(result.valid).toBe(false);
    });

    it('should handle whitespace-only strings', () => {
      const result = validator.validateRoute({
        departure: '   ',
        arrival: '   ',
      });

      expect(result.valid).toBe(false);
    });
  });
});
