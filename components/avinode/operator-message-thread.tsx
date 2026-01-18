"use client"

import { useState, useEffect, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
          className="w-3 h-3 text-gray-400"
          aria-label="Sent"
        />
      )
    case 'delivered':
      return (
        <CheckCheck
          className="w-3 h-3 text-blue-500"
          aria-label="Delivered"
        />
      )
    case 'read':
      return (
        <CheckCheck
          className="w-3 h-3 text-green-500"
          aria-label="Read"
        />
      )
    case 'failed':
      return (
        <AlertCircle
          className="w-3 h-3 text-red-500"
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
   * Fetch messages from database first, then fallback to Avinode API
   *
   * Priority order:
   * 1. Database messages (synced via sync-avinode-trips script)
   * 2. Avinode API (for real-time messages not yet synced)
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

      // Step 1: Try to fetch from database first (synced messages)
      if (requestId) {
        try {
          const dbUrl = new URL('/api/chat-sessions/messages', window.location.origin)
          dbUrl.searchParams.set('session_id', requestId)
          if (quoteId) {
            dbUrl.searchParams.set('quote_id', quoteId)
          }
          dbUrl.searchParams.set('limit', '100')

          const dbResponse = await fetch(dbUrl.toString(), {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          })

          if (dbResponse.ok) {
            const dbData = await dbResponse.json()
            if (dbData.messages && Array.isArray(dbData.messages) && dbData.messages.length > 0) {
              console.log('[OperatorMessageThread] Loaded', dbData.messages.length, 'messages from database')

              // Transform database messages to our format
              // Database messages have: id, type, content, timestamp, senderName, quoteId
              messagesArray = dbData.messages.map((msg: any) => ({
                id: msg.id,
                content: msg.content || '',
                // Map 'user' -> 'iso_agent', 'agent' -> 'operator' (reversed from UI type)
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
            }
          }
        } catch (dbError) {
          console.warn('[OperatorMessageThread] Database fetch failed, will try Avinode API:', dbError)
        }
      }

      // Step 2: If no database messages, try Avinode API
      if (messagesArray.length === 0 && (tripId || requestId)) {
        console.log('[OperatorMessageThread] No database messages, fetching from Avinode API')

        const response = await fetch('/api/avinode', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tool: 'get_trip_messages',
            params: {
              ...(tripId && { trip_id: tripId }),
              ...(requestId && { request_id: requestId }),
              limit: 100,
            },
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to fetch messages')
        }

        const data = await response.json()

        // Transform the API response to our message format
        // The API returns messages in various formats that need to be normalized

        // Handle different response structures
        if (data.result) {
          if (Array.isArray(data.result)) {
            // Direct array of messages
            messagesArray = data.result
          } else if (data.result.messages && Array.isArray(data.result.messages)) {
            // Nested messages array
            messagesArray = data.result.messages
          } else if (data.result.data?.messages && Array.isArray(data.result.data.messages)) {
            // Deeply nested messages array
            messagesArray = data.result.data.messages
          }
        } else if (Array.isArray(data.messages)) {
          // Messages at root level
          messagesArray = data.messages
        } else if (data.data?.messages && Array.isArray(data.data.messages)) {
          // Messages in data.messages
          messagesArray = data.data.messages
        }

        // Transform Avinode API messages to our format
        messagesArray = messagesArray.map((msg: any, index: number) => ({
          id: msg.id || msg.message_id || `msg-${index}-${Date.now()}`,
          content: msg.content || msg.message || msg.text || '',
          sender_type: msg.sender_type || (msg.sender_operator_id ? 'operator' : msg.sender_iso_agent_id ? 'iso_agent' : 'system'),
          sender_name: msg.sender_name || msg.operator_name || msg.sender || 'Operator',
          sender_operator_id: msg.sender_operator_id,
          sender_iso_agent_id: msg.sender_iso_agent_id,
          created_at: msg.created_at || msg.timestamp || msg.date || new Date().toISOString(),
          status: msg.status,
          rich_content: msg.rich_content,
        }))
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          "max-w-2xl w-full h-[80vh] max-h-[800px]",
          "flex flex-col p-0"
        )}
      >
        {/* Header */}
        <DialogHeader className="p-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-semibold">
                Operator Messages
              </DialogTitle>
              {operatorName && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {operatorName}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Messages Area */}
        <ScrollArea
          ref={scrollAreaRef}
          className="flex-1 p-6"
        >
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                Loading messages...
              </span>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm font-medium">{error}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchMessages}
              >
                Retry
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Plane className="w-12 h-12 text-gray-400 mb-3" />
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                No messages yet
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
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
                            isOperator && 'bg-blue-500 text-white',
                            isUser && 'bg-green-500 text-white'
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
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
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
                            'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100',
                          isUser &&
                            'bg-blue-600 dark:bg-blue-700 text-white',
                          isSystem && 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-100 border border-yellow-200 dark:border-yellow-800'
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
                        <span className="text-xs text-gray-500 dark:text-gray-400">
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
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
            <div className="flex gap-2">
              <Input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message to the operator..."
                className="flex-1"
                disabled={isSending}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!messageInput.trim() || isSending}
                size="sm"
                className="px-3"
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
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              <p>Message sending requires a trip ID. You can view messages but cannot reply at this time.</p>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
