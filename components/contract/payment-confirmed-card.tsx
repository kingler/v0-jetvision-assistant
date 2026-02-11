"use client"

import React from "react"
import { CheckCircle2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export interface PaymentConfirmedCardProps {
  contractId: string
  contractNumber: string
  paymentAmount: number
  paymentMethod: string
  paymentReference: string
  paidAt: string
  currency: string
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  wire: 'Wire Transfer',
  credit_card: 'Credit Card',
  check: 'Check',
}

export function PaymentConfirmedCard({
  contractNumber,
  paymentAmount,
  paymentMethod,
  paymentReference,
  paidAt,
  currency,
}: PaymentConfirmedCardProps) {
  const formatTimestamp = (iso: string): string => {
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return iso
    }
  }

  const formatAmount = (amount: number, curr: string): string => {
    const formattedNumber = amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    return `${curr} ${formattedNumber}`
  }

  const paymentMethodLabel = PAYMENT_METHOD_LABELS[paymentMethod] || paymentMethod

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
                Payment Received
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                Payment for contract <span className="font-medium">{contractNumber}</span> has been confirmed.
              </p>
            </div>
          </div>

          {/* Payment Details */}
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-green-200 dark:border-green-700">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="col-span-2">
                <span className="text-gray-500 dark:text-gray-400">Payment Amount</span>
                <p className="font-semibold text-xl text-green-700 dark:text-green-400">
                  {formatAmount(paymentAmount, currency)}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Payment Method</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">{paymentMethodLabel}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Reference</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">{paymentReference}</p>
              </div>
            </div>
          </div>

          {/* Timestamp */}
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Received: {formatTimestamp(paidAt)}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
