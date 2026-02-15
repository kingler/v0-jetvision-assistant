"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Copy, Check } from "lucide-react"
import { QuoteRequestList } from "./quote-request-list"
import type { QuoteRequest } from "./quote-request-item"
import type { ChatSession } from "../chat-sidebar"
import { FlightRequestStageBadge } from "@/components/flight-request-stage-badge"
import type { FlightRequestStage } from "@/components/flight-request-stage-badge"
import { formatDate } from "@/lib/utils/format"

export interface DynamicChatHeaderProps {
  /** Current active chat session */
  activeChat: ChatSession | null
  /** AI-generated descriptive name for the flight request */
  flightRequestName?: string
  /** Whether to show quote requests (only after Avinode trip creation) */
  showTripId: boolean
  /** Quote requests to display */
  quoteRequests?: QuoteRequest[]
  /** Callback when "View Details" is clicked on a quote request */
  onViewQuoteDetails: (quoteId: string) => void
  /** Callback to copy trip ID to clipboard */
  onCopyTripId?: () => void
}

/**
 * DynamicChatHeader - Header with route summary, trip ID, status, and quote requests.
 * No title line (redundant with initial flight request in chat).
 */
export function DynamicChatHeader({
  activeChat,
  flightRequestName: _flightRequestName, // accepted for API compatibility; title removed as redundant with chat
  showTripId,
  quoteRequests = [],
  onViewQuoteDetails,
  onCopyTripId,
}: DynamicChatHeaderProps) {
  const [copied, setCopied] = useState(false)

  if (!activeChat) {
    return (
      <div className="border-b border-border bg-surface-secondary px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-foreground text-[clamp(1rem,2.5vw,1.125rem)]">
              No Chat Selected
            </h2>
            <p className="text-[clamp(0.8125rem,2vw,0.875rem)] text-muted-foreground">
              Select a chat from the sidebar or start a new conversation
            </p>
          </div>
        </div>
      </div>
    )
  }

  const handleCopyTripId = async () => {
    if (activeChat?.tripId) {
      try {
        await navigator.clipboard.writeText(activeChat.tripId)
        setCopied(true)
        onCopyTripId?.()
        setTimeout(() => setCopied(false), 2000)
      } catch (error) {
        console.error('[DynamicChatHeader] Failed to copy trip ID:', error)
      }
    }
  }

  // Build single-line route summary so it truncates instead of wrapping (responsive header)
  const routeSummary = [
    activeChat.route && (activeChat.tripType === 'round_trip' ? activeChat.route.replace(' → ', ' ⇄ ') : activeChat.route),
    activeChat.passengers && `${activeChat.passengers} passengers`,
    activeChat.date && (() => {
      try {
        const dep = formatDate(activeChat.date)
        if (activeChat.tripType === 'round_trip' && activeChat.returnDate) {
          try { return `${dep} – ${formatDate(activeChat.returnDate)}` } catch { /* fall through */ }
        }
        return dep
      } catch {
        return activeChat.date
      }
    })(),
  ].filter(Boolean).join(' • ')

  return (
    <div className="border-b border-border bg-surface-secondary px-4 sm:px-6 py-3 sm:py-4">
      {/* Primary Row: single line, no wrap - route summary truncates; trip ID and status stay visible */}
      <div className="flex items-center justify-between gap-3 flex-nowrap min-w-0">
        <div className="flex-1 min-w-0 overflow-hidden">
          <span
            className="block text-[clamp(0.8125rem,2vw,0.875rem)] text-muted-foreground truncate"
            title={routeSummary}
          >
            {routeSummary || '—'}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-nowrap">
          {/* Trip ID Badge with Copy (only when tripId exists) */}
          {activeChat.tripId && (
            <Badge
              variant="secondary"
              className="font-mono text-[clamp(0.6875rem,1.5vw,0.75rem)] font-semibold text-black dark:text-black cursor-pointer hover:bg-secondary/80 transition-colors shrink-0"
              onClick={handleCopyTripId}
              role="button"
              tabIndex={0}
              aria-label={`Copy Trip ID ${activeChat.tripId}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleCopyTripId()
                }
              }}
            >
              {activeChat.tripId}
              {copied ? (
                <Check className="w-3 h-3 text-success" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </Badge>
          )}

          {/* Status Badge - all 10 flight request/booking stages */}
          {activeChat.status && (
            <FlightRequestStageBadge
              stage={activeChat.status as FlightRequestStage}
              label={
                activeChat.status === "requesting_quotes" &&
                activeChat.quotesReceived != null &&
                activeChat.quotesTotal != null
                  ? `Quotes ${activeChat.quotesReceived}/${activeChat.quotesTotal}`
                  : undefined
              }
            />
          )}
        </div>
      </div>

      {/* Quote Requests List - only when tripId exists and quotes available */}
      {showTripId && activeChat.tripId && quoteRequests.length > 0 && (
        <QuoteRequestList
          quotes={quoteRequests}
          onViewDetails={onViewQuoteDetails}
        />
      )}
    </div>
  )
}

export default DynamicChatHeader
