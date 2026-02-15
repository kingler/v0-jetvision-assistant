/**
 * Price Display Component
 * Formatted price display with currency and optional comparison
 */

import type React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export interface PriceDisplayProps {
  amount: number
  currency?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  comparisonPrice?: number
  comparisonLabel?: string
  showTrend?: boolean
  className?: string
}

export function PriceDisplay({
  amount,
  currency = 'USD',
  size = 'md',
  comparisonPrice,
  comparisonLabel = 'vs budget',
  showTrend = true,
  className,
}: PriceDisplayProps) {
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  }

  const getDifference = () => {
    if (!comparisonPrice) return null

    const diff = amount - comparisonPrice
    const percentDiff = ((diff / comparisonPrice) * 100).toFixed(1)
    const isOver = diff > 0
    const isUnder = diff < 0

    return {
      amount: Math.abs(diff),
      percent: Math.abs(Number.parseFloat(percentDiff)),
      isOver,
      isUnder,
      isEqual: diff === 0,
    }
  }

  const difference = getDifference()

  return (
    <div className={className}>
      <div className={`font-bold ${sizeClasses[size]}`}>
        {formatPrice(amount)}
      </div>

      {difference && showTrend && (
        <div className="mt-1 flex items-center gap-1 text-sm">
          {difference.isOver && (
            <>
              <TrendingUp className="h-4 w-4 text-destructive" />
              <span className="text-destructive">
                {formatPrice(difference.amount)} ({difference.percent}%) over {comparisonLabel}
              </span>
            </>
          )}
          {difference.isUnder && (
            <>
              <TrendingDown className="h-4 w-4 text-success" />
              <span className="text-success">
                {formatPrice(difference.amount)} ({difference.percent}%) under {comparisonLabel}
              </span>
            </>
          )}
          {difference.isEqual && (
            <>
              <Minus className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                On budget
              </span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
