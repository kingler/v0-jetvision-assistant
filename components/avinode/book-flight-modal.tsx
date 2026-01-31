'use client';

/**
 * Book Flight Modal Component
 *
 * Modal dialog for initiating the contract generation workflow.
 * Displays flight details, pricing, and allows sending contracts to customers.
 *
 * @see app/api/contract/generate/route.ts
 * @see app/api/contract/send/route.ts
 * @see lib/pdf/contract-generator.ts
 */

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  Plane,
  Calendar,
  Users,
  DollarSign,
  Mail,
  FileText,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RFQFlight } from '@/lib/mcp/clients/avinode-client';
import type {
  ContractCustomer,
  ContractFlightDetails,
  ContractPricing,
  ContractAmenities,
} from '@/lib/types/contract';

// =============================================================================
// TYPES
// =============================================================================

export interface TripDetails {
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
  departureTime?: string;
  passengers: number;
  tripId?: string;
}

export interface BookFlightModalProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** The flight being booked */
  flight: RFQFlight;
  /** Customer information */
  customer: {
    name: string;
    email: string;
    company?: string;
    phone?: string;
  };
  /** Trip details */
  tripDetails: TripDetails;
  /** Request ID for database linking */
  requestId: string;
  /** Callback when contract is successfully sent */
  onContractSent?: (contractId: string, contractNumber: string) => void;
}

type ModalState = 'ready' | 'generating' | 'preview' | 'sending' | 'success' | 'error';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format currency amount
 */
function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Calculate contract pricing from flight data
 */
function calculatePricing(flight: RFQFlight, passengers: number): ContractPricing {
  const flightCost = flight.priceBreakdown?.basePrice ?? flight.totalPrice;
  const FET_RATE = 0.075; // 7.5%
  const SEGMENT_FEE = 5.20; // Per passenger per segment
  const CC_FEE_PCT = 5.0;

  const federalExciseTax = flightCost * FET_RATE;
  const domesticSegmentFee = SEGMENT_FEE * passengers;
  const subtotal = flightCost + federalExciseTax + domesticSegmentFee;

  return {
    flightCost,
    federalExciseTax,
    domesticSegmentFee,
    subtotal,
    creditCardFeePercentage: CC_FEE_PCT,
    totalAmount: subtotal,
    currency: flight.currency || 'USD',
  };
}

/**
 * Build contract flight details from flight and trip data
 */
function buildFlightDetails(
  flight: RFQFlight,
  tripDetails: TripDetails
): ContractFlightDetails {
  return {
    departureAirport: {
      icao: flight.departureAirport.icao,
      name: flight.departureAirport.name,
      city: flight.departureAirport.city,
    },
    arrivalAirport: {
      icao: flight.arrivalAirport.icao,
      name: flight.arrivalAirport.name,
      city: flight.arrivalAirport.city,
    },
    departureDate: flight.departureDate || tripDetails.departureDate,
    departureTime: flight.departureTime || tripDetails.departureTime,
    aircraftType: flight.aircraftType,
    aircraftModel: flight.aircraftModel,
    tailNumber: flight.tailNumber,
    passengers: tripDetails.passengers,
    flightDuration: flight.flightDuration,
  };
}

/**
 * Build contract amenities from flight data
 */
function buildAmenities(flight: RFQFlight): ContractAmenities {
  return {
    wifi: flight.amenities?.wifi ?? false,
    pets: flight.amenities?.pets ?? false,
    smoking: flight.amenities?.smoking ?? false,
    galley: flight.amenities?.galley ?? false,
    lavatory: flight.amenities?.lavatory ?? false,
    airConditioning: true,
  };
}

// =============================================================================
// COMPONENT
// =============================================================================

export function BookFlightModal({
  open,
  onClose,
  flight,
  customer,
  tripDetails,
  requestId,
  onContractSent,
}: BookFlightModalProps) {
  // State
  const [state, setState] = useState<ModalState>('ready');
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [contractId, setContractId] = useState<string | null>(null);
  const [contractNumber, setContractNumber] = useState<string | null>(null);

  // Calculate pricing
  const pricing = calculatePricing(flight, tripDetails.passengers);
  const flightDetails = buildFlightDetails(flight, tripDetails);
  const amenities = buildAmenities(flight);

  /** Customer must have name and email for contract generation/send (avoids API "Customer name is required" error) */
  const hasValidCustomer = !!(customer.name?.trim() && customer.email?.trim());

  /**
   * Handle preview contract
   */
  const handlePreviewContract = useCallback(async () => {
    setState('generating');
    setError(null);

    try {
      const response = await fetch('/api/contract/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          quoteId: flight.quoteId,
          referenceQuoteNumber: flight.quoteId,
          customer,
          flightDetails,
          pricing,
          amenities,
          saveDraft: false,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate contract');
      }

      const data = await response.json();

      // Create blob URL for preview
      const pdfBlob = new Blob(
        [Uint8Array.from(atob(data.pdfBase64), (c) => c.charCodeAt(0))],
        { type: 'application/pdf' }
      );
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      setState('preview');
    } catch (err) {
      console.error('[BookFlightModal] Error generating contract:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate contract');
      setState('error');
    }
  }, [requestId, flight, customer, flightDetails, pricing, amenities]);

  /**
   * Handle send contract
   */
  const handleSendContract = useCallback(async () => {
    setState('sending');
    setError(null);

    try {
      const response = await fetch('/api/contract/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          quoteId: flight.quoteId,
          referenceQuoteNumber: flight.quoteId,
          tripId: tripDetails.tripId,
          customer,
          flightDetails,
          pricing,
          amenities,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send contract');
      }

      const data = await response.json();

      if (!data.emailSent) {
        throw new Error(data.error || 'Email could not be sent');
      }

      setContractId(data.dbContractId || data.contractId);
      setContractNumber(data.contractNumber);
      if (data.pdfUrl) {
        setPdfUrl(data.pdfUrl);
      }
      setState('success');

      // Call success callback
      if (onContractSent && data.dbContractId) {
        onContractSent(data.dbContractId, data.contractNumber);
      }
    } catch (err) {
      console.error('[BookFlightModal] Error sending contract:', err);
      setError(err instanceof Error ? err.message : 'Failed to send contract');
      setState('error');
    }
  }, [requestId, flight, tripDetails.tripId, customer, flightDetails, pricing, amenities, onContractSent]);

  /**
   * Handle close and reset
   */
  const handleClose = useCallback(() => {
    // Clean up blob URL if exists
    if (pdfUrl && pdfUrl.startsWith('blob:')) {
      URL.revokeObjectURL(pdfUrl);
    }

    // Reset state
    setState('ready');
    setError(null);
    setPdfUrl(null);
    setContractId(null);
    setContractNumber(null);

    onClose();
  }, [pdfUrl, onClose]);

  /**
   * Open PDF in new tab
   */
  const handleOpenPdf = useCallback(() => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  }, [pdfUrl]);

  /**
   * Reset to ready state
   */
  const handleRetry = useCallback(() => {
    setState('ready');
    setError(null);
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-500" />
            Book Flight
          </DialogTitle>
          <DialogDescription>
            Review flight details and send a contract to the customer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Customer Info: selected customer from generated proposal (name + email required for contract) */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Customer
            </h4>
            {customer.name?.trim() && customer.email?.trim() ? (
              <>
                <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {customer.name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {customer.email}
                </p>
                {customer.company && (
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    {customer.company}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-amber-600 dark:text-amber-400" data-testid="book-flight-no-customer">
                No customer selected. Generate a proposal and select a customer first — the contract will be sent to that customer.
              </p>
            )}
          </div>

          {/* Flight Details */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Flight Details
            </h4>

            {/* Route */}
            <div className="flex items-center gap-3">
              <Plane className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {flight.departureAirport.icao} → {flight.arrivalAirport.icao}
              </span>
            </div>

            {/* Date */}
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {formatDate(flight.departureDate || tripDetails.departureDate)}
                {flight.departureTime && ` at ${flight.departureTime}`}
              </span>
            </div>

            {/* Aircraft */}
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 flex items-center justify-center">
                <span className="text-xs text-gray-400">✈️</span>
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {flight.aircraftType}
                {flight.aircraftModel && ` - ${flight.aircraftModel}`}
              </span>
            </div>

            {/* Passengers */}
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {tripDetails.passengers} passenger{tripDetails.passengers !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Operator */}
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 flex items-center justify-center">
                <span className="text-xs text-gray-400">🏢</span>
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {flight.operatorName}
              </span>
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Pricing Summary
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Flight Cost</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {formatCurrency(pricing.flightCost, pricing.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Federal Excise Tax (7.5%)</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {formatCurrency(pricing.federalExciseTax, pricing.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Domestic Segment Fee</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {formatCurrency(pricing.domesticSegmentFee, pricing.currency)}
                </span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                <div className="flex justify-between font-semibold">
                  <span className="text-gray-900 dark:text-gray-100">Total</span>
                  <span className="text-orange-600 dark:text-orange-400">
                    {formatCurrency(pricing.totalAmount, pricing.currency)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                * 5% fee applies for credit card payments
              </p>
            </div>
          </div>

          {/* Success State */}
          {state === 'success' && (
            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">
                    Contract Sent Successfully!
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                    Contract {contractNumber} has been sent to {customer.email}.
                  </p>
                  {pdfUrl && (
                    <button
                      onClick={handleOpenPdf}
                      className="text-sm text-green-600 dark:text-green-400 hover:underline mt-2 flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View Contract PDF
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {state === 'error' && error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">
                    Error
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {state === 'ready' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={handlePreviewContract}
                disabled={!hasValidCustomer}
                title={!hasValidCustomer ? 'Select a customer by generating a proposal first' : undefined}
              >
                <FileText className="mr-2 h-4 w-4" />
                Preview Contract
              </Button>
              <Button
                onClick={handleSendContract}
                disabled={!hasValidCustomer}
                title={!hasValidCustomer ? 'Select a customer by generating a proposal first' : undefined}
              >
                <Mail className="mr-2 h-4 w-4" />
                Send Contract
              </Button>
            </>
          )}

          {state === 'generating' && (
            <Button disabled>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Contract...
            </Button>
          )}

          {state === 'preview' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="outline" onClick={handleOpenPdf}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Open PDF
              </Button>
              <Button
                onClick={handleSendContract}
                disabled={!hasValidCustomer}
                title={!hasValidCustomer ? 'Select a customer by generating a proposal first' : undefined}
              >
                <Mail className="mr-2 h-4 w-4" />
                Send Contract
              </Button>
            </>
          )}

          {state === 'sending' && (
            <Button disabled>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending Contract...
            </Button>
          )}

          {state === 'success' && (
            <Button onClick={handleClose}>
              Done
            </Button>
          )}

          {state === 'error' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleRetry}>
                Try Again
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BookFlightModal;
