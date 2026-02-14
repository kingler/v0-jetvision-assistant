/**
 * DealsStarter - Inline deals/quotes list for chat
 *
 * Renders an inline list of deals when user clicks the
 * "Show My Deals" conversation starter. Displays deal cards
 * with operator, aircraft, pricing, and pipeline value summary.
 *
 * @module components/conversation-starters/deals-starter
 */
'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Briefcase,
  Plane,
  X,
  RefreshCw,
  Loader2,
  AlertCircle,
  Wifi,
  WifiOff,
  Plus,
  ArrowRight,
  DollarSign,
  Clock,
  TrendingUp,
  Trophy,
  XCircle,
  FileText,
  AlertTriangle,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Deal status types
 */
export type DealStatus = 'active' | 'pending' | 'won' | 'lost'

/**
 * Connection status for real-time updates
 */
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected'

/**
 * Deal data structure
 */
export interface Deal {
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
}

export interface DealsStarterProps {
  /** List of deals to display */
  deals: Deal[]
  /** Callback when viewing deal details */
  onViewDeal: (dealId: string) => void
  /** Callback to refresh the deal list */
  onRefresh: () => void
  /** Callback to close the component */
  onClose: () => void
  /** Optional callback for real-time status changes */
  onDealStatusChange?: (dealId: string, newStatus: DealStatus) => void
  /** Optional callback to create a new request */
  onCreateRequest?: () => void
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
  /** Whether to group deals by status (tabs) */
  groupByStatus?: boolean
  /** Compact display mode */
  compact?: boolean
  /** Modal mode for focus trapping */
  modal?: boolean
  /** Maximum number of deals to display */
  maxDisplay?: number
}

/**
 * Status badge configuration
 */
const statusConfig: Record<DealStatus, { label: string; variant: 'default' | 'secondary' | 'warning' | 'success' | 'destructive'; icon: typeof Briefcase }> = {
  active: { label: 'Active', variant: 'default', icon: TrendingUp },
  pending: { label: 'Pending', variant: 'warning', icon: Clock },
  won: { label: 'Won', variant: 'success', icon: Trophy },
  lost: { label: 'Lost', variant: 'destructive', icon: XCircle },
}

/**
 * Sort options
 */
type SortOption = 'value' | 'date' | 'updated'

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
 * Format date to readable format
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
 * Check if deal expires within days
 */
function expiresWithinDays(expiresAt: string, days: number): boolean {
  const expiry = new Date(expiresAt)
  const now = new Date()
  const diffMs = expiry.getTime() - now.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return diffDays > 0 && diffDays <= days
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
 * Pipeline value summary component
 */
function PipelineSummary({ deals, compact }: { deals: Deal[]; compact?: boolean }) {
  const stats = useMemo(() => {
    const byStatus = deals.reduce((acc, deal) => {
      acc[deal.status] = acc[deal.status] || { count: 0, value: 0 }
      acc[deal.status].count++
      acc[deal.status].value += deal.value
      return acc
    }, {} as Record<DealStatus, { count: number; value: number }>)

    const activeValue = (byStatus.active?.value || 0) + (byStatus.pending?.value || 0)
    const wonValue = byStatus.won?.value || 0

    return {
      byStatus,
      activeValue,
      wonValue,
      totalPipeline: activeValue,
    }
  }, [deals])

  if (compact) {
    return null
  }

  return (
    <div data-testid="pipeline-summary" className="grid grid-cols-2 gap-3 p-3 bg-surface-secondary rounded-lg mb-4">
      <div className="text-center">
        <div className="text-xs text-muted-foreground">Pipeline Value</div>
        <div data-testid="pipeline-value" className="text-lg font-bold text-interactive-text">
          {formatCurrency(stats.totalPipeline, 'USD')}
        </div>
        <div className="text-xs text-muted-foreground">
          {(stats.byStatus.active?.count || 0) + (stats.byStatus.pending?.count || 0)} active
        </div>
      </div>
      <div className="text-center">
        <div className="text-xs text-muted-foreground">Won This Month</div>
        <div className="text-lg font-bold text-success">
          {formatCurrency(stats.wonValue, 'USD')}
        </div>
        <div className="text-xs text-muted-foreground">
          {stats.byStatus.won?.count || 0} deals
        </div>
      </div>
    </div>
  )
}

/**
 * Single deal card component
 */
function DealCard({
  deal,
  onViewDeal,
  compact,
}: {
  deal: Deal
  onViewDeal: (id: string) => void
  compact?: boolean
}) {
  const { label, variant, icon: StatusIcon } = statusConfig[deal.status]
  const route = compact
    ? `${getAbbreviatedCode(deal.route.from)} \u2192 ${getAbbreviatedCode(deal.route.to)}`
    : `${deal.route.from} \u2192 ${deal.route.to}`

  const isExpiringSoon = deal.expiresAt && expiresWithinDays(deal.expiresAt, 3)

  return (
    <li
      data-testid={`deal-card-${deal.id}`}
      role="listitem"
      aria-label={`Deal ${deal.clientName} ${deal.route.from} to ${deal.route.to}`}
      className={cn(
        'p-4 border rounded-lg hover:bg-surface-secondary cursor-pointer transition-colors',
        compact && 'p-3'
      )}
      onClick={() => onViewDeal(deal.id)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-interactive-text" />
          <span className="font-medium">{deal.clientName}</span>
        </div>
        <Badge variant={variant}>{label}</Badge>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <Plane className="w-3 h-3" />
        <span>{route}</span>
      </div>

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

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1 font-bold text-interactive-text">
          <DollarSign className="w-4 h-4" />
          <span>{formatCurrency(deal.value, deal.currency)}</span>
        </div>
        {deal.expiresAt && deal.status === 'active' && (
          <div className={cn(
            'flex items-center gap-1 text-xs',
            isExpiringSoon ? 'text-orange-500' : 'text-muted-foreground'
          )}>
            {isExpiringSoon && (
              <span data-testid="expiring-soon-indicator">
                <AlertTriangle className="w-3 h-3" />
              </span>
            )}
            <span>Expires {formatDate(deal.expiresAt)}</span>
          </div>
        )}
      </div>

      <div className="mt-3">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onViewDeal(deal.id)
          }}
          className="w-full"
        >
          View Details
          <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      </div>
    </li>
  )
}

/**
 * DealsStarter component
 *
 * Inline deals list that appears in chat when user
 * clicks the "Show My Deals" conversation starter.
 */
export function DealsStarter({
  deals,
  onViewDeal,
  onRefresh,
  onClose,
  onDealStatusChange,
  onCreateRequest,
  isLoading = false,
  error,
  connectionStatus,
  showFilters = false,
  showSorting = false,
  groupByStatus = false,
  compact = false,
  modal = false,
  maxDisplay,
}: DealsStarterProps) {
  const [statusFilter, setStatusFilter] = useState<DealStatus | 'all'>('all')
  const [sortBy, setSortBy] = useState<SortOption>('value')
  const [activeTab, setActiveTab] = useState<DealStatus | 'all'>('all')

  /**
   * Count deals by status
   */
  const statusCounts = useMemo(() => {
    return deals.reduce((acc, deal) => {
      acc[deal.status] = (acc[deal.status] || 0) + 1
      return acc
    }, {} as Record<DealStatus, number>)
  }, [deals])

  /**
   * Filter and sort deals
   */
  const processedDeals = useMemo(() => {
    let filtered = deals

    // Apply status filter (from dropdown or tabs)
    const effectiveFilter = groupByStatus ? activeTab : statusFilter
    if (effectiveFilter !== 'all') {
      filtered = filtered.filter(d => d.status === effectiveFilter)
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'value':
          return b.value - a.value
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        case 'date':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })

    return sorted
  }, [deals, statusFilter, sortBy, groupByStatus, activeTab])

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

  const handleFilterChange = useCallback((value: string) => {
    setStatusFilter(value as DealStatus | 'all')
  }, [])

  const handleSortChange = useCallback((value: string) => {
    setSortBy(value as SortOption)
  }, [])

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value as DealStatus | 'all')
  }, [])

  /**
   * Render deal list content
   */
  const renderDealList = () => {
    if (isLoading && deals.length === 0) {
      return (
        <div data-testid="deals-loading" className="space-y-3">
          <DealSkeleton />
          <DealSkeleton />
          <DealSkeleton />
        </div>
      )
    }

    if (!isLoading && displayedDeals.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-4 bg-surface-tertiary rounded-full flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-text-placeholder" />
          </div>
          <p className="text-muted-foreground mb-4">No deals</p>
          {onCreateRequest && (
            <Button onClick={onCreateRequest} className="gap-2">
              <Plus className="w-4 h-4" />
              Create New Request
            </Button>
          )}
        </div>
      )
    }

    return (
      <>
        <ul role="list" className="space-y-3">
          {displayedDeals.map(deal => (
            <DealCard
              key={deal.id}
              deal={deal}
              onViewDeal={onViewDeal}
              compact={compact}
            />
          ))}
        </ul>

        {hasMoreDeals && (
          <div className="mt-4 text-center">
            <Button variant="link" className="text-interactive-text">
              View all {deals.length} deals
            </Button>
          </div>
        )}
      </>
    )
  }

  return (
    <Card
      data-testid="deals-container"
      role={modal ? 'dialog' : undefined}
      aria-modal={modal || undefined}
      className={cn(
        'w-full max-w-lg border-2 border-interactive-border',
        compact && 'compact'
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 bg-interactive-bg rounded-lg flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-interactive-text" />
            </div>
            My Deals
            {deals.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {deals.length} deals
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
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
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

        {/* Filters and Sorting */}
        {(showFilters || showSorting) && !groupByStatus && (
          <div className="flex gap-2 mt-3">
            {showFilters && (
              <Select value={statusFilter} onValueChange={handleFilterChange}>
                <SelectTrigger className="w-[150px]" aria-label="Filter by status">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            )}
            {showSorting && (
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-[150px]" aria-label="Sort by">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="value">Highest Value</SelectItem>
                  <SelectItem value="date">Newest First</SelectItem>
                  <SelectItem value="updated">Recently Updated</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Status region for announcements */}
        <div role="status" className="sr-only" aria-live="polite">
          {isLoading ? 'Loading deals...' : `${displayedDeals.length} deals displayed`}
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 border border-error-border bg-error-bg rounded-lg mb-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
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

        {/* Pipeline Summary */}
        {!error && !isLoading && deals.length > 0 && (
          <PipelineSummary deals={deals} compact={compact} />
        )}

        {/* Status Tabs or List */}
        {groupByStatus && !error ? (
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="w-full mb-4">
              <TabsTrigger value="all" className="flex-1">
                All
              </TabsTrigger>
              <TabsTrigger value="active" className="flex-1">
                Active
                {statusCounts.active > 0 && (
                  <Badge variant="outline" className="ml-1 text-xs">
                    {statusCounts.active}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex-1">
                Pending
                {statusCounts.pending > 0 && (
                  <Badge variant="outline" className="ml-1 text-xs">
                    {statusCounts.pending}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="won" className="flex-1">
                Won
                {statusCounts.won > 0 && (
                  <Badge variant="outline" className="ml-1 text-xs">
                    {statusCounts.won}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="lost" className="flex-1">
                Lost
                {statusCounts.lost > 0 && (
                  <Badge variant="outline" className="ml-1 text-xs">
                    {statusCounts.lost}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {renderDealList()}
            </TabsContent>
          </Tabs>
        ) : (
          !error && renderDealList()
        )}
      </CardContent>
    </Card>
  )
}
