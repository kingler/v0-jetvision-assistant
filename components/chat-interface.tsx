"use client"

/**
 * ChatInterface
 *
 * Refactored chat interface that uses extracted utilities from lib/chat:
 * - SSE parsing via parseSSEStream
 * - Quote transformation via rfq-transformer
 * - Constants from workflow.ts
 *
 * This version maintains the original props interface for page.tsx compatibility
 * while using cleaner, extracted utilities for data processing.
 */

import React from "react"
import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Loader2, Plane } from "lucide-react"
import type { ChatSession } from "./chat-sidebar"
import { createSupabaseClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

// UI Components
import { AgentMessage } from "./chat/agent-message"
import { DynamicChatHeader } from "./chat/dynamic-chat-header"
import { QuoteDetailsDrawer, type QuoteDetails, type OperatorMessage } from "./quote-details-drawer"
import { OperatorMessageThread } from "./avinode/operator-message-thread"
import { FlightSearchProgress } from "./avinode/flight-search-progress"
import type { QuoteRequest } from "./chat/quote-request-item"
import type { RFQFlight } from "./avinode/rfq-flight-card"

// Realtime webhook event type (from Supabase subscription)
interface RealtimeWebhookEvent {
  event_type: string
  payload?: {
    quoteId?: string
    quote_id?: string
    messageId?: string
    message?: string
    content?: string
    timestamp?: string
    senderName?: string
  }
}

// Extracted utilities from lib/chat
import {
  // Parsers
  parseSSEStream,
  extractQuotesFromSSEData,
  extractDeepLinkData,
  determineWorkflowStatus,
  // Transformers
  convertQuoteToRFQFlight,
  convertRfqToRFQFlight,
  mergeQuoteDetailsIntoFlights,
  extractRouteParts,
  // Types
  type Quote,
  type QuoteDetailsMap,
  type SSEParseResult,
} from "@/lib/chat"

/**
 * Convert markdown-formatted text to plain text
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[\s]*[-*+]\s+/gm, '• ')
    .replace(/^[\s]*(\d+)\.\s+/gm, '$1. ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

interface ChatInterfaceProps {
  activeChat: ChatSession
  isProcessing: boolean
  onProcessingChange: (processing: boolean) => void
  onUpdateChat: (chatId: string, updates: Partial<ChatSession>) => void
}

export function ChatInterface({
  activeChat,
  isProcessing,
  onProcessingChange,
  onUpdateChat,
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [streamError, setStreamError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const latestMessagesRef = useRef(activeChat.messages)
  const abortControllerRef = useRef<AbortController | null>(null)
  const hasCalledInitialApiRef = useRef(false)

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null)

  // Message thread popup state
  const [isMessageThreadOpen, setIsMessageThreadOpen] = useState(false)
  const [messageThreadTripId, setMessageThreadTripId] = useState<string | undefined>(undefined)
  const [messageThreadRequestId, setMessageThreadRequestId] = useState<string | undefined>(undefined)
  const [messageThreadQuoteId, setMessageThreadQuoteId] = useState<string | undefined>(undefined)
  const [messageThreadFlightId, setMessageThreadFlightId] = useState<string | undefined>(undefined)
  const [messageThreadOperatorName, setMessageThreadOperatorName] = useState<string | undefined>(undefined)

  // Trip ID input state
  const [isTripIdLoading, setIsTripIdLoading] = useState(false)
  const [tripIdError, setTripIdError] = useState<string | undefined>(undefined)
  const [tripIdSubmitted, setTripIdSubmitted] = useState(activeChat.tripIdSubmitted || false)

  // RFQ flight selection state
  const [selectedRfqFlightIds, setSelectedRfqFlightIds] = useState<string[]>([])

  // Quote details map
  const [quoteDetailsMap, setQuoteDetailsMap] = useState<QuoteDetailsMap>({})

  // Sync tripIdSubmitted with activeChat
  useEffect(() => {
    if (activeChat.tripIdSubmitted !== undefined) {
      setTripIdSubmitted(activeChat.tripIdSubmitted)
    }
  }, [activeChat.tripIdSubmitted])

  // Parse route to get airport info using extracted utility
  const routeParts = extractRouteParts(activeChat.route)

  // Convert quotes from activeChat to RFQ flights format
  const rfqFlights: RFQFlight[] = useMemo(() => {
    // If activeChat already has rfqFlights, use them
    if (activeChat.rfqFlights && activeChat.rfqFlights.length > 0) {
      return activeChat.rfqFlights
    }

    // Otherwise convert from quotes
    if (!activeChat.quotes || activeChat.quotes.length === 0) {
      return []
    }

    const flights = activeChat.quotes.map((quote) =>
      convertQuoteToRFQFlight(quote as Quote, routeParts, activeChat.date)
    ).filter((f): f is RFQFlight => f !== null)

    // Merge quote details if we have them
    if (Object.keys(quoteDetailsMap).length > 0) {
      return mergeQuoteDetailsIntoFlights(flights, quoteDetailsMap)
    }

    return flights
  }, [activeChat.rfqFlights, activeChat.quotes, activeChat.date, routeParts, quoteDetailsMap])

  // Scroll to bottom when messages change
  useEffect(() => {
    latestMessagesRef.current = activeChat.messages
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [activeChat.messages])

  // Handle initial API call for new chats
  useEffect(() => {
    if (activeChat.needsInitialApiCall && !hasCalledInitialApiRef.current && activeChat.initialUserMessage) {
      hasCalledInitialApiRef.current = true
      sendMessageWithStreaming(activeChat.initialUserMessage)
    }
  }, [activeChat.needsInitialApiCall, activeChat.initialUserMessage])

  // Supabase realtime subscription for webhook events
  useEffect(() => {
    if (!activeChat.tripId && !activeChat.requestId) return

    const supabase = createSupabaseClient()
    let channel: RealtimeChannel | null = null

    const setupSubscription = async () => {
      const filterField = activeChat.tripId ? 'trip_id' : 'request_id'
      const filterValue = activeChat.tripId || activeChat.requestId

      channel = supabase
        .channel(`webhook_events_${activeChat.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'avinode_webhook_events',
            filter: `${filterField}=eq.${filterValue}`,
          },
          (payload) => {
            console.log('[ChatInterface] Webhook event received:', payload)
            handleWebhookEvent(payload.new as RealtimeWebhookEvent)
          }
        )
        .subscribe()
    }

    setupSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [activeChat.tripId, activeChat.requestId, activeChat.id])

  /**
   * Handle webhook events from Supabase realtime
   */
  const handleWebhookEvent = useCallback((event: RealtimeWebhookEvent) => {
    const eventType = event.event_type
    const payload = event.payload || {}

    if (eventType === 'TripRequestSellerResponse') {
      // New quote received - trigger RFQ refresh
      const quoteId = payload.quoteId || payload.quote_id
      if (quoteId && activeChat.tripId) {
        handleTripIdSubmit(activeChat.tripId)
      }
    } else if (eventType === 'TripChatSeller' || eventType === 'TripChatMine') {
      // New message - update operator messages
      const quoteId = payload.quoteId || payload.quote_id
      if (quoteId) {
        const currentMessages = activeChat.operatorMessages?.[quoteId] || []
        const newMessage: OperatorMessage = {
          id: payload.messageId || `msg-${Date.now()}`,
          type: eventType === 'TripChatMine' ? 'REQUEST' : 'RESPONSE',
          content: payload.message || payload.content || '',
          timestamp: payload.timestamp || new Date().toISOString(),
          sender: eventType === 'TripChatMine' ? 'You' : payload.senderName || 'Operator',
        }

        onUpdateChat(activeChat.id, {
          operatorMessages: {
            ...activeChat.operatorMessages,
            [quoteId]: [...currentMessages, newMessage],
          },
        })
      }
    }
  }, [activeChat.id, activeChat.tripId, activeChat.operatorMessages, onUpdateChat])

  /**
   * Send message with streaming using extracted SSE parser
   */
  const sendMessageWithStreaming = async (message: string) => {
    if (isProcessing || !message.trim()) return

    setIsTyping(true)
    setStreamingContent("")
    setStreamError(null)
    onProcessingChange(true)

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController()

    // Check if the message already exists in the chat (to prevent duplicates)
    // This can happen when needsInitialApiCall is true and the message was already added during chat creation
    // Use activeChat.messages directly (not the ref) to ensure we have the latest state
    const existingMessages = activeChat.messages || []
    const trimmedMessage = message.trim()
    
    // Check if any existing message matches this content (not just the last one)
    const messageAlreadyExists = existingMessages.some(
      (msg) => msg.type === "user" && msg.content.trim() === trimmedMessage
    )

    // Only add user message if it doesn't already exist
    let currentMessages: ChatSession['messages']
    if (messageAlreadyExists) {
      // Message already exists, use existing messages
      currentMessages = existingMessages
      console.log('[ChatInterface] Message already exists, skipping duplicate:', trimmedMessage)
    } else {
      // Add user message to chat
      const userMessage = {
        id: `user-${Date.now()}`,
        type: "user" as const,
        content: message,
        timestamp: new Date(),
      }
      currentMessages = [...existingMessages, userMessage]
    }

    onUpdateChat(activeChat.id, {
      messages: currentMessages,
      needsInitialApiCall: false,
    })

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          tripId: activeChat.tripId,
          requestId: activeChat.requestId,
          rfqId: activeChat.rfqId,
          conversationHistory: currentMessages.map((m) => ({
            role: m.type === "user" ? "user" : "assistant",
            content: m.content,
          })),
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("No response stream")
      }

      // Use extracted SSE parser
      const result = await parseSSEStream(reader, {
        onContent: (chunk, accumulated) => {
          setStreamingContent(accumulated)
        },
        onError: (error) => {
          setStreamError(error.message)
        },
        onToolCall: (toolCall) => {
          console.log('[ChatInterface] Tool call:', toolCall.name)
        },
      }, abortControllerRef.current.signal)

      // Process the result
      await handleSSEResult(result, currentMessages)

    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('[ChatInterface] Request cancelled')
        return
      }
      console.error('[ChatInterface] Error sending message:', error)
      setStreamError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsTyping(false)
      onProcessingChange(false)
      abortControllerRef.current = null
    }
  }

  /**
   * Handle SSE parse result and update chat state
   */
  const handleSSEResult = async (result: SSEParseResult, currentMessages: ChatSession['messages']) => {
    // Extract deep link data using extracted utility
    const { tripData, rfpData, showDeepLink } = extractDeepLinkData({
      trip_data: result.tripData,
      rfp_data: result.rfpData,
      tool_calls: result.toolCalls,
    } as any)

    // Extract quotes using extracted utility
    const quotes = result.quotes.length > 0 ? result.quotes : extractQuotesFromSSEData({
      quotes: result.quotes,
      rfq_data: result.rfqData,
      tool_calls: result.toolCalls,
    } as any)

    // Determine workflow status using extracted utility
    const { status, step } = determineWorkflowStatus({
      agent: result.agentMetadata,
      tool_calls: result.toolCalls,
      trip_data: result.tripData,
      rfp_data: result.rfpData,
    } as any, activeChat.status)

    // Create agent message
    const agentMessage = {
      id: `agent-${Date.now()}`,
      type: "agent" as const,
      content: result.content || streamingContent,
      timestamp: new Date(),
      showDeepLink,
      deepLinkData: showDeepLink ? {
        tripId: tripData?.trip_id || rfpData?.trip_id,
        rfqId: rfpData?.rfq_id,
        deepLink: tripData?.deep_link || rfpData?.deep_link,
        departureAirport: tripData?.departure_airport,
        arrivalAirport: tripData?.arrival_airport,
        departureDate: tripData?.departure_date,
        passengers: tripData?.passengers,
      } : undefined,
      showQuotes: quotes.length > 0 || (result.rfqData?.flights?.length ?? 0) > 0,
      showPipeline: !!result.pipelineData,
      pipelineData: result.pipelineData,
    }

    // Convert quotes to RFQ flights using extracted transformer
    let newRfqFlights: RFQFlight[] = []
    if (result.rfqData?.flights && result.rfqData.flights.length > 0) {
      // Use pre-transformed flights from API
      newRfqFlights = result.rfqData.flights as RFQFlight[]
    } else if (quotes.length > 0) {
      newRfqFlights = quotes.map((quote) =>
        convertQuoteToRFQFlight(quote, routeParts, activeChat.date)
      ).filter((f): f is RFQFlight => f !== null)
    } else if (result.rfqData?.rfqs) {
      // Convert RFQs to flights using extracted transformer
      for (const rfq of result.rfqData.rfqs) {
        if (rfq.quotes && rfq.quotes.length > 0) {
          for (const quote of rfq.quotes) {
            const flight = convertQuoteToRFQFlight(quote, routeParts, activeChat.date)
            if (flight) newRfqFlights.push(flight)
          }
        } else {
          const flight = convertRfqToRFQFlight(rfq, routeParts, activeChat.date)
          newRfqFlights.push(flight)
        }
      }
    }

    // Update chat with new data
    const updates: Partial<ChatSession> = {
      messages: [...currentMessages, agentMessage],
      status,
      currentStep: step,
    }

    // Update trip/rfq IDs if we got new ones
    if (tripData?.trip_id) {
      updates.tripId = tripData.trip_id
    }
    if (rfpData?.rfq_id) {
      updates.rfqId = rfpData.rfq_id
    }

    // Update RFQ flights if we got new ones
    if (newRfqFlights.length > 0) {
      // Merge with existing flights
      const existingIds = new Set((activeChat.rfqFlights || []).map((f) => f.id))
      const uniqueNewFlights = newRfqFlights.filter((f) => !existingIds.has(f.id))
      const updatedExisting = (activeChat.rfqFlights || []).map((existing) => {
        const updated = newRfqFlights.find((f) => f.id === existing.id)
        return updated ? { ...existing, ...updated } : existing
      })
      updates.rfqFlights = [...updatedExisting, ...uniqueNewFlights]
      updates.quotesTotal = updates.rfqFlights.length
      updates.quotesReceived = updates.rfqFlights.filter((f) => f.rfqStatus === 'quoted').length
    }

    // Update quotes for legacy compatibility
    if (quotes.length > 0) {
      updates.quotes = quotes.map((q) => ({
        id: q.quote_id || q.quoteId || q.id || `quote-${Date.now()}`,
        operatorName: q.operator_name || q.operatorName || q.operator?.name || 'Unknown',
        aircraftType: q.aircraft_type || q.aircraftType || q.aircraft?.type || 'Unknown',
        price: q.sellerPrice?.price || q.price || 0,
      }))
    }

    onUpdateChat(activeChat.id, updates)
    setStreamingContent("")
  }

  /**
   * Handle trip ID submit (from deep link card)
   */
  const handleTripIdSubmit = async (tripId: string) => {
    if (!tripId.trim() || isTripIdLoading) return

    setIsTripIdLoading(true)
    setTripIdError(undefined)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `get_rfq ${tripId}`,
          tripId,
          skipMessagePersistence: true,
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("No response stream")
      }

      // Use extracted SSE parser
      const result = await parseSSEStream(reader)

      // Extract RFQ flights from result
      let newRfqFlights: RFQFlight[] = []
      const newQuoteDetailsMap: QuoteDetailsMap = {}

      // Process tool calls for get_quote results
      for (const toolCall of result.toolCalls) {
        if (toolCall.name === 'get_quote' && toolCall.result) {
          const quoteResult = toolCall.result as Record<string, unknown>
          const quoteId = (quoteResult.quote_id || quoteResult.quoteId) as string
          if (quoteId) {
            newQuoteDetailsMap[quoteId] = quoteResult as Quote
          }
        }
      }

      // Check for API error in RFQ data (error field may be returned from API but not in type)
      const rfqDataWithError = result.rfqData as (typeof result.rfqData & { error?: string }) | undefined
      if (rfqDataWithError?.error) {
        console.error('[ChatInterface] get_rfq API error:', rfqDataWithError.error)
        throw new Error(rfqDataWithError.error)
      }

      // Extract flights from RFQ data using extracted transformer
      if (result.rfqData?.flights && result.rfqData.flights.length > 0) {
        newRfqFlights = result.rfqData.flights as RFQFlight[]
      } else if (result.rfqData?.rfqs) {
        for (const rfq of result.rfqData.rfqs) {
          if (rfq.quotes && rfq.quotes.length > 0) {
            for (const quote of rfq.quotes) {
              const flight = convertQuoteToRFQFlight(quote, routeParts, activeChat.date)
              if (flight) newRfqFlights.push(flight)
            }
          } else {
            const flight = convertRfqToRFQFlight(rfq, routeParts, activeChat.date)
            newRfqFlights.push(flight)
          }
        }
      }
      
      // Log warning if no rfqData was returned (get_rfq tool may not have been called)
      if (!result.rfqData) {
        console.warn('[ChatInterface] ⚠️ No rfqData in response - get_rfq tool may not have been called:', {
          hasContent: !!result.content,
          toolCalls: result.toolCalls.map(tc => tc.name),
          tripId,
        });
      }

      // Log warning if RFQs exist but no flights were extracted
      if (result.rfqData?.rfqs && result.rfqData.rfqs.length > 0 && newRfqFlights.length === 0) {
        console.error('[ChatInterface] ⚠️ RFQs exist but no flights were extracted:', {
          rfqs_count: result.rfqData.rfqs.length,
          rfq_ids: result.rfqData.rfqs.map((r: any) => r.rfq_id || r.id),
          has_flights: !!(result.rfqData?.flights),
          flights_count: result.rfqData?.flights?.length || 0,
          message: result.rfqData?.message,
        });
      }

      // Merge quote details using extracted utility
      if (Object.keys(newQuoteDetailsMap).length > 0) {
        setQuoteDetailsMap((prev) => ({ ...prev, ...newQuoteDetailsMap }))
        newRfqFlights = mergeQuoteDetailsIntoFlights(newRfqFlights, newQuoteDetailsMap)
      }

      // Update chat
      onUpdateChat(activeChat.id, {
        tripId,
        tripIdSubmitted: true,
        rfqFlights: newRfqFlights,
        rfqsLastFetchedAt: new Date().toISOString(),
        quotesTotal: newRfqFlights.length,
        quotesReceived: newRfqFlights.filter((f) => f.rfqStatus === 'quoted').length,
        status: 'analyzing_options',
        currentStep: 4,
      })

      setTripIdSubmitted(true)

    } catch (error) {
      console.error('[ChatInterface] Error submitting trip ID:', error)
      setTripIdError(error instanceof Error ? error.message : 'Failed to fetch RFQ data')
    } finally {
      setIsTripIdLoading(false)
    }
  }

  /**
   * Handle send message
   */
  const handleSendMessage = () => {
    if (!inputValue.trim() || isProcessing) return
    const message = inputValue.trim()
    setInputValue("")
    sendMessageWithStreaming(message)
  }

  /**
   * Handle key down (Enter to send)
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  /**
   * Handle viewing chat/messages for a quote
   */
  const handleViewChat = (flightId: string, quoteId?: string, messageId?: string) => {
    setMessageThreadTripId(activeChat.tripId)
    setMessageThreadRequestId(activeChat.requestId)
    setMessageThreadQuoteId(quoteId)
    setMessageThreadFlightId(flightId)

    // Find the operator name for the flight
    const flight = rfqFlights.find((f) => f.id === flightId)
    setMessageThreadOperatorName(flight?.operatorName)

    setIsMessageThreadOpen(true)

    // Mark messages as read
    if (quoteId) {
      const now = new Date().toISOString()
      onUpdateChat(activeChat.id, {
        lastMessagesReadAt: {
          ...activeChat.lastMessagesReadAt,
          [quoteId]: now,
        },
      })
    }
  }

  /**
   * Handle booking a flight
   */
  const handleBookFlight = (flightId: string, quoteId?: string) => {
    console.log('[ChatInterface] Book flight:', { flightId, quoteId })
    // TODO: Implement booking flow
  }

  /**
   * Handle generating proposal
   */
  const handleGenerateProposal = (flightId: string, quoteId?: string) => {
    console.log('[ChatInterface] Generate proposal:', { flightId, quoteId })
    // TODO: Implement proposal generation
  }

  /**
   * Handle review and book action for a single flight
   */
  const handleReviewAndBook = (flightId: string) => {
    console.log('[ChatInterface] Review and book:', flightId)
    // Open drawer with the selected flight
    setSelectedQuoteId(flightId)
    setIsDrawerOpen(true)
  }

  /**
   * Handle sending operator message
   */
  const handleSendOperatorMessage = async (message: string) => {
    if (!selectedQuoteId || !message.trim()) return

    console.log('[ChatInterface] Send operator message:', { quoteId: selectedQuoteId, message })

    // TODO: Call send_trip_message API
    // For now, add to local state
    const newMessage = {
      id: `msg-${Date.now()}`,
      type: 'REQUEST' as const,
      content: message,
      timestamp: new Date().toISOString(),
      sender: 'You',
    }

    onUpdateChat(activeChat.id, {
      operatorMessages: {
        ...activeChat.operatorMessages,
        [selectedQuoteId]: [...(activeChat.operatorMessages?.[selectedQuoteId] || []), newMessage],
      },
    })
  }

  /**
   * Handle accepting a quote
   */
  const handleAcceptQuote = async (quoteId: string) => {
    console.log('[ChatInterface] Accept quote:', quoteId)
    // TODO: Implement quote acceptance
  }

  /**
   * Close drawer
   */
  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
    setSelectedQuoteId(null)
  }

  /**
   * Open the quote details drawer for a specific quote
   */
  const handleViewQuoteDetails = (quoteId: string) => {
    setSelectedQuoteId(quoteId)
    setIsDrawerOpen(true)
  }

  /**
   * Convert ChatSession quote requests to QuoteRequest format for header display
   */
  const getQuoteRequestsForHeader = (): QuoteRequest[] => {
    if (!activeChat.quoteRequests) return []
    return activeChat.quoteRequests.map((qr) => ({
      id: qr.id,
      jetType: qr.jetType,
      aircraftImageUrl: qr.aircraftImageUrl,
      operatorName: qr.operatorName,
      status: qr.status,
      flightDuration: qr.flightDuration,
      departureAirport: qr.departureAirport,
      arrivalAirport: qr.arrivalAirport,
      price: qr.price,
      currency: qr.currency,
    }))
  }

  /**
   * Get selected quote details for drawer
   */
  const getSelectedQuoteDetails = (): QuoteDetails | undefined => {
    if (!selectedQuoteId) return undefined

    // Try to find from quoteRequests first (header display data)
    const quoteRequest = activeChat.quoteRequests?.find((q) => q.id === selectedQuoteId)
    if (quoteRequest) {
      return {
        id: quoteRequest.id,
        rfqId: activeChat.rfqId || '',
        operator: {
          name: quoteRequest.operatorName,
          rating: 4.5, // Default rating
        },
        aircraft: {
          type: quoteRequest.jetType,
          tail: 'N/A',
          category: 'Jet',
          maxPassengers: activeChat.passengers || 8,
        },
        price: {
          amount: quoteRequest.price || 0,
          currency: quoteRequest.currency || 'USD',
        },
        flightDetails: {
          flightTimeMinutes: parseInt(quoteRequest.flightDuration || '0') || 120,
          distanceNm: 500,
          departureAirport: quoteRequest.departureAirport,
          arrivalAirport: quoteRequest.arrivalAirport,
        },
        status: quoteRequest.status === 'received' ? 'quoted' : 'unanswered',
      }
    }

    // Fallback to rfqFlights array
    const flight = rfqFlights.find((f) => f.quoteId === selectedQuoteId || f.id === selectedQuoteId)
    if (flight) {
      return {
        id: flight.id,
        rfqId: activeChat.rfqId || '',
        operator: {
          name: flight.operatorName,
          rating: flight.operatorRating || 4.5,
        },
        aircraft: {
          type: flight.aircraftType,
          tail: flight.tailNumber || 'N/A',
          category: flight.aircraftCategory || 'Jet',
          maxPassengers: flight.passengerCapacity,
        },
        price: {
          amount: flight.totalPrice,
          currency: flight.currency,
        },
        flightDetails: {
          flightTimeMinutes: parseInt(flight.flightDuration) || 120,
          distanceNm: 500,
          departureAirport: `${flight.departureAirport.icao} - ${flight.departureAirport.name || ''}`,
          arrivalAirport: `${flight.arrivalAirport.icao} - ${flight.arrivalAirport.name || ''}`,
        },
        // Map 'sent' to 'unanswered' since they're semantically equivalent
        status: flight.rfqStatus === 'sent' ? 'unanswered' : flight.rfqStatus,
      }
    }

    return undefined
  }

  /**
   * Get operator messages for drawer
   */
  const getOperatorMessages = (): OperatorMessage[] => {
    if (!selectedQuoteId || !activeChat.operatorMessages) return []
    return activeChat.operatorMessages[selectedQuoteId] || []
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Dynamic Chat Header - shows flight name, IDs, and quote requests */}
      <DynamicChatHeader
        activeChat={activeChat}
        flightRequestName={activeChat.generatedName}
        showTripId={!!activeChat.tripId}
        quoteRequests={getQuoteRequestsForHeader()}
        onViewQuoteDetails={handleViewQuoteDetails}
        onCopyTripId={() => console.log('[Chat] Trip ID copied to clipboard')}
      />

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4">
          <div className="space-y-4">
            {/* Inline Flight Search Progress - persistent workflow visualization */}
            {activeChat.tripId && (
              <FlightSearchProgress
                currentStep={activeChat.currentStep || 1}
                flightRequest={{
                  departureAirport: activeChat.route?.split(' to ')[0]
                    ? { icao: activeChat.route.split(' to ')[0].trim() }
                    : { icao: 'TBD' },
                  arrivalAirport: activeChat.route?.split(' to ')[1]
                    ? { icao: activeChat.route.split(' to ')[1].trim() }
                    : { icao: 'TBD' },
                  departureDate: activeChat.date || new Date().toISOString().split('T')[0],
                  passengers: activeChat.passengers || 1,
                  requestId: activeChat.requestId,
                }}
                deepLink={activeChat.deepLink}
                tripId={activeChat.tripId}
                isTripIdLoading={isTripIdLoading}
                tripIdError={tripIdError}
                tripIdSubmitted={tripIdSubmitted}
                rfqFlights={rfqFlights}
                isRfqFlightsLoading={false}
                selectedRfqFlightIds={selectedRfqFlightIds}
                rfqsLastFetchedAt={activeChat.rfqsLastFetchedAt}
                customerEmail={activeChat.customer?.email}
                customerName={activeChat.customer?.name}
                onTripIdSubmit={handleTripIdSubmit}
                onRfqFlightSelectionChange={setSelectedRfqFlightIds}
                onViewChat={handleViewChat}
                onBookFlight={handleBookFlight}
                onGenerateProposal={handleGenerateProposal}
                onReviewAndBook={handleReviewAndBook}
                className="mb-4"
              />
            )}

            {activeChat.messages?.map((message, index) => (
              <div key={message.id || index}>
                {message.type === "user" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] bg-blue-600 text-white rounded-2xl px-4 py-3 shadow-sm">
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    </div>
                  </div>
                ) : (
                  <AgentMessage
                    content={stripMarkdown(message.content)}
                    timestamp={message.timestamp}
                    showDeepLink={message.showDeepLink}
                    deepLinkData={message.deepLinkData}
                    onTripIdSubmit={handleTripIdSubmit}
                    isTripIdLoading={isTripIdLoading}
                    tripIdError={tripIdError}
                    tripIdSubmitted={tripIdSubmitted}
                    showQuotes={message.showQuotes && tripIdSubmitted}
                    rfqFlights={message.showQuotes && tripIdSubmitted ? rfqFlights.map((flight) => {
                      const messages = activeChat.operatorMessages?.[flight.quoteId || ''] || []
                      const hasMessages = messages.length > 0
                      const latestMessage = hasMessages ? messages.reduce((latest, msg) => {
                        if (!latest) return msg
                        const latestTime = new Date(latest.timestamp).getTime()
                        const msgTime = new Date(msg.timestamp).getTime()
                        return msgTime > latestTime ? msg : latest
                      }, null as OperatorMessage | null) : null

                      const lastReadAt = activeChat.lastMessagesReadAt?.[flight.quoteId || '']
                      const hasNewMessages = hasMessages && messages.some((msg) => {
                        if (!lastReadAt) return true
                        return new Date(msg.timestamp).getTime() > new Date(lastReadAt).getTime()
                      })

                      return {
                        ...flight,
                        hasMessages,
                        hasNewMessages,
                        sellerMessage: latestMessage?.content || flight.sellerMessage,
                      }
                    }) : []}
                    selectedRfqFlightIds={selectedRfqFlightIds}
                    rfqsLastFetchedAt={activeChat.rfqsLastFetchedAt}
                    onRfqFlightSelectionChange={setSelectedRfqFlightIds}
                    onReviewAndBook={handleReviewAndBook}
                    customerEmail={activeChat.customer?.name ? `${activeChat.customer.name.toLowerCase().replace(/\s+/g, '.')}@example.com` : ''}
                    customerName={activeChat.customer?.name || ''}
                    selectedFlights={[]}
                    onViewChat={handleViewChat}
                    onBookFlight={handleBookFlight}
                    onGenerateProposal={handleGenerateProposal}
                    showPipeline={message.showPipeline}
                    pipelineData={message.pipelineData}
                    onViewRequest={(requestId) => {
                      console.log('[Pipeline] View request:', requestId)
                    }}
                    onRefreshPipeline={() => {
                      setInputValue("show my pipeline")
                      setTimeout(() => {
                        handleSendMessage()
                      }, 100)
                    }}
                    showOperatorMessages={!!activeChat.operatorMessages && Object.keys(activeChat.operatorMessages).length > 0}
                    operatorMessages={activeChat.operatorMessages}
                    operatorFlightContext={(() => {
                      // Build flight context map from rfqFlights
                      const contextMap: Record<string, { quoteId: string; operatorName: string; aircraftType?: string; departureAirport?: string; arrivalAirport?: string; price?: number; currency?: string }> = {}
                      for (const flight of rfqFlights) {
                        if (flight.quoteId) {
                          contextMap[flight.quoteId] = {
                            quoteId: flight.quoteId,
                            operatorName: flight.operatorName,
                            aircraftType: flight.aircraftType,
                            departureAirport: flight.departureAirport.icao,
                            arrivalAirport: flight.arrivalAirport.icao,
                            price: flight.totalPrice,
                            currency: flight.currency,
                          }
                        }
                      }
                      return contextMap
                    })()}
                    onViewOperatorThread={(quoteId) => {
                      const flight = rfqFlights.find(f => f.quoteId === quoteId)
                      if (flight) {
                        handleViewChat(flight.id, quoteId)
                      }
                    }}
                    onReplyToOperator={(quoteId) => {
                      const flight = rfqFlights.find(f => f.quoteId === quoteId)
                      if (flight) {
                        handleViewChat(flight.id, quoteId)
                      }
                    }}
                  />
                )}
              </div>
            ))}

            {/* Streaming Response / Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="max-w-[85%] bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl px-4 py-3 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-[26.46px] h-[26.46px] flex items-center justify-center shrink-0">
                      <img
                        src="/images/jvg-logo.svg"
                        alt="Jetvision"
                        className="w-full h-full"
                        style={{ filter: 'brightness(0)' }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-black dark:text-gray-100">Jetvision Agent</span>
                  </div>
                  {streamingContent ? (
                    <div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{stripMarkdown(streamingContent)}</p>
                      <span className="inline-block w-2 h-4 bg-black dark:bg-gray-900 animate-pulse ml-0.5" />
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin text-black dark:text-gray-100" />
                      <span className="text-sm">
                        {activeChat.status === 'searching_aircraft' ? 'Searching for flights...' :
                         activeChat.status === 'analyzing_options' ? 'Analyzing quotes...' :
                         activeChat.status === 'requesting_quotes' ? 'Requesting quotes from operators...' :
                         activeChat.status === 'understanding_request' ? 'Understanding your request...' :
                         'Processing your request...'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error Display */}
            {streamError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{streamError}</p>
                <button
                  onClick={() => setStreamError(null)}
                  className="text-xs text-red-500 underline mt-1"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputValue("Can you update the passenger count?")}
              disabled={isProcessing}
              className="text-xs bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700"
            >
              Update Details
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputValue("Show me alternative aircraft options")}
              disabled={isProcessing}
              className="text-xs bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700"
            >
              Alternative Options
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputValue("What's the status of my request?")}
              disabled={isProcessing}
              className="text-xs bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700"
            >
              Check Status
            </Button>
          </div>

          {/* Input Area */}
          <div className="flex items-end space-x-3">
            <div className="flex-1 relative">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message about this request..."
                disabled={isProcessing}
                className="min-h-[44px] py-3 px-4 pr-12 rounded-xl border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isProcessing}
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 rounded-lg"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Quote Details Drawer */}
      <QuoteDetailsDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        quote={getSelectedQuoteDetails()}
        messages={getOperatorMessages()}
        onSendMessage={handleSendOperatorMessage}
        onAcceptQuote={handleAcceptQuote}
      />

      {/* Operator Message Thread Popup */}
      <OperatorMessageThread
        isOpen={isMessageThreadOpen}
        onClose={() => setIsMessageThreadOpen(false)}
        tripId={messageThreadTripId}
        requestId={messageThreadRequestId}
        quoteId={messageThreadQuoteId}
        flightId={messageThreadFlightId}
        operatorName={messageThreadOperatorName}
      />
    </div>
  )
}
