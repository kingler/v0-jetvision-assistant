/**
 * PriceDisplay Component
 * Formats and displays currency amounts with proper styling
 */

import type React from 'react'
import { cn } from '@/lib/utils'

export interface PriceDisplayProps {
  amount: number
  currency?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showCurrency?: boolean
}

export function PriceDisplay({
  amount,
  currency = 'USD',
  size = 'md',
  className,
  showCurrency = true,
}: PriceDisplayProps) {
  const formattedAmount = amount.toLocaleString('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  }

  return (
    <div className={cn('font-bold text-green-600 dark:text-green-500', sizeClasses[size], className)}>
      {formattedAmount}
    </div>
  )
}
