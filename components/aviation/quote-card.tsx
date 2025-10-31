/**
 * QuoteCard Component
 * Displays individual flight quote with operator details, pricing, and AI scoring
 * Can be used inline in chat or in dashboard views
 */

import type React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Star, Clock, Plane, TrendingUp, Check } from 'lucide-react'
import { PriceDisplay } from './price-display'

export interface QuoteCardProps {
  id?: string
  operatorName: string
  aircraftType: string
  price: number
  aiScore: number
  rank: number
  totalQuotes: number
  operatorRating: number
  departureTime: string
  arrivalTime: string
  flightDuration: string
  isRecommended?: boolean
  isSelected?: boolean
  onSelect?: () => void
  compact?: boolean
}

export function QuoteCard({
  operatorName,
  aircraftType,
  price,
  aiScore,
  rank,
  totalQuotes,
  operatorRating,
  departureTime,
  arrivalTime,
  flightDuration,
  isRecommended = false,
  isSelected = false,
  onSelect,
  compact = false,
}: QuoteCardProps) {
  return (
    <Card
      className={`
        relative transition-all
        ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'}
        ${isRecommended ? 'border-green-500' : ''}
      `}
    >
      {isRecommended && (
        <div className="absolute -top-2 -right-2">
          <Badge className="bg-green-500 text-white shadow-md">
            <TrendingUp className="w-3 h-3 mr-1" />
            AI Recommended
          </Badge>
        </div>
      )}

      <CardHeader className={compact ? 'pb-3' : ''}>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className={compact ? 'text-base' : 'text-lg'}>{operatorName}</CardTitle>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Plane className="w-3 h-3" />
              <span>{aircraftType}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-1 text-amber-500">
              <Star className="w-4 h-4 fill-current" />
              <span className="text-sm font-medium">{operatorRating.toFixed(1)}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Rank #{rank} of {totalQuotes}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Price Display */}
        <div className="flex items-baseline justify-between">
          <PriceDisplay amount={price} size={compact ? 'sm' : 'lg'} />
          <div className="text-right">
            <div className="text-xs text-muted-foreground">AI Score</div>
            <div className="text-lg font-bold text-blue-600">{aiScore}/100</div>
          </div>
        </div>

        {/* Flight Times */}
        {!compact && (
          <div className="flex items-center justify-between text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Departure</div>
              <div className="font-medium">{departureTime}</div>
            </div>
            <div className="flex items-center text-muted-foreground">
              <Clock className="w-4 h-4 mr-1" />
              <span>{flightDuration}</span>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Arrival</div>
              <div className="font-medium">{arrivalTime}</div>
            </div>
          </div>
        )}

        {/* Action Button */}
        {onSelect && (
          <Button
            onClick={onSelect}
            variant={isSelected ? 'default' : 'outline'}
            className="w-full"
            size={compact ? 'sm' : 'default'}
          >
            {isSelected ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Selected
              </>
            ) : (
              'Select This Quote'
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
