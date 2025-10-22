/**
 * Flight Route Component
 * Visual representation of flight route with departure and arrival airports
 */

import type React from 'react'
import { MapPin, Plane } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export interface FlightRouteProps {
  departureAirport: string
  departureICAO?: string
  departureCity?: string
  arrivalAirport: string
  arrivalICAO?: string
  arrivalCity?: string
  departureTime?: string
  arrivalTime?: string
  flightDuration?: string
  className?: string
}

export function FlightRoute({
  departureAirport,
  departureICAO,
  departureCity,
  arrivalAirport,
  arrivalICAO,
  arrivalCity,
  departureTime,
  arrivalTime,
  flightDuration,
  className,
}: FlightRouteProps) {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4">
          {/* Departure */}
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <div>
                <div className="text-2xl font-bold">{departureICAO || departureAirport}</div>
                {departureCity && (
                  <div className="text-sm text-muted-foreground">{departureCity}</div>
                )}
                {departureTime && (
                  <div className="mt-1 text-sm font-medium">{departureTime}</div>
                )}
              </div>
            </div>
          </div>

          {/* Flight Path */}
          <div className="flex flex-1 items-center justify-center">
            <div className="relative flex w-full items-center">
              <div className="h-[2px] flex-1 bg-gradient-to-r from-primary via-secondary to-primary" />
              <Plane className="absolute left-1/2 -translate-x-1/2 h-6 w-6 -rotate-45 text-primary" />
            </div>
          </div>

          {/* Arrival */}
          <div className="flex-1 text-right">
            <div className="flex items-center justify-end gap-2">
              <div>
                <div className="text-2xl font-bold">{arrivalICAO || arrivalAirport}</div>
                {arrivalCity && (
                  <div className="text-sm text-muted-foreground">{arrivalCity}</div>
                )}
                {arrivalTime && (
                  <div className="mt-1 text-sm font-medium">{arrivalTime}</div>
                )}
              </div>
              <MapPin className="h-5 w-5 text-secondary" />
            </div>
          </div>
        </div>

        {/* Flight Duration */}
        {flightDuration && (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Flight duration: {flightDuration}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
