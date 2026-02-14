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
      <Card className="w-full">
        <CardContent className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5">
              <CheckCircle2 className="h-7 w-7 text-success" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-foreground">
                Payment Received
              </h3>
              <p className="text-sm text-foreground">
                Payment for contract <span className="font-medium">{contractNumber}</span> has been confirmed.
              </p>
            </div>
          </div>

          {/* Payment Details */}
          <div className="bg-muted rounded-lg p-4 border border-border">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="col-span-2">
                <span className="text-muted-foreground">Payment Amount</span>
                <p className="font-semibold text-xl text-success">
                  {formatAmount(paymentAmount, currency)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Payment Method</span>
                <p className="font-medium text-foreground">{paymentMethodLabel}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Reference</span>
                <p className="font-medium text-foreground">{paymentReference}</p>
              </div>
            </div>
          </div>

          {/* Timestamp */}
          <div className="text-xs text-muted-foreground">
            Received: {formatTimestamp(paidAt)}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
