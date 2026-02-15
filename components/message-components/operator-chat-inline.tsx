/**
 * Operator Chat Inline Component
 *
 * Displays operator messages inline within agent responses.
 * Messages are tagged with quoteID and show operator name and flight details.
 */

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  MessageSquare,
  Plane,
  User,
  Building2,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface OperatorMessageInline {
  id: string
  content: string
  timestamp: string
  type: "REQUEST" | "RESPONSE" | "INFO" | "CONFIRMATION"
  sender?: string
}

export interface FlightContext {
  quoteId: string
  operatorName: string
  aircraftType?: string
  departureAirport?: string
  arrivalAirport?: string
  price?: number
  currency?: string
}

export interface OperatorChatInlineProps {
  /** Flight context including quote ID, operator, and flight details */
  flightContext: FlightContext
  /** Messages from the operator */
  messages: OperatorMessageInline[]
  /** Whether there are unread messages */
  hasNewMessages?: boolean
  /** Callback when "View Full Thread" is clicked */
  onViewFullThread?: (quoteId: string) => void
  /** Callback when "Reply" is clicked */
  onReply?: (quoteId: string) => void
  /** Maximum messages to show inline (default: 2) */
  maxMessagesInline?: number
  /** Additional CSS classes */
  className?: string
}

function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  } catch {
    return timestamp
  }
}

function formatPrice(price: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

export function OperatorChatInline({
  flightContext,
  messages,
  hasNewMessages = false,
  onViewFullThread,
  onReply,
  maxMessagesInline = 2,
  className,
}: OperatorChatInlineProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)

  // Sort messages by timestamp (newest first for display)
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  // Get the latest operator message (RESPONSE type)
  const latestOperatorMessage = sortedMessages.find(
    (msg) => msg.type === "RESPONSE"
  )

  // Get messages to display inline
  const displayMessages = isExpanded
    ? sortedMessages
    : sortedMessages.slice(0, maxMessagesInline)

  const hasMoreMessages = messages.length > maxMessagesInline

  if (!latestOperatorMessage && messages.length === 0) {
    return null
  }

  return (
    <Card
      className={cn(
        "border-l-4 border-l-primary",
        hasNewMessages && "ring-2 ring-primary/50",
        className
      )}
    >
      <CardContent className="p-4">
        {/* Header: Operator and Flight Context */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-primary/10">
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground">
                  {flightContext.operatorName}
                </span>
                {hasNewMessages && (
                  <Badge variant="default" className="bg-primary text-xs">
                    New
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {flightContext.aircraftType && (
                  <span className="flex items-center gap-1">
                    <Plane className="h-3 w-3" />
                    {flightContext.aircraftType}
                  </span>
                )}
                {flightContext.departureAirport &&
                  flightContext.arrivalAirport && (
                    <span>
                      {flightContext.departureAirport} &rarr;{" "}
                      {flightContext.arrivalAirport}
                    </span>
                  )}
              </div>
            </div>
          </div>

          {/* Price Tag */}
          {flightContext.price && (
            <Badge variant="outline" className="font-mono">
              {formatPrice(flightContext.price, flightContext.currency)}
            </Badge>
          )}
        </div>

        {/* Quote ID Reference */}
        <div className="mb-3 px-2 py-1 bg-muted rounded text-xs font-mono text-muted-foreground inline-block">
          Quote: {flightContext.quoteId.substring(0, 12)}...
        </div>

        {/* Messages */}
        <div className="space-y-2">
          {displayMessages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "rounded-lg p-3",
                message.type === "RESPONSE"
                  ? "bg-card border border-border"
                  : "bg-info-bg border border-info-border ml-4"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                {message.type === "RESPONSE" ? (
                  <Building2 className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <User className="h-3 w-3 text-primary" />
                )}
                <span className="text-xs font-medium text-muted-foreground">
                  {message.sender ||
                    (message.type === "RESPONSE" ? "Operator" : "You")}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTimestamp(message.timestamp)}
                </span>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {message.content}
              </p>
            </div>
          ))}
        </div>

        {/* Expand/Collapse for more messages */}
        {hasMoreMessages && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 mt-2"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                Show {messages.length - maxMessagesInline} more message
                {messages.length - maxMessagesInline > 1 ? "s" : ""}
              </>
            )}
          </button>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border">
          {onReply && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReply(flightContext.quoteId)}
              className="text-xs"
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              Reply
            </Button>
          )}
          {onViewFullThread && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewFullThread(flightContext.quoteId)}
              className="text-xs text-muted-foreground"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View Full Thread
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * OperatorChatsInline - Displays multiple operator chat threads inline
 * Used when there are messages from multiple operators/quotes
 */
export interface OperatorChatsInlineProps {
  /** Map of quote ID to messages and flight context */
  chatsByQuote: Map<
    string,
    {
      flightContext: FlightContext
      messages: OperatorMessageInline[]
      hasNewMessages?: boolean
    }
  >
  /** Callback when "View Full Thread" is clicked */
  onViewFullThread?: (quoteId: string) => void
  /** Callback when "Reply" is clicked */
  onReply?: (quoteId: string) => void
  /** Maximum operator chats to show (default: 3) */
  maxChatsInline?: number
  /** Additional CSS classes */
  className?: string
}

export function OperatorChatsInline({
  chatsByQuote,
  onViewFullThread,
  onReply,
  maxChatsInline = 3,
  className,
}: OperatorChatsInlineProps) {
  const [showAll, setShowAll] = React.useState(false)
  const chatEntries = Array.from(chatsByQuote.entries())

  // Sort by most recent message
  chatEntries.sort((a, b) => {
    const latestA = a[1].messages.reduce((latest, msg) => {
      const msgTime = new Date(msg.timestamp).getTime()
      return msgTime > latest ? msgTime : latest
    }, 0)
    const latestB = b[1].messages.reduce((latest, msg) => {
      const msgTime = new Date(msg.timestamp).getTime()
      return msgTime > latest ? msgTime : latest
    }, 0)
    return latestB - latestA
  })

  const displayChats = showAll
    ? chatEntries
    : chatEntries.slice(0, maxChatsInline)
  const hasMoreChats = chatEntries.length > maxChatsInline
  const newMessagesCount = chatEntries.filter(
    ([, chat]) => chat.hasNewMessages
  ).length

  if (chatEntries.length === 0) {
    return null
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm text-foreground">
            Operator Messages
          </span>
          <Badge variant="secondary" className="text-xs">
            {chatEntries.length} thread{chatEntries.length !== 1 ? "s" : ""}
          </Badge>
          {newMessagesCount > 0 && (
            <Badge variant="default" className="bg-primary text-xs">
              {newMessagesCount} new
            </Badge>
          )}
        </div>
      </div>

      {/* Chat Threads */}
      <div className="space-y-2">
        {displayChats.map(([quoteId, chat]) => (
          <OperatorChatInline
            key={quoteId}
            flightContext={chat.flightContext}
            messages={chat.messages}
            hasNewMessages={chat.hasNewMessages}
            onViewFullThread={onViewFullThread}
            onReply={onReply}
          />
        ))}
      </div>

      {/* Show More/Less */}
      {hasMoreChats && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
        >
          {showAll ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Show fewer threads
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Show {chatEntries.length - maxChatsInline} more thread
              {chatEntries.length - maxChatsInline > 1 ? "s" : ""}
            </>
          )}
        </button>
      )}
    </div>
  )
}

export default OperatorChatInline
