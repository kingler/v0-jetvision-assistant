/**
 * Aircraft Card Component
 * Displays aircraft information with image, type, and specifications
 */

import type React from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plane } from 'lucide-react'

export interface AircraftCardProps {
  aircraftType: string
  manufacturer?: string
  model?: string
  year?: number
  passengerCapacity?: number
  range?: number
  speed?: number
  imageUrl?: string
  isAvailable?: boolean
  className?: string
}

export function AircraftCard({
  aircraftType,
  manufacturer,
  model,
  year,
  passengerCapacity,
  range,
  speed,
  imageUrl,
  isAvailable = true,
  className,
}: AircraftCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Plane className="h-5 w-5 text-primary" />
            <CardTitle>{aircraftType}</CardTitle>
          </div>
          {isAvailable && (
            <Badge variant="default" className="bg-secondary">
              Available
            </Badge>
          )}
          {!isAvailable && (
            <Badge variant="secondary">
              Unavailable
            </Badge>
          )}
        </div>
        {(manufacturer || model) && (
          <CardDescription>
            {manufacturer} {model}
          </CardDescription>
        )}
      </CardHeader>

      {imageUrl && (
        <div className="relative h-48 w-full overflow-hidden">
          <img
            src={imageUrl}
            alt={aircraftType}
            className="h-full w-full object-cover transition-transform hover:scale-105"
          />
        </div>
      )}

      <CardContent className="grid gap-2 pt-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          {year && (
            <div>
              <span className="text-muted-foreground">Year:</span>{' '}
              <span className="font-medium">{year}</span>
            </div>
          )}
          {passengerCapacity && (
            <div>
              <span className="text-muted-foreground">Passengers:</span>{' '}
              <span className="font-medium">{passengerCapacity}</span>
            </div>
          )}
          {range && (
            <div>
              <span className="text-muted-foreground">Range:</span>{' '}
              <span className="font-medium">{range.toLocaleString()} nm</span>
            </div>
          )}
          {speed && (
            <div>
              <span className="text-muted-foreground">Speed:</span>{' '}
              <span className="font-medium">{speed} kts</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
