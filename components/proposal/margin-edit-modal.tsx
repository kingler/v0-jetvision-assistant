"use client"

import React, { useState, useMemo } from "react"
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
import { Loader2, Percent, RefreshCw, Save } from "lucide-react"
import { cn } from "@/lib/utils"

export interface MarginEditModalProps {
  open: boolean
  onClose: () => void
  proposalId: string
  currentMargin: number
  /** Base amount before margin (total_amount from proposal) */
  baseAmount: number
  currency: string
  /** Called after "Update Internal Only" succeeds */
  onUpdated?: (newMargin: number, newFinalAmount: number) => void
  /** Called after "Regenerate & Re-send" succeeds with new email approval data */
  onRegenerated?: (data: {
    proposalId: string
    emailApprovalData: Record<string, unknown>
  }) => void
}

const MARGIN_PRESETS = [8, 10, 20] as const

export function MarginEditModal({
  open,
  onClose,
  proposalId,
  currentMargin,
  baseAmount,
  currency,
  onUpdated,
  onRegenerated,
}: MarginEditModalProps) {
  const [margin, setMargin] = useState(currentMargin)
  const [customInput, setCustomInput] = useState("")
  const [isCustom, setIsCustom] = useState(!MARGIN_PRESETS.includes(currentMargin as typeof MARGIN_PRESETS[number]))
  const [isUpdating, setIsUpdating] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const previewPricing = useMemo(() => {
    const fee = baseAmount * (margin / 100)
    const total = baseAmount + fee
    return {
      fee: Math.round(fee * 100) / 100,
      total: Math.round(total * 100) / 100,
    }
  }, [baseAmount, margin])

  const handlePresetClick = (preset: number) => {
    setMargin(preset)
    setIsCustom(false)
    setCustomInput("")
    setError(null)
  }

  const handleCustomChange = (value: string) => {
    setCustomInput(value)
    const num = parseFloat(value)
    if (!isNaN(num) && num >= 0 && num <= 100) {
      setMargin(num)
      setError(null)
    } else if (value !== "") {
      setError("Enter a valid percentage (0-100)")
    }
  }

  const handleUpdateInternal = async () => {
    setIsUpdating(true)
    setError(null)
    try {
      const response = await fetch(`/api/proposal/${proposalId}/margin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marginPercentage: margin }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update margin")
      }
      const result = await response.json()
      onUpdated?.(margin, result.finalAmount)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update margin")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRegenerateAndResend = async () => {
    setIsRegenerating(true)
    setError(null)
    try {
      const response = await fetch(`/api/proposal/${proposalId}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marginPercentage: margin }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to regenerate proposal")
      }
      const result = await response.json()
      onRegenerated?.({
        proposalId: result.proposalId,
        emailApprovalData: result.emailApprovalData,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate proposal")
    } finally {
      setIsRegenerating(false)
    }
  }

  const isProcessing = isUpdating || isRegenerating
  const hasChanged = margin !== currentMargin

  return (
    <ResponsiveModal open={open} onOpenChange={(v) => !v && !isProcessing && onClose()}>
      <ResponsiveModalContent className="sm:max-w-[420px]">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>Edit Service Charge</ResponsiveModalTitle>
          <ResponsiveModalDescription>
            Update the margin for this proposal. You can save internally or
            regenerate and re-send to the customer.
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <div className="space-y-3 md:space-y-4 py-2">
          {/* Current margin display */}
          <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
            <Percent className="h-4 w-4" />
            <span>Current: {currentMargin}%</span>
          </div>

          {/* Preset buttons */}
          <div className="space-y-2">
            <Label className="text-xs md:text-sm">Service Charge</Label>
            <div className="flex flex-wrap gap-2">
              {MARGIN_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={margin === preset && !isCustom ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePresetClick(preset)}
                  disabled={isProcessing}
                  className="min-h-[44px] md:min-h-0"
                >
                  {preset}%
                </Button>
              ))}
              <Button
                type="button"
                variant={isCustom ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setIsCustom(true)
                  setCustomInput(String(margin))
                }}
                disabled={isProcessing}
                className="min-h-[44px] md:min-h-0"
              >
                Custom
              </Button>
            </div>
          </div>

          {/* Custom input */}
          {isCustom && (
            <div className="space-y-1">
              <Label htmlFor="custom-margin" className="text-xs md:text-sm">Custom Percentage</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="custom-margin"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={customInput}
                  onChange={(e) => handleCustomChange(e.target.value)}
                  placeholder="Enter %"
                  disabled={isProcessing}
                  className="w-28 min-h-[44px] md:min-h-0"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          )}

          {/* Live price preview */}
          <div className="rounded-lg bg-muted border border-border p-3 space-y-1.5">
            <div className="flex justify-between text-xs md:text-sm">
              <span className="text-muted-foreground">Base Amount</span>
              <span className="text-foreground">
                {currency} {baseAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-xs md:text-sm">
              <span className="text-muted-foreground">Charge ({margin}%)</span>
              <span className={cn(
                "font-medium",
                hasChanged ? "text-primary" : "text-foreground"
              )}>
                {currency} {previewPricing.fee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-xs md:text-sm border-t border-border pt-1.5">
              <span className="font-medium text-foreground">Total</span>
              <span className={cn(
                "font-semibold",
                hasChanged ? "text-primary" : "text-foreground"
              )}>
                {currency} {previewPricing.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {error && (
            <p className="text-xs md:text-sm text-destructive">{error}</p>
          )}
        </div>

        <ResponsiveModalFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleUpdateInternal}
            disabled={isProcessing || !hasChanged}
            className="min-h-[44px] md:min-h-0"
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Update Internal
          </Button>
          <Button
            onClick={handleRegenerateAndResend}
            disabled={isProcessing || !hasChanged}
            className="min-h-[44px] md:min-h-0"
          >
            {isRegenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Regenerate & Re-send
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
