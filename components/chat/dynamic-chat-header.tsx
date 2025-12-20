"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy, Check, Loader2, FileText } from "lucide-react"
import { QuoteRequestList } from "./quote-request-list"
import type { QuoteRequest } from "./quote-request-item"
import type { ChatSession } from "../chat-sidebar"

export interface DynamicChatHeaderProps {
  /** Current active chat session */
  activeChat: ChatSession | null
  /** AI-generated descriptive name for the flight request */
  flightRequestName?: string
  /** Whether to show the Trip ID section (only after Avinode trip creation) */
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
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Requesting Quotes
        </Badge>
      )
    case 'understanding_request':
      return (
        <Badge className="bg-blue-500 text-white">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Understanding Request
        </Badge>
      )
    case 'searching_aircraft':
      return (
        <Badge className="bg-purple-500 text-white">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Searching Aircraft
        </Badge>
      )
    case 'analyzing_options':
      return (
        <Badge className="bg-orange-500 text-white">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
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
            {activeChat.route && <span>{activeChat.route}</span>}
            {activeChat.passengers && (
              <>
                <span className="text-gray-400 dark:text-gray-500">•</span>
                <span>{activeChat.passengers} passengers</span>
              </>
            )}
            {activeChat.date && (
              <>
                <span className="text-gray-400 dark:text-gray-500">•</span>
                <span>{activeChat.date}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Flight ID Badge */}
          <Badge variant="outline" className="font-mono text-xs">
            FR-{activeChat.id}
          </Badge>

          {/* Status Badge */}
          {getStatusBadge(activeChat.status)}
        </div>
      </div>

      {/* Trip ID Row - only when tripId exists */}
      {showTripId && activeChat.tripId && (
        <div className="flex items-center gap-2 py-2 border-t border-gray-200 dark:border-gray-700 mt-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Trip ID:</span>
          <Badge variant="secondary" className="font-mono text-xs">
            {activeChat.tripId}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyTripId}
            className="h-6 px-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {copied ? (
              <Check className="w-3 h-3 text-green-500" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </Button>
        </div>
      )}

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
