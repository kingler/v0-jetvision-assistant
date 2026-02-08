"use client"

import React from "react"
import { CheckCircle2, Calendar } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export interface ClosedWonConfirmationProps {
  contractNumber: string
  customerName: string
  flightRoute: string
  dealValue: number
  currency: string
  proposalSentAt?: string
  contractSentAt?: string
  paymentReceivedAt?: string
}

export function ClosedWonConfirmation({
  contractNumber,
  customerName,
  flightRoute,
  dealValue,
  currency,
  proposalSentAt,
  contractSentAt,
  paymentReceivedAt,
}: ClosedWonConfirmationProps) {
  const formatTimestamp = (iso?: string): string => {
    if (!iso) return ''
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return ''
    }
  }

  const timeline = [
    { label: 'Proposal Sent', date: formatTimestamp(proposalSentAt) },
    { label: 'Contract Sent', date: formatTimestamp(contractSentAt) },
    { label: 'Payment Received', date: formatTimestamp(paymentReceivedAt) },
  ].filter((t) => t.date)

  return (
    <div className="w-full">
      <Card className="w-full bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
        <CardContent className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5">
              <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-green-800 dark:text-green-200">
                Deal Closed
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                Contract {contractNumber} with {customerName} is complete.
              </p>
            </div>
          </div>

          {/* Deal Summary */}
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-green-200 dark:border-green-700">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Route</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">{flightRoute}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Customer</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">{customerName}</p>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500 dark:text-gray-400">Deal Value</span>
                <p className="font-semibold text-xl text-green-700 dark:text-green-400">
                  {currency} {dealValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          {timeline.length > 0 && (
            <div className="space-y-2">
              {timeline.map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Calendar className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  <span className="text-gray-600 dark:text-gray-400">{step.label}:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{step.date}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
