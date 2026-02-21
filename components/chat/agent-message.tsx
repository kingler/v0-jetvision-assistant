"use client"

import React from "react"
import { FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProposalPreview } from "../proposal-preview"
import {
  FlightSearchProgress,
  type SelectedFlight,
  type FlightRequestDetails,
} from "../avinode/flight-search-progress"
import type { RFQFlight } from "../avinode/rfq-flight-card"
import type { RFQFlight as AvinodeRFQFlight } from "@/lib/mcp/clients/avinode-client"
import { QuoteCard } from "@/components/aviation"
import type { ChatSession } from "../chat-sidebar"
import { PipelineDashboard } from "../message-components/pipeline-dashboard"
import { ProposalSentConfirmation } from "@/components/proposal/proposal-sent-confirmation"
import { ContractSentConfirmation, type ContractSentConfirmationProps } from "@/components/contract/contract-sent-confirmation"
import { PaymentConfirmedCard } from "@/components/contract/payment-confirmed-card"
import { ClosedWonConfirmation } from "@/components/contract/closed-won-confirmation"
import { MarginSelectionCard, type MarginSelectionData } from "@/components/chat/margin-selection-card"
import {
  OperatorChatsInline,
  type FlightContext,
  type OperatorMessageInline,
} from "../message-components/operator-chat-inline"
import type { PipelineData } from "@/lib/types/chat-agent"
import { EmailPreviewCard, type EmailPreviewCardProps } from "@/components/email"
import { formatMessageTimestamp } from "@/lib/utils/format"

/**
 * Convert markdown-formatted text to plain text
 * Removes bold, italic, headers, bullets, and other markdown syntax
 */
function stripMarkdown(text: string): string {
  return text
    // Remove bold/italic markers
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove bullet points but keep content
    .replace(/^[\s]*[-*+]\s+/gm, '• ')
    // Remove numbered list markers but keep numbers
    .replace(/^[\s]*(\d+)\.\s+/gm, '$1. ')
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export interface Quote {
  id: string
  operatorName: string
  aircraftType: string
  price: number
  score?: number
  ranking?: number
  operatorRating?: number
  departureTime?: string
  arrivalTime?: string
  flightDuration?: string
  isRecommended?: boolean
}

export interface AgentMessageProps {
  /** Message content (may contain markdown) */
  content: string
  /** Timestamp of the message */
  timestamp: Date
  /** Whether to show the flight search progress workflow */
  showWorkflow?: boolean
  /** Workflow props - determines which step we're on */
  workflowProps?: {
    isProcessing: boolean
    currentStep: number
    status: string
    tripId?: string
    deepLink?: string
  }
  /** Whether to show deep link prompt (triggers Step 2-3 of workflow) */
  showDeepLink?: boolean
  /** Deep link data - contains flight request details */
  deepLinkData?: {
    rfqId?: string
    tripId?: string
    deepLink?: string
    departureAirport?: { icao: string; name?: string; city?: string }
    arrivalAirport?: { icao: string; name?: string; city?: string }
    departureDate?: string
    passengers?: number
    tripType?: 'one_way' | 'round_trip'
    returnDate?: string
    aircraftPreferences?: string
    specialRequirements?: string
  }
  /** Whether to show Trip ID input form for human-in-the-loop workflow */
  showTripIdInput?: boolean
  /** Whether Trip ID is currently being submitted/validated */
  isTripIdLoading?: boolean
  /** Error message from Trip ID submission */
  tripIdError?: string
  /** Whether Trip ID has been successfully submitted */
  tripIdSubmitted?: boolean
  /** Callback when Trip ID is submitted */
  onTripIdSubmit?: (tripId: string) => Promise<void>
  /** Whether to show quote comparison */
  showQuotes?: boolean
  /** Quotes data */
  quotes?: Quote[]
  /** Whether to show proposal preview */
  showProposal?: boolean
  /** Chat data for proposal preview */
  chatData?: ChatSession
  /** Whether to show customer preferences */
  showCustomerPreferences?: boolean
  /** Customer data */
  customer?: ChatSession['customer']
  /** Callback when a quote is selected */
  onSelectQuote?: (quoteId: string) => void
  /** Callback when deep link is clicked */
  onDeepLinkClick?: () => void
  /** Callback when deep link is copied */
  onCopyDeepLink?: () => void
  /** Selected flights for Step 4 display */
  selectedFlights?: SelectedFlight[]
  /** Callback when View Chat is clicked for a flight */
  onViewChat?: (flightId: string, quoteId?: string, messageId?: string) => void
  /** Callback when "Generate flight proposal" button is clicked */
  onGenerateProposal?: (flightId: string, quoteId?: string) => void
  /** RFQ flights retrieved from Avinode */
  rfqFlights?: RFQFlight[]
  /** Whether RFQ flights are loading */
  isRfqFlightsLoading?: boolean
  /** Selected RFQ flight IDs for proposal */
  selectedRfqFlightIds?: string[]
  /** Timestamp when RFQs were last fetched */
  rfqsLastFetchedAt?: string
  /** Customer email for proposal */
  customerEmail?: string
  /** Customer name for proposal */
  customerName?: string
  /** Callback when RFQ flight selection changes */
  onRfqFlightSelectionChange?: (selectedIds: string[]) => void
  /** Callback when user clicks continue to proposal */
  onContinueToProposal?: (selectedFlights: RFQFlight[]) => void
  /** Callback when user clicks "Review and Book" button on a flight card */
  onReviewAndBook?: (flightId: string) => void
  /** Callback when user clicks "Book Flight" button on a quoted flight card */
  onBookFlight?: (flightId: string, quoteId?: string) => void
  /** Callback when PDF preview is generated */
  onGeneratePreview?: (data: {
    customerEmail: string
    customerName: string
    selectedFlights: AvinodeRFQFlight[]
    tripDetails: {
      departureAirport: FlightRequestDetails['departureAirport']
      arrivalAirport: FlightRequestDetails['arrivalAirport']
      departureDate: string
      passengers: number
      tripId?: string
    }
  }) => Promise<{ success: boolean; previewUrl?: string; error?: string }>
  /** Callback when proposal is sent */
  onSendProposal?: (data: {
    customerEmail: string
    customerName: string
    selectedFlights: AvinodeRFQFlight[]
    tripDetails: {
      departureAirport: FlightRequestDetails['departureAirport']
      arrivalAirport: FlightRequestDetails['arrivalAirport']
      departureDate: string
      passengers: number
      tripId?: string
    }
  }) => Promise<{ success: boolean; error?: string }>
  /** Callback when user goes back from Step 4 */
  onGoBackFromProposal?: () => void
  /** Whether to show pipeline/deals dashboard inline */
  showPipeline?: boolean
  /** Pipeline data to display */
  pipelineData?: PipelineData
  /** Callback when a request is clicked in pipeline */
  onViewRequest?: (requestId: string) => void
  /** Callback when pipeline refresh is clicked */
  onRefreshPipeline?: () => void
  /** Whether to show inline operator messages */
  showOperatorMessages?: boolean
  /** Operator messages grouped by quote ID */
  operatorMessages?: Record<
    string,
    Array<{
      id: string
      content: string
      timestamp: string
      type: "REQUEST" | "RESPONSE" | "INFO" | "CONFIRMATION"
      sender?: string
    }>
  >
  /** Flight context for operator messages (maps quoteId to flight details) */
  operatorFlightContext?: Record<string, FlightContext>
  /** Callback when "View Full Thread" is clicked for operator messages */
  onViewOperatorThread?: (quoteId: string) => void
  /** Callback when "Reply" is clicked for operator messages */
  onReplyToOperator?: (quoteId: string) => void
  /** Whether to show margin selection summary card */
  showMarginSelection?: boolean
  /** Data for MarginSelectionCard when showMarginSelection is true */
  marginSelectionData?: MarginSelectionData
  /** Whether to show proposal-sent confirmation card inline (after proposal sent) */
  showProposalSentConfirmation?: boolean
  /** Data for ProposalSentConfirmation when showProposalSentConfirmation is true */
  proposalSentData?: import('@/components/proposal/proposal-sent-confirmation').ProposalSentConfirmationProps
  /** Whether to show contract-sent confirmation card inline (after contract sent via Book Flight) */
  showContractSentConfirmation?: boolean
  /** Data for ContractSentConfirmation when showContractSentConfirmation is true */
  contractSentData?: import('@/components/contract/contract-sent-confirmation').ContractSentConfirmationProps
  /** Callback when "Mark Payment Received" is clicked on ContractSentConfirmation */
  onMarkPayment?: (contractId: string, contractData: ContractSentConfirmationProps) => void
  /** Whether to show payment confirmed card inline (after payment is recorded) */
  showPaymentConfirmation?: boolean
  /** Data for PaymentConfirmedCard when showPaymentConfirmation is true */
  paymentConfirmationData?: {
    contractId: string
    contractNumber: string
    paymentAmount: number
    paymentMethod: string
    paymentReference: string
    paidAt: string
    currency: string
  }
  /** Whether to show closed-won confirmation card inline (after deal is closed) */
  showClosedWon?: boolean
  /** Data for ClosedWonConfirmation when showClosedWon is true */
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
    }
    pricing?: { subtotal: number; total: number; currency: string }
    generatedAt?: string
    requestId?: string
  }
  /** Callback when email is edited */
  onEmailEdit?: (field: 'subject' | 'body', value: string) => void
  /** Callback when email send is approved */
  onEmailSend?: () => Promise<void>
  /** Callback when email approval is cancelled */
  onEmailCancel?: () => void
  /** Email approval status */
  emailApprovalStatus?: 'draft' | 'sending' | 'sent' | 'error'
  /** Error message for email approval */
  emailApprovalError?: string
}

/**
 * AgentMessage - Displays agent messages as plain text with proper typography
 * Uses the unified FlightSearchProgress component for workflow visualization
 */
export function AgentMessage({
  content,
  timestamp,
  showWorkflow,
  workflowProps,
  showDeepLink,
  deepLinkData,
  showTripIdInput,
  isTripIdLoading,
  tripIdError,
  tripIdSubmitted,
  onTripIdSubmit,
  showQuotes,
  quotes = [],
  showProposal,
  chatData,
  showCustomerPreferences,
  customer,
  onSelectQuote,
  onDeepLinkClick,
  onCopyDeepLink,
  selectedFlights = [],
  onViewChat,
  onGenerateProposal,
  rfqFlights = [],
  isRfqFlightsLoading = false,
  selectedRfqFlightIds = [],
  rfqsLastFetchedAt,
  customerEmail,
  customerName,
  onRfqFlightSelectionChange,
  onContinueToProposal,
  onReviewAndBook,
  onBookFlight,
  onGeneratePreview,
  onSendProposal,
  onGoBackFromProposal,
  showPipeline,
  pipelineData,
  onViewRequest,
  onRefreshPipeline,
  showOperatorMessages,
  operatorMessages,
  operatorFlightContext,
  onViewOperatorThread,
  onReplyToOperator,
  showMarginSelection,
  marginSelectionData,
  showProposalSentConfirmation,
  proposalSentData,
  showContractSentConfirmation,
  contractSentData,
  onMarkPayment,
  showPaymentConfirmation,
  paymentConfirmationData,
  showClosedWon,
  closedWonData,
  showEmailApprovalRequest,
  emailApprovalData,
  onEmailEdit,
  onEmailSend,
  onEmailCancel,
  emailApprovalStatus = 'draft',
  emailApprovalError,
}: AgentMessageProps) {
  const sortedQuotes = [...quotes].sort((a, b) => (a.ranking || 0) - (b.ranking || 0))

  /**
   * Extract airport codes from message content as fallback
   * Looks for patterns like "KTEB", "KTEB to KVNY", "(KTEB)", "from Teterboro (KTEB) to Van Nuys (KVNY)", etc.
   */
  const extractAirportCodes = (text: string): { departure?: string; arrival?: string } => {
    // Pattern for ICAO codes (4 uppercase letters) or IATA codes (3 uppercase letters)
    const airportCodePattern = /\b([A-Z]{3,4})\b/g
    const allCodes = text.match(airportCodePattern) || []
    
    if (allCodes.length >= 2) {
      // Try to find codes with context: "from ... (KTEB) to ... (KVNY)"
      const fromPattern = /(?:from|departure).*?\(?([A-Z]{3,4})\)?/i
      const toPattern = /(?:to|arrival).*?\(?([A-Z]{3,4})\)?/i
      
      const fromMatch = text.match(fromPattern)
      const toMatch = text.match(toPattern)
      
      if (fromMatch && toMatch) {
        return {
          departure: fromMatch[1]?.toUpperCase(),
          arrival: toMatch[1]?.toUpperCase(),
        }
      }
      
      // Fallback: look for "X to Y" pattern
      const routePattern = /\b([A-Z]{3,4})\s+to\s+([A-Z]{3,4})\b/i
      const routeMatch = text.match(routePattern)
      
      if (routeMatch) {
        return {
          departure: routeMatch[1]?.toUpperCase(),
          arrival: routeMatch[2]?.toUpperCase(),
        }
      }
      
      // Last resort: use first two codes found (assuming order is departure, arrival)
      return {
        departure: allCodes[0],
        arrival: allCodes[1],
      }
    }
    
    return {}
  }

  /**
   * Determine the current workflow step based on status and props
   */
  const getCurrentStep = (): number => {
    // Step 4: Quotes received
    if (tripIdSubmitted && quotes.length > 0) return 4
    // Step 4: Fetching details after Trip ID submitted
    if (tripIdSubmitted) return 4
    // Step 3: Awaiting selection (Trip ID input shown)
    if (showTripIdInput || showDeepLink) return 3
    // Step 2: Deep link ready
    if (deepLinkData?.deepLink) return 2
    // Step 1: Request created
    return 1
  }

  // Check if we should show the unified workflow component
  const shouldShowFlightSearchProgress = showDeepLink || showTripIdInput || (showWorkflow && workflowProps)

  return (
    <div
      data-testid="agent-message"
      className="flex flex-col items-start justify-start space-y-3 w-full overflow-hidden"
    >
      {/* Avatar + Badge Header */}
      <div className="flex items-center space-x-2">
        {/* Jetvision Logo */}
        <div className="w-7 h-7 flex items-center justify-center shrink-0">
          <img
            src="/images/jvg-logo.svg"
            alt="Jetvision"
            className="w-full h-full"
            style={{ filter: 'brightness(0)' }}
          />
        </div>
        <span className="text-xs font-semibold text-foreground">
          Jetvision Agent
        </span>
      </div>

      {/* Plain text content - transparent background, no border/shadow */}
      <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
        {stripMarkdown(content)}
      </div>

      {/* Customer Preferences - embedded in single card level */}
      {showCustomerPreferences && customer && (
        <div className="p-4 bg-background rounded-lg border border-border">
          <CustomerPreferencesDisplay customer={customer} />
        </div>
      )}

      {/* Unified Flight Search Progress Component */}
      {shouldShowFlightSearchProgress && deepLinkData && (() => {
        // Extract airport codes from message content as fallback
        const extractedCodes = extractAirportCodes(content)
        
        // Helper to normalize airport data
        const normalizeAirport = (
          airport: { icao: string; name?: string; city?: string } | string | undefined,
          fallbackCode?: string
        ): { icao: string; name?: string; city?: string } => {
          if (typeof airport === 'string') {
            return { icao: airport.toUpperCase() }
          }
          if (airport && typeof airport === 'object' && airport.icao) {
            return airport
          }
          // Use fallback code extracted from message content
          if (fallbackCode) {
            return { icao: fallbackCode.toUpperCase() }
          }
          return { icao: 'N/A' }
        }
        
        return (
          <FlightSearchProgress
            currentStep={getCurrentStep()}
            flightRequest={{
              departureAirport: normalizeAirport(
                deepLinkData.departureAirport,
                extractedCodes.departure
              ),
              arrivalAirport: normalizeAirport(
                deepLinkData.arrivalAirport,
                extractedCodes.arrival
              ),
              departureDate: deepLinkData.departureDate || new Date().toISOString().split('T')[0],
              passengers: deepLinkData.passengers || 1,
              tripType: deepLinkData.tripType,
              returnDate: deepLinkData.returnDate,
              requestId: deepLinkData.rfqId,
              aircraftPreferences: deepLinkData.aircraftPreferences,
              specialRequirements: deepLinkData.specialRequirements,
            }}
          deepLink={deepLinkData.deepLink || (deepLinkData.tripId ? `https://sandbox.avinode.com/marketplace/mvc/search#preSearch` : undefined)}
          tripId={deepLinkData.tripId}
          isTripIdLoading={isTripIdLoading}
          tripIdError={tripIdError}
          tripIdSubmitted={tripIdSubmitted}
          selectedFlights={selectedFlights}
          rfqFlights={rfqFlights}
          isRfqFlightsLoading={isRfqFlightsLoading}
          selectedRfqFlightIds={selectedRfqFlightIds}
          rfqsLastFetchedAt={rfqsLastFetchedAt}
          customerEmail={customerEmail}
          customerName={customerName}
          onTripIdSubmit={onTripIdSubmit}
          onDeepLinkClick={onDeepLinkClick}
          onCopyDeepLink={onCopyDeepLink}
          onViewChat={onViewChat}
          onGenerateProposal={onGenerateProposal}
          onRfqFlightSelectionChange={onRfqFlightSelectionChange}
          onContinueToProposal={onContinueToProposal}
          onReviewAndBook={onReviewAndBook}
          onBookFlight={onBookFlight}
          onGeneratePreview={onGeneratePreview}
          onSendProposal={onSendProposal}
          onGoBackFromProposal={onGoBackFromProposal}
          />
        )
      })()}

      {/* Quote Status Display - only when waiting for quotes (no workflow shown) */}
      {showQuotes && quotes.length === 0 && !shouldShowFlightSearchProgress && (
        <div data-testid="quote-status-waiting" className="p-4 bg-background rounded-lg border border-border">
          <QuoteStatusDisplay />
        </div>
      )}

      {/* Quote Comparison - embedded in single card level */}
      {showQuotes && quotes.length > 0 && (
        <div data-testid="quote-comparison" className="p-4 bg-background rounded-lg border border-border">
          <QuoteComparisonDisplay
            quotes={sortedQuotes}
            onSelectQuote={onSelectQuote}
          />
        </div>
      )}

      {/* Proposal Preview - embedded in single card level */}
      {/* Create Customer Proposal Button - Shown when quotes are available and Trip ID is submitted */}
      {showProposal && onContinueToProposal && rfqFlights && rfqFlights.length > 0 && tripIdSubmitted && (
        <div className="mt-4 p-4 bg-info-bg rounded-lg border border-info-border">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h4 className="font-semibold text-foreground mb-2">
                Ready to Create Your Proposal?
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                Select the flights you want to include from the list above in Step 3, then click the button below to generate and send a professional PDF proposal to your customer. Once they pay, the flight will be automatically booked.
              </p>
              <Button
                onClick={() => {
                  const selectedFlights = rfqFlights.filter(f => f.isSelected || selectedRfqFlightIds.includes(f.id))
                  if (selectedFlights.length > 0) {
                    onContinueToProposal(selectedFlights)
                  } else {
                    // If no flights selected, use all available flights
                    onContinueToProposal(rfqFlights)
                  }
                }}
                className="bg-foreground hover:bg-foreground/90 text-background font-medium"
                size="lg"
              >
                <FileText className="h-5 w-5 mr-2" />
                Create Customer Proposal
              </Button>
            </div>
          </div>
        </div>
      )}

      {showProposal && chatData && !onContinueToProposal && (
        <div className="p-4 bg-background rounded-lg border border-border">
          <ProposalPreview embedded={true} chatData={chatData} />
        </div>
      )}

      {/* Email Approval Request - human-in-the-loop email review */}
      {/* Margin Selection Summary - inline record of customer + service charge */}
      {showMarginSelection && marginSelectionData && (
        <div className="mt-4 w-full">
          <MarginSelectionCard {...marginSelectionData} />
        </div>
      )}

      {showEmailApprovalRequest && emailApprovalData && emailApprovalStatus !== 'sent' && (
        <div className="mt-4 w-full">
          <EmailPreviewCard
            proposalId={emailApprovalData.proposalId}
            proposalNumber={emailApprovalData.proposalNumber}
            to={emailApprovalData.to}
            subject={emailApprovalData.subject}
            body={emailApprovalData.body}
            attachments={emailApprovalData.attachments}
            flightDetails={emailApprovalData.flightDetails}
            pricing={emailApprovalData.pricing}
            status={emailApprovalStatus}
            onEdit={onEmailEdit}
            onSend={onEmailSend}
            onCancel={onEmailCancel}
            error={emailApprovalError}
            generatedAt={emailApprovalData.generatedAt}
            requestId={emailApprovalData.requestId}
          />
        </div>
      )}

      {/* Proposal Sent Confirmation - inline after proposal is sent */}
      {showProposalSentConfirmation && proposalSentData && (
        <div className="mt-4 w-full">
          <ProposalSentConfirmation {...proposalSentData} />
        </div>
      )}

      {/* Contract Sent Confirmation - inline after contract is sent via Book Flight */}
      {showContractSentConfirmation && contractSentData && (
        <div className="mt-4 w-full">
          <ContractSentConfirmation
            {...contractSentData}
            onMarkPayment={onMarkPayment
              ? () => onMarkPayment(contractSentData.contractId, contractSentData)
              : undefined}
          />
        </div>
      )}

      {/* Payment Confirmed Card - inline after payment is recorded */}
      {showPaymentConfirmation && paymentConfirmationData && (
        <div className="mt-4 w-full">
          <PaymentConfirmedCard {...paymentConfirmationData} />
        </div>
      )}

      {/* Closed Won Confirmation - inline after deal is closed */}
      {showClosedWon && closedWonData && (
        <div className="mt-4 w-full">
          <ClosedWonConfirmation {...closedWonData} />
        </div>
      )}

      {/* Pipeline Dashboard - inline deals/requests view */}
      {showPipeline && pipelineData && (
        <PipelineDashboard
          stats={pipelineData.stats}
          requests={pipelineData.recentRequests}
          onViewRequest={onViewRequest}
          onRefresh={onRefreshPipeline}
          className="mt-2"
        />
      )}

      {/* Operator Messages Inline - displays messages from operators grouped by quote */}
      {showOperatorMessages &&
        operatorMessages &&
        Object.keys(operatorMessages).length > 0 &&
        (() => {
          // Build the chatsByQuote Map for OperatorChatsInline
          const chatsByQuote = new Map<
            string,
            {
              flightContext: FlightContext
              messages: OperatorMessageInline[]
              hasNewMessages?: boolean
            }
          >()

          for (const [quoteId, messages] of Object.entries(operatorMessages)) {
            if (messages.length === 0) continue

            // Get flight context from provided map or create default
            const flightContext = operatorFlightContext?.[quoteId] || {
              quoteId,
              operatorName:
                messages.find((m) => m.type === "RESPONSE")?.sender ||
                "Operator",
            }

            // Check for new messages (messages after the most recent REQUEST type)
            const lastRequestIdx = messages.findLastIndex(
              (m) => m.type === "REQUEST"
            )
            const hasNewMessages =
              lastRequestIdx >= 0 &&
              messages
                .slice(lastRequestIdx + 1)
                .some((m) => m.type === "RESPONSE")

            chatsByQuote.set(quoteId, {
              flightContext,
              messages: messages as OperatorMessageInline[],
              hasNewMessages,
            })
          }

          if (chatsByQuote.size === 0) return null

          return (
            <OperatorChatsInline
              chatsByQuote={chatsByQuote}
              onViewFullThread={onViewOperatorThread}
              onReply={onReplyToOperator}
              className="mt-3"
            />
          )
        })()}

      {/* Timestamp - show time-only for today, date+time for older messages */}
      <span className="text-xs text-muted-foreground">
        {(() => {
          if (!(timestamp instanceof Date) || isNaN(timestamp.getTime())) return ''
          const now = new Date()
          const isToday = timestamp.getFullYear() === now.getFullYear() &&
            timestamp.getMonth() === now.getMonth() &&
            timestamp.getDate() === now.getDate()
          if (isToday) {
            return timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
          }
          const datePart = timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          const timePart = timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
          return `${datePart} at ${timePart}`
        })()}
      </span>
    </div>
  )
}

/**
 * Customer Preferences Display - shows customer-specific preferences
 */
function CustomerPreferencesDisplay({ customer }: { customer: ChatSession['customer'] }) {
  if (!customer) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <div className="w-5 h-5 rounded-full bg-info-bg flex items-center justify-center">
          <span className="text-xs font-semibold text-primary">
            {customer.name?.charAt(0) || 'C'}
          </span>
        </div>
        <h4 className="font-medium text-sm">Customer Preferences - {customer.name}</h4>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {customer.preferences?.catering && (
          <div className="p-3 bg-warning-bg rounded-lg border border-warning-border">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-warning font-medium">Catering</span>
            </div>
            <p className="text-foreground">{customer.preferences.catering}</p>
          </div>
        )}
        {customer.preferences?.groundTransport && (
          <div className="p-3 bg-status-processing/10 rounded-lg border border-status-processing/30">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-status-processing font-medium">Ground Transport</span>
            </div>
            <p className="text-foreground">{customer.preferences.groundTransport}</p>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Quote Status Display - shows live quote status from operators
 */
function QuoteStatusDisplay() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Live Quote Status:</h4>
        <span className="text-xs px-2 py-1 bg-surface-tertiary rounded-full">
          Waiting for responses...
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        Quotes will appear here once received from operators.
      </p>
    </div>
  )
}

/**
 * Quote Comparison Display - shows and compares received quotes
 */
function QuoteComparisonDisplay({
  quotes,
  onSelectQuote,
}: {
  quotes: Quote[]
  onSelectQuote?: (quoteId: string) => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Compare Flight Quotes</h4>
        <span className="text-xs px-2 py-1 bg-surface-tertiary rounded-full">
          {quotes.length} quote{quotes.length !== 1 ? 's' : ''} received
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quotes.map((quote) => (
          <QuoteCard
            key={quote.id}
            operatorName={quote.operatorName}
            aircraftType={quote.aircraftType}
            price={quote.price}
            score={quote.score}
            ranking={quote.ranking}
            totalQuotes={quotes.length}
            operatorRating={quote.operatorRating}
            departureTime={quote.departureTime}
            arrivalTime={quote.arrivalTime}
            flightDuration={quote.flightDuration}
            isRecommended={quote.isRecommended}
            onSelect={() => onSelectQuote?.(quote.id)}
          />
        ))}
      </div>
    </div>
  )
}

export default AgentMessage
