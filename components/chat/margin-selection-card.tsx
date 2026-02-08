"use client"

import React from "react"
import { UserCheck, Percent, Pencil } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export interface MarginSelectionData {
  customerName: string
  customerEmail: string
  companyName: string
  marginPercentage: number
  selectedAt: string
  /** Callback to open margin edit modal */
  onEditMargin?: () => void
}

/**
 * MarginSelectionCard - Compact read-only card showing the customer & margin
 * selected during the proposal workflow. Renders inline in the chat thread
 * so there is a persistent record of the selection.
 */
export function MarginSelectionCard({
  customerName,
  customerEmail,
  companyName,
  marginPercentage,
  selectedAt,
  onEditMargin,
}: MarginSelectionData) {
  const PRESETS = [5, 10, 15, 20]
  const isPreset = PRESETS.includes(marginPercentage)

  const formatTime = (iso: string): string => {
    try {
      return new Date(iso).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    } catch {
      return ''
    }
  }

  return (
    <Card className="w-full bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
      <CardContent className="p-4 space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
            <UserCheck className="h-4 w-4" />
            <span>Customer &amp; Service Charge Selected</span>
          </div>
          {onEditMargin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onEditMargin}
              className="h-7 px-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
            >
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Button>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-700 dark:text-gray-300">
          <span className="font-medium">{customerName}</span>
          {companyName && (
            <>
              <span className="text-gray-400">|</span>
              <span>{companyName}</span>
            </>
          )}
          <span className="text-gray-400">|</span>
          <span className="text-gray-500 dark:text-gray-400">{customerEmail}</span>
        </div>

        {/* Margin badge */}
        <div className="flex items-center gap-2 text-sm">
          <Percent className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          <span className="font-semibold text-blue-700 dark:text-blue-300">
            {marginPercentage}% service charge
          </span>
          {isPreset && (
            <span className="px-1.5 py-0.5 text-xs rounded bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
              preset
            </span>
          )}
          {selectedAt && (
            <span className="ml-auto text-xs text-gray-400">
              {formatTime(selectedAt)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
