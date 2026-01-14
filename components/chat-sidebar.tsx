"use client"
import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Search, X, Filter } from "lucide-react"
import { FlightRequestCard } from "@/components/chat/flight-request-card"
import { GeneralChatCard } from "@/components/chat/general-chat-card"
import type { PipelineData } from "@/lib/types/chat-agent"
import { cn } from "@/lib/utils"

/**
 * Chat Sidebar Component
 * 
 * Displays a list of active flight request chat sessions.
 * Cards are constrained to fit within the 320px (w-80) sidebar width.
 */

/** Operator message in conversation thread */
export interface OperatorMessage {
  id: string
  type: 'REQUEST' | 'RESPONSE' | 'INFO' | 'CONFIRMATION'
  content: string
  timestamp: string
  sender?: string
  /** Operator ID this message belongs to */
  operatorId?: string
}

/** Conversation thread state with a specific operator */
export interface OperatorThread {
  /** Avinode operator/seller ID */
  operatorId: string
  /** Operator company name */
  operatorName: string
  /** Quote ID if operator has quoted (null if pending/declined) */
  quoteId?: string
  /** Current state of this operator conversation */
  status: 'rfq_sent' | 'awaiting_response' | 'quoted' | 'in_negotiation' | 'declined' | 'expired' | 'accepted'
  /** Messages in this thread (both directions) */
  messages: OperatorMessage[]
  /** When RFQ was sent to this operator */
  rfqSentAt?: string
  /** When last message was received/sent */
  lastMessageAt?: string
  /** Whether there are unread messages from this operator */
  hasUnreadMessages: boolean
  /** Quote details if quoted */
  quote?: {
    price: number
    currency: string
    validUntil?: string
    aircraftType?: string
  }
}

/** Quote request displayed in header */
export interface QuoteRequestInfo {
  id: string
  jetType: string
  aircraftImageUrl?: string
  operatorName: string
  status: 'pending' | 'received' | 'expired'
  flightDuration?: string
  price?: number
  currency?: string
  departureAirport: string
  arrivalAirport: string
}

export interface ChatSession {
  id: string
  conversationId?: string
  requestId?: string
  /** Conversation type determines which card component to render */
  conversationType?: 'flight_request' | 'general'
  /** Flag indicating if this is a temporary session (not yet persisted to database) */
  isTemporary?: boolean
  route: string
  passengers: number
  date: string
  status: "proposal_ready" | "requesting_quotes" | "understanding_request" | "searching_aircraft" | "analyzing_options"
  currentStep: number
  totalSteps: number
  aircraft?: string
  operator?: string
  quotesReceived?: number
  quotesTotal?: number
  basePrice?: number
  totalPrice?: number
  margin?: number
  chatkitThreadId?: string
  selectedQuoteId?: string
  /** Avinode trip ID for tracking flight searches */
  tripId?: string
  /** Avinode RFQ ID when RFQ is created */
  rfqId?: string
  /** Avinode RFP ID for the request */
  rfpId?: string
  /** Deep link URL to open Avinode Web UI */
  deepLink?: string
  /** AI-generated descriptive name for the flight request */
  generatedName?: string
  /** Quote requests displayed in header (when tripId exists) */
  quoteRequests?: QuoteRequestInfo[]
  /** Operator conversation threads keyed by operator ID */
  operatorThreads?: Record<string, OperatorThread>
  /** @deprecated Use operatorThreads instead. Operator messages keyed by quote ID */
  operatorMessages?: Record<string, OperatorMessage[]>
  quotes?: Array<{
    id: string
    operatorName: string
    aircraftType: string
    price: number
    score?: number
    ranking?: number
    totalQuotes?: number
    operatorRating?: number
    departureTime?: string
    arrivalTime?: string
    flightDuration?: string
    isRecommended?: boolean
  }>
  /** Full RFQ flight data with all fields (departureAirport, arrivalAirport, amenities, etc.) */
  /** This preserves all data needed by RFQFlightCard and RFQFlightsList components */
  rfqFlights?: Array<import('./avinode/rfq-flight-card').RFQFlight>
  /** Timestamp when RFQs were last fetched from Avinode */
  rfqsLastFetchedAt?: string
  /** Timestamp when messages were last read/viewed, keyed by quote ID */
  lastMessagesReadAt?: Record<string, string>
  customer?: {
    name: string
    isReturning: boolean
    preferences: Record<string, string>
  }
  messages: Array<{
    id: string
    type: "user" | "agent"
    content: string
    timestamp: Date
    showWorkflow?: boolean
    showProposal?: boolean
    showQuoteStatus?: boolean
    showCustomerPreferences?: boolean
    showQuotes?: boolean
    showDeepLink?: boolean
    deepLinkData?: {
      rfpId?: string
      tripId?: string
      deepLink?: string
      departureAirport?: { icao: string; name?: string; city?: string }
      arrivalAirport?: { icao: string; name?: string; city?: string }
      departureDate?: string
      passengers?: number
    }
    /** Whether to show pipeline dashboard inline */
    showPipeline?: boolean
    /** Pipeline data for inline deals/requests view */
    pipelineData?: PipelineData
  }>
  /** Flag to indicate this chat needs an initial API call (set when created from landing page) */
  needsInitialApiCall?: boolean
  /** The initial user message to send when API call is triggered */
  initialUserMessage?: string
  /** Flag indicating if tripId was auto-submitted to check for quotes */
  tripIdSubmitted?: boolean
}

interface ChatSidebarProps {
  chatSessions: ChatSession[]
  activeChatId: string | null // Allow null for landing page state
  onSelectChat: (chatId: string) => void
  onNewChat: () => void
  onDeleteChat?: (chatId: string) => void
  onCancelChat?: (chatId: string) => void
  onArchiveChat?: (chatId: string) => void
}

/** Status filter options */
type StatusFilter = 'all' | 'proposal_ready' | 'requesting_quotes' | 'understanding_request' | 'searching_aircraft' | 'analyzing_options'

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: 'All',
  proposal_ready: 'Ready',
  requesting_quotes: 'Quotes',
  understanding_request: 'Pending',
  searching_aircraft: 'Searching',
  analyzing_options: 'Analyzing',
}

export function ChatSidebar({ chatSessions, activeChatId, onSelectChat, onNewChat, onDeleteChat, onCancelChat, onArchiveChat }: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showFilters, setShowFilters] = useState(false)

  // Filter sessions based on search query and status filter
  const filteredSessions = useMemo(() => {
    let filtered = chatSessions

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((session) => {
        // Search in route
        if (session.route?.toLowerCase().includes(query)) return true
        // Search in generated name
        if (session.generatedName?.toLowerCase().includes(query)) return true
        // Search in trip ID
        if (session.tripId?.toLowerCase().includes(query)) return true
        // Search in operator name
        if (session.operator?.toLowerCase().includes(query)) return true
        // Search in aircraft type
        if (session.aircraft?.toLowerCase().includes(query)) return true
        // Search in date
        if (session.date?.toLowerCase().includes(query)) return true
        return false
      })
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((session) => session.status === statusFilter)
    }

    return filtered
  }, [chatSessions, searchQuery, statusFilter])

  const clearSearch = () => {
    setSearchQuery('')
  }

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
  }

  const hasActiveFilters = searchQuery.trim() !== '' || statusFilter !== 'all'

  return (
    <div className="w-80 sm:w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full overflow-x-hidden">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">Open Chats</h2>
          <Button size="sm" onClick={onNewChat} className="bg-cyan-600 hover:bg-cyan-700 text-xs sm:text-sm">
            <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
            New
          </Button>
        </div>

        {/* Search Input */}
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search flights, routes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-8 h-8 text-sm bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-1 text-xs transition-colors",
              showFilters || hasActiveFilters
                ? "text-cyan-600 dark:text-cyan-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            )}
          >
            <Filter className="w-3 h-3" />
            Filter
            {hasActiveFilters && (
              <span className="ml-1 px-1.5 py-0.5 bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 rounded-full text-xs">
                {(searchQuery ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0)}
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Status Filter Pills */}
        {showFilters && (
          <div className="flex flex-wrap gap-1 mt-2">
            {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "px-2 py-1 text-xs rounded-full transition-colors",
                  statusFilter === status
                    ? "bg-cyan-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                )}
              >
                {STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        )}

        {/* Results count */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          {filteredSessions.length === chatSessions.length
            ? `${chatSessions.length} active request${chatSessions.length !== 1 ? "s" : ""}`
            : `${filteredSessions.length} of ${chatSessions.length} requests`}
        </p>
      </div>

      {/* Chat List */}
      <div className="relative flex-1 min-h-0 w-full overflow-x-hidden">
        <ScrollArea className="h-full w-full overflow-x-hidden">
          <div className="p-1 sm:p-2 space-y-2 flex flex-col items-center">
            {filteredSessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No matching requests</p>
                <button
                  onClick={clearFilters}
                  className="text-xs text-cyan-600 hover:underline mt-1"
                >
                  Clear filters
                </button>
              </div>
            ) : (
            filteredSessions.map((session) => (
              // Render GeneralChatCard for general conversations, FlightRequestCard for flight requests
              session.conversationType === 'general' ? (
                <GeneralChatCard
                  key={session.id}
                  session={session}
                  isActive={activeChatId === session.id}
                  onClick={() => onSelectChat(session.id)}
                  onDelete={onDeleteChat}
                  onArchive={onArchiveChat}
                />
              ) : (
                <FlightRequestCard
                  key={session.id}
                  session={session}
                  isActive={activeChatId === session.id}
                  onClick={() => onSelectChat(session.id)}
                  onDelete={onDeleteChat}
                  onCancel={onCancelChat}
                  onArchive={onArchiveChat}
                />
              )
            ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Footer */}
      <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
            <span>Proposal Ready</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-cyan-500 rounded-full flex-shrink-0"></div>
            <span>Processing</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0"></div>
            <span>Pending</span>
          </div>
        </div>
      </div>
    </div>
  )
}
