"use client"

import React, { useState, useEffect } from "react"
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, CreditCard } from "lucide-react"

export interface PaymentConfirmationModalProps {
  open: boolean
  onClose: () => void
  contractId: string
  contractNumber: string
  totalAmount: number
  currency: string
  onConfirm: (data: {
    paymentAmount: number
    paymentMethod: string
    paymentReference: string
  }) => void
}

const PAYMENT_METHODS = [
  { value: 'wire', label: 'Wire Transfer' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'check', label: 'Check' },
] as const

export function PaymentConfirmationModal({
  open,
  onClose,
  contractNumber,
  totalAmount,
  currency,
  onConfirm,
}: PaymentConfirmationModalProps) {
  const [paymentAmount, setPaymentAmount] = useState<number | ''>(totalAmount > 0 ? totalAmount : '')
  const [paymentMethod, setPaymentMethod] = useState('wire')
  const [paymentReference, setPaymentReference] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Re-sync amount and reset form fields each time the modal opens
  useEffect(() => {
    if (open) {
      setPaymentAmount(totalAmount > 0 ? totalAmount : '')
      setPaymentMethod('wire')
      setPaymentReference('')
      setError(null)
    }
  }, [open, totalAmount])

  const handleSubmit = async () => {
    if (!paymentReference.trim()) {
      setError('Payment reference is required')
      return
    }
    if (!paymentAmount || paymentAmount <= 0) {
      setError('Payment amount must be greater than 0')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await onConfirm({
        paymentAmount,
        paymentMethod,
        paymentReference: paymentReference.trim(),
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm payment')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ResponsiveModal open={open} onOpenChange={(v) => !v && !isSubmitting && onClose()}>
      <ResponsiveModalContent className="sm:max-w-[420px]" data-testid="payment-confirmation-modal">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Confirm Payment
          </ResponsiveModalTitle>
          <ResponsiveModalDescription>
            Record payment received for contract {contractNumber}
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <div className="space-y-3 md:space-y-4 py-2">
          <div className="space-y-1.5 md:space-y-2">
            <Label htmlFor="payment-amount" className="text-xs md:text-sm">Payment Amount ({currency})</Label>
            <Input
              id="payment-amount"
              type="number"
              min="0"
              step="0.01"
              value={paymentAmount}
              placeholder="Enter payment amount"
              onChange={(e) => {
                const parsed = parseFloat(e.target.value)
                setPaymentAmount(e.target.value === '' ? '' : (isNaN(parsed) ? '' : parsed))
              }}
              disabled={isSubmitting}
              className="min-h-[44px] md:min-h-0"
            />
          </div>

          <div className="space-y-1.5 md:space-y-2">
            <Label htmlFor="payment-method" className="text-xs md:text-sm">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={isSubmitting}>
              <SelectTrigger id="payment-method" className="min-h-[44px] md:min-h-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 md:space-y-2">
            <Label htmlFor="payment-ref" className="text-xs md:text-sm">Reference Number</Label>
            <Input
              id="payment-ref"
              placeholder="Wire transfer ID, check number, etc."
              value={paymentReference}
              onChange={(e) => {
                setPaymentReference(e.target.value)
                setError(null)
              }}
              disabled={isSubmitting}
              className="min-h-[44px] md:min-h-0"
            />
          </div>

          {error && (
            <p className="text-xs md:text-sm text-destructive">{error}</p>
          )}
        </div>

        <ResponsiveModalFooter className="flex-col sm:flex-row">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="min-h-[44px] md:min-h-0">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="min-h-[44px] md:min-h-0">
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4 mr-2" />
            )}
            Confirm Payment
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
