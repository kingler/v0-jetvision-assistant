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

export type SortOption = 'price-asc' | 'price-desc' | 'rating-asc' | 'rating-desc' | 'time-asc';
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
  /** Callback when "Book flight" button is clicked */
  onBookFlight?: (flightId: string, quoteId?: string) => void;
  /** Callback when "Generate flight proposal" button is clicked */
  onGenerateProposal?: (flightId: string, quoteId?: string) => void;
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
  onBookFlight,
  onGenerateProposal,
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

  // Loading state
  if (isLoading) {
    return (
      <div data-testid="flights-loading" className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading available flights...</p>
      </div>
    );
  }

  // Empty state - check if there are any flights to display
  if (processedFlights.length === 0) {
    // No flights at all - show initial empty state
    if (flights.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Plane className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No RFQs available</h3>
          <p className="text-muted-foreground">
            No RFQ has been submitted yet. Please follow the instructions in Step 2 to search for flights and send RFQs to operators via the Avinode marketplace.
          </p>
        </div>
      );
    }
    // This case should not occur since we removed filtering, but keeping for safety
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Plane className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No flights available</h3>
        <p className="text-muted-foreground">
          No flights are currently available to display.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
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
            </select>
          )}
        </div>
      </div>

      {/* Flight Cards List - Added proper spacing between cards */}
      <ul
        data-testid="rfq-flights-list"
        role="list"
        aria-label="Available flights"
        className={cn('space-y-6', compact && 'space-y-4')}
      >
        {processedFlights.map((flight) => (
          <li key={flight.id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0 pb-6 last:pb-0">
            <RFQFlightCard
              flight={{ ...flight, isSelected: selectedIds.has(flight.id) }}
              selectable={selectable && !showBookButton}
              onSelect={handleFlightSelect}
              showPriceBreakdown={showPriceBreakdown}
              compact={compact}
              showBookButton={showBookButton}
              onReviewAndBook={onReviewAndBook}
              onViewChat={onViewChat}
              onBookFlight={onBookFlight}
              onGenerateProposal={onGenerateProposal}
              hasMessages={(flight as any).hasMessages ?? (flight.rfqStatus === 'quoted')}
              quoteId={flight.quoteId}
              messageId={(flight as any).messageId}
              aircraftCategory={(flight as any).aircraftCategory}
              hasMedical={(flight as any).hasMedical}
              hasPackage={(flight as any).hasPackage}
            />
          </li>
        ))}
      </ul>

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
