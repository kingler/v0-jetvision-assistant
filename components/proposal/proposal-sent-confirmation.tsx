"use client"

import React from "react"
import { FileText, CheckCircle2, Pencil, ScrollText } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
    /** Trip type: one_way, round_trip, or multi_city */
    tripType?: 'one_way' | 'round_trip' | 'multi_city'
    /** Return date for round-trip proposals */
    returnDate?: string
    /** Return airport for round-trip (if different from departure) */
    returnAirport?: string
    /** Segments for multi-city trips */
    segments?: Array<{
      departureAirport: string
      arrivalAirport: string
      departureDate: string
    }>
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
  /** Callback to open margin edit modal */
  onEditMargin?: () => void
  /** Callback to generate contract from this proposal */
  onGenerateContract?: () => void
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
  onEditMargin,
  onGenerateContract,
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

  // Determine trip type
  const isRoundTrip = safeFlightDetails.tripType === 'round_trip'
  const isMultiCity = safeFlightDetails.tripType === 'multi_city'

  /**
   * Format flight route for display
   * Round-trip: "KTEB ⇄ KVNY"
   * Multi-city: "KTEB → KVNY → KLAS → ..."
   * One-way: "KTEB → KVNY"
   */
  const flightRoute = isMultiCity && safeFlightDetails.segments && safeFlightDetails.segments.length > 0
    ? safeFlightDetails.segments.map((s) => s.departureAirport).concat(
        safeFlightDetails.segments[safeFlightDetails.segments.length - 1]?.arrivalAirport || ''
      ).filter(Boolean).join(' → ')
    : isRoundTrip
      ? `${safeFlightDetails.departureAirport || 'N/A'} ⇄ ${safeFlightDetails.arrivalAirport || 'N/A'}`
      : `${safeFlightDetails.departureAirport || 'N/A'} → ${safeFlightDetails.arrivalAirport || 'N/A'}`

  return (
    <div className="w-full">
      <Card className="w-full">
        <CardContent className="p-6 space-y-4">
        {/* Success Header */}
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            <CheckCircle2 className="h-6 w-6 text-success" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-foreground mb-1">
              Proposal Sent Successfully
            </h3>
            <p className="text-sm text-foreground">
              The proposal for <span className="font-medium">{flightRoute}</span> was sent to{" "}
              <span className="font-medium">{safeClient.name}</span> via the following email address:{" "}
              <a
                href={`mailto:${safeClient.email}`}
                className="font-medium text-foreground hover:underline"
              >
                {safeClient.email}
              </a>
            </p>
          </div>
        </div>

        {/* Flight Details Summary */}
        <div className="bg-muted rounded-lg p-4 border border-border">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
            {/* Trip Type Badge */}
            <div className="col-span-full flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                  isMultiCity
                    ? 'bg-status-searching/15 text-status-searching'
                    : isRoundTrip
                      ? 'bg-info-bg text-primary'
                      : 'bg-muted text-foreground'
                )}
              >
                {isMultiCity ? 'Multi-City' : isRoundTrip ? 'Round-Trip' : 'One-Way'}
              </span>
            </div>

            {/* Multi-city: show each segment */}
            {isMultiCity && safeFlightDetails.segments && safeFlightDetails.segments.length > 0 ? (
              <div className="col-span-full space-y-2">
                {safeFlightDetails.segments.map((seg, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="text-xs text-muted-foreground font-medium w-10 shrink-0">
                      Leg {i + 1}
                    </span>
                    <span className="font-medium text-foreground break-words">
                      {seg.departureAirport} → {seg.arrivalAirport}
                    </span>
                    <span className="hidden sm:inline text-muted-foreground">|</span>
                    <span className="text-foreground">
                      {formatDate(seg.departureDate)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div>
                  <span className="text-muted-foreground">Route:</span>
                  <p className="font-medium text-foreground">{flightRoute}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {isRoundTrip ? 'Outbound Date:' : 'Departure Date:'}
                  </span>
                  <p className="font-medium text-foreground">
                    {formatDate(safeFlightDetails.departureDate)}
                  </p>
                </div>

                {/* Return Date for Round-Trip */}
                {isRoundTrip && safeFlightDetails.returnDate && (
                  <div>
                    <span className="text-muted-foreground">Return Date:</span>
                    <p className="font-medium text-foreground">
                      {formatDate(safeFlightDetails.returnDate)}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Pricing Section */}
            {pricing && (
              <>
                {/* Show leg breakdown for round-trip if available */}
                {isRoundTrip && (pricing.outboundCost || pricing.returnCost) && (
                  <div className="col-span-full grid grid-cols-2 gap-4 pt-2 border-t border-border">
                    {pricing.outboundCost && (
                      <div>
                        <span className="text-muted-foreground">Outbound:</span>
                        <p className="font-medium text-foreground">
                          {pricing.currency} {pricing.outboundCost.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    )}
                    {pricing.returnCost && (
                      <div>
                        <span className="text-muted-foreground">Return:</span>
                        <p className="font-medium text-foreground">
                          {pricing.currency} {pricing.returnCost.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                <div className="col-span-full">
                  <span className="text-muted-foreground">Total Price:</span>
                  <p className="font-medium text-lg text-foreground">
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
          <FileText className="h-4 w-4 text-muted-foreground" />
          <button
            onClick={handlePdfClick}
            className="text-sm text-primary hover:underline"
            aria-label={`Open proposal PDF: ${fileName || 'proposal.pdf'}`}
          >
            View Full Proposal PDF
          </button>
          {proposalId && (
            <span className="text-xs text-muted-foreground">
              ({proposalId})
            </span>
          )}
        </div>

        {/* Action Buttons */}
        {(onEditMargin || onGenerateContract) && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-border">
            {onEditMargin && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEditMargin}
                className="text-xs"
              >
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit Margin
              </Button>
            )}
            {onGenerateContract && (
              <Button
                size="sm"
                onClick={onGenerateContract}
                className="text-xs"
              >
                <ScrollText className="h-3.5 w-3.5 mr-1.5" />
                Generate Contract
              </Button>
            )}
          </div>
        )}
        </CardContent>
      </Card>

      {/* Next Steps - rendered as agent message text below the card */}
      <div className="mt-4 text-sm text-foreground leading-relaxed space-y-2">
        <p>
          The customer will review the proposal and respond via email at{" "}
          <a
            href={`mailto:${safeClient.email}`}
            className="font-medium text-primary hover:underline"
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
