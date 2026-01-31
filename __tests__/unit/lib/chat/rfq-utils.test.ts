/**
 * RFQ Utilities Unit Tests
 *
 * Tests for lib/chat/api/rfq-utils.ts
 */

import { describe, it, expect } from 'vitest';
import {
  mergeRFQFlights,
  updateFlightsById,
  getRFQStats,
  getQuotedCount,
  getPendingCount,
  filterByStatus,
  filterWithPrice,
  filterQuoted,
  filterNeedingAttention,
  sortByPriceAsc,
  sortByPriceDesc,
  sortByLastUpdated,
  sortByStatusPriority,
  getSelectedFlights,
  toggleSelection,
  selectAll,
  deselectAll,
  findFlightById,
  findFlightByQuoteId,
} from '@/lib/chat/api/rfq-utils';
import { RFQStatus } from '@/lib/chat/constants';
import type { RFQFlight } from '@/lib/chat/types';

// =============================================================================
// TEST DATA
// =============================================================================

const createMockFlight = (overrides: Partial<RFQFlight> = {}): RFQFlight => ({
  id: 'flight-1',
  quoteId: 'quote-1',
  departureAirport: { icao: 'KTEB', name: 'Teterboro', city: 'Teterboro' },
  arrivalAirport: { icao: 'KLAX', name: 'Los Angeles Intl', city: 'Los Angeles' },
  departureDate: '2026-02-15',
  departureTime: '10:00',
  flightDuration: '5h 30m',
  aircraftType: 'Gulfstream G650',
  aircraftModel: 'G650',
  passengerCapacity: 14,
  operatorName: 'NetJets',
  totalPrice: 50000,
  currency: 'USD',
  amenities: { wifi: true, pets: false, smoking: false, galley: true, lavatory: true, medical: false },
  rfqStatus: RFQStatus.QUOTED,
  lastUpdated: '2026-01-31T10:00:00Z',
  ...overrides,
});

// =============================================================================
// MERGE TESTS
// =============================================================================

describe('mergeRFQFlights', () => {
  it('should merge new flights into empty array', () => {
    const incoming = [createMockFlight({ id: 'flight-1' })];
    const result = mergeRFQFlights([], incoming);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('flight-1');
  });

  it('should update existing flights with new data', () => {
    const existing = [createMockFlight({ id: 'flight-1', totalPrice: 40000 })];
    const incoming = [createMockFlight({ id: 'flight-1', totalPrice: 50000 })];

    const result = mergeRFQFlights(existing, incoming);

    expect(result).toHaveLength(1);
    expect(result[0].totalPrice).toBe(50000);
  });

  it('should preserve existing price when incoming price is zero', () => {
    const existing = [createMockFlight({ id: 'flight-1', totalPrice: 40000 })];
    const incoming = [createMockFlight({ id: 'flight-1', totalPrice: 0 })];

    const result = mergeRFQFlights(existing, incoming, { preserveExisting: true });

    expect(result).toHaveLength(1);
    expect(result[0].totalPrice).toBe(40000);
  });

  it('should add new flights that do not exist', () => {
    const existing = [createMockFlight({ id: 'flight-1' })];
    const incoming = [createMockFlight({ id: 'flight-2', quoteId: 'quote-2' })];

    const result = mergeRFQFlights(existing, incoming);

    expect(result).toHaveLength(2);
    expect(result.map((f) => f.id)).toContain('flight-1');
    expect(result.map((f) => f.id)).toContain('flight-2');
  });

  it('should match flights by quoteId when id does not match', () => {
    const existing = [createMockFlight({ id: 'flight-1', quoteId: 'quote-abc' })];
    const incoming = [createMockFlight({ id: 'flight-new', quoteId: 'quote-abc', totalPrice: 60000 })];

    const result = mergeRFQFlights(existing, incoming);

    expect(result).toHaveLength(1);
    expect(result[0].totalPrice).toBe(60000);
  });

  it('should update lastUpdated timestamp', () => {
    const existing = [createMockFlight({ id: 'flight-1', lastUpdated: '2026-01-01T00:00:00Z' })];
    const incoming = [createMockFlight({ id: 'flight-1' })];

    const result = mergeRFQFlights(existing, incoming, { updateTimestamp: true });

    expect(new Date(result[0].lastUpdated).getTime()).toBeGreaterThan(
      new Date('2026-01-01T00:00:00Z').getTime()
    );
  });
});

describe('updateFlightsById', () => {
  it('should update specific flights by ID', () => {
    const flights = [
      createMockFlight({ id: 'flight-1', totalPrice: 40000 }),
      createMockFlight({ id: 'flight-2', totalPrice: 50000 }),
    ];

    const updates = new Map([['flight-1', { totalPrice: 45000 }]]);

    const result = updateFlightsById(flights, updates);

    expect(result[0].totalPrice).toBe(45000);
    expect(result[1].totalPrice).toBe(50000);
  });

  it('should not modify flights without updates', () => {
    const flights = [createMockFlight({ id: 'flight-1' })];
    const updates = new Map([['flight-999', { totalPrice: 99999 }]]);

    const result = updateFlightsById(flights, updates);

    expect(result[0].totalPrice).toBe(50000);
  });
});

// =============================================================================
// STATISTICS TESTS
// =============================================================================

describe('getRFQStats', () => {
  it('should calculate correct stats', () => {
    const flights = [
      createMockFlight({ id: '1', rfqStatus: RFQStatus.QUOTED }),
      createMockFlight({ id: '2', rfqStatus: RFQStatus.QUOTED }),
      createMockFlight({ id: '3', rfqStatus: RFQStatus.UNANSWERED }),
      createMockFlight({ id: '4', rfqStatus: RFQStatus.DECLINED }),
      createMockFlight({ id: '5', rfqStatus: RFQStatus.EXPIRED }),
    ];

    const stats = getRFQStats(flights);

    expect(stats.total).toBe(5);
    expect(stats.quoted).toBe(2);
    expect(stats.pending).toBe(1);
    expect(stats.declined).toBe(1);
    expect(stats.expired).toBe(1);
  });

  it('should return zero stats for empty array', () => {
    const stats = getRFQStats([]);

    expect(stats.total).toBe(0);
    expect(stats.quoted).toBe(0);
    expect(stats.pending).toBe(0);
  });
});

describe('getQuotedCount', () => {
  it('should count quoted flights', () => {
    const flights = [
      createMockFlight({ id: '1', rfqStatus: RFQStatus.QUOTED }),
      createMockFlight({ id: '2', rfqStatus: RFQStatus.QUOTED }),
      createMockFlight({ id: '3', rfqStatus: RFQStatus.UNANSWERED }),
    ];

    expect(getQuotedCount(flights)).toBe(2);
  });
});

describe('getPendingCount', () => {
  it('should count pending flights', () => {
    const flights = [
      createMockFlight({ id: '1', rfqStatus: RFQStatus.UNANSWERED }),
      createMockFlight({ id: '2', rfqStatus: RFQStatus.SENT }),
      createMockFlight({ id: '3', rfqStatus: RFQStatus.QUOTED }),
    ];

    expect(getPendingCount(flights)).toBe(2);
  });
});

// =============================================================================
// FILTER TESTS
// =============================================================================

describe('filterByStatus', () => {
  it('should filter by status', () => {
    const flights = [
      createMockFlight({ id: '1', rfqStatus: RFQStatus.QUOTED }),
      createMockFlight({ id: '2', rfqStatus: RFQStatus.UNANSWERED }),
    ];

    const result = filterByStatus(flights, RFQStatus.QUOTED);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });
});

describe('filterWithPrice', () => {
  it('should filter flights with price > 0', () => {
    const flights = [
      createMockFlight({ id: '1', totalPrice: 50000 }),
      createMockFlight({ id: '2', totalPrice: 0 }),
    ];

    const result = filterWithPrice(flights);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });
});

describe('filterQuoted', () => {
  it('should filter quoted flights with price', () => {
    const flights = [
      createMockFlight({ id: '1', rfqStatus: RFQStatus.QUOTED, totalPrice: 50000 }),
      createMockFlight({ id: '2', rfqStatus: RFQStatus.QUOTED, totalPrice: 0 }),
      createMockFlight({ id: '3', rfqStatus: RFQStatus.UNANSWERED, totalPrice: 50000 }),
    ];

    const result = filterQuoted(flights);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });
});

describe('filterNeedingAttention', () => {
  it('should filter flights needing attention', () => {
    const flights = [
      createMockFlight({ id: '1', hasNewMessages: true }),
      createMockFlight({ id: '2', rfqStatus: RFQStatus.UNANSWERED }),
      createMockFlight({ id: '3', rfqStatus: RFQStatus.QUOTED }),
    ];

    const result = filterNeedingAttention(flights);

    expect(result).toHaveLength(2);
  });
});

// =============================================================================
// SORT TESTS
// =============================================================================

describe('sortByPriceAsc', () => {
  it('should sort by price ascending', () => {
    const flights = [
      createMockFlight({ id: '1', totalPrice: 50000 }),
      createMockFlight({ id: '2', totalPrice: 30000 }),
      createMockFlight({ id: '3', totalPrice: 40000 }),
    ];

    const result = sortByPriceAsc(flights);

    expect(result[0].totalPrice).toBe(30000);
    expect(result[1].totalPrice).toBe(40000);
    expect(result[2].totalPrice).toBe(50000);
  });
});

describe('sortByPriceDesc', () => {
  it('should sort by price descending', () => {
    const flights = [
      createMockFlight({ id: '1', totalPrice: 30000 }),
      createMockFlight({ id: '2', totalPrice: 50000 }),
    ];

    const result = sortByPriceDesc(flights);

    expect(result[0].totalPrice).toBe(50000);
    expect(result[1].totalPrice).toBe(30000);
  });
});

describe('sortByStatusPriority', () => {
  it('should sort by status priority', () => {
    const flights = [
      createMockFlight({ id: '1', rfqStatus: RFQStatus.EXPIRED }),
      createMockFlight({ id: '2', rfqStatus: RFQStatus.QUOTED }),
      createMockFlight({ id: '3', rfqStatus: RFQStatus.UNANSWERED }),
    ];

    const result = sortByStatusPriority(flights);

    expect(result[0].rfqStatus).toBe(RFQStatus.QUOTED);
    expect(result[1].rfqStatus).toBe(RFQStatus.UNANSWERED);
    expect(result[2].rfqStatus).toBe(RFQStatus.EXPIRED);
  });
});

// =============================================================================
// SELECTION TESTS
// =============================================================================

describe('getSelectedFlights', () => {
  it('should return selected flights', () => {
    const flights = [
      createMockFlight({ id: '1' }),
      createMockFlight({ id: '2' }),
      createMockFlight({ id: '3' }),
    ];

    const result = getSelectedFlights(flights, ['1', '3']);

    expect(result).toHaveLength(2);
    expect(result.map((f) => f.id)).toEqual(['1', '3']);
  });
});

describe('toggleSelection', () => {
  it('should add ID if not selected', () => {
    const result = toggleSelection(['1', '2'], '3');
    expect(result).toContain('3');
  });

  it('should remove ID if selected', () => {
    const result = toggleSelection(['1', '2', '3'], '2');
    expect(result).not.toContain('2');
  });
});

describe('selectAll', () => {
  it('should return all flight IDs', () => {
    const flights = [
      createMockFlight({ id: '1' }),
      createMockFlight({ id: '2' }),
    ];

    const result = selectAll(flights);

    expect(result).toEqual(['1', '2']);
  });
});

describe('deselectAll', () => {
  it('should return empty array', () => {
    expect(deselectAll()).toEqual([]);
  });
});

// =============================================================================
// LOOKUP TESTS
// =============================================================================

describe('findFlightById', () => {
  it('should find flight by ID', () => {
    const flights = [
      createMockFlight({ id: '1' }),
      createMockFlight({ id: '2' }),
    ];

    const result = findFlightById(flights, '2');

    expect(result?.id).toBe('2');
  });

  it('should return undefined if not found', () => {
    const flights = [createMockFlight({ id: '1' })];

    const result = findFlightById(flights, '999');

    expect(result).toBeUndefined();
  });
});

describe('findFlightByQuoteId', () => {
  it('should find flight by quote ID', () => {
    const flights = [
      createMockFlight({ id: '1', quoteId: 'quote-abc' }),
      createMockFlight({ id: '2', quoteId: 'quote-xyz' }),
    ];

    const result = findFlightByQuoteId(flights, 'quote-xyz');

    expect(result?.id).toBe('2');
  });
});
