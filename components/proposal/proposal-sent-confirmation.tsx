"use client"

import React from "react"
import { FileText, Mail, ExternalLink, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

/**
 * Proposal Sent Confirmation Component
 * 
 * Displays a confirmation message after a proposal has been successfully sent,
 * including flight details, client information, email address, PDF thumbnail,
 * and next steps for booking after payment.
 * 
 * @param props - Component props
 */
export interface ProposalSentConfirmationProps {
  /** Flight details for display */
  flightDetails: {
    departureAirport: string
    arrivalAirport: string
    departureDate: string
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
  }
}

/**
 * Proposal Sent Confirmation Component
 * 
 * Shows a formatted message confirming proposal was sent with:
 * - Flight details summary
 * - Client name and email
 * - Clickable PDF thumbnail that opens in browser
 * - Next steps for booking after payment
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
  }
  const safeClient = client || {
    name: 'Customer',
    email: 'N/A',
  }

  /**
   * Format flight route for display (e.g., "KTEB → KVNY")
   */
  const flightRoute = `${safeFlightDetails.departureAirport || 'N/A'} → ${safeFlightDetails.arrivalAirport || 'N/A'}`

  return (
    <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
      <CardContent className="p-6 space-y-4">
        {/* Success Header */}
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-green-900 dark:text-green-100 mb-1">
              Proposal Sent Successfully
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300">
              The proposal for <span className="font-medium">{flightRoute}</span> was sent to{" "}
              <span className="font-medium">{safeClient.name}</span> via the following email address:{" "}
              <a
                href={`mailto:${safeClient.email}`}
                className="font-medium text-green-800 dark:text-green-200 hover:underline"
              >
                {safeClient.email}
              </a>
            </p>
          </div>
        </div>

        {/* Flight Details Summary */}
        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Route:</span>
              <p className="font-medium text-gray-900 dark:text-gray-100">{flightRoute}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Departure Date:</span>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {formatDate(safeFlightDetails.departureDate)}
              </p>
            </div>
            {pricing && (
              <div className="col-span-2">
                <span className="text-gray-500 dark:text-gray-400">Total Price:</span>
                <p className="font-medium text-lg text-gray-900 dark:text-gray-100">
                  {pricing.currency} {pricing.total.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* PDF Thumbnail Preview */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <FileText className="h-4 w-4" />
            <span>Proposal Document</span>
            {proposalId && (
              <span className="text-xs text-gray-500 dark:text-gray-500">
                ({proposalId})
              </span>
            )}
          </div>
          
          {/* Clickable PDF Thumbnail */}
          <button
            onClick={handlePdfClick}
            className="w-full group relative overflow-hidden rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-600 transition-all duration-200 bg-white dark:bg-gray-900 cursor-pointer"
            aria-label={`Open proposal PDF: ${fileName || 'proposal.pdf'}`}
          >
            {/* PDF Preview using embed */}
            <div className="relative w-full h-64 bg-gray-100 dark:bg-gray-800">
              <embed
                src={`${pdfUrl}#page=1&zoom=50`}
                type="application/pdf"
                className="w-full h-full pointer-events-none"
                title="Proposal PDF Preview"
                aria-hidden="true"
              />
              {/* Fallback if embed doesn't work */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <FileText className="h-16 w-16 text-gray-400 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">PDF Preview</p>
                </div>
              </div>
              {/* Overlay with hover effect */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 dark:group-hover:bg-white/5 transition-colors duration-200 flex items-center justify-center pointer-events-none">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-2 text-white dark:text-gray-100 bg-black/70 dark:bg-white/20 px-4 py-2 rounded-lg">
                  <ExternalLink className="h-4 w-4" />
                  <span className="text-sm font-medium">Open in Browser</span>
                </div>
              </div>
            </div>
          </button>

          {/* Open PDF Button */}
          <Button
            onClick={handlePdfClick}
            variant="outline"
            className="w-full border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-950/30"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Full Proposal PDF
          </Button>
        </div>

        {/* Next Steps Section */}
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Next Steps
          </h4>
          <ol className="space-y-2 text-sm text-blue-800 dark:text-blue-200 list-decimal list-inside">
            <li>
              The customer will review the proposal and respond via email at{" "}
              <a
                href={`mailto:${safeClient.email}`}
                className="font-medium underline hover:no-underline"
              >
                {safeClient.email}
              </a>
            </li>
            <li>
              Once the customer confirms and sends payment, the flight will be automatically booked
              with the selected operator
            </li>
            <li>
              You will receive a confirmation email once the booking is complete
            </li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}
