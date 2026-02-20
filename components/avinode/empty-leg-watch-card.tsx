/**
 * EmptyLegWatchCard (ONEK-202)
 *
 * Displays a single empty leg watch subscription as a card.
 * Shows route, date range, status, match count, and management actions.
 */

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Plane,
  Calendar,
  Users,
  DollarSign,
  Eye,
  Pause,
  Play,
  Trash2,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface EmptyLegWatch {
  watch_id: string;
  status: 'active' | 'paused' | 'expired' | 'cancelled';
  departure_airport: string;
  arrival_airport: string;
  date_range: { start: string; end: string };
  passengers: number;
  max_price?: number;
  aircraft_categories?: string[];
  created_at: string;
  expires_at: string;
  matches_count: number;
}

export interface EmptyLegWatchCardProps {
  watch: EmptyLegWatch;
  onViewMatches?: (watchId: string) => void;
  onPause?: (watchId: string) => void;
  onResume?: (watchId: string) => void;
  onCancel?: (watchId: string) => void;
}

// =============================================================================
// Helpers
// =============================================================================

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  expired: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

// =============================================================================
// Component
// =============================================================================

export const EmptyLegWatchCard: React.FC<EmptyLegWatchCardProps> = ({
  watch,
  onViewMatches,
  onPause,
  onResume,
  onCancel,
}) => {
  const isActive = watch.status === 'active';
  const isPaused = watch.status === 'paused';

  return (
    <Card className="overflow-hidden" data-testid="empty-leg-watch-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Plane className="h-4 w-4 text-primary" />
            {watch.departure_airport} → {watch.arrival_airport}
          </CardTitle>
          <Badge
            className={`text-xs ${STATUS_COLORS[watch.status] || STATUS_COLORS.expired}`}
            variant="secondary"
          >
            {watch.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Date range */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>
            {formatDate(watch.date_range.start)} – {formatDate(watch.date_range.end)}
          </span>
        </div>

        {/* Details row */}
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {watch.passengers} pax
          </span>
          {watch.max_price && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              Max ${watch.max_price.toLocaleString()}
            </span>
          )}
          {watch.aircraft_categories && watch.aircraft_categories.length > 0 && (
            <span className="text-xs">
              {watch.aircraft_categories.join(', ')}
            </span>
          )}
        </div>

        {/* Match count + actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <button
            onClick={() => onViewMatches?.(watch.watch_id)}
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            data-testid="view-matches-btn"
          >
            <Eye className="h-3.5 w-3.5" />
            {watch.matches_count} match{watch.matches_count !== 1 ? 'es' : ''}
          </button>

          <div className="flex items-center gap-1">
            {isActive && onPause && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPause(watch.watch_id)}
                title="Pause watch"
                data-testid="pause-watch-btn"
              >
                <Pause className="h-3.5 w-3.5" />
              </Button>
            )}
            {isPaused && onResume && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onResume(watch.watch_id)}
                title="Resume watch"
                data-testid="resume-watch-btn"
              >
                <Play className="h-3.5 w-3.5" />
              </Button>
            )}
            {(isActive || isPaused) && onCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCancel(watch.watch_id)}
                title="Cancel watch"
                className="text-destructive hover:text-destructive"
                data-testid="cancel-watch-btn"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
