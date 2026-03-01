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
import { Send, Loader2, Plane, Bell, MessageSquare } from "lucide-react"
import type { ChatSession } from "./chat-sidebar"
import { createSupabaseClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

// UI Components
import { AgentMessage } from "./chat/agent-message"
import { AgentMessageV2 } from "./chat/agent-message-v2"
import { DynamicChatHeader } from "./chat/dynamic-chat-header"
import { QuoteDetailsDrawer, type QuoteDetails, type OperatorMessage } from "./quote-details-drawer"
import { OperatorMessageThread } from "./avinode/operator-message-thread"
import { OperatorChatsInline, type FlightContext, type OperatorMessageInline } from "@/components/message-components/operator-chat-inline"
import { FlightSearchProgress } from "./avinode/flight-search-progress"
import { BookFlightModal } from "./avinode/book-flight-modal"
import { PaymentConfirmationModal } from "./contract/payment-confirmation-modal"
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
  // Book Flight customer derivation
  getBookFlightCustomer,
  // Agent notification utilities (ONEK-173)
  formatQuoteReceivedMessage,
  formatOperatorMessageNotification,
  resolveRequestIdForPersistence,
  // Types
  type Quote,
  type QuoteDetailsMap,
  type SSEParseResult,
  type PipelineData,
  type QuoteEventPayload,
} from "@/lib/chat"

// Skeleton loading
import { ChatLoadingSkeleton } from "@/components/chat/chat-loading-skeleton"

// Flight request parser utility
import { parseFlightRequest } from "@/lib/utils/parse-flight-request"

// Defensive ICAO extraction - prevents "[object Object]" from appearing in route strings
import { resolveAirportIcao } from "@/lib/chat/parsers/sse-parser"
import { formatDate, formatMessageTimestamp, safeParseTimestamp } from "@/lib/utils/format"
import { generateEmailDraft } from "@/lib/utils/email-draft-generator"
import type { EmailApprovalRequestContent } from "@/lib/types/chat"

/**
 * Convert markdown-formatted text to plain text
 */
function stripMarkdown(text: string): string {
  return text
    // Remove standalone JSON object lines (tool results leaked by model)
    .replace(/^\s*\{"[^"]+"\s*:.*\}\s*$/gm, '')
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
  onArchiveChat?: (chatId: string) => void
  isLoading?: boolean
}

export function ChatInterface({
  activeChat,
  isProcessing,
  onProcessingChange,
  onUpdateChat,
  onArchiveChat,
  isLoading,
}: ChatInterfaceProps) {
  const isArchived = activeChat.status === 'closed_won';
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [streamError, setStreamError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const workflowRef = useRef<HTMLDivElement>(null)
  const activeChatRef = useRef(activeChat)
  activeChatRef.current = activeChat
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
  // Debounce webhook-triggered RFQ refreshes (5-second minimum interval)
  // Multiple quotes arriving in rapid succession should be batched into a single refresh
  const lastWebhookRefreshRef = useRef<number>(0)
  const webhookRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Track when a trip was just created to suppress auto-load "not active trip" messages
  // Within 30s of trip creation, operators haven't responded yet so RFQ data is empty
  const tripCreatedAtRef = useRef<number>(0)
  // ONEK-173: Buffer for batching rapid quote events into a single notification message
  const quoteEventBufferRef = useRef<QuoteEventPayload[]>([])
  const quoteNotificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
  // Margin percentage selected in customer dialog (default 10% per ONEK-177)
  const [selectedMarginPercentage, setSelectedMarginPercentage] = useState(10)

  // Email approval workflow state (ONEK-178)
  const [emailApprovalMessageId, setEmailApprovalMessageId] = useState<string | null>(null)
  const [emailApprovalData, setEmailApprovalData] = useState<EmailApprovalRequestContent | null>(null)
  const [emailApprovalStatus, setEmailApprovalStatus] = useState<'draft' | 'sending' | 'sent' | 'error'>('draft')
  const [emailApprovalError, setEmailApprovalError] = useState<string | undefined>()

  // Restore email approval state when switching chats (ONEK-185)
  // Scans loaded messages for an email_approval_request so the EmailPreviewCard
  // and "Send Email" handler work after chat switch or page refresh.
  // If a proposal-sent confirmation already exists, the email was already sent
  // so we skip restoring the approval card.
  useEffect(() => {
    const msgs = activeChat.messages || []
    const alreadySent = msgs.some(
      (msg) => msg.showProposalSentConfirmation || msg.showContractSentConfirmation
    )
    const emailMsg = alreadySent
      ? undefined
      : msgs.find((msg) => msg.showEmailApprovalRequest && msg.emailApprovalData)

    if (emailMsg) {
      setEmailApprovalMessageId(emailMsg.id)
      setEmailApprovalData(emailMsg.emailApprovalData as EmailApprovalRequestContent)
      setEmailApprovalStatus('draft')
    } else {
      setEmailApprovalMessageId(null)
      setEmailApprovalData(null)
      setEmailApprovalStatus('draft')
    }
  }, [activeChat.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Suppress email approval card when a proposal/contract confirmation already exists (ONEK-185)
  const emailAlreadySent = (activeChat.messages || []).some(
    (msg) => msg.showProposalSentConfirmation || msg.showContractSentConfirmation
  )

  // Book flight modal state for contract generation
  const [isBookFlightModalOpen, setIsBookFlightModalOpen] = useState(false)
  const [bookFlightData, setBookFlightData] = useState<RFQFlight | null>(null)
  const [pendingBookFlightId, setPendingBookFlightId] = useState<string | null>(null)
  const [pendingBookFlightQuoteId, setPendingBookFlightQuoteId] = useState<string | undefined>(undefined)
  const [selectedBookingCustomer, setSelectedBookingCustomer] = useState<{ name: string; email: string; company?: string; phone?: string } | null>(null)
  const [isBookingCustomerDialogOpen, setIsBookingCustomerDialogOpen] = useState(false)

  // Payment confirmation modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [paymentContractData, setPaymentContractData] = useState<{
    contractId: string; contractNumber: string; totalAmount: number; currency: string;
    customerName?: string; flightRoute?: string
  } | null>(null)

  // Sync tripIdSubmitted with activeChat
  useEffect(() => {
    if (activeChat.tripIdSubmitted !== undefined) {
      setTripIdSubmitted(activeChat.tripIdSubmitted)
    }
  }, [activeChat.tripIdSubmitted])

  // Parse route to get airport info using extracted utility
  const routeParts = extractRouteParts(activeChat.route)

  /**
   * Show FlightSearchProgress ONLY when a trip has been successfully created.
   * The component should appear immediately after the agent message that confirms
   * trip creation (when we have a tripId or deepLink), and all subsequent messages
   * should appear below it.
   * 
   * CRITICAL: Do NOT show this component until a trip is actually created.
   * Just having route/date/passengers is not enough - we need confirmation that
   * create_trip was called successfully (indicated by tripId or deepLink).
   */
  const shouldShowFlightSearchProgress = useMemo(() => {
    // CRITICAL: Only show when trip is successfully created
    // A trip is considered created when we have either:
    // 1. A tripId (from create_trip tool response)
    // 2. A deepLink (from create_trip tool response)
    // Note: requestId alone is NOT sufficient — it's the conversation/session ID
    // which gets set on every API response, even clarification messages before trip creation
    const hasTripCreated = !!(activeChat.tripId || activeChat.deepLink)
    
    // Also verify we have the basic trip information for display
    const hasValidRoute =
      !!activeChat.route &&
      activeChat.route !== 'Select route' &&
      activeChat.route !== 'TBD' &&
      activeChat.route.trim().length > 0 &&
      activeChat.route.includes('→') // Must have both departure and arrival

    const hasValidDate =
      !!activeChat.date &&
      activeChat.date !== 'Select date' &&
      activeChat.date !== 'Date TBD' &&
      activeChat.date !== 'TBD' &&
      activeChat.date.trim().length > 0

    const hasValidPassengers = (activeChat.passengers ?? 0) > 0

    // Show FlightSearchProgress ONLY when trip is created AND we have display data
    // This ensures the component appears after successful trip creation, not just when info is collected
    return hasTripCreated && hasValidRoute && hasValidDate && hasValidPassengers
  }, [
    activeChat.tripId,
    activeChat.deepLink,
    activeChat.route,
    activeChat.date,
    activeChat.passengers,
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [activeChat.messages])

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
      // ONEK-173: Clear notification buffer timer to prevent memory leaks
      if (quoteNotificationTimerRef.current) {
        clearTimeout(quoteNotificationTimerRef.current)
        quoteNotificationTimerRef.current = null
      }
      // Flush any remaining buffered events before cleanup
      if (quoteEventBufferRef.current.length > 0) {
        quoteEventBufferRef.current = []
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
    
    // Suppress auto-load if trip was just created (< 30s ago)
    // Operators haven't responded yet, so RFQ data will be empty and the AI
    // generates a confusing "doesn't look like an active trip" message
    const TRIP_CREATION_GRACE_MS = 30000
    const isTripJustCreated = tripCreatedAtRef.current > 0 &&
      (Date.now() - tripCreatedAtRef.current) < TRIP_CREATION_GRACE_MS

    // Determine if auto-load should trigger
    // Always auto-load if:
    // 1. We have a tripId
    // 2. We haven't already loaded for this chat ID
    // 3. We're not currently loading
    // 4. We don't have RFQ flights OR haven't fetched recently OR tripIdSubmitted is false
    // 5. Handler is available
    // 6. Trip was NOT just created (grace period)
    const shouldAutoLoad =
      !!activeChat.tripId && // Must have tripId
      activeChat.id !== autoLoadedRfqsForChatIdRef.current && // Haven't already loaded for this chat
      !isTripIdLoading && // Not currently loading
      !isLoading && // Prevent race with handleSelectChat loading
      (!hasRfqFlights || !hasRecentFetch || !activeChat.tripIdSubmitted) && // No RFQs OR not fetched recently OR not submitted
      !!handleTripIdSubmit && // Handler available
      !isTripJustCreated // Not within grace period after trip creation

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
  }, [activeChat.tripId, activeChat.id, activeChat.tripIdSubmitted, activeChat.rfqsLastFetchedAt, rfqFlights?.length, isTripIdLoading, isLoading])

  /**
   * Flush buffered quote events into a single batched notification message (ONEK-173)
   */
  const flushQuoteNotificationBuffer = useCallback(() => {
    const events = quoteEventBufferRef.current
    if (events.length === 0) return

    // Clear the buffer
    quoteEventBufferRef.current = []
    quoteNotificationTimerRef.current = null

    // Build a batched notification message
    const notificationMessage = formatQuoteReceivedMessage(events, activeChat.route)

    // Append to the chat thread
    onUpdateChat(activeChat.id, {
      messages: [...(activeChatRef.current.messages || []), notificationMessage],
    })

    // Persist to DB so it survives page reload
    const requestId = resolveRequestIdForPersistence(activeChat)
    if (requestId) {
      fetch('/api/chat-sessions/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          content: notificationMessage.content,
          contentType: 'system_notification',
          richContent: { systemEvent: notificationMessage.systemEventData },
        }),
      }).catch((err) => console.warn('[ChatInterface] Failed to persist quote notification:', err))
    }
  }, [activeChat.id, activeChat.route, activeChat.requestId, activeChat.conversationId, onUpdateChat])

  /**
   * Handle webhook events from Supabase realtime
   */
  const handleWebhookEvent = useCallback((event: RealtimeWebhookEvent) => {
    const eventType = event.event_type
    const payload = event.payload || {}

    if (eventType === 'TripRequestSellerResponse') {
      // New quote received - debounce RFQ refresh (5-second minimum interval)
      // Multiple quotes arriving in rapid succession are batched into a single refresh
      const quoteId = payload.quoteId || payload.quote_id
      if (quoteId && activeChat.tripId) {
        const now = Date.now()
        const elapsed = now - lastWebhookRefreshRef.current
        const DEBOUNCE_MS = 5000

        if (elapsed >= DEBOUNCE_MS) {
          // Enough time has passed - refresh immediately
          lastWebhookRefreshRef.current = now
          handleTripIdSubmit(activeChat.tripId)
        } else {
          // Too soon - schedule a delayed refresh (replaces any existing timer)
          if (webhookRefreshTimerRef.current) {
            clearTimeout(webhookRefreshTimerRef.current)
          }
          const tripIdCapture = activeChat.tripId
          webhookRefreshTimerRef.current = setTimeout(() => {
            lastWebhookRefreshRef.current = Date.now()
            handleTripIdSubmit(tripIdCapture)
            webhookRefreshTimerRef.current = null
          }, DEBOUNCE_MS - elapsed)
        }

        // ONEK-173: Buffer quote events for batched notification message
        quoteEventBufferRef.current.push({
          quoteId,
          operatorName: payload.senderName,
          tripId: activeChat.tripId,
        })

        // Reset the notification flush timer (aligns with the RFQ refresh debounce)
        if (quoteNotificationTimerRef.current) {
          clearTimeout(quoteNotificationTimerRef.current)
        }
        quoteNotificationTimerRef.current = setTimeout(() => {
          flushQuoteNotificationBuffer()
        }, DEBOUNCE_MS)
      }
    } else if (eventType === 'TripChatSeller' || eventType === 'TripChatMine') {
      // New message - update operator messages
      const quoteId = payload.quoteId || payload.quote_id
      if (quoteId) {
        const currentMessages = activeChat.operatorMessages?.[quoteId] || []
        const messageContent = payload.message || payload.content || ''
        const senderName = eventType === 'TripChatMine' ? 'You' : payload.senderName || 'Operator'
        const newMessage: OperatorMessage = {
          id: payload.messageId || `msg-${Date.now()}`,
          type: eventType === 'TripChatMine' ? 'REQUEST' : 'RESPONSE',
          content: messageContent,
          timestamp: payload.timestamp || new Date().toISOString(),
          sender: senderName,
        }

        // ONEK-173: For incoming operator messages (not our own), inject a notification into the chat thread
        if (eventType === 'TripChatSeller') {
          const notificationMessage = formatOperatorMessageNotification(
            senderName,
            quoteId,
            messageContent,
          )

          onUpdateChat(activeChat.id, {
            operatorMessages: {
              ...activeChat.operatorMessages,
              [quoteId]: [...currentMessages, newMessage],
            },
            messages: [...(activeChatRef.current.messages || []), notificationMessage],
          })

          // Persist operator message notification to DB
          const requestId = resolveRequestIdForPersistence(activeChat)
          if (requestId) {
            fetch('/api/chat-sessions/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                requestId,
                content: notificationMessage.content,
                contentType: 'system_notification',
                richContent: { systemEvent: notificationMessage.systemEventData },
              }),
            }).catch((err) => console.warn('[ChatInterface] Failed to persist operator message notification:', err))
          }
        } else {
          // TripChatMine - just update operator messages (no notification needed for our own messages)
          onUpdateChat(activeChat.id, {
            operatorMessages: {
              ...activeChat.operatorMessages,
              [quoteId]: [...currentMessages, newMessage],
            },
          })
        }
      }
    }
  }, [activeChat.id, activeChat.tripId, activeChat.operatorMessages, activeChat.requestId, activeChat.conversationId, activeChat.route, onUpdateChat, flushQuoteNotificationBuffer])

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

    // CRITICAL: Prevent creating a new request when continuing a conversation.
    // If we have prior messages but no conversationId/requestId, the API would create a new
    // request and subsequent messages would be saved there—so the original request would
    // contain only the first exchange, and we'd "lose" it after refresh.
    const conversationIdOrRequestId = activeChat.conversationId || activeChat.requestId
    const hasPriorMessages = existingMessages.length > 0
    if (hasPriorMessages && !conversationIdOrRequestId) {
      console.error('[ChatInterface] Blocking send: prior messages exist but no conversationId/requestId', {
        existingCount: existingMessages.length,
        activeChatId: activeChat.id,
      })
      setStreamError('Session link missing. Please refresh the page and try again.')
      setIsTyping(false)
      onProcessingChange(false)
      abortControllerRef.current = null
      return
    }

    // Update chat session immediately with parsed flight details
    onUpdateChat(activeChat.id, sessionUpdates)

    try {
      const fetchChat = () => fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          tripId: activeChat.tripId,
          requestId: conversationIdOrRequestId ?? undefined,
          // Send conversationId in context (API expects context.conversationId).
          // Ensures all messages in a conversation are saved to the same request ID.
          context: {
            conversationId: conversationIdOrRequestId ?? undefined,
            tripId: activeChat.tripId,
          },
          conversationHistory: existingMessages.map((m) => ({
            role: m.type === "user" ? "user" : "assistant",
            content: m.content,
          })),
        }),
        signal: abortControllerRef.current?.signal,
      })

      let response = await fetchChat()

      // Retry once on 401 — Clerk session token may have expired and auto-refreshed
      if (response.status === 401) {
        console.warn('[ChatInterface] 🔄 Got 401 on chat, retrying after token refresh...')
        await new Promise(resolve => setTimeout(resolve, 1500))
        response = await fetchChat()
      }

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? 'Session expired. Please refresh the page and try again.'
            : `API error: ${response.status}`
        )
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

    // NOTE: Message deduplication is handled in the rendering layer (lines ~2037-2090)
    // which filters by exact message ID and exact content matches.
    // No additional filtering needed here - let all messages through and dedupe at render time.

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
        departureAirport: (() => { const icao = resolveAirportIcao(tripData?.departure_airport); return icao ? { icao } : undefined; })(),
        arrivalAirport: (() => { const icao = resolveAirportIcao(tripData?.arrival_airport); return icao ? { icao } : undefined; })(),
        departureDate: tripData?.departure_date,
        passengers: tripData?.passengers,
        tripType: (() => {
          const tt = tripData?.trip_type || rfpData?.trip_type;
          if (tt === 'round_trip') return 'round_trip' as const;
          if (tt === 'multi_city') return 'multi_city' as const;
          return 'one_way' as const;
        })(),
        returnDate: tripData?.return_date || rfpData?.return_date,
      } : undefined,
      showQuotes: quotes.length > 0 || (result.rfqData?.flights?.length ?? 0) > 0,
      showPipeline: !!result.pipelineData,
      pipelineData: result.pipelineData,
      // ONEK-299: Contract sent confirmation card
      showContractSentConfirmation: !!result.contractSentData,
      contractSentData: result.contractSentData ? {
        contractId: result.contractSentData.contractId,
        contractNumber: result.contractSentData.contractNumber,
        status: (result.contractSentData.status as 'draft' | 'sent' | 'signed' | 'payment_pending' | 'paid' | 'completed') || 'sent',
        pdfUrl: result.contractSentData.pdfUrl,
        customerName: result.contractSentData.customer?.name || 'Customer',
        customerEmail: result.contractSentData.customer?.email || '',
        flightRoute: result.contractSentData.flightRoute || '',
        departureDate: activeChat.isoDate || new Date().toISOString().split('T')[0],
        totalAmount: result.contractSentData.pricing?.totalAmount || 0,
        currency: result.contractSentData.pricing?.currency || 'USD',
      } : undefined,
      // ONEK-300: Payment confirmed card
      showPaymentConfirmation: !!result.paymentConfirmationData,
      paymentConfirmationData: result.paymentConfirmationData,
      // ONEK-301: Closed won confirmation card
      showClosedWon: !!result.closedWonData,
      closedWonData: result.closedWonData,
      // Phase 4b: Customer preferences from get_client tool
      showCustomerPreferences: !!result.clientData?.preferences && Object.keys(result.clientData.preferences).length > 0,
      // Phase 6: Empty leg search results
      showEmptyLegs: !!result.emptyLegData && result.emptyLegData.length > 0,
      emptyLegData: result.emptyLegData,
      // MCP UI registry: pass tool results for feature-flagged rendering
      toolResults: result.toolResults,
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
      // Record trip creation time so auto-load can skip the grace period
      tripCreatedAtRef.current = Date.now()
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
    // NOTE: departure_airport can be a string (from LLM tool params) or AirportInfo object
    // (from typed TripData). Use resolveAirportIcao to safely extract ICAO string.
    const departureAirport = resolveAirportIcao(tripData?.departure_airport) || resolveAirportIcao(rfpData?.departure_airport)
    const arrivalAirport = resolveAirportIcao(tripData?.arrival_airport) || resolveAirportIcao(rfpData?.arrival_airport)
    // For multi-city trips, build route from segments to preserve all intermediate stops
    const rawSegments = tripData?.segments || rfpData?.segments
    if (rawSegments && Array.isArray(rawSegments) && rawSegments.length > 1) {
      const segAirports = rawSegments.map((s) => resolveAirportIcao(s.departure_airport) || '???')
      const lastSeg = rawSegments[rawSegments.length - 1]
      const lastArr = resolveAirportIcao(lastSeg.arrival_airport) || '???'
      segAirports.push(lastArr)
      updates.route = segAirports.join(' → ')
    } else if (departureAirport && arrivalAirport) {
      updates.route = `${departureAirport} → ${arrivalAirport}`
    }
    const departureDate = tripData?.departure_date || rfpData?.departure_date
    if (departureDate) {
      // Only update the date if it looks like a valid departure date (YYYY-MM-DD),
      // not a timestamp. Also don't overwrite an already-set user date with today's date
      // (which could happen if the API returns the trip creation date instead of requested date).
      const isISODate = /^\d{4}-\d{2}-\d{2}$/.test(departureDate)
      const existingIsoDate = activeChat.isoDate
      const isToday = departureDate === new Date().toISOString().split('T')[0]

      // Update only if: it's a valid ISO date AND (we don't already have a date OR it's not just today's date)
      if (isISODate && (!existingIsoDate || !isToday)) {
        updates.isoDate = departureDate
        try {
          updates.date = formatDate(departureDate)
        } catch {
          updates.date = departureDate
        }
      }
    }
    const passengerCount = tripData?.passengers || rfpData?.passengers
    if (passengerCount) {
      updates.passengers = passengerCount
    }
    // Extract trip type and return date from SSE data
    const tripType = tripData?.trip_type || rfpData?.trip_type
    if (tripType) {
      updates.tripType = tripType === 'round_trip' ? 'round_trip' : tripType === 'multi_city' ? 'multi_city' : 'one_way'
    }
    const returnDate = tripData?.return_date || rfpData?.return_date
    if (returnDate) {
      updates.returnDate = returnDate
    }
    // Extract segments for multi-city trips
    const segments = tripData?.segments || rfpData?.segments
    if (segments && Array.isArray(segments) && segments.length > 0) {
      updates.segments = segments as ChatSession['segments']
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
      let allRfqFlights = [...updatedExisting, ...uniqueNewFlights]

      // Phase 5: Tag flights with legType for round-trip grouping
      // Match departure airport against the original request's departure/arrival
      if (activeChat.tripType === 'round_trip' && activeChat.route) {
        const [routeDep, routeArr] = (activeChat.route || '').split(' → ').map(s => s?.trim().toUpperCase());
        if (routeDep && routeArr) {
          allRfqFlights = allRfqFlights.map(f => {
            if (f.legType) return f; // Already tagged
            const flightDep = f.departureAirport?.icao?.toUpperCase();
            if (flightDep === routeDep) {
              return { ...f, legType: 'outbound' as const, legSequence: 1 };
            } else if (flightDep === routeArr) {
              return { ...f, legType: 'return' as const, legSequence: 2 };
            }
            return f;
          });
        }
      }

      updates.rfqFlights = allRfqFlights
      updates.quotesTotal = allRfqFlights.length
      updates.quotesReceived = allRfqFlights.filter((f) => f.rfqStatus === 'quoted' || (f.totalPrice && f.totalPrice > 0)).length

      // If we got RFQ data, ensure tripIdSubmitted is set to true
      if (result.rfqData && !updates.tripIdSubmitted) {
        updates.tripIdSubmitted = true
        updates.rfqsLastFetchedAt = new Date().toISOString()
      }

      // Update status and step based on RFQ data
      const quotedCount = allRfqFlights.filter((f) => f.rfqStatus === 'quoted' || (f.totalPrice && f.totalPrice > 0)).length
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

    // Phase 4b: Update customer data when get_client returns preferences
    if (result.clientData) {
      updates.customer = {
        name: result.clientData.name,
        email: result.clientData.email,
        company: result.clientData.company,
        preferences: result.clientData.preferences as { catering?: string; groundTransport?: string } | undefined,
      }
    }

    // Phase 1: Auto-archive when payment is confirmed via agent path
    // (aligns agent confirm_payment path with UI handlePaymentConfirm path)
    if (result.paymentConfirmationData && result.closedWonData) {
      updates.status = 'closed_won' as const;
      // Trigger archive after a short delay to let message render first
      setTimeout(() => {
        if (onArchiveChat) {
          onArchiveChat(activeChat.id);
        }
      }, 1500);
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

    // Abort controller with 30s timeout to prevent stuck spinner
    const abortController = new AbortController()
    const timeoutId = setTimeout(() => abortController.abort(), 30000)

    try {
      // Build conversation history from active chat messages for context
      // Use ref to avoid stale closure when async function resolves
      const chat = activeChatRef.current
      const conversationHistory = (chat.messages || []).map((msg) => ({
        role: msg.type === "user" ? "user" as const : "assistant" as const,
        content: msg.content,
      }))

      console.log('[ChatInterface] 📡 Calling get_rfq for TripID:', {
        tripId,
        chatId: chat.id,
        hasConversationHistory: conversationHistory.length > 0,
        historyLength: conversationHistory.length,
      })

      const convOrReqId = chat.conversationId || chat.requestId
      const fetchRfqData = () => fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Get RFQs for Trip ID ${tripId}`,
          tripId,
          conversationHistory,
          requestId: convOrReqId ?? undefined,
          context: {
            conversationId: convOrReqId ?? undefined,
            tripId,
          },
          skipMessagePersistence: true,
        }),
        signal: abortController.signal,
      })

      let response = await fetchRfqData()

      // Retry once on 401 — Clerk session token may have expired and auto-refreshed
      if (response.status === 401) {
        console.warn('[ChatInterface] 🔄 Got 401, retrying after token refresh...')
        await new Promise(resolve => setTimeout(resolve, 1500))
        response = await fetchRfqData()
      }

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? 'Session expired. Please refresh the page and try again.'
            : `Failed to fetch RFQs (error ${response.status}). Please try again.`
        )
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
            hasError: !!(toolCall.result?.error),
            error: (toolCall.result?.error),
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
              const flight = convertQuoteToRFQFlight(quote, routeParts, chat.date)
              if (flight) newRfqFlights.push(flight)
            }
          } else {
            const flight = convertRfqToRFQFlight(rfq, routeParts, chat.date)
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
          rfq_ids: result.rfqData.rfqs.map((r: { rfq_id?: string; id?: string }) => r.rfq_id || r.id),
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
      // Count flights that have responded: either status 'quoted' or has a non-zero price
      const quotedCount = newRfqFlights.filter((f) => f.rfqStatus === 'quoted' || (f.totalPrice && f.totalPrice > 0)).length
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
        // Sync session IDs from API response (same as sendMessageWithStreaming)
        // This ensures the frontend has the correct database IDs for proposal persistence
        // IMPORTANT: Preserve existing requestId if API doesn't return one
        ...(result.conversationId ? {
          conversationId: result.conversationId,
          requestId: result.conversationId,
        } : {
          // Ensure existing requestId is explicitly preserved (defensive coding)
          // This handles cases where the session already has a valid requestId from sidebar load
          ...(chat.requestId ? { requestId: chat.requestId } : {}),
          ...(chat.conversationId ? { conversationId: chat.conversationId } : {}),
        }),
      }

      console.log('[ChatInterface] 📊 Updating chat with RFQ data:', {
        tripId,
        rfqFlightsCount: newRfqFlights.length,
        quotedCount,
        status: updates.status,
        currentStep: updates.currentStep,
        conversationId: result.conversationId || 'not returned',
        requestIdSynced: !!result.conversationId,
        existingRequestId: chat.requestId || 'none',
        existingConversationId: chat.conversationId || 'none',
        finalRequestId: updates.requestId || 'not set',
        hasAgentSummary: !!result.content,
      })

      onUpdateChat(chat.id, updates)
      setTripIdSubmitted(true)

    } catch (error) {
      console.error('[ChatInterface] Error submitting trip ID:', error)
      if (error instanceof DOMException && error.name === 'AbortError') {
        setTripIdError('Request timed out after 30s. Please try again.')
      } else {
        setTripIdError(error instanceof Error ? error.message : 'Failed to fetch RFQ data')
      }
    } finally {
      clearTimeout(timeoutId)
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
    // In consolidated schema, activeChat.id IS the request UUID.
    // activeChat.requestId may be undefined if not explicitly set.
    setMessageThreadRequestId(activeChat.requestId || activeChat.id)
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
   * Generates a draft proposal, uploads PDF, and shows email preview
   * for user approval before sending (ONEK-178).
   *
   * @param customer - Selected customer profile from client_profiles table
   * @param marginPercentage - Profit margin percentage (default 10)
   */
  const handleCustomerSelected = async (customer: ClientProfile, marginPercentage?: number) => {
    const margin = marginPercentage ?? 10
    setSelectedMarginPercentage(margin)
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

      // Detect round trip: check if rfqFlights contain both outbound and return legs
      const hasReturnFlights = rfqFlights.some((f) => f.legType === 'return')
      const hasOutboundFlights = rfqFlights.some((f) => f.legType === 'outbound')
      const isRoundTrip = hasOutboundFlights && hasReturnFlights

      // For round trips, find the matching return flight (same operator/base quote)
      // Flight IDs follow pattern: flight-aquote-NNNNN-seg1 (outbound) / flight-aquote-NNNNN-seg2 (return)
      let returnFlight: typeof selectedFlight | undefined
      if (isRoundTrip && selectedFlight.legType === 'outbound') {
        const baseId = selectedFlight.id.replace(/-seg\d+$/, '')
        returnFlight = rfqFlights.find(
          (f) => f.legType === 'return' && f.id.startsWith(baseId)
        )
      } else if (isRoundTrip && selectedFlight.legType === 'return') {
        // User clicked a return flight; find matching outbound
        const baseId = selectedFlight.id.replace(/-seg\d+$/, '')
        returnFlight = selectedFlight
        const outboundMatch = rfqFlights.find(
          (f) => f.legType === 'outbound' && f.id.startsWith(baseId)
        )
        // Swap: outbound becomes the "selected" and return stays as returnFlight
        if (outboundMatch) {
          // selectedFlight stays as-is for the return, outboundMatch is the primary
          // We'll include both in selectedFlights below
        }
      }

      // Use flight-level airport data when available (more accurate than chat route)
      const depAirport = selectedFlight.departureAirport
      const arrAirport = selectedFlight.arrivalAirport

      // Parse route to get departure and arrival airports
      // extractRouteParts returns a tuple [departure, arrival]
      const routeParts = extractRouteParts(activeChat.route)
      const departureIcao = depAirport?.icao || routeParts[0] || activeChat.route?.split(' → ')[0]?.trim() || ''
      const arrivalIcao = arrAirport?.icao || routeParts[1] || activeChat.route?.split(' → ')[1]?.trim() || ''

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

      const tripDetails: Record<string, unknown> = {
        tripType: isRoundTrip ? 'round_trip' as const : 'one_way' as const,
        departureAirport: {
          icao: departureIcao,
          name: depAirport?.name || departureIcao,
          city: depAirport?.city || '',
        },
        arrivalAirport: {
          icao: arrivalIcao,
          name: arrAirport?.name || arrivalIcao,
          city: arrAirport?.city || '',
        },
        departureDate: selectedFlight.departureDate || getIsoDate(),
        passengers: activeChat.passengers || 1,
        tripId: activeChat.tripId,
      }

      // Add return leg details for round trips
      if (isRoundTrip && returnFlight) {
        tripDetails.returnDate = returnFlight.departureDate
        tripDetails.returnAirport = returnFlight.arrivalAirport
          ? {
              icao: returnFlight.arrivalAirport.icao,
              name: returnFlight.arrivalAirport.name || returnFlight.arrivalAirport.icao,
              city: returnFlight.arrivalAirport.city || '',
            }
          : undefined
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
        margin: `${margin}%`,
      })

      // Resolve requestId (UUID) for persistence; server persists confirmation when provided
      // Priority: requestId > conversationId > id (all must be valid UUIDs)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

      // Try to find a valid UUID from session identifiers
      let requestIdForSave: string | null = null;

      if (activeChat.requestId && uuidRegex.test(activeChat.requestId)) {
        requestIdForSave = activeChat.requestId;
      } else if (activeChat.conversationId && uuidRegex.test(activeChat.conversationId)) {
        requestIdForSave = activeChat.conversationId;
      } else if (activeChat.id && uuidRegex.test(activeChat.id)) {
        requestIdForSave = activeChat.id;
      }

      // Enhanced debug logging to diagnose persistence issues
      console.log('[ChatInterface] 🔍 Proposal persistence debug:', {
        requestIdForSave,
        'activeChat.requestId': activeChat.requestId,
        'activeChat.conversationId': activeChat.conversationId,
        'activeChat.id': activeChat.id,
        'activeChat.tripId': activeChat.tripId,
        'isValidUUID(requestId)': activeChat.requestId ? uuidRegex.test(activeChat.requestId) : null,
        'isValidUUID(conversationId)': activeChat.conversationId ? uuidRegex.test(activeChat.conversationId) : null,
        'isValidUUID(id)': activeChat.id ? uuidRegex.test(activeChat.id) : null,
        'activeChat keys': Object.keys(activeChat),
      })

      // Warn loudly if we can't find a valid requestId for a session that has a tripId
      if (!requestIdForSave && activeChat.tripId) {
        console.error('[ChatInterface] ⚠️ CRITICAL: Cannot persist proposal - no valid requestId found!', {
          tripId: activeChat.tripId,
          sessionId: activeChat.id,
          'activeChat.requestId': activeChat.requestId,
          'activeChat.conversationId': activeChat.conversationId,
          hint: 'Session may have been created as temp session or requestId not synced from API',
        });
      }

      // --- ONEK-178: Two-step flow (generate draft → show email preview → approve → send) ---

      // Step 1: Generate proposal PDF (without sending email)
      const selectedFlightsForProposal = returnFlight
        ? [selectedFlight, returnFlight]
        : [selectedFlight]

      const generateResponse = await fetch('/api/proposal/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: customerData,
          tripDetails,
          selectedFlights: selectedFlightsForProposal,
          jetvisionFeePercentage: margin,
          saveDraft: true,
        }),
      })

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `Failed to generate proposal: ${generateResponse.statusText}`)
      }

      const generateResult = await generateResponse.json()

      if (!generateResult.success) {
        throw new Error(generateResult.error || 'Failed to generate proposal')
      }

      console.log('[ChatInterface] Proposal generated, showing email preview:', {
        proposalId: generateResult.proposalId,
        dbProposalId: generateResult.dbProposalId,
        proposalNumber: generateResult.proposalNumber,
        pricing: generateResult.pricing,
      })

      // Step 2: Upload PDF to storage for attachment URL
      let pdfUrl = ''
      if (generateResult.pdfBase64) {
        try {
          const uploadResponse = await fetch('/api/proposal/upload-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pdfBase64: generateResult.pdfBase64,
              fileName: generateResult.fileName,
            }),
          })
          const uploadResult = await uploadResponse.json()
          if (uploadResult.success && uploadResult.publicUrl) {
            pdfUrl = uploadResult.publicUrl
          }
        } catch (uploadErr) {
          console.warn('[ChatInterface] PDF upload failed, continuing without URL:', uploadErr)
        }
      }

      // Step 3: Generate email draft content for preview
      const emailDraft = generateEmailDraft({
        customerName: customerData.name,
        departureAirport: departureIcao,
        arrivalAirport: arrivalIcao,
        departureDate: (tripDetails.departureDate as string) || new Date().toISOString().split('T')[0],
        proposalId: generateResult.proposalId,
        pricing: generateResult.pricing
          ? { total: generateResult.pricing.total, currency: generateResult.pricing.currency }
          : undefined,
      })

      // Build email approval data for EmailPreviewCard
      const proposalId = generateResult.dbProposalId || generateResult.proposalId
      const approvalData: EmailApprovalRequestContent = {
        proposalId,
        proposalNumber: generateResult.proposalNumber,
        to: {
          email: customerData.email,
          name: customerData.name,
        },
        subject: emailDraft.subject,
        body: emailDraft.body,
        attachments: generateResult.fileName
          ? [{
              name: generateResult.fileName,
              url: pdfUrl,
              type: 'application/pdf',
            }]
          : [],
        flightDetails: {
          departureAirport: departureIcao,
          arrivalAirport: arrivalIcao,
          departureDate: (tripDetails.departureDate as string) || '',
          passengers: (tripDetails.passengers as number) || 1,
          tripType: isRoundTrip ? 'round_trip' as const : 'one_way' as const,
          returnDate: isRoundTrip && returnFlight?.departureDate ? returnFlight.departureDate : undefined,
          returnAirport: isRoundTrip && returnFlight?.arrivalAirport?.icao
            ? returnFlight.arrivalAirport.icao
            : undefined,
        },
        pricing: generateResult.pricing
          ? {
              subtotal: generateResult.pricing.subtotal,
              total: generateResult.pricing.total,
              currency: generateResult.pricing.currency,
            }
          : undefined,
        generatedAt: generateResult.generatedAt,
        requestId: requestIdForSave || undefined,
      }

      // Step 4a: Add margin selection summary message to chat
      const marginSelectionData = {
        customerName: customer.contact_name,
        customerEmail: customer.email,
        companyName: customer.company_name,
        marginPercentage: margin,
        selectedAt: new Date().toISOString(),
      }
      const marginSelectionMessage = {
        id: `margin-${Date.now()}`,
        type: 'agent' as const,
        content: `Customer: ${customer.contact_name} (${customer.company_name}). Service charge: ${margin}%.`,
        timestamp: new Date(),
        showMarginSelection: true,
        marginSelectionData,
      }

      // Persist margin selection to DB and sync ID for dedup on reload
      if (requestIdForSave) {
        fetch('/api/chat-sessions/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestId: requestIdForSave,
            content: marginSelectionMessage.content,
            contentType: 'text',
            richContent: { marginSelection: marginSelectionData },
          }),
        })
          .then(res => res.json())
          .then(data => {
            if (data?.messageId) {
              marginSelectionMessage.id = data.messageId
            }
          })
          .catch((err) => console.warn('[ChatInterface] Failed to persist margin selection:', err))
      }

      // Step 4b: Add email preview message to chat
      const emailPreviewMessageId = `email-preview-${Date.now()}`
      const emailPreviewMessage = {
        id: emailPreviewMessageId,
        type: 'agent' as const,
        content: `I've prepared a proposal for ${customerData.name}. Please review the email below and click "Send Email" when ready.`,
        timestamp: new Date(),
        showEmailApprovalRequest: true,
        emailApprovalData: approvalData,
      }

      // Persist email preview to DB and sync ID for dedup on reload
      if (requestIdForSave) {
        fetch('/api/chat-sessions/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestId: requestIdForSave,
            content: emailPreviewMessage.content,
            contentType: 'email_approval_request',
            richContent: { emailApproval: approvalData },
          }),
        })
          .then(res => res.json())
          .then(data => {
            if (data?.messageId) {
              emailPreviewMessage.id = data.messageId
            }
          })
          .catch((err) => console.warn('[ChatInterface] Failed to persist email preview:', err))
      }

      // Set approval state
      setEmailApprovalMessageId(emailPreviewMessageId)
      setEmailApprovalData(approvalData)
      setEmailApprovalStatus('draft')
      setEmailApprovalError(undefined)

      // Replace existing margin/email messages for this trip (prevent stacking)
      const existingMessages = activeChat.messages || []
      const filteredMessages = existingMessages.filter(m => {
        if (m.showMarginSelection) return false
        if (m.showEmailApprovalRequest) return false
        return true
      })
      const updatedMessages = [...filteredMessages, marginSelectionMessage, emailPreviewMessage]
      onUpdateChat(activeChat.id, {
        messages: updatedMessages,
        customer: {
          name: customerData.name,
          email: customerData.email,
          company: customerData.company,
          phone: customerData.phone,
          isReturning: false,
          preferences: {},
        },
      })
    } catch (error) {
      console.error('[ChatInterface] Error generating proposal:', error)
      alert(`Failed to generate proposal: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsGeneratingProposal(false)
      setPendingProposalFlightId(null)
      setPendingProposalQuoteId(undefined)
    }
  }

  // ===========================================================================
  // EMAIL APPROVAL HANDLERS (ONEK-178)
  // ===========================================================================

  /**
   * Handle email field edit from EmailPreviewCard
   */
  const handleEmailEdit = useCallback((field: 'subject' | 'body', value: string) => {
    setEmailApprovalData(prev => prev ? { ...prev, [field]: value } : null)
  }, [])

  /**
   * Handle email send approval from EmailPreviewCard.
   * Calls /api/proposal/approve-email with the final (possibly edited) content.
   */
  const handleEmailSend = useCallback(async () => {
    if (!emailApprovalData) return

    setEmailApprovalStatus('sending')
    setEmailApprovalError(undefined)

    try {
      const response = await fetch('/api/proposal/approve-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId: emailApprovalData.proposalId,
          subject: emailApprovalData.subject,
          body: emailApprovalData.body,
          to: emailApprovalData.to,
          requestId: emailApprovalData.requestId,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to send email')
      }

      setEmailApprovalStatus('sent')

      // Open the PDF if available
      const pdfAttachment = emailApprovalData.attachments?.find(a => a.type?.includes('pdf'))
      if (pdfAttachment?.url) {
        window.open(pdfAttachment.url, '_blank')
      }

      // Add proposal-sent confirmation message to chat
      if (activeChat) {
        const dep = emailApprovalData.flightDetails?.departureAirport || ''
        const arr = emailApprovalData.flightDetails?.arrivalAirport || ''

        const proposalSentData = {
          flightDetails: {
            departureAirport: dep,
            arrivalAirport: arr,
            departureDate: emailApprovalData.flightDetails?.departureDate || '',
            tripType: emailApprovalData.flightDetails?.tripType,
            returnDate: emailApprovalData.flightDetails?.returnDate,
            returnAirport: emailApprovalData.flightDetails?.returnAirport,
          },
          client: { name: emailApprovalData.to.name, email: emailApprovalData.to.email },
          pdfUrl: pdfAttachment?.url || '',
          fileName: pdfAttachment?.name || '',
          proposalId: emailApprovalData.proposalId,
          pricing: emailApprovalData.pricing
            ? { total: emailApprovalData.pricing.total, currency: emailApprovalData.pricing.currency }
            : undefined,
        }

        const isRT = emailApprovalData.flightDetails?.tripType === 'round_trip'
        const routeSym = isRT ? '⇄' : '→'
        const tripLabel = isRT ? 'round-trip proposal' : 'proposal'
        const confirmationContent = `The ${tripLabel} for ${dep} ${routeSym} ${arr} was sent to ${emailApprovalData.to.name} at ${emailApprovalData.to.email}.`

        const confirmationMessage = {
          id: result.savedMessageId || `agent-proposal-sent-${Date.now()}`,
          type: 'agent' as const,
          content: confirmationContent,
          timestamp: new Date(),
          showProposalSentConfirmation: true,
          proposalSentData,
        }

        // Replace email preview and margin selection with confirmation (not append)
        const existingMessages = activeChat.messages || []
        let replaced = false
        const updatedMessages = existingMessages.reduce<typeof existingMessages>((acc, m) => {
          if (m.showEmailApprovalRequest) {
            if (!replaced) {
              acc.push(confirmationMessage)
              replaced = true
            }
            return acc
          }
          if (m.showMarginSelection) return acc
          acc.push(m)
          return acc
        }, [])
        if (!replaced) {
          updatedMessages.push(confirmationMessage)
        }
        onUpdateChat(activeChat.id, {
          messages: updatedMessages,
          status: 'proposal_sent' as const,
        })

        // Clear email approval state so the card doesn't linger
        setEmailApprovalMessageId(null)
        setEmailApprovalData(null)
      }
    } catch (error) {
      console.error('[ChatInterface] Email approval send failed:', error)
      setEmailApprovalStatus('error')
      setEmailApprovalError(error instanceof Error ? error.message : 'Failed to send email')
    }
  }, [emailApprovalData, activeChat, onUpdateChat])

  /**
   * Handle email approval cancel from EmailPreviewCard
   */
  const handleEmailCancel = useCallback(() => {
    // Remove the email approval message from chat
    if (emailApprovalMessageId && activeChat) {
      const updatedMessages = (activeChat.messages || []).filter(
        m => m.id !== emailApprovalMessageId
      )
      onUpdateChat(activeChat.id, { messages: updatedMessages })
    }
    // Reset email approval state
    setEmailApprovalMessageId(null)
    setEmailApprovalData(null)
    setEmailApprovalStatus('draft')
    setEmailApprovalError(undefined)
  }, [emailApprovalMessageId, activeChat, onUpdateChat])

  /**
   * Handle review and book action for a single flight
   */
  const handleReviewAndBook = (flightId: string) => {
    console.log('[ChatInterface] Review and book:', flightId)
    // Open drawer with the selected flight
    setSelectedQuoteId(flightId)
    setIsDrawerOpen(true)
  }

  /** Customer for Book Flight modal: from persisted chat or latest proposal-sent message */
  const bookFlightCustomer = useMemo(
    () => getBookFlightCustomer(activeChat),
    [activeChat.customer, activeChat.messages]
  )

  /**
   * Handle book flight action - uses proposal customer if available, otherwise opens customer selection dialog
   */
  const handleBookFlight = useCallback((flightId: string, quoteId?: string) => {
    console.log('[ChatInterface] Book flight:', { flightId, quoteId })

    // Find the flight from rfqFlights
    const flight = rfqFlights.find(f => f.id === flightId)
    if (!flight) {
      console.error('[ChatInterface] Flight not found:', flightId)
      return
    }

    // Check if there's an existing proposal with customer data
    // Look for proposalSentData in messages that contains client info
    const proposalMessage = activeChat.messages?.find(
      (msg) => msg.proposalSentData?.client?.name && msg.proposalSentData?.client?.email
    )

    if (proposalMessage?.proposalSentData?.client) {
      // Use the customer from the existing proposal
      const proposalClient = proposalMessage.proposalSentData.client
      console.log('[ChatInterface] Using customer from proposal:', proposalClient)

      setSelectedBookingCustomer({
        name: proposalClient.name,
        email: proposalClient.email,
        company: undefined,
        phone: undefined,
      })

      // Open book flight modal directly with the proposal customer
      setBookFlightData(flight)
      setIsBookFlightModalOpen(true)
      return
    }

    // No existing proposal customer - open customer selection dialog
    setPendingBookFlightId(flightId)
    setPendingBookFlightQuoteId(quoteId)
    setIsBookingCustomerDialogOpen(true)
  }, [rfqFlights, activeChat.messages])

  /**
   * Handle customer selection for booking
   *
   * Called when a customer is selected in the CustomerSelectionDialog for booking.
   * Sets the customer data and opens the book flight modal.
   */
  const handleBookingCustomerSelected = useCallback((customer: ClientProfile) => {
    console.log('[ChatInterface] Customer selected for booking:', customer)

    if (!pendingBookFlightId) {
      console.error('[ChatInterface] No pending flight ID for booking')
      return
    }

    // Find the flight from rfqFlights
    const flight = rfqFlights.find(f => f.id === pendingBookFlightId)
    if (!flight) {
      console.error('[ChatInterface] Flight not found:', pendingBookFlightId)
      return
    }

    // Set the selected customer for booking
    setSelectedBookingCustomer({
      name: customer.contact_name || '',
      email: customer.email || '',
      company: customer.company_name || '',
      phone: customer.phone || '',
    })

    // Close customer dialog and open book flight modal
    setIsBookingCustomerDialogOpen(false)
    setBookFlightData(flight)
    setIsBookFlightModalOpen(true)

    // Clear pending state
    setPendingBookFlightId(null)
    setPendingBookFlightQuoteId(undefined)
  }, [pendingBookFlightId, rfqFlights])

  /**
   * Handle contract sent - called when contract is successfully sent from the modal
   */
  const handleContractSent = useCallback((contractData: Required<import('@/components/contract/contract-sent-confirmation').ContractSentPayload>) => {
    console.log('[ChatInterface] Contract sent:', contractData)

    // Close the modal
    setIsBookFlightModalOpen(false)
    setBookFlightData(null)

    // Add a rich contract-sent confirmation message to the chat thread
    const contractSentMessage = {
      id: `msg-${Date.now()}`,
      type: 'agent' as const,
      content: `Contract ${contractData.contractNumber} has been generated and sent to ${contractData.customerName} at ${contractData.customerEmail}.`,
      timestamp: new Date(),
      showWorkflow: false,
      showContractSentConfirmation: true,
      contractSentData: {
        ...contractData,
        status: 'sent' as const,
      },
    }

    onUpdateChat(activeChat.id, {
      messages: [...(activeChat.messages || []), contractSentMessage],
    })

    // Persist contract-sent message to DB for reload persistence (matches margin-selection pattern)
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const requestIdForSave = (activeChat.requestId && uuidRe.test(activeChat.requestId))
      ? activeChat.requestId
      : (activeChat.conversationId && uuidRe.test(activeChat.conversationId))
        ? activeChat.conversationId
        : (activeChat.id && uuidRe.test(activeChat.id))
          ? activeChat.id
          : null

    if (requestIdForSave) {
      fetch('/api/chat-sessions/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: requestIdForSave,
          content: contractSentMessage.content,
          contentType: 'contract_shared',
          richContent: { contractSent: contractSentMessage.contractSentData },
        }),
      })
        .then(res => res.json())
        .then(data => {
          if (data?.messageId) {
            contractSentMessage.id = data.messageId
          }
        })
        .catch((err) => console.warn('[ChatInterface] Failed to persist contract-sent message:', err))
    }
  }, [activeChat.id, activeChat.requestId, activeChat.conversationId, activeChat.messages, onUpdateChat])

  /**
   * Handle "Mark Payment Received" button click on a contract card
   */
  const handleMarkPayment = useCallback((contractId: string, contractData: { contractNumber: string; totalAmount: number; currency: string; customerName?: string; flightRoute?: string }) => {
    console.log('[ChatInterface] Mark payment:', { contractId, contractData })
    setPaymentContractData({
      contractId,
      contractNumber: contractData.contractNumber,
      totalAmount: contractData.totalAmount,
      currency: contractData.currency,
      customerName: contractData.customerName,
      flightRoute: contractData.flightRoute,
    })
    setIsPaymentModalOpen(true)
  }, [])

  /**
   * Handle payment confirmation - calls API and appends messages to chat
   */
  const handlePaymentConfirm = useCallback(async (paymentData: {
    paymentAmount: number; paymentMethod: string; paymentReference: string
  }) => {
    if (!paymentContractData) return

    // Derive requestId and contract data BEFORE the API call so server can persist
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const requestIdForSave = (activeChat.requestId && uuidRe.test(activeChat.requestId))
      ? activeChat.requestId
      : (activeChat.conversationId && uuidRe.test(activeChat.conversationId))
        ? activeChat.conversationId
        : (activeChat.id && uuidRe.test(activeChat.id))
          ? activeChat.id
          : undefined

    // Find contract message data for deal closed card
    const contractMsg = activeChat.messages?.find(m => m.contractSentData?.contractId === paymentContractData.contractId)
    const contractData = contractMsg?.contractSentData

    // Find proposal sent message for timeline
    const proposalMsg = activeChat.messages?.find(m => m.showProposalSentConfirmation && m.proposalSentData)

    const response = await fetch(`/api/contract/${paymentContractData.contractId}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment_reference: paymentData.paymentReference,
        payment_amount: paymentData.paymentAmount,
        payment_method: paymentData.paymentMethod,
        payment_date: new Date().toISOString(),
        markComplete: true,
        requestId: requestIdForSave,
        customerName: paymentContractData.customerName || contractData?.customerName || '',
        flightRoute: paymentContractData.flightRoute || contractData?.flightRoute || '',
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to record payment' }))
      throw new Error(errorData.error || 'Failed to record payment')
    }

    const paidAt = new Date().toISOString()

    // Create payment confirmation message
    const paymentMessage = {
      id: `msg-payment-${Date.now()}`,
      type: 'agent' as const,
      content: `Payment of ${paymentContractData.currency} ${paymentData.paymentAmount.toLocaleString()} received for contract ${paymentContractData.contractNumber}.`,
      timestamp: new Date(),
      showPaymentConfirmation: true,
      paymentConfirmationData: {
        contractId: paymentContractData.contractId,
        contractNumber: paymentContractData.contractNumber,
        paymentAmount: paymentData.paymentAmount,
        paymentMethod: paymentData.paymentMethod,
        paymentReference: paymentData.paymentReference,
        paidAt,
        currency: paymentContractData.currency,
      },
    }

    // Create deal closed message
    const closedMessage = {
      id: `msg-closed-${Date.now()}`,
      type: 'agent' as const,
      content: `Deal closed! Contract ${paymentContractData.contractNumber} is complete.`,
      timestamp: new Date(),
      showClosedWon: true,
      closedWonData: {
        contractNumber: paymentContractData.contractNumber,
        customerName: paymentContractData.customerName || contractData?.customerName || '',
        flightRoute: paymentContractData.flightRoute || contractData?.flightRoute || '',
        dealValue: paymentData.paymentAmount,
        currency: paymentContractData.currency,
        proposalSentAt: proposalMsg?.timestamp instanceof Date
          ? proposalMsg.timestamp.toISOString()
          : typeof proposalMsg?.timestamp === 'string' ? proposalMsg.timestamp : undefined,
        contractSentAt: contractMsg?.timestamp instanceof Date
          ? contractMsg.timestamp.toISOString()
          : typeof contractMsg?.timestamp === 'string' ? contractMsg.timestamp : undefined,
        paymentReceivedAt: paidAt,
      },
    }

    // Update status to closed_won and append messages
    onUpdateChat(activeChat.id, {
      status: 'closed_won' as const,
      messages: [...(activeChat.messages || []), paymentMessage, closedMessage],
    })

    // Auto-archive the session after payment confirmation
    if (onArchiveChat) {
      onArchiveChat(activeChat.id)
    }

    // Close modal and reset state
    setIsPaymentModalOpen(false)
    setPaymentContractData(null)
  }, [paymentContractData, activeChat.id, activeChat.requestId, activeChat.conversationId, activeChat.messages, onUpdateChat, onArchiveChat])

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

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-background">
        <DynamicChatHeader
          activeChat={activeChat}
          flightRequestName={activeChat.generatedName}
          showTripId={!!activeChat.tripId}
          quoteRequests={getQuoteRequestsForHeader()}
          onViewQuoteDetails={handleViewQuoteDetails}
          onCopyTripId={() => console.log('[Chat] Trip ID copied to clipboard')}
        />
        <ChatLoadingSkeleton />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background">
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
      <div className="flex-1 overflow-y-scroll">
        <div className="max-w-4xl mx-auto p-4">
          <div className="space-y-4">

            {(() => {
              // CRITICAL: Create unified message array for user/agent messages
              // Operator messages are handled via webhook notifications injected as system events (ONEK-173)

              type UnifiedMessage = {
                id: string
                type: 'user' | 'agent'
                content: string
                timestamp: Date
                // Agent message properties
                showWorkflow?: boolean
                showProposal?: boolean
                showQuoteStatus?: boolean
                showCustomerPreferences?: boolean
                showQuotes?: boolean
                showDeepLink?: boolean
                deepLinkData?: { tripId?: string; deepLink?: string }
                showPipeline?: boolean
                pipelineData?: PipelineData
                showMarginSelection?: boolean
                marginSelectionData?: {
                  customerName: string
                  customerEmail: string
                  companyName: string
                  marginPercentage: number
                  selectedAt: string
                }
                showProposalSentConfirmation?: boolean
                proposalSentData?: import('@/components/proposal/proposal-sent-confirmation').ProposalSentConfirmationProps
                showContractSentConfirmation?: boolean
                contractSentData?: import('@/components/contract/contract-sent-confirmation').ContractSentConfirmationProps
                // Payment confirmation
                showPaymentConfirmation?: boolean
                paymentConfirmationData?: {
                  contractId: string; contractNumber: string
                  paymentAmount: number; paymentMethod: string
                  paymentReference: string; paidAt: string; currency: string
                }
                // Deal closed
                showClosedWon?: boolean
                closedWonData?: {
                  contractNumber: string; customerName: string
                  flightRoute: string; dealValue: number; currency: string
                  proposalSentAt?: string; contractSentAt?: string; paymentReceivedAt?: string
                }
                // Empty leg search results
                showEmptyLegs?: boolean
                emptyLegData?: Array<Record<string, unknown>>
                // Email approval workflow properties (human-in-the-loop)
                showEmailApprovalRequest?: boolean
                emailApprovalData?: import('@/lib/types/chat').EmailApprovalRequestContent
                // MCP UI tool results (feature-flagged)
                toolResults?: Array<{ name: string; input: Record<string, unknown>; result: Record<string, unknown> }>
                // System event notification properties (ONEK-173)
                isSystemEvent?: boolean
                systemEventData?: {
                  eventType: 'quote_received' | 'operator_message' | 'quote_declined' | 'proposal_ready' | 'contract_sent'
                  operatorName?: string
                  quoteId?: string
                  batchCount?: number
                  tripId?: string
                  messagePreview?: string
                }
              }

              // Convert agent/user messages to unified format
              const chatMessages: UnifiedMessage[] = (activeChat.messages || []).map((msg, index) => ({
                id: msg.id,
                type: msg.type,
                content: msg.content,
                timestamp: safeParseTimestamp(msg.timestamp),
                showWorkflow: msg.showWorkflow,
                showProposal: msg.showProposal,
                showQuoteStatus: msg.showQuoteStatus,
                showCustomerPreferences: msg.showCustomerPreferences,
                showQuotes: msg.showQuotes,
                showDeepLink: msg.showDeepLink,
                deepLinkData: msg.deepLinkData,
                showPipeline: msg.showPipeline,
                pipelineData: msg.pipelineData,
                showMarginSelection: msg.showMarginSelection,
                marginSelectionData: msg.marginSelectionData,
                showProposalSentConfirmation: msg.showProposalSentConfirmation,
                proposalSentData: msg.proposalSentData,
                showContractSentConfirmation: msg.showContractSentConfirmation,
                contractSentData: msg.contractSentData,
                showEmailApprovalRequest: msg.showEmailApprovalRequest,
                emailApprovalData: msg.emailApprovalData,
                toolResults: msg.toolResults,
                isSystemEvent: msg.isSystemEvent,
                systemEventData: msg.systemEventData,
              }))

              // Sort by timestamp (chronological order)
              const allMessages = [...chatMessages]
                .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

              // CRITICAL: Deduplicate messages before rendering
              // Only filter true duplicates:
              // 1. Messages with exact matching IDs (true duplicates from database)
              // 2. Messages with exact matching content from the same agent (copied messages)
              // Preserve all unique messages regardless of keyword overlap
              const deduplicatedMessages = allMessages.reduce((acc, message, index) => {
                // Always keep user messages
                if (message.type === 'user') {
                  acc.push({ message, index })
                  return acc
                }

                // Deduplicate proposal-sent confirmation messages by proposalId or content
                if (message.showProposalSentConfirmation && message.proposalSentData) {
                  const proposalData = message.proposalSentData as { proposalId?: string }
                  const isDupe = acc.some(({ message: existing }) => {
                    if (!existing.showProposalSentConfirmation || !existing.proposalSentData) return false
                    const existingData = existing.proposalSentData as { proposalId?: string }
                    if (proposalData.proposalId && existingData.proposalId) {
                      return proposalData.proposalId === existingData.proposalId
                    }
                    return existing.content === message.content
                  })
                  if (!isDupe) acc.push({ message, index })
                  return acc
                }

                // Always keep contract-sent confirmation messages (inline UI)
                if (message.showContractSentConfirmation && message.contractSentData) {
                  acc.push({ message, index })
                  return acc
                }

                // Deduplicate margin selection messages by content
                if (message.showMarginSelection && message.marginSelectionData) {
                  const isDupe = acc.some(({ message: existing }) =>
                    existing.showMarginSelection &&
                    existing.content === message.content
                  )
                  if (!isDupe) acc.push({ message, index })
                  return acc
                }

                // For agent messages, check for true duplicates only
                const messageId = message.id
                const messageContent = (message.content || '').trim()

                // Check if we already have a message with the same ID (true duplicate from database)
                const hasDuplicateId = acc.some(({ message: existingMsg }) => {
                  return existingMsg.id === messageId && messageId !== undefined
                })

                if (hasDuplicateId) {
                  console.log('[ChatInterface] 🚫 Skipping duplicate message (same ID):', {
                    messageId: message.id,
                    contentPreview: messageContent.substring(0, 50),
                  })
                  return acc
                }

                // Check if we already have a message with exact same content from the same agent (copied message)
                const hasDuplicateContent = acc.some(({ message: existingMsg }) => {
                  if (existingMsg.type !== 'agent' || message.type !== 'agent') return false
                  const existingContent = (existingMsg.content || '').trim()
                  return existingContent === messageContent && messageContent.length > 0
                })

                if (hasDuplicateContent) {
                  console.log('[ChatInterface] 🚫 Skipping duplicate message (same content):', {
                    messageId: message.id,
                    contentPreview: messageContent.substring(0, 50),
                  })
                  return acc
                }

                // Keep all unique messages
                acc.push({ message, index })
                return acc
              }, [] as Array<{ message: UnifiedMessage, index: number }>)

              // FlightSearchProgress should appear AFTER ALL dialogue messages in chronological order
              // This ensures the conversation flow is: User messages -> Agent responses -> FlightSearchProgress
              // The component will be inserted at the end of the message list, after all conversation messages

              // Determine if we should show FlightSearchProgress (trip is created and we have valid data)
              const shouldInsertProgressAtEnd = shouldShowFlightSearchProgress

              // Determine if Steps 3-4 card should be shown (only when RFQs are submitted/loaded)
              const shouldShowSteps34 = shouldInsertProgressAtEnd &&
                (tripIdSubmitted || activeChat.tripIdSubmitted ||
                 rfqFlights.length > 0 ||
                 !!activeChat.rfqsLastFetchedAt)

              // Compute current step once for both FlightSearchProgress instances
              const computedCurrentStep = (() => {
                const isTripIdSubmitted = tripIdSubmitted || activeChat.tripIdSubmitted || false
                if (rfqFlights.length > 0 && isTripIdSubmitted) return 4
                if (activeChat.tripId && rfqFlights.length === 0) return 3
                if (activeChat.deepLink) return 2
                return activeChat.currentStep || 1
              })()

              // All messages (including proposal confirmations) stay in chronological order.
              // Proposals naturally appear after the trip creation message since they're
              // generated after the trip exists, so they'll be in messagesAfterProgress.
              const regularMessages = deduplicatedMessages

              // Find the trip creation agent message to render between Steps 1-2 and Steps 3-4
              // Detection strategy (in priority order):
              //   1. Primary: message flags (showDeepLink/deepLinkData) — set during SSE or restored from DB metadata
              //   2. Fallback: content phrases — "trip has been created", "avinode marketplace", etc.
              //   3. Fallback: trip ID in content — search for the actual trip ID string
              //   4. Ultimate fallback: find the first agent message that mentions the trip at all
              let tripCreationIndex = -1;

              // Primary: detect by message flags
              for (let i = 0; i < regularMessages.length; i++) {
                const msg = regularMessages[i].message;
                if (msg.type === 'agent' && (msg.showDeepLink || msg.deepLinkData?.tripId || msg.deepLinkData?.deepLink)) {
                  tripCreationIndex = i;
                  break;
                }
              }

              // Fallback 1: detect by content phrases (DB-loaded messages may lack runtime flags)
              if (tripCreationIndex === -1 && (activeChat.tripId || activeChat.deepLink)) {
                for (let i = 0; i < regularMessages.length; i++) {
                  const msg = regularMessages[i].message;
                  if (msg.type === 'agent' && msg.content) {
                    const lower = msg.content.toLowerCase();
                    if (
                      lower.includes('trip has been created') ||
                      lower.includes('avinode marketplace') ||
                      lower.includes('deep link') ||
                      (lower.includes('trip') && lower.includes('created') && lower.includes('successfully'))
                    ) {
                      tripCreationIndex = i;
                      break;
                    }
                  }
                }
              }

              // Fallback 2: search for the actual trip ID in agent message content
              if (tripCreationIndex === -1 && activeChat.tripId) {
                for (let i = 0; i < regularMessages.length; i++) {
                  const msg = regularMessages[i].message;
                  if (msg.type === 'agent' && msg.content && msg.content.includes(activeChat.tripId)) {
                    tripCreationIndex = i;
                    break;
                  }
                }
              }

              // Extract trip creation message to render between Steps 1-2 and Steps 3-4
              const tripCreationMessage = tripCreationIndex >= 0 ? regularMessages[tripCreationIndex] : null;

              // Split messages around the trip creation message
              let messagesBeforeProgress: typeof regularMessages;
              let messagesAfterProgress: typeof regularMessages;

              if (tripCreationIndex >= 0) {
                // Trip creation message found: everything before it goes above Steps 1-2,
                // the message itself renders after Steps 1-2, everything after goes below Steps 3-4
                messagesBeforeProgress = regularMessages.slice(0, tripCreationIndex);
                messagesAfterProgress = regularMessages.slice(tripCreationIndex + 1);
              } else if (activeChat.tripId || activeChat.deepLink) {
                // Trip exists but no creation message found: place steps before the last agent message
                // This handles cases where the trip creation message was combined with another response
                let lastAgentBeforeTripIdx = -1;
                for (let i = regularMessages.length - 1; i >= 0; i--) {
                  if (regularMessages[i].message.type === 'agent') {
                    lastAgentBeforeTripIdx = i;
                    break;
                  }
                }
                if (lastAgentBeforeTripIdx >= 0) {
                  messagesBeforeProgress = regularMessages.slice(0, lastAgentBeforeTripIdx);
                  messagesAfterProgress = regularMessages.slice(lastAgentBeforeTripIdx);
                } else {
                  messagesBeforeProgress = regularMessages;
                  messagesAfterProgress = [];
                }
              } else {
                // No trip created yet: show all messages without step cards
                messagesBeforeProgress = regularMessages;
                messagesAfterProgress = [];
              }

              // Helper function to render a single message
              const renderMessage = ({ message, index }: { message: UnifiedMessage; index: number }, mapIndex: number) => (
                    <React.Fragment key={message.id || `msg-${index}`}>
                    {message.type === 'user' ? (
                      // User message - blue bubble on the right
                      <div className="flex justify-end">
                        <div className="max-w-[85%] bg-primary text-primary-foreground rounded-2xl px-4 py-3 shadow-sm">
                          <p className="text-sm leading-relaxed">{message.content}</p>
                          <span className="block mt-1 text-[10px] text-primary-foreground/60 text-right">
                            {formatMessageTimestamp(message.timestamp)}
                          </span>
                        </div>
                      </div>
                    ) : message.isSystemEvent ? (
                      // ONEK-173: System event notification - compact row with muted styling
                      <div className="flex items-start gap-2 py-2 px-3 rounded-lg bg-muted/50 border border-border/50">
                        <div className="mt-0.5 shrink-0">
                          {message.systemEventData?.eventType === 'operator_message' ? (
                            <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                          ) : (
                            <Bell className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {message.content}
                          </p>
                          <span className="text-[10px] text-muted-foreground/60">
                            {formatMessageTimestamp(message.timestamp)}
                          </span>
                        </div>
                      </div>
                    ) : process.env.NEXT_PUBLIC_ENABLE_MCP_UI === 'true' && message.toolResults?.length ? (
                      // MCP UI Registry path: render AgentMessageV2 with tool results
                      // CRITICAL: Filter out create_trip tool results when the parent is already rendering FlightSearchProgress
                      // This prevents duplicate FlightSearchProgress cards
                      <AgentMessageV2
                        content={stripMarkdown(message.content)}
                        timestamp={message.timestamp}
                        toolResults={shouldShowFlightSearchProgress
                          ? message.toolResults?.filter(tr => tr.name !== 'create_trip')
                          : message.toolResults}
                        actionContext={{
                          sendMessage: (msg: string) => {
                            setInputValue(msg)
                            setTimeout(() => handleSendMessage(), 100)
                          },
                          sessionId: activeChat.id,
                        }}
                        isProcessing={isProcessing}
                      />
                    ) : (
                      // Agent message - existing AgentMessage component
                      // CRITICAL: Prevent AgentMessage from rendering FlightSearchProgress when we're already showing it after the user message
                      // This fixes the duplicate FlightSearchProgress UI issue
                      <AgentMessage
                        content={stripMarkdown(message.content)}
                        timestamp={message.timestamp}
                        // Only show deep link/workflow in AgentMessage if FlightSearchProgress is NOT shown after user message
                        // This prevents duplicate FlightSearchProgress components
                        showDeepLink={shouldShowFlightSearchProgress ? false : (message.showDeepLink || false)}
                        showTripIdInput={shouldShowFlightSearchProgress ? false : (message.showDeepLink || false)}
                        showWorkflow={shouldShowFlightSearchProgress ? false : (message.showWorkflow || false)}
                        workflowProps={shouldShowFlightSearchProgress ? undefined : (message.showWorkflow ? {
                          isProcessing,
                          currentStep: activeChat.currentStep || 1,
                          status: activeChat.status || 'pending',
                          tripId: activeChat.tripId,
                          deepLink: activeChat.deepLink,
                        } : undefined)}
                        // Only pass deepLinkData if we're NOT showing FlightSearchProgress after user message
                        deepLinkData={shouldShowFlightSearchProgress ? undefined : message.deepLinkData}
                        onTripIdSubmit={handleTripIdSubmit}
                        isTripIdLoading={isTripIdLoading}
                        tripIdError={tripIdError}
                        tripIdSubmitted={tripIdSubmitted}
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
                        onBookFlight={handleBookFlight}
                        customerEmail={activeChat.customer?.name ? `${activeChat.customer.name.toLowerCase().replace(/\s+/g, '.')}@example.com` : ''}
                        customerName={activeChat.customer?.name || ''}
                        selectedFlights={[]}
                        onViewChat={handleViewChat}
                        onGenerateProposal={handleGenerateProposal}
                        showPipeline={message.showPipeline}
                        pipelineData={message.pipelineData}
                        showEmptyLegs={message.showEmptyLegs}
                        emptyLegData={message.emptyLegData}
                        showMarginSelection={message.showMarginSelection}
                        marginSelectionData={message.marginSelectionData}
                        showProposalSentConfirmation={message.showProposalSentConfirmation}
                        proposalSentData={message.proposalSentData}
                        showContractSentConfirmation={message.showContractSentConfirmation}
                        contractSentData={message.contractSentData}
                        onMarkPayment={handleMarkPayment}
                        showPaymentConfirmation={message.showPaymentConfirmation}
                        paymentConfirmationData={message.paymentConfirmationData}
                        showClosedWon={message.showClosedWon}
                        closedWonData={message.closedWonData}
                        showEmailApprovalRequest={!emailAlreadySent && message.showEmailApprovalRequest}
                        emailApprovalData={message.emailApprovalData}
                        onEmailEdit={handleEmailEdit}
                        onEmailSend={handleEmailSend}
                        onEmailCancel={handleEmailCancel}
                        emailApprovalStatus={!emailAlreadySent && message.showEmailApprovalRequest ? emailApprovalStatus : undefined}
                        emailApprovalError={!emailAlreadySent && message.showEmailApprovalRequest ? emailApprovalError : undefined}
                        onViewRequest={(requestId) => {
                          console.log('[Pipeline] View request:', requestId)
                        }}
                        onRefreshPipeline={() => {
                          setInputValue("show my pipeline")
                          setTimeout(() => {
                            handleSendMessage()
                          }, 100)
                        }}
                        showOperatorMessages={Object.keys(activeChat.operatorMessages || {}).length > 0}
                        operatorMessages={activeChat.operatorMessages}
                        operatorFlightContext={(() => {
                          // Build flight context map from rfqFlights for operator messages
                          const ctx: Record<string, FlightContext> = {};
                          for (const f of (rfqFlights || [])) {
                            if (f.quoteId) {
                              ctx[f.quoteId] = {
                                quoteId: f.quoteId,
                                operatorName: f.operatorName || 'Unknown Operator',
                                aircraftType: f.aircraftType,
                                departureAirport: f.departureAirport?.icao,
                                arrivalAirport: f.arrivalAirport?.icao,
                              };
                            }
                          }
                          return Object.keys(ctx).length > 0 ? ctx : undefined;
                        })()}
                        onViewOperatorThread={(quoteId) => {
                          setSelectedQuoteId(quoteId);
                        }}
                        onReplyToOperator={(quoteId) => {
                          setSelectedQuoteId(quoteId);
                        }}
                      />
                    )}

                  </React.Fragment>
              );

              // Render: Messages before -> Steps 1-2 -> Trip creation message -> Steps 3-4 -> Messages after -> Proposal confirmations
              return (
                <>
                  {/* Messages BEFORE FlightSearchProgress (clarification dialogue) */}
                  {messagesBeforeProgress.map(renderMessage)}

                  {/* FlightSearchProgress Steps 1-2 */}
                  {shouldInsertProgressAtEnd && (
                    <div ref={workflowRef} className="mt-4 mb-4" style={{ overflow: 'visible' }}>
                      <FlightSearchProgress
                        renderMode="steps-1-2"
                        currentStep={computedCurrentStep}
                        flightRequest={{
                          departureAirport: { icao: resolveAirportIcao(activeChat.route?.split(' → ')[0]) || 'TBD' },
                          arrivalAirport: { icao: resolveAirportIcao(activeChat.route?.split(' → ')[1]) || 'TBD' },
                          departureDate: activeChat.isoDate || new Date().toISOString().split('T')[0],
                          passengers: activeChat.passengers || 1,
                          tripType: activeChat.tripType,
                          returnDate: activeChat.returnDate,
                          requestId: activeChat.requestId,
                          segments: activeChat.segments?.map(s => ({
                            departureAirport: { icao: resolveAirportIcao(s.departure_airport) || 'TBD' },
                            arrivalAirport: { icao: resolveAirportIcao(s.arrival_airport) || 'TBD' },
                            departureDate: s.departure_date,
                            passengers: s.passengers,
                          })),
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
                        onBookFlight={handleBookFlight}
                        bookFlightDisabled={false}
                        // CRITICAL: Only show step cards when trip is actually created (has avinode_trip_id)
                        // This prevents cards from appearing during clarification dialogue before trip creation
                        isTripCreated={!!(activeChat.tripId || activeChat.deepLink)}
                      />
                    </div>
                  )}

                  {/* Agent message with trip ID - rendered after Steps 1-2, before Steps 3-4 */}
                  {tripCreationMessage && renderMessage(tripCreationMessage, -1)}

                  {/* FlightSearchProgress Steps 3-4 - only shown when RFQs are submitted/loaded */}
                  {shouldShowSteps34 && (
                    <div className="mt-4 mb-4" style={{ overflow: 'visible' }}>
                      <FlightSearchProgress
                        renderMode="steps-3-4"
                        currentStep={computedCurrentStep}
                        flightRequest={{
                          departureAirport: { icao: resolveAirportIcao(activeChat.route?.split(' → ')[0]) || 'TBD' },
                          arrivalAirport: { icao: resolveAirportIcao(activeChat.route?.split(' → ')[1]) || 'TBD' },
                          departureDate: activeChat.isoDate || new Date().toISOString().split('T')[0],
                          passengers: activeChat.passengers || 1,
                          tripType: activeChat.tripType,
                          returnDate: activeChat.returnDate,
                          requestId: activeChat.requestId,
                          segments: activeChat.segments?.map(s => ({
                            departureAirport: { icao: resolveAirportIcao(s.departure_airport) || 'TBD' },
                            arrivalAirport: { icao: resolveAirportIcao(s.arrival_airport) || 'TBD' },
                            departureDate: s.departure_date,
                            passengers: s.passengers,
                          })),
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
                        onBookFlight={handleBookFlight}
                        bookFlightDisabled={false}
                        marginPercentage={selectedMarginPercentage}
                        onGoBackFromProposal={() => setSelectedRfqFlightIds([])}
                        isTripCreated={!!(activeChat.tripId || activeChat.deepLink)}
                      />
                    </div>
                  )}

                  {/* Agent RFQ summary - static block rendered from rfqFlights state (not a persisted message) */}
                  {shouldShowSteps34 && rfqFlights.length > 0 && (
                    <div className="flex flex-col items-start space-y-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-[26.46px] h-[26.46px] flex items-center justify-center shrink-0">
                          <img
                            src="/images/jvg-logo.svg"
                            alt="Jetvision"
                            className="w-full h-full"
                            style={{ filter: 'brightness(0)' }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-foreground">Jetvision Agent</span>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">
                        {(() => {
                          const quoted = rfqFlights.filter(f => f.rfqStatus === 'quoted').length
                          const unanswered = rfqFlights.filter(f => f.rfqStatus === 'unanswered' || !f.rfqStatus).length
                          const declined = rfqFlights.filter(f => f.rfqStatus === 'declined').length
                          const parts: string[] = []
                          parts.push(`${rfqFlights.length} flight${rfqFlights.length > 1 ? 's' : ''} available from operators.`)
                          if (quoted > 0) parts.push(`${quoted} quoted`)
                          if (unanswered > 0) parts.push(`${unanswered} awaiting operator response`)
                          if (declined > 0) parts.push(`${declined} declined`)
                          const statusLine = parts.length > 1 ? ' ' + parts.slice(1).join(', ') + '.' : ''
                          return `${parts[0]}${statusLine} Select the flights you'd like to include in your proposal, then click "Create Proposal" to generate and send the PDF to your customer.`
                        })()}
                      </p>
                      {activeChat.rfqsLastFetchedAt && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(activeChat.rfqsLastFetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Messages AFTER FlightSearchProgress (all subsequent conversation) */}
                  {messagesAfterProgress.map(renderMessage)}

                  {/* Operator message threads - grouped by quote */}
                  {Object.keys(activeChat.operatorMessages || {}).length > 0 && (() => {
                    const chatsByQuote = new Map<string, { flightContext: FlightContext; messages: OperatorMessageInline[]; hasNewMessages?: boolean }>();
                    Object.entries(activeChat.operatorMessages || {}).forEach(([quoteId, msgs]) => {
                      const flight = rfqFlights.find(f => f.quoteId === quoteId);
                      const lastRead = activeChat.lastMessagesReadAt?.[quoteId];
                      chatsByQuote.set(quoteId, {
                        flightContext: {
                          quoteId,
                          operatorName: flight?.operatorName || msgs[0]?.sender || 'Operator',
                          aircraftType: flight?.aircraftType,
                          departureAirport: flight?.departureAirport?.icao,
                          arrivalAirport: flight?.arrivalAirport?.icao,
                          price: flight?.totalPrice,
                          currency: flight?.currency,
                        },
                        messages: msgs.map(msg => ({
                          id: msg.id,
                          content: msg.content,
                          timestamp: msg.timestamp,
                          type: msg.type,
                          sender: msg.sender,
                        })),
                        hasNewMessages: msgs.some(msg =>
                          !lastRead || new Date(msg.timestamp) > new Date(lastRead)
                        ),
                      });
                    });
                    return (
                      <OperatorChatsInline
                        chatsByQuote={chatsByQuote}
                        onViewFullThread={(quoteId) => {
                          const flight = rfqFlights.find(f => f.quoteId === quoteId);
                          if (flight) handleViewChat(flight.id, quoteId);
                        }}
                        onReply={(quoteId) => {
                          const flight = rfqFlights.find(f => f.quoteId === quoteId);
                          if (flight) handleViewChat(flight.id, quoteId);
                        }}
                      />
                    );
                  })()}

                  {/* Proposal confirmations are now rendered inline via renderMessage */}
                  {/* in their chronological position within messagesAfterProgress */}
                </>
              )
            })()}

            {/* Streaming Response / Typing Indicator */}
            {isTyping && (
              <div className="flex flex-col items-start space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="w-[26.46px] h-[26.46px] flex items-center justify-center shrink-0">
                    <img
                      src="/images/jvg-logo.svg"
                      alt="Jetvision"
                      className="w-full h-full"
                      style={{ filter: 'brightness(0)' }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-foreground">Jetvision Agent</span>
                </div>
                {streamingContent ? (
                  <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {stripMarkdown(streamingContent)}
                    <span className="inline-block w-2 h-4 bg-foreground animate-pulse ml-0.5" />
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-foreground" />
                    <span className="text-sm text-foreground">
                      {activeChat.status === 'searching_aircraft' ? 'Searching for flights...' :
                       activeChat.status === 'analyzing_options' ? 'Analyzing quotes...' :
                       activeChat.status === 'requesting_quotes' ? 'Requesting quotes from operators...' :
                       activeChat.status === 'understanding_request' ? 'Understanding your request...' :
                       'Processing your request...'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Error Display */}
            {streamError && (
              <div className="bg-error-bg border border-error-border rounded-lg p-3">
                <p className="text-sm text-error">{streamError}</p>
                <button
                  onClick={() => setStreamError(null)}
                  className="text-xs text-error underline mt-1"
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
      <div className="border-t border-border bg-background p-4">
        <div className="max-w-4xl mx-auto">
          {isArchived ? (
            <div className="flex items-center justify-center py-2 px-4 rounded-lg bg-muted text-muted-foreground text-sm">
              This session is archived and read-only.
            </div>
          ) : (
            <div className="flex items-end space-x-3">
              <div className="flex-1 relative">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message about this request..."
                  disabled={isProcessing}
                  className="min-h-[44px] py-3 px-4 pr-12 rounded-xl border-border-strong bg-card focus:border-ring focus:ring-ring resize-none placeholder:text-text-placeholder"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isProcessing}
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 bg-primary hover:bg-primary/90 disabled:bg-muted rounded-lg"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
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

      {/* Customer Selection Dialog for Booking */}
      <CustomerSelectionDialog
        open={isBookingCustomerDialogOpen}
        onClose={() => {
          setIsBookingCustomerDialogOpen(false)
          setPendingBookFlightId(null)
          setPendingBookFlightQuoteId(undefined)
        }}
        onSelect={handleBookingCustomerSelected}
        showMarginSlider={false}
      />

      {/* Book Flight Modal for Contract Generation */}
      {bookFlightData && (
        <BookFlightModal
          open={isBookFlightModalOpen}
          onClose={() => {
            setIsBookFlightModalOpen(false)
            setBookFlightData(null)
            setSelectedBookingCustomer(null)
          }}
          flight={bookFlightData}
          customer={selectedBookingCustomer || bookFlightCustomer}
          tripDetails={{
            departureAirport: routeParts?.[0] ? { icao: routeParts[0], name: routeParts[0] } : { icao: 'KTEB', name: 'Teterboro Airport' },
            arrivalAirport: routeParts?.[1] ? { icao: routeParts[1], name: routeParts[1] } : { icao: 'KVNY', name: 'Van Nuys Airport' },
            departureDate: activeChat.date || new Date().toISOString().split('T')[0],
            passengers: activeChat.passengers || 1,
            tripId: activeChat.tripId,
          }}
          requestId={activeChat.requestId || ''}
          onContractSent={handleContractSent}
        />
      )}

      {/* Payment Confirmation Modal */}
      <PaymentConfirmationModal
        open={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false)
          setPaymentContractData(null)
        }}
        contractId={paymentContractData?.contractId ?? ''}
        contractNumber={paymentContractData?.contractNumber ?? ''}
        totalAmount={paymentContractData?.totalAmount ?? 0}
        currency={paymentContractData?.currency ?? 'USD'}
        onConfirm={handlePaymentConfirm}
      />

      {/* Loading overlay when generating proposal */}
      {isGeneratingProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50">
          <div className="bg-card rounded-lg p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-lg font-medium">Generating proposal...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
