/**
 * HotOpportunitiesStarter - Hot deals requiring immediate attention
 *
 * Renders high-priority deals based on urgency criteria:
 * - Expiring within 24 hours
 * - High value deals (above threshold)
 * - Multiple operator quotes
 * - Client recently viewed
 *
 * @module components/conversation-starters/hot-opportunities-starter
 */
'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Flame,
  X,
  RefreshCw,
  Loader2,
  AlertCircle,
  Wifi,
  WifiOff,
  ArrowRight,
  DollarSign,
  Clock,
  Plane,
  Building2,
  Bell,
  BellOff,
  XCircle,
  PartyPopper,
  Eye,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Hot value threshold - deals above this are considered "high value"
 */
export const HOT_VALUE_THRESHOLD = 100000

/**
 * Deal status types
 */
export type DealStatus = 'active' | 'pending' | 'won' | 'lost'

/**
 * Connection status for real-time updates
 */
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected'

/**
 * Hot deal data structure - extends base Deal with hot-specific fields
 */
export interface HotDeal {
  id: string
  clientName: string
  route: { from: string; to: string }
  aircraft: string
  operator: string
  value: number
  currency: string
  status: DealStatus
  quoteCount: number
  createdAt: string
  updatedAt: string
  expiresAt?: string
  requestId?: string
  // Hot-specific fields
  expiresWithin24Hours: boolean
  clientViewed: boolean
  priorityScore: number
  hotReasons: string[]
}

/**
 * Filter options for hot reasons
 */
type HotReasonFilter = 'all' | 'expiring' | 'high-value' | 'multi-quote' | 'viewed'

/**
 * Sort options
 */
type SortOption = 'priority' | 'expiration' | 'value'

export interface HotOpportunitiesStarterProps {
  /** List of deals (will be filtered to hot deals) */
  deals: HotDeal[]
  /** Callback when viewing deal details */
  onViewDeal: (dealId: string) => void
  /** Callback to refresh the deal list */
  onRefresh: () => void
  /** Callback to close the component */
  onClose: () => void
  /** Callback to dismiss a hot deal */
  onDismiss?: (dealId: string) => void
  /** Callback to view all deals */
  onViewAllDeals?: () => void
  /** Callback for notification toggle */
  onNotificationToggle?: (enabled: boolean) => void
  /** Whether notifications are enabled */
  notificationsEnabled?: boolean
  /** Whether to show notification toggle */
  showNotificationToggle?: boolean
  /** Whether the data is loading */
  isLoading?: boolean
  /** Error message to display */
  error?: string
  /** Real-time connection status */
  connectionStatus?: ConnectionStatus
  /** Whether to show filter controls */
  showFilters?: boolean
  /** Whether to show sorting controls */
  showSorting?: boolean
  /** Compact display mode */
  compact?: boolean
  /** Modal mode for focus trapping */
  modal?: boolean
  /** Maximum number of deals to display */
  maxDisplay?: number
}

/**
 * Check if a deal qualifies as a "hot" opportunity
 */
export function isHotOpportunity(deal: HotDeal): boolean {
  return (
    deal.expiresWithin24Hours ||
    deal.value > HOT_VALUE_THRESHOLD ||
    deal.quoteCount >= 3 ||
    deal.clientViewed
  )
}

/**
 * Calculate priority score for a deal
 * Higher score = more urgent
 */
export function calculatePriorityScore(deal: HotDeal): number {
  let score = 0
  if (deal.expiresWithin24Hours) score += 40
  if (deal.value > HOT_VALUE_THRESHOLD) score += 30
  if (deal.quoteCount >= 3) score += 20
  if (deal.clientViewed) score += 10
  return score
}

/**
 * Get urgency level from priority score
 */
function getUrgencyLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 40) return 'high'
  if (score >= 20) return 'medium'
  return 'low'
}

/**
 * Format currency value
 */
function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Get abbreviated airport code (strip leading K for US airports)
 */
function getAbbreviatedCode(icao: string): string {
  if (icao.startsWith('K') && icao.length === 4) {
    return icao.slice(1)
  }
  return icao
}

/**
 * Calculate hours remaining until expiration
 */
function getHoursRemaining(expiresAt: string): number {
  const expiry = new Date(expiresAt)
  const now = new Date()
  const diffMs = expiry.getTime() - now.getTime()
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)))
}

/**
 * Format countdown string
 */
function formatCountdown(expiresAt: string): string {
  const hours = getHoursRemaining(expiresAt)
  if (hours < 1) return 'Less than 1 hour'
  if (hours === 1) return '1 hour remaining'
  return `${hours} hours remaining`
}

/**
 * Skeleton card for loading state
 */
function DealSkeleton() {
  return (
    <div data-testid="deal-skeleton" className="p-4 border rounded-lg animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-5 w-32 bg-surface-tertiary rounded" />
        <div className="h-5 w-16 bg-surface-tertiary rounded" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-40 bg-surface-tertiary rounded" />
        <div className="h-4 w-28 bg-surface-tertiary rounded" />
        <div className="h-4 w-20 bg-surface-tertiary rounded" />
      </div>
    </div>
  )
}

/**
 * Connection status indicator
 */
function ConnectionStatusIndicator({ status }: { status: ConnectionStatus }) {
  const config = {
    connected: { icon: Wifi, label: 'Live', className: 'text-success' },
    connecting: { icon: Loader2, label: 'Connecting', className: 'text-warning animate-spin' },
    disconnected: { icon: WifiOff, label: 'Offline', className: 'text-text-placeholder' },
  }

  const { icon: Icon, label, className } = config[status]

  return (
    <div data-testid="connection-status" className="flex items-center gap-1 text-xs">
      <Icon className={cn('w-3 h-3', className)} />
      <span className={className}>{label}</span>
    </div>
  )
}

/**
 * Summary stats for hot opportunities
 */
function HotSummary({ deals, compact }: { deals: HotDeal[]; compact?: boolean }) {
  const stats = useMemo(() => {
    const totalValue = deals.reduce((sum, d) => sum + d.value, 0)
    const expiringCount = deals.filter(d => d.expiresWithin24Hours).length
    const avgValue = deals.length > 0 ? totalValue / deals.length : 0
    // Detect mixed currencies
    const currencies = [...new Set(deals.map(d => d.currency))]
    const hasMixedCurrencies = currencies.length > 1
    const primaryCurrency = currencies[0] || 'USD'

    return { totalValue, expiringCount, avgValue, hasMixedCurrencies, primaryCurrency }
  }, [deals])

  if (compact || deals.length === 0) {
    return null
  }

  return (
    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg mb-4">
      {stats.hasMixedCurrencies && (
        <div
          data-testid="mixed-currency-warning"
          className="text-xs text-orange-600 dark:text-orange-400 mb-2 text-center"
        >
          ⚠️ Values shown in {stats.primaryCurrency} (mixed currencies detected)
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className="text-xs text-muted-foreground">Hot Value</div>
          <div data-testid="hot-value-summary" className="text-lg font-bold text-orange-600 dark:text-orange-400">
            {formatCurrency(stats.totalValue, stats.primaryCurrency)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-muted-foreground">Expiring</div>
          <div data-testid="expiring-count" className="text-lg font-bold text-destructive">
            {stats.expiringCount}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-muted-foreground">Avg Value</div>
          <div data-testid="avg-value" className="text-lg font-bold text-orange-600 dark:text-orange-400">
            {formatCurrency(stats.avgValue, stats.primaryCurrency)}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Single hot deal card component
 */
function HotDealCard({
  deal,
  onViewDeal,
  onDismiss,
  compact,
}: {
  deal: HotDeal
  onViewDeal: (id: string) => void
  onDismiss?: (id: string) => void
  compact?: boolean
}) {
  const urgencyLevel = getUrgencyLevel(deal.priorityScore)
  const route = compact
    ? `${getAbbreviatedCode(deal.route.from)} \u2192 ${getAbbreviatedCode(deal.route.to)}`
    : `${deal.route.from} \u2192 ${deal.route.to}`

  const isExpiringSoon = deal.expiresAt && getHoursRemaining(deal.expiresAt) <= 6

  const handleClick = () => onViewDeal(deal.id)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onViewDeal(deal.id)
  }

  return (
    <li
      data-testid={`deal-card-${deal.id}`}
      role="listitem"
      tabIndex={0}
      aria-label={`Hot deal ${deal.clientName} ${deal.route.from} to ${deal.route.to}, priority score ${deal.priorityScore}`}
      className={cn(
        'p-4 border rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/10 cursor-pointer transition-colors',
        'border-orange-200 dark:border-orange-800',
        compact && 'p-3'
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Header with flame and priority */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Flame
            data-testid={`deal-flame-${deal.id}`}
            className={cn(
              'w-4 h-4',
              deal.expiresWithin24Hours && 'animate-pulse',
              urgencyLevel === 'high' && 'text-orange-500',
              urgencyLevel === 'medium' && 'text-warning',
              urgencyLevel === 'low' && 'text-text-placeholder'
            )}
          />
          <Building2 className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          <span className="font-medium">{deal.clientName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            data-testid="priority-score"
            variant="outline"
            className={cn(
              urgencyLevel === 'high' && 'bg-error-bg text-destructive border-error-border',
              urgencyLevel === 'medium' && 'bg-orange-100 text-orange-700 border-orange-300',
              urgencyLevel === 'low' && 'bg-warning-bg text-warning border-warning-border'
            )}
          >
            {deal.priorityScore}
          </Badge>
          <div
            data-testid="urgency-indicator"
            className={cn(
              'w-2 h-2 rounded-full',
              `urgency-${urgencyLevel}`,
              urgencyLevel === 'high' && 'bg-destructive',
              urgencyLevel === 'medium' && 'bg-orange-500',
              urgencyLevel === 'low' && 'bg-warning'
            )}
          />
        </div>
      </div>

      {/* Route */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <Plane className="w-3 h-3" />
        <span>{route}</span>
      </div>

      {/* Deal info */}
      <div className={cn('grid gap-2 text-sm text-muted-foreground', compact ? 'grid-cols-2' : 'grid-cols-3')}>
        <div className="flex items-center gap-1">
          <span className="font-medium">{deal.aircraft}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>{deal.operator}</span>
        </div>
        <div className="flex items-center gap-1">
          <FileText className="w-3 h-3" />
          <span>{deal.quoteCount} quotes</span>
        </div>
      </div>

      {/* Value and expiration */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1 font-bold text-orange-600 dark:text-orange-400">
          <DollarSign className="w-4 h-4" />
          <span>{formatCurrency(deal.value, deal.currency)}</span>
        </div>
        {deal.expiresAt && deal.expiresWithin24Hours && (
          <div
            data-testid={`countdown-${deal.id}`}
            className={cn(
              'flex items-center gap-1 text-xs',
              isExpiringSoon ? 'text-destructive font-medium' : 'text-orange-500'
            )}
          >
            <Clock className="w-3 h-3" />
            <span>{formatCountdown(deal.expiresAt)}</span>
            {isExpiringSoon && (
              <Badge variant="destructive" className="ml-1 text-xs px-1 py-0">
                Expires soon
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Hot reasons */}
      {!compact && deal.hotReasons.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {deal.hotReasons.map((reason, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {reason}
            </Badge>
          ))}
        </div>
      )}

      {/* Client viewed indicator */}
      {deal.clientViewed && (
        <div className="mt-2 flex items-center gap-1 text-xs text-primary">
          <Eye className="w-3 h-3" />
          <span>Client recently viewed</span>
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onViewDeal(deal.id)
          }}
          className="flex-1"
        >
          View Details
          <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onDismiss(deal.id)
            }}
            aria-label="Dismiss"
          >
            <XCircle className="w-4 h-4" />
          </Button>
        )}
      </div>
    </li>
  )
}

/**
 * HotOpportunitiesStarter component
 *
 * Displays hot deals that require immediate attention,
 * sorted by priority score with urgency indicators.
 */
export function HotOpportunitiesStarter({
  deals,
  onViewDeal,
  onRefresh,
  onClose,
  onDismiss,
  onViewAllDeals,
  onNotificationToggle,
  notificationsEnabled = false,
  showNotificationToggle = false,
  isLoading = false,
  error,
  connectionStatus,
  showFilters = false,
  showSorting = false,
  compact = false,
  modal = false,
  maxDisplay,
}: HotOpportunitiesStarterProps) {
  const [reasonFilter, setReasonFilter] = useState<HotReasonFilter>('all')
  const [sortBy, setSortBy] = useState<SortOption>('priority')

  /**
   * Filter to only hot deals and apply additional filters
   */
  const processedDeals = useMemo(() => {
    // First filter to only hot deals using the exported isHotOpportunity function
    let filtered = deals.filter(d => isHotOpportunity(d))

    // Apply reason filter
    if (reasonFilter !== 'all') {
      filtered = filtered.filter(d => {
        switch (reasonFilter) {
          case 'expiring':
            return d.expiresWithin24Hours
          case 'high-value':
            return d.value > HOT_VALUE_THRESHOLD
          case 'multi-quote':
            return d.quoteCount >= 3
          case 'viewed':
            return d.clientViewed
          default:
            return true
        }
      })
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          return b.priorityScore - a.priorityScore
        case 'expiration':
          if (!a.expiresAt && !b.expiresAt) return b.priorityScore - a.priorityScore
          if (!a.expiresAt) return 1
          if (!b.expiresAt) return -1
          return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()
        case 'value':
          return b.value - a.value
        default:
          return b.priorityScore - a.priorityScore
      }
    })

    return sorted
  }, [deals, reasonFilter, sortBy])

  /**
   * Apply max display limit
   */
  const displayedDeals = useMemo(() => {
    if (maxDisplay && processedDeals.length > maxDisplay) {
      return processedDeals.slice(0, maxDisplay)
    }
    return processedDeals
  }, [processedDeals, maxDisplay])

  const hasMoreDeals = maxDisplay && processedDeals.length > maxDisplay
  const hotDealsCount = deals.filter(d => d.priorityScore > 0).length

  const handleFilterChange = useCallback((value: string) => {
    setReasonFilter(value as HotReasonFilter)
  }, [])

  const handleSortChange = useCallback((value: string) => {
    setSortBy(value as SortOption)
  }, [])

  /**
   * Render deal list content
   */
  const renderDealList = () => {
    if (isLoading && deals.length === 0) {
      return (
        <div data-testid="hot-opportunities-loading" className="space-y-3">
          <DealSkeleton />
          <DealSkeleton />
          <DealSkeleton />
        </div>
      )
    }

    if (!isLoading && displayedDeals.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-4 bg-success-bg rounded-full flex items-center justify-center">
            <PartyPopper className="w-6 h-6 text-success" />
          </div>
          <p className="text-muted-foreground font-medium mb-1">No hot opportunities</p>
          <p className="text-muted-foreground text-sm mb-4">You&apos;re all caught up!</p>
          {onViewAllDeals && (
            <Button onClick={onViewAllDeals} variant="outline" className="gap-2">
              View All Deals
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      )
    }

    return (
      <>
        <ul role="list" className="space-y-3">
          {displayedDeals.map(deal => (
            <HotDealCard
              key={deal.id}
              deal={deal}
              onViewDeal={onViewDeal}
              onDismiss={onDismiss}
              compact={compact}
            />
          ))}
        </ul>

        {hasMoreDeals && (
          <div className="mt-4 text-center">
            <Button
              variant="link"
              className="text-orange-600 dark:text-orange-400"
              onClick={onViewAllDeals}
              aria-label={`View all ${processedDeals.length} hot deals`}
            >
              View more ({processedDeals.length} total)
            </Button>
          </div>
        )}
      </>
    )
  }

  return (
    <Card
      data-testid="hot-opportunities-container"
      role={modal ? 'dialog' : undefined}
      aria-modal={modal || undefined}
      className={cn(
        'w-full max-w-lg border-2 border-orange-200 dark:border-orange-800',
        compact && 'compact'
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
              <Flame data-testid="flame-icon" className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            Hot Opportunities
            {hotDealsCount > 0 && (
              <Badge variant="outline" className="ml-2 bg-orange-100 text-orange-700 border-orange-300">
                {hotDealsCount} hot
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {connectionStatus && (
              <ConnectionStatusIndicator status={connectionStatus} />
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              disabled={isLoading}
              aria-label="Refresh"
            >
              {isLoading ? (
                <Loader2 data-testid="loading-spinner" className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Notification toggle */}
        {showNotificationToggle && (
          <div className="flex items-center justify-between mt-3 p-2 bg-surface-secondary rounded-lg">
            <div className="flex items-center gap-2">
              {notificationsEnabled ? (
                <Bell className="w-4 h-4 text-orange-500" />
              ) : (
                <BellOff className="w-4 h-4 text-text-placeholder" />
              )}
              <Label htmlFor="notifications" className="text-sm">
                Push notifications
              </Label>
            </div>
            <Switch
              id="notifications"
              checked={notificationsEnabled}
              onCheckedChange={onNotificationToggle}
              aria-label="Toggle notifications"
            />
          </div>
        )}

        {/* Filters and Sorting */}
        {(showFilters || showSorting) && (
          <div className="flex gap-2 mt-3">
            {showFilters && (
              <Select value={reasonFilter} onValueChange={handleFilterChange}>
                <SelectTrigger className="w-[150px]" aria-label="Filter by reason">
                  <SelectValue placeholder="Filter reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Hot</SelectItem>
                  <SelectItem value="expiring">Expiring</SelectItem>
                  <SelectItem value="high-value">High Value</SelectItem>
                  <SelectItem value="multi-quote">Multiple Quotes</SelectItem>
                  <SelectItem value="viewed">Client Viewed</SelectItem>
                </SelectContent>
              </Select>
            )}
            {showSorting && (
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-[150px]" aria-label="Sort by">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority">Priority Score</SelectItem>
                  <SelectItem value="expiration">Expiring First</SelectItem>
                  <SelectItem value="value">Highest Value</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Status region for announcements */}
        <div role="status" className="sr-only" aria-live="polite">
          {isLoading ? 'Loading hot opportunities...' : `${displayedDeals.length} hot opportunities displayed`}
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 border border-error-border bg-error-bg rounded-lg mb-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle data-testid="error-icon" className="w-4 h-4" />
              <span>{error}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="mt-2"
              aria-label="Retry"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Summary Stats */}
        {!error && !isLoading && processedDeals.length > 0 && (
          <HotSummary deals={processedDeals} compact={compact} />
        )}

        {/* Deal List */}
        {!error && renderDealList()}
      </CardContent>
    </Card>
  )
}
