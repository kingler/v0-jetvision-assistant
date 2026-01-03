import { describe, it, expect } from 'vitest';
import { detectTripId, normalizeTripId } from '@/lib/avinode/trip-id';

describe('lib/avinode/trip-id', () => {
  describe('detectTripId', () => {
    it('detects Avinode atrip format with prefix', () => {
      const result = detectTripId('Trip ID: atrip-64956150');
      expect(result).toEqual({
        raw: 'atrip-64956150',
        normalized: 'atrip-64956150',
        kind: 'avinode',
      });
    });

    it('detects numeric trip ID when context keywords are present', () => {
      const result = detectTripId('tripid 64956150');
      expect(result).toEqual({
        raw: '64956150',
        normalized: 'atrip-64956150',
        kind: 'numeric',
      });
    });

    it('ignores alphanumeric IDs without context by default', () => {
      const result = detectTripId('B22E7Z');
      expect(result).toBeNull();
    });

    it('detects standalone alphanumeric IDs when allowed', () => {
      const result = detectTripId('b22e7z', { allowStandalone: true });
      expect(result).toEqual({
        raw: 'b22e7z',
        normalized: 'B22E7Z',
        kind: 'alphanumeric',
      });
    });

    it('detects alphanumeric IDs when context implies a trip ID lookup', () => {
      const result = detectTripId("here's my trip B22E7Z");
      expect(result).toEqual({
        raw: 'B22E7Z',
        normalized: 'B22E7Z',
        kind: 'alphanumeric',
      });
    });
  });

  describe('normalizeTripId', () => {
    it('normalizes atrip IDs to lowercase prefix', () => {
      const result = normalizeTripId('ATRIP-123456');
      expect(result).toEqual({
        raw: 'ATRIP-123456',
        normalized: 'atrip-123456',
        kind: 'avinode',
      });
    });

    it('normalizes numeric IDs with atrip prefix', () => {
      const result = normalizeTripId('123456');
      expect(result).toEqual({
        raw: '123456',
        normalized: 'atrip-123456',
        kind: 'numeric',
      });
    });

    it('normalizes alphanumeric IDs to uppercase', () => {
      const result = normalizeTripId('b22e7z');
      expect(result).toEqual({
        raw: 'b22e7z',
        normalized: 'B22E7Z',
        kind: 'alphanumeric',
      });
    });

    it('returns null for invalid inputs', () => {
      const result = normalizeTripId('not-a-trip');
      expect(result).toBeNull();
    });
  });
});
