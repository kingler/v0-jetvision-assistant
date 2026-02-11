'use client';

/**
 * FlightSearchProgress Component
 *
 * A streamlined 4-step workflow component for flight search operations.
 * Consolidates trip request creation, Avinode deep link generation,
 * user selection, and flight details retrieval into a single cohesive UI.
 *
 * Steps:
 * 1. Create Trip Request (Automatic) - Display flight request details
 * 2. Select Flight & RFQ (Manual) - Search and select flights in Avinode
 * 3. Retrieve Flight Details (Manual) - User enters TripID from Avinode
 * 4. Send Proposal (Automatic) - Display retrieved quote/flight info
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  Clock,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  Plane,
  Calendar,
  Users,
  MapPin,
  ArrowRight,
  ArrowLeftRight,
  ClipboardCheck,
  MessageSquare,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RFQFlightsList } from './rfq-flights-list';
import { SendProposalStep } from './send-proposal-step';
import { convertToAvinodeRFQFlight } from './utils';
import type { RFQFlight } from './rfq-flight-card';
import type { RFQFlight as AvinodeRFQFlight } from '@/lib/mcp/clients/avinode-client';
import { getAirportByIcao } from '@/lib/airports/airport-database';
import { validateAndFixAvinodeUrl } from '@/lib/utils/avinode-url';

// =============================================================================
// TYPES
// =============================================================================

export interface FlightRequestDetails {
  departureAirport: {
    icao: string;
    name?: string;
    city?: string;
    state?: string;
  };
  arrivalAirport: {
    icao: string;
    name?: string;
    city?: string;
    state?: string;
  };
  departureDate: string;
  passengers: number;
  tripType?: 'one_way' | 'round_trip';
  returnDate?: string;
  aircraftPreferences?: string;
  specialRequirements?: string;
  requestId?: string;
}

export interface SelectedFlight {
  id: string;
  aircraftType: string;
  aircraftCategory?: string;
  yearOfMake?: number;
  operatorName: string;
  operatorEmail?: string;
  price: number;
  currency?: string;
  passengerCapacity?: number;
  hasMedical?: boolean;
  hasPackage?: boolean;
  petsAllowed?: boolean;
  smokingAllowed?: boolean;
  hasWifi?: boolean;
  rfqStatus?: 'sent' | 'unanswered' | 'quoted' | 'declined';
  imageUrl?: string;
}

export interface FlightSearchProgressProps {
  /** Current step (1-4) */
  currentStep: number;
  /** Flight request details for Step 1 */
  flightRequest: FlightRequestDetails;
  /** Deep link URL for Step 2 */
  deepLink?: string;
  /** Trip ID entered by user in Step 3 */
  tripId?: string;
  /** Whether Trip ID is being validated/submitted */
  isTripIdLoading?: boolean;
  /** Error message from Trip ID submission */
  tripIdError?: string;
  /** Whether Trip ID has been successfully submitted */
  tripIdSubmitted?: boolean;
  /** Whether the Avinode trip has been successfully created (has avinode_trip_id) */
  /** This determines if the 3 step cards should be displayed */
  /** Cards should only render when trip creation is complete, not during clarification dialogue */
  isTripCreated?: boolean;
  /** Selected flights sent to operators (legacy) */
  selectedFlights?: SelectedFlight[];
  /** RFQ flights retrieved from Avinode (new Step 3) */
  rfqFlights?: RFQFlight[];
  /** Whether RFQ flights are loading */
  isRfqFlightsLoading?: boolean;
  /** Selected flight IDs for proposal */
  selectedRfqFlightIds?: string[];
  /** Timestamp when RFQs were last fetched */
  rfqsLastFetchedAt?: string;
  /** Customer email for proposal */
  customerEmail?: string;
  /** Customer name for proposal */
  customerName?: string;
  /** Callback when Trip ID is submitted */
  onTripIdSubmit?: (tripId: string) => Promise<void>;
  /** Callback when deep link is clicked */
  onDeepLinkClick?: () => void;
  /** Callback when deep link is copied */
  onCopyDeepLink?: () => void;
  /** Callback when View Chat is clicked for a flight */
  onViewChat?: (flightId: string, quoteId?: string, messageId?: string) => void;
  /** Callback when "Generate flight proposal" button is clicked */
  onGenerateProposal?: (flightId: string, quoteId?: string) => void;
  /** Callback when RFQ flight selection changes */
  onRfqFlightSelectionChange?: (selectedIds: string[]) => void;
  /** Callback when user clicks continue to proposal */
  onContinueToProposal?: (selectedFlights: RFQFlight[]) => void;
  /** Callback when user clicks "Review and Book" button on a flight card */
  onReviewAndBook?: (flightId: string) => void;
  /** Callback when user clicks "Book Flight" button on a quoted flight card */
  onBookFlight?: (flightId: string, quoteId?: string) => void;
  /** Whether the Book Flight button should be disabled */
  bookFlightDisabled?: boolean;
  /** Tooltip reason when Book Flight is disabled */
  bookFlightDisabledReason?: string;
  /** Callback when PDF preview is generated */
  onGeneratePreview?: (data: {
    customerEmail: string;
    customerName: string;
    selectedFlights: AvinodeRFQFlight[];
    tripDetails: {
      departureAirport: FlightRequestDetails['departureAirport'];
      arrivalAirport: FlightRequestDetails['arrivalAirport'];
      departureDate: string;
      passengers: number;
      tripId?: string;
    };
  }) => Promise<{ success: boolean; previewUrl?: string; error?: string }>;
  /** Callback when proposal is sent */
  onSendProposal?: (data: {
    customerEmail: string;
    customerName: string;
    selectedFlights: AvinodeRFQFlight[];
    tripDetails: {
      departureAirport: FlightRequestDetails['departureAirport'];
      arrivalAirport: FlightRequestDetails['arrivalAirport'];
      departureDate: string;
      passengers: number;
      tripId?: string;
    };
  }) => Promise<{ success: boolean; error?: string }>;
  /** Jetvision service charge percentage for internal cost breakdown */
  marginPercentage?: number;
  /** Callback when user goes back from Step 4 */
  onGoBackFromProposal?: () => void;
  /** Which steps to render: 'steps-1-2', 'steps-3-4', or 'all' (default) */
  renderMode?: 'steps-1-2' | 'steps-3-4' | 'all';
  /** Additional CSS class */
  className?: string;
}

// =============================================================================
// STEP LABELS
// =============================================================================

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Flight Card Component - Displays selected flight details
 */
function FlightCard({
  flight,
  onViewChat
}: {
  flight: SelectedFlight;
  onViewChat?: (flightId: string) => void;
}) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
      <div className="flex">
        {/* Aircraft Image Placeholder */}
        <div className="w-32 h-40 bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
          {flight.imageUrl ? (
            <img src={flight.imageUrl} alt={flight.aircraftType} className="w-full h-full object-cover" />
          ) : (
            <Plane className="h-12 w-12 text-gray-300 dark:text-gray-600" />
          )}
        </div>

        {/* Flight Details */}
        <div className="flex-1 p-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {/* Aircraft Info */}
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">Aircraft</p>
            <p className="text-gray-600 dark:text-gray-400">Category: <span className="text-gray-900 dark:text-gray-100">{flight.aircraftCategory || 'Heavy jet'}</span></p>
            <p className="text-gray-600 dark:text-gray-400">Year of Make: <span className="text-gray-900 dark:text-gray-100">{flight.yearOfMake || 'N/A'}</span></p>
          </div>

          {/* Price Info */}
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">Price</p>
            <p className="text-gray-900 dark:text-gray-100">${flight.price.toLocaleString()} {flight.currency || 'USD'}</p>
            <p className="text-gray-600 dark:text-gray-400">RFQ Status: <span className={cn(
              flight.rfqStatus === 'quoted' && 'text-green-600',
              flight.rfqStatus === 'unanswered' && 'text-amber-600',
              flight.rfqStatus === 'declined' && 'text-red-600',
              !flight.rfqStatus && 'text-gray-900 dark:text-gray-100'
            )}>{flight.rfqStatus || 'Unanswered'}</span></p>
          </div>

          {/* Transport Info */}
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">Transport</p>
            <p className="text-gray-600 dark:text-gray-400">Passenger Capacity: <span className="text-gray-900 dark:text-gray-100">{flight.passengerCapacity || 'N/A'}</span></p>
            <p className="text-gray-600 dark:text-gray-400">Medical: <span className="text-gray-900 dark:text-gray-100">{flight.hasMedical ? 'YES' : 'NO'}</span></p>
            <p className="text-gray-600 dark:text-gray-400">Package: <span className="text-gray-900 dark:text-gray-100">{flight.hasPackage ? 'YES' : 'NO'}</span></p>
          </div>

          {/* Amenities */}
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">Amenities</p>
            <p className="text-gray-600 dark:text-gray-400">Pets Allowed: <span className="text-gray-900 dark:text-gray-100">{flight.petsAllowed ? 'YES' : 'NO'}</span></p>
            <p className="text-gray-600 dark:text-gray-400">Smoking Allowed: <span className="text-gray-900 dark:text-gray-100">{flight.smokingAllowed ? 'YES' : 'NO'}</span></p>
            <p className="text-gray-600 dark:text-gray-400">Wi-Fi: <span className="text-gray-900 dark:text-gray-100">{flight.hasWifi ? 'YES' : 'NO'}</span></p>
          </div>

          {/* Operator Info */}
          <div className="col-span-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <p className="font-semibold text-gray-900 dark:text-gray-100">Operator</p>
            <p className="text-gray-600 dark:text-gray-400">Company: <span className="text-gray-900 dark:text-gray-100">{flight.operatorName}</span></p>
            <p className="text-gray-600 dark:text-gray-400">Email: <span className="text-gray-900 dark:text-gray-100">{flight.operatorEmail || 'N/A'}</span></p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-gray-600 dark:text-gray-400">Messages:</span>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-xs"
                onClick={() => onViewChat?.(flight.id)}
                aria-label="View chat"
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                View
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function FlightSearchProgress({
  currentStep,
  flightRequest,
  deepLink,
  tripId,
  isTripIdLoading = false,
  tripIdError,
  tripIdSubmitted = false,
  selectedFlights = [],
  rfqFlights = [],
  isRfqFlightsLoading = false,
  selectedRfqFlightIds = [],
  rfqsLastFetchedAt,
  customerEmail,
  customerName,
  onTripIdSubmit,
  onDeepLinkClick,
  onCopyDeepLink,
  onViewChat,
  onGenerateProposal,
  onRfqFlightSelectionChange,
  onContinueToProposal,
  onReviewAndBook,
  onBookFlight,
  bookFlightDisabled,
  bookFlightDisabledReason,
  onGeneratePreview,
  onSendProposal,
  marginPercentage,
  onGoBackFromProposal,
  renderMode = 'all',
  className,
  isTripCreated = false,
}: FlightSearchProgressProps) {
  const [copied, setCopied] = useState(false);

  // renderMode guards: which step groups to render
  const showSteps12 = renderMode === 'all' || renderMode === 'steps-1-2';
  const showSteps34 = renderMode === 'all' || renderMode === 'steps-3-4';

  // Debug: Log button label calculation
  const buttonLabel = useMemo(() => {
    const label = rfqsLastFetchedAt || rfqFlights.length > 0 ? 'Update RFQs' : 'View RFQs';
    console.log('[FlightSearchProgress] Button label calculation:', {
      rfqsLastFetchedAt,
      rfqFlightsCount: rfqFlights.length,
      calculatedLabel: label,
      tripId,
      hasOnTripIdSubmit: !!onTripIdSubmit,
    });
    return label;
  }, [rfqsLastFetchedAt, rfqFlights.length, tripId, onTripIdSubmit]);

  /**
   * Memoized no-op function for Trip ID submission fallback.
   * Prevents creating new function instances on every render,
   * which can cause React serialization issues with server actions.
   */
  const handleTripIdSubmitNoOp = useCallback(async () => {
    // No-op: do nothing if onTripIdSubmit is not provided
  }, []);

  /**
   * Memoized conversion of selected RFQ flights to AvinodeRFQFlight format.
   * Filters rfqFlights by selectedRfqFlightIds and maps via convertToAvinodeRFQFlight.
   * Only recalculates when rfqFlights or selectedRfqFlightIds change.
   */
  const selectedAvinodeFlights = useMemo<AvinodeRFQFlight[]>(() => {
    return rfqFlights
      .filter((f) => selectedRfqFlightIds.includes(f.id))
      .map(convertToAvinodeRFQFlight);
  }, [rfqFlights, selectedRfqFlightIds]);

  /**
   * Format timestamp to relative time (e.g., "2 minutes ago")
   */
  const formatLastFetchedTime = (timestamp?: string): string => {
    if (!timestamp) return '';

    const now = new Date();
    const fetchedAt = new Date(timestamp);
    const diffMs = now.getTime() - fetchedAt.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;

    return fetchedAt.toLocaleString();
  };

  /**
   * Format date string to human-readable format
   */
  const formatDate = (dateString: string): string => {
    if (!dateString || dateString === 'Invalid Date' || dateString === 'N/A') {
      return 'Date TBD';
    }
    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
        }
      }
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
      return 'Date TBD';
    } catch {
      return 'Date TBD';
    }
  };

  /**
   * Handle copy deep link to clipboard
   */
  /**
   * Validate and fix the deep link URL to ensure it points to web UI, not API
   */
  const validatedDeepLink = useMemo(() => {
    if (!deepLink) return null;
    return validateAndFixAvinodeUrl(deepLink);
  }, [deepLink]);

  const handleCopyLink = useCallback(async () => {
    if (!validatedDeepLink) {
      console.error('[FlightSearchProgress] Cannot copy link - invalid URL');
      return;
    }
    try {
      await navigator.clipboard.writeText(validatedDeepLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopyDeepLink?.();
    } catch {
      // Clipboard API may fail - fail silently
    }
  }, [validatedDeepLink, onCopyDeepLink]);

  /**
   * Handle deep link button click
   */
  const handleDeepLinkClick = useCallback(() => {
    if (validatedDeepLink) {
      window.open(validatedDeepLink, '_blank', 'noopener,noreferrer');
      onDeepLinkClick?.();
    } else {
      console.error('[FlightSearchProgress] Cannot open deep link - invalid URL:', deepLink);
    }
  }, [validatedDeepLink, onDeepLinkClick, deepLink]);

  return (
    <div data-testid="flight-search-progress" className={cn('w-full bg-white dark:bg-gray-900', className)}>
      <div className="py-6">
        {/* Step Content */}
        <div className="space-y-4">
          {/* Step 1: Trip Request Created */}
          {/* CRITICAL: Only render step cards when trip is actually created (has avinode_trip_id) */}
          {/* This prevents cards from appearing during clarification dialogue before trip creation */}
          {showSteps12 && currentStep >= 1 && isTripCreated && (
            <div
              data-testid="step-1-content"
              className="text-card-foreground flex flex-col gap-4 rounded-xl py-4 sm:py-6 px-3 sm:px-4 shadow-sm w-full min-w-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center gap-2 mb-3">
                {currentStep > 1 ? (
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 shrink-0" />
                ) : (
                  <ClipboardCheck className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                )}
                <h4 className="font-semibold text-[clamp(0.8125rem,2vw,0.875rem)] text-gray-900 dark:text-gray-100">
                  Step 1: Trip Request {currentStep > 1 ? 'Created' : 'Creating'}
                </h4>
              </div>

              {/* Flight Request Details */}
              <div className="space-y-3">
                {/* Route Visualization */}
                <div className="rounded-md bg-gray-50 dark:bg-gray-800 p-3 space-y-2">
                  {/* Trip Type Badge */}
                  <span className={cn(
                    "inline-block text-xs font-medium px-2 py-0.5 rounded-full",
                    flightRequest.tripType === 'round_trip'
                      ? "bg-primary/10 text-primary"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  )}>
                    {flightRequest.tripType === 'round_trip' ? 'Round-Trip' : 'One-Way'}
                  </span>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1 min-w-0">
                        <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-[clamp(1rem,2.5vw,1.125rem)] font-bold text-primary truncate">
                          {flightRequest.departureAirport?.icao?.toUpperCase() || 'N/A'}
                        </span>
                      </div>
                      {(() => {
                        // Get city and state from airport data or lookup from database
                        const departureIcao = flightRequest.departureAirport?.icao?.toUpperCase();
                        const airportData = departureIcao ? getAirportByIcao(departureIcao) : null;
                        const city = flightRequest.departureAirport?.city || airportData?.city || '';
                        const state = flightRequest.departureAirport?.state || airportData?.state || '';

                        if (city || state) {
                          return (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {city}{state ? `, ${state}` : ''}
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    <div className="flex items-center gap-2 px-3">
                      <div className="h-px w-6 bg-gray-300 dark:bg-gray-600" />
                      <Plane className="h-4 w-4 text-primary rotate-90" />
                      {flightRequest.tripType === 'round_trip' ? (
                        <ArrowLeftRight className="h-4 w-4 text-primary" />
                      ) : (
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div className="h-px w-6 bg-gray-300 dark:bg-gray-600" />
                    </div>

                    <div className="flex-1 text-right min-w-0">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-[clamp(1rem,2.5vw,1.125rem)] font-bold text-primary truncate">
                          {flightRequest.arrivalAirport?.icao?.toUpperCase() || 'N/A'}
                        </span>
                        <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                      </div>
                      {(() => {
                        // Get city and state from airport data or lookup from database
                        const arrivalIcao = flightRequest.arrivalAirport?.icao?.toUpperCase();
                        const airportData = arrivalIcao ? getAirportByIcao(arrivalIcao) : null;
                        const city = flightRequest.arrivalAirport?.city || airportData?.city || '';
                        const state = flightRequest.arrivalAirport?.state || airportData?.state || '';

                        if (city || state) {
                          return (
                            <p className="text-xs text-muted-foreground mt-0.5 text-right">
                              {city}{state ? `, ${state}` : ''}
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                </div>

                {/* Flight Details Grid */}
                <div className={`grid ${flightRequest.tripType === 'round_trip' && flightRequest.returnDate ? 'grid-cols-3' : 'grid-cols-2'} gap-2 text-sm`}>
                  <div className="flex items-center gap-2 rounded-md bg-gray-50 dark:bg-gray-800 p-2">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">{flightRequest.tripType === 'round_trip' ? 'Depart' : 'Date'}</p>
                      <p className="font-medium text-xs text-gray-900 dark:text-gray-100">{formatDate(flightRequest.departureDate)}</p>
                    </div>
                  </div>
                  {flightRequest.tripType === 'round_trip' && flightRequest.returnDate && (
                    <div className="flex items-center gap-2 rounded-md bg-gray-50 dark:bg-gray-800 p-2">
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Return</p>
                        <p className="font-medium text-xs text-gray-900 dark:text-gray-100">{formatDate(flightRequest.returnDate)}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 rounded-md bg-gray-50 dark:bg-gray-800 p-2">
                    <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Passengers</p>
                      <p className="font-medium text-xs text-gray-900 dark:text-gray-100">{flightRequest.passengers}</p>
                    </div>
                  </div>
                </div>

                {/* Optional Details */}
                {(flightRequest.aircraftPreferences || flightRequest.specialRequirements) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    {flightRequest.aircraftPreferences && (
                      <div className="rounded-md bg-gray-50 dark:bg-gray-800 p-2">
                        <p className="text-xs text-muted-foreground">Aircraft Preferences</p>
                        <p className="font-medium text-xs">{flightRequest.aircraftPreferences}</p>
                      </div>
                    )}
                    {flightRequest.specialRequirements && (
                      <div className="rounded-md bg-gray-50 dark:bg-gray-800 p-2">
                        <p className="text-xs text-muted-foreground">Special Requirements</p>
                        <p className="font-medium text-xs">{flightRequest.specialRequirements}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Select Flight & RFQ */}
          {/* Show Step 2 if we're at step 2 or beyond, and we have either a deepLink or tripId (indicates deep link was created) */}
          {/* CRITICAL: Only render when trip is actually created (has avinode_trip_id) */}
          {showSteps12 && currentStep >= 2 && isTripCreated && (deepLink || tripId) && (
            <div
              data-testid="step-2-content"
              className="text-card-foreground flex flex-col gap-4 rounded-xl py-6 px-4 shadow-sm w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center gap-2 mb-3">
                {currentStep > 2 ? (
                  <CheckCircle2 className="h-5 w-5 text-gray-500" />
                ) : (
                  <ExternalLink className="h-5 w-5 text-primary" />
                )}
                <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                  Step 2: {currentStep > 2 ? 'Flight & RFQ Selected' : 'Select Flight & RFQ'}
                </h4>
              </div>

              {/* Instructions for searching flights */}
              <div className="mb-4 p-3 rounded-md bg-gray-50 dark:bg-gray-800 text-sm">
                <p className="font-medium mb-2 text-gray-900 dark:text-gray-100">How to search and select flights:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Click the button below to open Avinode Marketplace</li>
                  <li>Enter the airport codes: <span className="font-semibold text-foreground">{flightRequest.departureAirport?.icao?.toUpperCase() || ''}</span> (departure) and <span className="font-semibold text-foreground">{flightRequest.arrivalAirport?.icao?.toUpperCase() || ''}</span> (arrival)</li>
                  <li>Browse available aircraft and operators</li>
                  <li>Select your preferred options and submit your RFQ</li>
                </ol>
              </div>

              {/* Deep Link Actions - Reduced button width */}
              {/* Always show buttons when Step 2 is displayed - deepLink should be available from create trip API */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={handleDeepLinkClick}
                  disabled={!deepLink}
                  className="sm:w-auto"
                  style={{
                    backgroundClip: 'unset',
                    WebkitBackgroundClip: 'unset',
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Avinode Marketplace
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCopyLink}
                  disabled={!deepLink}
                  className="sm:w-auto text-gray-900 dark:text-gray-100"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy URL
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Enter Trip ID & View RFQ Flights */}
          {/* FIXED: Added explicit display and width to prevent layout cutoff when RFQs load */}
          {/* CRITICAL: Only render when trip is actually created (has avinode_trip_id) */}
          {showSteps34 && currentStep >= 3 && isTripCreated && (
            <div
              data-testid="step-3-content"
              className="text-card-foreground flex flex-col gap-4 rounded-xl py-6 shadow-sm w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 mb-6"
              style={{ 
                minHeight: 'auto',
                height: 'auto',
                overflow: 'visible',
                display: 'block',
                width: '100%',
                position: 'relative'
              }}
            >
              {/* Fixed header section - not scrollable */}
              <div className="p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                {/* Header Section - Improved spacing */}
                <div className="flex items-center gap-2 mb-6">
                  {tripIdSubmitted ? (
                    <CheckCircle2 className="h-5 w-5 text-gray-500" />
                  ) : (
                    <Search className="h-5 w-5 text-primary" />
                  )}
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                    Step 3: View RFQ Flights
                  </h4>
                </div>

                {/* Trip ID not available yet */}
                {!tripId && (
                  <div className="mb-6 p-4 rounded-md bg-amber-50 dark:bg-amber-950/30">
                    <p className="text-sm font-medium mb-2">Waiting for Trip ID</p>
                    <p className="text-xs text-muted-foreground">
                      Your trip is being created. The Trip ID will appear here once ready.
                    </p>
                  </div>
                )}

                {/* View/Update RFQs button - Always visible when Trip ID is available */}
                {/* Button label changes conditionally: "View RFQs" first time, "Update RFQs" after RFQs are loaded */}
                {tripId && (
                  <div className="mb-6">
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={() => {
                          // Log button click for debugging
                          console.log('[FlightSearchProgress] Button clicked:', {
                            tripId,
                            hasOnTripIdSubmit: !!onTripIdSubmit,
                            isTripIdLoading,
                            rfqsLastFetchedAt,
                            rfqFlightsCount: rfqFlights.length,
                            buttonLabel,
                          })
                          
                          // Call handler if provided, otherwise log warning
                          if (onTripIdSubmit) {
                            onTripIdSubmit(tripId).catch((error) => {
                              console.error('[FlightSearchProgress] Error in onTripIdSubmit:', error)
                            })
                          } else {
                            console.warn('[FlightSearchProgress] onTripIdSubmit is not provided - button click ignored')
                          }
                        }}
                        disabled={isTripIdLoading || !onTripIdSubmit}
                        className="flex items-center gap-2"
                        aria-label={rfqsLastFetchedAt || rfqFlights.length > 0 ? 'Update RFQs' : 'View RFQs'}
                      >
                        {isTripIdLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading RFQs...
                          </>
                        ) : (
                          <>
                            <Search className="h-4 w-4" />
                            {/* Conditional label: "View RFQs" first time, "Update RFQs" after RFQs are loaded */}
                            {rfqsLastFetchedAt || rfqFlights.length > 0 ? 'Update RFQs' : 'View RFQs'}
                          </>
                        )}
                      </Button>
                      {rfqsLastFetchedAt && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Last updated {formatLastFetchedTime(rfqsLastFetchedAt)}
                        </span>
                      )}
                    </div>
                    {tripIdError && (
                      <p className="mt-3 text-xs text-red-600 dark:text-red-400">
                        {tripIdError}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Content area - RFQ Flights List with proper background protection */}
              {/* 
                FIXED: Added background to prevent collapse when RFQs load.
                Removed fixed min-height to allow full expansion and prevent cut-off.
                Without proper background, the container can collapse to 0 height, showing black background.
                Added explicit height auto and overflow visible to ensure content expands naturally and isn't clipped during scroll.
              */}
              <div 
                className="bg-white dark:bg-gray-900" 
                style={{ 
                  height: 'auto', 
                  minHeight: 'auto',
                  overflow: 'visible',
                  display: 'block',
                  width: '100%'
                }}
              >
                <div 
                  className="p-6 pt-4" 
                  style={{ 
                    height: 'auto', 
                    minHeight: '100%',
                    overflow: 'visible',
                    display: 'block'
                  }}
                >
                  {/* Show loading state when fetching RFQs and no flights yet */}
                  {isRfqFlightsLoading && !rfqFlights.length && !tripIdSubmitted && (
                    <div className="flex flex-col items-center justify-center py-12" style={{ minHeight: '200px' }}>
                      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                      <p className="text-sm text-muted-foreground">Loading available flights...</p>
                    </div>
                  )}

                  {/* Show RFQ Flights List when Trip ID is submitted OR we have flights to display */}
                  {/* FIXED: Always render if we have flights OR if trip ID is submitted (even during loading) */}
                  {(tripIdSubmitted || rfqFlights.length > 0 || isRfqFlightsLoading) && (
                    <div 
                      className="space-y-6" 
                      style={{ 
                        height: 'auto', 
                        minHeight: 'auto',
                        overflow: 'visible',
                        display: 'block'
                      }}
                    >
                      {/* Success message - Only show when Trip ID is submitted */}
                      {tripIdSubmitted && (
                        <div className="flex items-start gap-3 p-4 rounded-md bg-green-50 dark:bg-green-950/30">
                          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-green-700 dark:text-green-300 text-sm mb-2">
                              Trip ID verified successfully!
                            </p>
                            {rfqFlights.length > 0 ? (
                              <p className="text-xs text-green-600 dark:text-green-400 leading-relaxed">
                                {rfqFlights.length} flight{rfqFlights.length !== 1 ? 's' : ''} available. Select the flights you want to include in your proposal, then click "Create Proposal" to generate and send the PDF to your customer.
                              </p>
                            ) : (
                              <p className="text-xs text-green-600 dark:text-green-400 leading-relaxed">
                                No RFQs have been submitted yet. Please check back later or try refreshing.
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Show info message when quotes are available but Trip ID not submitted */}
                      {!tripIdSubmitted && rfqFlights.length > 0 && (
                        <div className="flex items-start gap-3 p-4 rounded-md bg-blue-50 dark:bg-blue-950/30">
                          <CheckCircle2 className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-blue-700 dark:text-blue-300 text-sm mb-2">
                              Quotes Received
                            </p>
                            <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
                              {rfqFlights.length} flight{rfqFlights.length !== 1 ? 's' : ''} available. Review the options below and select flights for your proposal.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* RFQ Flights List - Render when Trip ID is submitted OR when we have flights to display */}
                      {/* Always render the list if we have flights, even if loading more */}
                      {/* FIXED: Ensure list always renders when conditions are met, even during loading state */}
                      {rfqFlights.length > 0 || tripIdSubmitted ? (
                        <RFQFlightsList
                          key={`rfq-flights-${rfqsLastFetchedAt || 'initial'}-${rfqFlights.length}`}
                          flights={(rfqFlights || [])
                            .filter(f => f != null && f.id != null) // Filter out null/undefined flights
                            .map(f => ({
                              ...f,
                              isSelected: selectedRfqFlightIds.includes(f.id)
                            }))}
                          isLoading={isRfqFlightsLoading}
                          selectable={!onReviewAndBook}
                          showSelectAll={!onReviewAndBook}
                          sortable
                          showContinueButton={!onReviewAndBook}
                          showPriceBreakdown
                          showBookButton={!!onReviewAndBook}
                          onSelectionChange={onRfqFlightSelectionChange}
                          onContinue={onContinueToProposal}
                          onReviewAndBook={onReviewAndBook}
                          onGenerateProposal={onGenerateProposal}
                          onBookFlight={onBookFlight}
                          bookFlightDisabled={bookFlightDisabled}
                          bookFlightDisabledReason={bookFlightDisabledReason}
                          groupByLeg={rfqFlights.some(f => f.legType != null)}
                        />
                      ) : (
                        /* Show loading state inside the content area if we're loading but have no flights yet */
                        isRfqFlightsLoading && (
                          <div className="flex flex-col items-center justify-center py-12" style={{ minHeight: '200px' }}>
                            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                            <p className="text-sm text-muted-foreground">Loading available flights...</p>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {/* Show empty state when no RFQs and not loading */}
                  {!isRfqFlightsLoading && !tripIdSubmitted && rfqFlights.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Plane className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                      <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">No RFQs available yet</h3>
                      <p className="text-sm text-muted-foreground max-w-md">
                        Follow the instructions in Step 2 to search for flights and send RFQs to operators via the Avinode marketplace.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Send Proposal to Customer */}
          {showSteps34 && currentStep >= 4 && selectedRfqFlightIds.length > 0 && (
            <div
              data-testid="step-4-content"
              className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 p-4"
            >
              {/* SendProposalStep component - handles PDF generation and email sending */}
              <SendProposalStep
                selectedFlights={selectedAvinodeFlights}
                tripDetails={{
                  departureAirport: flightRequest.departureAirport,
                  arrivalAirport: flightRequest.arrivalAirport,
                  departureDate: flightRequest.departureDate,
                  passengers: flightRequest.passengers,
                  tripId: tripId,
                }}
                marginPercentage={marginPercentage}
                customerEmail={customerEmail}
                customerName={customerName}
                onGeneratePreview={onGeneratePreview}
                onSendProposal={onSendProposal}
                onGoBack={onGoBackFromProposal}
              />

              {/* Legacy: Selected Flights List - kept for backward compatibility */}
              {selectedFlights.length > 0 && (
                <div className="space-y-4 mt-4">
                  <h5 className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                    Selected Flights - Quote Requests Sent to Operators
                  </h5>
                  <div className="space-y-3">
                    {selectedFlights.map((flight) => (
                      <FlightCard
                        key={flight.id}
                        flight={flight}
                        onViewChat={onViewChat}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FlightSearchProgress;
