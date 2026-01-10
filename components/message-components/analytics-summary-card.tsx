/**
 * Analytics Summary Card Component
 *
 * Displays key performance metrics with trend indicators:
 * - Success Rate
 * - Conversion Rate
 * - Average Deal Value
 * - Average Time to Close
 */

import React from 'react';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  DollarSign,
  Clock,
  BarChart3,
} from 'lucide-react';
import type { AnalyticsSummary } from './types';

export interface AnalyticsSummaryCardProps {
  analytics: AnalyticsSummary;
  className?: string;
}

interface MetricCardProps {
  label: string;
  value: string;
  delta: number;
  deltaLabel?: string;
  icon: React.ElementType;
  iconColor: string;
  iconBgColor: string;
}

function TrendIndicator({ delta, label }: { delta: number; label?: string }) {
  if (delta === 0) {
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Minus className="h-3 w-3" />
        <span className="text-[10px]">{label || 'No change'}</span>
      </div>
    );
  }

  const isPositive = delta > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const colorClass = isPositive ? 'text-green-600' : 'text-red-600';

  return (
    <div className={cn('flex items-center gap-1', colorClass)}>
      <Icon className="h-3 w-3" />
      <span className="text-[10px]">
        {isPositive ? '+' : ''}{delta.toFixed(1)}%
      </span>
    </div>
  );
}

function MetricCard({
  label,
  value,
  delta,
  deltaLabel,
  icon: Icon,
  iconColor,
  iconBgColor,
}: MetricCardProps) {
  return (
    <div className="flex flex-col items-center p-3 rounded-lg border bg-card">
      <div className={cn('p-2 rounded-full mb-2', iconBgColor)}>
        <Icon className={cn('h-4 w-4', iconColor)} />
      </div>
      <span className="text-2xl font-bold">{value}</span>
      <span className="text-xs text-muted-foreground text-center mb-1">
        {label}
      </span>
      <TrendIndicator delta={delta} label={deltaLabel} />
    </div>
  );
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

function formatDays(value: number): string {
  if (value < 1) {
    const hours = Math.round(value * 24);
    return `${hours}h`;
  }
  return `${value.toFixed(1)}d`;
}

export function AnalyticsSummaryCard({
  analytics,
  className,
}: AnalyticsSummaryCardProps) {
  const metrics: MetricCardProps[] = [
    {
      label: 'Success Rate',
      value: `${analytics.successRate.toFixed(0)}%`,
      delta: analytics.periodComparison.successRateDelta,
      icon: Target,
      iconColor: 'text-green-500',
      iconBgColor: 'bg-green-500/10',
    },
    {
      label: 'Conversion',
      value: `${analytics.conversionRate.toFixed(0)}%`,
      delta: analytics.periodComparison.conversionDelta,
      icon: BarChart3,
      iconColor: 'text-blue-500',
      iconBgColor: 'bg-blue-500/10',
    },
    {
      label: 'Avg Value',
      value: formatCurrency(analytics.avgDealValue),
      delta: analytics.periodComparison.valueDelta,
      icon: DollarSign,
      iconColor: 'text-purple-500',
      iconBgColor: 'bg-purple-500/10',
    },
    {
      label: 'Time to Close',
      value: formatDays(analytics.avgTimeToClose),
      delta: -analytics.periodComparison.timeToCloseDelta, // Negative is good for time
      icon: Clock,
      iconColor: 'text-orange-500',
      iconBgColor: 'bg-orange-500/10',
    },
  ];

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-sm text-muted-foreground">Analytics</h4>
        <span className="text-xs text-muted-foreground">
          {analytics.totalDeals} total deals
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>
    </div>
  );
}
