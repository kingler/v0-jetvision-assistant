/**
 * Quote Card Component
 *
 * Displays a single flight quote with operator details, pricing,
 * and timing information in a card format.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plane, Clock, Star, CheckCircle } from 'lucide-react';
import { QuoteCardComponent } from './types';

export interface QuoteCardProps {
  quote: QuoteCardComponent['quote'];
  onSelect?: (quoteId: string) => void;
  onViewDetails?: (quoteId: string) => void;
  className?: string;
}

export function QuoteCard({ quote, onSelect, onViewDetails, className }: QuoteCardProps) {
  const {
    id,
    operatorName,
    aircraftType,
    price,
    departureTime,
    arrivalTime,
    flightDuration,
    operatorRating,
    isRecommended,
    isSelected,
  } = quote;

  return (
    <Card className={`relative ${isSelected ? 'ring-2 ring-primary' : ''} ${className || ''}`}>
      {isRecommended && (
        <Badge className="absolute -top-2 -right-2 bg-green-500">
          Recommended
        </Badge>
      )}

      {isSelected && (
        <div className="absolute -top-2 -left-2">
          <CheckCircle className="h-6 w-6 text-primary fill-primary" />
        </div>
      )}

      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plane className="h-5 w-5" />
            <span>{operatorName}</span>
          </div>
          {operatorRating && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span>{operatorRating.toFixed(1)}</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Aircraft Type */}
        <div>
          <p className="text-sm text-muted-foreground">Aircraft</p>
          <p className="font-medium">{aircraftType}</p>
        </div>

        {/* Flight Times */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Departure</p>
            <p className="font-medium">{departureTime}</p>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm">{flightDuration}</span>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Arrival</p>
            <p className="font-medium">{arrivalTime}</p>
          </div>
        </div>

        {/* Price */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Price</p>
              <p className="text-2xl font-bold">
                ${price.toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2">
              {onViewDetails && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetails(id)}
                >
                  Details
                </Button>
              )}
              {onSelect && !isSelected && (
                <Button
                  size="sm"
                  onClick={() => onSelect(id)}
                >
                  Select
                </Button>
              )}
              {isSelected && (
                <Button size="sm" disabled>
                  Selected
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
