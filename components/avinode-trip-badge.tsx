/**
 * Avinode Trip Badge Component
 *
 * Displays an Avinode Trip ID with an optional clickable deep link.
 * Used in chat sidebar and header to show active trip information.
 */

'use client';

import * as React from 'react';
import { ExternalLink, Plane } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface AvinodeTripBadgeProps {
  /** The Avinode trip ID to display */
  tripId?: string;
  /** Deep link URL to open in Avinode Web UI */
  deepLink?: string;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional CSS classes */
  className?: string;
}

/**
 * AvinodeTripBadge - Displays Trip ID with optional deep link
 *
 * When a deepLink is provided, the badge becomes clickable and opens
 * the Avinode Web UI in a new tab.
 */
export function AvinodeTripBadge({
  tripId,
  deepLink,
  size = 'sm',
  className,
}: AvinodeTripBadgeProps) {
  const hasTrip = tripId && tripId.trim().length > 0;
  const isClickable = hasTrip && deepLink;

  const handleClick = React.useCallback(() => {
    if (deepLink) {
      window.open(deepLink, '_blank', 'noopener,noreferrer');
    }
  }, [deepLink]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' && deepLink) {
        window.open(deepLink, '_blank', 'noopener,noreferrer');
      }
    },
    [deepLink]
  );

  const sizeClasses = size === 'md' ? 'text-sm px-2.5 py-1' : 'text-xs';

  const content = (
    <>
      <Plane className="h-3 w-3" aria-hidden="true" />
      <span>{hasTrip ? tripId : 'No trip'}</span>
      {isClickable && <ExternalLink className="h-3 w-3" aria-hidden="true" />}
    </>
  );

  if (isClickable) {
    return (
      <Badge
        variant="outline"
        className={cn(
          sizeClasses,
          'cursor-pointer hover:bg-accent transition-colors',
          className
        )}
        role="button"
        tabIndex={0}
        aria-label={`Open trip ${tripId} in Avinode`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        {content}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(sizeClasses, 'text-muted-foreground', className)}
    >
      {content}
    </Badge>
  );
}
