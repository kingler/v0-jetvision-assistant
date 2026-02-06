"use client"

import React from "react"
import { FileText, CheckCircle2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/**
 * Proposal Sent Confirmation Component
 *
 * Displays a confirmation message after a proposal has been successfully sent,
 * including flight details, client information, and a link to view the PDF.
 * Next steps are displayed as plain text below the card.
 *
 * @param props - Component props
 */
export interface ProposalSentConfirmationProps {
  /** Flight details for display */
  flightDetails: {
    departureAirport: string
    arrivalAirport: string
    departureDate: string
    /** Trip type: one_way or round_trip */
    tripType?: 'one_way' | 'round_trip'
    /** Return date for round-trip proposals */
    returnDate?: string
    /** Return airport for round-trip (if different from departure) */
    returnAirport?: string
  }
  /** Client information */
  client: {
    name: string
    email: string
  }
  /** PDF proposal URL for viewing */
  pdfUrl: string
  /** Proposal filename */
  fileName?: string
  /** Proposal ID */
  proposalId?: string
  /** Pricing information */
  pricing?: {
    total: number
    currency: string
    /** Outbound leg cost for round-trip */
    outboundCost?: number
    /** Return leg cost for round-trip */
    returnCost?: number
  }
}

/**
 * Proposal Sent Confirmation Component
 *
 * Shows a formatted message confirming proposal was sent with:
 * - Flight details summary
 * - Client name and email
 * - Link to view proposal PDF
 * - Next steps text below the card
 */
export function ProposalSentConfirmation({
  flightDetails,
  client,
  pdfUrl,
  fileName,
  proposalId,
  pricing,
}: ProposalSentConfirmationProps) {
  /**
   * Format date for display (e.g., "Jan 26, 2026")
   */
  const formatDate = (dateString: string): string => {
    if (!dateString) return 'TBD'
    try {
      // Parse YYYY-MM-DD as local date components to avoid timezone-induced off-by-one
      // new Date('2026-03-25') parses as UTC midnight, which in US timezones becomes Mar 24
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-').map(Number)
        const date = new Date(year, month - 1, day)
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      }
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return dateString
    }
  }

  /**
   * Handle PDF thumbnail click - opens PDF in new browser tab
   */
  const handlePdfClick = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank', 'noopener,noreferrer')
    }
  }

  // Defensive: handle undefined flightDetails or client
  const safeFlightDetails = flightDetails || {
    departureAirport: 'N/A',
    arrivalAirport: 'N/A',
    departureDate: '',
    tripType: 'one_way' as const,
    returnDate: undefined,
    returnAirport: undefined,
  }
  const safeClient = client || {
    name: 'Customer',
    email: 'N/A',
  }

  // Determine if this is a round-trip proposal
  const isRoundTrip = safeFlightDetails.tripType === 'round_trip'

  /**
   * Format flight route for display
   * Round-trip: "KTEB ⇄ KVNY" or "KTEB → KVNY → KTEB" if return to origin
   * One-way: "KTEB → KVNY"
   */
  const flightRoute = isRoundTrip
    ? `${safeFlightDetails.departureAirport || 'N/A'} ⇄ ${safeFlightDetails.arrivalAirport || 'N/A'}`
    : `${safeFlightDetails.departureAirport || 'N/A'} → ${safeFlightDetails.arrivalAirport || 'N/A'}`

  return (
    <div className="w-full">
      <Card className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <CardContent className="p-6 space-y-4">
        {/* Success Header */}
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-1">
              Proposal Sent Successfully
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              The proposal for <span className="font-medium">{flightRoute}</span> was sent to{" "}
              <span className="font-medium">{safeClient.name}</span> via the following email address:{" "}
              <a
                href={`mailto:${safeClient.email}`}
                className="font-medium text-gray-800 dark:text-gray-200 hover:underline"
              >
                {safeClient.email}
              </a>
            </p>
          </div>
        </div>

        {/* Flight Details Summary */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {/* Trip Type Badge */}
            <div className="col-span-2 flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                  isRoundTrip
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                )}
              >
                {isRoundTrip ? 'Round-Trip' : 'One-Way'}
              </span>
            </div>

            <div>
              <span className="text-gray-500 dark:text-gray-400">Route:</span>
              <p className="font-medium text-gray-900 dark:text-gray-100">{flightRoute}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">
                {isRoundTrip ? 'Outbound Date:' : 'Departure Date:'}
              </span>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {formatDate(safeFlightDetails.departureDate)}
              </p>
            </div>

            {/* Return Date for Round-Trip */}
            {isRoundTrip && safeFlightDetails.returnDate && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Return Date:</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {formatDate(safeFlightDetails.returnDate)}
                </p>
              </div>
            )}

            {/* Pricing Section */}
            {pricing && (
              <>
                {/* Show leg breakdown for round-trip if available */}
                {isRoundTrip && (pricing.outboundCost || pricing.returnCost) && (
                  <div className="col-span-2 grid grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-gray-600">
                    {pricing.outboundCost && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Outbound:</span>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {pricing.currency} {pricing.outboundCost.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    )}
                    {pricing.returnCost && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Return:</span>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {pricing.currency} {pricing.returnCost.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                <div className="col-span-2">
                  <span className="text-gray-500 dark:text-gray-400">Total Price:</span>
                  <p className="font-medium text-lg text-gray-900 dark:text-gray-100">
                    {pricing.currency} {pricing.total.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* PDF Link */}
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <button
            onClick={handlePdfClick}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            aria-label={`Open proposal PDF: ${fileName || 'proposal.pdf'}`}
          >
            View Full Proposal PDF
          </button>
          {proposalId && (
            <span className="text-xs text-gray-500 dark:text-gray-500">
              ({proposalId})
            </span>
          )}
        </div>
        </CardContent>
      </Card>

      {/* Next Steps - rendered as agent message text below the card */}
      <div className="mt-4 text-sm text-gray-900 dark:text-gray-100 leading-relaxed space-y-2">
        <p>
          The customer will review the proposal and respond via email at{" "}
          <a
            href={`mailto:${safeClient.email}`}
            className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            {safeClient.email}
          </a>
        </p>
        <p>
          Once the customer confirms and sends payment, the flight will be automatically booked with the selected operator.
        </p>
      </div>
    </div>
  )
}
