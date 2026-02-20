/**
 * EmptyLegMatchViewer (ONEK-202)
 *
 * Displays matches for a specific empty leg watch.
 * Shows match count, unviewed badge, sort controls, and match cards.
 * Registered in tool-ui-registry for `get_watch_matches` tool.
 */

'use client';

import React, { useState } from 'react';
import type { UIActionResult } from '@mcp-ui/server';
import { EmptyLegMatchCard, type EmptyLegMatchData } from './empty-leg-match-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plane, ArrowUpDown, Eye } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export type MatchSortKey = 'price' | 'date' | 'discount';

export interface EmptyLegMatchViewerProps {
  watchId: string;
  matches: EmptyLegMatchData[];
  totalCount: number;
  unviewedCount: number;
  onAction?: (action: UIActionResult) => void;
}

// =============================================================================
// Component
// =============================================================================

export const EmptyLegMatchViewer: React.FC<EmptyLegMatchViewerProps> = ({
  watchId,
  matches,
  totalCount,
  unviewedCount,
  onAction,
}) => {
  const [sortBy, setSortBy] = useState<MatchSortKey>('date');

  const sortedMatches = [...matches].sort((a, b) => {
    switch (sortBy) {
      case 'price':
        return a.price - b.price;
      case 'discount':
        return (b.discount_percentage || 0) - (a.discount_percentage || 0);
      case 'date':
      default:
        return new Date(a.departure.date).getTime() - new Date(b.departure.date).getTime();
    }
  });

  const handleMarkViewed = (matchId: string) => {
    onAction?.({
      type: 'tool',
      payload: {
        toolName: 'mark_match',
        params: { match_id: matchId, viewed: true },
      },
    });
  };

  const handleMarkInterested = (matchId: string) => {
    onAction?.({
      type: 'tool',
      payload: {
        toolName: 'mark_match',
        params: { match_id: matchId, interested: true },
      },
    });
  };

  const handleViewInAvinode = (deepLink: string) => {
    onAction?.({ type: 'link', payload: { url: deepLink } });
  };

  if (matches.length === 0) {
    return (
      <div
        className="text-center py-8 text-muted-foreground"
        data-testid="empty-leg-match-viewer-empty"
      >
        <Plane className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No matches found for this watch yet.</p>
        <p className="text-xs mt-1">
          We&apos;ll notify you when matching empty leg flights become available.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="empty-leg-match-viewer">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            Matches ({totalCount})
          </h3>
          {unviewedCount > 0 && (
            <Badge variant="default" className="text-xs">
              <Eye className="h-3 w-3 mr-1" />
              {unviewedCount} new
            </Badge>
          )}
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-1">
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          {(['date', 'price', 'discount'] as MatchSortKey[]).map((key) => (
            <Button
              key={key}
              variant={sortBy === key ? 'secondary' : 'ghost'}
              size="sm"
              className="text-xs h-7 px-2"
              onClick={() => setSortBy(key)}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Match cards */}
      <div className="grid gap-3">
        {sortedMatches.map((match) => (
          <EmptyLegMatchCard
            key={match.match_id}
            match={match}
            onMarkViewed={handleMarkViewed}
            onMarkInterested={handleMarkInterested}
            onViewInAvinode={handleViewInAvinode}
          />
        ))}
      </div>
    </div>
  );
};
