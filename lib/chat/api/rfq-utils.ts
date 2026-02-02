/**
 * RFQ Utilities
 *
 * Client-side utilities for RFQ (Request for Quote) management.
 * Includes merging, filtering, and statistics functions.
 *
 * Extracted from: components/chat-interface.tsx (lines 981-1023, 220-292)
 */

import type { RFQFlight } from '../types';
import type { RFQStatusType } from '../constants';
import { RFQStatus } from '../constants';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Statistics for a collection of RFQ flights
 */
export interface RFQStats {
  /** Total number of RFQs */
  total: number;
  /** Number of quoted RFQs */
  quoted: number;
  /** Number of pending/unanswered RFQs */
  pending: number;
  /** Number of declined RFQs */
  declined: number;
  /** Number of expired RFQs */
  expired: number;
}

/**
 * Options for merging RFQ flights
 */
export interface MergeOptions {
  /** Whether to preserve existing values when new values are empty/zero */
  preserveExisting?: boolean;
  /** Whether to update lastUpdated timestamp */
  updateTimestamp?: boolean;
}

// =============================================================================
// MERGE FUNCTIONS
// =============================================================================

/**
 * Merge incoming RFQ flights with existing ones.
 *
 * Prioritizes new price/status data while preserving existing data
 * when new values are empty or zero.
 *
 * @example
 * ```ts
 * const merged = mergeRFQFlights(existing, incoming);
 * // Existing flights are updated with new data
 * // New flights are appended
 * ```
 *
 * @param existing - Current RFQ flights array
 * @param incoming - New RFQ flights to merge
 * @param options - Merge options
 * @returns Merged array of RFQ flights
 */
export function mergeRFQFlights(
  existing: RFQFlight[],
  incoming: RFQFlight[],
  options: MergeOptions = {}
): RFQFlight[] {
  const { preserveExisting = true, updateTimestamp = true } = options;

  // Create a map of existing flights by ID and quoteId for fast lookup
  const existingById = new Map<string, RFQFlight>();
  const existingByQuoteId = new Map<string, RFQFlight>();

  for (const flight of existing) {
    existingById.set(flight.id, flight);
    if (flight.quoteId) {
      existingByQuoteId.set(flight.quoteId, flight);
    }
  }

  // Track which existing flights have been updated
  const updatedIds = new Set<string>();
  const result: RFQFlight[] = [];

  // Process incoming flights
  for (const incomingFlight of incoming) {
    // Find matching existing flight by ID or quoteId
    const existingFlight =
      existingById.get(incomingFlight.id) ||
      (incomingFlight.quoteId ? existingByQuoteId.get(incomingFlight.quoteId) : undefined);

    if (existingFlight) {
      // Merge existing with incoming
      const merged = mergeSingleFlight(existingFlight, incomingFlight, {
        preserveExisting,
        updateTimestamp,
      });
      result.push(merged);
      updatedIds.add(existingFlight.id);
    } else {
      // New flight - add as is
      result.push({
        ...incomingFlight,
        lastUpdated: updateTimestamp ? new Date().toISOString() : incomingFlight.lastUpdated,
      });
    }
  }

  // Add existing flights that weren't updated
  for (const existingFlight of existing) {
    if (!updatedIds.has(existingFlight.id)) {
      result.push(existingFlight);
    }
  }

  return result;
}

/**
 * Merge a single existing flight with incoming data.
 */
function mergeSingleFlight(
  existing: RFQFlight,
  incoming: RFQFlight,
  options: MergeOptions
): RFQFlight {
  const { preserveExisting = true, updateTimestamp = true } = options;

  const merged: RFQFlight = {
    ...existing,
    ...incoming,
  };

  // Preserve existing values when incoming values are empty/zero
  if (preserveExisting) {
    // Price: keep existing if incoming is zero
    if (incoming.totalPrice === 0 && existing.totalPrice > 0) {
      merged.totalPrice = existing.totalPrice;
    }

    // Status: keep existing if incoming is falsy
    if (!incoming.rfqStatus && existing.rfqStatus) {
      merged.rfqStatus = existing.rfqStatus;
    }

    // Currency: keep existing if incoming is falsy
    if (!incoming.currency && existing.currency) {
      merged.currency = existing.currency;
    }

    // Operator name: keep existing if incoming is 'Unknown'
    if (incoming.operatorName === 'Unknown' && existing.operatorName !== 'Unknown') {
      merged.operatorName = existing.operatorName;
    }
  }

  // Update timestamp
  if (updateTimestamp) {
    merged.lastUpdated = new Date().toISOString();
  }

  return merged;
}

/**
 * Update specific flights in an array by ID.
 *
 * @param flights - Current flights array
 * @param updates - Map of flight ID to updates
 * @returns Updated flights array
 */
export function updateFlightsById(
  flights: RFQFlight[],
  updates: Map<string, Partial<RFQFlight>>
): RFQFlight[] {
  return flights.map((flight) => {
    const flightUpdates = updates.get(flight.id);
    if (flightUpdates) {
      return {
        ...flight,
        ...flightUpdates,
        lastUpdated: new Date().toISOString(),
      };
    }
    return flight;
  });
}

// =============================================================================
// STATISTICS FUNCTIONS
// =============================================================================

/**
 * Calculate statistics for a collection of RFQ flights.
 *
 * @example
 * ```ts
 * const stats = getRFQStats(flights);
 * console.log(`${stats.quoted} of ${stats.total} quoted`);
 * ```
 */
export function getRFQStats(flights: RFQFlight[]): RFQStats {
  const stats: RFQStats = {
    total: flights.length,
    quoted: 0,
    pending: 0,
    declined: 0,
    expired: 0,
  };

  for (const flight of flights) {
    switch (flight.rfqStatus) {
      case RFQStatus.QUOTED:
        stats.quoted++;
        break;
      case RFQStatus.DECLINED:
        stats.declined++;
        break;
      case RFQStatus.EXPIRED:
        stats.expired++;
        break;
      case RFQStatus.UNANSWERED:
      case RFQStatus.SENT:
      default:
        stats.pending++;
        break;
    }
  }

  return stats;
}

/**
 * Get the count of quoted flights.
 */
export function getQuotedCount(flights: RFQFlight[]): number {
  return flights.filter((f) => f.rfqStatus === RFQStatus.QUOTED).length;
}

/**
 * Get the count of pending flights.
 */
export function getPendingCount(flights: RFQFlight[]): number {
  return flights.filter(
    (f) => f.rfqStatus === RFQStatus.UNANSWERED || f.rfqStatus === RFQStatus.SENT
  ).length;
}

// =============================================================================
// FILTER FUNCTIONS
// =============================================================================

/**
 * Filter flights by status.
 */
export function filterByStatus(flights: RFQFlight[], status: RFQStatusType): RFQFlight[] {
  return flights.filter((f) => f.rfqStatus === status);
}

/**
 * Filter flights that have a valid price (> 0).
 */
export function filterWithPrice(flights: RFQFlight[]): RFQFlight[] {
  return flights.filter((f) => f.totalPrice > 0);
}

/**
 * Filter quoted flights (have price and quoted status).
 */
export function filterQuoted(flights: RFQFlight[]): RFQFlight[] {
  return flights.filter((f) => f.rfqStatus === RFQStatus.QUOTED && f.totalPrice > 0);
}

/**
 * Filter flights that need attention (pending or have new messages).
 */
export function filterNeedingAttention(flights: RFQFlight[]): RFQFlight[] {
  return flights.filter((f) => f.hasNewMessages || f.rfqStatus === RFQStatus.UNANSWERED);
}

// =============================================================================
// SORT FUNCTIONS
// =============================================================================

/**
 * Sort flights by price (lowest first).
 */
export function sortByPriceAsc(flights: RFQFlight[]): RFQFlight[] {
  return [...flights].sort((a, b) => a.totalPrice - b.totalPrice);
}

/**
 * Sort flights by price (highest first).
 */
export function sortByPriceDesc(flights: RFQFlight[]): RFQFlight[] {
  return [...flights].sort((a, b) => b.totalPrice - a.totalPrice);
}

/**
 * Sort flights by last updated (newest first).
 */
export function sortByLastUpdated(flights: RFQFlight[]): RFQFlight[] {
  return [...flights].sort(
    (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
  );
}

/**
 * Sort flights by status priority (quoted first, then pending, then others).
 */
export function sortByStatusPriority(flights: RFQFlight[]): RFQFlight[] {
  const statusPriority: Record<string, number> = {
    [RFQStatus.QUOTED]: 1,
    [RFQStatus.UNANSWERED]: 2,
    [RFQStatus.SENT]: 3,
    [RFQStatus.EXPIRED]: 4,
    [RFQStatus.DECLINED]: 5,
  };

  return [...flights].sort((a, b) => {
    const priorityA = statusPriority[a.rfqStatus] || 99;
    const priorityB = statusPriority[b.rfqStatus] || 99;
    return priorityA - priorityB;
  });
}

// =============================================================================
// SELECTION FUNCTIONS
// =============================================================================

/**
 * Get selected flights from an array based on selected IDs.
 */
export function getSelectedFlights(flights: RFQFlight[], selectedIds: string[]): RFQFlight[] {
  const selectedSet = new Set(selectedIds);
  return flights.filter((f) => selectedSet.has(f.id));
}

/**
 * Toggle selection of a flight ID.
 */
export function toggleSelection(selectedIds: string[], flightId: string): string[] {
  if (selectedIds.includes(flightId)) {
    return selectedIds.filter((id) => id !== flightId);
  }
  return [...selectedIds, flightId];
}

/**
 * Select all flight IDs.
 */
export function selectAll(flights: RFQFlight[]): string[] {
  return flights.map((f) => f.id);
}

/**
 * Deselect all flight IDs.
 */
export function deselectAll(): string[] {
  return [];
}

// =============================================================================
// LOOKUP FUNCTIONS
// =============================================================================

/**
 * Find a flight by ID.
 */
export function findFlightById(flights: RFQFlight[], id: string): RFQFlight | undefined {
  return flights.find((f) => f.id === id);
}

/**
 * Find a flight by quote ID.
 */
export function findFlightByQuoteId(flights: RFQFlight[], quoteId: string): RFQFlight | undefined {
  return flights.find((f) => f.quoteId === quoteId);
}

// =============================================================================
// EXPORTS
// =============================================================================

export const rfqUtils = {
  // Merge
  mergeRFQFlights,
  updateFlightsById,
  // Stats
  getRFQStats,
  getQuotedCount,
  getPendingCount,
  // Filter
  filterByStatus,
  filterWithPrice,
  filterQuoted,
  filterNeedingAttention,
  // Sort
  sortByPriceAsc,
  sortByPriceDesc,
  sortByLastUpdated,
  sortByStatusPriority,
  // Selection
  getSelectedFlights,
  toggleSelection,
  selectAll,
  deselectAll,
  // Lookup
  findFlightById,
  findFlightByQuoteId,
};
