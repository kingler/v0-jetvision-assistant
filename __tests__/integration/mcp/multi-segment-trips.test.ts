/**
 * @vitest-environment node
 */

/**
 * Multi-Segment Trip Integration Tests
 *
 * Integration tests for multi-segment trip support in AvinodeClient.createTrip().
 * Tests the full flow: params -> normalization -> API call -> response mapping.
 *
 * These tests exercise the REAL AvinodeClient implementation (with mocked HTTP),
 * not local helper functions.
 *
 * Linear Issue: ONEK-154
 * Parent: ONEK-145
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the Avinode HTTP client before importing AvinodeClient
// ---------------------------------------------------------------------------

const mockPost = vi.fn();
const mockGet = vi.fn();

vi.mock('@/lib/mcp/clients/base-client', () => ({
  BaseMCPClient: class {
    protected client = { post: mockPost, get: mockGet };
    protected logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };
    protected sanitizeError(error: unknown) {
      return error instanceof Error ? error : new Error(String(error));
    }
  },
}));

// Import after mock setup
import { AvinodeClient } from '@/lib/mcp/clients/avinode-client';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAvinodeResponse(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      data: {
        id: 'atrip-65262252',
        tripId: '65262252',
        actions: {
          searchInAvinode: { href: 'https://app.avinode.com/trips/atrip-65262252' },
          viewInAvinode: { href: 'https://app.avinode.com/trips/atrip-65262252/view' },
        },
        ...overrides,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Multi-Segment Trip Integration (AvinodeClient)', () => {
  let client: AvinodeClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPost.mockResolvedValue(makeAvinodeResponse());
    client = new AvinodeClient();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Single-leg trips (legacy flat params)
  // =========================================================================

  describe('Single-leg trips (legacy params)', () => {
    it('should create a single-leg trip with flat params', async () => {
      const result = await client.createTrip({
        departure_airport: 'KTEB',
        arrival_airport: 'KLAX',
        departure_date: '2026-03-01',
        passengers: 6,
      });

      expect(result.success).toBe(true);
      expect(result.trip_id).toBeDefined();
      expect(result.deep_link).toContain('avinode');
      expect(result.departure_airport).toBe('KTEB');
      expect(result.arrival_airport).toBe('KLAX');
    });

    it('should send a single segment to the Avinode API', async () => {
      await client.createTrip({
        departure_airport: 'KTEB',
        arrival_airport: 'KLAX',
        departure_date: '2026-03-01',
        departure_time: '10:00',
        passengers: 6,
      });

      expect(mockPost).toHaveBeenCalledTimes(1);
      const [endpoint, body] = mockPost.mock.calls[0];

      expect(endpoint).toBe('/trips');
      expect(body.segments).toHaveLength(1);
      expect(body.segments[0].startAirport.icao).toBe('KTEB');
      expect(body.segments[0].endAirport.icao).toBe('KLAX');
      expect(body.segments[0].paxCount).toBe('6');
    });

    it('should default departure_time to 10:00 when not provided', async () => {
      await client.createTrip({
        departure_airport: 'KTEB',
        arrival_airport: 'KLAX',
        departure_date: '2026-03-01',
        passengers: 6,
      });

      const [, body] = mockPost.mock.calls[0];
      expect(body.segments[0].dateTime.time).toBe('10:00');
      expect(body.segments[0].timeTBD).toBe(true);
    });
  });

  // =========================================================================
  // 2. Round-trip (legacy return_date)
  // =========================================================================

  describe('Round-trip (legacy return_date)', () => {
    it('should create a round-trip with return_date', async () => {
      await client.createTrip({
        departure_airport: 'KTEB',
        arrival_airport: 'KLAX',
        departure_date: '2026-03-01',
        passengers: 6,
        return_date: '2026-03-05',
      });

      expect(mockPost).toHaveBeenCalledTimes(1);
      const [, body] = mockPost.mock.calls[0];

      expect(body.segments).toHaveLength(2);

      // Outbound segment
      expect(body.segments[0].startAirport.icao).toBe('KTEB');
      expect(body.segments[0].endAirport.icao).toBe('KLAX');
      expect(body.segments[0].dateTime.date).toBe('2026-03-01');

      // Return segment
      expect(body.segments[1].startAirport.icao).toBe('KLAX');
      expect(body.segments[1].endAirport.icao).toBe('KTEB');
      expect(body.segments[1].dateTime.date).toBe('2026-03-05');
    });

    it('should use same passenger count for return leg by default', async () => {
      await client.createTrip({
        departure_airport: 'KTEB',
        arrival_airport: 'KLAX',
        departure_date: '2026-03-01',
        passengers: 8,
        return_date: '2026-03-05',
      });

      const [, body] = mockPost.mock.calls[0];
      expect(body.segments[0].paxCount).toBe('8');
      expect(body.segments[1].paxCount).toBe('8');
    });

    it('should use return_time for the return segment', async () => {
      await client.createTrip({
        departure_airport: 'KTEB',
        arrival_airport: 'KLAX',
        departure_date: '2026-03-01',
        departure_time: '08:00',
        passengers: 6,
        return_date: '2026-03-05',
        return_time: '16:00',
      });

      const [, body] = mockPost.mock.calls[0];
      expect(body.segments[0].dateTime.time).toBe('08:00');
      expect(body.segments[1].dateTime.time).toBe('16:00');
    });
  });

  // =========================================================================
  // 3. Multi-city trips (segments[] array) - TDD RED PHASE
  // These tests define expected behavior for segments[] support
  // that is NOT YET implemented in AvinodeClient.createTrip()
  // =========================================================================

  describe('Multi-city trips (segments[] array)', () => {
    it('should create a 3-segment multi-city trip', async () => {
      const result = await client.createTrip({
        segments: [
          { departure_airport: 'KJFK', arrival_airport: 'EGLL', departure_date: '2026-03-15', passengers: 6 },
          { departure_airport: 'EGLL', arrival_airport: 'LFPG', departure_date: '2026-03-18', passengers: 6 },
          { departure_airport: 'LFPG', arrival_airport: 'KJFK', departure_date: '2026-03-22', passengers: 6 },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.trip_id).toBeDefined();
      expect(result.deep_link).toContain('avinode');
    });

    it('should send all segments to the Avinode API', async () => {
      await client.createTrip({
        segments: [
          { departure_airport: 'KJFK', arrival_airport: 'EGLL', departure_date: '2026-03-15', passengers: 6 },
          { departure_airport: 'EGLL', arrival_airport: 'LFPG', departure_date: '2026-03-18', passengers: 6 },
          { departure_airport: 'LFPG', arrival_airport: 'KJFK', departure_date: '2026-03-22', passengers: 6 },
        ],
      });

      expect(mockPost).toHaveBeenCalledTimes(1);
      const [endpoint, body] = mockPost.mock.calls[0];

      expect(endpoint).toBe('/trips');
      expect(body.segments).toHaveLength(3);

      expect(body.segments[0].startAirport.icao).toBe('KJFK');
      expect(body.segments[0].endAirport.icao).toBe('EGLL');

      expect(body.segments[1].startAirport.icao).toBe('EGLL');
      expect(body.segments[1].endAirport.icao).toBe('LFPG');

      expect(body.segments[2].startAirport.icao).toBe('LFPG');
      expect(body.segments[2].endAirport.icao).toBe('KJFK');
    });

    it('should support varying passenger counts per segment', async () => {
      await client.createTrip({
        segments: [
          { departure_airport: 'KTEB', arrival_airport: 'KLAX', departure_date: '2026-03-01', passengers: 8 },
          { departure_airport: 'KLAX', arrival_airport: 'KLAS', departure_date: '2026-03-03', passengers: 4 },
          { departure_airport: 'KLAS', arrival_airport: 'KTEB', departure_date: '2026-03-05', passengers: 6 },
        ],
      });

      const [, body] = mockPost.mock.calls[0];
      expect(body.segments[0].paxCount).toBe('8');
      expect(body.segments[1].paxCount).toBe('4');
      expect(body.segments[2].paxCount).toBe('6');
    });

    it('should support individual departure times per segment', async () => {
      await client.createTrip({
        segments: [
          { departure_airport: 'KTEB', arrival_airport: 'KLAX', departure_date: '2026-03-01', departure_time: '06:00', passengers: 6 },
          { departure_airport: 'KLAX', arrival_airport: 'KSFO', departure_date: '2026-03-03', departure_time: '14:30', passengers: 6 },
          { departure_airport: 'KSFO', arrival_airport: 'KTEB', departure_date: '2026-03-05', departure_time: '20:00', passengers: 6 },
        ],
      });

      const [, body] = mockPost.mock.calls[0];
      expect(body.segments[0].dateTime.time).toBe('06:00');
      expect(body.segments[1].dateTime.time).toBe('14:30');
      expect(body.segments[2].dateTime.time).toBe('20:00');
    });

    it('should create a 4-segment multi-city trip', async () => {
      await client.createTrip({
        segments: [
          { departure_airport: 'KTEB', arrival_airport: 'KMIA', departure_date: '2026-03-01', passengers: 6 },
          { departure_airport: 'KMIA', arrival_airport: 'MYNN', departure_date: '2026-03-03', passengers: 6 },
          { departure_airport: 'MYNN', arrival_airport: 'TNCM', departure_date: '2026-03-06', passengers: 4 },
          { departure_airport: 'TNCM', arrival_airport: 'KTEB', departure_date: '2026-03-10', passengers: 4 },
        ],
      });

      const [, body] = mockPost.mock.calls[0];
      expect(body.segments).toHaveLength(4);
    });
  });

  // =========================================================================
  // 4. Backward compatibility
  // =========================================================================

  describe('Backward compatibility', () => {
    it('should prefer segments[] over legacy flat params when both provided', async () => {
      await client.createTrip({
        departure_airport: 'KTEB',
        arrival_airport: 'KLAX',
        departure_date: '2026-03-01',
        passengers: 6,
        segments: [
          { departure_airport: 'KJFK', arrival_airport: 'EGLL', departure_date: '2026-03-15', passengers: 8 },
        ],
      });

      const [, body] = mockPost.mock.calls[0];
      // Should use segments[], not flat params
      expect(body.segments).toHaveLength(1);
      expect(body.segments[0].startAirport.icao).toBe('KJFK');
      expect(body.segments[0].paxCount).toBe('8');
    });

    it('should return trip_id and deep_link in consistent format', async () => {
      const singleLeg = await client.createTrip({
        departure_airport: 'KTEB',
        arrival_airport: 'KLAX',
        departure_date: '2026-03-01',
        passengers: 6,
      });

      expect(singleLeg).toHaveProperty('success', true);
      expect(singleLeg).toHaveProperty('trip_id');
      expect(singleLeg).toHaveProperty('deep_link');
      expect(singleLeg).toHaveProperty('departure_airport');
      expect(singleLeg).toHaveProperty('arrival_airport');
    });
  });

  // =========================================================================
  // 5. Error handling
  // =========================================================================

  describe('Error handling', () => {
    it('should propagate API errors', async () => {
      mockPost.mockRejectedValueOnce(new Error('Avinode API: 422 Unprocessable Entity'));

      await expect(
        client.createTrip({
          departure_airport: 'KTEB',
          arrival_airport: 'KLAX',
          departure_date: '2026-03-01',
          passengers: 6,
        })
      ).rejects.toThrow();
    });

    it('should handle missing deep link in API response gracefully', async () => {
      mockPost.mockResolvedValueOnce({
        data: {
          data: {
            id: 'atrip-99999',
            tripId: '99999',
            actions: {},
          },
        },
      });

      const result = await client.createTrip({
        departure_airport: 'KTEB',
        arrival_airport: 'KLAX',
        departure_date: '2026-03-01',
        passengers: 6,
      });

      expect(result.success).toBe(true);
      expect(result.trip_id).toBeDefined();
      // deep_link may be undefined when not returned by API
      expect(result).toHaveProperty('deep_link');
    });
  });

  // =========================================================================
  // 6. API request format
  // =========================================================================

  describe('API request format', () => {
    it('should always set sourcing to true', async () => {
      await client.createTrip({
        departure_airport: 'KTEB',
        arrival_airport: 'KLAX',
        departure_date: '2026-03-01',
        passengers: 6,
      });

      const [, body] = mockPost.mock.calls[0];
      expect(body.sourcing).toBe(true);
    });

    it('should include externalTripId for tracking', async () => {
      await client.createTrip({
        departure_airport: 'KTEB',
        arrival_airport: 'KLAX',
        departure_date: '2026-03-01',
        passengers: 6,
      });

      const [, body] = mockPost.mock.calls[0];
      expect(body.externalTripId).toMatch(/^JETVISION-/);
    });

    it('should include aircraft_category in criteria when specified', async () => {
      await client.createTrip({
        departure_airport: 'KTEB',
        arrival_airport: 'KLAX',
        departure_date: '2026-03-01',
        passengers: 6,
        aircraft_category: 'heavy',
      });

      const [, body] = mockPost.mock.calls[0];
      expect(body.criteria.requiredLift).toBeDefined();
      expect(body.criteria.requiredLift[0].aircraftCategory).toBe('heavy');
    });

    it('should NOT include requiredLift when aircraft_category is omitted', async () => {
      await client.createTrip({
        departure_airport: 'KTEB',
        arrival_airport: 'KLAX',
        departure_date: '2026-03-01',
        passengers: 6,
      });

      const [, body] = mockPost.mock.calls[0];
      expect(body.criteria.requiredLift).toBeUndefined();
    });
  });
});
