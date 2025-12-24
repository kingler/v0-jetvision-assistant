"use client"

import React from "react"
import { Plane } from "lucide-react"
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
    rfpId?: string
    tripId?: string
    deepLink?: string
    departureAirport?: { icao: string; name?: string; city?: string }
    arrivalAirport?: { icao: string; name?: string; city?: string }
    departureDate?: string
    passengers?: number
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
  onViewChat?: (flightId: string) => void
  /** RFQ flights retrieved from Avinode */
  rfqFlights?: RFQFlight[]
  /** Whether RFQ flights are loading */
  isRfqFlightsLoading?: boolean
  /** Selected RFQ flight IDs for proposal */
  selectedRfqFlightIds?: string[]
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
  rfqFlights = [],
  isRfqFlightsLoading = false,
  selectedRfqFlightIds = [],
  customerEmail,
  customerName,
  onRfqFlightSelectionChange,
  onContinueToProposal,
  onReviewAndBook,
  onGeneratePreview,
  onSendProposal,
  onGoBackFromProposal,
}: AgentMessageProps) {
  const sortedQuotes = [...quotes].sort((a, b) => (a.ranking || 0) - (b.ranking || 0))

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
    <div data-testid="agent-message" className="flex flex-col space-y-3 max-w-[85%]">
      {/* Avatar + Badge Header */}
      <div className="flex items-center space-x-2">
        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
          <Plane className="w-3 h-3 text-white" />
        </div>
        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
          Jetvision Agent
        </span>
      </div>

      {/* Plain text content - NO bubble wrapper */}
      <div className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap">
        {stripMarkdown(content)}
      </div>

      {/* Customer Preferences - embedded in single card level */}
      {showCustomerPreferences && customer && (
        <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <CustomerPreferencesDisplay customer={customer} />
        </div>
      )}

      {/* Unified Flight Search Progress Component */}
      {shouldShowFlightSearchProgress && deepLinkData && (
        <FlightSearchProgress
          currentStep={getCurrentStep()}
          flightRequest={{
            departureAirport: deepLinkData.departureAirport || { icao: 'N/A' },
            arrivalAirport: deepLinkData.arrivalAirport || { icao: 'N/A' },
            departureDate: deepLinkData.departureDate || new Date().toISOString().split('T')[0],
            passengers: deepLinkData.passengers || 1,
            requestId: deepLinkData.rfpId,
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
          customerEmail={customerEmail}
          customerName={customerName}
          onTripIdSubmit={onTripIdSubmit}
          onDeepLinkClick={onDeepLinkClick}
          onCopyDeepLink={onCopyDeepLink}
          onViewChat={onViewChat}
          onRfqFlightSelectionChange={onRfqFlightSelectionChange}
          onContinueToProposal={onContinueToProposal}
          onReviewAndBook={onReviewAndBook}
          onGeneratePreview={onGeneratePreview}
          onSendProposal={onSendProposal}
          onGoBackFromProposal={onGoBackFromProposal}
        />
      )}

      {/* Quote Status Display - only when waiting for quotes (no workflow shown) */}
      {showQuotes && quotes.length === 0 && !shouldShowFlightSearchProgress && (
        <div data-testid="quote-status-waiting" className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <QuoteStatusDisplay />
        </div>
      )}

      {/* Quote Comparison - embedded in single card level */}
      {showQuotes && quotes.length > 0 && (
        <div data-testid="quote-comparison" className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <QuoteComparisonDisplay
            quotes={sortedQuotes}
            onSelectQuote={onSelectQuote}
          />
        </div>
      )}

      {/* Proposal Preview - embedded in single card level */}
      {showProposal && chatData && (
        <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <ProposalPreview embedded={true} chatData={chatData} />
        </div>
      )}

      {/* Timestamp */}
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {timestamp.toLocaleTimeString()}
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
        <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
            {customer.name?.charAt(0) || 'C'}
          </span>
        </div>
        <h4 className="font-medium text-sm">Customer Preferences - {customer.name}</h4>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {customer.preferences?.catering && (
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-orange-600 dark:text-orange-400 font-medium">Catering</span>
            </div>
            <p className="text-orange-700 dark:text-orange-300">{customer.preferences.catering}</p>
          </div>
        )}
        {customer.preferences?.groundTransport && (
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-purple-600 dark:text-purple-400 font-medium">Ground Transport</span>
            </div>
            <p className="text-purple-700 dark:text-purple-300">{customer.preferences.groundTransport}</p>
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
        <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
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
        <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
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
