/**
 * PipelineSummaryStarter - Enhanced pipeline summary with analytics
 *
 * Displays comprehensive pipeline metrics including:
 * - Conversion rate, average deal value, time to close
 * - Visual bar chart for pipeline stages
 * - Period comparison with trend indicators
 * - Export functionality (CSV/PDF)
 *
 * @module components/conversation-starters/pipeline-summary-starter
 */
'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  GitBranch,
  X,
  RefreshCw,
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Download,
  Plus,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

/**
 * Pipeline stage representing a step in the sales pipeline
 */
export interface PipelineStage {
  id: string
  name: string
  shortName: string
  count: number
  value: number
  status: 'active' | 'completed'
  order: number
}

/**
 * Pipeline metrics data
 */
export interface PipelineMetrics {
  totalRequests: number
  totalValue: number
  conversionRate: number
  avgDealValue: number
  avgTimeToClose: number
  wonDeals: number
  lostDeals: number
  activeDeals: number
}

/**
 * Period comparison data showing deltas vs previous period
 */
export interface PeriodComparison {
  totalRequestsDelta: number
  conversionDelta: number
  valueDelta: number
  timeToCloseDelta: number
  periodLabel: string
}

/**
 * Date range for the pipeline data
 */
export interface DateRange {
  start: string
  end: string
  label: string
}

/**
 * Period selection options
 */
export type PeriodOption = '7d' | '30d' | '90d' | 'ytd'

/**
 * Export format options
 */
export type ExportFormat = 'csv' | 'pdf'

/**
 * Props for the PipelineSummaryStarter component
 */
export interface PipelineSummaryStarterProps {
  /** Pipeline stages data */
  stages: PipelineStage[]
  /** Pipeline metrics */
  metrics: PipelineMetrics
  /** Period comparison data */
  comparison?: PeriodComparison
  /** Date range for the data */
  dateRange?: DateRange
  /** Callback when viewing a specific stage */
  onViewStage?: (stageId: string) => void
  /** Callback to refresh the data */
  onRefresh?: () => void
  /** Callback to close the component */
  onClose?: () => void
  /** Callback for export */
  onExport?: (format: ExportFormat) => void
  /** Callback when period changes */
  onPeriodChange?: (period: PeriodOption) => void
  /** Callback to view all deals */
  onViewAllDeals?: () => void
  /** Callback to create a new request */
  onCreateRequest?: () => void
  /** Whether to show period selector */
  showPeriodSelector?: boolean
  /** Whether to show period comparison */
  showComparison?: boolean
  /** Whether the data is loading */
  isLoading?: boolean
  /** Whether export is in progress */
  isExporting?: boolean
  /** Error message */
  error?: string
  /** Compact display mode */
  compact?: boolean
  /** Additional CSS classes */
  className?: string
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate conversion rate as a percentage
 */
export function calculateConversionRate(won: number, total: number): number {
  if (total === 0) return 0
  return (won / total) * 100
}

/**
 * Calculate average deal value
 */
export function calculateAvgDealValue(totalValue: number, dealCount: number): number {
  if (dealCount === 0) return 0
  return totalValue / dealCount
}

/**
 * Format duration in days
 */
export function formatDuration(days: number): string {
  const rounded = Math.round(days * 10) / 10
  return rounded === 1 ? '1 day' : `${rounded} days`
}

/**
 * Format currency value
 */
function formatCurrency(value: number, compact = false): string {
  if (compact) {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`
    }
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Format percentage value
 */
function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`
}

/**
 * Format delta value with sign
 */
function formatDelta(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

// ============================================================================
// Component
// ============================================================================

export function PipelineSummaryStarter({
  stages,
  metrics,
  comparison,
  dateRange,
  onViewStage,
  onRefresh,
  onClose,
  onExport,
  onPeriodChange,
  onViewAllDeals,
  onCreateRequest,
  showPeriodSelector = false,
  showComparison = true,
  isLoading = false,
  isExporting = false,
  error,
  compact = false,
  className,
}: PipelineSummaryStarterProps) {
  const [hoveredBar, setHoveredBar] = useState<string | null>(null)

  // Get max count for proportional bar sizing
  const maxCount = useMemo(() => {
    return Math.max(...stages.map(s => s.count), 1)
  }, [stages])

  // Handle stage bar click
  const handleStageClick = useCallback((stageId: string) => {
    onViewStage?.(stageId)
  }, [onViewStage])

  // Handle keyboard navigation on stage bars
  const handleStageKeyDown = useCallback((e: React.KeyboardEvent, stageId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onViewStage?.(stageId)
    }
  }, [onViewStage])

  // Handle export action
  const handleExport = useCallback((format: ExportFormat) => {
    onExport?.(format)
  }, [onExport])

  // Render trend indicator
  const renderTrend = (
    testId: string,
    delta: number,
    isTimeMetric = false
  ) => {
    // For time metrics, negative is good (faster)
    const isPositive = isTimeMetric ? delta < 0 : delta > 0
    const colorClass = isPositive ? 'text-success' : 'text-destructive'

    return (
      <span
        data-testid={testId}
        className={cn('flex items-center gap-0.5 text-sm', colorClass)}
      >
        {isPositive ? (
          <TrendingUp data-testid="trend-arrow-up" className="h-3 w-3" />
        ) : (
          <TrendingDown data-testid="trend-arrow-down" className="h-3 w-3" />
        )}
        {formatDelta(delta)}
      </span>
    )
  }

  // Get bar color based on stage
  const getBarColor = (stage: PipelineStage): string => {
    if (stage.id === 'won') return 'bg-success'
    if (stage.id === 'lost') return 'bg-destructive'
    return 'bg-primary'
  }

  // Empty state
  const isEmpty = stages.length === 0 || metrics.totalRequests === 0

  // Error state
  if (error) {
    return (
      <Card
        data-testid="pipeline-summary-container"
        className={cn('w-full', compact && 'compact', className)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <GitBranch data-testid="pipeline-icon" className="h-5 w-5" />
              Pipeline Summary
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                aria-label="Retry"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle data-testid="error-icon" className="h-8 w-8 text-destructive mb-2" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <Card
        data-testid="pipeline-summary-container"
        className={cn('w-full', compact && 'compact', className)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <GitBranch data-testid="pipeline-icon" className="h-5 w-5" />
              Pipeline Summary
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                disabled
                aria-label="Refresh"
              >
                <Loader2 data-testid="loading-spinner" className="h-4 w-4 mr-1 animate-spin" />
                Refresh
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={isExporting}
                aria-label="Export"
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent data-testid="pipeline-summary-loading">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} data-testid="metric-skeleton" className="animate-pulse">
                <div className="h-4 bg-muted rounded w-20 mb-2" />
                <div className="h-8 bg-muted rounded w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Empty state
  if (isEmpty) {
    return (
      <Card
        data-testid="pipeline-summary-container"
        className={cn('w-full', compact && 'compact', className)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <GitBranch data-testid="pipeline-icon" className="h-5 w-5" />
              Pipeline Summary
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                aria-label="Refresh"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={isExporting}
                aria-label="Export"
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <GitBranch className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-4">No pipeline data available</p>
            {onCreateRequest && (
              <Button onClick={onCreateRequest} size="sm" aria-label="Create new request">
                <Plus className="h-4 w-4 mr-1" />
                Create New Request
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      data-testid="pipeline-summary-container"
      className={cn('w-full', compact && 'compact', className)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <GitBranch data-testid="pipeline-icon" className="h-5 w-5" />
              Pipeline Summary
            </CardTitle>
            {dateRange && (
              <span className="text-sm text-muted-foreground">
                {dateRange.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {showPeriodSelector && (
              <Select
                onValueChange={(value) => onPeriodChange?.(value as PeriodOption)}
              >
                <SelectTrigger className="w-32" aria-label="Period">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="ytd">Year to date</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              aria-label="Refresh"
            >
              {isLoading ? (
                <Loader2 data-testid="loading-spinner" className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isExporting}
                  aria-label="Export"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Conversion Rate */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Conversion Rate</p>
            <p data-testid="metric-conversion-rate" className="text-2xl font-bold">
              {formatPercentage(metrics.conversionRate)}
            </p>
            {showComparison && comparison && !compact && (
              renderTrend('trend-conversion-rate', comparison.conversionDelta)
            )}
          </div>

          {/* Avg Deal Value */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Avg Deal Value</p>
            <p data-testid="metric-avg-deal-value" className="text-2xl font-bold">
              {formatCurrency(metrics.avgDealValue, compact)}
            </p>
          </div>

          {/* Time to Close */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Time to Close</p>
            <p data-testid="metric-time-to-close" className="text-2xl font-bold">
              {formatDuration(metrics.avgTimeToClose)}
            </p>
            {showComparison && comparison && !compact && (
              renderTrend('trend-time-to-close', comparison.timeToCloseDelta, true)
            )}
          </div>

          {/* Total Pipeline Value */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Value</p>
            <p data-testid="metric-total-value" className="text-2xl font-bold">
              {formatCurrency(metrics.totalValue, compact)}
            </p>
            {showComparison && comparison && !compact && (
              renderTrend('trend-total-value', comparison.valueDelta)
            )}
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Total Requests:</span>
            <span data-testid="metric-total-requests" className="font-medium">
              {metrics.totalRequests}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Won:</span>
            <span data-testid="metric-won-deals" className="font-medium text-success">
              {metrics.wonDeals}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Lost:</span>
            <span data-testid="metric-lost-deals" className="font-medium text-destructive">
              {metrics.lostDeals}
            </span>
          </div>
        </div>

        {/* Period Label */}
        {showComparison && comparison && !compact && (
          <p className="text-xs text-muted-foreground">
            {comparison.periodLabel}
          </p>
        )}

        {/* Pipeline Bar Chart */}
        <div data-testid="pipeline-bar-chart" className="space-y-3">
          <h4 className="text-sm font-medium">Pipeline Stages</h4>
          <div className="flex items-end gap-2 h-32">
            {stages.map((stage) => {
              const heightPercent = (stage.count / maxCount) * 100
              const isHovered = hoveredBar === stage.id
              const stageValue = stages.find(s => s.id === stage.id)?.value ?? 0

              return (
                <div
                  key={stage.id}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <div
                    data-testid={`bar-${stage.id}`}
                    data-count={stage.count}
                    role="button"
                    tabIndex={0}
                    aria-label={`${stage.name}: ${stage.count} deals worth ${formatCurrency(stage.value)}`}
                    className={cn(
                      'w-full rounded-t transition-all duration-200 cursor-pointer relative',
                      getBarColor(stage),
                      isHovered && 'opacity-80'
                    )}
                    style={{ height: `${Math.max(heightPercent, 10)}%` }}
                    onClick={() => handleStageClick(stage.id)}
                    onKeyDown={(e) => handleStageKeyDown(e, stage.id)}
                    onMouseEnter={() => setHoveredBar(stage.id)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                      {stage.count}
                    </span>
                    {isHovered && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover border rounded px-2 py-1 text-xs whitespace-nowrap shadow-md z-10">
                        {formatCurrency(stageValue)}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {stage.shortName}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* View All Deals */}
        {onViewAllDeals && (
          <Button
            variant="outline"
            className="w-full"
            onClick={onViewAllDeals}
            aria-label="View all deals"
          >
            View All Deals
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}

        {/* Live Region for Screen Readers */}
        <div role="status" aria-live="polite" className="sr-only">
          Pipeline summary loaded with {metrics.totalRequests} total requests
        </div>
      </CardContent>
    </Card>
  )
}

export default PipelineSummaryStarter
