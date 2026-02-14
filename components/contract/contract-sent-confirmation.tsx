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
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  sent: { label: 'Sent', className: 'bg-info-bg text-primary' },
  signed: { label: 'Signed', className: 'bg-success-bg text-success' },
  payment_pending: { label: 'Awaiting Payment', className: 'bg-warning-bg text-warning' },
  paid: { label: 'Paid', className: 'bg-success-bg text-success' },
  completed: { label: 'Completed', className: 'bg-success-bg text-success' },
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
      <Card className="w-full">
        <CardContent className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5">
              <ScrollText className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg text-foreground">
                  Contract Generated
                </h3>
                <Badge className={cn('text-xs', statusConfig.className)}>
                  {statusConfig.label}
                </Badge>
              </div>
              <p className="text-sm text-foreground">
                Contract <span className="font-medium">{contractNumber}</span> for{' '}
                <span className="font-medium">{customerName}</span> ({customerEmail})
              </p>
            </div>
          </div>

          {/* Contract Details */}
          <div className="bg-muted rounded-lg p-4 border border-border">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {/* Trip Type Badge */}
              {tripType && tripType !== 'one_way' && (
                <div className="col-span-2">
                  <Badge
                    className={cn(
                      'text-xs',
                      tripType === 'multi_city'
                        ? 'bg-status-searching/15 text-status-searching'
                        : 'bg-info-bg text-primary'
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
                      <span className="text-xs text-muted-foreground font-medium w-10 shrink-0">
                        Leg {i + 1}
                      </span>
                      <span className="font-medium text-foreground">
                        {seg.departureAirport} → {seg.arrivalAirport}
                      </span>
                      <span className="text-muted-foreground">|</span>
                      <span className="text-foreground">
                        {formatDate(seg.departureDate)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div>
                    <span className="text-muted-foreground">Route</span>
                    <p className="font-medium text-foreground">
                      {tripType === 'round_trip' ? flightRoute.replace('→', '⇄') : flightRoute}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {tripType === 'round_trip' ? 'Outbound' : 'Departure'}
                    </span>
                    <p className="font-medium text-foreground">{formatDate(departureDate)}</p>
                  </div>
                  {tripType === 'round_trip' && returnDate && (
                    <div>
                      <span className="text-muted-foreground">Return</span>
                      <p className="font-medium text-foreground">{formatDate(returnDate)}</p>
                    </div>
                  )}
                </>
              )}

              <div className="col-span-2">
                <span className="text-muted-foreground">Total Amount</span>
                <p className="font-medium text-lg text-foreground">
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
