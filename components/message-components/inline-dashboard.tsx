/**
 * Inline Dashboard Component
 *
 * Comprehensive deal pipeline dashboard that renders inline within
 * the chat thread. Displays:
 * - Deal Pipeline Tracker (step-by-step progress)
 * - Analytics Summary (success rate, conversion, avg values)
 * - Hot Opportunities (expiring deals with countdown)
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  RefreshCw,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DealPipelineTracker } from './deal-pipeline-tracker';
import { AnalyticsSummaryCard } from './analytics-summary-card';
import { HotOpportunities } from './hot-opportunities';
import type {
  DealPipelineStage,
  AnalyticsSummary,
  PerformanceMetricsData,
  HotOpportunity,
} from './types';

export interface InlineDashboardProps {
  pipeline: DealPipelineStage[];
  analytics: AnalyticsSummary;
  metrics: PerformanceMetricsData;
  hotOpportunities: HotOpportunity[];
  dateRange?: {
    start: string;
    end: string;
    label: string;
  };
  onViewRequest?: (requestId: string) => void;
  onRefresh?: () => void;
  onPeriodChange?: (period: '7d' | '30d' | '90d' | 'ytd') => void;
  onViewAllOpportunities?: () => void;
  className?: string;
}

type PeriodOption = '7d' | '30d' | '90d' | 'ytd';

const periodOptions: { value: PeriodOption; label: string }[] = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: 'ytd', label: 'YTD' },
];

export function InlineDashboard({
  pipeline,
  analytics,
  metrics,
  hotOpportunities,
  dateRange,
  onViewRequest,
  onRefresh,
  onPeriodChange,
  onViewAllOpportunities,
  className,
}: InlineDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    await onRefresh?.();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handlePeriodChange = (period: PeriodOption) => {
    setSelectedPeriod(period);
    onPeriodChange?.(period);
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-primary" />
            Your Deal Pipeline
          </CardTitle>
          <CardAction>
            <div className="flex items-center gap-2">
              {/* Period Selector */}
              <div className="hidden sm:flex items-center gap-1 bg-muted rounded-lg p-1">
                {periodOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={selectedPeriod === option.value ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => handlePeriodChange(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>

              {/* Mobile Period Selector */}
              <div className="sm:hidden">
                <Button variant="outline" size="sm" className="h-8">
                  {periodOptions.find((p) => p.value === selectedPeriod)?.label}
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </div>

              {/* Refresh Button */}
              {onRefresh && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw
                    className={cn(
                      'h-4 w-4',
                      isRefreshing && 'animate-spin'
                    )}
                  />
                </Button>
              )}
            </div>
          </CardAction>
        </div>

        {/* Date Range Label */}
        {dateRange && (
          <p className="text-xs text-muted-foreground mt-1">
            {dateRange.label}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Pipeline Tracker */}
        <div>
          <h4 className="font-medium text-sm text-muted-foreground mb-3">
            Pipeline Stages
          </h4>
          <DealPipelineTracker
            stages={pipeline}
            onStageClick={onViewRequest}
          />
        </div>

        {/* Divider */}
        <div className="border-t" />

        {/* Analytics Summary */}
        <AnalyticsSummaryCard analytics={analytics} />

        {/* Divider */}
        <div className="border-t" />

        {/* Hot Opportunities */}
        <HotOpportunities
          opportunities={hotOpportunities}
          onViewOpportunity={onViewRequest}
          onViewAll={onViewAllOpportunities}
          maxDisplay={3}
        />

        {/* Quick Stats Footer */}
        <div className="border-t pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold">{metrics.activeRequests}</div>
              <div className="text-xs text-muted-foreground">Active Requests</div>
            </div>
            <div>
              <div className="text-lg font-bold">{metrics.pendingQuotes}</div>
              <div className="text-xs text-muted-foreground">Pending Quotes</div>
            </div>
            <div>
              <div className="text-lg font-bold">
                {metrics.avgResponseTime < 24
                  ? `${metrics.avgResponseTime.toFixed(0)}h`
                  : `${(metrics.avgResponseTime / 24).toFixed(1)}d`}
              </div>
              <div className="text-xs text-muted-foreground">Avg Response</div>
            </div>
            <div>
              <div className="text-lg font-bold">
                {metrics.closedDealsValue >= 1000000
                  ? `$${(metrics.closedDealsValue / 1000000).toFixed(1)}M`
                  : `$${(metrics.closedDealsValue / 1000).toFixed(0)}K`}
              </div>
              <div className="text-xs text-muted-foreground">Closed Value</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
