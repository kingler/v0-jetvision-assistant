"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  const [paymentAmount, setPaymentAmount] = useState(totalAmount)
  const [paymentMethod, setPaymentMethod] = useState('wire')
  const [paymentReference, setPaymentReference] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!paymentReference.trim()) {
      setError('Payment reference is required')
      return
    }
    if (paymentAmount <= 0) {
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
    <Dialog open={open} onOpenChange={(v) => !v && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Confirm Payment
          </DialogTitle>
          <DialogDescription>
            Record payment received for contract {contractNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="payment-amount">Payment Amount ({currency})</Label>
            <Input
              id="payment-amount"
              type="number"
              min="0"
              step="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-method">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={isSubmitting}>
              <SelectTrigger id="payment-method">
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

          <div className="space-y-2">
            <Label htmlFor="payment-ref">Reference Number</Label>
            <Input
              id="payment-ref"
              placeholder="Wire transfer ID, check number, etc."
              value={paymentReference}
              onChange={(e) => {
                setPaymentReference(e.target.value)
                setError(null)
              }}
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4 mr-2" />
            )}
            Confirm Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
