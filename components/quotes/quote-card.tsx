'use client';

/**
 * Quote Card Components
 *
 * Consolidated quote card implementations with composition pattern:
 * - QuoteCard: Full-featured card with animations, scores, and multiple actions
 * - SimpleQuoteCard: Lightweight card for message contexts and simple displays
 *
 * @module components/quotes/quote-card
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Star,
  Award,
  Clock,
  Users,
  Download,
  Share2,
  MessageSquare,
  CheckCircle2,
  TrendingUp,
  Plane,
  CheckCircle,
} from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { formatCurrency, formatTime, formatDuration } from '@/lib/utils/format';
import type { StrictQuote, SimpleQuote, QuoteAction } from './types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Props for the full-featured QuoteCard component
 */
export interface QuoteCardProps {
  quote: StrictQuote;
  onAction?: (action: QuoteAction, quote: StrictQuote) => void;
  isSelected?: boolean;
  showComparison?: boolean;
  className?: string;
}

/**
 * Props for the simplified QuoteCard component
 */
export interface SimpleQuoteCardProps {
  quote: SimpleQuote;
  onSelect?: (quoteId: string) => void;
  onViewDetails?: (quoteId: string) => void;
  className?: string;
}

/**
 * Props for flat-style quote display (backwards compatibility)
 */
export interface FlatQuoteCardProps {
  operatorName: string;
  aircraftType: string;
  price: number;
  currency?: string;
  score?: number;
  ranking?: number;
  totalQuotes?: number;
  departureTime?: string;
  arrivalTime?: string;
  flightDuration?: string;
  operatorRating?: number;
  isRecommended?: boolean;
  onSelect?: () => void;
  className?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get ranking badge color based on rank
 */
const getRankBadgeVariant = (rank: number): 'default' | 'secondary' | 'outline' => {
  if (rank === 1) return 'default';
  if (rank === 2) return 'secondary';
  return 'outline';
};

/**
 * Quote Card Component
 */
export const QuoteCard: React.FC<QuoteCardProps> = ({
  quote,
  onAction,
  isSelected = false,
  showComparison = false,
  className = '',
}) => {
  const handleAction = (action: QuoteAction) => {
    onAction?.(action, quote);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      <Card
        className={`relative overflow-hidden transition-all duration-200 ${
          isSelected ? 'ring-2 ring-primary' : ''
        } ${quote.recommended ? 'border-primary' : ''}`}
      >
        {/* Recommended Banner - accessible for screen readers */}
        {quote.recommended && (
          <div
            role="status"
            aria-live="polite"
            aria-label="This quote is recommended"
            className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 text-xs font-semibold rounded-bl-lg flex items-center gap-1"
          >
            <Award className="h-3 w-3" aria-hidden="true" />
            <span>RECOMMENDED</span>
          </div>
        )}

        {/* Rank Badge */}
        {quote.rank && quote.rank <= 3 && (
          <div className="absolute top-4 left-4 z-10">
            <Badge variant={getRankBadgeVariant(quote.rank)} className="text-lg font-bold px-3 py-1">
              #{quote.rank}
            </Badge>
          </div>
        )}

        <CardHeader className="pb-4">
          {/* Operator Info */}
          <div className="flex items-start gap-4 mt-8">
            <Avatar className="h-12 w-12">
              <AvatarImage src={quote.operator.logo} alt={quote.operator.name} />
              <AvatarFallback>{quote.operator.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{quote.operator.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                {/* Star rating with proper accessibility */}
                <div
                  role="img"
                  aria-label={`${quote.operator.rating.toFixed(1)} out of 5 stars rating`}
                  className="flex items-center"
                >
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      aria-hidden="true"
                      className={`h-3 w-3 ${
                        i < Math.floor(quote.operator.rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'fill-gray-200 text-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  {quote.operator.rating.toFixed(1)} ({quote.operator.totalFlights} flights)
                </span>
              </div>
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <span>{quote.operator.location}</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Aircraft Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Plane className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{quote.aircraft.type}</span>
              <span className="text-sm text-muted-foreground">({quote.aircraft.model})</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span>{quote.aircraft.capacity} seats</span>
              </div>
              <div className="text-muted-foreground">
                {quote.aircraft.year}
              </div>
              <div className="text-muted-foreground">
                {quote.aircraft.speed} mph
              </div>
            </div>
          </div>

          <Separator />

          {/* Flight Details */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {formatTime(quote.departureTime)} - {formatTime(quote.arrivalTime)}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                {formatDuration(quote.flightDuration)}
              </span>
            </div>
          </div>

          <Separator />

          {/* Pricing */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Base Price</span>
              <span className="text-sm">
                {formatCurrency(quote.pricing.basePrice, quote.pricing.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Taxes & Fees</span>
              <span className="text-sm">
                {formatCurrency(quote.pricing.taxes + quote.pricing.fees, quote.pricing.currency)}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="font-semibold">Total</span>
              <span className="text-2xl font-bold text-primary">
                {formatCurrency(quote.pricing.total, quote.pricing.currency)}
              </span>
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Score</span>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="font-semibold">{quote.scores.overall}/100</span>
              </div>
            </div>
            <Progress value={quote.scores.overall} className="h-2" />
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price</span>
                <span>{quote.scores.price}/100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Safety</span>
                <span>{quote.scores.safety}/100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quality</span>
                <span>{quote.scores.aircraftQuality}/100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Availability</span>
                <span>{quote.scores.availability}/100</span>
              </div>
            </div>
          </div>

          {/* Features */}
          {quote.features.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm font-medium">Features</span>
              <div className="flex flex-wrap gap-1">
                {quote.features.slice(0, 4).map((feature, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {feature}
                  </Badge>
                ))}
                {quote.features.length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{quote.features.length - 4} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Pros/Cons Summary */}
          {(quote.prosCons.pros.length > 0 || quote.prosCons.cons.length > 0) && (
            <div className="space-y-2">
              {quote.prosCons.pros.length > 0 && (
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground line-clamp-1">
                    {quote.prosCons.pros[0]}
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-4">
          {/* Primary Actions */}
          <div className="flex gap-2 w-full">
            <Button
              className="flex-1"
              onClick={() => handleAction('select')}
              variant={isSelected ? 'default' : 'outline'}
            >
              {isSelected ? 'Selected' : 'Select Quote'}
            </Button>
            {showComparison && (
              <Button
                variant="outline"
                onClick={() => handleAction('compare')}
              >
                Compare
              </Button>
            )}
          </div>

          {/* Secondary Actions */}
          <div className="flex gap-2 w-full">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={() => handleAction('download-pdf')}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={() => handleAction('add-note')}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Note
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={() => handleAction('share')}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

// =============================================================================
// SIMPLE QUOTE CARD - For message contexts and simple displays
// =============================================================================

/**
 * SimpleQuoteCard Component
 *
 * A lightweight quote card for use in message contexts where less detail is needed.
 * Uses the SimpleQuote type which has pre-formatted string values.
 */
export const SimpleQuoteCard: React.FC<SimpleQuoteCardProps> = ({
  quote,
  onSelect,
  onViewDetails,
  className,
}) => {
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
                {typeof price === 'number' ? `$${price.toLocaleString()}` : price}
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
};

// =============================================================================
// FLAT QUOTE CARD - For backwards compatibility with flat props
// =============================================================================

/**
 * FlatQuoteCard Component
 *
 * A quote card that accepts individual props instead of a quote object.
 * Provides backwards compatibility with the aviation/quote-card.tsx pattern.
 */
export const FlatQuoteCard: React.FC<FlatQuoteCardProps> = ({
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
}) => {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{operatorName}</CardTitle>
              {isRecommended && (
                <Badge variant="default">
                  Recommended
                </Badge>
              )}
              {ranking && (
                <Badge variant="secondary">
                  #{ranking} of {totalQuotes}
                </Badge>
              )}
            </div>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <Plane className="h-3 w-3" />
              {aircraftType}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(price, currency)}
            </div>
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
          <Button onClick={onSelect} className="w-full" variant={isRecommended ? 'default' : 'outline'}>
            Select Quote
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default QuoteCard;
