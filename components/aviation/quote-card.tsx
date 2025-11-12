/**
 * Quote Card Component
 * Displays flight quote with price, operator, and ranking information
 */

import type React from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { DollarSign, Star, Plane, Clock } from 'lucide-react'

export interface QuoteCardProps {
  operatorName: string
  aircraftType: string
  price: number
  currency?: string
  score?: number
  ranking?: number
  totalQuotes?: number
  departureTime?: string
  arrivalTime?: string
  flightDuration?: string
  operatorRating?: number
  isRecommended?: boolean
  onSelect?: () => void
  className?: string
}

export function QuoteCard({
  operatorName,
  aircraftType,
  price,
  currency = 'USD',
  score,
  ranking,
  totalQuotes,
  departureTime,
  arrivalTime,
  flightDuration,
  operatorRating,
  isRecommended = false,
  onSelect,
  className,
}: QuoteCardProps) {
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{operatorName}</CardTitle>
              {isRecommended && (
                <Badge variant="default" className="bg-accent">
                  Recommended
                </Badge>
              )}
              {ranking && (
                <Badge variant="secondary">
                  #{ranking} of {totalQuotes}
                </Badge>
              )}
            </div>
            <CardDescription className="mt-1 flex items-center gap-1">
              <Plane className="h-3 w-3" />
              {aircraftType}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{formatPrice(price)}</div>
            {operatorRating && (
              <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {operatorRating.toFixed(1)}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {score !== undefined && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">AI Score</span>
              <span className="font-medium">{score}/100</span>
            </div>
            <Progress value={score} className="h-2" />
          </div>
        )}

        {(departureTime || arrivalTime || flightDuration) && (
          <div className="flex items-center justify-between rounded-lg bg-muted p-3 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                {departureTime && <div className="font-medium">{departureTime}</div>}
                {flightDuration && (
                  <div className="text-xs text-muted-foreground">{flightDuration}</div>
                )}
              </div>
            </div>
            {arrivalTime && (
              <div className="text-right">
                <div className="font-medium">{arrivalTime}</div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {onSelect && (
        <CardFooter>
          <Button onClick={onSelect} className="w-full" variant={isRecommended ? "default" : "outline"}>
            Select Quote
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
