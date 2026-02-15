'use client';

/**
 * SendProposalStep Component
 *
 * Step 4 of the RFP workflow - allows users to generate PDF proposals
 * and send them to customers via email.
 *
 * Features:
 * - Compact summary of selected flights
 * - Customer email input with validation
 * - PDF preview generation
 * - Send proposal with status tracking
 * - Success/error feedback
 *
 * @requires onSendProposal - Required for production use. The component will
 *   disable the send button and show an error if this prop is not provided.
 */

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Mail,
  FileText,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Plane,
  ArrowRight,
  Star,
  Eye,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { RFQFlight } from '@/lib/mcp/clients/avinode-client';

// =============================================================================
// TYPES
// =============================================================================

type ProposalStatus = 'idle' | 'generating' | 'sending' | 'sent' | 'error';

export interface SendProposalStepProps {
  selectedFlights: RFQFlight[];
  tripDetails: {
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
  };
  /** Jetvision service charge percentage (e.g. 10 for 10%). Used for internal cost breakdown display. */
  marginPercentage?: number;
  customerEmail?: string;
  customerName?: string;
  onGeneratePreview?: (data: {
    customerEmail: string;
    customerName: string;
    selectedFlights: RFQFlight[];
    tripDetails: SendProposalStepProps['tripDetails'];
  }) => Promise<{ success: boolean; previewUrl?: string; error?: string }>;
  /**
   * Handler for sending the proposal to the customer.
   * @required For production use - component will be disabled if not provided.
   */
  onSendProposal?: (data: {
    customerEmail: string;
    customerName: string;
    selectedFlights: RFQFlight[];
    tripDetails: SendProposalStepProps['tripDetails'];
  }) => Promise<{ success: boolean; error?: string }>;
  onGoBack?: () => void;
  className?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Formats a price amount with the specified currency code using Intl.NumberFormat.
 * Provides proper currency symbols and formatting based on the currency code.
 *
 * @param amount - The numeric amount to format
 * @param currency - The currency code (e.g., 'USD', 'EUR', 'GBP')
 * @returns Formatted currency string with proper symbol and formatting, or fallback if formatting fails
 */
function formatPrice(amount: number, currency: string): string {
  try {
    // Validate currency code - must be non-empty string
    if (!currency || currency.trim().length === 0) {
      return `${amount.toLocaleString('en-US')} ${currency || ''}`.trim();
    }

    // Use Intl.NumberFormat for proper currency formatting with locale-specific symbols
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.trim().toUpperCase(),
    });

    return formatter.format(amount);
  } catch (error) {
    // Fallback: return amount + ' ' + currency if Intl fails or currency is invalid
    // This handles cases where currency code is malformed or not supported
    return `${amount.toLocaleString('en-US')} ${currency}`;
  }
}

function formatDate(dateString: string): string {
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function calculateTotalPrice(flights: RFQFlight[]): { total: number; currency: string } {
  if (flights.length === 0) return { total: 0, currency: 'USD' };

  const total = flights.reduce((sum, flight) => sum + flight.totalPrice, 0);
  const currency = flights[0]?.currency || 'USD';
  return { total, currency };
}

// =============================================================================
// COMPACT FLIGHT ITEM COMPONENT
// =============================================================================

interface CompactFlightItemProps {
  flight: RFQFlight;
}

function CompactFlightItem({ flight }: CompactFlightItemProps) {
  // Extract short model name (e.g., "Gulfstream G650" -> "G650")
  const shortModel = flight.aircraftModel.split(' ').pop() || flight.aircraftModel;

  return (
    <div className="flex items-center justify-between gap-2 py-2 border-b border-border last:border-0">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-8 h-8 bg-info-bg rounded-full flex items-center justify-center shrink-0">
          <Plane className="h-4 w-4 text-info" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{shortModel}</p>
          <p className="text-xs text-muted-foreground truncate">{flight.operatorName.split(' ')[0]} Jet{flight.operatorRating && ` • ${flight.operatorRating}`}</p>
        </div>
      </div>
      <p className="text-sm font-semibold text-foreground shrink-0">
        {formatPrice(flight.totalPrice, flight.currency)}
      </p>
    </div>
  );
}

// =============================================================================
// STATUS INDICATOR COMPONENT
// =============================================================================

interface StatusIndicatorProps {
  status: ProposalStatus;
  error?: string;
}

function StatusIndicator({ status, error }: StatusIndicatorProps) {
  const statusConfig = {
    idle: {
      icon: CheckCircle2,
      text: 'Ready to send',
      className: 'text-success bg-success-bg',
    },
    generating: {
      icon: Loader2,
      text: 'Generating PDF...',
      className: 'text-info bg-info-bg',
      animate: true,
    },
    sending: {
      icon: Loader2,
      text: 'Sending proposal...',
      className: 'text-info bg-info-bg',
      animate: true,
    },
    sent: {
      icon: CheckCircle2,
      text: 'Proposal sent successfully!',
      className: 'text-success bg-success-bg',
    },
    error: {
      icon: AlertCircle,
      text: error || 'Failed to send proposal',
      className: 'text-destructive bg-error-bg',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg', config.className)}>
      <Icon className={cn('h-4 w-4', 'animate' in config && config.animate && 'animate-spin')} />
      <span className="text-sm font-medium">{config.text}</span>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function SendProposalStep({
  selectedFlights,
  tripDetails,
  marginPercentage = 10,
  customerEmail: initialEmail = '',
  customerName: initialName = '',
  onGeneratePreview,
  onSendProposal,
  onGoBack,
  className,
}: SendProposalStepProps) {
  const [email, setEmail] = useState(initialEmail);
  const [name, setName] = useState(initialName);
  const [status, setStatus] = useState<ProposalStatus>('idle');
  const [error, setError] = useState<string | undefined>();
  const [emailError, setEmailError] = useState<string | undefined>();

  const hasFlights = selectedFlights.length > 0;
  const { total: totalPrice, currency } = calculateTotalPrice(selectedFlights);
  const serviceFee = totalPrice * (marginPercentage / 100);
  const totalWithFee = totalPrice + serviceFee;

  const validateEmail = useCallback((emailValue: string): boolean => {
    if (!emailValue.trim()) {
      setEmailError('Email is required');
      return false;
    }
    if (!isValidEmail(emailValue)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError(undefined);
    return true;
  }, []);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (emailError) {
      validateEmail(value);
    }
  };

  const handleGeneratePreview = async () => {
    if (!validateEmail(email)) return;
    if (!onGeneratePreview) return;

    setStatus('generating');
    setError(undefined);

    try {
      const result = await onGeneratePreview({
        customerEmail: email,
        customerName: name || 'Valued Customer',
        selectedFlights,
        tripDetails,
      });

      if (result.success) {
        setStatus('idle');
        // Preview URL would be used to open in new tab
        if (result.previewUrl) {
          window.open(result.previewUrl, '_blank');
        }
      } else {
        setStatus('error');
        setError(result.error || 'Failed to generate preview');
      }
    } catch (err) {
      setStatus('error');
      setError('An unexpected error occurred');
    }
  };

  const handleSendProposal = async () => {
    if (!validateEmail(email)) return;
    
    // Check if send handler is provided - required for production use
    if (!onSendProposal) {
      console.warn(
        'SendProposalStep: onSendProposal handler not provided. ' +
        'The send proposal functionality requires this handler to be implemented. ' +
        'Please provide the onSendProposal prop to enable sending proposals.'
      );
      setStatus('error');
      setError('Send handler not provided');
      return;
    }

    setStatus('sending');
    setError(undefined);

    try {
      const result = await onSendProposal({
        customerEmail: email,
        customerName: name || 'Valued Customer',
        selectedFlights,
        tripDetails,
      });

      if (result.success) {
        setStatus('sent');
      } else {
        setStatus('error');
        setError(result.error || 'Failed to send proposal');
      }
    } catch (err) {
      setStatus('error');
      setError('An unexpected error occurred');
    }
  };

  const isLoading = status === 'generating' || status === 'sending';

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Send Proposal</h3>
          <p className="text-sm text-muted-foreground">
            Review and send the proposal to your customer
          </p>
        </div>
        {onGoBack && (
          <Button variant="ghost" size="sm" onClick={onGoBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        )}
      </div>

      {/* Route Summary */}
      <div className="bg-surface-secondary rounded-lg p-4">
        <div className="flex items-center justify-center gap-3">
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{tripDetails.departureAirport.icao}</p>
            <p className="text-xs text-muted-foreground">
              {tripDetails.departureAirport.city || tripDetails.departureAirport.name}
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{tripDetails.arrivalAirport.icao}</p>
            <p className="text-xs text-muted-foreground">
              {tripDetails.arrivalAirport.city || tripDetails.arrivalAirport.name}
            </p>
          </div>
        </div>
        <p className="text-center text-sm text-muted-foreground mt-2">
          {formatDate(tripDetails.departureDate)}
          {tripDetails.departureTime && ` at ${tripDetails.departureTime}`}
          {' • '}
          {tripDetails.passengers} passenger{tripDetails.passengers !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Selected Flights Summary */}
      {!hasFlights ? (
        <div className="bg-warning-bg border border-warning-border rounded-lg p-4 text-center">
          <AlertCircle className="h-8 w-8 text-warning mx-auto mb-2" />
          <p className="text-sm text-warning">
            No flights selected. Please go back and select at least one flight.
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="bg-surface-secondary px-4 py-2 border-b border-border">
            <p className="text-sm font-medium text-foreground">
              {selectedFlights.length} flight{selectedFlights.length !== 1 ? 's' : ''} selected
            </p>
          </div>
          <div className="px-4 py-2">
            {selectedFlights.map((flight) => (
              <CompactFlightItem key={flight.id} flight={flight} />
            ))}
          </div>
          {/* Internal cost breakdown — not shown to client */}
          <div className="bg-warning-bg px-4 py-3 border-t border-border space-y-1.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-warning mb-1">
              Internal Only
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Operator Cost</span>
              <span className="font-medium text-foreground">
                {formatPrice(totalPrice, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Jetvision Service Fee ({marginPercentage}%)
              </span>
              <span className="font-medium text-foreground">
                {formatPrice(serviceFee, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-warning-border">
              <span className="text-sm font-semibold text-foreground">Total Cost</span>
              <span className="text-lg font-bold text-info">
                {formatPrice(totalWithFee, currency)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Customer Information */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="customer-name">Customer Name</Label>
          <div className="relative">
            <Input
              id="customer-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Smith"
              className="pl-9"
            />
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          {name && (
            <p className="text-sm text-muted-foreground">Sending to: {name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer-email">Customer Email</Label>
          <div className="relative">
            <Input
              id="customer-email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              onBlur={() => email && validateEmail(email)}
              placeholder="customer@example.com"
              className={cn('pl-9', emailError && 'border-destructive focus:ring-destructive')}
              aria-invalid={!!emailError}
              aria-describedby={emailError ? 'email-error' : undefined}
            />
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          {emailError && (
            <p id="email-error" className="text-sm text-destructive">
              {emailError}
            </p>
          )}
        </div>
      </div>

      {/* Status Indicator */}
      <StatusIndicator status={status} error={error} />

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          onClick={handleGeneratePreview}
          disabled={isLoading || !hasFlights}
          className="flex-1"
        >
          {status === 'generating' ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Preview PDF
            </>
          )}
        </Button>

        <Button
          onClick={handleSendProposal}
          disabled={isLoading || !hasFlights || status === 'sent' || !onSendProposal}
          className="flex-1"
        >
          {status === 'sending' ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : status === 'sent' ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Sent!
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Proposal
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default SendProposalStep;
