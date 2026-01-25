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
import { Send, Loader2, Plane, Eye } from "lucide-react"
import type { ChatSession } from "./chat-sidebar"
import { createSupabaseClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

// UI Components
import { AgentMessage } from "./chat/agent-message"
import { DynamicChatHeader } from "./chat/dynamic-chat-header"
import { QuoteDetailsDrawer, type QuoteDetails, type OperatorMessage } from "./quote-details-drawer"
import { OperatorMessageThread } from "./avinode/operator-message-thread"
import { FlightSearchProgress } from "./avinode/flight-search-progress"
import { CustomerSelectionDialog, type ClientProfile } from "./customer-selection-dialog"
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
  parseQuotesFromText,
  convertParsedQuotesToQuotes,
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

// Flight request parser utility
import { parseFlightRequest } from "@/lib/utils/parse-flight-request"
import { formatDate } from "@/lib/utils/format"

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
  const workflowRef = useRef<HTMLDivElement>(null)
  const latestMessagesRef = useRef(activeChat.messages)
  const abortControllerRef = useRef<AbortController | null>(null)
  // Track which chat ID we've already made the initial API call for
  // This prevents duplicate calls when the same chat is re-rendered or in React Strict Mode
  const initialApiCallChatIdRef = useRef<string | null>(null)
  // Track the latest streaming content to avoid stale closure issues
  // State updates in React are batched, so the state value might be stale in callbacks
  const streamingContentRef = useRef("")
  // Track which chat IDs we've already auto-loaded RFQs for
  // This prevents duplicate API calls when switching between chats that have tripIds
  const autoLoadedRfqsForChatIdRef = useRef<string | null>(null)
  // CRITICAL: Track processed RFQ message content hashes to prevent duplicates across concurrent calls
  // This ref persists across renders and prevents duplicates even when multiple handleSSEResult calls happen rapidly
  const processedRfqMessageHashesRef = useRef<Set<string>>(new Set())
  // Track which chat ID we're tracking hashes for (reset hashes when chat changes)
  const processedRfqMessageHashesChatIdRef = useRef<string | null>(null)

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

  // Customer selection dialog state for proposal generation
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false)
  const [pendingProposalFlightId, setPendingProposalFlightId] = useState<string | null>(null)
  const [pendingProposalQuoteId, setPendingProposalQuoteId] = useState<string | undefined>(undefined)
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false)

  // Sync tripIdSubmitted with activeChat
  useEffect(() => {
    if (activeChat.tripIdSubmitted !== undefined) {
      setTripIdSubmitted(activeChat.tripIdSubmitted)
    }
  }, [activeChat.tripIdSubmitted])

  // Parse route to get airport info using extracted utility
  const routeParts = extractRouteParts(activeChat.route)

  /**
   * Show FlightSearchProgress only after the agent has responded,
   * so the conversation appears before the workflow UI.
   */
  const shouldShowFlightSearchProgress = useMemo(() => {
    const hasAgentMessage =
      activeChat.messages?.some((message) => message.type === 'agent') ?? false

    const hasValidRoute =
      !!activeChat.route &&
      activeChat.route !== 'Select route' &&
      activeChat.route !== 'TBD' &&
      activeChat.route.trim().length > 0

    const hasValidDate =
      !!activeChat.date &&
      activeChat.date !== 'Select date' &&
      activeChat.date !== 'Date TBD' &&
      activeChat.date !== 'TBD' &&
      activeChat.date.trim().length > 0

    const hasValidPassengers = (activeChat.passengers ?? 0) > 0

    const hasCompleteDetails = hasValidRoute && hasValidDate && hasValidPassengers

    const hasAvinodeLink = !!activeChat.deepLink

    return hasAgentMessage && hasCompleteDetails && hasAvinodeLink
  }, [
    activeChat.messages,
    activeChat.route,
    activeChat.date,
    activeChat.passengers,
    activeChat.deepLink,
  ])

  // Convert quotes from activeChat to RFQ flights format
  const rfqFlights: RFQFlight[] = useMemo(() => {
    // If activeChat already has rfqFlights, use them
    if (activeChat.rfqFlights && activeChat.rfqFlights.length > 0) {
      // CRITICAL: Log what flights we're using from activeChat with expanded details
      console.log('[ChatInterface] 📋 Using rfqFlights from activeChat:', {
        count: activeChat.rfqFlights.length,
        flights: activeChat.rfqFlights.map(f => ({
          id: f.id,
          quoteId: f.quoteId,
          operatorName: f.operatorName,
          totalPrice: f.totalPrice,
          currency: f.currency,
          rfqStatus: f.rfqStatus,
          lastUpdated: f.lastUpdated,
          hasPrice: f.totalPrice > 0,
          hasStatus: !!f.rfqStatus && f.rfqStatus !== 'unanswered',
        })),
      })
      
      // CRITICAL: Log first 3 flights with ALL fields to debug
      if (activeChat.rfqFlights.length > 0) {
        console.log('[ChatInterface] 📋 Sample flights (first 3) with ALL fields:', 
          activeChat.rfqFlights.slice(0, 3).map(f => ({
            id: f.id,
            quoteId: f.quoteId,
            operatorName: f.operatorName,
            totalPrice: f.totalPrice,
            currency: f.currency,
            rfqStatus: f.rfqStatus,
            priceIsZero: f.totalPrice === 0,
            statusIsUnanswered: f.rfqStatus === 'unanswered',
            ALL_PRICE_FIELDS: {
              totalPrice: f.totalPrice,
              price: (f as any).price,
              total_price: (f as any).total_price,
              sellerPrice: (f as any).sellerPrice,
              pricing: (f as any).pricing,
            },
            ALL_STATUS_FIELDS: {
              rfqStatus: f.rfqStatus,
              status: (f as any).status,
              rfq_status: (f as any).rfq_status,
              quote_status: (f as any).quote_status,
            },
          }))
        )
      }
      
      // CRITICAL: Return a new array reference to ensure React detects changes
      // Also ensure each flight object is a new reference
      return activeChat.rfqFlights.map(flight => ({
        ...flight,
        // Ensure lastUpdated is set to force re-renders
        lastUpdated: flight.lastUpdated || new Date().toISOString(),
      }))
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
  }, [activeChat.rfqFlights, activeChat.quotes, activeChat.date, routeParts, quoteDetailsMap, activeChat.rfqsLastFetchedAt]) // Add rfqsLastFetchedAt to dependencies to force update when RFQs are fetched

  // Scroll to bottom when messages change
  useEffect(() => {
    latestMessagesRef.current = activeChat.messages
    // CRITICAL: Reset processed RFQ message hashes when switching chats to allow RFQ messages in new chats
    if (processedRfqMessageHashesChatIdRef.current !== activeChat.id) {
      processedRfqMessageHashesRef.current.clear()
      processedRfqMessageHashesChatIdRef.current = activeChat.id
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [activeChat.messages, activeChat.id])

  // Handle initial API call for new chats
  // Track by chat ID to prevent duplicate calls when switching between chats or in React Strict Mode
  useEffect(() => {
    // Only make the call if:
    // 1. This chat needs an initial API call
    // 2. We haven't already made the call for THIS specific chat ID
    // 3. There's an initial user message to send
    if (
      activeChat.needsInitialApiCall &&
      activeChat.id !== initialApiCallChatIdRef.current &&
      activeChat.initialUserMessage
    ) {
      // Mark that we've made the call for this chat ID
      initialApiCallChatIdRef.current = activeChat.id
      sendMessageWithStreaming(activeChat.initialUserMessage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChat.needsInitialApiCall, activeChat.initialUserMessage, activeChat.id])

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

  // Auto-load RFQs when a chat with tripId is selected but RFQs haven't been loaded yet
  useEffect(() => {
    // Determine if RFQs need to be loaded
    // Auto-load if:
    // 1. Chat has a tripId (required)
    // 2. We haven't already auto-loaded for this specific chat ID
    // 3. We're not currently loading
    // 4. We don't have RFQ flights loaded OR they're empty OR tripIdSubmitted is false
    // 5. We haven't recently fetched RFQs (within last 5 minutes) - prevents excessive API calls
    
    const hasRfqFlights = rfqFlights && rfqFlights.length > 0
    const hasRecentFetch = activeChat.rfqsLastFetchedAt && 
      (Date.now() - new Date(activeChat.rfqsLastFetchedAt).getTime()) < 5 * 60 * 1000 // 5 minutes
    
    // Determine if auto-load should trigger
    // Always auto-load if:
    // 1. We have a tripId
    // 2. We haven't already loaded for this chat ID
    // 3. We're not currently loading
    // 4. We don't have RFQ flights OR haven't fetched recently OR tripIdSubmitted is false
    // 5. Handler is available
    const shouldAutoLoad = 
      !!activeChat.tripId && // Must have tripId
      activeChat.id !== autoLoadedRfqsForChatIdRef.current && // Haven't already loaded for this chat
      !isTripIdLoading && // Not currently loading
      (!hasRfqFlights || !hasRecentFetch || !activeChat.tripIdSubmitted) && // No RFQs OR not fetched recently OR not submitted
      !!handleTripIdSubmit // Handler available

    console.log('[ChatInterface] 🔍 Auto-load check:', {
      chatId: activeChat.id,
      tripId: activeChat.tripId,
      hasRfqFlights,
      rfqFlightsCount: rfqFlights?.length || 0,
      tripIdSubmitted: activeChat.tripIdSubmitted,
      hasRecentFetch,
      rfqsLastFetchedAt: activeChat.rfqsLastFetchedAt,
      alreadyLoadedForChat: activeChat.id === autoLoadedRfqsForChatIdRef.current,
      isTripIdLoading,
      hasHandler: !!handleTripIdSubmit,
      shouldAutoLoad,
    })

    if (shouldAutoLoad) {
      // Mark that we're auto-loading for this chat ID
      autoLoadedRfqsForChatIdRef.current = activeChat.id
      console.log('[ChatInterface] 🔄 Starting auto-load RFQs for chat:', {
        chatId: activeChat.id,
        tripId: activeChat.tripId,
      })
      
      // Auto-load RFQs without requiring manual trip ID submission
      // tripId is guaranteed to exist when shouldAutoLoad is true
      handleTripIdSubmit(activeChat.tripId!).catch((error) => {
        console.error('[ChatInterface] ❌ Error auto-loading RFQs:', error)
        // Reset the ref on error so we can retry if needed
        if (activeChat.id === autoLoadedRfqsForChatIdRef.current) {
          autoLoadedRfqsForChatIdRef.current = null
        }
      })
    }
    
    // Reset the ref when chat ID changes (so new chats can auto-load)
    if (activeChat.id !== autoLoadedRfqsForChatIdRef.current && autoLoadedRfqsForChatIdRef.current !== null) {
      // Only reset if we're switching to a different chat
      autoLoadedRfqsForChatIdRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChat.tripId, activeChat.id, activeChat.tripIdSubmitted, activeChat.rfqsLastFetchedAt, rfqFlights?.length, isTripIdLoading])

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
    streamingContentRef.current = ""
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

    // Parse flight request details from user message immediately
    // This ensures the header and sidebar card show correct information
    const parsedFlightRequest = parseFlightRequest(message)
    
    // Build updates for chat session
    const sessionUpdates: Partial<ChatSession> = {
      messages: currentMessages,
      needsInitialApiCall: false,
    }

    // Update route if parsed from message (only if not already set or if new data is more complete)
    if (parsedFlightRequest.route) {
      sessionUpdates.route = parsedFlightRequest.route
      // Generate name from route and date if available
      if (parsedFlightRequest.date) {
        sessionUpdates.generatedName = `${parsedFlightRequest.route} (${parsedFlightRequest.date})`
      } else {
        sessionUpdates.generatedName = parsedFlightRequest.route
      }
    }

    // Update passengers if parsed from message
    if (parsedFlightRequest.passengers !== undefined) {
      sessionUpdates.passengers = parsedFlightRequest.passengers
    }

    // Update date if parsed from message
    // Store both ISO date (for API calls) and formatted date (for display)
    if (parsedFlightRequest.departureDate) {
      // departureDate is already in ISO format (YYYY-MM-DD)
      sessionUpdates.isoDate = parsedFlightRequest.departureDate
      sessionUpdates.date = parsedFlightRequest.departureDate
    } else if (parsedFlightRequest.date) {
      // If only formatted date is available, try to parse it back to ISO
      try {
        const parsedDate = new Date(parsedFlightRequest.date)
        if (!isNaN(parsedDate.getTime())) {
          const isoDateStr = `${parsedDate.getFullYear()}-${String(
            parsedDate.getMonth() + 1
          ).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`
          sessionUpdates.isoDate = isoDateStr
          sessionUpdates.date = isoDateStr
        }
      } catch {
        // If parsing fails, store as-is
        sessionUpdates.date = parsedFlightRequest.date
      }
    }

    // Update chat session immediately with parsed flight details
    onUpdateChat(activeChat.id, sessionUpdates)

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
          // Update both state (for rendering) and ref (for capturing in closures)
          setStreamingContent(accumulated)
          streamingContentRef.current = accumulated
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
    let quotes = result.quotes.length > 0 ? result.quotes : extractQuotesFromSSEData({
      quotes: result.quotes,
      rfq_data: result.rfqData,
      tool_calls: result.toolCalls,
    } as any)

    // CRITICAL: Also parse quotes from agent's text response to extract price information
    // The agent may include price information in the text response even if structured data is missing
    if (result.content) {
      try {
        const parsedTextQuotes = parseQuotesFromText(result.content)
        if (parsedTextQuotes.length > 0) {
          console.log('[ChatInterface] 📝 Parsed quotes from text:', {
            parsedCount: parsedTextQuotes.length,
            hasPrice: parsedTextQuotes.some(q => q.price && q.price > 0),
          })
          
          // Convert parsed quotes to Quote format
          const textQuotes = convertParsedQuotesToQuotes(parsedTextQuotes)
          
          // Merge with existing quotes (prefer structured quotes, but fill in missing price data)
          const quoteMap = new Map<string, Quote>()
          
          // Add structured quotes first
          quotes.forEach(quote => {
            const quoteId = quote.quote_id || quote.quoteId || quote.id || `quote-${quoteMap.size + 1}`
            quoteMap.set(quoteId, quote)
          })
          
          // Merge text quotes - if operator name matches, update price if missing
          textQuotes.forEach(textQuote => {
            const textQuoteId = textQuote.quote_id || textQuote.quoteId || textQuote.id || `quote-text-${textQuote.operatorName}`
            
            // Try to find matching quote by operator name if quote ID doesn't match
            let existingQuote: Quote | undefined = quoteMap.get(textQuoteId)
            if (!existingQuote && textQuote.operatorName) {
              // Find by operator name match
              for (const [id, quote] of quoteMap.entries()) {
                const quoteOperatorName = quote.operator_name || quote.operatorName || quote.operator?.name
                if (quoteOperatorName && 
                    quoteOperatorName.toLowerCase().includes(textQuote.operatorName.toLowerCase())) {
                  existingQuote = quote
                  break
                }
              }
            }
            
            if (existingQuote) {
              // Merge: keep existing quote but update price if it's missing or zero
              // CRITICAL: Set both price and total_price fields for compatibility
              const hasPrice = existingQuote.price || existingQuote.total_price || existingQuote.sellerPrice?.price
              const priceValue = textQuote.price || (textQuote as any).totalPrice
              
              if (priceValue && priceValue > 0 && (!hasPrice || (existingQuote.price === 0 && existingQuote.total_price === 0))) {
                // Update all price field variations for maximum compatibility
                existingQuote.price = priceValue
                existingQuote.total_price = priceValue
                existingQuote.currency = textQuote.currency || existingQuote.currency || 'USD'
                
                // Also update sellerPrice if it exists
                if (!existingQuote.sellerPrice) {
                  existingQuote.sellerPrice = {
                    price: priceValue,
                    currency: textQuote.currency || existingQuote.currency || 'USD',
                  }
                } else if (!existingQuote.sellerPrice.price || existingQuote.sellerPrice.price === 0) {
                  existingQuote.sellerPrice.price = priceValue
                  existingQuote.sellerPrice.currency = textQuote.currency || existingQuote.sellerPrice.currency || 'USD'
                }
                
                console.log('[ChatInterface] ✅ Updated quote price from text:', {
                  quoteId: existingQuote.quote_id || existingQuote.id,
                  operatorName: existingQuote.operator_name || existingQuote.operatorName,
                  price: priceValue,
                  currency: textQuote.currency || existingQuote.currency,
                  updatedFields: ['price', 'total_price', 'sellerPrice'],
                })
              }
            } else {
              // New quote from text - add it
              quoteMap.set(textQuoteId, textQuote)
            }
          })
          
          // Convert map back to array
          quotes = Array.from(quoteMap.values())
        }
      } catch (error) {
        console.warn('[ChatInterface] ⚠️ Error parsing quotes from text:', error)
      }
    }

    // Determine workflow status using extracted utility
    const { status, step } = determineWorkflowStatus({
      agent: result.agentMetadata,
      tool_calls: result.toolCalls,
      trip_data: result.tripData,
      rfp_data: result.rfpData,
    } as any, activeChat.status)

    // Convert quotes to RFQ flights using extracted transformer (do this FIRST)
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

    // CRITICAL FIX: Ultra-aggressive duplicate detection for RFQ messages
    // Check for duplicates BEFORE creating agentMessage - this prevents creating message objects for duplicates
    // Block ALL RFQ messages if ANY RFQ message already exists - don't even check trip ID
    const messageContent = (result.content || streamingContentRef.current || '').trim().toLowerCase()
    
    // Check if this is ANY kind of RFQ/quote-related message
    const isRfqMessage = messageContent.includes('rfq') ||
                        messageContent.includes('quote') ||
                        messageContent.includes('quotes') ||
                        messageContent.includes('trip id') ||
                        messageContent.includes('received quotes') ||
                        messageContent.includes('here are') ||
                        messageContent.includes('flight quotes') ||
                        (messageContent.includes('tist') && messageContent.includes('kopf')) // Route-specific check
    
    // CRITICAL: Use content hash to detect duplicates across concurrent calls
    // Create a simple hash of the message content for deduplication
    const createContentHash = (content: string): string => {
      // Use first 100 chars + last 50 chars + length for hash
      // This catches similar messages even with slight variations
      const normalized = content.trim().toLowerCase().replace(/\s+/g, ' ')
      const firstPart = normalized.substring(0, 100)
      const lastPart = normalized.substring(Math.max(0, normalized.length - 50))
      return `${firstPart}|${lastPart}|${normalized.length}`
    }
    
    // CRITICAL: Block RFQ messages if ANY RFQ message already exists
    // Use atomic hash marking to prevent race conditions in concurrent calls
    if (isRfqMessage) {
      const contentHash = createContentHash(result.content || streamingContentRef.current || '')
      
      // CRITICAL: Check hash FIRST and mark IMMEDIATELY to prevent race conditions
      // This is an atomic-like operation - check if hash exists, if not, mark it
      // This ensures only ONE concurrent call can proceed with the same hash
      const hashWasAlreadyProcessed = processedRfqMessageHashesRef.current.has(contentHash)
      if (!hashWasAlreadyProcessed) {
        // Mark hash IMMEDIATELY before any other checks - this prevents concurrent calls from proceeding
        processedRfqMessageHashesRef.current.add(contentHash)
      }
      
      // If hash was already processed, block immediately
      if (hashWasAlreadyProcessed) {
        console.warn('[ChatInterface] 🚫 BLOCKING duplicate RFQ message - content hash already processed:', {
          contentHash: contentHash.substring(0, 50),
          processedHashesCount: processedRfqMessageHashesRef.current.size,
        })
        // Still update RFQ flights data if needed, but don't add message
        if (newRfqFlights.length > 0) {
          const existingIds = new Set((activeChat.rfqFlights || []).map((f) => f.id))
          const uniqueNewFlights = newRfqFlights.filter((f) => !existingIds.has(f.id))
          if (uniqueNewFlights.length > 0) {
            const allRfqFlights = [...(activeChat.rfqFlights || []), ...uniqueNewFlights]
            onUpdateChat(activeChat.id, {
              rfqFlights: allRfqFlights,
              rfqsLastFetchedAt: new Date().toISOString(),
            })
          }
        }
        return
      }
      
      // Now check if ANY existing message has RFQ content (hash wasn't processed, so check messages)
      // Combine all messages from both sources
      const allMessages = [...currentMessages, ...(activeChat.messages || [])]
      // Remove duplicates by message ID
      const uniqueMessages = Array.from(
        new Map(allMessages.map(msg => [msg.id, msg])).values()
      )
      
      // Check if ANY agent message has RFQ/quote content
      const hasAnyRfqMessage = uniqueMessages.some((msg) => {
        if (msg.type !== 'agent') return false
        const msgContent = (msg.content || '').trim().toLowerCase()
        
        // Check if message contains RFQ/quote keywords
        return msgContent.includes('rfq') ||
               msgContent.includes('quote') ||
               msgContent.includes('quotes') ||
               msgContent.includes('received quotes') ||
               msgContent.includes('here are') ||
               msgContent.includes('flight quotes') ||
               (msgContent.includes('tist') && msgContent.includes('kopf')) // Route-specific check
      })
      
      // Also check if we're in Step 3 or 4 (RFQs displayed in FlightSearchProgress)
      const currentStep = activeChat.currentStep || step || 1
      const isInStep3Or4 = currentStep >= 3
      
      // Also check if we have RFQ flights data
      const hasExistingRfqFlights = activeChat.rfqFlights && activeChat.rfqFlights.length > 0
      
      // BLOCK if ANY RFQ message exists OR we're in Step 3/4 OR we have RFQ flights data
      if (hasAnyRfqMessage || isInStep3Or4 || hasExistingRfqFlights) {
        console.warn('[ChatInterface] 🚫 BLOCKING duplicate RFQ message - RFQ content already exists:', {
          hasAnyRfqMessage,
          isInStep3Or4,
          currentStep,
          hasExistingRfqFlights,
          existingRfqFlightsCount: activeChat.rfqFlights?.length || 0,
          currentMessagesCount: currentMessages.length,
          activeChatMessagesCount: activeChat.messages?.length || 0,
          uniqueMessagesCount: uniqueMessages.length,
          contentHash: contentHash.substring(0, 50),
          reason: hasAnyRfqMessage ? 'RFQ message already exists' :
                  isInStep3Or4 ? 'Step 3/4 - RFQs displayed in FlightSearchProgress' :
                  'RFQ flights data exists',
        })
        // Hash is already marked above, so no need to mark again
        // Still update RFQ flights data if we have new flights, but don't add message
        if (newRfqFlights.length > 0) {
          const existingIds = new Set((activeChat.rfqFlights || []).map((f) => f.id))
          const uniqueNewFlights = newRfqFlights.filter((f) => !existingIds.has(f.id))
          if (uniqueNewFlights.length > 0) {
            const allRfqFlights = [...(activeChat.rfqFlights || []), ...uniqueNewFlights]
            onUpdateChat(activeChat.id, {
              rfqFlights: allRfqFlights,
              rfqsLastFetchedAt: new Date().toISOString(),
            })
          }
        }
        // Early return - don't create agentMessage or update chat with message
        return
      }
      
      // If we reach here, hash is already marked (done above), and no duplicate was found
      // Proceed with creating the message
    }

    // Create agent message (only if we didn't block it above)
    // Use ref for streaming content fallback to avoid stale closure issues
    const agentMessage = {
      id: `agent-${Date.now()}`,
      type: "agent" as const,
      content: result.content || streamingContentRef.current,
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

    // Update chat with new data
    // FIXED: Always update RFQ flights data even if we skip the message to keep data current
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
    // Update deep link if we got one from the API (create trip returns deep_link)
    const extractedDeepLink = tripData?.deep_link || rfpData?.deep_link
    if (extractedDeepLink) {
      updates.deepLink = extractedDeepLink
    }

    // Update route, date, and passengers from trip data
    // This ensures the sidebar card shows the correct flight details
    const departureAirport = tripData?.departure_airport || rfpData?.departure_airport
    const arrivalAirport = tripData?.arrival_airport || rfpData?.arrival_airport
    if (departureAirport && arrivalAirport) {
      updates.route = `${departureAirport} → ${arrivalAirport}`
    }
    const departureDate = tripData?.departure_date || rfpData?.departure_date
    if (departureDate) {
      // Store ISO date for API calls (YYYY-MM-DD format)
      // The raw departureDate from trip/rfp data is already in ISO format
      updates.isoDate = departureDate
      // Format date for display
      try {
        updates.date = formatDate(departureDate)
      } catch {
        updates.date = departureDate
      }
    }
    const passengerCount = tripData?.passengers || rfpData?.passengers
    if (passengerCount) {
      updates.passengers = passengerCount
    }

    // Generate a descriptive name for the sidebar card
    if (departureAirport && arrivalAirport) {
      const dateStr = updates.date || activeChat.date || 'Unknown date'
      updates.generatedName = `${departureAirport} → ${arrivalAirport} (${dateStr})`
    }

    // Update RFQ flights if we got new ones
    if (newRfqFlights.length > 0) {
      // Merge with existing flights - CRITICAL: Update existing flights with new price/status data
      const existingIds = new Set((activeChat.rfqFlights || []).map((f) => f.id))
      const uniqueNewFlights = newRfqFlights.filter((f) => !existingIds.has(f.id))
      
      // CRITICAL: When merging, prioritize new price/status data over existing
      // Also update lastUpdated to ensure React re-renders when price/status changes
      const updatedExisting = (activeChat.rfqFlights || []).map((existing) => {
        const updated = newRfqFlights.find((f) => f.id === existing.id || f.quoteId === existing.quoteId)
        if (updated) {
          // Merge but prioritize updated price/status if they're non-zero/changed
          const merged = {
            ...existing,
            ...updated,
            // CRITICAL: If new data has price/status, use it (don't overwrite with 0)
            totalPrice: updated.totalPrice && updated.totalPrice > 0 ? updated.totalPrice : existing.totalPrice,
            rfqStatus: updated.rfqStatus || existing.rfqStatus,
            currency: updated.currency || existing.currency || 'USD',
            // Update lastUpdated to force React re-render
            lastUpdated: updated.lastUpdated || new Date().toISOString(),
          }
          
          // CRITICAL: Log when price/status is updated for debugging
          if (process.env.NODE_ENV === 'development' && 
              (merged.totalPrice !== existing.totalPrice || merged.rfqStatus !== existing.rfqStatus)) {
            console.log('[ChatInterface] ✅ Updated flight price/status:', {
              flightId: existing.id,
              quoteId: existing.quoteId,
              oldPrice: existing.totalPrice,
              newPrice: merged.totalPrice,
              oldStatus: existing.rfqStatus,
              newStatus: merged.rfqStatus,
            })
          }
          
          return merged
        }
        return existing
      })
      const allRfqFlights = [...updatedExisting, ...uniqueNewFlights]
      updates.rfqFlights = allRfqFlights
      updates.quotesTotal = allRfqFlights.length
      updates.quotesReceived = allRfqFlights.filter((f) => f.rfqStatus === 'quoted').length
      
      // If we got RFQ data, ensure tripIdSubmitted is set to true
      if (result.rfqData && !updates.tripIdSubmitted) {
        updates.tripIdSubmitted = true
        updates.rfqsLastFetchedAt = new Date().toISOString()
      }
      
      // Update status and step based on RFQ data
      const quotedCount = allRfqFlights.filter((f) => f.rfqStatus === 'quoted').length
      if (!updates.status) {
        updates.status = quotedCount > 0 ? 'analyzing_options' : 'requesting_quotes'
      }
      if (!updates.currentStep) {
        updates.currentStep = allRfqFlights.length > 0 ? 4 : 3
      }
      
      // CRITICAL: Log detailed flight data with expanded values for debugging
      const flightsWithPrice = allRfqFlights.filter(f => f.totalPrice > 0).length
      const flightsWithStatus = allRfqFlights.filter(f => f.rfqStatus === 'quoted').length
      
      console.log('[ChatInterface] ✅ Updated RFQ flights in handleSSEResult:')
      console.log('  Total flights:', allRfqFlights.length)
      console.log('  Flights with price > 0:', flightsWithPrice)
      console.log('  Flights with quoted status:', flightsWithStatus)
      console.log('  Quoted count:', quotedCount)
      
      // CRITICAL: Log first 3 flights with expanded values to see actual data
      if (allRfqFlights.length > 0) {
        console.log('[ChatInterface] ✅ Sample flights (first 3):')
        allRfqFlights.slice(0, 3).forEach((f, idx) => {
          console.log(`  Flight ${idx + 1}:`, {
            'ID': f.id,
            'Operator': f.operatorName,
            'Price': f.totalPrice,
            'Currency': f.currency,
            'RFQ Status': f.rfqStatus,
            'Has Price?': f.totalPrice > 0 ? 'YES' : 'NO',
            'Display Status': f.rfqStatus === 'quoted' ? 'QUOTED' : f.rfqStatus.toUpperCase(),
          })
        })
      }
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

    // Sync session IDs from API response
    // This ensures the frontend has the correct database IDs to load messages later
    if (result.conversationId) {
      // In consolidated schema, conversationId === requestId
      updates.conversationId = result.conversationId
      updates.requestId = result.conversationId
      console.log('[ChatInterface] 🔄 Session sync - got conversationId:', result.conversationId)
    }
    if (result.chatSessionId) {
      // chatSessionId is the same as requestId in new schema but kept for backward compat
      updates.id = result.chatSessionId
      console.log('[ChatInterface] 🔄 Session sync - got chatSessionId:', result.chatSessionId)
    }
    if (result.conversationType) {
      updates.conversationType = result.conversationType
    }

    onUpdateChat(activeChat.id, updates)
    // Clear streaming content after update is sent to parent
    setStreamingContent("")
    streamingContentRef.current = ""
  }

  /**
   * Handle trip ID submit (from deep link card)
   * 
   * Per UX requirements section 3.3: TripID submission should fetch and display RFQs.
   * This function calls the get_rfq tool to retrieve all quotes for the given TripID.
   */
  const handleTripIdSubmit = async (tripId: string) => {
    if (!tripId.trim() || isTripIdLoading) return

    setIsTripIdLoading(true)
    setTripIdError(undefined)

    try {
      // Build conversation history from active chat messages for context
      const conversationHistory = (activeChat.messages || []).map((msg) => ({
        role: msg.type === "user" ? "user" as const : "assistant" as const,
        content: msg.content,
      }))

      console.log('[ChatInterface] 📡 Calling get_rfq for TripID:', {
        tripId,
        chatId: activeChat.id,
        hasConversationHistory: conversationHistory.length > 0,
        historyLength: conversationHistory.length,
      })

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Use direct instruction format - agent's system prompt says: "Use `get_rfq` when given a trip ID"
          // Trip IDs can be 6-char codes (like R4QFRX, 5F463X) or atrip-* format
          message: `Get RFQs for Trip ID ${tripId}`,
          tripId,
          conversationHistory,
          context: {
            conversationId: activeChat.conversationId || activeChat.requestId,
            tripId,
          },
          skipMessagePersistence: true, // Skip saving this technical tool call to conversation history
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

      // Log tool calls for debugging
      console.log('[ChatInterface] 🔧 Tool calls received:', {
        tripId,
        toolCallCount: result.toolCalls.length,
        toolNames: result.toolCalls.map(tc => tc.name),
        hasRfqData: !!result.rfqData,
      })

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
        
        // Log get_rfq tool call result
        if (toolCall.name === 'get_rfq') {
          console.log('[ChatInterface] 📦 get_rfq tool call result:', {
            success: !!toolCall.result,
            hasError: !!((toolCall.result as any)?.error),
            error: ((toolCall.result as any)?.error),
            resultType: typeof toolCall.result,
            resultKeys: toolCall.result && typeof toolCall.result === 'object' ? Object.keys(toolCall.result) : [],
          })
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
      
      // Check if get_rfq tool was called
      const getRfqToolCall = result.toolCalls.find(tc => tc.name === 'get_rfq')
      
      // Log warning if no rfqData was returned (get_rfq tool may not have been called)
      if (!result.rfqData) {
        console.warn('[ChatInterface] ⚠️ No rfqData in response - get_rfq tool may not have been called:', {
          hasContent: !!result.content,
          toolCalls: result.toolCalls.map(tc => tc.name),
          hasGetRfqToolCall: !!getRfqToolCall,
          getRfqResult: getRfqToolCall?.result,
          tripId,
        });
        
        // If get_rfq tool was called but no rfqData, check if there's an error
        if (getRfqToolCall?.result && typeof getRfqToolCall.result === 'object') {
          const toolResult = getRfqToolCall.result as Record<string, unknown>
          if (toolResult.error) {
            console.error('[ChatInterface] ❌ get_rfq tool returned error:', toolResult.error)
            setTripIdError(`Failed to fetch RFQs: ${toolResult.error}`)
          }
        }
      } else {
        // Log successful RFQ data retrieval for debugging
        console.log('[ChatInterface] ✅ RFQ data retrieved:', {
          hasFlights: !!(result.rfqData?.flights),
          flightsCount: result.rfqData?.flights?.length || 0,
          hasRfqs: !!(result.rfqData?.rfqs),
          rfqsCount: result.rfqData?.rfqs?.length || 0,
          hasQuotes: !!(result.rfqData?.quotes),
          quotesCount: result.rfqData?.quotes?.length || 0,
          message: result.rfqData?.message,
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
      
      // Log successful extraction of RFQ flights
      if (newRfqFlights.length > 0) {
        console.log('[ChatInterface] ✅ Successfully extracted RFQ flights:', {
          count: newRfqFlights.length,
          flightIds: newRfqFlights.map(f => f.id),
          quotedCount: newRfqFlights.filter(f => f.rfqStatus === 'quoted').length,
        });
      }

      // Merge quote details using extracted utility
      if (Object.keys(newQuoteDetailsMap).length > 0) {
        setQuoteDetailsMap((prev) => ({ ...prev, ...newQuoteDetailsMap }))
        newRfqFlights = mergeQuoteDetailsIntoFlights(newRfqFlights, newQuoteDetailsMap)
      }

      // Update chat with RFQ data
      const quotedCount = newRfqFlights.filter((f) => f.rfqStatus === 'quoted').length
      const updates: Partial<ChatSession> = {
        tripId,
        tripIdSubmitted: true,
        rfqFlights: newRfqFlights,
        rfqsLastFetchedAt: new Date().toISOString(),
        quotesTotal: newRfqFlights.length,
        quotesReceived: quotedCount,
        // Update status based on whether we have quotes
        status: quotedCount > 0 ? 'analyzing_options' as const : 'requesting_quotes' as const,
        currentStep: newRfqFlights.length > 0 ? 4 : 3,
      }
      
      console.log('[ChatInterface] 📊 Updating chat with RFQ data:', {
        tripId,
        rfqFlightsCount: newRfqFlights.length,
        quotedCount,
        status: updates.status,
        currentStep: updates.currentStep,
      })
      
      onUpdateChat(activeChat.id, updates)
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
   * Scroll to workflow progress section
   */
  const handleViewWorkflow = () => {
    workflowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
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
   * Handle generating proposal
   * 
   * Opens the customer selection dialog to allow the user to choose which customer
   * the proposal is for. Once a customer is selected, the proposal generation
   * workflow continues.
   * 
   * @param flightId - ID of the flight to generate proposal for
   * @param quoteId - Optional quote ID associated with the flight
   */
  const handleGenerateProposal = (flightId: string, quoteId?: string) => {
    console.log('[ChatInterface] Generate proposal clicked:', { flightId, quoteId })
    
    // Store the flight and quote IDs for when customer is selected
    setPendingProposalFlightId(flightId)
    setPendingProposalQuoteId(quoteId)
    
    // Open the customer selection dialog
    setIsCustomerDialogOpen(true)
  }

  /**
   * Handle customer selection from dialog
   * 
   * Called when a customer is selected in the CustomerSelectionDialog.
   * Fetches the selected flight data, constructs trip details, and calls
   * the proposal generation API with 30% profit margin.
   * 
   * @param customer - Selected customer profile from client_profiles table
   */
  const handleCustomerSelected = async (customer: ClientProfile) => {
    if (!pendingProposalFlightId) {
      console.error('[ChatInterface] No pending flight ID for proposal generation')
      return
    }

    setIsGeneratingProposal(true)
    setIsCustomerDialogOpen(false)

    try {
      // Find the selected flight from rfqFlights
      const selectedFlight = rfqFlights.find((f) => f.id === pendingProposalFlightId)
      
      if (!selectedFlight) {
        throw new Error('Selected flight not found')
      }

      // Parse route to get departure and arrival airports
      // extractRouteParts returns a tuple [departure, arrival]
      const routeParts = extractRouteParts(activeChat.route)
      const departureIcao = routeParts[0] || activeChat.route?.split(' → ')[0]?.trim() || ''
      const arrivalIcao = routeParts[1] || activeChat.route?.split(' → ')[1]?.trim() || ''

      if (!departureIcao || !arrivalIcao) {
        throw new Error('Invalid route: missing departure or arrival airport')
      }

      // Prepare trip details from activeChat
      // Use isoDate (YYYY-MM-DD format) for API calls, fall back to parsing date or today
      const getIsoDate = (): string => {
        // Prefer isoDate if available (already in YYYY-MM-DD format)
        if (activeChat.isoDate) {
          return activeChat.isoDate
        }
        // Try to parse the formatted display date
        if (activeChat.date) {
          try {
            const parsed = new Date(activeChat.date)
            if (!isNaN(parsed.getTime())) {
              return parsed.toISOString().split('T')[0]
            }
          } catch {
            // Fall through to default
          }
        }
        // Default to today
        return new Date().toISOString().split('T')[0]
      }

      const tripDetails = {
        departureAirport: {
          icao: departureIcao,
          name: departureIcao, // RouteParts is just [string, string], no name/city info
          city: '',
        },
        arrivalAirport: {
          icao: arrivalIcao,
          name: arrivalIcao, // RouteParts is just [string, string], no name/city info
          city: '',
        },
        departureDate: getIsoDate(),
        passengers: activeChat.passengers || 1,
        tripId: activeChat.tripId,
      }

      // Prepare customer data from selected client profile
      const customerData = {
        name: customer.contact_name,
        email: customer.email,
        company: customer.company_name,
        phone: customer.phone || undefined,
      }

      console.log('[ChatInterface] Generating proposal with:', {
        customer: customerData,
        tripDetails,
        flight: {
          id: selectedFlight.id,
          quoteId: selectedFlight.quoteId,
          operatorName: selectedFlight.operatorName,
          totalPrice: selectedFlight.totalPrice,
        },
        margin: '30%',
      })

      // Call the proposal generation API with 30% profit margin
      const response = await fetch('/api/proposal/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer: customerData,
          tripDetails,
          selectedFlights: [selectedFlight],
          jetvisionFeePercentage: 30, // 30% profit margin as specified
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `Failed to generate proposal: ${response.statusText}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate proposal')
      }

      console.log('[ChatInterface] Proposal generated successfully:', {
        proposalId: result.proposalId,
        fileName: result.fileName,
        pricing: result.pricing,
      })

      // Create a blob from the base64 PDF and open it in a new tab
      if (result.pdfBase64) {
        const pdfBlob = new Blob(
          [Uint8Array.from(atob(result.pdfBase64), (c) => c.charCodeAt(0))],
          { type: 'application/pdf' }
        )
        const pdfUrl = URL.createObjectURL(pdfBlob)
        
        // Open PDF in new tab
        window.open(pdfUrl, '_blank')
        
        // Also trigger download
        const link = document.createElement('a')
        link.href = pdfUrl
        link.download = result.fileName || 'proposal.pdf'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        // Clean up the blob URL after a delay
        setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000)
      }

      // Show success message (you could add a toast notification here)
      alert(`Proposal generated successfully!\n\nProposal ID: ${result.proposalId}\nTotal: ${result.pricing?.currency || 'USD'} ${result.pricing?.total?.toLocaleString() || 'N/A'}\n\nThe PDF has been opened in a new tab and downloaded.`)
    } catch (error) {
      console.error('[ChatInterface] Error generating proposal:', error)
      alert(`Failed to generate proposal: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsGeneratingProposal(false)
      setPendingProposalFlightId(null)
      setPendingProposalQuoteId(undefined)
    }
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

            {(() => {
              // CRITICAL: Deduplicate RFQ messages before rendering
              // Filter out duplicate agent messages with RFQ/quote content
              const deduplicatedMessages = (activeChat.messages || []).reduce((acc, message, index) => {
                // Always keep user messages
                if (message.type === 'user') {
                  acc.push({ message, index })
                  return acc
                }
                
                // For agent messages, check if it's an RFQ-related message
                const messageContent = (message.content || '').trim().toLowerCase()
                const isRfqMessage = messageContent.includes('rfq') ||
                                    messageContent.includes('quote') ||
                                    messageContent.includes('quotes') ||
                                    messageContent.includes('trip id') ||
                                    messageContent.includes('received quotes') ||
                                    messageContent.includes('here are') ||
                                    messageContent.includes('flight quotes') ||
                                    (messageContent.includes('tist') && messageContent.includes('kopf'))
                
                // If it's an RFQ message, check if we already have ANY RFQ message
                // CRITICAL: Only keep the FIRST RFQ message, skip ALL subsequent ones
                if (isRfqMessage) {
                  // Check if we already have ANY RFQ message
                  const hasAnyRfqMessage = acc.some(({ message: existingMsg }) => {
                    if (existingMsg.type !== 'agent') return false
                    const existingContent = (existingMsg.content || '').trim().toLowerCase()
                    // Check if existing message is also an RFQ message
                    return existingContent.includes('rfq') ||
                           existingContent.includes('quote') ||
                           existingContent.includes('quotes') ||
                           existingContent.includes('trip id') ||
                           existingContent.includes('received quotes') ||
                           existingContent.includes('here are') ||
                           existingContent.includes('flight quotes')
                  })
                  
                  // Skip ALL subsequent RFQ messages - only keep the first one
                  if (hasAnyRfqMessage) {
                    console.log('[ChatInterface] 🚫 Skipping duplicate RFQ message in render:', {
                      messageId: message.id,
                      contentPreview: messageContent.substring(0, 50),
                      totalMessagesProcessed: acc.length,
                    })
                    return acc
                  }
                }
                
                // Keep non-RFQ messages or first RFQ message
                acc.push({ message, index })
                return acc
              }, [] as Array<{ message: typeof activeChat.messages[0], index: number }>)
              
              // Find the first user message and first agent message to determine where to insert FlightSearchProgress
              const firstUserMessageIndex = deduplicatedMessages.findIndex(({ message }) => message.type === 'user')
              const firstAgentMessageIndex = deduplicatedMessages.findIndex(({ message }) => message.type === 'agent')
              const shouldInsertProgressAfterFirstAgent = shouldShowFlightSearchProgress && 
                                                          firstUserMessageIndex !== -1 && 
                                                          firstAgentMessageIndex !== -1 &&
                                                          firstAgentMessageIndex > firstUserMessageIndex
              
              return deduplicatedMessages.map(({ message, index }, mapIndex) => {
                const isFirstAgentMessage = mapIndex === firstAgentMessageIndex
                const shouldShowProgressAfterThis = shouldInsertProgressAfterFirstAgent && isFirstAgentMessage
                
                return (
                  <React.Fragment key={message.id || index}>
                    {message.type === "user" ? (
                      <>
                        <div className="flex justify-end">
                          <div className="max-w-[85%] bg-blue-600 text-white rounded-2xl px-4 py-3 shadow-sm">
                            <p className="text-sm leading-relaxed">{message.content}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <AgentMessage
                        content={stripMarkdown(message.content)}
                        timestamp={message.timestamp}
                        // CRITICAL: Disable internal FlightSearchProgress in AgentMessage when showing externally
                        // This ensures agent commentary appears first, then FlightSearchProgress follows
                        // AgentMessage shows FlightSearchProgress if showDeepLink OR showTripIdInput OR showWorkflow is true
                        // We disable all of these to prevent internal rendering, so the external one appears after commentary
                        showDeepLink={false} // Disable to prevent internal FlightSearchProgress
                        showTripIdInput={false} // Disable to prevent internal FlightSearchProgress
                        showWorkflow={false} // Disable to prevent internal FlightSearchProgress
                        workflowProps={undefined} // Disable workflow props to prevent internal FlightSearchProgress
                        deepLinkData={undefined} // Disable deepLinkData to prevent internal FlightSearchProgress
                        onTripIdSubmit={handleTripIdSubmit}
                        isTripIdLoading={isTripIdLoading}
                        tripIdError={tripIdError}
                        tripIdSubmitted={tripIdSubmitted}
                        // Show quotes when we have rfqFlights data
                        // BUT don't show them if they're already displayed in Step 3 via FlightSearchProgress
                        // This prevents duplicate RFQ displays - RFQs should only appear in Step 3, not in agent messages
                        // FlightSearchProgress shows RFQs in Step 3 when tripIdSubmitted is true and currentStep >= 3
                        // Only show quotes in agent message if we're NOT in Step 3/4 (where FlightSearchProgress handles RFQ display)
                        showQuotes={(() => {
                          const isInStep3Or4 = (activeChat.currentStep || 0) >= 3
                          return !isInStep3Or4 && (
                            (message.showQuotes && tripIdSubmitted) ||
                            (rfqFlights.length > 0 && !shouldShowFlightSearchProgress)
                          )
                        })()}
                        rfqFlights={(() => {
                          const isInStep3Or4 = (activeChat.currentStep || 0) >= 3
                          const shouldShowQuotesInMessage = !isInStep3Or4 && (
                            (message.showQuotes && tripIdSubmitted) ||
                            (rfqFlights.length > 0 && !shouldShowFlightSearchProgress)
                          )
                          return shouldShowQuotesInMessage ? rfqFlights.map((flight) => {
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
                          }) : []
                        })()}
                        selectedRfqFlightIds={selectedRfqFlightIds}
                        rfqsLastFetchedAt={activeChat.rfqsLastFetchedAt}
                        onRfqFlightSelectionChange={setSelectedRfqFlightIds}
                        onReviewAndBook={handleReviewAndBook}
                        customerEmail={activeChat.customer?.name ? `${activeChat.customer.name.toLowerCase().replace(/\s+/g, '.')}@example.com` : ''}
                        customerName={activeChat.customer?.name || ''}
                        selectedFlights={[]}
                        onViewChat={handleViewChat}
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
                    
                    {/* Insert FlightSearchProgress after the first agent message (which follows the initial request) */}
                    {shouldShowProgressAfterThis && (
                      <div ref={workflowRef} className="mt-4 mb-4" style={{ overflow: 'visible' }}>
                        <FlightSearchProgress
                          currentStep={(() => {
                            // Calculate proper step based on state per UX requirements:
                            // Step 1: Request Created (has route/request)
                            // Step 2: Select in Avinode (has deepLink)
                            // Step 3: Enter TripID (has tripId but no RFQs yet)
                            // Step 4: Review Quotes (has tripId and RFQ flights)
                            // Use activeChat.tripIdSubmitted to check actual chat state, not just local state
                            const isTripIdSubmitted = tripIdSubmitted || activeChat.tripIdSubmitted || false
                            
                            // Step 4: If we have RFQ flights and tripId is submitted
                            if (rfqFlights.length > 0 && isTripIdSubmitted) {
                              return 4
                            }
                            
                            // Step 3: If we have tripId and RFQs are not loaded yet
                            if (activeChat.tripId && rfqFlights.length === 0) {
                              return 3
                            }
                            
                            // Step 2: If we have deepLink (means request created, ready to select in Avinode)
                            if (activeChat.deepLink) {
                              return 2
                            }
                            
                            // Step 1: Default (request created)
                            return activeChat.currentStep || 1
                          })()}
                          flightRequest={{
                            // Route format is "DEPT → ARR" (with arrow character)
                            departureAirport: activeChat.route?.split(' → ')[0]
                              ? { icao: activeChat.route.split(' → ')[0].trim() }
                              : { icao: 'TBD' },
                            arrivalAirport: activeChat.route?.split(' → ')[1]
                              ? { icao: activeChat.route.split(' → ')[1].trim() }
                              : { icao: 'TBD' },
                            departureDate: activeChat.isoDate || new Date().toISOString().split('T')[0],
                            passengers: activeChat.passengers || 1,
                            requestId: activeChat.requestId,
                          }}
                          deepLink={activeChat.deepLink}
                          tripId={activeChat.tripId}
                          isTripIdLoading={isTripIdLoading}
                          tripIdError={tripIdError}
                          tripIdSubmitted={tripIdSubmitted || activeChat.tripIdSubmitted || (activeChat.tripId && activeChat.rfqFlights && activeChat.rfqFlights.length > 0) || false}
                          rfqFlights={rfqFlights}
                          isRfqFlightsLoading={false}
                          selectedRfqFlightIds={selectedRfqFlightIds}
                          rfqsLastFetchedAt={activeChat.rfqsLastFetchedAt}
                          customerEmail={(activeChat.customer as { email?: string })?.email}
                          customerName={activeChat.customer?.name}
                          onTripIdSubmit={handleTripIdSubmit}
                          onRfqFlightSelectionChange={setSelectedRfqFlightIds}
                          onViewChat={handleViewChat}
                          onGenerateProposal={handleGenerateProposal}
                          onReviewAndBook={handleReviewAndBook}
                        />
                      </div>
                    )}
                  </React.Fragment>
                )
              })
            })()}

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
            {/* View Workflow button - scrolls to workflow progress section */}
            {activeChat.currentStep && activeChat.currentStep >= 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewWorkflow}
                className="text-xs bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700"
              >
                <Eye className="w-3 h-3 mr-1" />
                View Workflow
              </Button>
            )}
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

      {/* Customer Selection Dialog for Proposal Generation */}
      <CustomerSelectionDialog
        open={isCustomerDialogOpen}
        onClose={() => {
          setIsCustomerDialogOpen(false)
          setPendingProposalFlightId(null)
          setPendingProposalQuoteId(undefined)
        }}
        onSelect={handleCustomerSelected}
      />

      {/* Loading overlay when generating proposal */}
      {isGeneratingProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-lg font-medium">Generating proposal...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
