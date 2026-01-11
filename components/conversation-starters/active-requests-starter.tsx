/**
 * ActiveRequestsStarter - Inline active requests list for chat
 *
 * Renders an inline list of active flight requests when user
 * clicks the "View Active Requests" conversation starter.
 * Displays request cards with status badges and real-time updates.
 *
 * @module components/conversation-starters/active-requests-starter
 */
'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plane,
  Calendar,
  Users,
  X,
  RefreshCw,
  Loader2,
  AlertCircle,
  Wifi,
  WifiOff,
  Plus,
  ArrowRight,
  CheckCircle2,
  Clock,
  MessageSquare,
  DollarSign,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Request status types
 */
export type RequestStatus = 'pending' | 'awaiting_quotes' | 'quotes_received' | 'booked' | 'cancelled'

/**
 * Connection status for real-time updates
 */
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected'

/**
 * Active request data structure
 */
export interface ActiveRequest {
  id: string
  status: RequestStatus
  departureAirport: string
  arrivalAirport: string
  departureDate: string
  passengers: number
  createdAt: string
  updatedAt: string
  quotesReceived?: number
  quotesExpected?: number
  bookedOperator?: string
  bookedPrice?: number
}

export interface ActiveRequestsStarterProps {
  /** List of active requests to display */
  requests: ActiveRequest[]
  /** Callback when viewing request details */
  onViewRequest: (requestId: string) => void
  /** Callback to refresh the request list */
  onRefresh: () => void
  /** Callback to close the component */
  onClose: () => void
  /** Optional callback for real-time status changes */
  onRequestStatusChange?: (requestId: string, newStatus: RequestStatus) => void
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
  /** Compact display mode */
  compact?: boolean
  /** Modal mode for focus trapping */
  modal?: boolean
  /** Maximum number of requests to display */
  maxDisplay?: number
}

/**
 * Status badge configuration
 */
const statusConfig: Record<RequestStatus, { label: string; variant: 'default' | 'secondary' | 'warning' | 'success' | 'destructive' }> = {
  pending: { label: 'Pending', variant: 'secondary' },
  awaiting_quotes: { label: 'Awaiting Quotes', variant: 'warning' },
  quotes_received: { label: 'Quotes Received', variant: 'default' },
  booked: { label: 'Booked', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
}

/**
 * Sort options
 */
type SortOption = 'created' | 'departure' | 'updated'

/**
 * Format date to readable format
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Format price with currency
 */
function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
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
 * Skeleton card for loading state
 */
function RequestSkeleton() {
  return (
    <div data-testid="request-skeleton" className="p-4 border rounded-lg animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  )
}

/**
 * Connection status indicator
 */
function ConnectionStatusIndicator({ status }: { status: ConnectionStatus }) {
  const config = {
    connected: { icon: Wifi, label: 'Live', className: 'text-green-500' },
    connecting: { icon: Loader2, label: 'Connecting', className: 'text-yellow-500 animate-spin' },
    disconnected: { icon: WifiOff, label: 'Offline', className: 'text-gray-400' },
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
 * Single request card component
 */
function RequestCard({
  request,
  onViewRequest,
  compact,
}: {
  request: ActiveRequest
  onViewRequest: (id: string) => void
  compact?: boolean
}) {
  const { label, variant } = statusConfig[request.status]
  const route = compact
    ? `${getAbbreviatedCode(request.departureAirport)} \u2192 ${getAbbreviatedCode(request.arrivalAirport)}`
    : `${request.departureAirport} \u2192 ${request.arrivalAirport}`

  return (
    <li
      data-testid={`request-card-${request.id}`}
      role="listitem"
      aria-label={`Flight request ${request.departureAirport} to ${request.arrivalAirport}`}
      className={cn(
        'p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors',
        compact && 'p-3'
      )}
      onClick={() => onViewRequest(request.id)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Plane className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span className="font-medium">{route}</span>
        </div>
        <Badge variant={variant}>{label}</Badge>
      </div>

      <div className={cn('grid gap-2 text-sm text-gray-600 dark:text-gray-400', compact ? 'grid-cols-2' : 'grid-cols-3')}>
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span>{formatDate(request.departureDate)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          <span>{request.passengers} passengers</span>
        </div>

        {request.status === 'awaiting_quotes' && request.quotesReceived !== undefined && request.quotesExpected !== undefined && (
          <div className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            <span>{request.quotesReceived} of {request.quotesExpected} quotes</span>
          </div>
        )}

        {request.status === 'booked' && request.bookedOperator && (
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            <span>{request.bookedOperator}</span>
          </div>
        )}
      </div>

      {request.status === 'booked' && request.bookedPrice !== undefined && (
        <div className="mt-2 flex items-center gap-1 text-sm font-medium text-green-600 dark:text-green-400">
          <DollarSign className="w-3 h-3" />
          <span>{formatPrice(request.bookedPrice)}</span>
        </div>
      )}

      <div className="mt-3">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onViewRequest(request.id)
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
 * ActiveRequestsStarter component
 *
 * Inline active requests list that appears in chat when user
 * clicks the "View Active Requests" conversation starter.
 */
export function ActiveRequestsStarter({
  requests,
  onViewRequest,
  onRefresh,
  onClose,
  onRequestStatusChange,
  onCreateRequest,
  isLoading = false,
  error,
  connectionStatus,
  showFilters = false,
  showSorting = false,
  compact = false,
  modal = false,
  maxDisplay,
}: ActiveRequestsStarterProps) {
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all')
  const [sortBy, setSortBy] = useState<SortOption>('created')

  /**
   * Filter and sort requests
   */
  const processedRequests = useMemo(() => {
    let filtered = requests

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter)
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'departure':
          return new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime()
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        case 'created':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })

    return sorted
  }, [requests, statusFilter, sortBy])

  /**
   * Apply max display limit
   */
  const displayedRequests = useMemo(() => {
    if (maxDisplay && processedRequests.length > maxDisplay) {
      return processedRequests.slice(0, maxDisplay)
    }
    return processedRequests
  }, [processedRequests, maxDisplay])

  const hasMoreRequests = maxDisplay && processedRequests.length > maxDisplay

  const handleFilterChange = useCallback((value: string) => {
    setStatusFilter(value as RequestStatus | 'all')
  }, [])

  const handleSortChange = useCallback((value: string) => {
    setSortBy(value as SortOption)
  }, [])

  return (
    <Card
      data-testid="active-requests-container"
      role={modal ? 'dialog' : undefined}
      aria-modal={modal || undefined}
      className={cn(
        'w-full max-w-lg border-2 border-cyan-200 dark:border-cyan-800',
        compact && 'compact'
      )}
    >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 bg-cyan-100 dark:bg-cyan-900 rounded-lg flex items-center justify-center">
                <Plane className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              </div>
              Active Requests
              {requests.length > 0 && (
                <Badge variant="outline" className="ml-2">
                  {requests.length} requests
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
          {(showFilters || showSorting) && (
            <div className="flex gap-2 mt-3">
              {showFilters && (
                <Select value={statusFilter} onValueChange={handleFilterChange}>
                  <SelectTrigger className="w-[150px]" aria-label="Filter by status">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="awaiting_quotes">Awaiting Quotes</SelectItem>
                    <SelectItem value="quotes_received">Quotes Received</SelectItem>
                    <SelectItem value="booked">Booked</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {showSorting && (
                <Select value={sortBy} onValueChange={handleSortChange}>
                  <SelectTrigger className="w-[150px]" aria-label="Sort by">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created">Newest First</SelectItem>
                    <SelectItem value="departure">Departure Date</SelectItem>
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
            {isLoading ? 'Loading requests...' : `${displayedRequests.length} requests displayed`}
          </div>

          {/* Error State */}
          {error && (
            <div className="p-4 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 rounded-lg mb-4">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
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

          {/* Loading State */}
          {isLoading && requests.length === 0 && (
            <div data-testid="requests-loading" className="space-y-3">
              <RequestSkeleton />
              <RequestSkeleton />
              <RequestSkeleton />
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && requests.length === 0 && (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <Plane className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 mb-4">No active requests</p>
              {onCreateRequest && (
                <Button onClick={onCreateRequest} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create New Request
                </Button>
              )}
            </div>
          )}

          {/* Request List */}
          {!isLoading && displayedRequests.length > 0 && (
            <ul role="list" className="space-y-3">
              {displayedRequests.map(request => (
                <RequestCard
                  key={request.id}
                  request={request}
                  onViewRequest={onViewRequest}
                  compact={compact}
                />
              ))}
            </ul>
          )}

          {/* View All Link */}
          {hasMoreRequests && (
            <div className="mt-4 text-center">
              <Button variant="link" className="text-cyan-600 dark:text-cyan-400">
                View all {requests.length} requests
              </Button>
            </div>
          )}
        </CardContent>
    </Card>
  )
}
