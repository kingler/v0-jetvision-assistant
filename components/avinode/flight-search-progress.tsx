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

import React, { useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  Clock,
  Loader2,
  Plane,
  MessageSquare,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RFQFlightsList } from './rfq-flights-list';
import { SendProposalStep } from './send-proposal-step';
import { TripRequestCard } from './trip-request-card';
import { AvinodeSearchCard } from './avinode-search-card';
import { convertToAvinodeRFQFlight } from './utils';
import type { RFQFlight } from './rfq-flight-card';
import type { RFQFlight as AvinodeRFQFlight } from '@/lib/mcp/clients/avinode-client';

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
  tripType?: 'one_way' | 'round_trip' | 'multi_city';
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
  /**
   * Display mode:
   * - 'full': Full 4-step workflow (default)
   * - 'compact': Compact summary showing trip details + deep link only
   *   (replaces the former TripCreatedUI composite)
   */
  displayMode?: 'full' | 'compact';
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
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <div className="flex flex-col sm:flex-row">
        {/* Aircraft Image Placeholder */}
        <div className="w-full sm:w-32 h-32 sm:h-40 bg-surface-tertiary flex items-center justify-center shrink-0">
          {flight.imageUrl ? (
            <img src={flight.imageUrl} alt={flight.aircraftType} className="w-full h-full object-cover" />
          ) : (
            <Plane className="h-12 w-12 text-text-placeholder" />
          )}
        </div>

        {/* Flight Details */}
        <div className="flex-1 p-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 sm:gap-y-1 text-sm min-w-0">
          {/* Aircraft Info */}
          <div>
            <p className="font-semibold text-foreground">Aircraft</p>
            <p className="text-muted-foreground">Category: <span className="text-foreground">{flight.aircraftCategory || 'Heavy jet'}</span></p>
            <p className="text-muted-foreground">Year of Make: <span className="text-foreground">{flight.yearOfMake || 'N/A'}</span></p>
          </div>

          {/* Price Info */}
          <div>
            <p className="font-semibold text-foreground">Price</p>
            <p className="text-foreground break-words">${flight.price.toLocaleString()} {flight.currency || 'USD'}</p>
            <p className="text-muted-foreground">RFQ Status: <span className={cn(
              flight.rfqStatus === 'quoted' && 'text-success',
              flight.rfqStatus === 'unanswered' && 'text-warning',
              flight.rfqStatus === 'declined' && 'text-destructive',
              !flight.rfqStatus && 'text-foreground'
            )}>{flight.rfqStatus || 'Unanswered'}</span></p>
          </div>

          {/* Transport Info */}
          <div>
            <p className="font-semibold text-foreground">Transport</p>
            <p className="text-muted-foreground">Passenger Capacity: <span className="text-foreground">{flight.passengerCapacity || 'N/A'}</span></p>
            <p className="text-muted-foreground">Medical: <span className="text-foreground">{flight.hasMedical ? 'YES' : 'NO'}</span></p>
            <p className="text-muted-foreground">Package: <span className="text-foreground">{flight.hasPackage ? 'YES' : 'NO'}</span></p>
          </div>

          {/* Amenities */}
          <div>
            <p className="font-semibold text-foreground">Amenities</p>
            <p className="text-muted-foreground">Pets Allowed: <span className="text-foreground">{flight.petsAllowed ? 'YES' : 'NO'}</span></p>
            <p className="text-muted-foreground">Smoking Allowed: <span className="text-foreground">{flight.smokingAllowed ? 'YES' : 'NO'}</span></p>
            <p className="text-muted-foreground">Wi-Fi: <span className="text-foreground">{flight.hasWifi ? 'YES' : 'NO'}</span></p>
          </div>

          {/* Operator Info */}
          <div className="col-span-full mt-2 pt-2 border-t border-border">
            <p className="font-semibold text-foreground">Operator</p>
            <p className="text-muted-foreground">Company: <span className="text-foreground break-words">{flight.operatorName}</span></p>
            <p className="text-muted-foreground">Email: <span className="text-foreground break-all">{flight.operatorEmail || 'N/A'}</span></p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-muted-foreground">Messages:</span>
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
  displayMode = 'full',
  className,
  isTripCreated = false,
}: FlightSearchProgressProps) {
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

  // ── Compact display mode: trip summary + deep link only ──
  if (displayMode === 'compact') {
    return (
      <div data-testid="flight-search-progress" className={cn('w-full space-y-3', className)}>
        <TripRequestCard
          flightRequest={flightRequest}
          isCompleted={false}
        />
        {deepLink && (
          <AvinodeSearchCard
            deepLink={deepLink}
            departureIcao={flightRequest.departureAirport?.icao}
            arrivalIcao={flightRequest.arrivalAirport?.icao}
            isCompleted={false}
            onDeepLinkClick={onDeepLinkClick}
            onCopyDeepLink={onCopyDeepLink}
          />
        )}
      </div>
    );
  }

  return (
    <div data-testid="flight-search-progress" className={cn('w-full', className)}>
      <div className="py-6">
        {/* Step Content */}
        <div className="space-y-4">
          {/* Step 1: Trip Request Created */}
          {/* CRITICAL: Only render step cards when trip is actually created (has avinode_trip_id) */}
          {/* This prevents cards from appearing during clarification dialogue before trip creation */}
          {showSteps12 && currentStep >= 1 && isTripCreated && (
            <TripRequestCard
              flightRequest={flightRequest}
              isCompleted={currentStep > 1}
            />
          )}

          {/* Step 2: Select Flight & RFQ */}
          {/* Show Step 2 if we're at step 2 or beyond, and we have either a deepLink or tripId (indicates deep link was created) */}
          {/* CRITICAL: Only render when trip is actually created (has avinode_trip_id) */}
          {showSteps12 && currentStep >= 2 && isTripCreated && (deepLink || tripId) && (
            <AvinodeSearchCard
              deepLink={deepLink || ''}
              departureIcao={flightRequest.departureAirport?.icao}
              arrivalIcao={flightRequest.arrivalAirport?.icao}
              isCompleted={currentStep > 2}
              onDeepLinkClick={onDeepLinkClick}
              onCopyDeepLink={onCopyDeepLink}
            />
          )}

          {/* Step 3: Enter Trip ID & View RFQ Flights */}
          {/* FIXED: Added explicit display and width to prevent layout cutoff when RFQs load */}
          {/* CRITICAL: Only render when trip is actually created (has avinode_trip_id) */}
          {showSteps34 && currentStep >= 3 && isTripCreated && (
            <div
              data-testid="step-3-content"
              className="text-card-foreground flex flex-col gap-4 rounded-xl py-6 shadow-sm w-full bg-card border border-border mb-6"
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
              <div className="p-6 pb-4 border-b border-border">
                {/* Header Section - Improved spacing */}
                <div className="flex items-center gap-2 mb-6">
                  {tripIdSubmitted ? (
                    <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Search className="h-5 w-5 text-primary" />
                  )}
                  <h4 className="font-semibold text-sm text-foreground">
                    Step 3: View RFQ Flights
                  </h4>
                </div>

                {/* Trip ID not available yet */}
                {!tripId && (
                  <div className="mb-6 p-4 rounded-md bg-warning-bg">
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
                      <p className="mt-3 text-xs text-destructive">
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
                className="bg-card"
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
                        <div className="flex items-start gap-3 p-4 rounded-md bg-success-bg">
                          <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-success text-sm mb-2">
                              Trip ID verified successfully!
                            </p>
                            {rfqFlights.length > 0 ? (
                              <p className="text-xs text-success leading-relaxed">
                                {rfqFlights.length} flight{rfqFlights.length !== 1 ? 's' : ''} available. Select the flights you want to include in your proposal, then click "Create Proposal" to generate and send the PDF to your customer.
                              </p>
                            ) : (
                              <p className="text-xs text-success leading-relaxed">
                                No RFQs have been submitted yet. Please check back later or try refreshing.
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Show info message when quotes are available but Trip ID not submitted */}
                      {!tripIdSubmitted && rfqFlights.length > 0 && (
                        <div className="flex items-start gap-3 p-4 rounded-md bg-info-bg">
                          <CheckCircle2 className="h-5 w-5 text-info shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-info text-sm mb-2">
                              Quotes Received
                            </p>
                            <p className="text-xs text-info leading-relaxed">
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
                          onViewChat={onViewChat}
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
                      <Plane className="h-12 w-12 text-text-placeholder mb-4" />
                      <h3 className="text-lg font-semibold mb-2 text-foreground">No RFQs available yet</h3>
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
              className="rounded-lg border border-info-border bg-info-bg p-4"
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
                  <h5 className="font-semibold text-sm text-foreground">
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
