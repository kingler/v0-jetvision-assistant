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
import { Card, CardContent } from '@/components/ui/card';
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
  ClipboardCheck,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TripIDInput } from './trip-id-input';
import { RFQFlightsList } from './rfq-flights-list';
import { SendProposalStep } from './send-proposal-step';
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
  };
  arrivalAirport: {
    icao: string;
    name?: string;
    city?: string;
  };
  departureDate: string;
  passengers: number;
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
  /** Selected flights sent to operators (legacy) */
  selectedFlights?: SelectedFlight[];
  /** RFQ flights retrieved from Avinode (new Step 3) */
  rfqFlights?: RFQFlight[];
  /** Whether RFQ flights are loading */
  isRfqFlightsLoading?: boolean;
  /** Selected flight IDs for proposal */
  selectedRfqFlightIds?: string[];
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
  onViewChat?: (flightId: string) => void;
  /** Callback when RFQ flight selection changes */
  onRfqFlightSelectionChange?: (selectedIds: string[]) => void;
  /** Callback when user clicks continue to proposal */
  onContinueToProposal?: (selectedFlights: RFQFlight[]) => void;
  /** Callback when user clicks "Review and Book" button on a flight card */
  onReviewAndBook?: (flightId: string) => void;
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
  /** Callback when user goes back from Step 4 */
  onGoBackFromProposal?: () => void;
  /** Additional CSS class */
  className?: string;
}

// =============================================================================
// STEP LABELS
// =============================================================================

const STEP_LABELS = [
  'Request',
  'Select Flight & RFQ',
  'Retrieve Flight Details',
  'Send Proposal',
] as const;

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

interface StepIndicatorProps {
  stepNumber: number;
  title: string;
  status: 'completed' | 'active' | 'pending';
  isLast?: boolean;
  hideWhenComplete?: boolean;
}

function StepIndicator({ stepNumber, title, status, isLast, hideWhenComplete }: StepIndicatorProps) {
  // Hide the stepper entirely when workflow is complete
  if (hideWhenComplete && status === 'completed') {
    return null;
  }

  return (
    <div className="flex items-center">
      {/* Step Circle */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all',
            // Use gray for completed (per design), blue for active, light gray for pending
            status === 'completed' && 'bg-gray-400 text-white dark:bg-gray-500',
            status === 'active' && 'bg-blue-500 text-white animate-pulse',
            status === 'pending' && 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
          )}
        >
          {status === 'completed' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : status === 'active' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            stepNumber
          )}
        </div>
        <span
          className={cn(
            'mt-1 text-xs font-medium whitespace-nowrap text-center max-w-[80px]',
            // Gray text for all states per design
            status === 'completed' && 'text-gray-500 dark:text-gray-400',
            status === 'active' && 'text-blue-600 dark:text-blue-400',
            status === 'pending' && 'text-gray-400 dark:text-gray-500'
          )}
        >
          {title}
        </span>
      </div>
      {/* Connector Line */}
      {!isLast && (
        <div
          className={cn(
            'mx-2 h-0.5 w-6 sm:w-10 transition-all',
            // Gray connector lines
            status === 'completed' ? 'bg-gray-400 dark:bg-gray-500' : 'bg-gray-200 dark:bg-gray-700'
          )}
        />
      )}
    </div>
  );
}

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
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                View Chat
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
  customerEmail,
  customerName,
  onTripIdSubmit,
  onDeepLinkClick,
  onCopyDeepLink,
  onViewChat,
  onRfqFlightSelectionChange,
  onContinueToProposal,
  onReviewAndBook,
  onGeneratePreview,
  onSendProposal,
  onGoBackFromProposal,
  className,
}: FlightSearchProgressProps) {
  const [copied, setCopied] = useState(false);

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

  // Determine if we should hide the stepper (when TripID is entered and flights are shown)
  const hideStepperWhenComplete = tripIdSubmitted && selectedFlights.length > 0;

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
   * Get step status based on current progress
   */
  const getStepStatus = (step: number): 'completed' | 'active' | 'pending' => {
    if (step < currentStep) return 'completed';
    if (step === currentStep) return 'active';
    return 'pending';
  };

  /**
   * Handle copy deep link to clipboard
   */
  const handleCopyLink = useCallback(async () => {
    if (!deepLink) return;
    try {
      await navigator.clipboard.writeText(deepLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopyDeepLink?.();
    } catch {
      // Clipboard API may fail - fail silently
    }
  }, [deepLink, onCopyDeepLink]);

  /**
   * Handle deep link button click
   */
  const handleDeepLinkClick = useCallback(() => {
    if (deepLink) {
      window.open(deepLink, '_blank', 'noopener,noreferrer');
      onDeepLinkClick?.();
    }
  }, [deepLink, onDeepLinkClick]);

  return (
    <Card data-testid="flight-search-progress" className={cn('w-full bg-white dark:bg-gray-900 border-0 shadow-none', className)}>
      <CardContent className="py-6">
        {/* Step Progress Indicator - Hidden when complete with flights shown */}
        {!hideStepperWhenComplete && (
          <div className="flex items-start justify-center mb-6 overflow-x-auto pb-2">
            <StepIndicator
              stepNumber={1}
              title={STEP_LABELS[0]}
              status={getStepStatus(1)}
            />
            <StepIndicator
              stepNumber={2}
              title={STEP_LABELS[1]}
              status={getStepStatus(2)}
            />
            <StepIndicator
              stepNumber={3}
              title={STEP_LABELS[2]}
              status={getStepStatus(3)}
            />
            <StepIndicator
              stepNumber={4}
              title={STEP_LABELS[3]}
              status={getStepStatus(4)}
              isLast
            />
          </div>
        )}

        {/* Step Content */}
        <div className="space-y-4">
          {/* Step 1: Trip Request Created */}
          {currentStep >= 1 && (
            <div
              data-testid="step-1-content"
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                {currentStep > 1 ? (
                  <CheckCircle2 className="h-5 w-5 text-gray-500" />
                ) : (
                  <ClipboardCheck className="h-5 w-5 text-blue-500" />
                )}
                <h4 className="font-semibold text-sm">
                  Step 1: Trip Request {currentStep > 1 ? 'Created' : 'Creating'}
                </h4>
              </div>

              {/* Flight Request Details */}
              <div className="space-y-3">
                {/* Route Visualization */}
                <div className="flex items-center justify-between gap-2 rounded-md bg-gray-50 dark:bg-gray-800 p-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-lg font-bold text-primary">
                        {flightRequest.departureAirport.icao}
                      </span>
                    </div>
                    {flightRequest.departureAirport.name && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {flightRequest.departureAirport.name}
                      </p>
                    )}
                    {flightRequest.departureAirport.city && (
                      <p className="text-xs text-muted-foreground">
                        {flightRequest.departureAirport.city}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 px-3">
                    <div className="h-px w-6 bg-gray-300 dark:bg-gray-600" />
                    <Plane className="h-4 w-4 text-primary rotate-90" />
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className="h-px w-6 bg-gray-300 dark:bg-gray-600" />
                  </div>

                  <div className="flex-1 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-lg font-bold text-primary">
                        {flightRequest.arrivalAirport.icao}
                      </span>
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                    </div>
                    {flightRequest.arrivalAirport.name && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {flightRequest.arrivalAirport.name}
                      </p>
                    )}
                    {flightRequest.arrivalAirport.city && (
                      <p className="text-xs text-muted-foreground">
                        {flightRequest.arrivalAirport.city}
                      </p>
                    )}
                  </div>
                </div>

                {/* Flight Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                  <div className="flex items-center gap-2 rounded-md bg-gray-50 dark:bg-gray-800 p-2">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="font-medium text-xs">{formatDate(flightRequest.departureDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-md bg-gray-50 dark:bg-gray-800 p-2">
                    <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Passengers</p>
                      <p className="font-medium text-xs">{flightRequest.passengers}</p>
                    </div>
                  </div>
                  {flightRequest.requestId && (
                    <div className="flex items-center gap-2 rounded-md bg-gray-50 dark:bg-gray-800 p-2 col-span-2 sm:col-span-1">
                      <span className="text-muted-foreground font-bold text-xs">#</span>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Request ID</p>
                        <p className="font-medium text-xs font-mono truncate">
                          {flightRequest.requestId}
                        </p>
                      </div>
                    </div>
                  )}
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
          {currentStep >= 2 && deepLink && (
            <div
              data-testid="step-2-content"
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                {currentStep > 2 ? (
                  <CheckCircle2 className="h-5 w-5 text-gray-500" />
                ) : (
                  <ExternalLink className="h-5 w-5 text-blue-500" />
                )}
                <h4 className="font-semibold text-sm">
                  Step 2: {currentStep > 2 ? 'Flight & RFQ Selected' : 'Select Flight & RFQ'}
                </h4>
              </div>

              {/* Instructions for searching flights */}
              <div className="mb-4 p-3 rounded-md bg-gray-50 dark:bg-gray-800 text-sm">
                <p className="font-medium mb-2">How to search and select flights:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Click the button below to open Avinode Marketplace</li>
                  <li>Enter the airport codes: <span className="font-semibold text-foreground">{flightRequest.departureAirport.icao}</span> (departure) and <span className="font-semibold text-foreground">{flightRequest.arrivalAirport.icao}</span> (arrival)</li>
                  <li>Browse available aircraft and operators</li>
                  <li>Select your preferred options and submit your RFQ</li>
                </ol>
              </div>

              {/* Deep Link Actions - Reduced button width */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={handleDeepLinkClick}
                  className="sm:w-auto bg-blue-600 hover:bg-blue-700"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Avinode Marketplace
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCopyLink}
                  className="sm:w-auto"
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
          {currentStep >= 3 && (
            <div
              data-testid="step-3-content"
              className={cn(
                "border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-4",
                !tripIdSubmitted && "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30"
              )}
            >
              <div className="flex items-center gap-2 mb-3 px-0">
                {tripIdSubmitted && rfqFlights.length > 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Clock className="h-5 w-5 text-amber-500" />
                )}
                <h4 className="font-semibold text-sm">
                  Step 3: {tripIdSubmitted ? 'View RFQ Flights' : 'Enter Trip ID & View RFQ Flights'}
                </h4>
                {tripIdSubmitted && tripId && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-800 rounded">
                    Trip ID: {tripId}
                  </span>
                )}
              </div>

              {/* Before Trip ID submission - Show instructions and input */}
              {!tripIdSubmitted && (
                <>
                  {/* Instructions */}
                  <div className="mb-4 p-3 rounded-md bg-white dark:bg-gray-900">
                    <p className="text-sm font-medium mb-2">Complete these steps in Avinode:</p>
                    <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground">
                      <li>Search for available flights using the details above</li>
                      <li>Select your preferred aircraft and operator</li>
                      <li>Submit your RFQ (Request for Quote) to operators</li>
                      <li>Once complete, copy the <span className="font-semibold text-foreground">Trip ID</span> from Avinode</li>
                      <li>Return here and enter the Trip ID below</li>
                    </ol>
                  </div>

                  {/* Trip ID Input */}
                  <TripIDInput
                    onSubmit={onTripIdSubmit || handleTripIdSubmitNoOp}
                    isLoading={isTripIdLoading}
                    error={tripIdError}
                    helpText="Find the Trip ID in your Avinode confirmation email or on the trip details page."
                  />
                </>
              )}

              {/* After Trip ID submission - Show RFQ Flights List */}
              {tripIdSubmitted && (
                <div className="mt-4">
                  {/* Success message */}
                  <div className="flex items-center gap-3 p-3 rounded-md bg-green-50 dark:bg-green-950/30 mb-4">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-green-700 dark:text-green-300 text-sm">
                        Trip ID verified successfully!
                      </p>
                      {rfqFlights.length > 0 ? (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          {rfqFlights.length} flight{rfqFlights.length !== 1 ? 's' : ''} available. Select the flights you want to include in your proposal, then click "Create Proposal" to generate and send the PDF to your customer.
                        </p>
                      ) : (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          {isRfqFlightsLoading 
                            ? 'Loading flight quotes...' 
                            : 'Waiting for quotes from operators. They will appear here once received.'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* RFQ Flights List */}
                  {rfqFlights.length > 0 ? (
                    <RFQFlightsList
                      flights={rfqFlights.map(f => ({
                        ...f,
                        isSelected: selectedRfqFlightIds.includes(f.id)
                      }))}
                      isLoading={isRfqFlightsLoading}
                      selectable={!onReviewAndBook}
                      showSelectAll={!onReviewAndBook}
                      sortable
                      filterable
                      showContinueButton={!onReviewAndBook}
                      showPriceBreakdown
                      showBookButton={!!onReviewAndBook}
                      onSelectionChange={onRfqFlightSelectionChange}
                      onContinue={onContinueToProposal}
                      onReviewAndBook={onReviewAndBook}
                      onViewChat={onViewChat}
                    />
                  ) : (
                    <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                      {isRfqFlightsLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Loading flight quotes...</span>
                        </div>
                      ) : (
                        <div>
                          <p className="mb-2">No RFQ flights have been received yet.</p>
                          <p className="text-xs">Quotes from operators will appear here once they respond to your RFQ.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Send Proposal to Customer */}
          {currentStep >= 4 && selectedRfqFlightIds.length > 0 && (
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
      </CardContent>
    </Card>
  );
}

export default FlightSearchProgress;
