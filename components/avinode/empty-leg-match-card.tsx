/**
 * EmptyLegMatchCard (ONEK-202)
 *
 * Displays a single empty leg flight match with aircraft, pricing,
 * operator details, and action buttons (viewed/interested).
 */

'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Plane,
  Calendar,
  DollarSign,
  Star,
  Eye,
  ExternalLink,
  TrendingDown,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface EmptyLegMatchData {
  match_id: string;
  watch_id: string;
  empty_leg_id: string;
  departure: {
    airport: string;
    name?: string;
    city?: string;
    date: string;
    time?: string;
  };
  arrival: {
    airport: string;
    name?: string;
    city?: string;
  };
  price: number;
  currency: string;
  discount_percentage?: number;
  regular_price?: number;
  aircraft: {
    type: string;
    model: string;
    category: string;
    capacity: number;
    registration?: string;
  };
  operator: {
    id: string;
    name: string;
    rating?: number;
  };
  viewed: boolean;
  interested: boolean;
  matched_at: string;
  valid_until?: string;
  deep_link?: string;
}

export interface EmptyLegMatchCardProps {
  match: EmptyLegMatchData;
  onMarkViewed?: (matchId: string) => void;
  onMarkInterested?: (matchId: string) => void;
  onViewInAvinode?: (deepLink: string) => void;
}

// =============================================================================
// Helpers
// =============================================================================

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function renderRating(rating: number): string {
  return `${'★'.repeat(Math.round(rating))}${'☆'.repeat(5 - Math.round(rating))}`;
}

// =============================================================================
// Component
// =============================================================================

export const EmptyLegMatchCard: React.FC<EmptyLegMatchCardProps> = ({
  match,
  onMarkViewed,
  onMarkInterested,
  onViewInAvinode,
}) => {
  return (
    <Card
      className={`overflow-hidden transition-opacity ${match.viewed ? 'opacity-75' : ''}`}
      data-testid="empty-leg-match-card"
    >
      <CardContent className="p-4 space-y-3">
        {/* Route + date */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plane className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">
              {match.departure.airport} → {match.arrival.airport}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {match.interested && (
              <Badge variant="default" className="text-xs">
                <Star className="h-3 w-3 mr-1" />
                Interested
              </Badge>
            )}
            {match.viewed && !match.interested && (
              <Badge variant="secondary" className="text-xs">
                Viewed
              </Badge>
            )}
          </div>
        </div>

        {/* Date + time */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>{formatDate(match.departure.date)}</span>
          {match.departure.time && (
            <span className="text-xs">at {match.departure.time}</span>
          )}
        </div>

        {/* Aircraft + operator */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Aircraft</p>
            <p className="font-medium text-foreground">{match.aircraft.type}</p>
            <p className="text-xs text-muted-foreground">
              {match.aircraft.category} · {match.aircraft.capacity} pax
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Operator</p>
            <p className="font-medium text-foreground">{match.operator.name}</p>
            {match.operator.rating && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                {renderRating(match.operator.rating)}
              </p>
            )}
          </div>
        </div>

        {/* Pricing */}
        <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2.5">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <span className="text-lg font-bold text-foreground">
              {formatPrice(match.price, match.currency)}
            </span>
          </div>
          {match.discount_percentage && match.discount_percentage > 0 && (
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <TrendingDown className="h-3.5 w-3.5" />
              <span className="text-sm font-medium">
                {match.discount_percentage}% off
              </span>
              {match.regular_price && (
                <span className="text-xs text-muted-foreground line-through ml-1">
                  {formatPrice(match.regular_price, match.currency)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Valid until */}
        {match.valid_until && (
          <p className="text-xs text-muted-foreground">
            Available until {formatDate(match.valid_until)}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          {!match.viewed && onMarkViewed && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMarkViewed(match.match_id)}
              data-testid="mark-viewed-btn"
            >
              <Eye className="h-3.5 w-3.5 mr-1" />
              Mark Viewed
            </Button>
          )}
          {!match.interested && onMarkInterested && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onMarkInterested(match.match_id)}
              data-testid="mark-interested-btn"
            >
              <Star className="h-3.5 w-3.5 mr-1" />
              Interested
            </Button>
          )}
          {match.deep_link && onViewInAvinode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewInAvinode(match.deep_link!)}
              className="ml-auto"
              data-testid="view-avinode-btn"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              Open in Avinode
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
