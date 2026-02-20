/**
 * EmptyLegWatchList (ONEK-202)
 *
 * Displays all active empty leg watches as a dashboard.
 * Renders EmptyLegWatchCard components in a grid.
 * Registered in tool-ui-registry for `get_empty_leg_watches` tool.
 */

'use client';

import React from 'react';
import type { UIActionResult } from '@mcp-ui/server';
import { EmptyLegWatchCard, type EmptyLegWatch } from './empty-leg-watch-card';
import { Plane } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface EmptyLegWatchListProps {
  watches: EmptyLegWatch[];
  onAction?: (action: UIActionResult) => void;
}

// =============================================================================
// Component
// =============================================================================

export const EmptyLegWatchList: React.FC<EmptyLegWatchListProps> = ({
  watches,
  onAction,
}) => {
  const handleViewMatches = (watchId: string) => {
    onAction?.({
      type: 'tool',
      payload: { toolName: 'get_watch_matches', params: { watch_id: watchId } },
    });
  };

  const handlePause = (watchId: string) => {
    onAction?.({
      type: 'tool',
      payload: {
        toolName: 'update_empty_leg_watch',
        params: { watch_id: watchId, status: 'paused' },
      },
    });
  };

  const handleResume = (watchId: string) => {
    onAction?.({
      type: 'tool',
      payload: {
        toolName: 'update_empty_leg_watch',
        params: { watch_id: watchId, status: 'active' },
      },
    });
  };

  const handleCancel = (watchId: string) => {
    onAction?.({
      type: 'tool',
      payload: {
        toolName: 'delete_empty_leg_watch',
        params: { watch_id: watchId },
      },
    });
  };

  if (watches.length === 0) {
    return (
      <div
        className="text-center py-8 text-muted-foreground"
        data-testid="empty-leg-watch-list-empty"
      >
        <Plane className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No empty leg watches yet.</p>
        <p className="text-xs mt-1">
          Ask me to create a watch for a specific route and date range.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="empty-leg-watch-list">
      <div className="flex items-center gap-2 mb-3">
        <Plane className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          Empty Leg Watches ({watches.length})
        </h3>
      </div>
      <div className="grid gap-3">
        {watches.map((watch) => (
          <EmptyLegWatchCard
            key={watch.watch_id}
            watch={watch}
            onViewMatches={handleViewMatches}
            onPause={handlePause}
            onResume={handleResume}
            onCancel={handleCancel}
          />
        ))}
      </div>
    </div>
  );
};
