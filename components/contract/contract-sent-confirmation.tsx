"use client"

import React from "react"
import { ScrollText, FileText, CreditCard } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Core contract data shared between the modal callback, chat message, and confirmation card. */
export interface ContractSentPayload {
  contractId: string
  contractNumber: string
  customerName: string
  customerEmail: string
  /** Pre-formatted route string (backward compatible) */
  flightRoute: string
  departureDate: string
  totalAmount: number
  currency: string
  pdfUrl?: string
}

export interface ContractSentConfirmationProps extends ContractSentPayload {
  status: 'draft' | 'sent' | 'signed' | 'payment_pending' | 'paid' | 'completed'
  /** Trip type for structured route display */
  tripType?: 'one_way' | 'round_trip' | 'multi_city'
  /** Return date for round-trip */
  returnDate?: string
  /** Segments for multi-city trips */
  segments?: Array<{
    departureAirport: string
    arrivalAirport: string
    departureDate: string
  }>
  /** Callback for "Mark Payment Received" */
  onMarkPayment?: () => void
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  sent: { label: 'Sent', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  signed: { label: 'Signed', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  payment_pending: { label: 'Awaiting Payment', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  paid: { label: 'Paid', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
}

export function ContractSentConfirmation({
  contractNumber,
  customerName,
  customerEmail,
  flightRoute,
  departureDate,
  totalAmount,
  currency,
  pdfUrl,
  status,
  tripType,
  returnDate,
  segments,
  onMarkPayment,
}: ContractSentConfirmationProps) {
  const formatDate = (dateString: string): string => {
    if (!dateString) return 'TBD'
    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-').map(Number)
        const date = new Date(year, month - 1, day)
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      }
      return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return dateString
    }
  }

  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.draft

  return (
    <div className="w-full">
      <Card className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <CardContent className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5">
              <ScrollText className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                  Contract Generated
                </h3>
                <Badge className={cn('text-xs', statusConfig.className)}>
                  {statusConfig.label}
                </Badge>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Contract <span className="font-medium">{contractNumber}</span> for{' '}
                <span className="font-medium">{customerName}</span> ({customerEmail})
              </p>
            </div>
          </div>

          {/* Contract Details */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {/* Trip Type Badge */}
              {tripType && tripType !== 'one_way' && (
                <div className="col-span-2">
                  <Badge
                    className={cn(
                      'text-xs',
                      tripType === 'multi_city'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    )}
                  >
                    {tripType === 'multi_city' ? 'Multi-City' : 'Round-Trip'}
                  </Badge>
                </div>
              )}

              {/* Multi-city segments */}
              {tripType === 'multi_city' && segments && segments.length > 0 ? (
                <div className="col-span-2 space-y-2">
                  {segments.map((seg, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium w-10 shrink-0">
                        Leg {i + 1}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {seg.departureAirport} → {seg.arrivalAirport}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">|</span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {formatDate(seg.departureDate)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Route</span>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {tripType === 'round_trip' ? flightRoute.replace('→', '⇄') : flightRoute}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">
                      {tripType === 'round_trip' ? 'Outbound' : 'Departure'}
                    </span>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{formatDate(departureDate)}</p>
                  </div>
                  {tripType === 'round_trip' && returnDate && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Return</span>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{formatDate(returnDate)}</p>
                    </div>
                  )}
                </>
              )}

              <div className="col-span-2">
                <span className="text-gray-500 dark:text-gray-400">Total Amount</span>
                <p className="font-medium text-lg text-gray-900 dark:text-gray-100">
                  {currency} {(typeof totalAmount === 'number' ? totalAmount : Number(totalAmount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {pdfUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(pdfUrl, '_blank', 'noopener,noreferrer')}
                className="text-xs"
              >
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                View Contract PDF
              </Button>
            )}
            {onMarkPayment && (status === 'sent' || status === 'signed' || status === 'payment_pending') && (
              <Button
                size="sm"
                onClick={onMarkPayment}
                className="text-xs"
              >
                <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                Mark Payment Received
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
