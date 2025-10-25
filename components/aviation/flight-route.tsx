/**
 * FlightRoute Component
 * Visual display of flight route with departure and arrival airports
 */

import type React from 'react'
import { Plane } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FlightRouteProps {
  departureAirport: string
  arrivalAirport: string
  departureTime?: string
  arrivalTime?: string
  className?: string
  compact?: boolean
}

export function FlightRoute({
  departureAirport,
  arrivalAirport,
  departureTime,
  arrivalTime,
  className,
  compact = false,
}: FlightRouteProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div className={compact ? 'space-y-1' : 'space-y-2'}>
        <div className={cn('font-bold text-gray-900 dark:text-white', compact ? 'text-lg' : 'text-2xl')}>
          {departureAirport}
        </div>
        {departureTime && (
          <div className="text-sm text-muted-foreground">{departureTime}</div>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700" />
        <Plane className={cn('mx-2 text-blue-600', compact ? 'w-5 h-5' : 'w-6 h-6')} />
        <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700" />
      </div>

      <div className={cn(compact ? 'space-y-1' : 'space-y-2', 'text-right')}>
        <div className={cn('font-bold text-gray-900 dark:text-white', compact ? 'text-lg' : 'text-2xl')}>
          {arrivalAirport}
        </div>
        {arrivalTime && (
          <div className="text-sm text-muted-foreground">{arrivalTime}</div>
        )}
      </div>
    </div>
  )
}
