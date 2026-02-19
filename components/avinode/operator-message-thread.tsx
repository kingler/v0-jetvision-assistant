"use client"

import { useState, useEffect, useRef } from "react"
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  X,
  Send,
  Loader2,
  AlertCircle,
  Plane,
  User,
  Check,
  CheckCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ============================================================================
// Types
// ============================================================================

export interface OperatorMessage {
  id: string
  content: string
  sender_type: 'operator' | 'iso_agent' | 'system'
  sender_name?: string
  sender_operator_id?: string
  sender_iso_agent_id?: string
  created_at: string
  status?: 'sent' | 'delivered' | 'read' | 'failed'
  rich_content?: {
    type: string
    data: any
  }
}

export interface OperatorMessageThreadProps {
  /** Whether the dialog is open */
  isOpen: boolean
  /** Callback to close the dialog */
  onClose: () => void
  /** Trip ID for fetching messages */
  tripId?: string
  /** Request ID (RFQ ID) for fetching messages */
  requestId?: string
  /** Quote ID for context */
  quoteId?: string
  /** Flight ID for context */
  flightId?: string
  /** Operator name for display */
  operatorName?: string
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format timestamp to user-friendly format
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  // Same day - show time
  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  // Yesterday
  if (diffDays === 1) {
    return `Yesterday ${date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })}`
  }

  // Within last week - show day and time
  if (diffDays < 7) {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  // Older - show date and time
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Get initials from sender name
 */
function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

/**
 * Message Status Indicator Component
 */
const MessageStatusIndicator: React.FC<{ status?: OperatorMessage['status'] }> = ({ status }) => {
  switch (status) {
    case 'sent':
      return (
        <Check
          className="w-3 h-3 text-text-placeholder"
          aria-label="Sent"
        />
      )
    case 'delivered':
      return (
        <CheckCheck
          className="w-3 h-3 text-info"
          aria-label="Delivered"
        />
      )
    case 'read':
      return (
        <CheckCheck
          className="w-3 h-3 text-success"
          aria-label="Read"
        />
      )
    case 'failed':
      return (
        <AlertCircle
          className="w-3 h-3 text-destructive"
          aria-label="Failed"
        />
      )
    default:
      return null
  }
}

/**
 * Check if messages should be grouped (same sender, within 5 minutes)
 */
function shouldGroupMessages(current: OperatorMessage, previous: OperatorMessage | null): boolean {
  if (!previous) return false
  if (current.sender_type !== previous.sender_type) return false
  if (current.sender_iso_agent_id !== previous.sender_iso_agent_id) return false
  if (current.sender_operator_id !== previous.sender_operator_id) return false

  const currentTime = new Date(current.created_at).getTime()
  const previousTime = new Date(previous.created_at).getTime()
  const diffMinutes = (currentTime - previousTime) / 60000

  return diffMinutes < 5
}

// ============================================================================
// Main Component
// ============================================================================

export function OperatorMessageThread({
  isOpen,
  onClose,
  tripId,
  requestId,
  quoteId,
  flightId,
  operatorName,
}: OperatorMessageThreadProps) {
  const [messages, setMessages] = useState<OperatorMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [messageInput, setMessageInput] = useState('')
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Fetch messages when dialog opens
  useEffect(() => {
    if (isOpen && (tripId || requestId)) {
      fetchMessages()
    }
  }, [isOpen, tripId, requestId])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (bottomRef.current && typeof bottomRef.current.scrollIntoView === 'function') {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  /**
   * Fetch messages from Avinode API (primary), then fallback to database
   *
   * Priority order:
   * 1. Avinode API via get_trip_messages (GET /tripmsgs/{rfqId}/chat)
   * 2. Database messages (webhook-synced) as fallback
   */
  const fetchMessages = async () => {
    if (!tripId && !requestId) {
      setError('Either trip ID or request ID is required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      let messagesArray: any[] = []

      // Step 1: Fetch from Avinode API (primary source)
      if (tripId || requestId) {
        try {
          console.log('[OperatorMessageThread] Fetching from Avinode API:', { tripId, requestId })

          const response = await fetch('/api/avinode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tool: 'get_trip_messages',
              params: {
                ...(tripId && { trip_id: tripId }),
                limit: 100,
              },
            }),
          })

          if (response.ok) {
            const data = await response.json()

            // Extract messages from the response (API wraps in { result: { messages } })
            if (data.result?.messages && Array.isArray(data.result.messages)) {
              messagesArray = data.result.messages
            } else if (Array.isArray(data.result)) {
              messagesArray = data.result
            } else if (data.result?.data?.messages && Array.isArray(data.result.data.messages)) {
              messagesArray = data.result.data.messages
            }

            console.log('[OperatorMessageThread] Avinode API returned', messagesArray.length, 'messages')
          } else {
            console.warn('[OperatorMessageThread] Avinode API failed:', response.status)
          }
        } catch (apiError) {
          console.warn('[OperatorMessageThread] Avinode API fetch failed, will try database:', apiError)
        }
      }

      // Step 2: Fallback to database if Avinode API returned nothing
      if (messagesArray.length === 0 && requestId) {
        try {
          console.log('[OperatorMessageThread] Falling back to database:', { requestId, quoteId })

          const dbUrl = new URL('/api/chat-sessions/messages', window.location.origin)
          dbUrl.searchParams.set('session_id', requestId)
          if (quoteId) {
            dbUrl.searchParams.set('quote_id', quoteId)
          }
          dbUrl.searchParams.set('limit', '100')

          const dbResponse = await fetch(dbUrl.toString(), {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          })

          if (dbResponse.ok) {
            const dbData = await dbResponse.json()
            const dbMessages = dbData.messages || []

            // Transform and filter to operator/user messages only
            messagesArray = dbMessages
              .map((msg: any) => ({
                id: msg.id,
                content: msg.content || '',
                sender_type: msg.metadata?.sender_type ||
                            (msg.type === 'user' ? 'iso_agent' :
                             msg.type === 'agent' ? (msg.senderName ? 'operator' : 'ai_assistant') : 'system'),
                sender_name: msg.senderName || (msg.type === 'user' ? 'You' : 'Operator'),
                sender_operator_id: msg.metadata?.sender_operator_id,
                sender_iso_agent_id: msg.metadata?.sender_iso_agent_id,
                created_at: msg.timestamp || new Date().toISOString(),
                status: msg.metadata?.status || 'sent',
                rich_content: msg.richContent,
              }))
              .filter((msg: any) => msg.sender_type === 'operator' || msg.sender_type === 'iso_agent')

            console.log('[OperatorMessageThread] DB fallback returned', messagesArray.length, 'operator messages')
          }
        } catch (dbError) {
          console.warn('[OperatorMessageThread] Database fetch also failed:', dbError)
        }
      }

      // Sort by timestamp (oldest first)
      const transformedMessages: OperatorMessage[] = messagesArray
      transformedMessages.sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )

      setMessages(transformedMessages)
    } catch (err) {
      console.error('[OperatorMessageThread] Error fetching messages:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch messages')
      setMessages([])
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Send a message to the operator
   */
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !tripId) {
      return
    }

    setIsSending(true)
    setError(null)

    try {
      const response = await fetch('/api/avinode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'send_trip_message',
          params: {
            trip_id: tripId,
            message: messageInput.trim(),
            recipient_type: 'all_operators',
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to send message')
      }

      // Clear input
      setMessageInput('')

      // Refresh messages to show the new message
      await fetchMessages()
    } catch (err) {
      console.error('[OperatorMessageThread] Error sending message:', err)
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  /**
   * Handle Enter key press
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <ResponsiveModal open={isOpen} onOpenChange={onClose}>
      <ResponsiveModalContent
        className={cn(
          "sm:max-w-2xl w-full h-[85vh] sm:h-[80vh] max-h-[800px]",
          "flex flex-col p-0"
        )}
      >
        {/* Header */}
        <ResponsiveModalHeader className="p-4 sm:p-6 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <ResponsiveModalTitle className="text-base sm:text-lg font-semibold">
                Operator Messages
              </ResponsiveModalTitle>
              {operatorName && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {operatorName}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </ResponsiveModalHeader>

        {/* Messages Area */}
        <ScrollArea
          ref={scrollAreaRef}
          className="flex-1 p-4 sm:p-6"
        >
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-info" />
              <span className="ml-2 text-xs sm:text-sm text-muted-foreground">
                Loading messages...
              </span>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                <span className="text-xs sm:text-sm font-medium">{error}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchMessages}
                className="min-h-[44px] md:min-h-0"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Plane className="w-12 h-12 text-text-placeholder mb-3" />
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                No messages yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Start a conversation with the operator
              </p>
            </div>
          )}

          {/* Message List */}
          {!isLoading && !error && messages.length > 0 && (
            <ul className="space-y-0">
              {messages.map((message, index) => {
                const previousMessage = index > 0 ? messages[index - 1] : null
                const isGrouped = shouldGroupMessages(message, previousMessage)
                const isOperator = message.sender_type === 'operator'
                const isUser = message.sender_type === 'iso_agent'
                const isSystem = message.sender_type === 'system'

                return (
                  <li
                    key={message.id}
                    className={cn(
                      'flex gap-2',
                      isUser ? 'flex-row-reverse' : 'flex-row',
                      isGrouped && 'mt-1',
                      !isGrouped && 'mt-4'
                    )}
                  >
                    {/* Avatar */}
                    {!isGrouped && !isSystem && (
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarFallback
                          className={cn(
                            isOperator && 'bg-info text-primary-foreground',
                            isUser && 'bg-success text-primary-foreground'
                          )}
                        >
                          {isOperator && <Plane className="w-4 h-4" />}
                          {isUser && <User className="w-4 h-4" />}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    {isGrouped && !isSystem && <div className="w-8 h-8 shrink-0" />}

                    {/* Message Content */}
                    <div
                      className={cn(
                        'flex flex-col gap-1 max-w-[75%]',
                        isUser && 'items-end',
                        isOperator && 'items-start',
                        isSystem && 'items-center w-full max-w-full'
                      )}
                    >
                      {/* Sender Name */}
                      {!isGrouped && !isSystem && message.sender_name && (
                        <div className="flex items-center gap-2 px-1">
                          <span className="text-xs font-semibold text-foreground">
                            {message.sender_name}
                          </span>
                          {isOperator && (
                            <Badge variant="outline" className="text-xs">
                              Operator
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Message Bubble */}
                      <div
                        className={cn(
                          'px-4 py-2 rounded-lg',
                          isOperator &&
                            'bg-surface-tertiary text-foreground',
                          isUser &&
                            'bg-primary text-primary-foreground',
                          isSystem && 'bg-warning-bg text-warning border border-warning-border'
                        )}
                      >
                        {message.content && (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {message.content}
                          </p>
                        )}
                      </div>

                      {/* Timestamp & Status */}
                      <div
                        className={cn(
                          'flex items-center gap-1 px-1',
                          isUser && 'flex-row-reverse'
                        )}
                      >
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(message.created_at)}
                        </span>
                        {isUser && <MessageStatusIndicator status={message.status} />}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {/* Auto-scroll anchor */}
          <div ref={bottomRef} />
        </ScrollArea>

        {/* Message Input */}
        {tripId ? (
          <div className="p-3 sm:p-4 border-t border-border shrink-0">
            <div className="flex gap-2">
              <Input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message to the operator..."
                className="flex-1 text-sm min-h-[44px] md:min-h-0"
                disabled={isSending}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!messageInput.trim() || isSending}
                size="sm"
                className="px-3 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        ) : requestId ? (
          <div className="p-3 sm:p-4 border-t border-border shrink-0">
            <div className="text-center text-xs sm:text-sm text-muted-foreground">
              <p>Message sending requires a trip ID. You can view messages but cannot reply at this time.</p>
            </div>
          </div>
        ) : null}
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
