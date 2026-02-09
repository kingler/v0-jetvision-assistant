"use client"

import React from "react"
import { ScrollText, FileText, CreditCard } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface ContractSentConfirmationProps {
  contractId: string
  contractNumber: string
  customerName: string
  customerEmail: string
  flightRoute: string
  departureDate: string
  totalAmount: number
  currency: string
  pdfUrl?: string
  status: 'draft' | 'sent' | 'signed' | 'payment_pending' | 'paid' | 'completed'
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
              <div>
                <span className="text-gray-500 dark:text-gray-400">Route</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">{flightRoute}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Departure</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">{formatDate(departureDate)}</p>
              </div>
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
