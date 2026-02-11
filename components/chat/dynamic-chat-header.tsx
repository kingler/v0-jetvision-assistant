"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy, Check, FileText } from "lucide-react"
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
 * Get status badge based on chat status
 */
function getStatusBadge(status: ChatSession['status']) {
  switch (status) {
    case 'proposal_ready':
      return (
        <Badge className="bg-green-500 text-white">
          <FileText className="w-3 h-3 mr-1" />
          Proposal Ready
        </Badge>
      )
    case 'requesting_quotes':
      return (
        <Badge className="bg-cyan-500 text-white">
          Requesting Quotes
        </Badge>
      )
    case 'understanding_request':
      return (
        <Badge className="bg-blue-500 text-white">
          Understanding Request
        </Badge>
      )
    case 'searching_aircraft':
      return (
        <Badge className="bg-purple-500 text-white">
          Searching Aircraft
        </Badge>
      )
    case 'analyzing_options':
      return (
        <Badge className="bg-orange-500 text-white">
          Analyzing Options
        </Badge>
      )
    default:
      return null
  }
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
      <div className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white text-[clamp(1rem,2.5vw,1.125rem)]">
              No Chat Selected
            </h2>
            <p className="text-[clamp(0.8125rem,2vw,0.875rem)] text-gray-600 dark:text-gray-400">
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
    <div className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 px-4 sm:px-6 py-3 sm:py-4">
      {/* Primary Row: single line, no wrap - route summary truncates; trip ID and status stay visible */}
      <div className="flex items-center justify-between gap-3 flex-nowrap min-w-0">
        <div className="flex-1 min-w-0 overflow-hidden">
          <span
            className="block text-[clamp(0.8125rem,2vw,0.875rem)] text-gray-600 dark:text-gray-400 truncate"
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

          {/* Status Badge */}
          {getStatusBadge(activeChat.status)}
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
