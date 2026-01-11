/**
 * Multi-Segment Trip MCP Tools - Unit Tests
 *
 * Tests for multi-segment trip support in create_trip tool:
 * - Single leg trips (1 segment)
 * - Round-trip flights (2 segments)
 * - Multi-city trips (3+ segments)
 * - Backward compatibility with legacy flat params
 * - Different return passengers for round-trips
 *
 * Linear Issues: ONEK-145, ONEK-146, ONEK-149, ONEK-150, ONEK-151, ONEK-152
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Types matching the implementation
interface TripSegment {
  departure_airport: string;
  arrival_airport: string;
  departure_date: string;
  departure_time?: string;
  passengers: number;
}

type TripType = 'single_leg' | 'round_trip' | 'multi_city';

interface CreateTripParams {
  // Legacy flat params (for backward compatibility)
  departure_airport?: string;
  arrival_airport?: string;
  departure_date?: string;
  departure_time?: string;
  passengers?: number;
  return_date?: string;
  return_time?: string;
  return_passengers?: number;

  // New segments array (for multi-city trips)
  segments?: TripSegment[];

  // Optional filters
  aircraft_category?: string;
  special_requirements?: string;
  client_reference?: string;
}

interface CreateTripResponse {
  trip_id: string;
  trip_type: TripType;
  segment_count: number;
  segments: Array<{
    order: number;
    departure_airport: string;
    arrival_airport: string;
    departure_date: string;
    departure_time?: string;
    passengers: number;
  }>;
  deep_link: string;
  status: string;
  created_at: string;

  // Legacy format (for backward compatibility)
  route?: {
    departure_airport: string;
    arrival_airport: string;
    departure_date: string;
    departure_time?: string;
    passengers: number;
  };
}

// Helper function implementations (mirroring the MCP server)
function normalizeToSegments(params: CreateTripParams): TripSegment[] {
  // If segments array is provided, use it directly
  if (params.segments && params.segments.length > 0) {
    return params.segments;
  }

  // Convert legacy flat params to segments array
  if (!params.departure_airport || !params.arrival_airport) {
    throw new Error('Either segments[] array OR (departure_airport + arrival_airport) are required');
  }
  if (!params.departure_date) {
    throw new Error('departure_date is required');
  }
  if (!params.passengers || params.passengers < 1) {
    throw new Error('passengers must be at least 1');
  }

  const segments: TripSegment[] = [
    {
      departure_airport: params.departure_airport,
      arrival_airport: params.arrival_airport,
      departure_date: params.departure_date,
      departure_time: params.departure_time,
      passengers: params.passengers,
    },
  ];

  // Add return segment if provided (round-trip)
  if (params.return_date) {
    segments.push({
      departure_airport: params.arrival_airport,
      arrival_airport: params.departure_airport,
      departure_date: params.return_date,
      departure_time: params.return_time,
      // Use return_passengers if specified, otherwise use outbound passengers
      passengers: params.return_passengers ?? params.passengers,
    });
  }

  return segments;
}

function determineTripType(segmentCount: number): TripType {
  if (segmentCount === 1) return 'single_leg';
  if (segmentCount === 2) return 'round_trip';
  return 'multi_city';
}

function validateSegments(segments: TripSegment[]): void {
  if (!segments || segments.length === 0) {
    throw new Error('At least one segment is required');
  }

  if (segments.length > 20) {
    throw new Error('Maximum 20 segments allowed');
  }

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const segNum = i + 1;

    if (!seg.departure_airport) {
      throw new Error(`Segment ${segNum}: departure_airport is required`);
    }
    if (!seg.arrival_airport) {
      throw new Error(`Segment ${segNum}: arrival_airport is required`);
    }
    if (seg.departure_airport === seg.arrival_airport) {
      throw new Error(`Segment ${segNum}: departure and arrival airports must be different`);
    }
    if (!seg.departure_date) {
      throw new Error(`Segment ${segNum}: departure_date is required`);
    }
    if (!seg.passengers || seg.passengers < 1) {
      throw new Error(`Segment ${segNum}: passengers must be at least 1`);
    }
    if (seg.passengers > 100) {
      throw new Error(`Segment ${segNum}: passengers cannot exceed 100`);
    }

    // Validate airport code format (3-4 alphanumeric characters)
    const airportRegex = /^[A-Z0-9]{3,4}$/;
    if (!airportRegex.test(seg.departure_airport.toUpperCase())) {
      throw new Error(`Segment ${segNum}: invalid departure_airport format (expected ICAO/IATA code)`);
    }
    if (!airportRegex.test(seg.arrival_airport.toUpperCase())) {
      throw new Error(`Segment ${segNum}: invalid arrival_airport format (expected ICAO/IATA code)`);
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(seg.departure_date)) {
      throw new Error(`Segment ${segNum}: invalid departure_date format (expected YYYY-MM-DD)`);
    }

    // Validate time format if provided (HH:MM)
    if (seg.departure_time) {
      const timeRegex = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(seg.departure_time)) {
        throw new Error(`Segment ${segNum}: invalid departure_time format (expected HH:MM)`);
      }
    }
  }
}

// Mock client for API calls
function createMockClient() {
  return {
    post: vi.fn().mockImplementation((endpoint: string, data: unknown) => {
      if (endpoint === '/trips') {
        const segments = (data as Record<string, unknown>).segments as Array<Record<string, unknown>>;
        return Promise.resolve({
          data: {
            id: 'atrip-12345',
            attributes: {
              displayId: 'TRP-12345',
            },
            links: {
              self: 'https://app.avinode.com/trips/atrip-12345',
            },
          },
          meta: {
            segmentCount: segments?.length || 1,
          },
        });
      }
      return Promise.resolve({});
    }),
  };
}

// Simulate createTrip function
async function createTrip(
  client: ReturnType<typeof createMockClient>,
  params: CreateTripParams
): Promise<CreateTripResponse> {
  // Normalize params to segments array
  const tripSegments = normalizeToSegments(params);

  // Validate all segments
  validateSegments(tripSegments);

  // Determine trip type
  const tripType = determineTripType(tripSegments.length);

  // Build segments array for API
  const apiSegments = tripSegments.map((seg) => ({
    startAirport: { icao: seg.departure_airport.toUpperCase() },
    endAirport: { icao: seg.arrival_airport.toUpperCase() },
    dateTime: {
      date: seg.departure_date,
      time: seg.departure_time || '10:00',
    },
    paxCount: String(seg.passengers),
    paxSegment: true,
  }));

  const response = await client.post('/trips', {
    segments: apiSegments,
    sourcing: true,
    criteria: {},
  });

  const tripId = response.data?.id || 'atrip-unknown';
  const displayId = response.data?.attributes?.displayId || tripId;
  const deepLink = response.data?.links?.self || `https://app.avinode.com/trips/${tripId}`;

  return {
    trip_id: tripId,
    trip_type: tripType,
    segment_count: tripSegments.length,
    segments: tripSegments.map((seg, i) => ({
      order: i,
      departure_airport: seg.departure_airport.toUpperCase(),
      arrival_airport: seg.arrival_airport.toUpperCase(),
      departure_date: seg.departure_date,
      departure_time: seg.departure_time,
      passengers: seg.passengers,
    })),
    deep_link: deepLink,
    status: 'created',
    created_at: new Date().toISOString(),
    // Legacy format for backward compatibility
    route: {
      departure_airport: tripSegments[0].departure_airport.toUpperCase(),
      arrival_airport: tripSegments[0].arrival_airport.toUpperCase(),
      departure_date: tripSegments[0].departure_date,
      departure_time: tripSegments[0].departure_time,
      passengers: tripSegments[0].passengers,
    },
  };
}

describe('Multi-Segment Trip MCP Tools', () => {
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockClient = createMockClient();
    vi.clearAllMocks();
  });

  describe('normalizeToSegments', () => {
    it('should use segments array directly when provided', () => {
      const segments = normalizeToSegments({
        segments: [
          {
            departure_airport: 'KTEB',
            arrival_airport: 'KLAX',
            departure_date: '2026-02-01',
            passengers: 6,
          },
          {
            departure_airport: 'KLAX',
            arrival_airport: 'KSFO',
            departure_date: '2026-02-03',
            passengers: 6,
          },
        ],
      });

      expect(segments).toHaveLength(2);
      expect(segments[0].departure_airport).toBe('KTEB');
      expect(segments[1].departure_airport).toBe('KLAX');
    });

    it('should convert legacy flat params to single segment', () => {
      const segments = normalizeToSegments({
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        departure_date: '2026-02-01',
        passengers: 6,
      });

      expect(segments).toHaveLength(1);
      expect(segments[0]).toEqual({
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        departure_date: '2026-02-01',
        departure_time: undefined,
        passengers: 6,
      });
    });

    it('should create round-trip with return_date', () => {
      const segments = normalizeToSegments({
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        departure_date: '2026-02-01',
        departure_time: '10:00',
        passengers: 6,
        return_date: '2026-02-05',
        return_time: '15:00',
      });

      expect(segments).toHaveLength(2);
      expect(segments[0]).toEqual({
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        departure_date: '2026-02-01',
        departure_time: '10:00',
        passengers: 6,
      });
      expect(segments[1]).toEqual({
        departure_airport: 'KVNY',
        arrival_airport: 'KTEB',
        departure_date: '2026-02-05',
        departure_time: '15:00',
        passengers: 6,
      });
    });

    it('should use return_passengers for return leg when specified', () => {
      const segments = normalizeToSegments({
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        departure_date: '2026-02-01',
        passengers: 6,
        return_date: '2026-02-05',
        return_passengers: 4, // Different passenger count on return
      });

      expect(segments).toHaveLength(2);
      expect(segments[0].passengers).toBe(6);
      expect(segments[1].passengers).toBe(4);
    });

    it('should throw error when neither segments nor legacy params provided', () => {
      expect(() => normalizeToSegments({})).toThrow(
        'Either segments[] array OR (departure_airport + arrival_airport) are required'
      );
    });

    it('should throw error when departure_date is missing', () => {
      expect(() =>
        normalizeToSegments({
          departure_airport: 'KTEB',
          arrival_airport: 'KVNY',
          passengers: 6,
        })
      ).toThrow('departure_date is required');
    });

    it('should throw error when passengers is missing or invalid', () => {
      expect(() =>
        normalizeToSegments({
          departure_airport: 'KTEB',
          arrival_airport: 'KVNY',
          departure_date: '2026-02-01',
        })
      ).toThrow('passengers must be at least 1');

      expect(() =>
        normalizeToSegments({
          departure_airport: 'KTEB',
          arrival_airport: 'KVNY',
          departure_date: '2026-02-01',
          passengers: 0,
        })
      ).toThrow('passengers must be at least 1');
    });
  });

  describe('determineTripType', () => {
    it('should return single_leg for 1 segment', () => {
      expect(determineTripType(1)).toBe('single_leg');
    });

    it('should return round_trip for 2 segments', () => {
      expect(determineTripType(2)).toBe('round_trip');
    });

    it('should return multi_city for 3 segments', () => {
      expect(determineTripType(3)).toBe('multi_city');
    });

    it('should return multi_city for 4+ segments', () => {
      expect(determineTripType(4)).toBe('multi_city');
      expect(determineTripType(5)).toBe('multi_city');
      expect(determineTripType(10)).toBe('multi_city');
    });
  });

  describe('validateSegments', () => {
    it('should throw error for empty segments array', () => {
      expect(() => validateSegments([])).toThrow('At least one segment is required');
    });

    it('should throw error for more than 20 segments', () => {
      const segments: TripSegment[] = Array(21)
        .fill(null)
        .map((_, i) => ({
          departure_airport: 'KTEB',
          arrival_airport: 'KLAX',
          departure_date: '2026-02-01',
          passengers: 6,
        }));

      expect(() => validateSegments(segments)).toThrow('Maximum 20 segments allowed');
    });

    it('should throw error for missing departure_airport', () => {
      expect(() =>
        validateSegments([
          {
            departure_airport: '',
            arrival_airport: 'KVNY',
            departure_date: '2026-02-01',
            passengers: 6,
          },
        ])
      ).toThrow('Segment 1: departure_airport is required');
    });

    it('should throw error for missing arrival_airport', () => {
      expect(() =>
        validateSegments([
          {
            departure_airport: 'KTEB',
            arrival_airport: '',
            departure_date: '2026-02-01',
            passengers: 6,
          },
        ])
      ).toThrow('Segment 1: arrival_airport is required');
    });

    it('should throw error when departure equals arrival airport', () => {
      expect(() =>
        validateSegments([
          {
            departure_airport: 'KTEB',
            arrival_airport: 'KTEB',
            departure_date: '2026-02-01',
            passengers: 6,
          },
        ])
      ).toThrow('Segment 1: departure and arrival airports must be different');
    });

    it('should throw error for missing departure_date', () => {
      expect(() =>
        validateSegments([
          {
            departure_airport: 'KTEB',
            arrival_airport: 'KVNY',
            departure_date: '',
            passengers: 6,
          },
        ])
      ).toThrow('Segment 1: departure_date is required');
    });

    it('should throw error for passengers less than 1', () => {
      expect(() =>
        validateSegments([
          {
            departure_airport: 'KTEB',
            arrival_airport: 'KVNY',
            departure_date: '2026-02-01',
            passengers: 0,
          },
        ])
      ).toThrow('Segment 1: passengers must be at least 1');
    });

    it('should throw error for passengers greater than 100', () => {
      expect(() =>
        validateSegments([
          {
            departure_airport: 'KTEB',
            arrival_airport: 'KVNY',
            departure_date: '2026-02-01',
            passengers: 101,
          },
        ])
      ).toThrow('Segment 1: passengers cannot exceed 100');
    });

    it('should throw error for invalid airport format', () => {
      expect(() =>
        validateSegments([
          {
            departure_airport: 'INVALID_AIRPORT',
            arrival_airport: 'KVNY',
            departure_date: '2026-02-01',
            passengers: 6,
          },
        ])
      ).toThrow('Segment 1: invalid departure_airport format');
    });

    it('should throw error for invalid date format', () => {
      expect(() =>
        validateSegments([
          {
            departure_airport: 'KTEB',
            arrival_airport: 'KVNY',
            departure_date: '02-01-2026', // Wrong format
            passengers: 6,
          },
        ])
      ).toThrow('Segment 1: invalid departure_date format');
    });

    it('should throw error for invalid time format', () => {
      expect(() =>
        validateSegments([
          {
            departure_airport: 'KTEB',
            arrival_airport: 'KVNY',
            departure_date: '2026-02-01',
            departure_time: '25:00', // Invalid hour
            passengers: 6,
          },
        ])
      ).toThrow('Segment 1: invalid departure_time format');
    });

    it('should validate multiple segments and report correct segment number', () => {
      expect(() =>
        validateSegments([
          {
            departure_airport: 'KTEB',
            arrival_airport: 'KLAX',
            departure_date: '2026-02-01',
            passengers: 6,
          },
          {
            departure_airport: 'KLAX',
            arrival_airport: '', // Missing
            departure_date: '2026-02-03',
            passengers: 6,
          },
        ])
      ).toThrow('Segment 2: arrival_airport is required');
    });

    it('should accept valid segments without throwing', () => {
      expect(() =>
        validateSegments([
          {
            departure_airport: 'KTEB',
            arrival_airport: 'KLAX',
            departure_date: '2026-02-01',
            departure_time: '10:00',
            passengers: 6,
          },
          {
            departure_airport: 'KLAX',
            arrival_airport: 'KSFO',
            departure_date: '2026-02-03',
            departure_time: '14:30',
            passengers: 4,
          },
        ])
      ).not.toThrow();
    });

    it('should accept 3-character IATA codes', () => {
      expect(() =>
        validateSegments([
          {
            departure_airport: 'JFK',
            arrival_airport: 'LAX',
            departure_date: '2026-02-01',
            passengers: 6,
          },
        ])
      ).not.toThrow();
    });

    it('should accept 4-character ICAO codes', () => {
      expect(() =>
        validateSegments([
          {
            departure_airport: 'KJFK',
            arrival_airport: 'KLAX',
            departure_date: '2026-02-01',
            passengers: 6,
          },
        ])
      ).not.toThrow();
    });
  });

  describe('createTrip - Single Leg', () => {
    it('should create single leg trip with legacy params', async () => {
      const result = await createTrip(mockClient, {
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        departure_date: '2026-02-01',
        departure_time: '10:00',
        passengers: 6,
      });

      expect(result).toHaveProperty('trip_id', 'atrip-12345');
      expect(result).toHaveProperty('trip_type', 'single_leg');
      expect(result).toHaveProperty('segment_count', 1);
      expect(result).toHaveProperty('deep_link');
      expect(result).toHaveProperty('status', 'created');
      expect(result.segments).toHaveLength(1);
      expect(result.segments[0]).toEqual({
        order: 0,
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        departure_date: '2026-02-01',
        departure_time: '10:00',
        passengers: 6,
      });
    });

    it('should include legacy route format for backward compatibility', async () => {
      const result = await createTrip(mockClient, {
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        departure_date: '2026-02-01',
        passengers: 6,
      });

      expect(result.route).toEqual({
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        departure_date: '2026-02-01',
        departure_time: undefined,
        passengers: 6,
      });
    });
  });

  describe('createTrip - Round Trip', () => {
    it('should create round trip with return_date (legacy params)', async () => {
      const result = await createTrip(mockClient, {
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        departure_date: '2026-02-01',
        passengers: 6,
        return_date: '2026-02-05',
      });

      expect(result).toHaveProperty('trip_type', 'round_trip');
      expect(result).toHaveProperty('segment_count', 2);
      expect(result.segments).toHaveLength(2);
      expect(result.segments[0].departure_airport).toBe('KTEB');
      expect(result.segments[0].arrival_airport).toBe('KVNY');
      expect(result.segments[1].departure_airport).toBe('KVNY');
      expect(result.segments[1].arrival_airport).toBe('KTEB');
    });

    it('should support different passenger count on return leg', async () => {
      const result = await createTrip(mockClient, {
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        departure_date: '2026-02-01',
        passengers: 6,
        return_date: '2026-02-05',
        return_passengers: 4,
      });

      expect(result.segments[0].passengers).toBe(6);
      expect(result.segments[1].passengers).toBe(4);
    });

    it('should create round trip with segments array', async () => {
      const result = await createTrip(mockClient, {
        segments: [
          {
            departure_airport: 'KTEB',
            arrival_airport: 'KVNY',
            departure_date: '2026-02-01',
            departure_time: '08:00',
            passengers: 6,
          },
          {
            departure_airport: 'KVNY',
            arrival_airport: 'KTEB',
            departure_date: '2026-02-05',
            departure_time: '16:00',
            passengers: 4, // Different passenger count
          },
        ],
      });

      expect(result).toHaveProperty('trip_type', 'round_trip');
      expect(result.segments[0].passengers).toBe(6);
      expect(result.segments[1].passengers).toBe(4);
    });
  });

  describe('createTrip - Multi-City', () => {
    it('should create multi-city trip with 3 segments', async () => {
      const result = await createTrip(mockClient, {
        segments: [
          {
            departure_airport: 'KTEB',
            arrival_airport: 'KLAX',
            departure_date: '2026-02-01',
            passengers: 6,
          },
          {
            departure_airport: 'KLAX',
            arrival_airport: 'KSFO',
            departure_date: '2026-02-03',
            passengers: 6,
          },
          {
            departure_airport: 'KSFO',
            arrival_airport: 'KTEB',
            departure_date: '2026-02-05',
            passengers: 6,
          },
        ],
      });

      expect(result).toHaveProperty('trip_type', 'multi_city');
      expect(result).toHaveProperty('segment_count', 3);
      expect(result.segments).toHaveLength(3);
    });

    it('should create multi-city trip with varying passenger counts', async () => {
      const result = await createTrip(mockClient, {
        segments: [
          {
            departure_airport: 'KTEB',
            arrival_airport: 'KLAX',
            departure_date: '2026-02-01',
            passengers: 8,
          },
          {
            departure_airport: 'KLAX',
            arrival_airport: 'KLAS',
            departure_date: '2026-02-03',
            passengers: 4, // Some passengers leave
          },
          {
            departure_airport: 'KLAS',
            arrival_airport: 'KPHX',
            departure_date: '2026-02-04',
            passengers: 6, // New passengers join
          },
          {
            departure_airport: 'KPHX',
            arrival_airport: 'KTEB',
            departure_date: '2026-02-06',
            passengers: 6,
          },
        ],
      });

      expect(result).toHaveProperty('trip_type', 'multi_city');
      expect(result).toHaveProperty('segment_count', 4);
      expect(result.segments[0].passengers).toBe(8);
      expect(result.segments[1].passengers).toBe(4);
      expect(result.segments[2].passengers).toBe(6);
      expect(result.segments[3].passengers).toBe(6);
    });

    it('should call API with correct segment format', async () => {
      await createTrip(mockClient, {
        segments: [
          {
            departure_airport: 'kteb',
            arrival_airport: 'klax',
            departure_date: '2026-02-01',
            departure_time: '10:00',
            passengers: 6,
          },
          {
            departure_airport: 'klax',
            arrival_airport: 'ksfo',
            departure_date: '2026-02-03',
            passengers: 6,
          },
        ],
      });

      expect(mockClient.post).toHaveBeenCalledWith('/trips', {
        segments: [
          {
            startAirport: { icao: 'KTEB' },
            endAirport: { icao: 'KLAX' },
            dateTime: { date: '2026-02-01', time: '10:00' },
            paxCount: '6',
            paxSegment: true,
          },
          {
            startAirport: { icao: 'KLAX' },
            endAirport: { icao: 'KSFO' },
            dateTime: { date: '2026-02-03', time: '10:00' }, // Default time
            paxCount: '6',
            paxSegment: true,
          },
        ],
        sourcing: true,
        criteria: {},
      });
    });
  });

  describe('createTrip - Validation', () => {
    it('should throw error for invalid segment in multi-city trip', async () => {
      await expect(
        createTrip(mockClient, {
          segments: [
            {
              departure_airport: 'KTEB',
              arrival_airport: 'KLAX',
              departure_date: '2026-02-01',
              passengers: 6,
            },
            {
              departure_airport: 'KLAX',
              arrival_airport: 'KLAX', // Same as departure
              departure_date: '2026-02-03',
              passengers: 6,
            },
          ],
        })
      ).rejects.toThrow('Segment 2: departure and arrival airports must be different');
    });

    it('should convert lowercase airport codes to uppercase', async () => {
      const result = await createTrip(mockClient, {
        departure_airport: 'kteb',
        arrival_airport: 'kvny',
        departure_date: '2026-02-01',
        passengers: 6,
      });

      expect(result.segments[0].departure_airport).toBe('KTEB');
      expect(result.segments[0].arrival_airport).toBe('KVNY');
    });
  });
});
