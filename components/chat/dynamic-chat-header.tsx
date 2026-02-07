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
 * Generate a default flight request name based on chat data
 */
function generateDefaultFlightName(chat: ChatSession | null): string {
  if (!chat) return 'Flight Request'

  const parts: string[] = []

  // Try to extract airports from route
  if (chat.route) {
    // Route format is typically "KTEB -> KPBI" or similar
    const airports = chat.route.split(/\s*(?:->|→|to)\s*/i)
    if (airports.length >= 2) {
      parts.push(`${airports[0].trim()} to ${airports[1].trim()}`)
    } else {
      parts.push(chat.route)
    }
  }

  // Add date if available
  if (chat.date) {
    parts.push(chat.date)
  }

  if (parts.length === 0) {
    return `Flight Request #${chat.id}`
  }

  return parts.join(' - ')
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
 * DynamicChatHeader - Dynamic header with flight name, IDs, and quote requests
 * Replaces the static header in chat-interface.tsx
 */
export function DynamicChatHeader({
  activeChat,
  flightRequestName,
  showTripId,
  quoteRequests = [],
  onViewQuoteDetails,
  onCopyTripId,
}: DynamicChatHeaderProps) {
  const [copied, setCopied] = useState(false)

  if (!activeChat) {
    return (
      <div className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white text-lg">
              No Chat Selected
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Select a chat from the sidebar or start a new conversation
            </p>
          </div>
        </div>
      </div>
    )
  }

  const displayName = flightRequestName || activeChat.generatedName || generateDefaultFlightName(activeChat)

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

  return (
    <div className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 px-6 py-4">
      {/* Primary Row: Name, Flight ID, Status */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-gray-900 dark:text-white text-lg truncate">
            {displayName}
          </h2>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
            {activeChat.route && <span>{activeChat.tripType === 'round_trip' ? activeChat.route.replace(' → ', ' ⇄ ') : activeChat.route}</span>}
            {activeChat.passengers && (
              <>
                <span className="text-gray-400 dark:text-gray-500">•</span>
                <span>{activeChat.passengers} passengers</span>
              </>
            )}
            {activeChat.date && (
              <>
                <span className="text-gray-400 dark:text-gray-500">•</span>
                <span>
                  {(() => {
                    // Format ISO date (YYYY-MM-DD) or formatted date string for display
                    try {
                      const dep = formatDate(activeChat.date)
                      if (activeChat.tripType === 'round_trip' && activeChat.returnDate) {
                        try {
                          return `${dep} – ${formatDate(activeChat.returnDate)}`
                        } catch { /* fall through */ }
                      }
                      return dep
                    } catch {
                      // If parsing fails, use as-is (might already be formatted)
                    }
                    return activeChat.date
                  })()}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Trip ID Badge with Copy (only when tripId exists) */}
          {activeChat.tripId && (
            <Badge
              variant="secondary"
              className="font-mono text-xs font-semibold text-black dark:text-black cursor-pointer hover:bg-secondary/80 transition-colors"
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
