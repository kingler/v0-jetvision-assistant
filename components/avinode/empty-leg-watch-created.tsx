/**
 * EmptyLegWatchCreated (ONEK-202)
 *
 * Confirmation component shown after `create_empty_leg_watch` tool succeeds.
 * Shows the watch details and provides a link to view matches.
 * Registered in tool-ui-registry for `create_empty_leg_watch` tool.
 */

'use client';

import React from 'react';
import type { UIActionResult } from '@mcp-ui/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Plane, Calendar, Users, DollarSign, Eye } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface EmptyLegWatchCreatedProps {
  watchId: string;
  status: string;
  departureAirport: string;
  arrivalAirport: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  passengers: number;
  maxPrice?: number;
  aircraftCategories?: string[];
  matchesCount: number;
  onAction?: (action: UIActionResult) => void;
}

// =============================================================================
// Helpers
// =============================================================================

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// =============================================================================
// Component
// =============================================================================

export const EmptyLegWatchCreated: React.FC<EmptyLegWatchCreatedProps> = ({
  watchId,
  status,
  departureAirport,
  arrivalAirport,
  dateRangeStart,
  dateRangeEnd,
  passengers,
  maxPrice,
  aircraftCategories,
  matchesCount,
  onAction,
}) => {
  const handleViewMatches = () => {
    onAction?.({
      type: 'tool',
      payload: { toolName: 'get_watch_matches', params: { watch_id: watchId } },
    });
  };

  const handleViewAll = () => {
    onAction?.({
      type: 'tool',
      payload: { toolName: 'get_empty_leg_watches', params: {} },
    });
  };

  return (
    <Card data-testid="empty-leg-watch-created">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          Empty Leg Watch Created
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Route */}
        <div className="flex items-center gap-2">
          <Plane className="h-4 w-4 text-primary" />
          <span className="font-semibold text-foreground">
            {departureAirport} → {arrivalAirport}
          </span>
          <Badge variant="secondary" className="text-xs">
            {status}
          </Badge>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(dateRangeStart)} – {formatDate(dateRangeEnd)}
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {passengers} passengers
          </div>
          {maxPrice && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5" />
              Max ${maxPrice.toLocaleString()}
            </div>
          )}
          {aircraftCategories && aircraftCategories.length > 0 && (
            <div className="text-muted-foreground text-xs">
              Categories: {aircraftCategories.join(', ')}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          {matchesCount > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={handleViewMatches}
              data-testid="view-matches-btn"
            >
              <Eye className="h-3.5 w-3.5 mr-1" />
              View {matchesCount} match{matchesCount !== 1 ? 'es' : ''}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleViewAll}>
            View All Watches
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          You&apos;ll be notified when matching empty leg flights become available.
        </p>
      </CardContent>
    </Card>
  );
};
