import React from 'react';
import { Button } from '@/components/ui/button';
import type { WebhookStatus } from './types';

export interface WebhookStatusIndicatorProps {
  /** Current webhook connection status */
  status: WebhookStatus;
  /** Timestamp of the last successful update */
  lastUpdate?: Date;
  /** Callback for manual refresh action - supports both sync and async functions */
  onRefresh?: () => void | Promise<void>;
  /** Whether a refresh operation is in progress */
  isRefreshing?: boolean;
}

/**
 * Displays the real-time status of webhook connections with three states:
 * - Connected (green): Live updates are active
 * - Delayed (yellow): Updates may be delayed, shows time since last update
 * - Disconnected (red): Live updates are unavailable
 *
 * @component
 * @example
 * ```tsx
 * <WebhookStatusIndicator
 *   status="delayed"
 *   lastUpdate={new Date()}
 *   onRefresh={handleRefresh}
 *   isRefreshing={false}
 * />
 * ```
 */
export function WebhookStatusIndicator({
  status,
  lastUpdate,
  onRefresh,
  isRefreshing = false,
}: WebhookStatusIndicatorProps) {
  /**
   * Formats the time difference between now and lastUpdate into a human-readable string
   */
  const formatTimeAgo = (date: Date): string => {
    const now = Date.now();
    const diff = now - date.getTime();
    const minutes = Math.floor(diff / (60 * 1000));
    const hours = Math.floor(diff / (60 * 60 * 1000));

    if (minutes < 1) {
      return 'less than a minute ago';
    } else if (minutes < 60) {
      return `${minutes} min ago`;
    } else {
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          emoji: '🟢',
          text: 'Live updates active',
          showRefresh: false,
          showLastUpdate: false,
        };
      case 'delayed':
        return {
          emoji: '🟡',
          text: 'Updates may be delayed',
          showRefresh: true,
          showLastUpdate: true,
        };
      case 'disconnected':
        return {
          emoji: '🔴',
          text: 'Live updates unavailable',
          showRefresh: true,
          showLastUpdate: false,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      className="flex items-center gap-2 text-sm text-muted-foreground"
      role="status"
      aria-live="polite"
      aria-label={`Webhook connection status: ${status}`}
    >
      <span aria-hidden="true">{config.emoji}</span>
      <span>{config.text}</span>

      {config.showLastUpdate && lastUpdate && (
        <>
          <span aria-hidden="true">•</span>
          <span>Last update: {formatTimeAgo(lastUpdate)}</span>
        </>
      )}

      {config.showRefresh && onRefresh && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-busy={isRefreshing}
          className="h-6 px-2 text-xs"
        >
          {status === 'disconnected' ? 'Manual Refresh' : 'Refresh'}
        </Button>
      )}
    </div>
  );
}
