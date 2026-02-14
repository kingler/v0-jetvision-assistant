/**
 * Quote Comparison Component
 *
 * Displays multiple flight quotes in a comparison view,
 * allowing users to compare pricing and features side-by-side.
 * Supports leg grouping for round-trip and multi-city trips.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, CheckCircle } from 'lucide-react';
import { QuoteComparisonComponent } from './types';

export interface QuoteComparisonProps {
  quotes: QuoteComparisonComponent['quotes'];
  onSelectQuote?: (quoteId: string) => void;
  onCompare?: () => void;
  className?: string;
}

/**
 * Get display label for a leg group
 */
function getLegLabel(legSequence: number | undefined, legType: string | undefined): string {
  if (legType === 'outbound') return 'Outbound';
  if (legType === 'return') return 'Return';
  if (legSequence && legSequence >= 3) return `Leg ${legSequence}`;
  if (legSequence === 1) return 'Outbound';
  if (legSequence === 2) return 'Return';
  return '';
}

/**
 * Group quotes by leg sequence/type. Returns null if no leg info exists (one-way).
 */
function groupQuotesByLeg(
  quotes: QuoteComparisonComponent['quotes']
): Map<number, QuoteComparisonComponent['quotes']> | null {
  const hasLegInfo = quotes.some((q) => q.legSequence || q.legType);
  if (!hasLegInfo) return null;

  const groups = new Map<number, QuoteComparisonComponent['quotes']>();
  for (const quote of quotes) {
    const seq = quote.legSequence ||
      (quote.legType === 'return' ? 2 : quote.legType === 'outbound' ? 1 : 0);
    if (!groups.has(seq)) {
      groups.set(seq, []);
    }
    groups.get(seq)!.push(quote);
  }
  return groups;
}

function QuoteGrid({
  quotes,
  onSelectQuote,
}: {
  quotes: QuoteComparisonComponent['quotes'];
  onSelectQuote?: (quoteId: string) => void;
}) {
  const sortedQuotes = [...quotes].sort((a, b) => a.price - b.price);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sortedQuotes.map((quote, index) => {
        const isLowestPrice = index === 0;

        return (
          <Card
            key={quote.id}
            className={`relative ${quote.isRecommended ? 'ring-2 ring-primary' : ''}`}
          >
            {quote.isRecommended && (
              <Badge className="absolute -top-2 -right-2 bg-success">
                Best Value
              </Badge>
            )}

            {isLowestPrice && !quote.isRecommended && (
              <Badge className="absolute -top-2 -right-2 bg-primary">
                Lowest Price
              </Badge>
            )}

            <CardHeader>
              <CardTitle className="text-base">{quote.operatorName}</CardTitle>
              <p className="text-sm text-muted-foreground">{quote.aircraftType}</p>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Price */}
              <div>
                <p className="text-sm text-muted-foreground">Price</p>
                <p className="text-xl font-bold">${quote.price.toLocaleString()}</p>
              </div>

              {/* Flight Times - Compact */}
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Depart:</span>
                  <span className="font-medium">{quote.departureTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Arrive:</span>
                  <span className="font-medium">{quote.arrivalTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium">{quote.flightDuration}</span>
                </div>
              </div>

              {/* Score */}
              {quote.score !== undefined && (
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Match Score</span>
                    <span className="font-semibold text-primary">
                      {quote.score}/100
                    </span>
                  </div>
                </div>
              )}

              {/* Select Button */}
              {onSelectQuote && (
                <Button
                  className="w-full"
                  size="sm"
                  variant={quote.isRecommended ? 'default' : 'outline'}
                  onClick={() => onSelectQuote(quote.id)}
                >
                  Select Quote
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function QuoteComparison({ quotes, onSelectQuote, onCompare, className }: QuoteComparisonProps) {
  const sortedQuotes = [...quotes].sort((a, b) => a.price - b.price);
  const legGroups = groupQuotesByLeg(quotes);

  return (
    <div className={`space-y-4 ${className || ''}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-base md:text-lg font-semibold">
          Quote Comparison ({quotes.length} options)
        </h3>
        {onCompare && (
          <Button variant="outline" size="sm" onClick={onCompare} className="min-h-[44px] md:min-h-0">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            Detailed Compare
          </Button>
        )}
      </div>

      {legGroups ? (
        // Multi-leg: render grouped by leg with section headers
        <div className="space-y-6">
          {Array.from(legGroups.entries())
            .sort(([a], [b]) => a - b)
            .map(([seq, legQuotes]) => {
              const firstQuote = legQuotes[0];
              const label = getLegLabel(seq, firstQuote?.legType);
              return (
                <div key={seq} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-foreground">
                      {label || `Leg ${seq}`}
                    </h4>
                    <Badge variant="outline" className="text-xs">
                      {legQuotes.length} quote{legQuotes.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <QuoteGrid quotes={legQuotes} onSelectQuote={onSelectQuote} />
                </div>
              );
            })}
        </div>
      ) : (
        // Single-leg / one-way: flat grid
        <QuoteGrid quotes={sortedQuotes} onSelectQuote={onSelectQuote} />
      )}

      {/* Summary */}
      <div className="text-sm text-muted-foreground text-center pt-2">
        Price range: ${sortedQuotes[0]?.price.toLocaleString()} - $
        {sortedQuotes[sortedQuotes.length - 1]?.price.toLocaleString()}
      </div>
    </div>
  );
}
