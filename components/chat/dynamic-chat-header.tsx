"use client"

import React, { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Copy, Check, FileText, Loader2, Clock, CheckCircle, Plane, Receipt } from "lucide-react"
import { QuoteRequestList } from "./quote-request-list"
import type { QuoteRequest } from "./quote-request-item"
import type { ChatSession } from "../chat-sidebar"
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
 * Status badge config for each flight request/booking stage.
 * Maps ChatSession status to label, icon, and semantic color for consistency.
 */
const STATUS_BADGE_CONFIG: Record<
  ChatSession["status"],
  { label: string; icon: typeof FileText; className: string }
> = {
  understanding_request: {
    label: "Understanding Request",
    icon: Loader2,
    className: "bg-status-proposal-sent text-white",
  },
  searching_aircraft: {
    label: "Searching Aircraft",
    icon: Plane,
    className: "bg-primary text-primary-foreground",
  },
  requesting_quotes: {
    label: "Requesting Quotes",
    icon: Loader2,
    className: "bg-status-processing text-white",
  },
  analyzing_options: {
    label: "Analyzing Options",
    icon: Clock,
    className: "bg-status-analyzing text-[#00A5DA]",
  },
  proposal_ready: {
    label: "Proposal Ready",
    icon: FileText,
    className: "bg-status-proposal-ready text-white",
  },
  proposal_sent: {
    label: "Proposal Sent",
    icon: FileText,
    className: "bg-status-proposal-sent text-white",
  },
  contract_generated: {
    label: "Contract Ready",
    icon: Receipt,
    className: "bg-status-contract-ready text-white",
  },
  contract_sent: {
    label: "Contract Sent",
    icon: Receipt,
    className: "bg-status-contract-sent text-white",
  },
  payment_pending: {
    label: "Payment Pending",
    icon: Clock,
    className: "bg-status-payment-pending text-white",
  },
  closed_won: {
    label: "Closed Won",
    icon: CheckCircle,
    className: "bg-status-closed-won text-white",
  },
}

/**
 * Get status badge for the current flight request/booking stage.
 * Renders Badge with appropriate icon and semantic color per workflow step.
 */
function getStatusBadge(session: ChatSession | null): React.ReactNode {
  if (!session) return null

  const config = STATUS_BADGE_CONFIG[session.status]
  if (!config) {
    return (
      <Badge variant="secondary" className="bg-status-pending text-white text-xs">
        Pending
      </Badge>
    )
  }

  const Icon = config.icon
  const isAnimated =
    session.status === "requesting_quotes" ||
    session.status === "understanding_request" ||
    session.status === "searching_aircraft"

  const displayLabel =
    session.status === "requesting_quotes" &&
    session.quotesReceived != null &&
    session.quotesTotal != null
      ? `Quotes ${session.quotesReceived}/${session.quotesTotal}`
      : config.label

  return (
    <Badge className={`${config.className} text-xs`}>
      <Icon className={`w-3 h-3 ${isAnimated ? "animate-spin" : ""}`} />
      {displayLabel}
    </Badge>
  )
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
                <Check className="w-3 h-3 text-green-500" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </Badge>
          )}

          {/* Status Badge - all 10 flight request/booking stages */}
          {getStatusBadge(activeChat)}
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
