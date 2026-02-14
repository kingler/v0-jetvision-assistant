"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Loader2 } from "lucide-react"
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
  /** Trip type: one-way or round-trip */
  tripType?: 'one_way' | 'round_trip'
  /** Return date for round-trip flights (YYYY-MM-DD) */
  returnDate?: string
  status: "proposal_ready" | "proposal_sent" | "requesting_quotes" | "understanding_request" | "searching_aircraft" | "analyzing_options" | "contract_generated" | "contract_sent" | "payment_pending" | "closed_won"
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
  /** Customer from last generated proposal; used by Book Flight modal for contract recipient */
  customer?: {
    name: string
    email?: string
    company?: string
    phone?: string
    isReturning?: boolean
    preferences?: Record<string, string>
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
    /** Whether to show margin selection summary (customer + service charge) */
    showMarginSelection?: boolean
    /** Data for MarginSelectionCard when showMarginSelection is true */
    marginSelectionData?: {
      customerName: string
      customerEmail: string
      companyName: string
      marginPercentage: number
      selectedAt: string
    }
    /** Whether to show proposal-sent confirmation card inline (after proposal sent) */
    showProposalSentConfirmation?: boolean
    /** Data for ProposalSentConfirmation when showProposalSentConfirmation is true */
    proposalSentData?: import('@/components/proposal/proposal-sent-confirmation').ProposalSentConfirmationProps
    /** Whether to show email approval request card (human-in-the-loop) */
    showEmailApprovalRequest?: boolean
    /** Data for EmailPreviewCard when showEmailApprovalRequest is true */
    emailApprovalData?: {
      proposalId: string
      proposalNumber?: string
      to: { email: string; name: string }
      subject: string
      body: string
      attachments: Array<{ name: string; url: string; size?: number }>
      flightDetails?: {
        departureAirport: string
        arrivalAirport: string
        departureDate: string
        passengers?: number
        tripType?: 'one_way' | 'round_trip'
        returnDate?: string
        returnAirport?: string
      }
      pricing?: { subtotal: number; total: number; currency: string }
      generatedAt?: string
      requestId?: string
    }
    /** Whether to show contract-sent confirmation card */
    showContractSentConfirmation?: boolean
    /** Data for ContractSentConfirmation card */
    contractSentData?: {
      contractId: string
      contractNumber: string
      customerName: string
      customerEmail: string
      flightRoute: string
      departureDate: string
      totalAmount: number
      currency: string
      pdfUrl?: string
      status: 'draft' | 'sent' | 'signed' | 'payment_pending' | 'paid' | 'completed'
    }
    /** Whether to show payment confirmation card */
    showPaymentConfirmation?: boolean
    /** Data for payment confirmation */
    paymentConfirmationData?: {
      contractId: string
      contractNumber: string
      paymentAmount: number
      paymentMethod: string
      paymentReference: string
      paidAt: string
      currency: string
    }
    /** Whether to show closed-won (deal complete) card */
    showClosedWon?: boolean
    /** Data for ClosedWonConfirmation card */
    closedWonData?: {
      contractNumber: string
      customerName: string
      flightRoute: string
      dealValue: number
      currency: string
      proposalSentAt?: string
      contractSentAt?: string
      paymentReceivedAt?: string
    }
    /** Tool results with input for MCP UI registry rendering (feature-flagged) */
    toolResults?: Array<{ name: string; input: Record<string, unknown>; result: Record<string, unknown> }>
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
  archivedSessions?: ChatSession[]
  onLoadArchive?: () => void
  isLoadingArchive?: boolean
}

export function ChatSidebar({ chatSessions, activeChatId, onSelectChat, onNewChat, onDeleteChat, onCancelChat, onArchiveChat, archivedSessions, onLoadArchive, isLoadingArchive }: ChatSidebarProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active')
  const [archiveLoaded, setArchiveLoaded] = useState(false)

  /**
   * Filter out empty/invalid flight request sessions
   *
   * Flight request sessions MUST have a tripId to be displayed in the sidebar.
   * Sessions without tripId are considered incomplete/in-progress and should not
   * clutter the sidebar with incomplete cards.
   *
   * General conversations don't require tripId.
   */
  const isValidSession = (session: ChatSession): boolean => {
    // General conversations are always valid (they don't need flight data)
    if (session.conversationType === 'general') {
      return true;
    }

    // Flight request sessions MUST have a tripId to be displayed
    // This ensures only sessions with completed trip creation are shown
    return !!session.tripId;
  };

  // Filter out invalid/empty sessions before rendering
  const validSessions = chatSessions.filter(isValidSession);

  const handleArchiveTabClick = () => {
    setActiveTab('archive')
    if (!archiveLoaded && onLoadArchive) {
      onLoadArchive()
      setArchiveLoaded(true)
    }
  };

  return (
    <div className="w-full min-w-[280px] max-w-[360px] bg-background border-r border-border flex flex-col h-full overflow-x-hidden">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-[clamp(0.875rem,2vw,1rem)] text-foreground">Chats</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={onNewChat}
            className="text-xs sm:text-sm"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
            New
          </Button>
        </div>

        {/* Active / Archive Tabs */}
        <div className="flex" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'active'}
            onClick={() => setActiveTab('active')}
            className={`flex-1 text-xs sm:text-sm py-1.5 px-2 font-medium border-b-2 transition-colors ${
              activeTab === 'active'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Active ({validSessions.length})
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'archive'}
            onClick={handleArchiveTabClick}
            className={`flex-1 text-xs sm:text-sm py-1.5 px-2 font-medium border-b-2 transition-colors ${
              activeTab === 'archive'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Archive{archivedSessions && archivedSessions.length > 0 ? ` (${archivedSessions.length})` : ''}
          </button>
        </div>
      </div>

      {/* Chat List */}
      <div className="relative flex-1 min-h-0 w-full overflow-x-hidden">
        <ScrollArea className="h-full w-full overflow-x-hidden">
          {activeTab === 'active' ? (
            <div className="p-1 sm:p-2 space-y-2 flex flex-col items-center">
              {validSessions.map((session) => (
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
                    key={`${session.id}-${session.rfqsLastFetchedAt || ''}-${session.quotesReceived || 0}-${session.rfqFlights?.length || 0}`}
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
          ) : (
            <div className="p-1 sm:p-2 space-y-2 flex flex-col items-center">
              {isLoadingArchive ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span className="text-sm">Loading archived sessions...</span>
                </div>
              ) : archivedSessions && archivedSessions.length > 0 ? (
                archivedSessions.map((session) => (
                  session.conversationType === 'general' ? (
                    <GeneralChatCard
                      key={session.id}
                      session={session}
                      isActive={activeChatId === session.id}
                      onClick={() => onSelectChat(session.id)}
                    />
                  ) : (
                    <FlightRequestCard
                      key={session.id}
                      session={session}
                      isActive={activeChatId === session.id}
                      onClick={() => onSelectChat(session.id)}
                    />
                  )
                ))
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">No archived sessions</p>
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Footer */}
      <div className="p-3 sm:p-4 border-t border-border">
        <div className="text-[clamp(0.6875rem,1.5vw,0.75rem)] text-muted-foreground space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-status-proposal-sent rounded-full shrink-0"></div>
            <span>Proposal Sent</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-status-proposal-ready rounded-full shrink-0"></div>
            <span>Proposal Ready</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-status-processing rounded-full shrink-0"></div>
            <span>Processing</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-status-pending rounded-full shrink-0"></div>
            <span>Pending</span>
          </div>
        </div>
      </div>
    </div>
  )
}
