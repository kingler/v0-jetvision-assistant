'use client';

/**
 * RFQFlightsList Component
 *
 * Displays a list of RFQ flights with selection and sorting capabilities.
 * Used in Step 3 of the RFP workflow to show available flight options.
 *
 * Features:
 * - List of RFQFlightCard components
 * - Multi-select capability
 * - Sorting by price, rating, departure time
 * - Selection summary
 * - Continue button to proceed to proposal
 *
 * Note: Filtering by status has been removed as it's not necessary with an average of 2-3 RFQs.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ArrowRight, Plane } from 'lucide-react';
/**
 * Import RFQFlightCard component and RFQFlight type
 * This component is used to render individual flight cards in the list
 * Maps to the get_rfq API response data schema for displaying RFQ, flight, and operator details
 */
import { RFQFlightCard, type RFQFlight } from './rfq-flight-card';

// =============================================================================
// TYPES
// =============================================================================

export type SortOption = 'price-asc' | 'price-desc' | 'rating-asc' | 'rating-desc' | 'time-asc' | 'received-asc' | 'received-desc';
export type StatusFilter = 'all' | 'sent' | 'unanswered' | 'quoted' | 'declined' | 'expired';

export interface RFQFlightsListProps {
  flights: RFQFlight[];
  isLoading?: boolean;
  selectable?: boolean;
  showSelectAll?: boolean;
  onSelectionChange?: (selectedIds: string[]) => void;
  sortable?: boolean;
  initialSortBy?: SortOption;
  filterable?: boolean;
  statusFilter?: StatusFilter;
  showContinueButton?: boolean;
  onContinue?: (selectedFlights: RFQFlight[]) => void;
  showPriceBreakdown?: boolean;
  compact?: boolean;
  className?: string;
  /** Show "Review and Book" button instead of checkbox on each card */
  showBookButton?: boolean;
  /** Callback when "Review and Book" button is clicked (triggers Step 4) */
  onReviewAndBook?: (flightId: string) => void;
  /** Callback when "View Chat" button is clicked */
  onViewChat?: (flightId: string, quoteId?: string, messageId?: string) => void;
  /** Callback when "Generate flight proposal" button is clicked */
  onGenerateProposal?: (flightId: string, quoteId?: string) => void;
  /** Callback when "Book Flight" button is clicked (triggers contract generation modal) */
  onBookFlight?: (flightId: string, quoteId?: string) => void;
  /** Whether the Book Flight button should be disabled */
  bookFlightDisabled?: boolean;
  /** Tooltip reason when Book Flight is disabled */
  bookFlightDisabledReason?: string;
  /**
   * Enable round-trip leg grouping mode.
   * When true, flights will be grouped by legType (outbound/return) with section headers.
   */
  groupByLeg?: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function sortFlights(flights: RFQFlight[], sortBy: SortOption): RFQFlight[] {
  return [...flights].sort((a, b) => {
    switch (sortBy) {
      case 'price-asc':
        return a.totalPrice - b.totalPrice;
      case 'price-desc':
        return b.totalPrice - a.totalPrice;
      case 'rating-asc':
        return (a.operatorRating || 0) - (b.operatorRating || 0);
      case 'rating-desc':
        return (b.operatorRating || 0) - (a.operatorRating || 0);
      case 'time-asc':
        const timeA = a.departureTime || '00:00';
        const timeB = b.departureTime || '00:00';
        return timeA.localeCompare(timeB);
      case 'received-asc':
        // Sort by lastUpdated (oldest first - chronological order)
        const dateA = new Date(a.lastUpdated || 0).getTime();
        const dateB = new Date(b.lastUpdated || 0).getTime();
        return dateA - dateB;
      case 'received-desc':
        // Sort by lastUpdated (newest first)
        const dateA2 = new Date(a.lastUpdated || 0).getTime();
        const dateB2 = new Date(b.lastUpdated || 0).getTime();
        return dateB2 - dateA2;
      default:
        return 0;
    }
  });
}

// Filter function removed - filtering not needed with average of 2-3 RFQs

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function RFQFlightsList({
  flights,
  isLoading = false,
  selectable = false,
  showSelectAll = false,
  onSelectionChange,
  sortable = false,
  initialSortBy = 'price-asc',
  filterable = false,
  statusFilter = 'all',
  showContinueButton = false,
  onContinue,
  showPriceBreakdown = false,
  compact = true, // Default to true to show compact view with expand/collapse functionality
  className,
  showBookButton = false,
  onReviewAndBook,
  onViewChat,
  onGenerateProposal,
  onBookFlight,
  bookFlightDisabled,
  bookFlightDisabledReason,
  groupByLeg = false,
}: RFQFlightsListProps) {
  const [sortBy, setSortBy] = useState<SortOption>(initialSortBy);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const initialSelected = flights.filter((f) => f.isSelected).map((f) => f.id);
    return new Set(initialSelected);
  });

  // Compute sorted flights (filtering removed as not needed with 2-3 RFQs average)
  const processedFlights = useMemo(() => {
    let result = flights;
    if (sortable) {
      result = sortFlights(result, sortBy);
    }
    return result;
  }, [flights, sortBy, sortable]);

  // Group flights by leg type for round-trip proposals
  const groupedFlights = useMemo(() => {
    if (!groupByLeg) {
      return null;
    }

    const outbound: RFQFlight[] = [];
    const returnFlights: RFQFlight[] = [];
    const unassigned: RFQFlight[] = [];

    processedFlights.forEach((flight) => {
      if (flight.legType === 'outbound' || flight.legSequence === 1) {
        outbound.push(flight);
      } else if (flight.legType === 'return' || flight.legSequence === 2) {
        returnFlights.push(flight);
      } else {
        unassigned.push(flight);
      }
    });

    return {
      outbound,
      return: returnFlights,
      unassigned,
      hasGroups: outbound.length > 0 || returnFlights.length > 0,
    };
  }, [processedFlights, groupByLeg]);

  // Get selected flights
  const selectedFlights = useMemo(() => {
    return flights.filter((f) => selectedIds.has(f.id));
  }, [flights, selectedIds]);

  // Handle individual flight selection
  const handleFlightSelect = useCallback(
    (flightId: string, selected: boolean) => {
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        if (selected) {
          newSet.add(flightId);
        } else {
          newSet.delete(flightId);
        }
        onSelectionChange?.(Array.from(newSet));
        return newSet;
      });
    },
    [onSelectionChange]
  );

  // Handle select all
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        const allIds = processedFlights.map((f) => f.id);
        setSelectedIds(new Set(allIds));
        onSelectionChange?.(allIds);
      } else {
        setSelectedIds(new Set());
        onSelectionChange?.([]);
      }
    },
    [processedFlights, onSelectionChange]
  );

  // Check if all flights are selected
  const allSelected = processedFlights.length > 0 && processedFlights.every((f) => selectedIds.has(f.id));

  // Handle continue button
  const handleContinue = useCallback(() => {
    onContinue?.(selectedFlights);
  }, [onContinue, selectedFlights]);

  // Handle sort change
  const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value as SortOption);
  }, []);

  // Helper function to render a single flight card
  const renderFlightCard = useCallback((flight: RFQFlight, group: 'outbound' | 'return' | 'other' | 'ungrouped') => {
    // CRITICAL: Create a key that includes price and status to force re-render when they change
    // This ensures React re-renders the card when price/status updates
    const cardKey = `${flight.id}-${flight.totalPrice}-${flight.rfqStatus}-${flight.lastUpdated || Date.now()}`;

    // CRITICAL: Log what we're passing to the card with ALL price/status fields expanded
    const priceFields = {
      totalPrice: flight.totalPrice,
      price: (flight as any).price,
      total_price: (flight as any).total_price,
      sellerPrice_price: (flight as any).sellerPrice?.price,
      pricing_total: (flight as any).pricing?.total,
    };
    const statusFields = {
      rfqStatus: flight.rfqStatus,
      status: (flight as any).status,
      rfq_status: (flight as any).rfq_status,
      quote_status: (flight as any).quote_status,
    };

    // Only log first 3 flights to avoid console spam
    const flightIndex = processedFlights.indexOf(flight);
    if (flightIndex < 3) {
      console.log('[RFQFlightsList] 📋 Rendering flight card #' + (flightIndex + 1) + ' (' + group + '):');
      console.log('  ID:', flight.id);
      console.log('  Operator:', flight.operatorName);
      console.log('  PRICE FIELDS:', priceFields);
      console.log('  STATUS FIELDS:', statusFields);
      console.log('  Currency:', flight.currency);
      console.log('  Has price in ANY field?', Object.values(priceFields).some(v => v && v > 0) ? 'YES' : 'NO');
      console.log('  Has quoted status?', flight.rfqStatus === 'quoted' ? 'YES' : 'NO');
      console.log('  Leg Type:', flight.legType, 'Leg Sequence:', flight.legSequence);
    }

    return (
      <li key={flight.id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0 pb-6 last:pb-0">
        <RFQFlightCard
          key={cardKey} // CRITICAL: Force re-render when price/status changes
          flight={{ ...flight, isSelected: selectedIds.has(flight.id) }}
          selectable={selectable && !showBookButton}
          onSelect={handleFlightSelect}
          showPriceBreakdown={showPriceBreakdown}
          compact={compact}
          showBookButton={showBookButton}
          onReviewAndBook={onReviewAndBook}
          onViewChat={onViewChat}
          onGenerateProposal={onGenerateProposal}
          onBookFlight={onBookFlight}
          bookFlightDisabled={bookFlightDisabled}
          bookFlightDisabledReason={bookFlightDisabledReason}
          hasMessages={(flight as any).hasMessages ?? (flight.rfqStatus === 'quoted')}
          hasNewMessages={(flight as any).hasNewMessages ?? false}
          quoteId={flight.quoteId}
          messageId={(flight as any).messageId}
          aircraftCategory={(flight as any).aircraftCategory}
          hasMedical={(flight as any).hasMedical}
          hasPackage={(flight as any).hasPackage}
        />
      </li>
    );
  }, [
    processedFlights,
    selectedIds,
    selectable,
    showBookButton,
    handleFlightSelect,
    showPriceBreakdown,
    compact,
    onReviewAndBook,
    onViewChat,
    onGenerateProposal,
    onBookFlight,
    bookFlightDisabled,
    bookFlightDisabledReason,
  ]);

  // Loading state
  // FIXED: Added explicit background to prevent collapse during loading
  // Removed fixed min-height to allow full expansion
  if (isLoading) {
    return (
      <div 
        data-testid="flights-loading" 
        className="flex flex-col items-center justify-center py-12 bg-white dark:bg-gray-900"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading available flights...</p>
      </div>
    );
  }

  // Empty state - check if there are any flights to display
  // FIXED: Added explicit background to prevent collapse when empty
  // Removed fixed min-height to allow full expansion
  if (processedFlights.length === 0) {
    // No flights at all - show initial empty state
    if (flights.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-white dark:bg-gray-900">
          <Plane className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">No RFQs available</h3>
          <p className="text-muted-foreground max-w-md">
            No RFQ has been submitted yet. Please follow the instructions in Step 2 to search for flights and send RFQs to operators via the Avinode marketplace.
          </p>
        </div>
      );
    }
    // This case should not occur since we removed filtering, but keeping for safety
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center bg-white dark:bg-gray-900">
        <Plane className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">No flights available</h3>
        <p className="text-muted-foreground max-w-md">
          No flights are currently available to display.
        </p>
      </div>
    );
  }

  return (
    <div 
      className={cn('space-y-4 bg-white dark:bg-gray-900', className)}
      style={{ 
        height: 'auto', 
        minHeight: 'auto',
        overflow: 'visible',
        display: 'block',
        width: '100%'
      }}
    >
      {/* Header with controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold">
            {processedFlights.length} flight{processedFlights.length !== 1 ? 's' : ''} available
          </h3>
          {selectable && selectedIds.size > 0 && (
            <span className="text-sm text-primary">
              {selectedIds.size} selected
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Select All */}
          {selectable && showSelectAll && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleSelectAll}
                aria-label="Select all flights"
              />
              <span>Select all</span>
            </label>
          )}

          {/* Sort Dropdown */}
          {sortable && (
            <select
              value={sortBy}
              onChange={handleSortChange}
              aria-label="Sort by"
              role="combobox"
              className="text-sm border border-gray-200 dark:border-gray-700 rounded-md px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            >
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating-desc">Rating: High to Low</option>
              <option value="rating-asc">Rating: Low to High</option>
              <option value="time-asc">Departure Time</option>
              <option value="received-asc">Received: Oldest First</option>
              <option value="received-desc">Received: Newest First</option>
            </select>
          )}
        </div>
      </div>

      {/* Flight Cards List - Added proper spacing between cards */}
      {/* FIXED: Removed any overflow constraints to ensure all cards are visible when scrolling */}
      {groupByLeg && groupedFlights?.hasGroups ? (
        // Grouped view for round-trip proposals
        <div className="space-y-8">
          {/* Outbound Flight Options */}
          {groupedFlights.outbound.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                <Plane className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Outbound Flight Options
                </h4>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({groupedFlights.outbound.length} option{groupedFlights.outbound.length !== 1 ? 's' : ''})
                </span>
              </div>
              <ul
                data-testid="rfq-flights-list-outbound"
                role="list"
                aria-label="Outbound flight options"
                className={cn('space-y-6', compact && 'space-y-4')}
                style={{ height: 'auto', overflow: 'visible' }}
              >
                {groupedFlights.outbound.map((flight) => renderFlightCard(flight, 'outbound'))}
              </ul>
            </div>
          )}

          {/* Return Flight Options */}
          {groupedFlights.return.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                <Plane className="h-4 w-4 text-green-600 dark:text-green-400 rotate-180" />
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Return Flight Options
                </h4>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({groupedFlights.return.length} option{groupedFlights.return.length !== 1 ? 's' : ''})
                </span>
              </div>
              <ul
                data-testid="rfq-flights-list-return"
                role="list"
                aria-label="Return flight options"
                className={cn('space-y-6', compact && 'space-y-4')}
                style={{ height: 'auto', overflow: 'visible' }}
              >
                {groupedFlights.return.map((flight) => renderFlightCard(flight, 'return'))}
              </ul>
            </div>
          )}

          {/* Unassigned flights (no leg type) */}
          {groupedFlights.unassigned.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                <Plane className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Additional Flight Options
                </h4>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({groupedFlights.unassigned.length} option{groupedFlights.unassigned.length !== 1 ? 's' : ''})
                </span>
              </div>
              <ul
                data-testid="rfq-flights-list-other"
                role="list"
                aria-label="Additional flight options"
                className={cn('space-y-6', compact && 'space-y-4')}
                style={{ height: 'auto', overflow: 'visible' }}
              >
                {groupedFlights.unassigned.map((flight) => renderFlightCard(flight, 'other'))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        // Standard ungrouped view
        <ul
          data-testid="rfq-flights-list"
          role="list"
          aria-label="Available flights"
          className={cn('space-y-6', compact && 'space-y-4')}
          style={{ height: 'auto', overflow: 'visible' }}
        >
          {processedFlights.map((flight) => renderFlightCard(flight, 'ungrouped'))}
        </ul>
      )}

      {/* Selection Status - Screen Reader Announcement */}
      <div role="status" className="sr-only" aria-live="polite">
        {selectedIds.size} flight{selectedIds.size !== 1 ? 's' : ''} selected
      </div>

      {/* Continue Button */}
      {showContinueButton && (
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            onClick={handleContinue}
            disabled={selectedIds.size === 0}
            className=""
          >
            Continue to Send Proposal
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default RFQFlightsList;
