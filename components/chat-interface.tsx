"use client"

import React from "react"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Loader2, Plane, Eye } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ChatSession } from "./chat-sidebar"

// New components for conversational chat interface
import { AgentMessage } from "./chat/agent-message"
import { DynamicChatHeader } from "./chat/dynamic-chat-header"
import { QuoteDetailsDrawer, type QuoteDetails, type OperatorMessage } from "./quote-details-drawer"
import type { QuoteRequest } from "./chat/quote-request-item"
import type { RFQFlight } from "./avinode/rfq-flight-card"
import type { PipelineData } from "@/lib/types/chat-agent"

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
   * Maps amenity/feature strings to the RFQFlight amenities boolean object.
   * Safely handles arrays of strings and provides false defaults for missing values.
   * 
   * @param amenityStrings - Array of amenity strings (e.g., ['wifi', 'pets', 'galley'])
   * @returns Amenities object with boolean values, defaults to false for missing amenities
   */
  const mapAmenitiesFromStrings = (
    amenityStrings?: string[] | readonly string[]
  ): RFQFlight['amenities'] => {
    // Normalize input to array and convert to lowercase for case-insensitive matching
    const normalized = (amenityStrings || []).map((s) => s.toLowerCase().trim())
    
    return {
      wifi: normalized.includes('wifi') || normalized.includes('wi-fi'),
      pets: normalized.includes('pets') || normalized.includes('pet'),
      smoking: normalized.includes('smoking') || normalized.includes('smoke'),
      galley: normalized.includes('galley') || normalized.includes('kitchen'),
      lavatory: normalized.includes('lavatory') || normalized.includes('bathroom') || normalized.includes('restroom'),
      medical: normalized.includes('medical') || normalized.includes('medevac'),
    }
  }

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

  /**
   * Helper function to convert a quote object to RFQFlight format
   * Used both for activeChat.quotes and for quotes parsed from message text
   */
  const convertQuoteToRFQFlight = (quote: any, routeParts: string[], chatDate?: string): RFQFlight => {
    // Validate quote has required fields - if missing critical data, log warning
    if (!quote || (!quote.id && !quote.quote_id && !quote.quoteId)) {
      console.warn('[convertQuoteToRFQFlight] Invalid quote object:', quote)
      // Return a minimal valid RFQFlight to prevent crashes
      return {
        id: `invalid-${Date.now()}`,
        quoteId: `invalid-${Date.now()}`,
        departureAirport: { icao: routeParts[0] || 'N/A', name: routeParts[0] || 'N/A' },
        arrivalAirport: { icao: routeParts[1] || 'N/A', name: routeParts[1] || 'N/A' },
        departureDate: chatDate || activeChat.date || new Date().toISOString().split('T')[0],
        flightDuration: 'TBD',
        aircraftType: 'Unknown Aircraft',
        aircraftModel: 'Unknown Aircraft',
        passengerCapacity: activeChat.passengers || 0,
        operatorName: 'Unknown Operator',
        totalPrice: 0,
        currency: 'USD',
        amenities: { wifi: false, pets: false, smoking: false, galley: false, lavatory: false, medical: false },
        rfqStatus: 'unanswered',
        lastUpdated: new Date().toISOString(),
        isSelected: false,
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        aircraftCategory: 'Midsize jet',
        hasMedical: false,
        hasPackage: false,
      }
    }

    // Safely coerce operatorRating to number or undefined
    // Handles string, number, or undefined/null inputs
    // Uses nullish coalescing (??) to avoid treating 0 as falsy
    const operatorRating = quote.operatorRating != null
      ? (typeof quote.operatorRating === 'number' 
          ? quote.operatorRating 
          : Number(quote.operatorRating))
      : null
    
    // Coerce to number if valid (not NaN), otherwise undefined to avoid type mismatches
    // Allows 0 as a valid rating value
    const normalizedOperatorRating = (operatorRating != null && !isNaN(operatorRating))
      ? operatorRating
      : undefined
    
    // Get currency from quote or activeChat, fallback to USD
    // Note: quote may have currency field even if not in type definition
    const currency = (quote as any).currency || (activeChat as any).currency || 'USD'
    
    // Use departureTime from quote if present, otherwise undefined (let UI handle display)
    // Avoids hardcoded '09:00' fallback that could be misleading
    const departureTime = quote.departureTime || undefined
    
    // Use flightDuration from quote if present, otherwise 'TBD' to indicate unknown
    // Avoids 'N/A' which is less clear than 'TBD' (To Be Determined)
    const flightDuration = quote.flightDuration || 'TBD'
    
    // Set passengerCapacity from quote if available, otherwise fall back to activeChat.passengers
    // Note: RFQFlight interface requires number type, so we use 0 as fallback for missing values
    // UI components should treat 0 as "unknown/not provided" rather than actual zero passengers
    const passengerCapacity = (quote as any).passengerCapacity && (quote as any).passengerCapacity > 0
      ? (quote as any).passengerCapacity
      : (activeChat.passengers != null && activeChat.passengers > 0)
        ? activeChat.passengers
        : 0
    
    // Map amenities from quote.amenities or quote.features with safe defaults
    // Checks both amenities and features arrays, defaults to all false if neither exists
    const amenityStrings = (quote as any).amenities || (quote as any).features || []
    const amenities = mapAmenitiesFromStrings(amenityStrings)
    
    /**
     * Map aircraft type to category (e.g., "Heavy jet", "Light jet")
     * This matches the format shown in the RFQ flight display
     */
    const mapAircraftTypeToCategory = (aircraftType: string): string => {
      const type = aircraftType.toLowerCase();

      if (type.includes('phenom') || type.includes('citation cj') || type.includes('learjet')) {
        return 'Light jet';
      }
      if (type.includes('challenger') || type.includes('citation x') || type.includes('falcon') || type.includes('hawker')) {
        return 'Midsize jet';
      }
      if (type.includes('gulfstream') || type.includes('global 7500') || type.includes('global express')) {
        return 'Heavy jet';
      }
      if (type.includes('ultra') || type.includes('global 7500')) {
        return 'Ultra long range';
      }

      // Default based on common patterns
      if (type.includes('heavy') || type.includes('large')) {
        return 'Heavy jet';
      }
      if (type.includes('light') || type.includes('small')) {
        return 'Light jet';
      }

      return 'Midsize jet'; // Default fallback
    };

    // Get operator email from quote if available
    const operatorEmail = (quote as any).operatorEmail || (quote as any).email || undefined

    // Extract quote ID - handle multiple possible field names
    const quoteId = quote.id || quote.quote_id || quote.quoteId || `quote-${Date.now()}`
    
    // Extract aircraft type - handle multiple possible field names and nested structures
    const aircraftType = quote.aircraftType || quote.aircraft_type || quote.aircraft?.type || quote.aircraft?.model || 'Unknown Aircraft'
    
    // Extract aircraft model - prefer explicit model, fallback to type
    const aircraftModel = (quote as any).aircraftModel || (quote as any).aircraft_model || quote.aircraft?.model || aircraftType
    
    // Extract operator name - handle multiple possible field names and nested structures
    const operatorName = quote.operatorName || quote.operator_name || quote.operator?.name || 'Unknown Operator'
    
    return {
      id: quoteId,
      quoteId: quoteId,
      departureAirport: {
        icao: routeParts[0] || 'N/A',
        name: routeParts[0] || 'N/A',
      },
      arrivalAirport: {
        icao: routeParts[1] || 'N/A',
        name: routeParts[1] || 'N/A',
      },
      departureDate: chatDate || activeChat.date || new Date().toISOString().split('T')[0],
      departureTime,
      flightDuration,
      aircraftType,
      aircraftModel,
      // Extract tail number from quote if available
      tailNumber: (quote as any).tailNumber || (quote as any).tail_number || quote.aircraft?.registration || quote.aircraft?.tail_number || undefined,
      operatorName,
      operatorRating: normalizedOperatorRating,
      operatorEmail,
      totalPrice: quote.price || 0,
      currency,
      passengerCapacity,
      amenities,
      rfqStatus: ((quote as any).rfqStatus || quote.rfqStatus || 'quoted') as 'sent' | 'unanswered' | 'quoted' | 'declined' | 'expired',
      lastUpdated: new Date().toISOString(),
      isSelected: selectedRfqFlightIds.includes(quoteId),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      aircraftCategory: mapAircraftTypeToCategory(aircraftType),
      hasMedical: amenities.medical,
      hasPackage: false, // Default to false - can be updated when package data is available
      // Include deep link from activeChat if available (for viewing flight in Avinode)
      avinodeDeepLink: activeChat.deepLink || undefined,
    }
  }

  // Parse route to get airport info
  const routeParts = activeChat.route?.split(' → ') || ['N/A', 'N/A']

  // Convert quotes from activeChat.quotes to RFQ flights format for display in Step 3
  // Use useMemo to prevent recalculation on every render and avoid side effects during render
  const rfqFlights: RFQFlight[] = useMemo(() => {
    // Convert quotes from activeChat.quotes
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
  }, [activeChat.quotes, activeChat.messages, activeChat.date, routeParts])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [activeChat.messages, isTyping, streamingContent])

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
            flightRequestId: activeChat.id,
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
                  const price = q.total_price || q.price || q.totalPrice?.amount || q.pricing?.total || q.pricing?.base_price || q.basePrice || 0
                  
                  // Extract currency (supports nested pricing object or flat structure)
                  const currency = q.currency || q.totalPrice?.currency || q.pricing?.currency || 'USD'
                  
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
                    rfqStatus: q.status || q.rfq_status || q.quote_status || 'quoted',
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
                if (formattedQuotes && formattedQuotes.length > 0) {
                  updateData.quotes = formattedQuotes
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

    // Only parse if we don't have quotes yet AND trip ID is submitted
    // This ensures we don't overwrite quotes that came from tool results
    if (activeChat.quotes && activeChat.quotes.length > 0) {
      console.log('[Chat] Quotes already exist, skipping text parsing')
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

      // Convert to formatted quotes
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

      // Update chat with parsed quotes
      onUpdateChat(activeChat.id, {
        quotes: formattedQuotes,
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
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
   * Handle Trip ID submission - Step 3: View RFQ Flights
   * Calls get_rfq MCP tool with Trip ID to retrieve all RFQs and quotes for the trip
   */
  const handleTripIdSubmit = async (tripId: string): Promise<void> => {
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

      // Send Trip ID to the chat API - will trigger get_rfq tool with Trip ID
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Here is my Trip ID: ${tripId}`,
          conversationHistory,
          context: {
            flightRequestId: activeChat.id,
            route: activeChat.route,
            passengers: activeChat.passengers,
            date: activeChat.date,
            tripId: tripId, // Include Trip ID in context to trigger get_rfq
          },
        }),
      })

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

                if (data.tool_calls) {
                  for (const toolCall of data.tool_calls) {
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
                        console.log('[TripID] Using pre-transformed flights array:', preTransformedFlights.length, 'flights')

                        // Also populate quotes for backward compatibility with conversion logic
                        // The flights are already in RFQFlight format, so we'll use them directly later
                        quotes = preTransformedFlights

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
                        quotes = toolCall.result.rfqs.flatMap((rfq: any) => {
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
                    }
                  }
                }

                // Create agent message with quotes
                const agentMsg = {
                  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                  type: "agent" as const,
                  content: fullContent || "I've retrieved your quotes from Avinode. Here are the available options:",
                  timestamp: new Date(),
                  showQuotes: quotes.length > 0,
                }

                // Determine final RFQFlight array based on data source
                let allFormattedQuotes: RFQFlight[] = []

                // If we have pre-transformed flights from getRFQFlights, use them directly
                // No conversion needed - data is already in RFQFlight format
                if (preTransformedFlights.length > 0) {
                  console.log('[TripID] Using pre-transformed flights directly:', preTransformedFlights.length)
                  allFormattedQuotes = preTransformedFlights
                } else {
                  // LEGACY PATH: Convert raw API quotes to RFQFlight format
                  // This handles old format responses that need conversion

                  // Convert quotes to the expected format
                  const formattedQuotes = quotes.map((q: any, index: number) => ({
                    id: q.quote_id || q.quoteId || q.id || `quote-${Date.now()}-${index}`,
                    operatorName: q.operator_name || q.operatorName || q.operator?.name || "Unknown Operator",
                    aircraftType: q.aircraft_type || q.aircraftType || q.aircraft?.type || q.aircraft?.model || "Unknown Aircraft",
                    aircraftModel: q.aircraft_model || q.aircraftModel || q.aircraft?.model || q.aircraft_type || q.aircraftType,
                    price: q.total_price || q.price || q.totalPrice?.amount || q.pricing?.total || q.basePrice || 0,
                    currency: q.currency || q.totalPrice?.currency || q.pricing?.currency || 'USD',
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
                    rfqStatus: q.status || q.rfq_status || q.quote_status || 'quoted',
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

                const updatedMessages = [...latestMessagesRef.current, agentMsg]
                latestMessagesRef.current = updatedMessages

                // Log formatted quotes for debugging
                console.log('[TripID] Original quotes count:', quotes.length)
                console.log('[TripID] Pre-transformed flights used:', preTransformedFlights.length > 0)
                console.log('[TripID] Total RFQFlight items:', allFormattedQuotes.length)
                console.log('[TripID] Sample flight:', allFormattedQuotes.length > 0 ? allFormattedQuotes[0] : null)
                
                // Mark Trip ID as submitted successfully - update both local state and chat state
                setTripIdSubmitted(true)

                // Convert RFQFlight[] to ChatSession.quotes format
                // Note: RFQFlight from rfq-flight-card.tsx uses totalPrice
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

                onUpdateChat(activeChat.id, {
                  messages: updatedMessages,
                  status: newStatus as typeof activeChat.status,
                  currentStep: 4,
                  tripId: tripId,
                  tripIdSubmitted: true, // Persist tripIdSubmitted to chat state
                  // Include both quotes and RFQs without quotes
                  quotes: quotesForChatSession.length > 0 ? quotesForChatSession : activeChat.quotes,
                })

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
    if (!selectedQuoteId || !activeChat.operatorMessages) return []
    return activeChat.operatorMessages[selectedQuoteId] || []
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
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
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
                  rfqFlights={Array.isArray(rfqFlights) && rfqFlights.length > 0 ? rfqFlights : []}
                  selectedRfqFlightIds={selectedRfqFlightIds}
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
                  onViewChat={(flightId) => {
                    console.log('[Chat] View chat for flight:', flightId)
                    handleViewQuoteDetails(flightId)
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
                onKeyPress={handleKeyPress}
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
    </div>
  )
}
