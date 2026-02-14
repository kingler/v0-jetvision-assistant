/**
 * Hot Opportunities Component
 *
 * Displays high-priority deals that need immediate attention
 * with countdown timers and urgency indicators.
 */

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Flame,
  Clock,
  Plane,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import type { HotOpportunity } from './types';

export interface HotOpportunitiesProps {
  opportunities: HotOpportunity[];
  onViewOpportunity?: (opportunityId: string) => void;
  onViewAll?: () => void;
  maxDisplay?: number;
  className?: string;
}

/**
 * Formats a numeric value as currency
 * @param value - The numeric value to format
 * @param currency - The currency code (default: 'USD')
 * @returns Formatted currency string
 */
function formatCurrency(value: number, currency: string = 'USD'): string {
  // Validate input
  if (!Number.isFinite(value)) {
    return '$0';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Calculates time remaining until expiration
 * @param expiresAt - ISO date string for expiration time
 * @returns Object with hours, minutes, isExpired flag, and display label
 */
function getTimeRemaining(expiresAt: string): {
  hours: number;
  minutes: number;
  isExpired: boolean;
  label: string;
} {
  const now = new Date();
  const expiry = new Date(expiresAt);

  // Validate date parsing
  if (isNaN(expiry.getTime())) {
    return { hours: 0, minutes: 0, isExpired: true, label: 'Invalid Date' };
  }

  const diffMs = expiry.getTime() - now.getTime();

  if (diffMs <= 0) {
    return { hours: 0, minutes: 0, isExpired: true, label: 'Expired' };
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  let label: string;
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    label = `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    label = `${hours}h ${minutes}m`;
  } else {
    label = `${minutes}m`;
  }

  return { hours, minutes, isExpired: false, label };
}

function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [timeRemaining, setTimeRemaining] = useState(() =>
    getTimeRemaining(expiresAt)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemaining(expiresAt));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [expiresAt]);

  const { label, isExpired, hours } = timeRemaining;
  const isUrgent = hours < 2;
  const isCritical = hours < 1;

  return (
    <div
      className={cn(
        'flex items-center gap-1 text-xs font-medium',
        isExpired && 'text-destructive',
        isCritical && !isExpired && 'text-destructive animate-pulse',
        isUrgent && !isCritical && !isExpired && 'text-warning',
        !isUrgent && !isExpired && 'text-muted-foreground'
      )}
    >
      <Clock className="h-3 w-3" />
      <span>{isExpired ? 'Expired' : `Expires in ${label}`}</span>
    </div>
  );
}

function OpportunityCard({
  opportunity,
  onView,
}: {
  opportunity: HotOpportunity;
  onView?: () => void;
}) {
  const urgencyConfig = {
    critical: {
      borderColor: 'border-l-destructive',
      bgColor: 'bg-destructive/5',
      badgeVariant: 'destructive' as const,
    },
    high: {
      borderColor: 'border-l-warning',
      bgColor: 'bg-warning/5',
      badgeVariant: 'default' as const,
    },
    medium: {
      borderColor: 'border-l-status-payment-pending',
      bgColor: 'bg-status-payment-pending/5',
      badgeVariant: 'secondary' as const,
    },
  };

  const config = urgencyConfig[opportunity.urgencyLevel];

  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border border-l-4',
        'hover:bg-surface-secondary transition-colors cursor-pointer',
        config.borderColor,
        config.bgColor
      )}
      onClick={onView}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex items-center gap-1 font-medium">
          <Plane className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{opportunity.departureAirport}</span>
          <span className="text-muted-foreground">→</span>
          <span className="text-sm">{opportunity.arrivalAirport}</span>
        </div>

        {opportunity.clientName && (
          <span className="hidden sm:block text-xs text-muted-foreground truncate max-w-[120px]">
            {opportunity.clientName}
          </span>
        )}

        <CountdownTimer expiresAt={opportunity.expiresAt} />
      </div>

      <div className="flex items-center gap-2">
        <span className="font-semibold text-sm">
          {formatCurrency(opportunity.value, opportunity.currency)}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}

export function HotOpportunities({
  opportunities,
  onViewOpportunity,
  onViewAll,
  maxDisplay = 3,
  className,
}: HotOpportunitiesProps) {
  const displayedOpportunities = opportunities.slice(0, maxDisplay);
  const hasMore = opportunities.length > maxDisplay;

  if (opportunities.length === 0) {
    return (
      <div className={cn('w-full', className)}>
        <div className="flex items-center gap-2 mb-3">
          <Flame className="h-4 w-4 text-warning" />
          <h4 className="font-medium text-sm text-muted-foreground">
            Hot Opportunities
          </h4>
        </div>
        <div className="text-center py-4 text-muted-foreground text-sm border rounded-lg bg-muted/20">
          No hot opportunities at the moment
        </div>
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-warning" />
          <h4 className="font-medium text-sm text-muted-foreground">
            Hot Opportunities
          </h4>
          <Badge variant="secondary" className="text-xs">
            {opportunities.length}
          </Badge>
        </div>
        {onViewAll && hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={onViewAll}
          >
            View All
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {displayedOpportunities.map((opportunity) => (
          <OpportunityCard
            key={opportunity.id}
            opportunity={opportunity}
            onView={() => onViewOpportunity?.(opportunity.id)}
          />
        ))}
      </div>

      {hasMore && (
        <div className="mt-2 text-center">
          <span className="text-xs text-muted-foreground">
            +{opportunities.length - maxDisplay} more opportunities
          </span>
        </div>
      )}
    </div>
  );
}
