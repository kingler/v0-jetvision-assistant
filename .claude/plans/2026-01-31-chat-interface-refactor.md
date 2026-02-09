# Implementation Plan: ChatInterface Component Refactoring

**Date**: 2026-01-31
**Branch**: refactor/chat-interface-decomposition
**Status**: Planning
**Priority**: High
**Estimated Effort**: 3-5 days

## Overview

Refactor the monolithic `components/chat-interface.tsx` (2,475 lines) into a maintainable, testable architecture following React best practices. The component currently violates single responsibility principle and contains excessive state management, API calls mixed with UI logic, and performance anti-patterns.

## Current State Analysis

### Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Lines of Code | ~2,475 | ~200 (main) + distributed |
| State Variables | 25+ useState | 5-8 + custom hooks |
| useEffect Hooks | 6 | 2-3 (main) + in hooks |
| Inline Functions | 15+ | 0 in render |
| API Calls | 3 embedded | 0 (moved to services) |

### Critical Issues Identified

1. **Component Size**: 2,475 lines - 6x recommended maximum
2. **State Explosion**: 25+ useState calls creating complex interactions
3. **Mixed Concerns**: API calls, state management, and UI rendering in one file
4. **Performance**: Inline functions, missing memoization, expensive render logic
5. **Testability**: Tightly coupled, no separation of concerns
6. **Race Conditions**: Deduplication logic has concurrent execution issues

### Current Responsibilities (to be distributed)

| Responsibility | Lines | Target Location |
|----------------|-------|-----------------|
| Message streaming (SSE) | 470-640 | `useChatStreaming.ts` |
| RFQ management | 220-292, 756-1065 | `useRFQManagement.ts` |
| Trip ID handling | 1106-1321 | `useTripIdSubmission.ts` |
| Proposal generation | 1387-1651 | `useProposalGeneration.ts` |
| Webhook subscription | 325-465 | `useWebhookSubscription.ts` |
| Message rendering | 1869-2274 | `MessageList.tsx` |
| Input handling | 1326-1341, 2331-2398 | `ChatInput.tsx` |
| Quote drawer logic | 1742-1850 | `useQuoteDrawer.ts` |

## Target Architecture

```
components/
├── chat-interface/
│   ├── ChatInterface.tsx              # Main orchestrator (~200 lines)
│   ├── index.ts                       # Barrel export
│   │
│   ├── components/
│   │   ├── MessageList.tsx            # Message rendering (~300 lines)
│   │   ├── ChatInput.tsx              # Input area + quick actions (~100 lines)
│   │   ├── StreamingIndicator.tsx     # Typing/streaming state (~50 lines)
│   │   ├── QuickActions.tsx           # Action buttons (~60 lines)
│   │   ├── UserMessage.tsx            # User message bubble (~30 lines)
│   │   ├── OperatorMessage.tsx        # Operator message bubble (~60 lines)
│   │   └── ErrorDisplay.tsx           # Error state display (~30 lines)
│   │
│   ├── hooks/
│   │   ├── useChatStreaming.ts        # SSE streaming logic (~200 lines)
│   │   ├── useRFQManagement.ts        # RFQ state & operations (~250 lines)
│   │   ├── useTripIdSubmission.ts     # Trip ID handling (~150 lines)
│   │   ├── useProposalGeneration.ts   # Proposal workflow (~200 lines)
│   │   ├── useWebhookSubscription.ts  # Supabase realtime (~80 lines)
│   │   ├── useQuoteDrawer.ts          # Drawer state (~100 lines)
│   │   ├── useMessageDeduplication.ts # Message dedup logic (~80 lines)
│   │   └── useChatState.ts            # Combined reducer state (~150 lines)
│   │
│   ├── utils/
│   │   ├── messageDeduplication.ts    # Dedup algorithms (~60 lines)
│   │   ├── flightProgressValidation.ts # Progress step logic (~40 lines)
│   │   ├── contentHash.ts             # Hash generation (~20 lines)
│   │   └── messageTransformers.ts     # Message format utils (~50 lines)
│   │
│   └── types.ts                       # Local type definitions (~80 lines)
│
lib/
├── services/
│   ├── chat-service.ts                # Chat API calls (~100 lines)
│   ├── rfq-service.ts                 # RFQ API calls (~80 lines)
│   └── proposal-service.ts            # Proposal API calls (~100 lines)
```

## Implementation Phases

### Phase 1: Service Layer Extraction (Day 1)

**Goal**: Remove API calls from component, create testable service layer.

#### 1.1 Create Chat Service

**File**: `lib/services/chat-service.ts`

```typescript
import type { ChatSession } from '@/components/chat-sidebar'
import type { SSEParseResult } from '@/lib/chat'

export interface SendMessageParams {
  message: string
  tripId?: string
  requestId?: string
  conversationId?: string
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
}

export interface SendMessageResult {
  response: Response
  abortController: AbortController
}

export const chatService = {
  /**
   * Send a chat message and return the streaming response
   */
  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    const abortController = new AbortController()

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: params.message,
        tripId: params.tripId,
        requestId: params.requestId,
        context: {
          conversationId: params.conversationId,
          tripId: params.tripId,
        },
        conversationHistory: params.conversationHistory,
      }),
      signal: abortController.signal,
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    return { response, abortController }
  },

  /**
   * Fetch RFQs for a trip ID
   */
  async fetchRFQs(params: {
    tripId: string
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
    requestId?: string
    conversationId?: string
  }): Promise<Response> {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Get RFQs for Trip ID ${params.tripId}`,
        tripId: params.tripId,
        conversationHistory: params.conversationHistory,
        requestId: params.requestId,
        context: {
          conversationId: params.conversationId,
          tripId: params.tripId,
        },
        skipMessagePersistence: true,
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    return response
  },
}
```

#### 1.2 Create Proposal Service

**File**: `lib/services/proposal-service.ts`

```typescript
import type { RFQFlight } from '@/components/avinode/rfq-flight-card'

export interface ProposalCustomer {
  name: string
  email: string
  company?: string
  phone?: string
}

export interface ProposalTripDetails {
  departureAirport: { icao: string; name: string; city: string }
  arrivalAirport: { icao: string; name: string; city: string }
  departureDate: string
  passengers: number
  tripId?: string
}

export interface GenerateProposalParams {
  customer: ProposalCustomer
  tripDetails: ProposalTripDetails
  selectedFlights: RFQFlight[]
  jetvisionFeePercentage: number
  requestId?: string
}

export interface ProposalResult {
  success: boolean
  proposalId?: string
  pdfUrl?: string
  fileName?: string
  emailSent?: boolean
  messageId?: string
  savedMessageId?: string
  pricing?: { total: number; currency: string }
  error?: string
}

export const proposalService = {
  /**
   * Generate and send a proposal
   */
  async generateAndSend(params: GenerateProposalParams): Promise<ProposalResult> {
    const response = await fetch('/api/proposal/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || `Failed to send proposal: ${response.statusText}`)
    }

    return result
  },

  /**
   * Persist proposal confirmation message
   */
  async persistConfirmation(params: {
    requestId: string
    content: string
    proposalSentData: Record<string, unknown>
  }): Promise<string | null> {
    try {
      const response = await fetch('/api/messages/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: params.requestId,
          content: params.content,
          contentType: 'proposal_shared',
          richContent: { proposalSent: params.proposalSentData },
        }),
      })

      const result = await response.json()
      return response.ok && result.success ? result.messageId : null
    } catch {
      return null
    }
  },
}
```

#### 1.3 Create RFQ Service

**File**: `lib/services/rfq-service.ts`

```typescript
import type { RFQFlight } from '@/components/avinode/rfq-flight-card'
import type { Quote } from '@/lib/chat'

export const rfqService = {
  /**
   * Merge new RFQ flights with existing ones
   * Prioritizes new price/status data while preserving existing data
   */
  mergeRFQFlights(
    existing: RFQFlight[],
    incoming: RFQFlight[]
  ): RFQFlight[] {
    const existingIds = new Set(existing.map((f) => f.id))
    const uniqueNew = incoming.filter((f) => !existingIds.has(f.id))

    const updatedExisting = existing.map((existingFlight) => {
      const updated = incoming.find(
        (f) => f.id === existingFlight.id || f.quoteId === existingFlight.quoteId
      )

      if (!updated) return existingFlight

      return {
        ...existingFlight,
        ...updated,
        // Preserve existing values if new values are empty/zero
        totalPrice:
          updated.totalPrice > 0 ? updated.totalPrice : existingFlight.totalPrice,
        rfqStatus: updated.rfqStatus || existingFlight.rfqStatus,
        currency: updated.currency || existingFlight.currency || 'USD',
        lastUpdated: updated.lastUpdated || new Date().toISOString(),
      }
    })

    return [...updatedExisting, ...uniqueNew]
  },

  /**
   * Calculate RFQ statistics
   */
  getStats(flights: RFQFlight[]): {
    total: number
    quoted: number
    pending: number
  } {
    return {
      total: flights.length,
      quoted: flights.filter((f) => f.rfqStatus === 'quoted').length,
      pending: flights.filter((f) => f.rfqStatus !== 'quoted').length,
    }
  },
}
```

---

### Phase 2: Custom Hooks Extraction (Day 2)

**Goal**: Extract state management into reusable, testable hooks.

#### 2.1 Create Chat State Reducer

**File**: `components/chat-interface/hooks/useChatState.ts`

```typescript
import { useReducer, useCallback } from 'react'

export interface ChatState {
  inputValue: string
  isTyping: boolean
  streamingContent: string
  streamError: string | null
  isDrawerOpen: boolean
  selectedQuoteId: string | null
  isMessageThreadOpen: boolean
  isTripIdLoading: boolean
  tripIdError: string | undefined
  tripIdSubmitted: boolean
  selectedRfqFlightIds: string[]
  isCustomerDialogOpen: boolean
  pendingProposalFlightId: string | null
  pendingProposalQuoteId: string | undefined
  isGeneratingProposal: boolean
  isBookFlightModalOpen: boolean
}

type ChatAction =
  | { type: 'SET_INPUT'; value: string }
  | { type: 'SET_TYPING'; isTyping: boolean }
  | { type: 'SET_STREAMING_CONTENT'; content: string }
  | { type: 'SET_STREAM_ERROR'; error: string | null }
  | { type: 'OPEN_DRAWER'; quoteId: string }
  | { type: 'CLOSE_DRAWER' }
  | { type: 'OPEN_MESSAGE_THREAD'; flightId: string; quoteId?: string }
  | { type: 'CLOSE_MESSAGE_THREAD' }
  | { type: 'SET_TRIP_ID_LOADING'; loading: boolean }
  | { type: 'SET_TRIP_ID_ERROR'; error: string | undefined }
  | { type: 'SET_TRIP_ID_SUBMITTED'; submitted: boolean }
  | { type: 'SET_SELECTED_RFQ_FLIGHTS'; ids: string[] }
  | { type: 'OPEN_CUSTOMER_DIALOG'; flightId: string; quoteId?: string }
  | { type: 'CLOSE_CUSTOMER_DIALOG' }
  | { type: 'SET_GENERATING_PROPOSAL'; generating: boolean }
  | { type: 'OPEN_BOOK_MODAL' }
  | { type: 'CLOSE_BOOK_MODAL' }
  | { type: 'RESET_STREAMING' }

const initialState: ChatState = {
  inputValue: '',
  isTyping: false,
  streamingContent: '',
  streamError: null,
  isDrawerOpen: false,
  selectedQuoteId: null,
  isMessageThreadOpen: false,
  isTripIdLoading: false,
  tripIdError: undefined,
  tripIdSubmitted: false,
  selectedRfqFlightIds: [],
  isCustomerDialogOpen: false,
  pendingProposalFlightId: null,
  pendingProposalQuoteId: undefined,
  isGeneratingProposal: false,
  isBookFlightModalOpen: false,
}

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_INPUT':
      return { ...state, inputValue: action.value }
    case 'SET_TYPING':
      return { ...state, isTyping: action.isTyping }
    case 'SET_STREAMING_CONTENT':
      return { ...state, streamingContent: action.content }
    case 'SET_STREAM_ERROR':
      return { ...state, streamError: action.error }
    case 'OPEN_DRAWER':
      return { ...state, isDrawerOpen: true, selectedQuoteId: action.quoteId }
    case 'CLOSE_DRAWER':
      return { ...state, isDrawerOpen: false, selectedQuoteId: null }
    case 'SET_TRIP_ID_LOADING':
      return { ...state, isTripIdLoading: action.loading }
    case 'SET_TRIP_ID_ERROR':
      return { ...state, tripIdError: action.error }
    case 'SET_TRIP_ID_SUBMITTED':
      return { ...state, tripIdSubmitted: action.submitted }
    case 'SET_SELECTED_RFQ_FLIGHTS':
      return { ...state, selectedRfqFlightIds: action.ids }
    case 'OPEN_CUSTOMER_DIALOG':
      return {
        ...state,
        isCustomerDialogOpen: true,
        pendingProposalFlightId: action.flightId,
        pendingProposalQuoteId: action.quoteId,
      }
    case 'CLOSE_CUSTOMER_DIALOG':
      return {
        ...state,
        isCustomerDialogOpen: false,
        pendingProposalFlightId: null,
        pendingProposalQuoteId: undefined,
      }
    case 'SET_GENERATING_PROPOSAL':
      return { ...state, isGeneratingProposal: action.generating }
    case 'RESET_STREAMING':
      return { ...state, streamingContent: '', isTyping: false }
    default:
      return state
  }
}

export function useChatState(initialTripIdSubmitted = false) {
  const [state, dispatch] = useReducer(chatReducer, {
    ...initialState,
    tripIdSubmitted: initialTripIdSubmitted,
  })

  const actions = {
    setInput: useCallback((value: string) =>
      dispatch({ type: 'SET_INPUT', value }), []),
    setTyping: useCallback((isTyping: boolean) =>
      dispatch({ type: 'SET_TYPING', isTyping }), []),
    setStreamingContent: useCallback((content: string) =>
      dispatch({ type: 'SET_STREAMING_CONTENT', content }), []),
    setStreamError: useCallback((error: string | null) =>
      dispatch({ type: 'SET_STREAM_ERROR', error }), []),
    openDrawer: useCallback((quoteId: string) =>
      dispatch({ type: 'OPEN_DRAWER', quoteId }), []),
    closeDrawer: useCallback(() =>
      dispatch({ type: 'CLOSE_DRAWER' }), []),
    setTripIdLoading: useCallback((loading: boolean) =>
      dispatch({ type: 'SET_TRIP_ID_LOADING', loading }), []),
    setTripIdError: useCallback((error: string | undefined) =>
      dispatch({ type: 'SET_TRIP_ID_ERROR', error }), []),
    setTripIdSubmitted: useCallback((submitted: boolean) =>
      dispatch({ type: 'SET_TRIP_ID_SUBMITTED', submitted }), []),
    setSelectedRfqFlights: useCallback((ids: string[]) =>
      dispatch({ type: 'SET_SELECTED_RFQ_FLIGHTS', ids }), []),
    openCustomerDialog: useCallback((flightId: string, quoteId?: string) =>
      dispatch({ type: 'OPEN_CUSTOMER_DIALOG', flightId, quoteId }), []),
    closeCustomerDialog: useCallback(() =>
      dispatch({ type: 'CLOSE_CUSTOMER_DIALOG' }), []),
    setGeneratingProposal: useCallback((generating: boolean) =>
      dispatch({ type: 'SET_GENERATING_PROPOSAL', generating }), []),
    resetStreaming: useCallback(() =>
      dispatch({ type: 'RESET_STREAMING' }), []),
  }

  return { state, actions }
}
```

#### 2.2 Create Streaming Hook

**File**: `components/chat-interface/hooks/useChatStreaming.ts`

```typescript
import { useRef, useCallback } from 'react'
import { parseSSEStream, type SSEParseResult } from '@/lib/chat'
import { chatService } from '@/lib/services/chat-service'
import type { ChatSession } from '@/components/chat-sidebar'

interface UseStreamingOptions {
  onStreamStart: () => void
  onStreamContent: (content: string) => void
  onStreamComplete: (result: SSEParseResult) => void
  onStreamError: (error: string) => void
  onStreamEnd: () => void
}

export function useChatStreaming(options: UseStreamingOptions) {
  const abortControllerRef = useRef<AbortController | null>(null)
  const streamingContentRef = useRef('')

  const sendMessage = useCallback(
    async (
      message: string,
      activeChat: ChatSession,
      currentMessages: ChatSession['messages']
    ) => {
      // Create abort controller
      abortControllerRef.current = new AbortController()
      streamingContentRef.current = ''
      options.onStreamStart()

      try {
        const conversationId = activeChat.conversationId || activeChat.requestId

        const { response } = await chatService.sendMessage({
          message,
          tripId: activeChat.tripId,
          requestId: conversationId,
          conversationId,
          conversationHistory: currentMessages.map((m) => ({
            role: m.type === 'user' ? 'user' : 'assistant',
            content: m.content,
          })),
        })

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('No response stream')
        }

        const result = await parseSSEStream(
          reader,
          {
            onContent: (chunk, accumulated) => {
              streamingContentRef.current = accumulated
              options.onStreamContent(accumulated)
            },
            onError: (error) => {
              options.onStreamError(error.message)
            },
          },
          abortControllerRef.current.signal
        )

        options.onStreamComplete(result)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          console.log('[useChatStreaming] Request cancelled')
          return
        }
        options.onStreamError(
          error instanceof Error ? error.message : 'Unknown error'
        )
      } finally {
        options.onStreamEnd()
        abortControllerRef.current = null
      }
    },
    [options]
  )

  const cancelStream = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  const getStreamingContent = useCallback(() => {
    return streamingContentRef.current
  }, [])

  return {
    sendMessage,
    cancelStream,
    getStreamingContent,
  }
}
```

#### 2.3 Create Webhook Subscription Hook

**File**: `components/chat-interface/hooks/useWebhookSubscription.ts`

```typescript
import { useEffect, useRef } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { ChatSession } from '@/components/chat-sidebar'

interface WebhookEvent {
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

interface UseWebhookSubscriptionOptions {
  tripId?: string
  requestId?: string
  chatId: string
  onQuoteReceived: (quoteId: string) => void
  onMessageReceived: (quoteId: string, message: {
    id: string
    type: 'REQUEST' | 'RESPONSE'
    content: string
    timestamp: string
    sender: string
  }) => void
}

export function useWebhookSubscription(options: UseWebhookSubscriptionOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!options.tripId && !options.requestId) return

    const supabase = createSupabaseClient()
    const filterField = options.tripId ? 'trip_id' : 'request_id'
    const filterValue = options.tripId || options.requestId

    const channel = supabase
      .channel(`webhook_events_${options.chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'avinode_webhook_events',
          filter: `${filterField}=eq.${filterValue}`,
        },
        (payload) => {
          const event = payload.new as WebhookEvent
          const eventType = event.event_type
          const eventPayload = event.payload || {}
          const quoteId = eventPayload.quoteId || eventPayload.quote_id

          if (eventType === 'TripRequestSellerResponse' && quoteId) {
            options.onQuoteReceived(quoteId)
          } else if (
            (eventType === 'TripChatSeller' || eventType === 'TripChatMine') &&
            quoteId
          ) {
            options.onMessageReceived(quoteId, {
              id: eventPayload.messageId || `msg-${Date.now()}`,
              type: eventType === 'TripChatMine' ? 'REQUEST' : 'RESPONSE',
              content: eventPayload.message || eventPayload.content || '',
              timestamp: eventPayload.timestamp || new Date().toISOString(),
              sender: eventType === 'TripChatMine' ? 'You' : eventPayload.senderName || 'Operator',
            })
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [options.tripId, options.requestId, options.chatId])
}
```

#### 2.4 Create Message Deduplication Hook

**File**: `components/chat-interface/hooks/useMessageDeduplication.ts`

```typescript
import { useRef, useCallback, useMemo } from 'react'

interface Message {
  id: string
  type: 'user' | 'agent' | 'operator'
  content: string
  timestamp: Date
  showProposalSentConfirmation?: boolean
  proposalSentData?: unknown
}

/**
 * Create a content hash for deduplication
 */
function createContentHash(content: string): string {
  const normalized = content.trim().toLowerCase().replace(/\s+/g, ' ')
  const firstPart = normalized.substring(0, 100)
  const lastPart = normalized.substring(Math.max(0, normalized.length - 50))
  return `${firstPart}|${lastPart}|${normalized.length}`
}

/**
 * Check if message content indicates RFQ-related content
 */
function isRFQMessage(content: string): boolean {
  const lower = content.toLowerCase()
  return (
    lower.includes('rfq') ||
    lower.includes('quote') ||
    lower.includes('quotes') ||
    lower.includes('trip id') ||
    lower.includes('received quotes') ||
    lower.includes('here are') ||
    lower.includes('flight quotes')
  )
}

export function useMessageDeduplication(chatId: string) {
  const processedHashesRef = useRef<Set<string>>(new Set())
  const currentChatIdRef = useRef<string>(chatId)

  // Reset hashes when chat changes
  if (currentChatIdRef.current !== chatId) {
    processedHashesRef.current.clear()
    currentChatIdRef.current = chatId
  }

  /**
   * Check if an RFQ message should be blocked (is duplicate)
   * Returns true if message should be blocked
   */
  const shouldBlockRFQMessage = useCallback(
    (
      content: string,
      existingMessages: Message[],
      currentStep: number,
      hasRfqFlights: boolean
    ): boolean => {
      if (!isRFQMessage(content)) {
        return false
      }

      const hash = createContentHash(content)

      // Check if already processed
      if (processedHashesRef.current.has(hash)) {
        return true
      }

      // Mark as processed immediately (atomic-like)
      processedHashesRef.current.add(hash)

      // Check existing conditions
      const hasExistingRFQMessage = existingMessages.some(
        (msg) => msg.type === 'agent' && isRFQMessage(msg.content)
      )
      const isInStep3Or4 = currentStep >= 3

      return hasExistingRFQMessage || isInStep3Or4 || hasRfqFlights
    },
    []
  )

  /**
   * Deduplicate messages array
   */
  const deduplicateMessages = useCallback(
    <T extends Message>(messages: T[]): T[] => {
      const seen = new Map<string, T>()
      const contentSeen = new Set<string>()

      return messages.filter((message) => {
        // Always keep user and operator messages
        if (message.type === 'user' || message.type === 'operator') {
          if (!seen.has(message.id)) {
            seen.set(message.id, message)
            return true
          }
          return false
        }

        // Always keep proposal confirmations
        if (message.showProposalSentConfirmation && message.proposalSentData) {
          if (!seen.has(message.id)) {
            seen.set(message.id, message)
            return true
          }
          return false
        }

        // Check for duplicate ID
        if (seen.has(message.id)) {
          return false
        }

        // Check for duplicate content
        const contentKey = message.content.trim()
        if (contentSeen.has(contentKey)) {
          return false
        }

        seen.set(message.id, message)
        contentSeen.add(contentKey)
        return true
      })
    },
    []
  )

  return {
    shouldBlockRFQMessage,
    deduplicateMessages,
    clearHashes: useCallback(() => {
      processedHashesRef.current.clear()
    }, []),
  }
}
```

---

### Phase 3: Component Extraction (Day 3)

**Goal**: Extract UI components for better separation of concerns.

#### 3.1 Create MessageList Component

**File**: `components/chat-interface/components/MessageList.tsx`

```typescript
'use client'

import React, { useMemo } from 'react'
import { AgentMessage } from '@/components/chat/agent-message'
import { UserMessage } from './UserMessage'
import { OperatorMessage } from './OperatorMessage'
import { FlightSearchProgress } from '@/components/avinode/flight-search-progress'
import type { ChatSession } from '@/components/chat-sidebar'
import type { RFQFlight } from '@/components/avinode/rfq-flight-card'
import type { UnifiedMessage } from '../types'

interface MessageListProps {
  messages: UnifiedMessage[]
  activeChat: ChatSession
  rfqFlights: RFQFlight[]
  selectedRfqFlightIds: string[]
  shouldShowFlightSearchProgress: boolean
  tripIdSubmitted: boolean
  isTripIdLoading: boolean
  tripIdError?: string
  isProcessing: boolean
  // Handlers
  onTripIdSubmit: (tripId: string) => Promise<void>
  onRfqFlightSelectionChange: (ids: string[]) => void
  onViewChat: (flightId: string, quoteId?: string) => void
  onGenerateProposal: (flightId: string, quoteId?: string) => void
  onReviewAndBook: (flightId: string) => void
  onBookFlight: (flightId: string, quoteId?: string) => void
}

export function MessageList({
  messages,
  activeChat,
  rfqFlights,
  selectedRfqFlightIds,
  shouldShowFlightSearchProgress,
  tripIdSubmitted,
  isTripIdLoading,
  tripIdError,
  isProcessing,
  onTripIdSubmit,
  onRfqFlightSelectionChange,
  onViewChat,
  onGenerateProposal,
  onReviewAndBook,
  onBookFlight,
}: MessageListProps) {
  // Separate regular messages from proposal confirmations
  const { regularMessages, proposalConfirmations } = useMemo(() => {
    return messages.reduce(
      (acc, message) => {
        const isProposalConfirmation =
          message.showProposalSentConfirmation ||
          (message.content?.toLowerCase().includes('proposal') &&
            message.content?.toLowerCase().includes('sent'))

        if (isProposalConfirmation) {
          acc.proposalConfirmations.push(message)
        } else {
          acc.regularMessages.push(message)
        }
        return acc
      },
      {
        regularMessages: [] as UnifiedMessage[],
        proposalConfirmations: [] as UnifiedMessage[],
      }
    )
  }, [messages])

  return (
    <>
      {/* Regular messages */}
      {regularMessages.map((message) => (
        <React.Fragment key={message.id}>
          {message.type === 'user' ? (
            <UserMessage content={message.content} />
          ) : message.type === 'operator' ? (
            <OperatorMessage
              message={message}
              rfqFlights={rfqFlights}
              onViewChat={onViewChat}
            />
          ) : (
            <AgentMessage
              content={message.content}
              timestamp={message.timestamp}
              showDeepLink={!shouldShowFlightSearchProgress && message.showDeepLink}
              // ... other props
            />
          )}
        </React.Fragment>
      ))}

      {/* Flight Search Progress */}
      {shouldShowFlightSearchProgress && (
        <FlightSearchProgress
          currentStep={activeChat.currentStep || 1}
          flightRequest={{
            departureAirport: { icao: activeChat.route?.split(' → ')[0] || 'TBD' },
            arrivalAirport: { icao: activeChat.route?.split(' → ')[1] || 'TBD' },
            departureDate: activeChat.isoDate || new Date().toISOString().split('T')[0],
            passengers: activeChat.passengers || 1,
          }}
          deepLink={activeChat.deepLink}
          tripId={activeChat.tripId}
          isTripIdLoading={isTripIdLoading}
          tripIdError={tripIdError}
          tripIdSubmitted={tripIdSubmitted}
          rfqFlights={rfqFlights}
          selectedRfqFlightIds={selectedRfqFlightIds}
          onTripIdSubmit={onTripIdSubmit}
          onRfqFlightSelectionChange={onRfqFlightSelectionChange}
          onViewChat={onViewChat}
          onGenerateProposal={onGenerateProposal}
          onReviewAndBook={onReviewAndBook}
          onBookFlight={onBookFlight}
        />
      )}

      {/* Proposal confirmations after FlightSearchProgress */}
      {proposalConfirmations.map((message) => (
        <AgentMessage
          key={message.id}
          content={message.content}
          timestamp={message.timestamp}
          showProposalSentConfirmation={true}
          proposalSentData={message.proposalSentData}
        />
      ))}
    </>
  )
}
```

#### 3.2 Create ChatInput Component

**File**: `components/chat-interface/components/ChatInput.tsx`

```typescript
'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Eye } from 'lucide-react'
import { QuickActions } from './QuickActions'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onViewWorkflow: () => void
  isProcessing: boolean
  showViewWorkflow: boolean
}

export function ChatInput({
  value,
  onChange,
  onSend,
  onViewWorkflow,
  isProcessing,
  showViewWorkflow,
}: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <QuickActions
          onSelect={onChange}
          onViewWorkflow={onViewWorkflow}
          isProcessing={isProcessing}
          showViewWorkflow={showViewWorkflow}
        />

        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message about this request..."
              disabled={isProcessing}
              className="min-h-[44px] py-3 px-4 pr-12 rounded-xl"
            />
            <Button
              onClick={onSend}
              disabled={!value.trim() || isProcessing}
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

#### 3.3 Create Utility Functions

**File**: `components/chat-interface/utils/flightProgressValidation.ts`

```typescript
import type { ChatSession } from '@/components/chat-sidebar'

/**
 * Determine if FlightSearchProgress should be shown
 * Only show when trip is successfully created AND we have valid display data
 */
export function shouldShowFlightProgress(chat: ChatSession): boolean {
  return hasTripCreated(chat) && hasValidRoute(chat) && hasValidDate(chat) && hasValidPassengers(chat)
}

function hasTripCreated(chat: ChatSession): boolean {
  return !!(chat.tripId || chat.deepLink || chat.requestId)
}

function hasValidRoute(chat: ChatSession): boolean {
  return (
    !!chat.route &&
    chat.route !== 'Select route' &&
    chat.route !== 'TBD' &&
    chat.route.trim().length > 0 &&
    chat.route.includes('→')
  )
}

function hasValidDate(chat: ChatSession): boolean {
  return (
    !!chat.date &&
    chat.date !== 'Select date' &&
    chat.date !== 'Date TBD' &&
    chat.date !== 'TBD' &&
    chat.date.trim().length > 0
  )
}

function hasValidPassengers(chat: ChatSession): boolean {
  return (chat.passengers ?? 0) > 0
}

/**
 * Calculate the current workflow step based on chat state
 */
export function calculateCurrentStep(chat: ChatSession, rfqFlightsCount: number, tripIdSubmitted: boolean): number {
  // Step 4: If we have RFQ flights and tripId is submitted
  if (rfqFlightsCount > 0 && tripIdSubmitted) {
    return 4
  }

  // Step 3: If we have tripId and RFQs are not loaded yet
  if (chat.tripId && rfqFlightsCount === 0) {
    return 3
  }

  // Step 2: If we have deepLink (request created, ready to select in Avinode)
  if (chat.deepLink) {
    return 2
  }

  // Step 1: Default (request created)
  return chat.currentStep || 1
}
```

---

### Phase 4: Main Component Refactor (Day 4)

**Goal**: Rewrite main ChatInterface using extracted components and hooks.

#### 4.1 Refactored ChatInterface

**File**: `components/chat-interface/ChatInterface.tsx`

```typescript
'use client'

import React, { useRef, useEffect, useMemo, useCallback } from 'react'
import type { ChatSession } from '@/components/chat-sidebar'
import type { RFQFlight } from '@/components/avinode/rfq-flight-card'

// Components
import { DynamicChatHeader } from '@/components/chat/dynamic-chat-header'
import { MessageList } from './components/MessageList'
import { ChatInput } from './components/ChatInput'
import { StreamingIndicator } from './components/StreamingIndicator'
import { ErrorDisplay } from './components/ErrorDisplay'
import { QuoteDetailsDrawer } from '@/components/quote-details-drawer'
import { OperatorMessageThread } from '@/components/avinode/operator-message-thread'
import { CustomerSelectionDialog } from '@/components/customer-selection-dialog'
import { BookFlightModal } from '@/components/avinode/book-flight-modal'

// Hooks
import { useChatState } from './hooks/useChatState'
import { useChatStreaming } from './hooks/useChatStreaming'
import { useWebhookSubscription } from './hooks/useWebhookSubscription'
import { useMessageDeduplication } from './hooks/useMessageDeduplication'
import { useRFQFlights } from './hooks/useRFQFlights'
import { useProposalGeneration } from './hooks/useProposalGeneration'

// Utils
import { shouldShowFlightProgress, calculateCurrentStep } from './utils/flightProgressValidation'
import { unifyMessages } from './utils/messageTransformers'

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
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const workflowRef = useRef<HTMLDivElement>(null)

  // State management (consolidated)
  const { state, actions } = useChatState(activeChat.tripIdSubmitted)

  // Message deduplication
  const { shouldBlockRFQMessage, deduplicateMessages } = useMessageDeduplication(activeChat.id)

  // RFQ management
  const { rfqFlights, loadRFQs } = useRFQFlights(activeChat, onUpdateChat)

  // Streaming
  const { sendMessage, cancelStream, getStreamingContent } = useChatStreaming({
    onStreamStart: () => {
      actions.setTyping(true)
      actions.setStreamingContent('')
      actions.setStreamError(null)
      onProcessingChange(true)
    },
    onStreamContent: actions.setStreamingContent,
    onStreamComplete: (result) => handleStreamComplete(result),
    onStreamError: actions.setStreamError,
    onStreamEnd: () => {
      actions.setTyping(false)
      onProcessingChange(false)
    },
  })

  // Proposal generation
  const { generateProposal, isGenerating } = useProposalGeneration({
    activeChat,
    rfqFlights,
    onUpdateChat,
    onComplete: () => actions.closeCustomerDialog(),
  })

  // Webhook subscription
  useWebhookSubscription({
    tripId: activeChat.tripId,
    requestId: activeChat.requestId,
    chatId: activeChat.id,
    onQuoteReceived: (quoteId) => {
      if (activeChat.tripId) {
        loadRFQs(activeChat.tripId)
      }
    },
    onMessageReceived: (quoteId, message) => {
      const currentMessages = activeChat.operatorMessages?.[quoteId] || []
      onUpdateChat(activeChat.id, {
        operatorMessages: {
          ...activeChat.operatorMessages,
          [quoteId]: [...currentMessages, message],
        },
      })
    },
  })

  // Computed values
  const showFlightProgress = useMemo(
    () => shouldShowFlightProgress(activeChat),
    [activeChat.tripId, activeChat.deepLink, activeChat.route, activeChat.date, activeChat.passengers]
  )

  const unifiedMessages = useMemo(
    () => deduplicateMessages(unifyMessages(activeChat.messages, activeChat.operatorMessages, rfqFlights)),
    [activeChat.messages, activeChat.operatorMessages, rfqFlights, deduplicateMessages]
  )

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeChat.messages])

  // Handlers
  const handleSendMessage = useCallback(() => {
    if (!state.inputValue.trim() || isProcessing) return
    const message = state.inputValue.trim()
    actions.setInput('')
    sendMessage(message, activeChat, activeChat.messages || [])
  }, [state.inputValue, isProcessing, activeChat, sendMessage, actions])

  const handleViewWorkflow = useCallback(() => {
    workflowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const handleGenerateProposal = useCallback((flightId: string, quoteId?: string) => {
    actions.openCustomerDialog(flightId, quoteId)
  }, [actions])

  const handleCustomerSelected = useCallback(async (customer) => {
    if (!state.pendingProposalFlightId) return
    await generateProposal(state.pendingProposalFlightId, customer, state.pendingProposalQuoteId)
  }, [state.pendingProposalFlightId, state.pendingProposalQuoteId, generateProposal])

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <DynamicChatHeader
        activeChat={activeChat}
        flightRequestName={activeChat.generatedName}
        showTripId={!!activeChat.tripId}
      />

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4">
          <div className="space-y-4">
            <MessageList
              messages={unifiedMessages}
              activeChat={activeChat}
              rfqFlights={rfqFlights}
              selectedRfqFlightIds={state.selectedRfqFlightIds}
              shouldShowFlightSearchProgress={showFlightProgress}
              tripIdSubmitted={state.tripIdSubmitted}
              isTripIdLoading={state.isTripIdLoading}
              tripIdError={state.tripIdError}
              isProcessing={isProcessing}
              onTripIdSubmit={loadRFQs}
              onRfqFlightSelectionChange={actions.setSelectedRfqFlights}
              onViewChat={(flightId, quoteId) => {
                actions.openDrawer(quoteId || flightId)
              }}
              onGenerateProposal={handleGenerateProposal}
              onReviewAndBook={(flightId) => actions.openDrawer(flightId)}
              onBookFlight={(flightId) => {
                // Handle book flight
              }}
            />

            {state.isTyping && (
              <StreamingIndicator
                content={state.streamingContent}
                status={activeChat.status}
              />
            )}

            {state.streamError && (
              <ErrorDisplay
                error={state.streamError}
                onDismiss={() => actions.setStreamError(null)}
              />
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input */}
      <ChatInput
        value={state.inputValue}
        onChange={actions.setInput}
        onSend={handleSendMessage}
        onViewWorkflow={handleViewWorkflow}
        isProcessing={isProcessing}
        showViewWorkflow={(activeChat.currentStep ?? 0) >= 1}
      />

      {/* Modals */}
      <CustomerSelectionDialog
        open={state.isCustomerDialogOpen}
        onClose={actions.closeCustomerDialog}
        onSelect={handleCustomerSelected}
      />

      {/* Loading overlay */}
      {isGenerating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
            Generating proposal...
          </div>
        </div>
      )}
    </div>
  )
}
```

---

### Phase 5: Testing & Migration (Day 5)

**Goal**: Write tests and safely migrate to new architecture.

#### 5.1 Unit Tests for Hooks

**File**: `__tests__/unit/components/chat-interface/hooks/useChatState.test.ts`

```typescript
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useChatState } from '@/components/chat-interface/hooks/useChatState'

describe('useChatState', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => useChatState())

    expect(result.current.state.inputValue).toBe('')
    expect(result.current.state.isTyping).toBe(false)
    expect(result.current.state.tripIdSubmitted).toBe(false)
  })

  it('should update input value', () => {
    const { result } = renderHook(() => useChatState())

    act(() => {
      result.current.actions.setInput('Hello')
    })

    expect(result.current.state.inputValue).toBe('Hello')
  })

  it('should handle drawer open/close', () => {
    const { result } = renderHook(() => useChatState())

    act(() => {
      result.current.actions.openDrawer('quote-123')
    })

    expect(result.current.state.isDrawerOpen).toBe(true)
    expect(result.current.state.selectedQuoteId).toBe('quote-123')

    act(() => {
      result.current.actions.closeDrawer()
    })

    expect(result.current.state.isDrawerOpen).toBe(false)
    expect(result.current.state.selectedQuoteId).toBeNull()
  })
})
```

#### 5.2 Integration Tests

**File**: `__tests__/integration/chat-interface/message-flow.test.tsx`

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ChatInterface } from '@/components/chat-interface'

describe('ChatInterface message flow', () => {
  const mockChat = {
    id: 'chat-1',
    messages: [],
    route: 'KTEB → KLAX',
    date: '2026-02-01',
    passengers: 4,
  }

  it('should send a message and show streaming response', async () => {
    const onUpdateChat = vi.fn()

    render(
      <ChatInterface
        activeChat={mockChat}
        isProcessing={false}
        onProcessingChange={vi.fn()}
        onUpdateChat={onUpdateChat}
      />
    )

    const input = screen.getByPlaceholderText(/message/i)
    await userEvent.type(input, 'I need a flight')
    await userEvent.click(screen.getByRole('button', { name: /send/i }))

    await waitFor(() => {
      expect(onUpdateChat).toHaveBeenCalled()
    })
  })
})
```

#### 5.3 Migration Checklist

```markdown
## Migration Checklist

### Pre-Migration
- [ ] Create feature branch: `refactor/chat-interface-decomposition`
- [ ] Backup current `chat-interface.tsx`
- [ ] Ensure all existing tests pass
- [ ] Document current behavior for regression testing

### Phase 1: Services (Day 1)
- [ ] Create `lib/services/chat-service.ts`
- [ ] Create `lib/services/proposal-service.ts`
- [ ] Create `lib/services/rfq-service.ts`
- [ ] Write unit tests for services
- [ ] Integration test: verify API calls work

### Phase 2: Hooks (Day 2)
- [ ] Create `hooks/useChatState.ts`
- [ ] Create `hooks/useChatStreaming.ts`
- [ ] Create `hooks/useWebhookSubscription.ts`
- [ ] Create `hooks/useMessageDeduplication.ts`
- [ ] Write unit tests for each hook

### Phase 3: Components (Day 3)
- [ ] Create `components/MessageList.tsx`
- [ ] Create `components/ChatInput.tsx`
- [ ] Create `components/StreamingIndicator.tsx`
- [ ] Create `components/QuickActions.tsx`
- [ ] Create `utils/flightProgressValidation.ts`
- [ ] Write tests for components

### Phase 4: Integration (Day 4)
- [ ] Rewrite main `ChatInterface.tsx`
- [ ] Update imports in `page.tsx`
- [ ] Verify all features work end-to-end
- [ ] Performance testing

### Phase 5: Cleanup (Day 5)
- [ ] Remove old code
- [ ] Update documentation
- [ ] Final review
- [ ] Create PR
```

---

## Success Criteria

| Criteria | Measurement |
|----------|-------------|
| Component size reduced | Main < 300 lines |
| Test coverage | > 80% for new code |
| No regressions | All existing E2E tests pass |
| Performance | No increase in re-renders |
| Bundle size | No significant increase |

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Feature regression | Comprehensive E2E testing before/after |
| Performance regression | Profile with React DevTools |
| Migration complexity | Incremental changes, feature flags if needed |
| Team coordination | Document all new patterns |

## References

- [React Component Best Practices](https://react.dev/learn/thinking-in-react)
- [Custom Hooks Documentation](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [Project CLAUDE.md](../../CLAUDE.md) - Code style guidelines
