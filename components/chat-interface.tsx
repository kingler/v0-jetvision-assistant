"use client"

import React from "react"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Loader2, Plane, Eye } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ChatSession } from "./chat-sidebar"
import { createSupabaseClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

// New components for conversational chat interface
import { AgentMessage } from "./chat/agent-message"
import { DynamicChatHeader } from "./chat/dynamic-chat-header"
import { QuoteDetailsDrawer, type QuoteDetails, type OperatorMessage } from "./quote-details-drawer"
import { OperatorMessageThread } from "./avinode/operator-message-thread"
import type { QuoteRequest } from "./chat/quote-request-item"
import type { RFQFlight } from "./avinode/rfq-flight-card"
import type { PipelineData } from "@/lib/types/chat-agent"
import { normalizeRfqFlights } from "@/lib/avinode/rfq-transform"

/**
 * Convert markdown-formatted text to plain text
 * Removes bold, italic, headers, bullets, and other markdown syntax
 */
function stripMarkdown(text: string): string {
  return text
    // Remove bold/italic markers
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove bullet points but keep content
    .replace(/^[\s]*[-*+]\s+/gm, '• ')
    // Remove numbered list markers but keep numbers
    .replace(/^[\s]*(\d+)\.\s+/gm, '$1. ')
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

interface ChatInterfaceProps {
  activeChat: ChatSession
  isProcessing: boolean
  onProcessingChange: (processing: boolean) => void
  onViewWorkflow: () => void
  onUpdateChat: (chatId: string, updates: Partial<ChatSession>) => void
}

export function ChatInterface({
  activeChat,
  isProcessing,
  onProcessingChange,
  onViewWorkflow,
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

  // Drawer state for viewing quote details
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null)

  // Message thread popup state
  const [isMessageThreadOpen, setIsMessageThreadOpen] = useState(false)
  const [messageThreadTripId, setMessageThreadTripId] = useState<string | undefined>(undefined)
  const [messageThreadRequestId, setMessageThreadRequestId] = useState<string | undefined>(undefined)
  const [messageThreadQuoteId, setMessageThreadQuoteId] = useState<string | undefined>(undefined)
  const [messageThreadFlightId, setMessageThreadFlightId] = useState<string | undefined>(undefined)
  const [messageThreadOperatorName, setMessageThreadOperatorName] = useState<string | undefined>(undefined)

  // Trip ID input state for human-in-the-loop workflow
  const [isTripIdLoading, setIsTripIdLoading] = useState(false)
  const [tripIdError, setTripIdError] = useState<string | undefined>(undefined)
  // Initialize tripIdSubmitted from activeChat to persist state across re-renders
  const [tripIdSubmitted, setTripIdSubmitted] = useState(activeChat.tripIdSubmitted || false)
  
  // Sync tripIdSubmitted with activeChat when it changes
  useEffect(() => {
    if (activeChat.tripIdSubmitted !== undefined) {
      setTripIdSubmitted(activeChat.tripIdSubmitted)
    }
  }, [activeChat.tripIdSubmitted])

  // RFQ flight selection state for Step 3
  const [selectedRfqFlightIds, setSelectedRfqFlightIds] = useState<string[]>([])

  /**
   * Parses quotes from agent text message content.
   * Extracts structured quote data from messages like:
   * "Here are the quotes for your trip..."
   * "1. Operator Name\n   Aircraft: ...\n   Tail Number: ..."
   * "#### 1. Operator Name\n- **Aircraft**: ...\n- **Max Passengers**: ..."
   *
   * Supports both plain numbered lists and markdown headers with bullet points.
   *
   * @param messageContent - The agent message text content
   * @returns Array of parsed quote objects, or empty array if none found
   */
  const parseQuotesFromText = (messageContent: string): Array<{
    id: string
    operatorName: string
    aircraftType: string
    tailNumber?: string
    passengerCapacity?: number
    price?: number
    currency?: string
    rfqStatus?: string
    operatorEmail?: string
  }> => {
    const quotes: Array<{
      id: string
      operatorName: string
      aircraftType: string
      tailNumber?: string
      passengerCapacity?: number
      price?: number
      currency?: string
      rfqStatus?: string
      operatorEmail?: string
    }> = []

    // Check if message contains quote indicators
    const quoteIndicators = [
      'here are the quotes',
      'quotes for your trip',
      'quotes we\'ve received',
      'available options',
      'flight options',
      'available quotes',
      'quote details',
    ]

    const hasQuotes = quoteIndicators.some(indicator => 
      messageContent.toLowerCase().includes(indicator)
    )

    if (!hasQuotes) {
      return quotes
    }

    // Split message into lines for parsing
    const lines = messageContent.split('\n').map(line => line.trim()).filter(line => line.length > 0)

    let currentQuote: {
      id?: string
      operatorName?: string
      aircraftType?: string
      tailNumber?: string
      passengerCapacity?: number
      price?: number
      currency?: string
      rfqStatus?: string
      operatorEmail?: string
    } | null = null

    /**
     * Helper function to save the current quote before starting a new one
     */
    const saveCurrentQuote = () => {
      if (currentQuote && currentQuote.operatorName) {
        quotes.push({
          id: currentQuote.id || `quote-${quotes.length + 1}`,
          operatorName: currentQuote.operatorName,
          aircraftType: currentQuote.aircraftType || 'Unknown Aircraft',
          tailNumber: currentQuote.tailNumber,
          passengerCapacity: currentQuote.passengerCapacity,
          price: currentQuote.price,
          currency: currentQuote.currency || 'USD',
          rfqStatus: currentQuote.rfqStatus || 'unanswered',
          operatorEmail: currentQuote.operatorEmail,
        })
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Check if line starts a new quote (numbered list item or markdown header)
      // Supports formats like:
      // - "1. Operator Name"
      // - "#### 1. Operator Name"
      // - "### 1. Operator Name"
      // - "## 1. Operator Name"
      const quoteNumberMatch = line.match(/^(?:#{1,4}\s*)?(\d+)\.\s*(.+)$/)
      if (quoteNumberMatch) {
        // Save previous quote if exists
        saveCurrentQuote()

        // Start new quote - extract operator name (remove markdown formatting)
        const operatorName = quoteNumberMatch[2]
          .replace(/^\*\*|\*\*$/g, '') // Remove bold markers
          .trim()

        currentQuote = {
          id: `quote-${quotes.length + 1}`,
          operatorName,
        }
        continue
      }

      // Parse quote details if we have an active quote
      if (currentQuote) {
        // Remove markdown formatting from line for easier parsing
        const cleanLine = line
          .replace(/^[-*]\s*/, '') // Remove bullet point markers
          .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold markers
          .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove markdown links, keep text
          .trim()

        // Aircraft type (supports "Aircraft:", "**Aircraft**:", "- **Aircraft**:")
        const aircraftMatch = cleanLine.match(/aircraft:\s*(.+)/i) ||
                            cleanLine.match(/aircraft\s+type:\s*(.+)/i)
        if (aircraftMatch) {
          currentQuote.aircraftType = aircraftMatch[1].trim()
          continue
        }

        // Category (can be used as aircraft type fallback)
        const categoryMatch = cleanLine.match(/category:\s*(.+)/i)
        if (categoryMatch && !currentQuote.aircraftType) {
          currentQuote.aircraftType = categoryMatch[1].trim()
          continue
        }

        // Tail number (supports "Tail Number:", "Aircraft Tail Number:", "Tail:", etc.)
        const tailMatch = cleanLine.match(/tail\s*(?:number)?:\s*([A-Z0-9]+)/i) ||
                         cleanLine.match(/aircraft\s+tail\s*(?:number)?:\s*([A-Z0-9]+)/i)
        if (tailMatch) {
          currentQuote.tailNumber = tailMatch[1].trim()
          continue
        }

        // Passenger capacity (supports "Max Passengers:", "Passengers:", "Capacity:")
        const passengersMatch = cleanLine.match(/max\s+passengers?:\s*(\d+)/i) || 
                               cleanLine.match(/maximum\s+passengers?:\s*(\d+)/i) ||
                               cleanLine.match(/passengers?:\s*(\d+)/i) ||
                               cleanLine.match(/capacity:\s*(\d+)/i)
        if (passengersMatch) {
          currentQuote.passengerCapacity = parseInt(passengersMatch[1], 10)
          continue
        }

        // Price (supports various formats)
        const priceMatch = cleanLine.match(/(?:price|quote|total|cost):\s*\$?([\d,]+(?:\.[\d]{2})?)/i) ||
                          cleanLine.match(/\$([\d,]+(?:\.[\d]{2})?)/)
        if (priceMatch) {
          currentQuote.price = parseFloat(priceMatch[1].replace(/,/g, ''))
          currentQuote.currency = 'USD'
          continue
        }

        // RFQ Status
        const statusMatch = cleanLine.match(/quote\s+status:\s*(\w+)/i) ||
                           cleanLine.match(/status:\s*(\w+)/i)
        if (statusMatch) {
          currentQuote.rfqStatus = statusMatch[1].toLowerCase()
          continue
        }

        // Operator email (if present)
        const emailMatch = cleanLine.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)
        if (emailMatch) {
          currentQuote.operatorEmail = emailMatch[1]
          continue
        }
      }
    }

    // Save last quote if exists
    saveCurrentQuote()

    return quotes
  }

  /**
   * Helper function to convert a single quote to RFQFlight format
   * Uses normalizeRfqFlights internally
   * 
   * @param quote - The quote object to convert
   * @param routeParts - Array of [departure, arrival] airport codes
   * @param chatDate - Optional date string from chat
   * @returns RFQFlight object or null if conversion fails
   */
  const convertQuoteToRFQFlight = (quote: any, routeParts: string[], chatDate?: string): RFQFlight | null => {
    try {
      const flights = normalizeRfqFlights({
        quotes: [quote],
        route: routeParts.length >= 2 ? {
          departureAirport: { icao: routeParts[0] },
          arrivalAirport: { icao: routeParts[1] },
          departureDate: chatDate,
        } : undefined,
      });
      return flights[0] || null;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[ChatInterface] Error converting quote to RFQFlight:', error, quote);
      }
      return null;
    }
  };

  /**
   * Helper function to convert an RFQ (without quotes) to RFQFlight format
   * Used when RFQs are returned from the API but don't have quotes yet
   * 
   * @param rfq - The RFQ object from Avinode API
   * @param routeParts - Array of [departure, arrival] airport codes
   * @param chatDate - Optional date string from chat
   * @returns RFQFlight object representing the RFQ
   */
  const convertRfqToRFQFlight = (rfq: any, routeParts: string[], chatDate?: string): RFQFlight => {
    // Extract route from RFQ if available, otherwise use routeParts
    let departureIcao = routeParts[0] || 'N/A'
    let arrivalIcao = routeParts[1] || 'N/A'
    
    // Try to extract route from RFQ object
    if (rfq.route) {
      if (typeof rfq.route === 'string') {
        // Route might be "KTEB → KVNY" or "KTEB-KVNY"
        const routeMatch = rfq.route.match(/([A-Z0-9]{3,4})[→\-\s]+([A-Z0-9]{3,4})/i)
        if (routeMatch) {
          departureIcao = routeMatch[1].toUpperCase()
          arrivalIcao = routeMatch[2].toUpperCase()
        }
      } else if (rfq.route.departure && rfq.route.arrival) {
        departureIcao = rfq.route.departure.icao || rfq.route.departure || departureIcao
        arrivalIcao = rfq.route.arrival.icao || rfq.route.arrival || arrivalIcao
      }
    }
    
    // Extract date from RFQ
    const departureDate = rfq.departure_date || 
                          rfq.route?.departure?.date || 
                          rfq.created_at?.split('T')[0] || 
                          chatDate || 
                          activeChat.date || 
                          new Date().toISOString().split('T')[0]
    
    // Determine RFQ status - map Avinode statuses to our statuses
    const rfqStatus = rfq.status === 'sent' ? 'sent' :
                      rfq.status === 'unanswered' ? 'unanswered' :
                      rfq.status === 'quoted' ? 'quoted' :
                      rfq.status === 'declined' ? 'declined' :
                      rfq.status === 'expired' ? 'expired' :
                      'sent' // Default to 'sent' for RFQs without quotes
    
    return {
      id: rfq.rfq_id || rfq.id || `rfq-${Date.now()}`,
      quoteId: rfq.rfq_id || rfq.id || `rfq-${Date.now()}`,
      departureAirport: {
        icao: departureIcao,
        name: departureIcao,
      },
      arrivalAirport: {
        icao: arrivalIcao,
        name: arrivalIcao,
      },
      departureDate,
      departureTime: rfq.departure_time || rfq.route?.departure?.time || undefined,
      flightDuration: 'TBD',
      aircraftType: 'Aircraft TBD', // RFQ doesn't have aircraft until quotes are received
      aircraftModel: 'Aircraft TBD',
      passengerCapacity: rfq.passengers || activeChat.passengers || 0,
      operatorName: 'Awaiting quotes', // No operator until quotes are received
      totalPrice: 0, // No price until quotes are received
      currency: 'USD',
      amenities: { wifi: false, pets: false, smoking: false, galley: false, lavatory: false, medical: false },
      rfqStatus: rfqStatus as 'sent' | 'unanswered' | 'quoted' | 'declined' | 'expired',
      lastUpdated: rfq.updated_at || rfq.created_at || new Date().toISOString(),
      isSelected: false,
      validUntil: rfq.quote_deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      aircraftCategory: 'TBD',
      hasMedical: false,
      hasPackage: false,
    }
  }

  // Parse route to get airport info
  const routeParts = activeChat.route?.split(' → ') || ['N/A', 'N/A']

  // Convert quotes from activeChat.quotes to RFQ flights format for display in Step 3
  // Use useMemo to prevent recalculation on every render and avoid side effects during render
  const rfqFlights: RFQFlight[] = useMemo(() => {
    // PRIMARY: Use rfqFlights from ChatSession if available (preserves all RFQFlight data)
    // This avoids data loss from converting between formats
    // CRITICAL: Always create a new array reference to ensure React detects changes
    // This is important because React uses reference equality for dependency checking
    if (activeChat.rfqFlights && activeChat.rfqFlights.length > 0) {
      // Create a new array with new object references to force React to detect the change
      const filtered = activeChat.rfqFlights
        .filter((f): f is RFQFlight => f != null && f.id != null)
        .map((f) => ({ ...f })) // Create new object reference for each flight
      
      // CRITICAL: Log prices to verify they're being passed correctly
      if (filtered.length > 0) {
        console.log('[ChatInterface] 🔍 rfqFlights useMemo - retrieving from activeChat:', {
          count: filtered.length,
          rfqFlightsArrayRef: activeChat.rfqFlights,
          rfqFlightsLastFetchedAt: activeChat.rfqsLastFetchedAt,
          sample: {
            id: filtered[0].id,
            quoteId: filtered[0].quoteId,
            totalPrice: filtered[0].totalPrice,
            currency: filtered[0].currency,
            rfqStatus: filtered[0].rfqStatus,
            priceIsZero: filtered[0].totalPrice === 0,
            statusIsUnanswered: filtered[0].rfqStatus === 'unanswered',
          },
          allFlights: filtered.map(f => ({ 
            id: f.id, 
            quoteId: f.quoteId,
            price: f.totalPrice, 
            currency: f.currency,
            status: f.rfqStatus,
            priceIsZero: f.totalPrice === 0,
            statusIsUnanswered: f.rfqStatus === 'unanswered',
          })),
        })
        
        // WARNING: If prices are still 0, log a warning
        const flightsWithZeroPrice = filtered.filter(f => f.totalPrice === 0)
        if (flightsWithZeroPrice.length > 0) {
          console.warn('[ChatInterface] ⚠️ WARNING: Found flights with $0 price:', flightsWithZeroPrice.map(f => ({
            id: f.id,
            quoteId: f.quoteId,
            status: f.rfqStatus,
          })))
        }
        
        // WARNING: If status is still "unanswered", log a warning
        const flightsWithUnansweredStatus = filtered.filter(f => f.rfqStatus === 'unanswered')
        if (flightsWithUnansweredStatus.length > 0) {
          console.warn('[ChatInterface] ⚠️ WARNING: Found flights with "unanswered" status:', flightsWithUnansweredStatus.map(f => ({
            id: f.id,
            quoteId: f.quoteId,
            price: f.totalPrice,
          })))
        }
      }
      
      return filtered
    }

    // FALLBACK: Convert quotes from activeChat.quotes (for backward compatibility)
    // Note: activeChat.quotes may contain either plain quote objects or already-converted RFQFlight objects
    const rfqFlightsFromChat: RFQFlight[] = (activeChat.quotes || [])
      .filter((quote) => quote != null)
      .map((quote: any) => {
        try {
          // Check if quote is already a RFQFlight object (has totalPrice and other RFQFlight fields)
          if (quote.totalPrice !== undefined && quote.departureAirport && quote.arrivalAirport) {
            // Already a RFQFlight - return as-is, but ensure all required fields are present
            const flight: RFQFlight = {
              id: quote.id || quote.quoteId || `flight-${Date.now()}`,
              quoteId: quote.quoteId || quote.id || `flight-${Date.now()}`,
              departureAirport: quote.departureAirport,
              arrivalAirport: quote.arrivalAirport,
              departureDate: quote.departureDate || activeChat.date || new Date().toISOString().split('T')[0],
              departureTime: quote.departureTime,
              flightDuration: quote.flightDuration || 'TBD',
              aircraftType: quote.aircraftType || 'Unknown Aircraft',
              aircraftModel: quote.aircraftModel || quote.aircraftType || 'Unknown Aircraft',
              tailNumber: quote.tailNumber,
              passengerCapacity: quote.passengerCapacity || activeChat.passengers || 0,
              operatorName: quote.operatorName || 'Unknown Operator',
              operatorRating: quote.operatorRating,
              operatorEmail: quote.operatorEmail,
              totalPrice: quote.totalPrice || 0,
              currency: quote.currency || 'USD',
              amenities: quote.amenities || { wifi: false, pets: false, smoking: false, galley: false, lavatory: false, medical: false },
              rfqStatus: quote.rfqStatus || 'quoted',
              lastUpdated: quote.lastUpdated || new Date().toISOString(),
              isSelected: quote.isSelected || false,
              validUntil: quote.validUntil,
              aircraftCategory: quote.aircraftCategory,
              hasMedical: quote.hasMedical || false,
              hasPackage: quote.hasPackage || false,
            }
            return flight
          } else {
            // Plain quote object - convert to RFQFlight
            const flight = convertQuoteToRFQFlight(quote, routeParts)
            if (!flight || !flight.id) {
              if (process.env.NODE_ENV === 'development') {
                console.warn('[ChatInterface] Converted flight missing id:', flight, quote)
              }
              return null
            }
            return flight
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('[ChatInterface] Error converting quote to RFQFlight:', error, quote)
          }
          return null
        }
      })
      .filter((flight): flight is RFQFlight => flight != null)

    // Parse quotes from the most recent agent message content if available
    const latestAgentMessage = activeChat.messages
      .filter(m => m.type === 'agent')
      .slice(-1)[0]
    
    let rfqFlightsFromMessages: RFQFlight[] = []
    if (latestAgentMessage && latestAgentMessage.content) {
      const parsedQuotes = parseQuotesFromText(latestAgentMessage.content)
      if (parsedQuotes.length > 0) {
        rfqFlightsFromMessages = parsedQuotes
          .map((quote) => {
            try {
              return convertQuoteToRFQFlight({
                ...quote,
                id: quote.id || `parsed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                aircraftType: quote.aircraftType || 'Unknown Aircraft',
                price: quote.price || 0,
                currency: quote.currency || 'USD',
              }, routeParts, activeChat.date)
            } catch (error) {
              if (process.env.NODE_ENV === 'development') {
                console.error('[ChatInterface] Error converting parsed quote:', error, quote)
              }
              return null
            }
          })
          .filter((flight): flight is RFQFlight => flight != null && flight.id != null)
      }
    }

    // Merge quotes from chat and messages, removing duplicates by ID
    const validRfqFlightsFromChat = rfqFlightsFromChat.filter(f => f != null && f.id != null)
    const validRfqFlightsFromMessages = rfqFlightsFromMessages.filter(f => f != null && f.id != null)
    
    const allRfqFlights = [...validRfqFlightsFromChat]
    const existingIds = new Set<string>(validRfqFlightsFromChat.map(f => f.id).filter((id): id is string => id != null))
    
    for (const flight of validRfqFlightsFromMessages) {
      if (flight && flight.id && !existingIds.has(flight.id)) {
        allRfqFlights.push(flight)
        existingIds.add(flight.id)
      }
    }

    return allRfqFlights.filter((f): f is RFQFlight => f != null && f.id != null)
  }, [
    // CRITICAL: Include rfqsLastFetchedAt to force recalculation when RFQs are updated
    // This ensures the useMemo recalculates even if the array reference appears the same
    activeChat.rfqFlights, 
    activeChat.rfqsLastFetchedAt, // Add this to detect when RFQs are refreshed
    activeChat.quotes, 
    activeChat.messages, 
    activeChat.date, 
    routeParts
  ])

  /**
   * Ref to track the messages container for scroll position detection
   */
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  /**
   * Track previous message count to detect actual new messages
   * Only scroll when there's a genuine new message, not just state updates
   */
  const prevMessageCountRef = useRef(activeChat.messages.length)
  const prevStreamingContentRef = useRef(streamingContent)

  /**
   * Scroll to bottom of messages container
   * Only scrolls when appropriate (new messages, not during RFQ loading)
   * Uses block: 'nearest' to prevent full page scroll jumps
   */
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current && messagesContainerRef.current) {
      // Check if user has manually scrolled up - if so, don't auto-scroll
      const container = messagesContainerRef.current
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
      
      // Only scroll if user is near bottom (within 100px) or if it's the first load
      if (isNearBottom || prevMessageCountRef.current === 0) {
        // Use 'nearest' block to minimize scroll impact and prevent full page jumps
        // This ensures we only scroll the messages container, not the entire page
        messagesEndRef.current.scrollIntoView({ 
          behavior: "smooth",
          block: "nearest",
          inline: "nearest"
        })
      }
    }
  }, [])

  useEffect(() => {
    // Don't scroll if Trip ID is being submitted/loaded (causes layout shifts and unwanted scroll)
    // This prevents scroll jumps when RFQ flights list component loads
    if (isTripIdLoading) {
      return
    }

    // Check if there's actually a new message (not just a state update)
    const hasNewMessage = activeChat.messages.length > prevMessageCountRef.current
    const hasNewStreamingContent = streamingContent !== prevStreamingContentRef.current && streamingContent.length > 0

    // Only scroll if:
    // 1. There's a new message, OR
    // 2. There's new streaming content, OR
    // 3. Typing indicator appears
    if (hasNewMessage || hasNewStreamingContent || isTyping) {
      // Use requestAnimationFrame to ensure DOM has updated before scrolling
      requestAnimationFrame(() => {
        scrollToBottom()
      })
    }

    // Update refs for next comparison
    prevMessageCountRef.current = activeChat.messages.length
    prevStreamingContentRef.current = streamingContent
  }, [activeChat.messages, isTyping, streamingContent, isTripIdLoading, scrollToBottom])

  useEffect(() => {
    latestMessagesRef.current = activeChat.messages
  }, [activeChat.messages])

  const commitChatUpdate = useCallback(
    (
      updates: Partial<ChatSession>,
      message?: {
        content: string
        showWorkflow?: boolean
        showQuoteStatus?: boolean
        showProposal?: boolean
        showCustomerPreferences?: boolean
      },
    ) => {
      let updatedMessages = latestMessagesRef.current

      if (message) {
        const agentMessage = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: "agent" as const,
          content: message.content,
          timestamp: new Date(),
          showWorkflow: message.showWorkflow,
          showQuoteStatus: message.showQuoteStatus,
          showProposal: message.showProposal,
          showCustomerPreferences: message.showCustomerPreferences,
        }

        updatedMessages = [...updatedMessages, agentMessage]
      }

      latestMessagesRef.current = updatedMessages

      onUpdateChat(activeChat.id, {
        ...updates,
        messages: updatedMessages,
      })
    },
    [activeChat.id, onUpdateChat],
  )

  const simulateWorkflowProgress = async (userMessage: string) => {
    const steps: Array<{
      status: string
      message: string
      delay: number
      showQuotes?: boolean
    }> = [
      {
        status: "understanding_request",
        message: "I understand you're looking for a flight. Let me analyze your requirements...",
        delay: 2000,
      },
      {
        status: "searching_aircraft",
        message: "Searching for available aircraft that match your criteria...",
        delay: 3000,
      },
      { status: "requesting_quotes", message: "Requesting quotes from our network of operators...", delay: 4000 },
      {
        status: "analyzing_options",
        message: "Analyzing quotes from our operators...",
        delay: 2500,
        showQuotes: true,
      },
      {
        status: "proposal_ready",
        message: "I've analyzed the available options and prepared a recommendation based on your requirements.",
        delay: 2000,
      },
    ]

    // Add user message first
    const userMsg = {
      id: Date.now().toString(),
      type: "user" as const,
      content: userMessage,
      timestamp: new Date(),
    }

    let currentMessages = [...activeChat.messages, userMsg]

    onUpdateChat(activeChat.id, {
      messages: currentMessages,
      status: "understanding_request",
      currentStep: 1,
    })
    latestMessagesRef.current = currentMessages

    // Progress through each step
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]

      await new Promise((resolve) => setTimeout(resolve, step.delay))

      const agentMsg = {
        id: (Date.now() + i + 1).toString(),
        type: "agent" as const,
        content: step.message,
        timestamp: new Date(),
        showWorkflow: i < steps.length - 1, // Don't show workflow on last message
        showQuoteStatus: step.status === "requesting_quotes",
        showQuotes: step.showQuotes || false,
        showProposal: step.status === "proposal_ready",
      }

      currentMessages = [...currentMessages, agentMsg]

      // Update chat state
      const updateData: Partial<ChatSession> = {
        messages: currentMessages,
        status: step.status as any,
        currentStep: i + 2,
      }

      // Quotes should be populated by the actual agent workflow (FlightSearchAgent → ProposalAnalysisAgent)
      // The showQuotes flag will display quotes if they exist in activeChat.quotes

      onUpdateChat(activeChat.id, updateData)
      latestMessagesRef.current = currentMessages
    }
  }

  /**
   * Send message to the chat API with streaming response
   */
  const sendMessageWithStreaming = async (userMessage: string) => {
    // Build conversation history for context
    const conversationHistory = activeChat.messages.map((msg) => ({
      role: msg.type === "user" ? "user" as const : "assistant" as const,
      content: msg.content,
    }))

    // Create abort controller for this request
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory,
          context: {
            flightRequestId: activeChat.requestId ?? (activeChat.conversationId ? undefined : activeChat.id),
            conversationId: activeChat.conversationId,
            route: activeChat.route,
            passengers: activeChat.passengers,
            date: activeChat.date,
          },
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Request failed" }))
        throw new Error(errorData.message || `Request failed with status ${response.status}`)
      }

      // Handle SSE streaming response
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("No response body")
      }

      const decoder = new TextDecoder()
      let fullContent = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6))

              // ONEK-137: Handle both legacy string errors and new structured format
              if (data.error) {
                // New structured format: { code, message, recoverable }
                if (typeof data.error === 'object' && data.error.message) {
                  const errorInfo = data.error as { code: string; message: string; recoverable: boolean }
                  console.error(`[Chat] Agent error [${errorInfo.code}]:`, errorInfo.message)
                  // If recoverable, we could allow retry - for now just show the message
                  throw new Error(errorInfo.message)
                }
                // Legacy string format
                throw new Error(data.message || data.error || "Stream error")
              }

              if (data.content) {
                fullContent += data.content
                setStreamingContent(fullContent)
              }

              if (data.done) {
                // Log debug info from server to help diagnose prod vs dev differences
                if (data._debug) {
                  console.log('[Chat] Server debug info:', JSON.stringify(data._debug, null, 2))
                  console.log('[Chat] Debug summary:', {
                    toolCalls: data._debug.toolCallNames,
                    hasCreateTrip: data._debug.hasCreateTrip,
                    tripDataSet: data._debug.tripDataSet,
                    createTripTripId: data._debug.createTripResult?.tripId,
                    createTripDeepLink: data._debug.createTripResult?.deepLink,
                  })
                }

                // Stream complete - add final message
                // Determine workflow status based on tool calls and agent metadata
                let newStatus: string = "understanding_request"
                let newStep = 1
                let showDeepLink = false
                let tripIdSubmittedLocal = activeChat.tripIdSubmitted || false
                let deepLinkData: {
                  rfpId?: string
                  tripId?: string
                  deepLink?: string
                  departureAirport?: { icao: string; name?: string; city?: string }
                  arrivalAirport?: { icao: string; name?: string; city?: string }
                  departureDate?: string
                  passengers?: number
                } | undefined = undefined

                // ONEK-137: Extract agent metadata for richer UI state
                const agentMetadata = data.agent
                if (agentMetadata) {
                  console.log('[Chat] Agent metadata received:', {
                    intent: agentMetadata.intent,
                    phase: agentMetadata.conversationState?.phase,
                    nextActions: agentMetadata.nextActions?.length || 0,
                  })

                  // Use conversation phase to set workflow status
                  const phase = agentMetadata.conversationState?.phase
                  if (phase === 'gathering_info') {
                    newStatus = 'understanding_request'
                    newStep = 1
                  } else if (phase === 'confirming') {
                    newStatus = 'searching_aircraft'
                    newStep = 2
                  } else if (phase === 'processing') {
                    newStatus = 'requesting_quotes'
                    newStep = 3
                  } else if (phase === 'complete') {
                    newStatus = 'proposal_ready'
                    newStep = 5
                  }

                  // Use intent for more specific status
                  if (agentMetadata.intent === 'RFP_CREATION') {
                    newStatus = 'searching_aircraft'
                    newStep = 2
                  }
                }

                // Check for tool calls in the response
                if (data.tool_calls && Array.isArray(data.tool_calls)) {
                  for (const toolCall of data.tool_calls) {
                    if (toolCall.name === "search_flights") {
                      newStatus = "searching_aircraft"
                      newStep = 2
                    } else if (toolCall.name === "create_trip") {
                      // PRIMARY workflow - create_trip returns deep link for Avinode marketplace
                      newStatus = "requesting_quotes"
                      newStep = 3
                      showDeepLink = true
                      // Extract trip data for deeplink
                      if (toolCall.result) {
                        deepLinkData = {
                          tripId: toolCall.result.trip_id,
                          deepLink: toolCall.result.deep_link || `https://sandbox.avinode.com/marketplace/mvc/search#preSearch`,
                          departureAirport: toolCall.result.departure_airport,
                          arrivalAirport: toolCall.result.arrival_airport,
                          // Date can be at route.departure.date (primary) or departure_date (legacy)
                          departureDate: toolCall.result.route?.departure?.date || toolCall.result.departure_date,
                          passengers: toolCall.result.passengers,
                        }
                      }
                    } else if (toolCall.name === "create_rfp") {
                      newStatus = "requesting_quotes"
                      newStep = 3
                      showDeepLink = true
                      // Extract RFP data for deeplink
                      if (toolCall.result) {
                        deepLinkData = {
                          rfpId: toolCall.result.rfp_id,
                          tripId: toolCall.result.trip_id,
                          deepLink: toolCall.result.deep_link || `https://sandbox.avinode.com/marketplace/mvc/search#preSearch`,
                          departureAirport: toolCall.result.departure_airport,
                          arrivalAirport: toolCall.result.arrival_airport,
                          // Date can be at route.departure.date (primary) or departure_date (legacy)
                          departureDate: toolCall.result.route?.departure?.date || toolCall.result.departure_date,
                          passengers: toolCall.result.passengers,
                        }
                      }
                    } else if (toolCall.name === "get_quotes" || toolCall.name === "get_quote_status") {
                      newStatus = "analyzing_options"
                      newStep = 4
                    } else if (toolCall.name === "get_rfq") {
                      // Handle get_rfq tool - triggered when user provides Trip ID in chat
                      newStatus = "analyzing_options"
                      newStep = 4
                      showDeepLink = true
                      // Extract trip data for deeplink display
                      if (toolCall.result) {
                        deepLinkData = {
                          tripId: toolCall.result.trip_id || toolCall.result.rfq_id,
                          deepLink: toolCall.result.deep_link,
                          departureAirport: toolCall.result.departure_airport || toolCall.result.route?.departure?.airport,
                          arrivalAirport: toolCall.result.arrival_airport || toolCall.result.route?.arrival?.airport,
                          departureDate: toolCall.result.route?.departure?.date || toolCall.result.departure_date,
                          passengers: toolCall.result.passengers,
                        }
                      }
                    } else if (toolCall.name === "get_trip_messages") {
                      // Handle get_trip_messages tool - retrieve message activities
                      // Messages are processed and stored in operatorMessages in the tool_calls handler below
                      console.log('[Chat] get_trip_messages tool called, messages will be stored in operatorMessages')
                    }
                  }
                }

                // Also check for trip_data directly (PRIMARY workflow)
                if (data.trip_data) {
                  newStatus = "requesting_quotes"
                  newStep = 3
                  showDeepLink = true
                  deepLinkData = {
                    tripId: data.trip_data.trip_id,
                    deepLink: data.trip_data.deep_link || `https://sandbox.avinode.com/marketplace/mvc/search#preSearch`,
                    departureAirport: data.trip_data.departure_airport,
                    arrivalAirport: data.trip_data.arrival_airport,
                    // Date can be at route.departure.date (primary) or departure_date (legacy)
                    departureDate: data.trip_data.route?.departure?.date || data.trip_data.departure_date,
                    passengers: data.trip_data.passengers,
                  }
                }

                // Also check for rfp_data directly
                if (data.rfp_data) {
                  newStatus = "requesting_quotes"
                  newStep = 3
                  showDeepLink = true
                  deepLinkData = {
                    rfpId: data.rfp_data.rfp_id,
                    tripId: data.rfp_data.trip_id,
                    deepLink: data.rfp_data.deep_link || `https://sandbox.avinode.com/marketplace/mvc/search#preSearch`,
                    departureAirport: data.rfp_data.departure_airport,
                    arrivalAirport: data.rfp_data.arrival_airport,
                    // Date can be at route.departure.date (primary) or departure_date (legacy)
                    departureDate: data.rfp_data.route?.departure?.date || data.rfp_data.departure_date,
                    passengers: data.rfp_data.passengers,
                  }
                }

                // Handle pipeline_data for deals/pipeline view
                let showPipeline = false
                let pipelineData: PipelineData | undefined = undefined
                if (data.pipeline_data) {
                  showPipeline = true
                  pipelineData = data.pipeline_data as PipelineData
                }

                // Extract quotes from response if available
                // Check multiple possible locations for quote data (get_rfq tool can return quotes in various formats)
                let quotes: any[] = []
                
                // First, check direct quotes array
                if (data.quotes && Array.isArray(data.quotes)) {
                  quotes = data.quotes
                  console.log('[Chat] Found quotes in data.quotes:', quotes.length)
                } 
                // Check rfq_data.quotes (primary location for get_rfq tool results)
                else if (data.rfq_data?.quotes && Array.isArray(data.rfq_data.quotes)) {
                  quotes = data.rfq_data.quotes
                  console.log('[Chat] Found quotes in data.rfq_data.quotes:', quotes.length)
                } 
                // Check trip_data.quotes (alternative location)
                else if (data.trip_data?.quotes && Array.isArray(data.trip_data.quotes)) {
                  quotes = data.trip_data.quotes
                  console.log('[Chat] Found quotes in data.trip_data.quotes:', quotes.length)
                }

                // Also check tool_calls for quote results (get_rfq tool returns quotes in result.quotes)
                if (quotes.length === 0 && data.tool_calls) {
                  for (const toolCall of data.tool_calls) {
                    // Handle get_rfq (handles both RFQ IDs and Trip IDs)
                    if (toolCall.name === "get_rfq" && toolCall.result) {
                      console.log('[Chat] get_rfq result structure:', {
                        hasQuotes: !!toolCall.result.quotes,
                        hasRfqs: !!toolCall.result.rfqs,
                        totalQuotes: toolCall.result.total_quotes,
                        totalRfqs: toolCall.result.total_rfqs,
                        resultKeys: Object.keys(toolCall.result || {})
                      })

                      // When get_rfq is called, mark Trip ID as submitted
                      // This enables the RFQFlightsList display in the agent response
                      tripIdSubmittedLocal = true
                      console.log('[Chat] get_rfq tool called - marking tripIdSubmitted = true')

                      // Extract Trip ID from result if available
                      if (toolCall.result.trip_id && !deepLinkData) {
                        deepLinkData = {
                          tripId: toolCall.result.trip_id,
                        }
                      }

                      // Trip ID response structure: { trip_id, rfqs: [...], quotes: [...], total_rfqs, total_quotes }
                      // Quotes are already flattened at top level in result.quotes
                      if (toolCall.result.quotes && Array.isArray(toolCall.result.quotes)) {
                        // Use top-level quotes array (already flattened for Trip ID responses)
                        quotes = toolCall.result.quotes
                        console.log('[Chat] Found quotes in get_rfq result.quotes:', quotes.length)
                      } else if (toolCall.result.rfqs && Array.isArray(toolCall.result.rfqs)) {
                        // Fallback: extract quotes from rfqs array if quotes not at top level
                        quotes = toolCall.result.rfqs.flatMap((rfq: any) => rfq.quotes || [])
                        console.log('[Chat] Extracted quotes from RFQs array (fallback):', quotes.length)
                      } else if (toolCall.result.quote_id || toolCall.result.rfq_id) {
                        // Single RFQ response - wrap quotes in array if needed
                        if (Array.isArray(toolCall.result.quotes)) {
                          quotes = toolCall.result.quotes
                        } else if (toolCall.result.quotes) {
                          quotes = [toolCall.result.quotes]
                        }
                        console.log('[Chat] Single RFQ response, quotes:', quotes.length)
                      }
                    }
                    // Handle get_quotes, get_quote_status
                    else if ((toolCall.name === "get_quotes" || toolCall.name === "get_quote_status") && toolCall.result) {
                      // Check for quotes array in tool result
                      if (toolCall.result.quotes && Array.isArray(toolCall.result.quotes)) {
                        quotes = toolCall.result.quotes
                        console.log('[Chat] Found quotes in tool_call result.quotes:', quotes.length)
                        break
                      }
                      // Also check if result itself is an array of quotes
                      if (Array.isArray(toolCall.result) && toolCall.result.length > 0) {
                        quotes = toolCall.result
                        console.log('[Chat] Found quotes as tool_call result array:', quotes.length)
                        break
                      }
                    }
                  }
                }

                // If no structured quotes found, try parsing from message content
                if (quotes.length === 0 && fullContent) {
                  const parsedQuotes = parseQuotesFromText(fullContent)
                  if (parsedQuotes.length > 0) {
                    quotes = parsedQuotes
                    console.log('[Chat] Parsed quotes from message text:', parsedQuotes.length)
                  }
                }

                // Convert quotes to the expected format if we found any
                // Handles both structured API responses and parsed text quotes
                const formattedQuotes = quotes.length > 0 ? quotes.map((q: any, index: number) => {
                  // Extract quote ID (supports multiple formats from different sources)
                  const quoteId = q.quote_id || q.quoteId || q.id || `quote-${Date.now()}-${index}`
                  
                  // Extract operator name (supports nested operator object or flat structure)
                  const operatorName = q.operator_name || q.operatorName || q.operator?.name || "Unknown Operator"
                  
                  // Extract aircraft type (supports nested aircraft object or flat structure)
                  const aircraftType = q.aircraft_type || q.aircraftType || q.aircraft?.type || q.aircraft?.model || "Unknown Aircraft"
                  
                  // Extract price (supports nested pricing object or flat structure)
                  // PRIMARY: sellerPrice.price (from fetched quote details via API)
                  // Fallback: other price fields for backward compatibility
                  const price = q.sellerPrice?.price || q.total_price || q.price || q.totalPrice?.amount || q.pricing?.total || q.pricing?.base_price || q.basePrice || 0
                  
                  // Extract currency (supports nested pricing object or flat structure)
                  // PRIMARY: sellerPrice.currency (from fetched quote details via API)
                  // Fallback: other currency fields for backward compatibility
                  const currency = q.sellerPrice?.currency || q.currency || q.totalPrice?.currency || q.pricing?.currency || 'USD'
                  
                  // Extract operator rating (supports nested operator object or flat structure)
                  const operatorRating = q.operator_rating || q.operatorRating || q.operator?.rating
                  
                  // Extract operator email (supports nested operator object or flat structure)
                  const operatorEmail = q.operator_email || q.operatorEmail || q.operator?.email || q.operator?.contact?.email
                  
                  // Extract amenities/features (supports arrays or nested aircraft object)
                  const amenities = q.amenities || q.features || q.aircraft?.amenities || []
                  
                  return {
                    id: quoteId,
                    operatorName,
                    aircraftType,
                    price,
                    currency,
                    score: q.score,
                    ranking: index + 1,
                    operatorRating,
                    departureTime: q.departure_time || q.departureTime || q.schedule?.departureTime,
                    arrivalTime: q.arrival_time || q.arrivalTime || q.schedule?.arrivalTime,
                    flightDuration: q.flight_duration || q.flightDuration || q.schedule?.duration,
                    isRecommended: index === 0,
                    operatorEmail,
                    amenities,
                    // Include additional fields that might be useful for RFQ flight display
                    tailNumber: q.tail_number || q.tailNumber || q.aircraft?.registration || q.aircraft?.tail_number,
                    passengerCapacity: q.passenger_capacity || q.passengerCapacity || q.aircraft?.capacity || q.capacity,
                    rfqStatus: q.sourcingDisplayStatus === 'Accepted' ? 'quoted' :
                              q.sourcingDisplayStatus === 'Declined' ? 'declined' :
                              q.status || q.rfq_status || q.quote_status || 'quoted',
                  }
                }) : undefined

                // If we have quotes parsed from text and a tripId exists, auto-submit tripId
                // This allows quotes to be displayed in Step 3 even if user hasn't manually submitted tripId
                if (formattedQuotes && formattedQuotes.length > 0 && deepLinkData?.tripId && !tripIdSubmittedLocal) {
                  tripIdSubmittedLocal = true
                  console.log('[Chat] Auto-submitting tripId because quotes were found:', deepLinkData.tripId)
                }

                // If we have quotes and Trip ID is submitted, update status to show quotes
                if (formattedQuotes && formattedQuotes.length > 0 && tripIdSubmittedLocal) {
                  newStatus = "analyzing_options"
                  newStep = 4
                }

                // Replace message content to avoid duplicate RFQ listing (already shown in Step 3)
                let messageContent = fullContent || data.content || ""
                
                // If we have quotes, replace with instructions (flight details are already displayed in Step 3)
                if (formattedQuotes && formattedQuotes.length > 0 && tripIdSubmittedLocal) {
                  const quoteCount = formattedQuotes.length
                  const quoteText = `I've retrieved ${quoteCount} quote${quoteCount !== 1 ? 's' : ''} for your trip. `
                  
                  // Simple message with instructions - no duplicate flight details
                  messageContent = `${quoteText}All flight details are displayed in Step 3 above.

**Next Steps:**

1. **Wait for operators to respond** - If you see flights with status "Unanswered" or "Sent", operators are still reviewing your RFQ. You'll need to wait for them to confirm availability and provide pricing.

2. **When operators provide quotes** - Once an operator confirms availability and provides pricing, the flight status will change to "Quoted" and a **"Review and Book"** button will appear on that flight card.

3. **Book the selected flight** - When your customer selects a flight, click the **"Review and Book"** button on the flight card (located in Step 3) to proceed with booking.`
                }

                const agentMsg = {
                  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                  type: "agent" as const,
                  content: messageContent,
                  timestamp: new Date(),
                  showWorkflow: newStep > 1,
                  showDeepLink,
                  deepLinkData,
                  showPipeline,
                  pipelineData,
                  // Show quotes in Step 3 whenever we have quotes (they'll be displayed in the workflow component)
                  showQuotes: formattedQuotes && formattedQuotes.length > 0,
                  // Show proposal button when quotes are available
                  showProposal: tripIdSubmitted && formattedQuotes && formattedQuotes.length > 0,
                }

                const updatedMessages = [...latestMessagesRef.current, agentMsg]
                latestMessagesRef.current = updatedMessages

                // Update chat with quotes if we found any
                const updateData: Partial<ChatSession> = {
                  messages: updatedMessages,
                  status: newStatus as typeof activeChat.status,
                  currentStep: newStep,
                  rfpId: deepLinkData?.rfpId,
                  tripId: deepLinkData?.tripId || activeChat.tripId,
                  deepLink: deepLinkData?.deepLink,
                }

                // Update route, passengers, and date from deepLinkData if available
                if (deepLinkData) {
                  if (deepLinkData.departureAirport && deepLinkData.arrivalAirport) {
                    const departureCode = typeof deepLinkData.departureAirport === 'string' 
                      ? deepLinkData.departureAirport 
                      : deepLinkData.departureAirport.icao
                    const arrivalCode = typeof deepLinkData.arrivalAirport === 'string'
                      ? deepLinkData.arrivalAirport
                      : deepLinkData.arrivalAirport.icao
                    updateData.route = `${departureCode} → ${arrivalCode}`
                  }
                  if (deepLinkData.passengers) {
                    updateData.passengers = deepLinkData.passengers
                  }
                  if (deepLinkData.departureDate) {
                    // Format date nicely if it's an ISO string
                    const dateStr = deepLinkData.departureDate
                    if (dateStr.includes('T')) {
                      const date = new Date(dateStr)
                      updateData.date = date.toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })
                    } else {
                      updateData.date = dateStr
                    }
                  }
                }
                
                // Fallback: Try to extract flight details from message content if not already set
                // Pattern: "from Teterboro (KTEB) to Van Nuys (KVNY) for 6 passengers on March 8, 2026"
                if (!updateData.route) {
                  const routeMatch = messageContent.match(/from\s+[^(]*\(([A-Z]{3,4})\)\s+to\s+[^(]*\(([A-Z]{3,4})\)/i)
                  if (routeMatch) {
                    updateData.route = `${routeMatch[1].toUpperCase()} → ${routeMatch[2].toUpperCase()}`
                  }
                }
                
                if (!updateData.passengers) {
                  const passengersMatch = messageContent.match(/for\s+(\d+)\s+passengers?/i)
                  if (passengersMatch) {
                    updateData.passengers = parseInt(passengersMatch[1], 10)
                  }
                }
                
                if (!updateData.date) {
                  // Pattern: "on March 8, 2026" or "on 2026-03-08"
                  const dateMatch = messageContent.match(/on\s+([A-Z][a-z]+\s+\d{1,2},\s+\d{4})/i) || 
                                   messageContent.match(/on\s+(\d{4}-\d{2}-\d{2})/i)
                  if (dateMatch) {
                    const dateStr = dateMatch[1]
                    if (dateStr.includes('-')) {
                      const date = new Date(dateStr)
                      updateData.date = date.toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })
                    } else {
                      updateData.date = dateStr
                    }
                  }
                }

                // Only update quotes if we have new ones
                // Note: formattedQuotes is in simplified format for backward compatibility
                if (formattedQuotes && formattedQuotes.length > 0) {
                  updateData.quotes = formattedQuotes
                  
                  // Also convert to full RFQFlight format and save to rfqFlights
                  // This preserves all data needed by RFQFlightCard and RFQFlightsList
                  const rfqFlightsFromQuotes = formattedQuotes
                    .map((quote: any) => {
                      try {
                        return convertQuoteToRFQFlight(quote, routeParts, activeChat.date)
                      } catch (error) {
                        console.error('[Chat] Error converting formatted quote to RFQFlight:', error, quote)
                        return null
                      }
                    })
                    .filter((flight): flight is RFQFlight => flight != null)
                  
                  if (rfqFlightsFromQuotes.length > 0) {
                    updateData.rfqFlights = rfqFlightsFromQuotes
                  }
                }

                // If get_rfq was called (tripIdSubmittedLocal = true), update tripIdSubmitted
                // This enables the RFQFlightsList display even if no quotes are available yet
                if (tripIdSubmittedLocal && !activeChat.tripIdSubmitted) {
                  updateData.tripIdSubmitted = true
                  // Also update local state immediately
                  setTripIdSubmitted(true)
                  console.log('[Chat] Setting tripIdSubmitted = true from get_rfq call')
                }

                onUpdateChat(activeChat.id, updateData)

                setStreamingContent("")
                return
              }
            } catch (parseError) {
              // Skip malformed JSON lines
              console.warn("[Chat] Failed to parse SSE data:", line)
            }
          }
        }
      }

      // If we reach here without done signal, finalize with collected content
      if (fullContent) {
        const agentMsg = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: "agent" as const,
          content: fullContent,
          timestamp: new Date(),
        }

        const updatedMessages = [...latestMessagesRef.current, agentMsg]
        latestMessagesRef.current = updatedMessages

        onUpdateChat(activeChat.id, {
          messages: updatedMessages,
        })

        setStreamingContent("")
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // Request was cancelled - don't show error
        return
      }

      const errorMessage = error instanceof Error ? error.message : "Failed to send message"
      setStreamError(errorMessage)

      // Add error message to chat
      const errorMsg = {
        id: `${Date.now()}-error`,
        type: "agent" as const,
        content: `I apologize, but I encountered an error: ${errorMessage}. Please try again.`,
        timestamp: new Date(),
      }

      const updatedMessages = [...latestMessagesRef.current, errorMsg]
      latestMessagesRef.current = updatedMessages

      onUpdateChat(activeChat.id, {
        messages: updatedMessages,
      })

      setStreamingContent("")
    }
  }

  /**
   * Effect to extract quotes from agent messages and update chat state
   * This watches for new agent messages that contain quote information
   * 
   * This is a fallback mechanism - quotes should primarily come from tool results,
   * but if they're only in the message text (e.g., agent formatted them as markdown),
   * we parse them here.
   */
  useEffect(() => {
    if (!activeChat.messages || activeChat.messages.length === 0) return

    // Get the most recent agent message
    const lastAgentMessage = [...activeChat.messages]
      .reverse()
      .find(msg => msg.type === 'agent')

    if (!lastAgentMessage || !lastAgentMessage.content) return

    // This useEffect is ONLY for parsing quotes from agent message text (fallback mechanism)
    // It should NOT prevent updates when tool results are processed in the streaming handler
    // Tool results are handled in the streaming response handler (handleTripIdSubmit), not here
    // Only skip text parsing if quotes exist - but tool results will still update via streaming handler
    if (activeChat.quotes && activeChat.quotes.length > 0) {
      console.log('[Chat] Quotes already exist, skipping text parsing (tool results will still update via streaming handler)')
      return
    }

    if (!tripIdSubmitted) {
      console.log('[Chat] Trip ID not submitted yet, skipping quote parsing')
      return
    }

    // Try to parse quotes from the message content
    const parsedQuotes = parseQuotesFromText(lastAgentMessage.content)

    if (parsedQuotes.length > 0) {
      console.log('[Chat] Extracted quotes from agent message text:', parsedQuotes.length)

      // Convert to formatted quotes (simplified format for backward compatibility)
      const formattedQuotes = parsedQuotes.map((q, index) => ({
        id: q.id || `quote-${Date.now()}-${index}`,
        operatorName: q.operatorName,
        aircraftType: q.aircraftType,
        price: q.price || 0,
        currency: q.currency || 'USD',
        ranking: index + 1,
        isRecommended: index === 0,
        operatorEmail: q.operatorEmail,
        rfqStatus: (q.rfqStatus || 'quoted') as 'unanswered' | 'quoted' | 'sent' | 'declined' | 'expired',
      }))

      // Convert to full RFQFlight format to preserve all data
      const rfqFlightsFromParsed = formattedQuotes
        .map((quote: any) => {
          try {
            return convertQuoteToRFQFlight(quote, routeParts, activeChat.date)
          } catch (error) {
            console.error('[Chat] Error converting parsed quote to RFQFlight:', error, quote)
            return null
          }
        })
        .filter((flight): flight is RFQFlight => flight != null)

      // Update chat with parsed quotes (both formats for compatibility)
      onUpdateChat(activeChat.id, {
        quotes: formattedQuotes,
        rfqFlights: rfqFlightsFromParsed.length > 0 ? rfqFlightsFromParsed : undefined,
        status: 'analyzing_options' as typeof activeChat.status,
        currentStep: 4,
      })
    }
  }, [activeChat.messages, activeChat.id, tripIdSubmitted, activeChat.quotes, onUpdateChat])

  // Effect to trigger initial API call when chat is created from landing page
  useEffect(() => {
    const triggerInitialApiCall = async () => {
      if (
        activeChat.needsInitialApiCall &&
        activeChat.initialUserMessage &&
        !hasCalledInitialApiRef.current
      ) {
        hasCalledInitialApiRef.current = true

        // Clear the flag so we don't call again
        onUpdateChat(activeChat.id, {
          needsInitialApiCall: false,
        })

        // Set typing state
        setIsTyping(true)
        onProcessingChange(true)

        // Call the API
        await sendMessageWithStreaming(activeChat.initialUserMessage)

        setIsTyping(false)
        onProcessingChange(false)
      }
    }

    triggerInitialApiCall()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChat.id]) // Only run when the chat changes (not on every render)

  /**
   * Real-time subscription to quotes table
   * When a new quote is stored (via webhook), automatically refresh RFQ data
   * This ensures prices and status update in real-time when operators respond
   */
  useEffect(() => {
    // Only subscribe if we have a trip ID
    if (!activeChat.tripId) {
      return
    }

    const supabase = createSupabaseClient()
    let channel: RealtimeChannel | null = null

    const setupRealtimeSubscription = async () => {
      // Find the request ID from the chat session or from the database using trip ID
      let requestId = activeChat.requestId
      
      // If no requestId in chat session, try to find it from database using tripId
      if (!requestId || requestId.startsWith('temp-')) {
        try {
          const { data: requests, error } = await supabase
            .from('requests')
            .select('id')
            .eq('avinode_trip_id', activeChat.tripId!)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          
          if (error) {
            console.error('[ChatInterface] Error finding request by trip ID:', error)
            return
          }
          
          if (requests) {
            requestId = requests.id
            // Update chat session with requestId for future use
            onUpdateChat(activeChat.id, { requestId })
          } else {
            // No request found yet, skip subscription
            return
          }
        } catch (error) {
          console.error('[ChatInterface] Error setting up realtime subscription:', error)
          return
        }
      }
      
      if (!requestId || requestId.startsWith('temp-')) {
        // No valid request ID yet, skip subscription
        return
      }

      // Create channel for this trip/request
      channel = supabase.channel(`quotes-${activeChat.tripId}-${requestId}`)

      // Subscribe to quotes table changes for this request
      if (!channel) return;
      
      // Helper function to refresh RFQ data
      const refreshRFQData = async (reason: string) => {
        if (!activeChat.tripId) return
        
        console.log(`[ChatInterface] Refreshing RFQ data - ${reason}...`)
        try {
          await handleTripIdSubmit(activeChat.tripId)
        } catch (error) {
          console.error('[ChatInterface] Error refreshing RFQ data:', error)
        }
      }
      
      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'quotes',
            filter: `request_id=eq.${requestId}`,
          },
          async (payload) => {
            console.log('[ChatInterface] ✅ New quote received via Realtime:', {
              quoteId: payload.new.id,
              avinodeQuoteId: payload.new.avinode_quote_id,
              operator: payload.new.operator_name,
              price: payload.new.total_price,
              status: payload.new.status,
            })
            
            // When a new quote is stored, refresh RFQ data by calling get_rfq again
            // This ensures prices and status are updated from the latest Avinode API data
            await refreshRFQData(`new quote received (ID: ${payload.new.avinode_quote_id})`)
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'quotes',
            filter: `request_id=eq.${requestId}`,
          },
          async (payload) => {
            console.log('[ChatInterface] ✅ Quote updated via Realtime:', {
              quoteId: payload.new.id,
              avinodeQuoteId: payload.new.avinode_quote_id,
              operator: payload.new.operator_name,
              price: payload.new.total_price,
              status: payload.new.status,
            })
            
            // Refresh RFQ data when quote is updated
            await refreshRFQData(`quote updated (ID: ${payload.new.avinode_quote_id})`)
          }
        )
        // ALSO subscribe to webhook events as a fallback
        // This ensures we catch webhook events even if quotes table isn't updated immediately
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'avinode_webhook_events',
            filter: `avinode_trip_id=eq.${activeChat.tripId}`,
          },
          async (payload) => {
            const eventType = payload.new.event_type
            console.log('[ChatInterface] ✅ Webhook event received via Realtime:', {
              eventId: payload.new.id,
              eventType,
              tripId: payload.new.avinode_trip_id,
              processingStatus: payload.new.processing_status,
            })
            
            // Only refresh for quote-related events
            if (eventType === 'quote_received' || eventType === 'quote_updated') {
              await refreshRFQData(`webhook event: ${eventType}`)
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[ChatInterface] ✅ Realtime subscription active for quotes and webhook events')
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.warn('[ChatInterface] ⚠️ Realtime subscription error:', status)
          } else {
            console.log('[ChatInterface] Realtime subscription status:', status)
          }
        })
    }

    setupRealtimeSubscription()

    // Cleanup subscription on unmount or when tripId/requestId changes
    return () => {
      if (channel) {
        channel.unsubscribe()
        console.log('[ChatInterface] Realtime subscription cleaned up')
      }
    }
  }, [activeChat.tripId, activeChat.requestId, activeChat.id, onUpdateChat]) // Re-subscribe when tripId or requestId changes

  /**
   * Automatic polling to refresh RFQ flights data when operators respond
   * 
   * This is a fallback mechanism that works alongside the real-time subscription.
   * Polls every 60 seconds to check for updated quotes, prices, and status.
   * 
   * API Rate Limit Considerations:
   * - Avinode API limit: ~1 call/second (3600/hour) for general endpoints
   * - get_* endpoints: 60 requests/minute
   * - Polling every 60 seconds = 1 request/minute per active trip
   * - This allows up to 60 concurrent active trips without exceeding limits
   * - Includes exponential backoff on rate limit errors (429)
   * 
   * Only polls when:
   * - A Trip ID exists (activeChat.tripId)
   * - RFQs were previously fetched (activeChat.rfqsLastFetchedAt exists)
   * - Chat is not currently processing (to avoid interrupting user actions)
   * - Trip ID was submitted (tripIdSubmitted === true)
   * 
   * This ensures that when operators respond with quotes, the UI automatically
   * updates with the latest prices and status even if real-time subscriptions fail.
   */
  useEffect(() => {
    // Only poll if we have a Trip ID and RFQs were previously fetched
    if (
      !activeChat.tripId ||
      !activeChat.rfqsLastFetchedAt ||
      !tripIdSubmitted ||
      isProcessing ||
      isTripIdLoading
    ) {
      return
    }

    // Calculate time since last fetch
    const lastFetched = new Date(activeChat.rfqsLastFetchedAt).getTime()
    const now = Date.now()
    const timeSinceLastFetch = now - lastFetched

    // Don't poll if we just fetched (within last 10 seconds) to avoid duplicate requests
    if (timeSinceLastFetch < 10000) {
      return
    }

    // Set up polling interval (60 seconds to respect API rate limits)
    // 60 seconds = 1 request/minute per trip, well within 60 requests/minute limit for get_* endpoints
    const pollInterval = 60000 // 60 seconds

    console.log('[ChatInterface] Starting automatic RFQ polling for Trip ID:', activeChat.tripId, '- interval:', pollInterval / 1000, 'seconds')

    // Track consecutive rate limit errors for exponential backoff
    let consecutiveRateLimitErrors = 0
    const MAX_RATE_LIMIT_BACKOFF = 5 * 60000 // 5 minutes max backoff

    const intervalId = setInterval(async () => {
      // Double-check conditions before each poll
      if (
        !activeChat.tripId ||
        !activeChat.rfqsLastFetchedAt ||
        !tripIdSubmitted ||
        isProcessing ||
        isTripIdLoading
      ) {
        console.log('[ChatInterface] Skipping RFQ poll - conditions not met')
        consecutiveRateLimitErrors = 0 // Reset on skip
        return
      }

      // Check if enough time has passed since last fetch (avoid rapid polling)
      const lastFetchedCheck = new Date(activeChat.rfqsLastFetchedAt).getTime()
      const timeSinceLastFetchCheck = Date.now() - lastFetchedCheck

      // Only poll if at least 30 seconds have passed since last fetch
      // This provides additional safety margin for API rate limits
      if (timeSinceLastFetchCheck < 30000) {
        console.log('[ChatInterface] Skipping RFQ poll - too soon since last fetch (', Math.round(timeSinceLastFetchCheck / 1000), 'seconds ago)')
        return
      }

      console.log('[ChatInterface] Auto-refreshing RFQs for Trip ID:', activeChat.tripId)

      try {
        // Call handleTripIdSubmit to refresh RFQ data
        // This will update prices, status, and operator messages automatically
        await handleTripIdSubmit(activeChat.tripId)
        
        // Reset rate limit error counter on successful request
        consecutiveRateLimitErrors = 0
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        
        // Handle rate limiting (429 status) with exponential backoff
        if (errorMessage.includes('Rate limited') || errorMessage.includes('429')) {
          consecutiveRateLimitErrors++
          const backoffMs = Math.min(
            Math.pow(2, consecutiveRateLimitErrors) * 1000, // Exponential: 2s, 4s, 8s, 16s, 32s...
            MAX_RATE_LIMIT_BACKOFF // Cap at 5 minutes
          )
          
          console.warn(
            `[ChatInterface] Rate limited (${consecutiveRateLimitErrors} consecutive). ` +
            `Skipping next ${Math.round(backoffMs / 1000)} poll(s) to respect API limits.`
          )
          
          // Skip the next few polls by temporarily increasing interval
          // This is handled by the consecutiveRateLimitErrors counter
          return
        }
        
        // Log other errors but don't show to user - polling failures should be silent
        console.error('[ChatInterface] Auto-refresh RFQ failed:', error)
        consecutiveRateLimitErrors = 0 // Reset on non-rate-limit errors
      }
    }, pollInterval)

    // Cleanup interval on unmount or when conditions change
    return () => {
      console.log('[ChatInterface] Stopping automatic RFQ polling')
      clearInterval(intervalId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeChat.tripId,
    activeChat.rfqsLastFetchedAt,
    tripIdSubmitted,
    isProcessing,
    isTripIdLoading,
  ])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return

    const userMessage = inputValue.trim()
    setInputValue("")
    setIsTyping(true)
    setStreamError(null)
    onProcessingChange(true)

    // Add user message immediately
    const userMsg = {
      id: Date.now().toString(),
      type: "user" as const,
      content: userMessage,
      timestamp: new Date(),
    }

    const currentMessages = [...activeChat.messages, userMsg]
    latestMessagesRef.current = currentMessages

    onUpdateChat(activeChat.id, {
      messages: currentMessages,
      status: "understanding_request",
      currentStep: 1,
    })

    // Progress to Step 2 (Creating Trip) after a short delay to show workflow progress
    const progressTimer = setTimeout(() => {
      onUpdateChat(activeChat.id, {
        status: "searching_aircraft",
        currentStep: 2,
      })
    }, 2000)

    // Send message with streaming
    await sendMessageWithStreaming(userMessage)

    // Clear the progress timer if API returns faster
    clearTimeout(progressTimer)

    setIsTyping(false)
    onProcessingChange(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleSelectQuote = (quoteId: string) => {
    onUpdateChat(activeChat.id, { selectedQuoteId: quoteId })
  }

  /**
   * Open the quote details drawer for a specific quote
   */
  const handleViewQuoteDetails = (quoteId: string) => {
    setSelectedQuoteId(quoteId)
    setIsDrawerOpen(true)
  }

  /**
   * Handle "View Chat" button click on RFQ flight card
   * Retrieves messages using quote ID and message ID, then inserts into chat input and sends to agent
   * 
   * Uses MCP tools:
   * - get_message (message_id) - When messageId is provided, uses GET /tripmsgs/{messageId}
   * - get_trip_messages (request_id) - When quoteId is provided, uses GET /tripmsgs/{requestId}/chat
   * 
   * @param flightId - The flight ID
   * @param quoteId - The quote ID for retrieving messages (used as request_id)
   * @param messageId - The message ID for retrieving specific message (optional)
   * 
   * @see https://sandbox.avinode.com/api/tripmsgs/{messageId}
   * @see https://developer.avinodegroup.com/reference/readmessage
   */
  const handleViewChat = async (flightId: string, quoteId?: string, messageId?: string) => {
    console.log('[Chat] View chat clicked for flight:', flightId, 'quoteId:', quoteId, 'messageId:', messageId)
    
    try {
      // Mark messages as read when user views them
      // Update lastMessagesReadAt timestamp for this quote ID
      if (quoteId) {
        const now = new Date().toISOString()
        onUpdateChat(activeChat.id, {
          lastMessagesReadAt: {
            ...(activeChat.lastMessagesReadAt || {}),
            [quoteId]: now,
          },
        })
        console.log('[Chat] Marked messages as read for quote:', quoteId, 'at:', now)
      }
      
      // Find the flight to get operator name and trip ID
      const flight = activeChat.rfqFlights?.find(f => f.id === flightId || f.quoteId === quoteId)
      
      // Open the message thread popup
      setMessageThreadTripId(activeChat.tripId || undefined)
      setMessageThreadRequestId(quoteId || undefined) // Use quoteId as requestId for get_trip_messages
      setMessageThreadQuoteId(quoteId)
      setMessageThreadFlightId(flightId)
      setMessageThreadOperatorName(flight?.operatorName)
      setIsMessageThreadOpen(true)
    } catch (error) {
      console.error('[Chat] Error handling view chat:', error)
      // Fallback: just open the drawer
      handleViewQuoteDetails(flightId)
    }
  }

  /**
   * Handle "Book flight" button click
   * Transitions to booking flow
   */
  const handleBookFlight = (flightId: string, quoteId?: string) => {
    console.log('[Chat] Book flight clicked for flight:', flightId, 'quoteId:', quoteId)
    // Select this flight and transition to booking
    setSelectedRfqFlightIds([flightId])
    onUpdateChat(activeChat.id, {
      currentStep: 4,
      status: 'proposal_ready',
      selectedQuoteId: quoteId || flightId,
    })
    
    // Insert booking message into chat input
    const bookingMessage = `Book the flight for quote ${quoteId || flightId}. Please proceed with the booking process.`
    setInputValue(bookingMessage)
    
    // Auto-send after brief delay
    setTimeout(() => {
      handleSendMessage()
    }, 100)
  }

  /**
   * Handle "Generate flight proposal" button click
   * Generates a proposal PDF for the selected flight
   */
  const handleGenerateProposal = (flightId: string, quoteId?: string) => {
    console.log('[Chat] Generate proposal clicked for flight:', flightId, 'quoteId:', quoteId)
    // Select this flight for proposal
    setSelectedRfqFlightIds([flightId])
    onUpdateChat(activeChat.id, {
      currentStep: 4,
      status: 'proposal_ready',
      selectedQuoteId: quoteId || flightId,
    })
    
    // Insert proposal generation message into chat input
    const proposalMessage = `Generate a flight proposal PDF for quote ${quoteId || flightId}. Include all flight details, pricing, and terms.`
    setInputValue(proposalMessage)
    
    // Auto-send after brief delay
    setTimeout(() => {
      handleSendMessage()
    }, 100)
  }

  /**
   * Close the quote details drawer
   */
  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
    setSelectedQuoteId(null)
  }

  /**
   * Send a message to an operator (placeholder for future implementation)
   */
  const handleSendOperatorMessage = (message: string) => {
    console.log('[Chat] Sending message to operator:', message, 'for quote:', selectedQuoteId)
    // TODO: Implement actual message sending via Avinode API
  }

  /**
   * Accept a quote (placeholder for future implementation)
   */
  const handleAcceptQuote = (quoteId: string) => {
    console.log('[Chat] Accepting quote:', quoteId)
    onUpdateChat(activeChat.id, { selectedQuoteId: quoteId })
    // TODO: Implement actual quote acceptance via Avinode API
  }

  /**
   * Handle "Review and Book" button click on RFQ flight card
   * Selects the flight and transitions to Step 4 (Send Proposal)
   */
  const handleReviewAndBook = (flightId: string) => {
    console.log('[Chat] Review and Book clicked for flight:', flightId)
    // Select this single flight for the proposal
    setSelectedRfqFlightIds([flightId])
    // Update chat status to proposal step
    onUpdateChat(activeChat.id, {
      currentStep: 4,
      status: 'proposal_ready',
      selectedQuoteId: flightId,
    })
  }

  /**
   * Handle Trip ID submission - Step 3: View/Update RFQ Flights
   * 
   * This function is called by BOTH:
   * 1. Initial "View RFQs" button (first time viewing RFQs for a trip)
   * 2. "Update RFQs" button (refreshing RFQs to get latest status, prices, and messages)
   * 
   * Both buttons use the SAME underlying functions:
   * - get_rfq tool: Retrieves RFQ status, quotes with prices, operator information
   * - get_trip_messages tool: Retrieves operator messages and responses
   * 
   * This ensures consistency - both initial viewing and updates fetch:
   * - RFQ status (sent, unanswered, quoted, declined, expired)
   * - Quote prices and currency
   * - Operator names and details
   * - Message activities from operators
   * - Message timestamps for new message indicator calculation
   * 
   * Uses the Avinode API endpoints:
   * - GET /trips/{tripId} or GET /rfqs/{id} (for get_rfq)
   * - GET /tripmsgs/{tripId} or GET /tripmsgs/{requestId}/chat (for get_trip_messages)
   * 
   * Documentation: 
   * - https://developer.avinodegroup.com/reference/readtriprfqs
   * - https://developer.avinodegroup.com/reference/readmessage
   */
  const handleTripIdSubmit = async (tripId: string): Promise<void> => {
    console.log('[Chat] handleTripIdSubmit called with tripId:', tripId);
    console.log('[Chat] activeChat.tripId:', activeChat.tripId);
    console.log('[Chat] activeChat state:', {
      id: activeChat.id,
      route: activeChat.route,
      passengers: activeChat.passengers,
      date: activeChat.date,
    });
    
    setIsTripIdLoading(true)
    setTripIdError(undefined)

    // Parse route to get airport info for RFQ conversion
    const routeParts = activeChat.route?.split(' → ') || ['N/A', 'N/A']

    try {
      // Build conversation history for context
      const conversationHistory = activeChat.messages.map((msg) => ({
        role: msg.type === "user" ? "user" as const : "assistant" as const,
        content: msg.content,
      }))

      // Send Trip ID to the chat API - will trigger get_rfq and get_trip_messages tools
      // Explicitly request both RFQ status and message activities
      // CRITICAL: Always fetch quote details (get_quote) to get prices, messages, and status - never use hardcoded values
      // Use the same message format for both initial viewing and updates to ensure consistency
      const isUpdate = !!activeChat.rfqsLastFetchedAt
      const actionText = isUpdate ? 'Update' : 'View'
      console.log('[Chat] Sending Trip ID to API:', tripId, isUpdate ? '(Update RFQs)' : '(View RFQs - initial)');
      
      // Build base message that explicitly requests quote details to be fetched
      // IMPORTANT: get_rfq tool automatically fetches quote details when it finds quote IDs in sellerLift
      // But we explicitly request it here to ensure the agent understands we need full quote details
      let message = `${actionText} RFQs for Trip ID: ${tripId}. Please retrieve the latest RFQ status, quotes with prices and operator information, and all message activities from operators. 

CRITICAL REQUIREMENTS:
1. Use get_rfq tool to fetch RFQ status and extract quote IDs from sellerLift[].links.quotes[]
2. For EACH quote ID found, automatically call get_quote tool to retrieve:
   - Latest prices (from sellerPrice.price and sellerPrice.currency) - DO NOT use hardcoded values
   - Quote status (quoted, declined, expired, etc.) - derive from API response, not hardcoded
   - Operator messages (from sellerMessage field) - fetch from API, not hardcoded
   - All quote details including aircraft, schedule, and pricing breakdown
3. Use get_trip_messages tool to retrieve all message activities from operators
4. If no RFQs are found for this Trip ID, indicate that the user should follow Step 2 to create RFQs

DO NOT use any hardcoded values - all prices, status, and messages must come from the Avinode API responses.`
      
      // For updates, also explicitly request get_quote for each existing quote ID as a fallback
      // This ensures we get the latest data even if get_rfq doesn't extract quote IDs properly
      if (isUpdate && activeChat.rfqFlights && activeChat.rfqFlights.length > 0) {
        const quoteIds = activeChat.rfqFlights
          .map(f => f.quoteId)
          .filter((id): id is string => !!id && id !== undefined && id !== null && id !== '') // Filter out invalid quote IDs
          .filter((id, index, arr) => arr.indexOf(id) === index) // Remove duplicates
        
        if (quoteIds.length > 0) {
          console.log('[Chat] Requesting explicit get_quote for', quoteIds.length, 'existing quote IDs:', quoteIds)
          message += `\n\nAdditionally, as a fallback, please also call get_quote tool directly for these existing quote IDs to ensure we have the latest prices and status: ${quoteIds.join(', ')}.`
        }
      }
      
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          conversationHistory,
          context: {
            flightRequestId: activeChat.id,
            route: activeChat.route,
            passengers: activeChat.passengers,
            date: activeChat.date,
            tripId: tripId, // Include Trip ID in context to trigger get_rfq and get_trip_messages
          },
        }),
      })
      
      console.log('[Chat] API response status:', response.status, response.ok);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to submit Trip ID" }))
        throw new Error(errorData.message || `Request failed with status ${response.status}`)
      }

      // Handle SSE response
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("No response body")
      }

      const decoder = new TextDecoder()
      let fullContent = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6))

              // ONEK-137: Handle both legacy string errors and new structured format
              if (data.error) {
                if (typeof data.error === 'object' && data.error.message) {
                  const errorInfo = data.error as { code: string; message: string; recoverable: boolean }
                  console.error(`[Chat] Quote retrieval error [${errorInfo.code}]:`, errorInfo.message)
                  throw new Error(errorInfo.message)
                }
                throw new Error(data.message || data.error || "Failed to retrieve quotes")
              }

              if (data.content) {
                fullContent += data.content
              }

              if (data.done) {
                // IMPORTANT: This block ALWAYS processes tool results, even if quotes already exist
                // The "Quotes already exist, skipping text parsing" message is from a different useEffect
                // that only handles text parsing - it does NOT prevent tool results from updating here
                // This ensures prices, status, and messages are always refreshed when "View RFQs" or "Update RFQs" is clicked
                
                // Extract quotes and RFQs data from rfq_data if available
                let quotes = []
                let rfqs = [] // Store RFQs separately to handle those without quotes
                let newStatus = "analyzing_options"

                if (data.rfq_data) {
                  console.log('[TripID] RFQ data received:', data.rfq_data)
                  quotes = data.rfq_data.quotes || []
                  rfqs = data.rfq_data.rfqs || []

                  if (quotes.length > 0 || rfqs.length > 0) {
                    newStatus = "analyzing_options"
                  }
                }

                // Also check tool_calls for get_rfq results (handles both RFQ IDs and Trip IDs)
                // Track pre-transformed flights from getRFQFlights
                let preTransformedFlights: RFQFlight[] = []
                // Track get_quote results to update prices and status
                const quoteDetailsMap: Record<string, any> = {}

                if (data.tool_calls) {
                  for (const toolCall of data.tool_calls) {
                    // Handle get_quote results first - these contain latest prices and status
                    if (toolCall.name === "get_quote" && toolCall.result) {
                      console.log('[TripID] get_quote result received:', {
                        quote_id: toolCall.result.quote_id,
                        pricing: toolCall.result.pricing,
                        status: toolCall.result.status,
                        resultKeys: Object.keys(toolCall.result),
                      })
                      
                      // Store quote details by quote_id for later merging
                      if (toolCall.result.quote_id) {
                        quoteDetailsMap[toolCall.result.quote_id] = toolCall.result
                        console.log('[TripID] Stored quote details for quote_id:', toolCall.result.quote_id, {
                          hasPricing: !!toolCall.result.pricing,
                          pricing: toolCall.result.pricing,
                          status: toolCall.result.status,
                        })
                      }
                    }
                    
                    if (toolCall.name === "get_rfq" && toolCall.result) {
                      console.log('[TripID] get_rfq result structure:', {
                        hasFlights: !!toolCall.result.flights,
                        hasRfqs: !!toolCall.result.rfqs,
                        hasQuotes: !!toolCall.result.quotes,
                        totalRfqs: toolCall.result.total_rfqs,
                        totalQuotes: toolCall.result.total_quotes,
                        flightsReceived: toolCall.result.flights_received,
                        status: toolCall.result.status,
                        resultKeys: Object.keys(toolCall.result),
                      })

                      // NEW FORMAT: getRFQFlights returns { flights: RFQFlight[], status, trip_id, rfq_id, ... }
                      // This is the preferred format from the MCP tool
                      if (toolCall.result.flights && Array.isArray(toolCall.result.flights)) {
                        preTransformedFlights = toolCall.result.flights as RFQFlight[]
                        console.log('[TripID] ✅ Using pre-transformed flights array:', preTransformedFlights.length, 'flights')
                        
                        // CRITICAL: Log prices and status for each flight to verify extraction
                        preTransformedFlights.forEach((flight, idx) => {
                          console.log(`[TripID] Flight ${idx + 1} details FROM get_rfq tool result:`, {
                            id: flight.id,
                            quoteId: flight.quoteId,
                            totalPrice: flight.totalPrice,
                            currency: flight.currency,
                            rfqStatus: flight.rfqStatus,
                            operatorName: flight.operatorName,
                            priceIsZero: flight.totalPrice === 0,
                            priceIsUndefined: flight.totalPrice === undefined,
                            priceIsNull: flight.totalPrice === null,
                            statusIsUnanswered: flight.rfqStatus === 'unanswered',
                            hasSellerMessage: !!(flight as any).sellerMessage,
                            sellerMessage: (flight as any).sellerMessage?.substring(0, 100),
                          })
                          
                          // CRITICAL WARNING: If price is 0, this means the MCP tool didn't extract price correctly
                          // OR quote details weren't fetched. We need to ensure get_quote is called for this quote ID
                          if (flight.totalPrice === 0 && flight.quoteId) {
                            console.error(`[TripID] ❌ CRITICAL: Flight ${idx + 1} (quoteId: ${flight.quoteId}) has $0 price! This means:`, {
                              message: 'Either get_rfq tool did not fetch quote details, OR price extraction failed in transformToRFQFlights',
                              solution: 'We should call get_quote tool for this quoteId to get the latest price',
                              quoteId: flight.quoteId,
                              flightId: flight.id,
                            })
                          }
                        })
                        
                        // CRITICAL: If we have flights with $0 prices, we need to call get_quote for each quote ID
                        // The get_rfq tool might return flights without fetching individual quote details
                        const flightsNeedingQuoteDetails = preTransformedFlights.filter(
                          f => (f.totalPrice === 0 || f.rfqStatus === 'unanswered') && f.quoteId
                        )
                        
                        if (flightsNeedingQuoteDetails.length > 0 && Object.keys(quoteDetailsMap).length === 0) {
                          console.warn('[TripID] ⚠️ WARNING: Flights have $0 prices but no get_quote results found!', {
                            flightsNeedingDetails: flightsNeedingQuoteDetails.length,
                            quoteIds: flightsNeedingQuoteDetails.map(f => f.quoteId),
                            message: 'The agent should have called get_quote tool for each quote ID, but no results were found. This is a problem with the agent\'s tool calling strategy.',
                          })
                        }

                        // IMPORTANT: Extract seller messages from quotes and add to operatorMessages
                        // sellerMessage is a string field in quote responses containing operator messages
                        // These messages should be stored in operatorMessages[quoteId] for UI display
                        const sellerMessagesFromQuotes: Record<string, Array<{
                          id: string
                          type: 'REQUEST' | 'RESPONSE' | 'INFO' | 'CONFIRMATION'
                          content: string
                          timestamp: string
                          sender?: string
                        }>> = {}
                        
                        for (const flight of preTransformedFlights) {
                          // Check if flight has sellerMessage (from quote.sellerMessage field)
                          const sellerMessage = (flight as any).sellerMessage
                          if (sellerMessage && typeof sellerMessage === 'string' && sellerMessage.trim()) {
                            const quoteId = flight.quoteId
                            if (quoteId) {
                              if (!sellerMessagesFromQuotes[quoteId]) {
                                sellerMessagesFromQuotes[quoteId] = []
                              }
                              // Add seller message as a RESPONSE type (from operator)
                              sellerMessagesFromQuotes[quoteId].push({
                                id: `seller-msg-${quoteId}-${Date.now()}`,
                                type: 'RESPONSE' as const,
                                content: sellerMessage,
                                timestamp: flight.lastUpdated || new Date().toISOString(),
                                sender: flight.operatorName,
                              })
                              console.log('[TripID] Found seller message for quote', quoteId, ':', sellerMessage.substring(0, 100))
                            }
                          }
                        }
                        
                        // CRITICAL: Also extract seller messages from get_quote results
                        // get_quote returns notes/sellerMessage field that should be added to operatorMessages
                        for (const [quoteId, quoteDetails] of Object.entries(quoteDetailsMap)) {
                          const sellerMessage = (quoteDetails as any).notes || (quoteDetails as any).sellerMessage
                          if (sellerMessage && typeof sellerMessage === 'string' && sellerMessage.trim()) {
                            if (!sellerMessagesFromQuotes[quoteId]) {
                              sellerMessagesFromQuotes[quoteId] = []
                            }
                            // Check if this message already exists (avoid duplicates)
                            const existingContent = sellerMessagesFromQuotes[quoteId].some(msg => msg.content === sellerMessage)
                            if (!existingContent) {
                              sellerMessagesFromQuotes[quoteId].push({
                                id: `get-quote-msg-${quoteId}-${Date.now()}`,
                                type: 'RESPONSE' as const,
                                content: sellerMessage,
                                timestamp: (quoteDetails as any).created_at || new Date().toISOString(),
                                sender: (quoteDetails as any).operator?.name || (quoteDetails as any).operator?.displayName,
                              })
                              console.log('[TripID] Found seller message from get_quote for quote', quoteId, ':', sellerMessage.substring(0, 100))
                            }
                          }
                        }
                        
                        // Merge seller messages from quotes into operatorMessages
                        if (Object.keys(sellerMessagesFromQuotes).length > 0) {
                          console.log('[TripID] Extracted seller messages from', Object.keys(sellerMessagesFromQuotes).length, 'quotes')
                          const updatedOperatorMessages: Record<string, Array<{
                            id: string
                            type: 'REQUEST' | 'RESPONSE' | 'INFO' | 'CONFIRMATION'
                            content: string
                            timestamp: string
                            sender?: string
                          }>> = { ...activeChat.operatorMessages }
                          
                          for (const [quoteId, messages] of Object.entries(sellerMessagesFromQuotes)) {
                            const existingMessages = updatedOperatorMessages[quoteId] || []
                            const existingMessageIds = new Set(existingMessages.map(m => m.id))
                            const existingContent = new Set(existingMessages.map(m => m.content))
                            
                            // Add seller messages if not already present (check both ID and content to avoid duplicates)
                            const uniqueSellerMessages = messages.filter(msg => 
                              !existingMessageIds.has(msg.id) && !existingContent.has(msg.content)
                            )
                            if (uniqueSellerMessages.length > 0) {
                              updatedOperatorMessages[quoteId] = [...existingMessages, ...uniqueSellerMessages]
                              console.log('[TripID] ✅ Added', uniqueSellerMessages.length, 'seller messages for quote:', quoteId, {
                                messageContent: uniqueSellerMessages[0].content.substring(0, 100),
                                messageType: uniqueSellerMessages[0].type,
                                sender: uniqueSellerMessages[0].sender,
                              })
                            } else {
                              updatedOperatorMessages[quoteId] = existingMessages
                              console.log('[TripID] Seller messages already exist for quote:', quoteId, 'count:', existingMessages.length)
                            }
                          }
                          
                          // Update chat with seller messages from quotes
                          // CRITICAL: This ensures seller messages from quote.sellerMessage are available for message indicators
                          console.log('[TripID] Updating operatorMessages with seller messages from quotes:', {
                            totalQuotes: Object.keys(updatedOperatorMessages).length,
                            messagesPerQuote: Object.entries(updatedOperatorMessages).map(([qId, msgs]) => ({
                              quoteId: qId,
                              messageCount: msgs.length,
                            })),
                          })
                          onUpdateChat(activeChat.id, {
                            operatorMessages: updatedOperatorMessages,
                          })
                        } else {
                          console.log('[TripID] No seller messages found in pre-transformed flights or get_quote results')
                        }

                        // Also populate quotes for backward compatibility with conversion logic
                        // The flights are already in RFQFlight format, so we'll use them directly later
                        quotes = preTransformedFlights

                        if (toolCall.result.rfqs && Array.isArray(toolCall.result.rfqs)) {
                          rfqs = toolCall.result.rfqs
                          
                          // Extract message IDs from trip response's links.tripmsgs[] if available
                          // These message IDs can be used to fetch individual messages
                          const messageIdsFromTrip: string[] = []
                          for (const rfqItem of toolCall.result.rfqs) {
                            if (rfqItem.links?.tripmsgs && Array.isArray(rfqItem.links.tripmsgs)) {
                              for (const msgLink of rfqItem.links.tripmsgs) {
                                if (msgLink.id) {
                                  messageIdsFromTrip.push(msgLink.id)
                                }
                              }
                            }
                          }
                          // Also check trip-level message links if available
                          if (toolCall.result.links?.tripmsgs && Array.isArray(toolCall.result.links.tripmsgs)) {
                            for (const msgLink of toolCall.result.links.tripmsgs) {
                              if (msgLink.id && !messageIdsFromTrip.includes(msgLink.id)) {
                                messageIdsFromTrip.push(msgLink.id)
                              }
                            }
                          }
                          if (messageIdsFromTrip.length > 0) {
                            console.log('[TripID] Found message IDs in trip response:', messageIdsFromTrip.length, 'messages')
                            // Note: Individual messages will be fetched via get_trip_messages or get_message tools
                            // The agent should handle fetching these messages
                          }
                        }

                        // Check for RFQs without quotes (status is 'sent' or 'unanswered')
                        const rfqsAwaitingQuotes = preTransformedFlights.filter(
                          f => f.rfqStatus === 'sent' || f.rfqStatus === 'unanswered'
                        )
                        if (rfqsAwaitingQuotes.length > 0) {
                          console.log('[TripID] Found', rfqsAwaitingQuotes.length, 'RFQs awaiting quotes')
                        }
                      }
                      // LEGACY FORMAT: Store RFQs array for processing RFQs without quotes
                      // This must be done BEFORE extracting quotes so we have the full RFQ list
                      else if (toolCall.result.rfqs && Array.isArray(toolCall.result.rfqs)) {
                        rfqs = toolCall.result.rfqs
                        console.log('[TripID] Found RFQs array:', rfqs.length, 'RFQs')
                        console.log('[TripID] RFQs details:', rfqs.map((rfq: any) => ({
                          rfqId: rfq.rfq_id || rfq.id,
                          status: rfq.status,
                          hasQuotes: !!(rfq.quotes && rfq.quotes.length > 0),
                          quotesCount: Array.isArray(rfq.quotes) ? rfq.quotes.length : 0,
                        })))

                        // Extract all quotes from all RFQs
                        // IMPORTANT: Check sellerLift array (PRIMARY location for quotes with prices in Avinode API)
                        quotes = toolCall.result.rfqs.flatMap((rfq: any) => {
                          // PRIMARY: Check sellerLift array (contains quotes with prices)
                          if (rfq.sellerLift && Array.isArray(rfq.sellerLift) && rfq.sellerLift.length > 0) {
                            console.log('[TripID] Found sellerLift array in RFQ:', rfq.rfq_id || rfq.id, 'with', rfq.sellerLift.length, 'lifts')
                            // sellerLift contains lift objects which are quote objects with prices
                            return rfq.sellerLift
                          }
                          // SECONDARY: Check quotes array
                          if (Array.isArray(rfq.quotes)) {
                            return rfq.quotes
                          } else if (rfq.quote) {
                            return [rfq.quote]
                          } else if (rfq.quote_id) {
                            return rfq.quote_id ? [rfq] : []
                          }
                          return []
                        })
                        console.log('[TripID] Extracted quotes from RFQs array:', quotes.length)
                        if (quotes.length > 0) {
                          console.log('[TripID] Sample quote structure:', {
                            hasPrice: 'price' in quotes[0],
                            price: quotes[0].price,
                            hasTotalPrice: 'totalPrice' in quotes[0],
                            totalPrice: quotes[0].totalPrice,
                            hasPricing: 'pricing' in quotes[0],
                            pricing: quotes[0].pricing,
                            quoteKeys: Object.keys(quotes[0]),
                          })
                        }
                      }
                      // LEGACY FORMAT: Top-level quotes array
                      else if (toolCall.result.quotes && Array.isArray(toolCall.result.quotes)) {
                        quotes = toolCall.result.quotes
                        console.log('[TripID] Using top-level quotes array:', quotes.length)
                      }
                      // LEGACY FORMAT: Single RFQ response
                      else if (toolCall.result.quote_id || toolCall.result.rfq_id) {
                        if (Array.isArray(toolCall.result.quotes)) {
                          quotes = toolCall.result.quotes
                        } else {
                          quotes = toolCall.result.quotes ? [toolCall.result.quotes] : []
                        }
                        console.log('[TripID] Single RFQ response, quotes:', quotes.length)
                      }

                      console.log('[TripID] Final quotes count:', quotes.length)
                      console.log('[TripID] Final RFQs count:', rfqs.length)
                      console.log('[TripID] Pre-transformed flights count:', preTransformedFlights.length)
                    } else if (toolCall.name === "get_trip_messages" && toolCall.result) {
                      // Handle get_trip_messages tool result
                      // Store operator messages keyed by quote ID or RFQ ID
                      console.log('[TripID] get_trip_messages result:', {
                        hasMessages: !!toolCall.result.messages,
                        messageCount: Array.isArray(toolCall.result.messages) ? toolCall.result.messages.length : 0,
                        resultKeys: Object.keys(toolCall.result),
                      })

                      if (toolCall.result.messages && Array.isArray(toolCall.result.messages)) {
                        // Group messages by quote ID or RFQ ID
                        const operatorMessagesMap: Record<string, Array<{
                          id: string
                          type: 'REQUEST' | 'RESPONSE' | 'INFO' | 'CONFIRMATION'
                          content: string
                          timestamp: string
                          sender?: string
                        }>> = {}

                        for (const msg of toolCall.result.messages) {
                          // Extract quote ID from message
                          // Messages from Avinode API have sellerQuote.id which is the quote ID
                          // Also check links.quotes[] or lift[].links.quotes[] for quote IDs
                          let quoteId: string | undefined
                          
                          // Primary: sellerQuote.id (from message response)
                          if (msg.sellerQuote?.id) {
                            quoteId = msg.sellerQuote.id
                          }
                          // Secondary: lift[].links.quotes[].id (from message lift array)
                          else if (msg.lift && Array.isArray(msg.lift) && msg.lift.length > 0) {
                            const firstLift = msg.lift[0]
                            if (firstLift.links?.quotes && Array.isArray(firstLift.links.quotes) && firstLift.links.quotes.length > 0) {
                              quoteId = firstLift.links.quotes[0].id
                            }
                          }
                          // Tertiary: links.quotes[].id (from message links)
                          else if (msg.links?.quotes && Array.isArray(msg.links.quotes) && msg.links.quotes.length > 0) {
                            quoteId = msg.links.quotes[0].id
                          }
                          // Fallback: rfq_id or request_id (map to RFQ, will need to find quote later)
                          else {
                            quoteId = msg.quote_id || msg.rfq_id || msg.request_id
                          }
                          
                          if (quoteId) {
                            if (!operatorMessagesMap[quoteId]) {
                              operatorMessagesMap[quoteId] = []
                            }
                            operatorMessagesMap[quoteId].push({
                              id: msg.message_id || msg.id || `msg-${Date.now()}`,
                              type: msg.type === 'SELLER' || msg.sender_type === 'SELLER' || msg.rfqAccepted ? 'RESPONSE' : 'REQUEST',
                              content: msg.content || msg.message || msg.text || msg.message || '',
                              timestamp: msg.timestamp || msg.created_at || msg.createdOn || msg.sent_at || new Date().toISOString(),
                              sender: msg.sender_name || msg.operator_name || msg.sellerCompany?.displayName || msg.sender || undefined,
                            })
                          }
                        }

                        // Update activeChat with operator messages
                        // Track which messages are new (unread) based on timestamp comparison
                        // When "View RFQs" or "Update RFQs" is clicked, merge new messages with existing ones
                        // This ensures we don't lose previously retrieved messages while adding new ones
                        if (Object.keys(operatorMessagesMap).length > 0) {
                          console.log('[TripID] Storing operator messages for', Object.keys(operatorMessagesMap).length, 'quotes/RFQs')
                          
                          // Merge new messages with existing ones
                          // For each quote ID, combine messages from both sources (avoid duplicates by message ID)
                          const updatedOperatorMessages: Record<string, Array<{
                            id: string
                            type: 'REQUEST' | 'RESPONSE' | 'INFO' | 'CONFIRMATION'
                            content: string
                            timestamp: string
                            sender?: string
                          }>> = { ...activeChat.operatorMessages }
                          
                          for (const [quoteId, newMessages] of Object.entries(operatorMessagesMap)) {
                            const existingMessages = updatedOperatorMessages[quoteId] || []
                            const existingMessageIds = new Set(existingMessages.map(m => m.id))
                            
                            // Add only new messages (not already in existing messages)
                            const uniqueNewMessages = newMessages.filter(msg => !existingMessageIds.has(msg.id))
                            
                            if (uniqueNewMessages.length > 0) {
                              updatedOperatorMessages[quoteId] = [...existingMessages, ...uniqueNewMessages]
                              console.log('[TripID] Added', uniqueNewMessages.length, 'new messages for quote:', quoteId)
                            } else {
                              // Keep existing messages if no new ones
                              updatedOperatorMessages[quoteId] = existingMessages
                            }
                          }
                          
                          // Update chat with merged messages
                          // Don't update lastMessagesReadAt here - only update when user actually views messages
                          // This ensures messages remain "new" until explicitly viewed
                          onUpdateChat(activeChat.id, {
                            operatorMessages: updatedOperatorMessages,
                          })
                        }
                      }
                    }
                  }
                }

                // Check if we have a message from getRFQ tool indicating no RFQs
                // Also check for empty RFQ response (total_rfqs === 0)
                // Do this BEFORE processing quotes so we can use it in message generation
                let noRfqsMessage: string | null = null;
                
                // Check tool_calls for get_rfq results first
                if (data.tool_calls) {
                  for (const toolCall of data.tool_calls) {
                    if (toolCall.name === "get_rfq" && toolCall.result) {
                      // Check for explicit message from getRFQ tool (includes Step 2 instruction)
                      if (toolCall.result.message && typeof toolCall.result.message === 'string') {
                        noRfqsMessage = toolCall.result.message;
                        console.log('[TripID] No RFQs message from get_rfq tool:', noRfqsMessage);
                        break;
                      }
                      // Check for empty RFQ response (no RFQs found)
                      // If total_rfqs is 0 or undefined and no RFQs/flights arrays exist
                      if ((toolCall.result.total_rfqs === 0 || toolCall.result.total_rfqs === undefined) && 
                          (!toolCall.result.rfqs || toolCall.result.rfqs.length === 0) &&
                          (!toolCall.result.flights || toolCall.result.flights.length === 0)) {
                        noRfqsMessage = "No RFQs have been submitted yet for this Trip ID. Please follow the instructions in Step 2 to search for flights and send RFQs to operators via the Avinode marketplace.";
                        console.log('[TripID] Detected empty RFQ response - no RFQs found');
                        break;
                      }
                    }
                  }
                }
                // Also check rfq_data directly (alternative response format)
                if (!noRfqsMessage && data.rfq_data) {
                  if (data.rfq_data.message && typeof data.rfq_data.message === 'string') {
                    noRfqsMessage = data.rfq_data.message;
                    console.log('[TripID] No RFQs message from rfq_data:', noRfqsMessage);
                  } else if ((data.rfq_data.total_rfqs === 0 || data.rfq_data.total_rfqs === undefined) && 
                            (!data.rfq_data.rfqs || data.rfq_data.rfqs.length === 0) &&
                            (!data.rfq_data.flights || data.rfq_data.flights.length === 0)) {
                    noRfqsMessage = "No RFQs have been submitted yet for this Trip ID. Please follow the instructions in Step 2 to search for flights and send RFQs to operators via the Avinode marketplace.";
                    console.log('[TripID] Detected empty RFQ response in rfq_data - no RFQs found');
                  }
                }
                
                // Final fallback: If no RFQs/flights/quotes found anywhere, show Step 2 message
                if (!noRfqsMessage && 
                    (!quotes || quotes.length === 0) && 
                    (!rfqs || rfqs.length === 0) &&
                    (!preTransformedFlights || preTransformedFlights.length === 0)) {
                  noRfqsMessage = "No RFQs have been submitted yet for this Trip ID. Please follow the instructions in Step 2 to search for flights and send RFQs to operators via the Avinode marketplace.";
                  console.log('[TripID] Final fallback: No RFQs found in any data source - showing Step 2 message');
                }

                // Determine final RFQFlight array based on data source
                let allFormattedQuotes: RFQFlight[] = []

                // If we have pre-transformed flights from getRFQFlights, use them directly
                // No conversion needed - data is already in RFQFlight format
                if (preTransformedFlights.length > 0) {
                  console.log('[TripID] Using pre-transformed flights directly:', preTransformedFlights.length)
                  allFormattedQuotes = preTransformedFlights

                  if (rfqs.length > 0) {
                    const rfqsWithoutQuotes = rfqs
                      .filter((rfq: any) => {
                        const hasQuotes = Array.isArray(rfq.quotes) && rfq.quotes.length > 0
                        const hasRequests = Array.isArray(rfq.requests) && rfq.requests.length > 0
                        const hasResponses = Array.isArray(rfq.responses) && rfq.responses.length > 0
                        const hasLiftQuotes = Array.isArray(rfq.lifts) && rfq.lifts.some((lift: any) => {
                          return Array.isArray(lift.quotes) && lift.quotes.length > 0
                        })
                        return !hasQuotes && !hasRequests && !hasResponses && !hasLiftQuotes
                      })
                      .map((rfq: any): RFQFlight | null => {
                        try {
                          return convertRfqToRFQFlight(rfq, routeParts, activeChat.date)
                        } catch (error) {
                          console.error('[TripID] Error converting RFQ to RFQFlight:', error, rfq)
                          return null
                        }
                      })
                      .filter((flight: RFQFlight | null): flight is RFQFlight => flight != null)

                    if (rfqsWithoutQuotes.length > 0) {
                      allFormattedQuotes = [...allFormattedQuotes, ...rfqsWithoutQuotes]
                    }
                  }
                } else {
                  // LEGACY PATH: Convert raw API quotes to RFQFlight format
                  // This handles old format responses that need conversion

                  // Convert quotes to the expected format
                  const formattedQuotes = quotes.map((q: any, index: number) => ({
                    id: q.quote_id || q.quoteId || q.id || `quote-${Date.now()}-${index}`,
                    operatorName: q.operator_name || q.operatorName || q.operator?.name || "Unknown Operator",
                    aircraftType: q.aircraft_type || q.aircraftType || q.aircraft?.type || q.aircraft?.model || "Unknown Aircraft",
                    aircraftModel: q.aircraft_model || q.aircraftModel || q.aircraft?.model || q.aircraft_type || q.aircraftType,
                    price: q.sellerPrice?.price || q.total_price || q.price || q.totalPrice?.amount || q.pricing?.total || q.basePrice || 0,
                    currency: q.sellerPrice?.currency || q.currency || q.totalPrice?.currency || q.pricing?.currency || 'USD',
                    score: q.score,
                    ranking: index + 1,
                    operatorRating: q.operator_rating || q.operatorRating || q.operator?.rating,
                    operatorEmail: q.operator_email || q.operatorEmail || q.operator?.email || q.operator?.contact?.email,
                    departureTime: q.departure_time || q.departureTime || q.schedule?.departureTime,
                    arrivalTime: q.arrival_time || q.arrivalTime || q.schedule?.arrivalTime,
                    flightDuration: q.flight_duration || q.flightDuration || q.schedule?.duration || 'TBD',
                    passengerCapacity: q.passenger_capacity || q.passengerCapacity || q.aircraft?.capacity || q.capacity || activeChat.passengers || 0,
                    tailNumber: q.tail_number || q.tailNumber || q.aircraft?.registration || q.aircraft?.tail_number,
                    amenities: q.amenities || q.features || q.aircraft?.amenities || [],
                    rfqStatus: q.sourcingDisplayStatus === 'Accepted' ? 'quoted' :
                              q.sourcingDisplayStatus === 'Declined' ? 'declined' :
                              q.status || q.rfq_status || q.quote_status || 'quoted',
                    isRecommended: index === 0,
                  }))

                  // Convert formatted quotes to RFQFlight format
                  const convertedQuotes: RFQFlight[] = formattedQuotes
                    .map((quote: any) => {
                      try {
                        return convertQuoteToRFQFlight(quote, routeParts, activeChat.date)
                      } catch (error) {
                        console.error('[TripID] Error converting formatted quote to RFQFlight:', error, quote)
                        return null
                      }
                    })
                    .filter((flight: RFQFlight | null): flight is RFQFlight => flight != null)

                  console.log('[TripID] Converted quotes count:', convertedQuotes.length)

                  // Convert RFQs without quotes to RFQFlight format
                  const rfqsWithoutQuotes = rfqs
                    .filter((rfq: any) => {
                      const hasQuotes = Array.isArray(rfq.quotes) && rfq.quotes.length > 0
                      const rfqId = rfq.rfq_id || rfq.id
                      const hasQuoteInQuotesArray = quotes.some((q: any) => {
                        const quoteRfqId = q.rfq_id || q.rfqId || q.rfq_id
                        return quoteRfqId === rfqId
                      })
                      return !hasQuotes && !hasQuoteInQuotesArray
                    })
                    .map((rfq: any): RFQFlight | null => {
                      try {
                        return convertRfqToRFQFlight(rfq, routeParts, activeChat.date)
                      } catch (error) {
                        console.error('[TripID] Error converting RFQ to RFQFlight:', error, rfq)
                        return null
                      }
                    })
                    .filter((flight: RFQFlight | null): flight is RFQFlight => flight != null)

                  console.log('[TripID] RFQs without quotes converted:', rfqsWithoutQuotes.length)

                  // Combine converted quotes and RFQs without quotes
                  allFormattedQuotes = [...convertedQuotes, ...rfqsWithoutQuotes]
                }

                // Create agent message with quotes (after allFormattedQuotes is determined)
                const agentMsg = {
                  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                  type: "agent" as const,
                  content: noRfqsMessage || fullContent || (quotes.length > 0 || allFormattedQuotes.length > 0 ? "I've retrieved your quotes from Avinode. Here are the available options:" : "I've checked for RFQs, but none have been submitted yet. Please follow the instructions in Step 2 to search for flights and send RFQs to operators via the Avinode marketplace."),
                  timestamp: new Date(),
                  showQuotes: quotes.length > 0 || allFormattedQuotes.length > 0,
                }

                const updatedMessages = [...latestMessagesRef.current, agentMsg]
                latestMessagesRef.current = updatedMessages

                // Log formatted quotes for debugging
                console.log('[TripID] Original quotes count:', quotes.length)
                console.log('[TripID] Pre-transformed flights used:', preTransformedFlights.length > 0)
                console.log('[TripID] Total RFQFlight items:', allFormattedQuotes.length)
                console.log('[TripID] Sample flight:', allFormattedQuotes.length > 0 ? allFormattedQuotes[0] : null)
                
                // Log price information for debugging
                if (preTransformedFlights.length > 0) {
                  console.log('[TripID] Pre-transformed flights with prices:', preTransformedFlights.map(f => ({
                    id: f.id,
                    quoteId: f.quoteId,
                    price: f.totalPrice,
                    currency: f.currency,
                    status: f.rfqStatus,
                    operator: f.operatorName,
                  })))
                }
                if (allFormattedQuotes.length > 0) {
                  console.log('[TripID] Formatted quotes with prices:', allFormattedQuotes.map(f => ({
                    id: f.id,
                    quoteId: f.quoteId,
                    price: f.totalPrice,
                    currency: f.currency,
                    status: f.rfqStatus,
                    operator: f.operatorName,
                  })))
                }
                
                // Mark Trip ID as submitted successfully - update both local state and chat state
                setTripIdSubmitted(true)

                // PRIMARY: Save full RFQFlight[] data to rfqFlights field
                // This preserves all fields (departureAirport, arrivalAirport, amenities, rfqStatus, etc.)
                // needed by RFQFlightCard and RFQFlightsList components
                // IMPORTANT: When "View RFQs" or "Update RFQs" is clicked, always replace existing flights with new data
                // Priority: preTransformedFlights (from getRFQFlights MCP tool with prices) > allFormattedQuotes > empty array
                // This ensures prices, status, and message indicators are refreshed correctly
                let rfqFlightsForChatSession = preTransformedFlights.length > 0
                  ? preTransformedFlights  // Use pre-transformed flights from MCP tool (has prices)
                  : (allFormattedQuotes.length > 0 
                      ? allFormattedQuotes  // Fallback to converted quotes
                      : [])  // Clear flights if no data (allows UI to show "no RFQs" state)
                
                // CRITICAL: Merge get_quote results to update prices and status
                // When get_quote is called for each quote ID, it returns the latest prices and status
                // We need to merge this data into the RFQ flights
                // IMPORTANT: get_quote results take PRIORITY over get_rfq results because they contain the most up-to-date data
                if (Object.keys(quoteDetailsMap).length > 0) {
                  console.log('[TripID] 🔄 Merging get_quote results into RFQ flights:', Object.keys(quoteDetailsMap).length, 'quotes')
                  console.log('[TripID] Available quote IDs in map:', Object.keys(quoteDetailsMap))
                  console.log('[TripID] Flight quote IDs:', rfqFlightsForChatSession.map(f => f.quoteId))
                  
                  rfqFlightsForChatSession = rfqFlightsForChatSession.map(flight => {
                    // Try multiple ways to match quote details
                    // 1. Direct match by quoteId
                    let quoteDetails = quoteDetailsMap[flight.quoteId]
                    
                    // 2. Try matching by quote_id field in the map
                    if (!quoteDetails) {
                      for (const [key, details] of Object.entries(quoteDetailsMap)) {
                        if ((details as any).quote_id === flight.quoteId || key === flight.quoteId) {
                          quoteDetails = details as any
                          console.log('[TripID] ✅ Matched quote details using alternative key:', key, 'for flight quoteId:', flight.quoteId)
                          break
                        }
                      }
                    }
                    
                    if (quoteDetails) {
                      const quoteMessage = quoteDetails.notes || quoteDetails.sellerMessage || (flight as any).sellerMessage
                      
                      // CRITICAL: Extract price from get_quote result - this is the AUTHORITATIVE source
                      // get_quote returns: { pricing: quote?.sellerPrice || quote?.pricing, ... }
                      // where sellerPrice is { price: number, currency: string }
                      // and pricing is { total: number, currency: string, base_price: number, ... }
                      // So pricing can be either sellerPrice directly OR a pricing object
                      const pricing = quoteDetails.pricing || 
                                    quoteDetails.sellerPrice || 
                                    null
                      
                      // Extract price value - check multiple possible structures
                      // PRIORITY: pricing.price (from sellerPrice object) > pricing.total > pricing.amount > direct price field
                      let newPrice: number | null = null
                      
                      if (pricing) {
                        // pricing can be sellerPrice { price, currency } or pricing object { total, currency }
                        // Check both structures explicitly
                        if (typeof pricing.price === 'number' && pricing.price > 0) {
                          newPrice = pricing.price
                          console.log('[TripID] ✅ Extracted price from pricing.price:', newPrice)
                        } else if (typeof pricing.total === 'number' && pricing.total > 0) {
                          newPrice = pricing.total
                          console.log('[TripID] ✅ Extracted price from pricing.total:', newPrice)
                        } else if (typeof pricing.amount === 'number' && pricing.amount > 0) {
                          newPrice = pricing.amount
                          console.log('[TripID] ✅ Extracted price from pricing.amount:', newPrice)
                        } else {
                          console.warn('[TripID] ⚠️ Pricing object exists but no valid price field found:', {
                            pricingKeys: Object.keys(pricing),
                            pricingValue: pricing,
                          })
                        }
                      }
                      
                      // Fallback: Check for direct price fields in quoteDetails
                      if (!newPrice || newPrice === 0) {
                        if (typeof (quoteDetails as any).totalPrice === 'number' && (quoteDetails as any).totalPrice > 0) {
                          newPrice = (quoteDetails as any).totalPrice
                          console.log('[TripID] ✅ Extracted price from quoteDetails.totalPrice:', newPrice)
                        } else if (typeof (quoteDetails as any).price === 'number' && (quoteDetails as any).price > 0) {
                          newPrice = (quoteDetails as any).price
                          console.log('[TripID] ✅ Extracted price from quoteDetails.price:', newPrice)
                        }
                      }
                      
                      // CRITICAL: If we still don't have a price from get_quote, but the flight already has a price from get_rfq,
                      // keep that price (don't overwrite with 0)
                      if ((!newPrice || newPrice === 0) && flight.totalPrice > 0) {
                        console.log('[TripID] ℹ️ No price from get_quote, keeping existing price from get_rfq:', flight.totalPrice)
                        newPrice = flight.totalPrice
                      }
                      
                      // Extract currency - prioritize pricing currency
                      const newCurrency = pricing?.currency || 
                                        quoteDetails.currency ||
                                        flight.currency || 
                                        'USD'
                      
                      console.log('[TripID] 💰 Price extraction from get_quote:', {
                        quoteId: flight.quoteId,
                        pricingStructure: pricing ? Object.keys(pricing) : null,
                        pricingValue: pricing,
                        pricingPrice: pricing?.price,
                        pricingTotal: pricing?.total,
                        pricingAmount: pricing?.amount,
                        extractedPrice: newPrice,
                        finalPrice: newPrice || flight.totalPrice,
                        currency: newCurrency,
                        quoteDetailsKeys: Object.keys(quoteDetails),
                        quoteDetailsFull: JSON.stringify(quoteDetails, null, 2).substring(0, 500), // First 500 chars for debugging
                      })
                      
                      // CRITICAL: If we still don't have a price, log the full structure for debugging
                      if (!newPrice || newPrice === 0) {
                        console.error('[TripID] ❌ FAILED to extract price from get_quote result!', {
                          quoteId: flight.quoteId,
                          quoteDetailsFull: quoteDetails,
                          pricingObject: pricing,
                          availableFields: Object.keys(quoteDetails),
                        })
                      }
                      
                      // Determine status from get_quote result
                      // Status can be 'quoted', 'declined', 'pending', etc.
                      // CRITICAL: If we have a price, the status should be 'quoted'
                      let newStatus: RFQFlight['rfqStatus'] = flight.rfqStatus
                      
                      // PRIORITY 1: If we have a valid price (from get_quote OR from pre-transformed flights), status must be 'quoted'
                      // CRITICAL: This check must happen BEFORE checking quoteDetails.status
                      const hasValidPrice = (newPrice && newPrice > 0) || flight.totalPrice > 0
                      if (hasValidPrice) {
                        newStatus = 'quoted'
                        console.log('[TripID] ✅ Setting status to "quoted" because price exists:', {
                          newPrice,
                          existingPrice: flight.totalPrice,
                          finalPrice: newPrice || flight.totalPrice,
                          willOverrideStatus: quoteDetails.status && quoteDetails.status !== 'quoted',
                        })
                      }
                      // PRIORITY 2: Check explicit status from quoteDetails
                      else if (quoteDetails.status === 'quoted' || quoteDetails.status === 'accepted') {
                        newStatus = 'quoted'
                      } else if (quoteDetails.status === 'declined') {
                        newStatus = 'declined'
                      } else if (quoteDetails.status === 'expired') {
                        newStatus = 'expired'
                      } else if (quoteDetails.status === 'pending' || quoteDetails.status === 'sent') {
                        newStatus = 'sent'
                      }
                      
                      console.log('[TripID] ✅ Updating flight with get_quote data:', {
                        quoteId: flight.quoteId,
                        oldPrice: flight.totalPrice,
                        oldStatus: flight.rfqStatus,
                        newPrice,
                        newCurrency,
                        newStatus,
                        hasPricing: !!pricing,
                        pricingStructure: pricing ? Object.keys(pricing) : null,
                        quoteDetailsKeys: Object.keys(quoteDetails),
                        statusUpdated: newStatus !== flight.rfqStatus,
                        priceUpdated: (newPrice && newPrice > 0) && newPrice !== flight.totalPrice,
                      })
                      
                      // Update flight with new data - CRITICAL: Use newPrice if it's valid (> 0)
                      // If newPrice is 0 or null, keep existing price only if it's also > 0
                      // This ensures we don't overwrite a valid price with 0
                      // ALSO: If flight already has a price > 0, use that as fallback
                      const finalPrice = (newPrice && newPrice > 0) 
                        ? newPrice 
                        : (flight.totalPrice > 0 ? flight.totalPrice : 0)
                      
                      // CRITICAL: If we extracted a price but it's 0, log a warning
                      if (newPrice === 0 && flight.totalPrice === 0) {
                        console.warn('[TripID] ⚠️ Both extracted price and existing price are 0!', {
                          quoteId: flight.quoteId,
                          extractedPrice: newPrice,
                          existingPrice: flight.totalPrice,
                          pricingObject: pricing,
                        })
                      }
                      
                      // CRITICAL: If we're about to set price to 0 but flight already has a price, don't overwrite
                      if (finalPrice === 0 && flight.totalPrice > 0) {
                        console.error('[TripID] ❌ CRITICAL: Attempting to overwrite valid price with 0! Keeping existing price.', {
                          quoteId: flight.quoteId,
                          existingPrice: flight.totalPrice,
                          extractedPrice: newPrice,
                          finalPrice,
                        })
                        // Keep the existing price
                        const updatedFlightWithPrice = {
                          ...flight,
                          totalPrice: flight.totalPrice, // Keep existing price
                          currency: newCurrency || flight.currency,
                          rfqStatus: newStatus,
                          sellerMessage: quoteMessage,
                          priceBreakdown: pricing && (pricing.price || pricing.total || pricing.amount) ? {
                            basePrice: pricing.base || pricing.basePrice || pricing.base_price || pricing.base_price || 0,
                            fuelSurcharge: pricing.fuel || pricing.fuelSurcharge || pricing.fuel_surcharge,
                            taxes: pricing.taxes || 0,
                            fees: pricing.fees || 0,
                          } : flight.priceBreakdown,
                          validUntil: quoteDetails.valid_until || quoteDetails.validUntil || flight.validUntil,
                        }
                        
                        // Ensure status is 'quoted' if we have a price
                        if (updatedFlightWithPrice.totalPrice > 0 && updatedFlightWithPrice.rfqStatus === 'unanswered') {
                          updatedFlightWithPrice.rfqStatus = 'quoted'
                        }
                        
                        return updatedFlightWithPrice
                      }
                      
                      const updatedFlight = {
                        ...flight,
                        totalPrice: finalPrice,
                        currency: newCurrency,
                        rfqStatus: newStatus,
                        sellerMessage: quoteMessage,
                        // Update price breakdown if available
                        priceBreakdown: pricing && (pricing.price || pricing.total || pricing.amount) ? {
                          basePrice: pricing.base || pricing.basePrice || pricing.base_price || pricing.base_price || 0,
                          fuelSurcharge: pricing.fuel || pricing.fuelSurcharge || pricing.fuel_surcharge,
                          taxes: pricing.taxes || 0,
                          fees: pricing.fees || 0,
                        } : flight.priceBreakdown,
                        validUntil: quoteDetails.valid_until || quoteDetails.validUntil || flight.validUntil,
                      }
                      
                      // Log if price didn't update when it should have
                      if (updatedFlight.totalPrice === 0 && newPrice && newPrice > 0) {
                        console.error('[TripID] ❌ ERROR: Price should have updated but is still 0!', {
                          quoteId: flight.quoteId,
                          newPrice,
                          updatedPrice: updatedFlight.totalPrice,
                          pricing,
                        })
                      }
                      
                      // Log if status didn't update when price exists
                      if (updatedFlight.totalPrice > 0 && updatedFlight.rfqStatus === 'unanswered') {
                        console.error('[TripID] ❌ ERROR: Status should be "quoted" when price exists!', {
                          quoteId: flight.quoteId,
                          price: updatedFlight.totalPrice,
                          status: updatedFlight.rfqStatus,
                        })
                        // Force status to 'quoted' if we have a price
                        updatedFlight.rfqStatus = 'quoted'
                      }
                      
                      return updatedFlight
                    } else {
                      // No quote details found for this flight's quoteId
                      // This might mean get_quote wasn't called for this quote, or quoteId doesn't match
                      if (flight.quoteId) {
                        console.warn('[TripID] ⚠️ No get_quote result found for quoteId:', flight.quoteId, {
                          availableQuoteIds: Object.keys(quoteDetailsMap),
                          flightQuoteId: flight.quoteId,
                          flightPrice: flight.totalPrice,
                          flightStatus: flight.rfqStatus,
                        })
                      }
                      
                      // CRITICAL: Even without get_quote results, if flight has a price, ensure status is 'quoted'
                      // This handles the case where get_rfq returns flights with prices but get_quote wasn't called
                      if (flight.totalPrice > 0) {
                        if (flight.rfqStatus === 'unanswered' || flight.rfqStatus === 'sent') {
                          console.log('[TripID] ✅ Flight has price but status is unanswered/sent - updating to quoted:', {
                            quoteId: flight.quoteId,
                            price: flight.totalPrice,
                            oldStatus: flight.rfqStatus,
                            newStatus: 'quoted',
                          })
                          return {
                            ...flight,
                            rfqStatus: 'quoted' as const,
                          }
                        }
                      }
                    }
                    return flight
                  })
                  
                  // Log all flights, not just those with get_quote results
                  console.log('[TripID] ✅ Merged get_quote results - total flights:', rfqFlightsForChatSession.length, {
                    flightsWithGetQuote: rfqFlightsForChatSession.filter(f => quoteDetailsMap[f.quoteId]).length,
                    flightsWithoutGetQuote: rfqFlightsForChatSession.filter(f => !quoteDetailsMap[f.quoteId]).length,
                    allFlights: rfqFlightsForChatSession.map(f => ({
                      quoteId: f.quoteId,
                      price: f.totalPrice,
                      status: f.rfqStatus,
                      hasGetQuoteResult: !!quoteDetailsMap[f.quoteId],
                    })),
                  })
                } else {
                  console.warn('[TripID] ⚠️ No get_quote results found to merge!', {
                    preTransformedFlightsCount: preTransformedFlights.length,
                    quoteIdsInFlights: preTransformedFlights.map(f => f.quoteId),
                    message: 'This means the agent did not call get_quote tool, or the results were not included in the response. Prices may be $0.',
                  })
                }
                
                // CRITICAL: Log the final flights array BEFORE updating chat state
                console.log('[TripID] 🔄 FINAL rfqFlightsForChatSession BEFORE onUpdateChat:', {
                  count: rfqFlightsForChatSession.length,
                  source: preTransformedFlights.length > 0 ? 'preTransformedFlights' : 'allFormattedQuotes',
                  flights: rfqFlightsForChatSession.map(f => ({
                    id: f.id,
                    quoteId: f.quoteId,
                    totalPrice: f.totalPrice,
                    currency: f.currency,
                    rfqStatus: f.rfqStatus,
                    operatorName: f.operatorName,
                    priceIsZero: f.totalPrice === 0,
                    statusIsUnanswered: f.rfqStatus === 'unanswered',
                  })),
                })

                // SECONDARY: Also save simplified format to quotes for backward compatibility
                // Components that use the simplified Quote format can still access this
                const quotesForChatSession = allFormattedQuotes.map((flight, index) => ({
                  id: flight.id,
                  operatorName: flight.operatorName,
                  aircraftType: flight.aircraftType,
                  price: flight.totalPrice,
                  ranking: index + 1,
                  operatorRating: flight.operatorRating,
                  departureTime: flight.departureTime,
                  flightDuration: flight.flightDuration,
                  isRecommended: index === 0,
                }))

                // Log what we're updating
                console.log('[TripID] Updating chat with RFQ flights:', {
                  flightsCount: rfqFlightsForChatSession.length,
                  hasPreTransformed: preTransformedFlights.length > 0,
                  hasFormattedQuotes: allFormattedQuotes.length > 0,
                  sampleFlight: rfqFlightsForChatSession.length > 0 ? {
                    id: rfqFlightsForChatSession[0].id,
                    quoteId: rfqFlightsForChatSession[0].quoteId,
                    price: rfqFlightsForChatSession[0].totalPrice,
                    currency: rfqFlightsForChatSession[0].currency,
                    status: rfqFlightsForChatSession[0].rfqStatus,
                    operator: rfqFlightsForChatSession[0].operatorName,
                    hasSellerMessage: !!(rfqFlightsForChatSession[0] as any).sellerMessage,
                  } : null,
                  // Log all flights with prices to verify extraction
                  allFlightsWithPrices: rfqFlightsForChatSession.map(f => ({
                    id: f.id,
                    quoteId: f.quoteId,
                    price: f.totalPrice,
                    currency: f.currency,
                    status: f.rfqStatus,
                    operator: f.operatorName,
                  })),
                })
                
                // IMPORTANT: Always update rfqFlights, even if quotes already exist
                // This ensures prices, status, and messages are refreshed when "View RFQs" or "Update RFQs" is clicked
                // The "Quotes already exist, skipping text parsing" message is from a different useEffect
                // that only handles text parsing - it does NOT prevent tool results from updating here
                console.log('[TripID] Updating chat state - replacing existing RFQ flights with fresh data')
                console.log('[TripID] Previous flights count:', activeChat.rfqFlights?.length || 0)
                console.log('[TripID] New flights count:', rfqFlightsForChatSession.length)
                
                // CRITICAL: Create a completely new array reference to ensure React detects the change
                // This is essential for React to re-render components that depend on rfqFlights
                // Map each flight to a new object to ensure deep immutability
                // IMPORTANT: Explicitly spread all properties to create a completely new object
                const newRfqFlightsArray = rfqFlightsForChatSession.map(flight => {
                  // Create a completely new object with all properties
                  return {
                    ...flight, // Spread all flight properties
                    // Explicitly ensure critical fields are included (defensive programming)
                    totalPrice: flight.totalPrice ?? 0,
                    currency: flight.currency ?? 'USD',
                    rfqStatus: flight.rfqStatus ?? 'unanswered',
                    id: flight.id,
                    quoteId: flight.quoteId,
                  } as RFQFlight
                })
                
                // Log sample flight details to verify price extraction
                if (newRfqFlightsArray.length > 0) {
                  const sampleFlight = newRfqFlightsArray[0]
                  console.log('[TripID] Sample flight details BEFORE updating chat:', {
                    id: sampleFlight.id,
                    quoteId: sampleFlight.quoteId,
                    totalPrice: sampleFlight.totalPrice,
                    currency: sampleFlight.currency,
                    status: sampleFlight.rfqStatus,
                    operator: sampleFlight.operatorName,
                    hasSellerMessage: !!(sampleFlight as any).sellerMessage,
                    previousPrice: activeChat.rfqFlights?.[0]?.totalPrice || 0,
                    priceChanged: sampleFlight.totalPrice !== (activeChat.rfqFlights?.[0]?.totalPrice || 0),
                    // CRITICAL: Verify price is not 0
                    priceIsZero: sampleFlight.totalPrice === 0,
                    priceIsUndefined: sampleFlight.totalPrice === undefined,
                    priceIsNull: sampleFlight.totalPrice === null,
                  })
                  
                  // Log ALL flights to verify prices
                  console.log('[TripID] ALL flights with prices:', newRfqFlightsArray.map(f => ({
                    id: f.id,
                    quoteId: f.quoteId,
                    totalPrice: f.totalPrice,
                    currency: f.currency,
                    priceIsZero: f.totalPrice === 0,
                  })))
                }
                
                // CRITICAL: Log what we're about to update
                console.log('[TripID] 📝 Calling onUpdateChat with:', {
                  chatId: activeChat.id,
                  rfqFlightsCount: newRfqFlightsArray.length,
                  rfqFlights: newRfqFlightsArray.map(f => ({
                    id: f.id,
                    quoteId: f.quoteId,
                    totalPrice: f.totalPrice,
                    currency: f.currency,
                    rfqStatus: f.rfqStatus,
                    priceIsZero: f.totalPrice === 0,
                    statusIsUnanswered: f.rfqStatus === 'unanswered',
                  })),
                  previousRfqFlightsCount: activeChat.rfqFlights?.length || 0,
                  previousPrices: activeChat.rfqFlights?.map(f => ({ id: f.id, price: f.totalPrice, status: f.rfqStatus })) || [],
                  isNewArray: newRfqFlightsArray !== rfqFlightsForChatSession,
                  arrayReferencesMatch: newRfqFlightsArray === activeChat.rfqFlights,
                })
                
                // CRITICAL: If prices are still 0, log detailed debugging info
                const flightsWithZeroPrice = newRfqFlightsArray.filter(f => f.totalPrice === 0)
                if (flightsWithZeroPrice.length > 0) {
                  console.error('[TripID] ❌ ERROR: Updating with flights that still have $0 price!', {
                    count: flightsWithZeroPrice.length,
                    flights: flightsWithZeroPrice.map(f => ({
                      id: f.id,
                      quoteId: f.quoteId,
                      status: f.rfqStatus,
                      operatorName: f.operatorName,
                    })),
                    message: 'This means the API did not return prices, or price extraction failed. Check get_rfq and get_quote tool results above.',
                  })
                }
                
                // CRITICAL: If status is still "unanswered", log detailed debugging info
                const flightsWithUnansweredStatus = newRfqFlightsArray.filter(f => f.rfqStatus === 'unanswered')
                if (flightsWithUnansweredStatus.length > 0) {
                  console.error('[TripID] ❌ ERROR: Updating with flights that still have "unanswered" status!', {
                    count: flightsWithUnansweredStatus.length,
                    flights: flightsWithUnansweredStatus.map(f => ({
                      id: f.id,
                      quoteId: f.quoteId,
                      price: f.totalPrice,
                      operatorName: f.operatorName,
                    })),
                    message: 'This means the API status extraction failed, or operators have not responded yet.',
                  })
                }
                
                onUpdateChat(activeChat.id, {
                  messages: updatedMessages,
                  status: newStatus as typeof activeChat.status,
                  currentStep: 4,
                  tripId: tripId,
                  tripIdSubmitted: true, // Persist tripIdSubmitted to chat state
                  // Save full RFQ flight data (PRIMARY - preserves all fields including prices)
                  // IMPORTANT: This ALWAYS replaces existing rfqFlights to ensure prices and status are updated
                  // CRITICAL: Use new array reference to ensure React detects the change
                  rfqFlights: newRfqFlightsArray,
                  // Save simplified format for backward compatibility (SECONDARY)
                  // Also replace quotes array to ensure prices are updated
                  quotes: quotesForChatSession.length > 0 ? quotesForChatSession : (newRfqFlightsArray.length > 0 ? [] : activeChat.quotes),
                  // Track when RFQs were last fetched (used to show "Last updated" timestamp)
                  rfqsLastFetchedAt: new Date().toISOString(),
                })
                
                console.log('[TripID] ✅ onUpdateChat called with new array reference - state should update now')

                setIsTripIdLoading(false)
                return
              }
            } catch (parseError) {
              console.warn("[TripID] Failed to parse SSE data:", line)
            }
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to submit Trip ID"
      setTripIdError(errorMessage)
      console.error("[TripID] Error:", error)
    } finally {
      setIsTripIdLoading(false)
    }
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
      price: qr.price,
      currency: qr.currency,
      departureAirport: qr.departureAirport,
      arrivalAirport: qr.arrivalAirport,
    }))
  }

  /**
   * Get selected quote details for the drawer
   */
  const getSelectedQuoteDetails = (): QuoteDetails | undefined => {
    if (!selectedQuoteId) return undefined

    // Try to find from quoteRequests first (header display data)
    const quoteRequest = activeChat.quoteRequests?.find((q) => q.id === selectedQuoteId)
    if (quoteRequest) {
      return {
        id: quoteRequest.id,
        rfqId: activeChat.rfpId || '',
        operator: {
          name: quoteRequest.operatorName,
          rating: 4.5, // Default rating - would come from actual data
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
          distanceNm: 500, // Would come from actual data
          departureAirport: quoteRequest.departureAirport,
          arrivalAirport: quoteRequest.arrivalAirport,
        },
        status: quoteRequest.status === 'received' ? 'quoted' : 'unanswered',
      }
    }

    // Fallback to quotes array (from FlightSearchAgent)
    const quote = activeChat.quotes?.find((q) => q.id === selectedQuoteId)
    if (quote) {
      return {
        id: quote.id,
        rfqId: activeChat.rfpId || '',
        operator: {
          name: quote.operatorName,
          rating: quote.operatorRating,
        },
        aircraft: {
          type: quote.aircraftType,
          tail: 'N/A',
          category: 'Jet',
          maxPassengers: activeChat.passengers || 8,
        },
        price: {
          amount: quote.price,
          currency: 'USD',
        },
        flightDetails: {
          flightTimeMinutes: parseInt(quote.flightDuration || '0') || 120,
          distanceNm: 500,
          departureTime: quote.departureTime,
          arrivalTime: quote.arrivalTime,
        },
        status: 'quoted',
      }
    }

    return undefined
  }

  /**
   * Get operator messages for the selected quote
   */
  const getOperatorMessages = (): OperatorMessage[] => {
    if (!selectedQuoteId) return []
    const messages = activeChat.operatorMessages?.[selectedQuoteId] || []
    if (messages.length > 0) return messages

    const fallbackFlight = rfqFlights.find((flight) => (
      flight.quoteId === selectedQuoteId || flight.id === selectedQuoteId
    ))
    const fallbackMessage = fallbackFlight?.sellerMessage?.trim()
    if (!fallbackMessage) return []

    return [{
      id: `seller-message-${selectedQuoteId}`,
      type: 'RESPONSE',
      content: fallbackMessage,
      timestamp: fallbackFlight?.lastUpdated || new Date().toISOString(),
      sender: fallbackFlight?.operatorName,
    }]
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 overflow-hidden">
      {/* Dynamic Chat Header - shows flight name, IDs, and quote requests */}
      <DynamicChatHeader
        activeChat={activeChat}
        flightRequestName={activeChat.generatedName}
        showTripId={!!activeChat.tripId}
        quoteRequests={getQuoteRequestsForHeader()}
        onViewQuoteDetails={handleViewQuoteDetails}
        onCopyTripId={() => console.log('[Chat] Trip ID copied to clipboard')}
      />

      {/* Chat Messages - Fixed height constraint to prevent expansion when RFQ flights load */}
      <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="px-4 py-6 space-y-6">
          <div className="max-w-4xl mx-auto space-y-6">
          {activeChat.messages.map((message) => (
            <div key={message.id} className={cn("flex", message.type === "user" ? "justify-end" : "justify-start text-white")}>
              {message.type === "user" ? (
                /* User messages - keep bubble styling */
                <div className="max-w-[85%] rounded-2xl px-4 py-3 whitespace-pre-wrap shadow-sm bg-black dark:bg-gray-900 text-white">
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <p className="text-xs opacity-60 mt-2">{message.timestamp.toLocaleTimeString()}</p>
                </div>
              ) : (
                /* Agent messages - plain text with avatar + badge, NO bubble */
                <AgentMessage
                  content={message.content}
                  timestamp={message.timestamp}
                  showWorkflow={message.showWorkflow}
                  workflowProps={message.showWorkflow ? {
                    isProcessing: activeChat.status !== "proposal_ready",
                    currentStep: activeChat.currentStep,
                    status: activeChat.status,
                    tripId: activeChat.tripId,
                    deepLink: activeChat.deepLink,
                  } : undefined}
                  showDeepLink={message.showDeepLink}
                  deepLinkData={message.deepLinkData ? {
                    rfpId: message.deepLinkData.rfpId || activeChat.rfpId,
                    tripId: message.deepLinkData.tripId || activeChat.tripId,
                    deepLink: message.deepLinkData.deepLink || (activeChat.tripId ? `https://sandbox.avinode.com/marketplace/mvc/search#preSearch` : undefined),
                    departureAirport: message.deepLinkData.departureAirport || { icao: activeChat.route?.split(' → ')[0] || 'N/A' },
                    arrivalAirport: message.deepLinkData.arrivalAirport || { icao: activeChat.route?.split(' → ')[1] || 'N/A' },
                    departureDate: message.deepLinkData.departureDate || activeChat.date,
                    passengers: message.deepLinkData.passengers || activeChat.passengers,
                  } : undefined}
                  // Trip ID input props for human-in-the-loop workflow
                  // Show Trip ID input when deep link is shown but no quotes received yet
                  showTripIdInput={message.showDeepLink && activeChat.status === "requesting_quotes"}
                  isTripIdLoading={isTripIdLoading}
                  tripIdError={tripIdError}
                  tripIdSubmitted={tripIdSubmitted}
                  onTripIdSubmit={handleTripIdSubmit}
                  // Hide legacy quote comparison when Trip ID is submitted (quotes shown in RFQ list instead)
                  showQuotes={message.showQuotes && !tripIdSubmitted}
                  quotes={activeChat.quotes}
                  showProposal={message.showProposal}
                  chatData={activeChat}
                  showCustomerPreferences={message.showCustomerPreferences}
                  customer={activeChat.customer}
                  onSelectQuote={handleSelectQuote}
                  onDeepLinkClick={() => console.log('[DeepLink] User clicked Avinode marketplace link')}
                  onCopyDeepLink={() => console.log('[DeepLink] User copied deep link')}
                  // RFQ flights for Step 3 display (converted from quotes)
                  // Show quotes whenever we have them, regardless of tripIdSubmitted status
                  // This allows quotes parsed from agent messages to be displayed immediately
                  // Ensure rfqFlights is always an array, never null/undefined
                  rfqFlights={Array.isArray(rfqFlights) && rfqFlights.length > 0 ? rfqFlights.map((flight, index) => {
                    // Determine if messages exist for this flight
                    // CRITICAL: Check operatorMessages[quoteId] for seller messages from quotes
                    // Seller messages are extracted from quote.sellerMessage and stored in operatorMessages
                    const messages = activeChat.operatorMessages && flight.quoteId 
                      ? activeChat.operatorMessages[flight.quoteId] 
                      : []
                    
                    // Log message detection for debugging
                    if (flight.quoteId && messages.length > 0) {
                      console.log('[ChatInterface] Found messages for quote', flight.quoteId, ':', messages.length, 'messages', {
                        messageTypes: messages.map(m => m.type),
                        hasSellerMessage: !!(flight as any).sellerMessage,
                      })
                    }
                    
                    const hasMessages = flight.rfqStatus === 'quoted' && (
                      messages.length > 0 ||
                      !!(flight as any).sellerMessage || // Also check if flight has sellerMessage directly
                      flight.rfqStatus === 'quoted' // If quoted, assume messages may exist (will be verified when user clicks Messages)
                    )

                    const latestMessage = messages.reduce<OperatorMessage | null>((latest, msg) => {
                      if (!latest) return msg
                      const latestTime = new Date(latest.timestamp).getTime()
                      const msgTime = new Date(msg.timestamp).getTime()
                      return msgTime > latestTime ? msg : latest
                    }, null)
                    const operatorMessagePreview =
                      latestMessage?.content?.trim() || (flight as any).sellerMessage
                    
                    // Determine if there are new/unread messages
                    // Messages are "new" if their timestamp is after the last read timestamp for this quote
                    const lastReadAt = activeChat.lastMessagesReadAt?.[flight.quoteId || '']
                    const hasNewMessages = hasMessages && messages.length > 0 && (
                      !lastReadAt || // No read timestamp = all messages are new
                      messages.some(msg => {
                        const msgTime = new Date(msg.timestamp).getTime()
                        const readTime = new Date(lastReadAt).getTime()
                        return msgTime > readTime // Message is newer than last read time
                      })
                    )
                    
                    // Log message indicator calculation for debugging
                    if (flight.quoteId) {
                      console.log('[ChatInterface] Message indicator for quote', flight.quoteId, ':', {
                        hasMessages,
                        messagesCount: messages.length,
                        hasNewMessages,
                        lastReadAt,
                        rfqStatus: flight.rfqStatus,
                      })
                    }
                    
                    return {
                      ...flight,
                      hasMessages,
                      hasNewMessages: hasNewMessages || false,
                      sellerMessage: operatorMessagePreview,
                      // Extract messageId from operatorMessages if available
                      // This is used by get_message tool (GET /tripmsgs/{messageId}) to retrieve specific messages
                      messageId: messages.length > 0
                        ? messages[0]?.id
                        : flight.messageId, // Use messageId from flight data if available (from webhook events)
                    }
                  }) : []}
                  selectedRfqFlightIds={selectedRfqFlightIds}
                  rfqsLastFetchedAt={activeChat.rfqsLastFetchedAt}
                  onRfqFlightSelectionChange={setSelectedRfqFlightIds}
                  onReviewAndBook={handleReviewAndBook}
                  customerEmail={activeChat.customer?.name ? `${activeChat.customer.name.toLowerCase().replace(/\s+/g, '.')}@example.com` : ''}
                  customerName={activeChat.customer?.name || ''}
                  // Pass selected flights for legacy Step 4 display
                  selectedFlights={tripIdSubmitted && activeChat.quotes ? activeChat.quotes.map(q => ({
                    id: q.id,
                    aircraftType: q.aircraftType,
                    aircraftCategory: 'Heavy jet',
                    yearOfMake: 1992,
                    operatorName: q.operatorName,
                    operatorEmail: 'operator@example.com',
                    price: q.price,
                    currency: 'USD',
                    passengerCapacity: 13,
                    hasMedical: false,
                    hasPackage: false,
                    petsAllowed: true,
                    smokingAllowed: true,
                    hasWifi: true,
                    rfqStatus: 'unanswered' as const,
                  })) : []}
                  onViewChat={(flightId, quoteId, messageId) => {
                    handleViewChat(flightId, quoteId, messageId)
                  }}
                  onBookFlight={(flightId, quoteId) => {
                    handleBookFlight(flightId, quoteId)
                  }}
                  onGenerateProposal={(flightId, quoteId) => {
                    handleGenerateProposal(flightId, quoteId)
                  }}
                  // Pipeline dashboard props for inline deals/requests view
                  showPipeline={message.showPipeline}
                  pipelineData={message.pipelineData}
                  onViewRequest={(requestId) => {
                    console.log('[Pipeline] View request:', requestId)
                    // TODO: Navigate to request details or open drawer
                  }}
                  onRefreshPipeline={() => {
                    console.log('[Pipeline] Refresh requested')
                    // Re-send the pipeline query to get fresh data
                    setInputValue("show my pipeline")
                    // Trigger send after a brief delay for state update
                    setTimeout(() => {
                      const form = document.querySelector('form')
                      if (form) {
                        form.dispatchEvent(new Event('submit', { bubbles: true }))
                      }
                    }, 100)
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
                  {/* Jetvision Logo - Dark outlined, 10% bigger than original (24px * 1.10 = 26.46px) */}
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
            <Button
              variant="outline"
              size="sm"
              onClick={onViewWorkflow}
              className="ml-auto text-xs bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
            >
              <Eye className="w-3 h-3 mr-1" />
              Full Workflow
            </Button>
          </div>

          {/* Input Area */}
          <div className="flex items-end space-x-3">
            <div className="flex-1 relative">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message about Flight Request #${activeChat.id}...`}
                disabled={isProcessing}
                className="min-h-[44px] py-3 px-4 pr-12 rounded-xl border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none"
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

      {/* Quote Details Drawer - slides in from right */}
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
