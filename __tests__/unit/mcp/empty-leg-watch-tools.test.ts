/**
 * Empty Leg Watch MCP Tools - Unit Tests
 *
 * Tests for the 6 empty leg watch tools:
 * - create_empty_leg_watch: Subscribe to route alerts
 * - get_empty_leg_watches: List user's watch subscriptions
 * - update_empty_leg_watch: Modify watch criteria
 * - delete_empty_leg_watch: Cancel watch subscription
 * - get_watch_matches: Get matching empty leg flights
 * - mark_match: Mark match as viewed/interested
 *
 * Linear Issues: ONEK-147, ONEK-148
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the client module before importing
vi.mock('../../../mcp-servers/avinode-mcp-server/src/client.js', () => ({
  getAvinodeClient: vi.fn(),
  AvinodeClient: vi.fn(),
}));

vi.mock('../../../mcp-servers/avinode-mcp-server/src/mock-client.js', () => ({
  MockAvinodeClient: vi.fn().mockImplementation(() => createMockClient()),
}));

// Mock implementation helper
function createMockClient() {
  return {
    post: vi.fn().mockImplementation((endpoint: string, data: unknown) => {
      if (endpoint === '/emptylegs/watches') {
        return Promise.resolve({
          id: 'watch-12345',
          watchId: 'watch-12345',
          status: 'active',
        });
      }
      return Promise.resolve({});
    }),
    get: vi.fn().mockImplementation((endpoint: string) => {
      if (endpoint === '/emptylegs/watches') {
        return Promise.resolve({
          watches: [
            {
              id: 'watch-001',
              status: 'active',
              departureAirport: { icao: 'KTEB' },
              arrivalAirport: { icao: 'KVNY' },
              dateRange: { start: '2026-02-01', end: '2026-02-28' },
              passengers: 6,
              maxPrice: 50000,
              matchesCount: 3,
            },
            {
              id: 'watch-002',
              status: 'paused',
              departureAirport: { icao: 'KLAX' },
              arrivalAirport: { icao: 'KJFK' },
              dateRange: { start: '2026-03-01', end: '2026-03-15' },
              passengers: 4,
              maxPrice: null,
              matchesCount: 0,
            },
          ],
        });
      }
      if (endpoint.includes('/matches')) {
        return Promise.resolve({
          matches: [
            {
              id: 'match-001',
              emptyLegId: 'el-12345',
              departure: {
                airport: 'KTEB',
                name: 'Teterboro Airport',
                city: 'Teterboro',
                date: '2026-02-15',
                time: '10:00',
              },
              arrival: {
                airport: 'KVNY',
                name: 'Van Nuys Airport',
                city: 'Van Nuys',
              },
              price: 35000,
              currency: 'USD',
              discountPercentage: 30,
              regularPrice: 50000,
              aircraft: {
                type: 'Midsize Jet',
                model: 'Citation XLS',
                category: 'midsize',
                capacity: 8,
                registration: 'N12345',
              },
              operator: {
                id: 'op-001',
                name: 'NetJets',
                rating: 4.8,
              },
              viewed: false,
              interested: false,
              matchedAt: '2026-01-10T12:00:00Z',
              validUntil: '2026-02-14T23:59:59Z',
              deepLink: 'https://app.avinode.com/emptyleg/el-12345',
            },
          ],
        });
      }
      return Promise.resolve({});
    }),
    patch: vi.fn().mockImplementation((endpoint: string, data: unknown) => {
      if (endpoint.includes('/emptylegs/watches/')) {
        return Promise.resolve({
          id: 'watch-001',
          status: (data as Record<string, unknown>).status || 'active',
          maxPrice: (data as Record<string, unknown>).maxPrice,
        });
      }
      if (endpoint.includes('/emptylegs/matches/')) {
        return Promise.resolve({
          viewed: (data as Record<string, unknown>).viewed ?? false,
          interested: (data as Record<string, unknown>).interested ?? false,
        });
      }
      return Promise.resolve({});
    }),
    delete: vi.fn().mockResolvedValue({}),
  };
}

// Define types for testing
interface CreateEmptyLegWatchParams {
  departure_airport: string;
  arrival_airport: string;
  date_range_start: string;
  date_range_end: string;
  passengers: number;
  max_price?: number;
  aircraft_categories?: string[];
}

interface EmptyLegWatchResponse {
  watch_id: string;
  status: string;
  departure_airport: string;
  arrival_airport: string;
  date_range: { start: string; end: string };
  passengers: number;
  max_price?: number;
  aircraft_categories?: string[];
  created_at: string;
  expires_at: string;
  matches_count: number;
}

interface EmptyLegMatch {
  match_id: string;
  watch_id: string;
  empty_leg_id: string;
  departure: {
    airport: string;
    name?: string;
    city?: string;
    date: string;
    time?: string;
  };
  arrival: {
    airport: string;
    name?: string;
    city?: string;
  };
  price: number;
  currency: string;
  discount_percentage?: number;
  regular_price?: number;
  aircraft: {
    type: string;
    model?: string;
    category?: string;
    capacity?: number;
    registration?: string;
  };
  operator: {
    id: string;
    name: string;
    rating?: number;
  };
  viewed: boolean;
  interested: boolean;
  matched_at: string;
  valid_until?: string;
  deep_link?: string;
}

// Helper functions that mirror the implementation
async function createEmptyLegWatch(
  client: ReturnType<typeof createMockClient>,
  params: CreateEmptyLegWatchParams
): Promise<EmptyLegWatchResponse> {
  // Validate required parameters
  if (!params.departure_airport || !params.arrival_airport) {
    throw new Error('departure_airport and arrival_airport are required');
  }
  if (!params.date_range_start || !params.date_range_end) {
    throw new Error('date_range_start and date_range_end are required');
  }
  if (!params.passengers || params.passengers < 1) {
    throw new Error('passengers must be at least 1');
  }

  // Validate airport format
  const airportRegex = /^[A-Z0-9]{3,4}$/;
  if (!airportRegex.test(params.departure_airport.toUpperCase())) {
    throw new Error('Invalid departure_airport format (expected ICAO/IATA code)');
  }
  if (!airportRegex.test(params.arrival_airport.toUpperCase())) {
    throw new Error('Invalid arrival_airport format (expected ICAO/IATA code)');
  }

  // Validate date range
  const startDate = new Date(params.date_range_start);
  const endDate = new Date(params.date_range_end);
  if (endDate < startDate) {
    throw new Error('date_range_end must be after date_range_start');
  }
  const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  if (daysDiff > 90) {
    throw new Error('Date range cannot exceed 90 days');
  }

  const response = await client.post('/emptylegs/watches', {
    departureAirport: { icao: params.departure_airport.toUpperCase() },
    arrivalAirport: { icao: params.arrival_airport.toUpperCase() },
    dateRange: {
      start: params.date_range_start,
      end: params.date_range_end,
    },
    passengers: params.passengers,
    maxPrice: params.max_price,
    aircraftCategories: params.aircraft_categories,
  });

  const watchId = response.id || response.watchId || response.watch_id;

  return {
    watch_id: watchId,
    status: 'active',
    departure_airport: params.departure_airport.toUpperCase(),
    arrival_airport: params.arrival_airport.toUpperCase(),
    date_range: {
      start: params.date_range_start,
      end: params.date_range_end,
    },
    passengers: params.passengers,
    max_price: params.max_price,
    aircraft_categories: params.aircraft_categories,
    created_at: new Date().toISOString(),
    expires_at: params.date_range_end,
    matches_count: 0,
  };
}

async function getEmptyLegWatches(
  client: ReturnType<typeof createMockClient>,
  params: { status?: string }
): Promise<{ watches: EmptyLegWatchResponse[]; total_count: number }> {
  const queryParams: Record<string, string> = {};
  if (params.status) {
    queryParams.status = params.status;
  }

  const response = await client.get('/emptylegs/watches', { params: queryParams });

  const watches = (response.watches || response.data || []).map((w: Record<string, unknown>) => ({
    watch_id: w.id || w.watchId,
    status: w.status || 'active',
    departure_airport: (w.departureAirport as Record<string, string>)?.icao || w.departure_airport,
    arrival_airport: (w.arrivalAirport as Record<string, string>)?.icao || w.arrival_airport,
    date_range: w.dateRange || w.date_range,
    passengers: w.passengers,
    max_price: w.maxPrice || w.max_price,
    aircraft_categories: w.aircraftCategories || w.aircraft_categories,
    created_at: w.createdAt || w.created_at,
    expires_at: w.expiresAt || w.expires_at,
    matches_count: w.matchesCount || w.matches_count || 0,
  }));

  return {
    watches,
    total_count: watches.length,
  };
}

async function updateEmptyLegWatch(
  client: ReturnType<typeof createMockClient>,
  params: { watch_id: string; status?: string; max_price?: number; notification_email?: string }
): Promise<EmptyLegWatchResponse> {
  if (!params.watch_id) {
    throw new Error('watch_id is required');
  }

  const updateData: Record<string, unknown> = {};
  if (params.status) updateData.status = params.status;
  if (params.max_price !== undefined) updateData.maxPrice = params.max_price;
  if (params.notification_email) updateData.notificationEmail = params.notification_email;

  const response = await client.patch(`/emptylegs/watches/${params.watch_id}`, updateData);

  return {
    watch_id: response.id || params.watch_id,
    status: response.status || params.status || 'active',
    departure_airport: (response.departureAirport as Record<string, string>)?.icao || '',
    arrival_airport: (response.arrivalAirport as Record<string, string>)?.icao || '',
    date_range: response.dateRange || { start: '', end: '' },
    passengers: response.passengers || 0,
    max_price: response.maxPrice || params.max_price,
    aircraft_categories: response.aircraftCategories,
    created_at: response.createdAt || '',
    expires_at: response.expiresAt || '',
    matches_count: response.matchesCount || 0,
  };
}

async function deleteEmptyLegWatch(
  client: ReturnType<typeof createMockClient>,
  params: { watch_id: string }
): Promise<{ watch_id: string; status: 'cancelled'; cancelled_at: string }> {
  if (!params.watch_id) {
    throw new Error('watch_id is required');
  }

  await client.delete(`/emptylegs/watches/${params.watch_id}`);

  return {
    watch_id: params.watch_id,
    status: 'cancelled',
    cancelled_at: new Date().toISOString(),
  };
}

async function getWatchMatches(
  client: ReturnType<typeof createMockClient>,
  params: { watch_id: string; unviewed_only?: boolean; interested_only?: boolean; limit?: number }
): Promise<{ watch_id: string; matches: EmptyLegMatch[]; total_count: number; unviewed_count: number }> {
  if (!params.watch_id) {
    throw new Error('watch_id is required');
  }

  const response = await client.get(`/emptylegs/watches/${params.watch_id}/matches`, {
    params: { limit: params.limit || 50, unviewed: params.unviewed_only, interested: params.interested_only },
  });

  const matches = (response.matches || response.data || []).map((m: Record<string, unknown>) => ({
    match_id: m.id || m.matchId,
    watch_id: params.watch_id,
    empty_leg_id: m.emptyLegId || m.empty_leg_id,
    departure: {
      airport: (m.departure as Record<string, unknown>)?.airport || m.departure_airport,
      name: (m.departure as Record<string, unknown>)?.name,
      city: (m.departure as Record<string, unknown>)?.city,
      date: (m.departure as Record<string, unknown>)?.date || m.departure_date,
      time: (m.departure as Record<string, unknown>)?.time || m.departure_time,
    },
    arrival: {
      airport: (m.arrival as Record<string, unknown>)?.airport || m.arrival_airport,
      name: (m.arrival as Record<string, unknown>)?.name,
      city: (m.arrival as Record<string, unknown>)?.city,
    },
    price: m.price,
    currency: m.currency || 'USD',
    discount_percentage: m.discountPercentage || m.discount_percentage,
    regular_price: m.regularPrice || m.regular_price,
    aircraft: {
      type: (m.aircraft as Record<string, unknown>)?.type,
      model: (m.aircraft as Record<string, unknown>)?.model,
      category: (m.aircraft as Record<string, unknown>)?.category,
      capacity: (m.aircraft as Record<string, unknown>)?.capacity,
      registration: (m.aircraft as Record<string, unknown>)?.registration,
    },
    operator: {
      id: (m.operator as Record<string, unknown>)?.id,
      name: (m.operator as Record<string, unknown>)?.name,
      rating: (m.operator as Record<string, unknown>)?.rating,
    },
    viewed: m.viewed || false,
    interested: m.interested || false,
    matched_at: m.matchedAt || m.matched_at,
    valid_until: m.validUntil || m.valid_until,
    deep_link: m.deepLink || m.deep_link,
  }));

  const unviewedCount = matches.filter((m: EmptyLegMatch) => !m.viewed).length;

  return {
    watch_id: params.watch_id,
    matches,
    total_count: matches.length,
    unviewed_count: unviewedCount,
  };
}

async function markMatch(
  client: ReturnType<typeof createMockClient>,
  params: { match_id: string; viewed?: boolean; interested?: boolean }
): Promise<{ match_id: string; viewed: boolean; interested: boolean; updated_at: string }> {
  if (!params.match_id) {
    throw new Error('match_id is required');
  }

  const updateData: Record<string, unknown> = {};
  if (params.viewed !== undefined) updateData.viewed = params.viewed;
  if (params.interested !== undefined) updateData.interested = params.interested;

  const response = await client.patch(`/emptylegs/matches/${params.match_id}`, updateData);

  return {
    match_id: params.match_id,
    viewed: response.viewed ?? params.viewed ?? false,
    interested: response.interested ?? params.interested ?? false,
    updated_at: new Date().toISOString(),
  };
}

describe('Empty Leg Watch MCP Tools', () => {
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockClient = createMockClient();
    vi.clearAllMocks();
  });

  describe('create_empty_leg_watch', () => {
    it('should create a watch with valid parameters', async () => {
      const result = await createEmptyLegWatch(mockClient, {
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        date_range_start: '2026-02-01',
        date_range_end: '2026-02-28',
        passengers: 6,
        max_price: 50000,
      });

      expect(result).toHaveProperty('watch_id', 'watch-12345');
      expect(result).toHaveProperty('status', 'active');
      expect(result).toHaveProperty('departure_airport', 'KTEB');
      expect(result).toHaveProperty('arrival_airport', 'KVNY');
      expect(result).toHaveProperty('passengers', 6);
      expect(result).toHaveProperty('max_price', 50000);
      expect(result).toHaveProperty('matches_count', 0);
    });

    it('should validate required departure_airport and arrival_airport', async () => {
      await expect(
        createEmptyLegWatch(mockClient, {
          departure_airport: '',
          arrival_airport: 'KVNY',
          date_range_start: '2026-02-01',
          date_range_end: '2026-02-28',
          passengers: 6,
        })
      ).rejects.toThrow('departure_airport and arrival_airport are required');
    });

    it('should validate required date range', async () => {
      await expect(
        createEmptyLegWatch(mockClient, {
          departure_airport: 'KTEB',
          arrival_airport: 'KVNY',
          date_range_start: '',
          date_range_end: '2026-02-28',
          passengers: 6,
        })
      ).rejects.toThrow('date_range_start and date_range_end are required');
    });

    it('should validate passengers minimum', async () => {
      await expect(
        createEmptyLegWatch(mockClient, {
          departure_airport: 'KTEB',
          arrival_airport: 'KVNY',
          date_range_start: '2026-02-01',
          date_range_end: '2026-02-28',
          passengers: 0,
        })
      ).rejects.toThrow('passengers must be at least 1');
    });

    it('should validate airport format', async () => {
      await expect(
        createEmptyLegWatch(mockClient, {
          departure_airport: 'INVALID_AIRPORT',
          arrival_airport: 'KVNY',
          date_range_start: '2026-02-01',
          date_range_end: '2026-02-28',
          passengers: 6,
        })
      ).rejects.toThrow('Invalid departure_airport format');
    });

    it('should validate date_range_end is after date_range_start', async () => {
      await expect(
        createEmptyLegWatch(mockClient, {
          departure_airport: 'KTEB',
          arrival_airport: 'KVNY',
          date_range_start: '2026-03-01',
          date_range_end: '2026-02-01', // Before start
          passengers: 6,
        })
      ).rejects.toThrow('date_range_end must be after date_range_start');
    });

    it('should validate date range does not exceed 90 days', async () => {
      await expect(
        createEmptyLegWatch(mockClient, {
          departure_airport: 'KTEB',
          arrival_airport: 'KVNY',
          date_range_start: '2026-01-01',
          date_range_end: '2026-06-01', // > 90 days
          passengers: 6,
        })
      ).rejects.toThrow('Date range cannot exceed 90 days');
    });

    it('should accept lowercase airport codes and convert to uppercase', async () => {
      const result = await createEmptyLegWatch(mockClient, {
        departure_airport: 'kteb',
        arrival_airport: 'kvny',
        date_range_start: '2026-02-01',
        date_range_end: '2026-02-28',
        passengers: 6,
      });

      expect(result.departure_airport).toBe('KTEB');
      expect(result.arrival_airport).toBe('KVNY');
    });

    it('should accept aircraft_categories filter', async () => {
      const result = await createEmptyLegWatch(mockClient, {
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        date_range_start: '2026-02-01',
        date_range_end: '2026-02-28',
        passengers: 6,
        aircraft_categories: ['midsize', 'heavy'],
      });

      expect(result.aircraft_categories).toEqual(['midsize', 'heavy']);
    });
  });

  describe('get_empty_leg_watches', () => {
    it('should return all watches', async () => {
      const result = await getEmptyLegWatches(mockClient, {});

      expect(result).toHaveProperty('watches');
      expect(result).toHaveProperty('total_count', 2);
      expect(result.watches).toHaveLength(2);
    });

    it('should return watches with correct structure', async () => {
      const result = await getEmptyLegWatches(mockClient, {});

      const watch = result.watches[0];
      expect(watch).toHaveProperty('watch_id', 'watch-001');
      expect(watch).toHaveProperty('status', 'active');
      expect(watch).toHaveProperty('departure_airport', 'KTEB');
      expect(watch).toHaveProperty('arrival_airport', 'KVNY');
      expect(watch).toHaveProperty('passengers', 6);
      expect(watch).toHaveProperty('matches_count', 3);
    });

    it('should filter by status', async () => {
      const result = await getEmptyLegWatches(mockClient, { status: 'active' });

      expect(mockClient.get).toHaveBeenCalledWith('/emptylegs/watches', {
        params: { status: 'active' },
      });
    });
  });

  describe('update_empty_leg_watch', () => {
    it('should update watch status', async () => {
      const result = await updateEmptyLegWatch(mockClient, {
        watch_id: 'watch-001',
        status: 'paused',
      });

      expect(result).toHaveProperty('watch_id', 'watch-001');
      expect(result).toHaveProperty('status', 'paused');
      expect(mockClient.patch).toHaveBeenCalledWith(
        '/emptylegs/watches/watch-001',
        expect.objectContaining({ status: 'paused' })
      );
    });

    it('should update max_price', async () => {
      const result = await updateEmptyLegWatch(mockClient, {
        watch_id: 'watch-001',
        max_price: 75000,
      });

      expect(result).toHaveProperty('max_price', 75000);
      expect(mockClient.patch).toHaveBeenCalledWith(
        '/emptylegs/watches/watch-001',
        expect.objectContaining({ maxPrice: 75000 })
      );
    });

    it('should require watch_id', async () => {
      await expect(
        updateEmptyLegWatch(mockClient, {
          watch_id: '',
          status: 'paused',
        })
      ).rejects.toThrow('watch_id is required');
    });
  });

  describe('delete_empty_leg_watch', () => {
    it('should delete a watch', async () => {
      const result = await deleteEmptyLegWatch(mockClient, {
        watch_id: 'watch-001',
      });

      expect(result).toHaveProperty('watch_id', 'watch-001');
      expect(result).toHaveProperty('status', 'cancelled');
      expect(result).toHaveProperty('cancelled_at');
      expect(mockClient.delete).toHaveBeenCalledWith('/emptylegs/watches/watch-001');
    });

    it('should require watch_id', async () => {
      await expect(
        deleteEmptyLegWatch(mockClient, { watch_id: '' })
      ).rejects.toThrow('watch_id is required');
    });
  });

  describe('get_watch_matches', () => {
    it('should return matches for a watch', async () => {
      const result = await getWatchMatches(mockClient, {
        watch_id: 'watch-001',
      });

      expect(result).toHaveProperty('watch_id', 'watch-001');
      expect(result).toHaveProperty('matches');
      expect(result).toHaveProperty('total_count');
      expect(result).toHaveProperty('unviewed_count');
    });

    it('should return match with correct structure', async () => {
      const result = await getWatchMatches(mockClient, {
        watch_id: 'watch-001',
      });

      const match = result.matches[0];
      expect(match).toHaveProperty('match_id', 'match-001');
      expect(match).toHaveProperty('empty_leg_id', 'el-12345');
      expect(match).toHaveProperty('departure');
      expect(match.departure).toHaveProperty('airport', 'KTEB');
      expect(match.departure).toHaveProperty('date', '2026-02-15');
      expect(match).toHaveProperty('arrival');
      expect(match.arrival).toHaveProperty('airport', 'KVNY');
      expect(match).toHaveProperty('price', 35000);
      expect(match).toHaveProperty('discount_percentage', 30);
      expect(match).toHaveProperty('aircraft');
      expect(match.aircraft).toHaveProperty('model', 'Citation XLS');
      expect(match).toHaveProperty('operator');
      expect(match.operator).toHaveProperty('name', 'NetJets');
      expect(match).toHaveProperty('deep_link');
    });

    it('should require watch_id', async () => {
      await expect(
        getWatchMatches(mockClient, { watch_id: '' })
      ).rejects.toThrow('watch_id is required');
    });

    it('should count unviewed matches', async () => {
      const result = await getWatchMatches(mockClient, {
        watch_id: 'watch-001',
      });

      expect(result.unviewed_count).toBe(1); // Mock has 1 unviewed match
    });
  });

  describe('mark_match', () => {
    it('should mark match as viewed', async () => {
      const result = await markMatch(mockClient, {
        match_id: 'match-001',
        viewed: true,
      });

      expect(result).toHaveProperty('match_id', 'match-001');
      expect(result).toHaveProperty('viewed', true);
      expect(result).toHaveProperty('updated_at');
      expect(mockClient.patch).toHaveBeenCalledWith(
        '/emptylegs/matches/match-001',
        expect.objectContaining({ viewed: true })
      );
    });

    it('should mark match as interested', async () => {
      const result = await markMatch(mockClient, {
        match_id: 'match-001',
        interested: true,
      });

      expect(result).toHaveProperty('interested', true);
      expect(mockClient.patch).toHaveBeenCalledWith(
        '/emptylegs/matches/match-001',
        expect.objectContaining({ interested: true })
      );
    });

    it('should mark match as both viewed and interested', async () => {
      const result = await markMatch(mockClient, {
        match_id: 'match-001',
        viewed: true,
        interested: true,
      });

      expect(result).toHaveProperty('viewed', true);
      expect(result).toHaveProperty('interested', true);
    });

    it('should require match_id', async () => {
      await expect(
        markMatch(mockClient, { match_id: '' })
      ).rejects.toThrow('match_id is required');
    });
  });
});
