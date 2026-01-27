"use client"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus } from "lucide-react"
import { FlightRequestCard } from "@/components/chat/flight-request-card"
import { GeneralChatCard } from "@/components/chat/general-chat-card"
import type { PipelineData } from "@/lib/types/chat-agent"

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
  /** ISO format date (YYYY-MM-DD) for API calls */
  isoDate?: string
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
  selectedQuoteId?: string
  /** Avinode trip ID for tracking flight searches */
  tripId?: string
  /** Avinode RFQ ID (Request for Quote) - identifies an RFQ sent to a specific operator */
  rfqId?: string
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
  /** Timestamp when the conversation first started */
  sessionStartedAt?: string
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
      rfqId?: string
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
    /** Whether to show proposal-sent confirmation card inline (after proposal sent) */
    showProposalSentConfirmation?: boolean
    /** Data for ProposalSentConfirmation when showProposalSentConfirmation is true */
    proposalSentData?: import('@/components/proposal/proposal-sent-confirmation').ProposalSentConfirmationProps
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

export function ChatSidebar({ chatSessions, activeChatId, onSelectChat, onNewChat, onDeleteChat, onCancelChat, onArchiveChat }: ChatSidebarProps) {
  /**
   * Filter out empty/invalid flight request sessions
   * A session is considered empty if it has:
   * - No tripId AND
   * - No meaningful route (placeholder "Select route" or empty) AND
   * - No meaningful date (placeholder "Select date" or empty) AND
   * - No messages (or only empty messages)
   * 
   * This prevents "Untitled #1" cards from appearing in the sidebar
   * for sessions that were never properly initialized with flight data.
   */
  const isValidSession = (session: ChatSession): boolean => {
    // General conversations are always valid (they don't need flight data)
    if (session.conversationType === 'general') {
      return true;
    }

    // Flight request sessions need meaningful data to be displayed
    // If session has tripId, it's valid (even if route/date are placeholders)
    if (session.tripId) {
      return true;
    }

    // Check if route is meaningful (not placeholder or empty)
    const hasValidRoute = session.route && 
      session.route !== 'Select route' && 
      session.route.trim().length > 0;

    // Check if date is meaningful (not placeholder or empty)
    const hasValidDate = session.date && 
      session.date !== 'Select date' && 
      session.date.trim().length > 0;

    // Check if there are meaningful messages
    const hasMessages = session.messages && 
      session.messages.length > 0 && 
      session.messages.some(msg => msg.content && msg.content.trim().length > 0);

    // Session is valid if it has either:
    // 1. Valid route AND valid date, OR
    // 2. Has messages (user has started a conversation)
    return (hasValidRoute && hasValidDate) || hasMessages;
  };

  // Filter out invalid/empty sessions before rendering
  const validSessions = chatSessions.filter(isValidSession);

  return (
    <div className="w-80 sm:w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full overflow-x-hidden">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">Open Chats</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={onNewChat}
            className="bg-transparent border-cyan-600 text-cyan-600 hover:bg-cyan-50 hover:text-cyan-700 dark:border-cyan-400 dark:text-cyan-300 dark:hover:bg-cyan-900/20 text-xs sm:text-sm"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
            New
          </Button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {validSessions.length} active flight request{validSessions.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Chat List */}
      <div className="relative flex-1 min-h-0 w-full overflow-x-hidden">
        <ScrollArea className="h-full w-full overflow-x-hidden">
          <div className="p-1 sm:p-2 space-y-2 flex flex-col items-center">
            {validSessions.map((session) => (
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
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Footer */}
      <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full shrink-0"></div>
            <span>Proposal Ready</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-cyan-500 rounded-full shrink-0"></div>
            <span>Processing</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full shrink-0"></div>
            <span>Pending</span>
          </div>
        </div>
      </div>
    </div>
  )
}
