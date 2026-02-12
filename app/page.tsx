"use client"

import { useState, useEffect, useRef } from "react"
import { UserButton, useUser } from "@clerk/nextjs"
import { ChatInterface } from "@/components/chat-interface"
import { ChatSidebar, type ChatSession, type OperatorMessage, type OperatorThread } from "@/components/chat-sidebar"
import { initializeOperatorThreads, mergeMessagesIntoThreads } from "@/lib/avinode/operator-threads"
import { LandingPage } from "@/components/landing-page"
import { AppHeader } from "@/components/app-header"
import { useIsMobile, useIsTabletOrSmaller } from "@/hooks/use-mobile"
import { chatSessionsToUIFormat } from "@/lib/utils/chat-session-to-ui"
import { mapDbMessageToChatMessage, type DbMessageLike } from "@/lib/utils/map-db-message-to-ui"
import type { RFQFlight } from "@/components/avinode/rfq-flight-card"

type View = "landing" | "chat"

/**
 * Validates if a string is a valid UUID format
 * Used to prevent API calls with invalid session IDs
 */
const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

export default function JetvisionAgent() {
  const { user, isLoaded } = useUser()
  const [currentView, setCurrentView] = useState<View>("landing")
  const [isProcessing, setIsProcessing] = useState(false)
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [isLoadingRequests, setIsLoadingRequests] = useState(true)
  const [isSessionDataLoading, setIsSessionDataLoading] = useState(false)
  const [archivedSessions, setArchivedSessions] = useState<ChatSession[]>([])
  const [isLoadingArchive, setIsLoadingArchive] = useState(false)
  const isMobile = useIsMobile()
  const isTabletOrSmaller = useIsTabletOrSmaller()
  // Sidebar starts collapsed on initial page load; closed on phone/tablet
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Auto-close sidebar only when viewport shrinks to tablet/phone (resize), not when user opens it on tablet
  const prevTabletOrSmaller = useRef(isTabletOrSmaller)
  useEffect(() => {
    const becameTabletOrSmaller = !prevTabletOrSmaller.current && isTabletOrSmaller
    prevTabletOrSmaller.current = isTabletOrSmaller
    if (becameTabletOrSmaller && sidebarOpen) {
      setSidebarOpen(false)
    }
  }, [isTabletOrSmaller, sidebarOpen])

  /**
   * Load existing flight requests from the database on page mount
   * This ensures flight requests persist across page refreshes
   */
  useEffect(() => {
    // Only load requests when user is authenticated and Clerk is loaded
    if (!isLoaded || !user) {
      setIsLoadingRequests(false)
      return
    }

    /**
     * Fetches flight requests from the API and converts them to chat sessions
     */
    async function loadFlightRequests() {
      try {
        setIsLoadingRequests(true)

        // Fetch chat sessions from API
        const response = await fetch('/api/chat-sessions', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        // Handle API errors
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          
          // Only log unexpected errors (not 404 User not found - expected for unsynced users)
          if (response.status === 404 && errorData.error === 'User not found') {
            // User not synced to database - expected, don't log as error
            // User needs to run: npm run clerk:sync-users
            setChatSessions([])
            setIsLoadingRequests(false)
            return
          }
          
          // Log other errors
          console.error('[JetvisionAgent] Failed to load flight requests:', {
            status: response.status,
            error: errorData.error || errorData.message,
          })

          // Don't throw - just log and continue with empty sessions
          // This allows the app to function even if the API fails
          setChatSessions([])
          setIsLoadingRequests(false)
          return
        }

        // Parse response data
        const data = await response.json()
        const dbSessions = data.sessions || []
        const sessions = chatSessionsToUIFormat(dbSessions)

        // Messages are loaded on-demand when a session is clicked (via loadMessagesForSession)
        // This avoids firing hundreds of API calls on page load (ONEK-204)

        // Update state with loaded sessions, ensuring no duplicates
        // Deduplicate by tripId (when present) OR session ID
        // This prevents multiple cards for the same Avinode trip
        const uniqueSessions = sessions.filter((session, index, self) => {
          // If session has tripId, deduplicate by tripId (keep the first one with this tripId)
          if (session.tripId) {
            return index === self.findIndex((s) => s.tripId === session.tripId)
          }
          // Otherwise deduplicate by session ID
          return index === self.findIndex((s) => s.id === session.id && !s.tripId)
        })
        setChatSessions(uniqueSessions as any)

        // Always show landing page on initial load, even if sessions exist
        // User can manually select chats from the sidebar
        setCurrentView('landing')
        setActiveChatId(null)

        console.log('[JetvisionAgent] Loaded chat sessions:', {
          count: uniqueSessions.length,
          sessionIds: uniqueSessions.map(s => s.id),
        })
      } catch (error) {
        // Handle unexpected errors
        console.error('[JetvisionAgent] Error loading flight requests:', error)
        // Don't throw - allow app to continue functioning
        setChatSessions([])
      } finally {
        setIsLoadingRequests(false)
      }
    }

    // Load requests when component mounts and user is authenticated
    // Only run once when user becomes available (not on every activeChatId change)
    loadFlightRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user?.id]) // Only depend on user authentication state

  /**
   * Load archived sessions on demand (when Archive tab is clicked)
   * Fetches sessions with session_status='archived' from the API
   */
  const loadArchivedSessions = async () => {
    try {
      setIsLoadingArchive(true)

      const response = await fetch('/api/chat-sessions?status=archived', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        console.error('[loadArchivedSessions] Failed to load:', response.status)
        setIsLoadingArchive(false)
        return
      }

      const data = await response.json()
      const dbSessions = data.sessions || []
      const sessions = chatSessionsToUIFormat(dbSessions)

      // Deduplicate by tripId or session ID
      const uniqueSessions = sessions.filter((session, index, self) => {
        if (session.tripId) {
          return index === self.findIndex((s) => s.tripId === session.tripId)
        }
        return index === self.findIndex((s) => s.id === session.id && !s.tripId)
      })

      setArchivedSessions(uniqueSessions as ChatSession[])
      console.log('[loadArchivedSessions] Loaded archived sessions:', uniqueSessions.length)
    } catch (error) {
      console.error('[loadArchivedSessions] Error:', error)
    } finally {
      setIsLoadingArchive(false)
    }
  }

  /**
   * Load messages for a specific chat session from the API
   *
   * @param session - The chat session to load messages for (needs conversationId or requestId)
   * @returns The loaded messages or empty array if failed
   */
  /**
   * Load messages for a specific chat session from the API
   * Prioritizes requestId (most reliable) over conversationId or session.id
   *
   * @param session - The chat session to load messages for (needs conversationId or requestId)
   * @returns The loaded messages or empty array if failed
   */
  const loadMessagesForSession = async (session: ChatSession): Promise<ChatSession['messages']> => {
    // Skip loading for temporary sessions
    if (session.id.startsWith('temp-')) {
      console.log('[loadMessagesForSession] Skipping temp session:', session.id);
      return [];
    }

    // Build ordered list of unique valid IDs to try
    const idsToTry: string[] = [];
    const addIfValid = (id: string | undefined) => {
      if (id && isValidUUID(id) && !idsToTry.includes(id)) idsToTry.push(id);
    };
    addIfValid(session.requestId);
    addIfValid(session.conversationId);
    addIfValid(session.id);

    if (idsToTry.length === 0) {
      console.log('[loadMessagesForSession] No valid UUIDs found:', {
        sessionId: session.id,
        requestId: session.requestId,
        conversationId: session.conversationId,
      });
      return [];
    }

    console.log('[loadMessagesForSession] Loading messages, IDs to try:', idsToTry);

    for (const id of idsToTry) {
      try {
        const response = await fetch(
          `/api/chat-sessions/messages?session_id=${encodeURIComponent(id)}&limit=100`,
          { method: 'GET', headers: { 'Content-Type': 'application/json' } }
        );

        if (response.ok) {
          const data = await response.json();
          const sessionMessages = data.messages || [];
          if (sessionMessages.length > 0) {
            console.log('[loadMessagesForSession] ✅ Loaded via ID:', id, 'count:', sessionMessages.length);
            return sessionMessages.map((msg: DbMessageLike) => mapDbMessageToChatMessage(msg));
          }
        }
      } catch (error) {
        console.warn('[loadMessagesForSession] Error with ID:', id, error);
      }
    }

    console.warn('[loadMessagesForSession] ⚠️ No messages found for any ID:', idsToTry);
    return [];
  };

  /**
   * Load operator threads for a specific trip ID
   * Fetches RFQ data to get operator list and messages to populate threads
   *
   * @param tripId - The Avinode trip ID to load operator threads for
   * @param existingRfqFlights - Optional existing RFQ flights to extract operator info
   * @returns Record of operator threads keyed by operator ID
   */
  const loadOperatorThreadsForSession = async (
    tripId: string,
    existingRfqFlights?: RFQFlight[]
  ): Promise<Record<string, OperatorThread>> => {
    try {
      // First, fetch messages from the API
      const messagesResponse = await fetch(`/api/avinode/messages?trip_id=${encodeURIComponent(tripId)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      let rawMessages: Array<{
        id: string;
        content: string;
        timestamp: string;
        senderType?: string;
        senderId?: string;
        senderName?: string;
        operatorId?: string;
        requestId?: string;
      }> = [];

      if (messagesResponse.ok) {
        const data = await messagesResponse.json();
        // Flatten messages from all quote IDs into array for merging
        const messagesByQuoteId = data.messages || {};
        rawMessages = Object.entries(messagesByQuoteId).flatMap(([quoteId, msgs]) =>
          (msgs as OperatorMessage[]).map(msg => ({
            id: msg.id,
            content: msg.content,
            timestamp: msg.timestamp,
            senderType: msg.type === 'REQUEST' ? 'buyer' : 'seller',
            senderName: msg.sender,
            operatorId: msg.operatorId || quoteId,
            requestId: quoteId,
          }))
        );
      }

      // Initialize threads from RFQ flights if available
      let threads: Record<string, OperatorThread> = {};

      if (existingRfqFlights && existingRfqFlights.length > 0) {
        // Extract operator info from RFQ flights
        const sellers = existingRfqFlights.map(flight => ({
          id: flight.quoteId || flight.id,
          name: flight.operatorName,
          companyName: flight.operatorName,
          status: flight.rfqStatus,
          quoteId: flight.quoteId,
          quote: {
            price: flight.totalPrice,
            currency: flight.currency,
            validUntil: flight.validUntil,
            aircraft: { type: flight.aircraftType },
          },
        }));

        threads = initializeOperatorThreads({ sellers });
      }

      // Merge messages into threads
      if (rawMessages.length > 0) {
        threads = mergeMessagesIntoThreads(threads, rawMessages);
      }

      console.log('[loadOperatorThreadsForSession] Loaded threads:', {
        tripId,
        threadCount: Object.keys(threads).length,
        messageCount: rawMessages.length,
      });

      return threads;
    } catch (error) {
      console.error('[loadOperatorThreadsForSession] Error:', error);
      return {};
    }
  };

  /**
   * Load operator messages for a specific trip ID (legacy format)
   * @deprecated Use loadOperatorThreadsForSession instead
   */
  const loadOperatorMessagesForSession = async (tripId: string): Promise<Record<string, OperatorMessage[]>> => {
    try {
      const response = await fetch(`/api/avinode/messages?trip_id=${encodeURIComponent(tripId)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        console.warn('[loadOperatorMessagesForSession] Failed to load:', { tripId, status: response.status });
        return {};
      }

      const data = await response.json();
      return data.messages || {};
    } catch (error) {
      console.error('[loadOperatorMessagesForSession] Error:', error);
      return {};
    }
  };

  /**
   * Fetch trip details from Avinode API
   * Used to reconstruct session data when database is empty
   *
   * @param tripId - The Avinode trip ID to fetch details for
   * @returns Trip details including route, dates, passengers, and flights
   */
  const fetchTripDetailsFromAvinode = async (tripId: string): Promise<{
    departureAirport: string | null;
    arrivalAirport: string | null;
    departureDate: string | null;
    passengers: number | null;
    rfqFlights: RFQFlight[];
    deepLink: string | null;
  } | null> => {
    try {
      console.log('[fetchTripDetailsFromAvinode] Fetching trip details for:', tripId);

      // Call the chat API with get_rfq command
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `get_rfq ${tripId}`,
          tripId,
          skipMessagePersistence: true,
        }),
      });

      if (!response.ok) {
        console.warn('[fetchTripDetailsFromAvinode] Failed to fetch:', { tripId, status: response.status });
        return null;
      }

      // Parse SSE stream to extract trip details
      const reader = response.body?.getReader();
      if (!reader) return null;

      const decoder = new TextDecoder();
      let buffer = '';
      let tripDetails: {
        departureAirport: string | null;
        arrivalAirport: string | null;
        departureDate: string | null;
        passengers: number | null;
        deepLink: string | null;
      } = {
        departureAirport: null,
        arrivalAirport: null,
        departureDate: null,
        passengers: null,
        deepLink: null,
      };
      let rfqFlights: RFQFlight[] = [];
      const quoteDetailsMap: Record<string, Record<string, unknown>> = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);

            // Extract quote details
            if (parsed.type === 'tool_result' && parsed.name === 'get_quote') {
              const result = parsed.result;
              const apiQuoteId = result?.quote_id || result?.quoteId;
              if (apiQuoteId) {
                quoteDetailsMap[apiQuoteId] = result;
              }
            }

            // Extract RFQ data and trip details
            if (parsed.type === 'tool_result' && parsed.name === 'get_rfq') {
              const result = parsed.result;

              // Extract trip-level details from the result
              if (result?.trip) {
                const trip = result.trip;
                // Extract from trip legs
                if (trip.legs && Array.isArray(trip.legs) && trip.legs.length > 0) {
                  const firstLeg = trip.legs[0];
                  tripDetails.departureAirport = firstLeg.departureAirportId || firstLeg.departure?.icao || null;
                  tripDetails.arrivalAirport = firstLeg.arrivalAirportId || firstLeg.arrival?.icao || null;
                  tripDetails.departureDate = firstLeg.departureDate || firstLeg.date || null;
                  tripDetails.passengers = firstLeg.passengerCount || trip.passengerCount || null;
                }
                tripDetails.deepLink = trip.deepLink || result.deepLink || null;
              }

              // Extract from direct result fields (fallback)
              if (!tripDetails.departureAirport && result.departureAirport) {
                tripDetails.departureAirport = result.departureAirport;
              }
              if (!tripDetails.arrivalAirport && result.arrivalAirport) {
                tripDetails.arrivalAirport = result.arrivalAirport;
              }
              if (!tripDetails.departureDate && result.departureDate) {
                tripDetails.departureDate = result.departureDate;
              }
              if (!tripDetails.passengers && result.passengers) {
                tripDetails.passengers = result.passengers;
              }
              if (!tripDetails.deepLink && result.deepLink) {
                tripDetails.deepLink = result.deepLink;
              }

              // Extract flights
              if (result?.flights && Array.isArray(result.flights)) {
                rfqFlights = result.flights as RFQFlight[];
                // Try to get trip details from first flight if not already set
                if (rfqFlights.length > 0) {
                  const firstFlight = rfqFlights[0];
                  if (!tripDetails.departureAirport && firstFlight.departureAirport?.icao) {
                    tripDetails.departureAirport = firstFlight.departureAirport.icao;
                  }
                  if (!tripDetails.arrivalAirport && firstFlight.arrivalAirport?.icao) {
                    tripDetails.arrivalAirport = firstFlight.arrivalAirport.icao;
                  }
                  if (!tripDetails.departureDate && firstFlight.departureDate) {
                    tripDetails.departureDate = firstFlight.departureDate;
                  }
                  if (!tripDetails.passengers && firstFlight.passengerCapacity) {
                    tripDetails.passengers = firstFlight.passengerCapacity;
                  }
                }
              }

              // Process RFQs array (legacy format)
              if (result?.rfqs && Array.isArray(result.rfqs)) {
                for (const rfq of result.rfqs) {
                  // Extract trip details from RFQ
                  if (!tripDetails.departureAirport && rfq.departure_airport) {
                    tripDetails.departureAirport = rfq.departure_airport;
                  }
                  if (!tripDetails.arrivalAirport && rfq.arrival_airport) {
                    tripDetails.arrivalAirport = rfq.arrival_airport;
                  }
                  if (!tripDetails.departureDate && rfq.departure_date) {
                    tripDetails.departureDate = rfq.departure_date;
                  }
                  if (!tripDetails.passengers && rfq.passengers) {
                    tripDetails.passengers = rfq.passengers;
                  }

                  if (rfq.quotes && Array.isArray(rfq.quotes)) {
                    for (const quote of rfq.quotes) {
                      const flight = transformQuoteToRFQFlight(quote, rfq);
                      if (flight) rfqFlights.push(flight);
                    }
                  } else {
                    const flight = transformRFQToFlight(rfq);
                    if (flight) rfqFlights.push(flight);
                  }
                }
              }
            }
          } catch {
            // Skip unparseable lines
          }
        }
      }

      // Merge quote details into flights
      if (Object.keys(quoteDetailsMap).length > 0 && rfqFlights.length > 0) {
        rfqFlights = rfqFlights.map(flight => {
          const quoteDetails = quoteDetailsMap[flight.quoteId];
          if (!quoteDetails) return flight;

          const sellerPrice = quoteDetails.sellerPrice as Record<string, unknown> | undefined;
          let newPrice = 0;
          let newCurrency = 'USD';

          if (sellerPrice && typeof sellerPrice.price === 'number' && sellerPrice.price > 0) {
            newPrice = sellerPrice.price;
            newCurrency = (sellerPrice.currency as string) || 'USD';
          }

          let newStatus: 'sent' | 'unanswered' | 'quoted' | 'declined' | 'expired' = flight.rfqStatus;
          if (newPrice > 0 && (newStatus === 'unanswered' || newStatus === 'sent')) {
            newStatus = 'quoted';
          }

          return {
            ...flight,
            totalPrice: newPrice > 0 ? newPrice : flight.totalPrice,
            currency: newCurrency,
            rfqStatus: newStatus,
          };
        });
      }

      console.log('[fetchTripDetailsFromAvinode] ✅ Fetched trip details:', {
        tripId,
        departureAirport: tripDetails.departureAirport,
        arrivalAirport: tripDetails.arrivalAirport,
        departureDate: tripDetails.departureDate,
        passengers: tripDetails.passengers,
        deepLink: tripDetails.deepLink ? 'present' : null,
        flightCount: rfqFlights.length,
      });

      return {
        ...tripDetails,
        rfqFlights,
      };
    } catch (error) {
      console.error('[fetchTripDetailsFromAvinode] Error:', error);
      return null;
    }
  };

  /**
   * Load RFQ flights data for a specific trip ID
   * Calls the get_rfq MCP tool to fetch quote data from Avinode
   *
   * @param tripId - The Avinode trip ID to load RFQ flights for
   * @returns The loaded RFQ flights or empty array if failed
   */
  const loadRFQFlightsForSession = async (tripId: string): Promise<RFQFlight[]> => {
    try {
      console.log('[loadRFQFlightsForSession] Fetching RFQ data for trip:', tripId);

      // Call the chat API with get_rfq command to fetch RFQ data
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `get_rfq ${tripId}`,
          tripId,
          skipMessagePersistence: true, // Don't save this as a user message
        }),
      });

      if (!response.ok) {
        console.warn('[loadRFQFlightsForSession] Failed to fetch RFQ data:', {
          tripId,
          status: response.status,
        });
        return [];
      }

      // Parse SSE stream to extract RFQ data
      const reader = response.body?.getReader();
      if (!reader) return [];

      const decoder = new TextDecoder();
      let buffer = '';
      let rfqFlights: RFQFlight[] = [];
      // Track get_quote results to merge prices/status
      const quoteDetailsMap: Record<string, Record<string, unknown>> = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);

            // Handle get_quote results first - these contain latest prices
            if (parsed.type === 'tool_result' && parsed.name === 'get_quote') {
              const result = parsed.result;
              const apiQuoteId = result?.quote_id || result?.quoteId;
              if (apiQuoteId) {
                quoteDetailsMap[apiQuoteId] = result;
                console.log('[loadRFQFlightsForSession] Stored quote details:', {
                  quoteId: apiQuoteId,
                  hasSellerPrice: !!result.sellerPrice,
                  price: result.sellerPrice?.price,
                  currency: result.sellerPrice?.currency,
                });
              }
            }

            // Extract RFQ data from tool call results
            if (parsed.type === 'tool_result' && parsed.name === 'get_rfq') {
              const result = parsed.result;

              // NEW FORMAT: Use pre-transformed flights array from MCP tool (preferred)
              if (result?.flights && Array.isArray(result.flights)) {
                rfqFlights = result.flights as RFQFlight[];
                console.log('[loadRFQFlightsForSession] Using pre-transformed flights:', rfqFlights.length);
                continue;
              }

              // LEGACY: Process RFQs array
              if (result?.rfqs && Array.isArray(result.rfqs)) {
                for (const rfq of result.rfqs) {
                  if (rfq.quotes && Array.isArray(rfq.quotes)) {
                    for (const quote of rfq.quotes) {
                      const flight = transformQuoteToRFQFlight(quote, rfq);
                      if (flight) rfqFlights.push(flight);
                    }
                  } else {
                    const flight = transformRFQToFlight(rfq);
                    if (flight) rfqFlights.push(flight);
                  }
                }
              }

              // Process direct quotes array
              if (result?.quotes && Array.isArray(result.quotes)) {
                for (const quote of result.quotes) {
                  const flight = transformQuoteToRFQFlight(quote, null);
                  if (flight) rfqFlights.push(flight);
                }
              }
            }
          } catch {
            // Skip unparseable lines
          }
        }
      }

      // Merge get_quote results to update prices and status
      if (Object.keys(quoteDetailsMap).length > 0 && rfqFlights.length > 0) {
        console.log('[loadRFQFlightsForSession] Merging quote details into flights:', Object.keys(quoteDetailsMap).length);
        rfqFlights = rfqFlights.map(flight => {
          const quoteDetails = quoteDetailsMap[flight.quoteId];
          if (!quoteDetails) return flight;

          // Extract price from sellerPrice (PRIMARY) or pricing (fallback)
          const sellerPrice = quoteDetails.sellerPrice as Record<string, unknown> | undefined;
          const pricing = quoteDetails.pricing as Record<string, unknown> | undefined;

          let newPrice = 0;
          let newCurrency = 'USD';

          if (sellerPrice && typeof sellerPrice.price === 'number' && sellerPrice.price > 0) {
            newPrice = sellerPrice.price;
            newCurrency = (sellerPrice.currency as string) || 'USD';
          } else if (pricing && typeof pricing.total === 'number' && pricing.total > 0) {
            newPrice = pricing.total;
            newCurrency = (pricing.currency as string) || 'USD';
          }

          // Update status based on price
          let newStatus: 'sent' | 'unanswered' | 'quoted' | 'declined' | 'expired' = flight.rfqStatus;
          if (newPrice > 0 && (newStatus === 'unanswered' || newStatus === 'sent')) {
            newStatus = 'quoted';
          }

          console.log('[loadRFQFlightsForSession] Merged price for flight:', {
            quoteId: flight.quoteId,
            oldPrice: flight.totalPrice,
            newPrice,
            oldStatus: flight.rfqStatus,
            newStatus,
          });

          return {
            ...flight,
            totalPrice: newPrice > 0 ? newPrice : flight.totalPrice,
            currency: newCurrency,
            rfqStatus: newStatus,
          };
        });
      }

      console.log('[loadRFQFlightsForSession] Loaded RFQ flights:', {
        tripId,
        count: rfqFlights.length,
        flights: rfqFlights.map(f => ({
          id: f.id,
          quoteId: f.quoteId,
          price: f.totalPrice,
          status: f.rfqStatus,
          operator: f.operatorName,
        })),
      });

      return rfqFlights;
    } catch (error) {
      console.error('[loadRFQFlightsForSession] Error:', error);
      return [];
    }
  };

  /**
   * Transform a quote object to RFQFlight format
   */
  const transformQuoteToRFQFlight = (quote: Record<string, unknown>, rfq: Record<string, unknown> | null): RFQFlight | null => {
    try {
      const quoteId = (quote.quote_id || quote.quoteId || quote.id || `quote-${Date.now()}`) as string;

      // Extract price - check multiple possible locations
      // FIX: Added estimatedPrice fallback for "Unanswered" RFQs (initial RFQ submission price)
      let price = 0;
      let currency = 'USD';

      if (quote.sellerPrice && typeof quote.sellerPrice === 'object') {
        const sellerPrice = quote.sellerPrice as Record<string, unknown>;
        price = (sellerPrice.price as number) || 0;
        currency = (sellerPrice.currency as string) || 'USD';
      } else if (quote.pricing && typeof quote.pricing === 'object') {
        const pricing = quote.pricing as Record<string, unknown>;
        price = (pricing.total || pricing.amount) as number || 0;
        currency = (pricing.currency as string) || 'USD';
      } else if (quote.price) {
        price = quote.price as number;
      } else if (quote.total_price) {
        price = quote.total_price as number;
      } else if (typeof quote.totalPrice === 'number' && quote.totalPrice > 0) {
        // FIX: Direct totalPrice field (number, not object)
        price = quote.totalPrice as number;
      } else if (quote.totalPrice && typeof quote.totalPrice === 'object') {
        // FIX: totalPrice object with amount
        const totalPriceObj = quote.totalPrice as Record<string, unknown>;
        price = (totalPriceObj.amount as number) || 0;
        currency = (totalPriceObj.currency as string) || currency;
      } else if (quote.estimatedPrice && typeof quote.estimatedPrice === 'object') {
        // FIX: estimatedPrice for initial RFQ submission (Unanswered status)
        const estimatedPrice = quote.estimatedPrice as Record<string, unknown>;
        price = (estimatedPrice.amount as number) || (estimatedPrice.price as number) || 0;
        currency = (estimatedPrice.currency as string) || 'USD';
      } else if (quote.estimated_price && typeof quote.estimated_price === 'object') {
        // FIX: Snake_case variant of estimatedPrice
        const estimatedPrice = quote.estimated_price as Record<string, unknown>;
        price = (estimatedPrice.amount as number) || (estimatedPrice.price as number) || 0;
        currency = (estimatedPrice.currency as string) || 'USD';
      }

      // Determine status
      let rfqStatus: 'sent' | 'unanswered' | 'quoted' | 'declined' | 'expired' = 'unanswered';
      if (quote.sourcingDisplayStatus === 'Accepted' || price > 0) {
        rfqStatus = 'quoted';
      } else if (quote.sourcingDisplayStatus === 'Declined') {
        rfqStatus = 'declined';
      } else if (quote.status) {
        const status = (quote.status as string).toLowerCase();
        if (status === 'quoted' || status === 'accepted') rfqStatus = 'quoted';
        else if (status === 'declined') rfqStatus = 'declined';
        else if (status === 'expired') rfqStatus = 'expired';
        else if (status === 'sent' || status === 'pending') rfqStatus = 'sent';
      }

      const flight: RFQFlight = {
        id: quoteId,
        quoteId,
        departureAirport: { icao: 'N/A', name: 'N/A' },
        arrivalAirport: { icao: 'N/A', name: 'N/A' },
        departureDate: (quote.departure_date || rfq?.departure_date || new Date().toISOString().split('T')[0]) as string,
        departureTime: quote.departure_time as string | undefined,
        flightDuration: (quote.flight_duration || quote.flightDuration || 'TBD') as string,
        aircraftType: (quote.aircraft_type || quote.aircraftType || (quote.aircraft as Record<string, unknown>)?.type || 'Unknown Aircraft') as string,
        aircraftModel: (quote.aircraft_type || quote.aircraftType || 'Unknown Aircraft') as string,
        tailNumber: quote.tail_number as string | undefined,
        passengerCapacity: (quote.passenger_capacity || quote.passengerCapacity || 0) as number,
        operatorName: (quote.operator_name || quote.operatorName || (quote.operator as Record<string, unknown>)?.name || 'Unknown Operator') as string,
        operatorRating: quote.operator_rating as number | undefined,
        operatorEmail: quote.operator_email as string | undefined,
        totalPrice: price,
        currency,
        amenities: {
          wifi: false,
          pets: false,
          smoking: false,
          galley: false,
          lavatory: false,
          medical: false,
        },
        rfqStatus,
        lastUpdated: new Date().toISOString(),
        isSelected: false,
        validUntil: quote.valid_until as string | undefined,
        sellerMessage: quote.sellerMessage as string | undefined,
      };

      return flight;
    } catch (error) {
      console.error('[transformQuoteToRFQFlight] Error:', error);
      return null;
    }
  };

  /**
   * Transform an RFQ (without quotes) to RFQFlight format as placeholder
   * FIX: Extract initial/estimated price from RFQ data instead of hardcoding 0
   */
  const transformRFQToFlight = (rfq: Record<string, unknown>): RFQFlight | null => {
    try {
      const rfqId = (rfq.rfq_id || rfq.id || `rfq-${Date.now()}`) as string;

      // FIX: Extract initial/estimated price from RFQ data
      let price = 0;
      let currency = 'USD';

      if (rfq.estimatedPrice && typeof rfq.estimatedPrice === 'object') {
        const estimatedPrice = rfq.estimatedPrice as Record<string, unknown>;
        price = (estimatedPrice.amount as number) || (estimatedPrice.price as number) || 0;
        currency = (estimatedPrice.currency as string) || 'USD';
      } else if (rfq.estimated_price && typeof rfq.estimated_price === 'object') {
        const estimatedPrice = rfq.estimated_price as Record<string, unknown>;
        price = (estimatedPrice.amount as number) || (estimatedPrice.price as number) || 0;
        currency = (estimatedPrice.currency as string) || 'USD';
      } else if (rfq.pricing && typeof rfq.pricing === 'object') {
        const pricing = rfq.pricing as Record<string, unknown>;
        price = (pricing.total || pricing.amount) as number || 0;
        currency = (pricing.currency as string) || 'USD';
      } else if (typeof rfq.totalPrice === 'number') {
        price = rfq.totalPrice as number;
      } else if (rfq.totalPrice && typeof rfq.totalPrice === 'object') {
        const totalPriceObj = rfq.totalPrice as Record<string, unknown>;
        price = (totalPriceObj.amount as number) || 0;
        currency = (totalPriceObj.currency as string) || 'USD';
      }

      // Determine status based on price
      let rfqStatus: 'sent' | 'unanswered' | 'quoted' | 'declined' | 'expired' = 'unanswered';
      if (price > 0) {
        rfqStatus = 'quoted';
      }

      const flight: RFQFlight = {
        id: rfqId,
        quoteId: rfqId,
        departureAirport: { icao: 'N/A', name: 'N/A' },
        arrivalAirport: { icao: 'N/A', name: 'N/A' },
        departureDate: (rfq.departure_date || new Date().toISOString().split('T')[0]) as string,
        flightDuration: 'TBD',
        aircraftType: 'Aircraft TBD',
        aircraftModel: 'Aircraft TBD',
        passengerCapacity: (rfq.passengers || 0) as number,
        operatorName: 'Awaiting quotes',
        totalPrice: price,
        currency,
        amenities: {
          wifi: false,
          pets: false,
          smoking: false,
          galley: false,
          lavatory: false,
          medical: false,
        },
        rfqStatus,
        lastUpdated: new Date().toISOString(),
        isSelected: false,
      };

      return flight;
    } catch (error) {
      console.error('[transformRFQToFlight] Error:', error);
      return null;
    }
  };

  /**
   * Handle chat selection from sidebar
   * Loads full conversation messages, RFQ flights, and operator threads for the selected chat
   * Falls back to Avinode API when database content is missing
   *
   * @param chatId - The ID of the chat to select
   */
  const handleSelectChat = async (chatId: string) => {
    const t0 = performance.now();
    setActiveChatId(chatId)
    setCurrentView("chat")
    setIsSessionDataLoading(true)

    // Find the current session
    const session = chatSessions.find((s) => s.id === chatId);
    if (!session) {
      console.warn('[handleSelectChat] Session not found:', chatId);
      setIsSessionDataLoading(false)
      return;
    }

    // Skip loading for temporary sessions
    if (chatId.startsWith('temp-')) {
      console.log('[handleSelectChat] Skipping load - temp session:', chatId);
      setIsSessionDataLoading(false)
      return;
    }

    // UUID validation for debugging proposal persistence
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    console.log('[handleSelectChat] 🎯 Loading data for session:', {
      chatId,
      requestId: session.requestId,
      conversationId: session.conversationId,
      tripId: session.tripId,
      hasValidRequestIdUUID: session.requestId ? uuidRegex.test(session.requestId) : false,
      hasValidConversationIdUUID: session.conversationId ? uuidRegex.test(session.conversationId) : false,
      hasValidIdUUID: session.id ? uuidRegex.test(session.id) : false,
      currentMessageCount: session.messages?.length || 0,
      currentRFQFlightCount: session.rfqFlights?.length || 0,
      currentOperatorThreadCount: session.operatorThreads ? Object.keys(session.operatorThreads).length : 0,
    });

    // rfqFlights come from the DB JOIN in GET /api/chat-sessions — no separate Avinode fetch needed
    const rfqFlights: RFQFlight[] = session.rfqFlights || [];

    if (session.tripId && rfqFlights.length === 0) {
      console.warn('[handleSelectChat] ⚠️ RFQ data missing from DB for trip:', session.tripId,
        '— ChatInterface auto-load will handle RFQ fetching after session loads');
    }

    // Load messages and operator threads in parallel — no data dependency between them
    const needsOperatorThreads = session.tripId && (!session.operatorThreads || Object.keys(session.operatorThreads).length === 0);

    const [messages, operatorThreads] = await Promise.all([
      // 1. Load messages from database
      (session.requestId || session.conversationId)
        ? loadMessagesForSession(session)
        : Promise.resolve(session.messages || []),

      // 2. Load operator threads (uses session.rfqFlights — param is optional)
      (needsOperatorThreads && session.tripId)
        ? loadOperatorThreadsForSession(session.tripId, session.rfqFlights || [])
        : Promise.resolve(session.operatorThreads || {}),
    ]);

    const t1 = performance.now();
    console.log(`[handleSelectChat] ⏱️ Data loading: ${(t1 - t0).toFixed(0)}ms`);

    // Update session with loaded data
    // Always update messages if we loaded them (even if count is 0, to ensure we have real data)
    const hasNewData = messages.length > 0 || rfqFlights.length > 0 || Object.keys(operatorThreads).length > 0 || (session.requestId || session.conversationId);
    
    if (hasNewData) {
      setChatSessions((prevSessions) =>
        prevSessions.map((s) => {
          if (s.id !== chatId) return s;

          const updates: Partial<ChatSession> = {};

          // Always update messages if we have a requestId/conversationId (to ensure real data from DB)
          if (session.requestId || session.conversationId) {
            // Use loaded messages if available, otherwise keep existing
            if (messages.length > 0 || !s.messages || s.messages.length === 0) {
              updates.messages = messages;
            }
          }

          // Update RFQ flights from DB JOIN data if session state is stale
          if (rfqFlights.length > 0 && (!s.rfqFlights || s.rfqFlights.length === 0)) {
            updates.rfqFlights = rfqFlights;
            // Update quote counts
            const quotedCount = rfqFlights.filter(f => f.rfqStatus === 'quoted').length;
            updates.quotesReceived = quotedCount;
            updates.quotesTotal = rfqFlights.length;
          }

          if (needsOperatorThreads && Object.keys(operatorThreads).length > 0) {
            updates.operatorThreads = operatorThreads;
            // Also set legacy operatorMessages for backward compatibility
            const legacyMessages: Record<string, OperatorMessage[]> = {};
            for (const [opId, thread] of Object.entries(operatorThreads)) {
              if (thread.messages.length > 0) {
                legacyMessages[opId] = thread.messages;
              }
            }
            if (Object.keys(legacyMessages).length > 0) {
              updates.operatorMessages = legacyMessages;
            }
          }

          // Also update messages if we created synthetic ones
          if (messages.length > 0 && !updates.messages) {
            updates.messages = messages;
          }

          const updatedSession = { ...s, ...updates };
          // Log requestId preservation for debugging proposal persistence
          console.log('[handleSelectChat] 🔒 Session requestId after update:', {
            chatId,
            originalRequestId: s.requestId,
            updatedRequestId: updatedSession.requestId,
            originalConversationId: s.conversationId,
            updatedConversationId: updatedSession.conversationId,
            requestIdPreserved: s.requestId === updatedSession.requestId,
          });
          return updatedSession;
        })
      );

      console.log('[handleSelectChat] ✅ Loaded and updated session data:', {
        chatId,
        requestId: session.requestId,
        conversationId: session.conversationId,
        messageCount: messages.length,
        messageSample: messages.length > 0 ? {
          firstMessage: messages[0]?.content?.substring(0, 50),
          lastMessage: messages[messages.length - 1]?.content?.substring(0, 50),
        } : 'No messages',
        rfqFlightCount: rfqFlights.length,
        operatorThreadCount: Object.keys(operatorThreads).length,
        operatorThreadDetails: Object.entries(operatorThreads).map(([id, t]) => ({
          operatorId: id,
          operatorName: t.operatorName,
          status: t.status,
          messageCount: t.messages.length,
          hasQuote: !!t.quote,
        })),
        rfqFlightPrices: rfqFlights.map(f => ({ 
          operator: f.operatorName, 
          price: f.totalPrice, 
          status: f.rfqStatus,
          quoteId: f.quoteId,
        })),
      });
    } else {
      console.log('[handleSelectChat] ⚠️ No new data loaded for session:', {
        chatId,
        hasRequestId: !!session.requestId,
        hasConversationId: !!session.conversationId,
        hasTripId: !!session.tripId,
        currentMessageCount: session.messages?.length || 0,
      });
    }

    setIsSessionDataLoading(false)
    const t2 = performance.now();
    console.log(`[handleSelectChat] ⏱️ Total: ${(t2 - t0).toFixed(0)}ms`);
  }

  /**
   * Creates a new chat session when user starts a conversation
   * 
   * Note: The actual request will be created in the database when the
   * chat API processes the message. This creates a temporary session
   * that will be replaced with the persisted one once the request is saved.
   * 
   * @param message - Initial user message
   */
  const handleStartChat = (message: string) => {
    // Generate a temporary ID for the new chat
    // This will be replaced with the actual request ID once saved to database
    const tempChatId = `temp-${Date.now()}`
    const newChat: ChatSession = {
      id: tempChatId,
      route: "Select route",
      passengers: 1,
      date: "Select date",
      status: "understanding_request", // Start at step 1 - will be updated by API response
      currentStep: 1,
      totalSteps: 10,
      // Don't add the message here - ChatInterface will add it when calling the API
      // This prevents duplicate messages from appearing
      messages: [],
      // Flag to indicate this chat needs an initial API call
      needsInitialApiCall: true,
      initialUserMessage: message,
    }
    // Add new chat to the beginning of the list
    setChatSessions([newChat, ...chatSessions])
    setActiveChatId(newChat.id)
    setCurrentView("chat")
    // Open sidebar automatically when a new trip/flight request is created
    // This ensures the user can see the new flight request card in the sidebar
    setSidebarOpen(true)
  }

  const handleNewChat = async () => {
    // When starting a new chat, always show the landing page
    // User can start a conversation from the landing page
    setCurrentView("landing")
    setActiveChatId(null)
    setSidebarOpen(true)
  }

  const handleUpdateChat = (chatId: string, updates: Partial<ChatSession>) => {
    // If we're updating the session ID (from temp to real), update activeChatId
    // This happens when the API returns a real conversation_id/chat_session_id
    if (updates.id && updates.id !== chatId && activeChatId === chatId) {
      console.log('[handleUpdateChat] 🔄 Updating activeChatId from temp to real:', {
        from: chatId,
        to: updates.id,
      })
      setActiveChatId(updates.id)
    }

    setChatSessions((prevSessions) => {
      // DEDUPLICATION: If we're changing the ID, check if a session with the new ID already exists
      // This prevents duplicates when the same session is loaded from database while temp session exists
      if (updates.id && updates.id !== chatId) {
        const existingWithNewId = prevSessions.find((s) => s.id === updates.id && s.id !== chatId)
        if (existingWithNewId) {
          console.log('[handleUpdateChat] ⚠️ Removing duplicate session - new ID already exists:', {
            tempId: chatId,
            existingId: updates.id,
          })
          // Remove the session we're updating (the temp one) and keep the existing one
          // But merge any new data into the existing one
          return prevSessions
            .filter((s) => s.id !== chatId) // Remove temp session
            .map((s) => {
              if (s.id === updates.id) {
                // Merge updates into existing session
                return { ...s, ...updates }
              }
              return s
            })
        }
      }

      // DEDUPLICATION BY TRIP ID: If we're setting a tripId, check if another session already has it
      // This prevents multiple cards for the same Avinode trip
      if (updates.tripId) {
        const existingWithTripId = prevSessions.find(
          (s) => s.tripId === updates.tripId && s.id !== chatId
        )
        if (existingWithTripId) {
          console.log('[handleUpdateChat] ⚠️ Removing duplicate session - tripId already exists on another session:', {
            currentSessionId: chatId,
            existingSessionId: existingWithTripId.id,
            tripId: updates.tripId,
          })
          // Keep the current session (which is being updated) and remove the duplicate
          // Merge any useful data from the duplicate into the current session
          const mergedUpdates = {
            ...updates,
            // Preserve messages from the duplicate if current has none
            messages: updates.messages?.length
              ? updates.messages
              : (existingWithTripId.messages?.length ? existingWithTripId.messages : []),
            // Preserve rfqFlights from the duplicate if current has none
            rfqFlights: updates.rfqFlights?.length
              ? updates.rfqFlights
              : existingWithTripId.rfqFlights,
          }
          return prevSessions
            .filter((s) => s.id !== existingWithTripId.id) // Remove duplicate with same tripId
            .map((s) => {
              if (s.id === chatId) {
                return { ...s, ...mergedUpdates }
              }
              return s
            })
        }
      }

      const updatedSessions = prevSessions.map((session) => {
        if (session.id === chatId) {
          // Create a completely new object to ensure React detects the change
          // This is especially important for nested arrays like rfqFlights
          const updatedSession = { ...session, ...updates }

          // CRITICAL: If rfqFlights is being updated, ensure it's a new array reference
          // This forces React to detect the change and trigger re-renders
          if (updates.rfqFlights) {
            updatedSession.rfqFlights = Array.isArray(updates.rfqFlights)
              ? [...updates.rfqFlights] // Create new array reference
              : updates.rfqFlights
          }

          // Also ensure operatorMessages is a new object reference if updated
          if (updates.operatorMessages) {
            updatedSession.operatorMessages = { ...updates.operatorMessages }
          }

          console.log('[handleUpdateChat] ✅ Updated session:', {
            chatId,
            newId: updates.id || chatId,
            conversationId: updatedSession.conversationId,
            requestId: updatedSession.requestId,
            // Trip-related fields for debugging sidebar update issue
            tripId: updatedSession.tripId,
            route: updatedSession.route,
            date: updatedSession.date,
            passengers: updatedSession.passengers,
            generatedName: updatedSession.generatedName,
            deepLink: updatedSession.deepLink ? 'SET' : undefined,
            hasRfqFlights: !!updatedSession.rfqFlights,
            rfqFlightsCount: updatedSession.rfqFlights?.length || 0,
            samplePrice: updatedSession.rfqFlights?.[0]?.totalPrice,
            sampleStatus: updatedSession.rfqFlights?.[0]?.rfqStatus,
          })

          return updatedSession
        }
        return session
      })

      return updatedSessions
    })
  }

  /**
   * Handle cancellation of a chat session RFQ
   * Cancels the RFQ in Avinode and updates the request status
   * 
   * @param chatId - The ID of the chat session to cancel
   */
  const handleCancelChat = async (chatId: string) => {
    try {
      // Find the session to get the requestId
      const session = chatSessions.find((s) => s.id === chatId)
      if (!session) {
        console.error('[handleCancelChat] Session not found:', chatId)
        return
      }

      // If it's a temporary session, just remove it from state
      if (chatId.startsWith('temp-')) {
        setChatSessions((prevSessions) => prevSessions.filter((s) => s.id !== chatId))
        if (activeChatId === chatId) {
          setActiveChatId(null)
          setCurrentView('landing')
        }
        return
      }

      // For persisted sessions, cancel via API
      const requestId = session.requestId || chatId

      // Call PATCH API endpoint to cancel
      const response = await fetch('/api/requests', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: requestId,
          action: 'cancel',
          reason: 'Cancelled by user',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('[handleCancelChat] Failed to cancel request:', {
          requestId,
          status: response.status,
          error: errorData.error || errorData.message,
        })
        alert(`Failed to cancel RFQ: ${errorData.error || errorData.message}`)
        return
      }

      // Remove cancelled session from active chats
      // Cancelled requests are no longer active, so remove from UI
      setChatSessions((prevSessions) => prevSessions.filter((s) => s.id !== chatId))

      // If this was the active chat, switch to landing page or select another chat
      if (activeChatId === chatId) {
        const remainingSessions = chatSessions.filter((s) => s.id !== chatId)
        if (remainingSessions.length > 0) {
          setActiveChatId(remainingSessions[0].id)
          setCurrentView('chat')
        } else {
          setActiveChatId(null)
          setCurrentView('landing')
        }
      }

      console.log('[handleCancelChat] Successfully cancelled RFQ:', chatId)
    } catch (error) {
      console.error('[handleCancelChat] Unexpected error:', error)
      alert('An unexpected error occurred while cancelling the RFQ')
    }
  }

  /**
   * Handle archiving of a chat session
   * Archives the request (only for completed/booked requests)
   * 
   * @param chatId - The ID of the chat session to archive
   */
  const handleArchiveChat = async (chatId: string) => {
    try {
      // Find the session to get the requestId
      const session = chatSessions.find((s) => s.id === chatId)
      if (!session) {
        console.error('[handleArchiveChat] Session not found:', chatId)
        return
      }

      // Block archiving sessions that are still in early progress
      const isInProgress = session.status === 'analyzing_options' ||
                        session.status === 'requesting_quotes' ||
                        session.status === 'searching_aircraft' ||
                        session.status === 'understanding_request';
      if (isInProgress) {
        alert('Cannot archive requests that are still in progress')
        return
      }

      // If it's a temporary session, just remove it from state
      if (chatId.startsWith('temp-')) {
        setChatSessions((prevSessions) => prevSessions.filter((s) => s.id !== chatId))
        if (activeChatId === chatId) {
          setActiveChatId(null)
          setCurrentView('landing')
        }
        return
      }

      // For persisted sessions, archive via API
      const requestId = session.requestId || chatId

      // Determine current_step for the archive (e.g., closed_won after payment)
      const archiveStep = session.status === 'closed_won' ? 'closed_won' : undefined

      // Call PATCH API endpoint to archive
      const response = await fetch('/api/requests', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: requestId,
          action: 'archive',
          ...(archiveStep && { current_step: archiveStep }),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('[handleArchiveChat] Failed to archive request:', {
          requestId,
          status: response.status,
          error: errorData.error || errorData.message,
        })
        alert(`Failed to archive request: ${errorData.error || errorData.message}`)
        return
      }

      // Move session from active to archived
      setChatSessions((prevSessions) => {
        const archivedSession = prevSessions.find((s) => s.id === chatId)
        if (archivedSession) {
          // Add to archived sessions with updated status
          setArchivedSessions((prev) => {
            // Don't add duplicates
            if (prev.some((s) => s.id === archivedSession.id)) return prev
            return [{ ...archivedSession, status: 'closed_won' as const }, ...prev]
          })
        }
        return prevSessions.filter((s) => s.id !== chatId)
      })

      // If this was the active chat, switch to landing page or select another chat
      if (activeChatId === chatId) {
        const remainingSessions = chatSessions.filter((s) => s.id !== chatId)
        if (remainingSessions.length > 0) {
          setActiveChatId(remainingSessions[0].id)
          setCurrentView('chat')
        } else {
          setActiveChatId(null)
          setCurrentView('landing')
        }
      }

      console.log('[handleArchiveChat] Successfully archived chat session:', chatId)
    } catch (error) {
      console.error('[handleArchiveChat] Unexpected error:', error)
      alert('An unexpected error occurred while archiving the chat session')
    }
  }

  /**
   * Handle deletion of a chat session
   * Deletes the request from the database and removes it from the UI
   * 
   * @param chatId - The ID of the chat session to delete
   */
  const handleDeleteChat = async (chatId: string) => {
    try {
      // Find the session to get the requestId
      const session = chatSessions.find((s) => s.id === chatId)
      if (!session) {
        console.error('[handleDeleteChat] Session not found:', chatId)
        alert('Session not found')
        return
      }

      // If it's a temporary session (starts with "temp-"), just remove it from state
      if (chatId.startsWith('temp-')) {
        setChatSessions((prevSessions) => prevSessions.filter((s) => s.id !== chatId))
        
        // If this was the active chat, switch to landing page
        if (activeChatId === chatId) {
          setActiveChatId(null)
          setCurrentView('landing')
        }
        return
      }

      // For persisted sessions, delete from database
      // The session might have:
      // 1. session.requestId - the actual request ID (preferred)
      // 2. session.id - might be request ID OR chat_session ID
      // 
      // If session.requestId is not set, we need to look it up from chat_sessions table
      // because session.id might be a chat_session ID, not a request ID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      
      // Try to find the actual request ID
      let requestId: string | null = null
      
      console.log('[handleDeleteChat] Starting request ID resolution:', {
        chatId,
        sessionId: session.id,
        sessionRequestId: session.requestId,
        hasRequestId: !!session.requestId,
      })
      
      // First, try session.requestId if it exists and is a valid UUID
      if (session.requestId && uuidRegex.test(session.requestId)) {
        requestId = session.requestId
        console.log('[handleDeleteChat] Using session.requestId:', requestId)
      }
      // If session.requestId is not available, try to look it up from chat_sessions
      else if (uuidRegex.test(chatId)) {
        console.log('[handleDeleteChat] session.requestId not available, looking up chat_session...')
        // The chatId might be a chat_session ID, so we need to look up the request_id
        console.log('[handleDeleteChat] Looking up chat_session to find request_id:', chatId)
        try {
          const chatSessionResponse = await fetch(`/api/chat-sessions?id=${encodeURIComponent(chatId)}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          })
          
          console.log('[handleDeleteChat] Chat session API response status:', chatSessionResponse.status)
          
          if (chatSessionResponse.ok) {
            const chatSessionData = await chatSessionResponse.json()
            console.log('[handleDeleteChat] Chat session API response data:', chatSessionData)
            
            // API returns { sessions: [...] } format
            const sessions = chatSessionData.sessions || []
            const chatSession = Array.isArray(sessions) 
              ? sessions.find((s: { id: string }) => s.id === chatId)
              : (sessions.length === 1 ? sessions[0] : null)
            
            console.log('[handleDeleteChat] Found chat session:', chatSession)
            
            if (chatSession) {
              // Try request_id field first
              if (chatSession.request_id && uuidRegex.test(chatSession.request_id)) {
                requestId = chatSession.request_id
                console.log('[handleDeleteChat] Found request_id from chat_sessions:', requestId)
              } 
              // Then try request.id from the joined request object
              else if (chatSession.request?.id && uuidRegex.test(chatSession.request.id)) {
                requestId = chatSession.request.id
                console.log('[handleDeleteChat] Found request.id from chat_sessions:', requestId)
              } else {
                console.warn('[handleDeleteChat] Chat session found but no request_id:', {
                  chatSessionId: chatId,
                  hasRequestId: !!chatSession.request_id,
                  hasRequest: !!chatSession.request,
                  requestIdValue: chatSession.request_id,
                  requestIdFromRequest: chatSession.request?.id,
                  fullChatSession: JSON.stringify(chatSession, null, 2),
                })
              }
            } else {
              console.warn('[handleDeleteChat] Chat session not found in response:', {
                chatId,
                sessionsCount: sessions.length,
                sessions: sessions,
              })
            }
          } else {
            const errorText = await chatSessionResponse.text()
            console.warn('[handleDeleteChat] Chat session API error:', {
              status: chatSessionResponse.status,
              error: errorText,
            })
          }
        } catch (error) {
          console.error('[handleDeleteChat] Failed to look up chat_session:', error)
        }
        
        // If lookup failed or didn't find request_id, delete the chat_session directly
        if (!requestId) {
          console.log('[handleDeleteChat] No request_id found - deleting chat_session directly:', chatId)

          // Call DELETE /api/chat-sessions to delete the orphaned session
          const deleteResponse = await fetch(`/api/chat-sessions?id=${encodeURIComponent(chatId)}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
          })

          if (!deleteResponse.ok) {
            const errorData = await deleteResponse.json().catch(() => ({ error: 'Unknown error' }))
            console.error('[handleDeleteChat] Failed to delete chat_session:', {
              chatId,
              status: deleteResponse.status,
              error: errorData.error || errorData.message,
            })
            // Still remove from UI even if API call fails (session might already be deleted)
          } else {
            console.log('[handleDeleteChat] Successfully deleted chat_session from database:', chatId)
          }

          // Remove from UI state
          setChatSessions((prevSessions) => prevSessions.filter((s) => s.id !== chatId))
          if (activeChatId === chatId) {
            const remainingSessions = chatSessions.filter((s) => s.id !== chatId)
            if (remainingSessions.length > 0) {
              setActiveChatId(remainingSessions[0].id)
              setCurrentView('chat')
            } else {
              setActiveChatId(null)
              setCurrentView('landing')
            }
          }
          return
        }
      }
      
      // If we still don't have a valid request ID, we can't delete from database
      if (!requestId) {
        console.error('[handleDeleteChat] Invalid request ID format:', {
          chatId,
          sessionId: session.id,
          requestId: session.requestId,
        })
        alert('Cannot delete: Invalid request ID format. This may be a temporary session.')
        // Still remove from UI if it's not a valid request
        setChatSessions((prevSessions) => prevSessions.filter((s) => s.id !== chatId))
        if (activeChatId === chatId) {
          setActiveChatId(null)
          setCurrentView('landing')
        }
        return
      }

      console.log('[handleDeleteChat] Attempting to delete request:', {
        chatId,
        requestId,
        sessionRequestId: session.requestId,
        sessionId: session.id,
      })

      // First, verify the request exists by trying to fetch it
      // This helps us distinguish between "request doesn't exist" and "permission denied"
      try {
        const verifyResponse = await fetch(`/api/requests?limit=1&status=all`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json()
          const requestExists = verifyData.requests?.some((r: { id: string }) => r.id === requestId)
          
          if (!requestExists) {
            console.log('[handleDeleteChat] Request does not exist in user\'s requests - removing session from UI')
            // Request doesn't exist (might have been deleted already or never existed)
            // Just remove the session from UI
            setChatSessions((prevSessions) => prevSessions.filter((s) => s.id !== chatId))
            if (activeChatId === chatId) {
              const remainingSessions = chatSessions.filter((s) => s.id !== chatId)
              if (remainingSessions.length > 0) {
                setActiveChatId(remainingSessions[0].id)
                setCurrentView('chat')
              } else {
                setActiveChatId(null)
                setCurrentView('landing')
              }
            }
            return
          }
        }
      } catch (verifyError) {
        console.warn('[handleDeleteChat] Failed to verify request existence, proceeding with delete:', verifyError)
        // Continue with delete attempt even if verification fails
      }

      // Call DELETE API endpoint
      const response = await fetch(`/api/requests?id=${encodeURIComponent(requestId)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('[handleDeleteChat] Failed to delete request:', {
          requestId,
          chatId,
          status: response.status,
          error: errorData.error || errorData.message,
          responseBody: errorData,
        })
        
        // If the request doesn't exist (404), just remove the session from UI
        // This handles cases where the request was already deleted or never existed
        if (response.status === 404) {
          console.log('[handleDeleteChat] Request not found (404) - removing session from UI')
          setChatSessions((prevSessions) => prevSessions.filter((s) => s.id !== chatId))
          if (activeChatId === chatId) {
            const remainingSessions = chatSessions.filter((s) => s.id !== chatId)
            if (remainingSessions.length > 0) {
              setActiveChatId(remainingSessions[0].id)
              setCurrentView('chat')
            } else {
              setActiveChatId(null)
              setCurrentView('landing')
            }
          }
          // Don't show error to user - silently remove since request doesn't exist
          return
        }
        
        // Show error to user for other errors (403, 500, etc.)
        alert(`Failed to delete chat session: ${errorData.error || errorData.message}`)
        return
      }

      // Remove session from state
      setChatSessions((prevSessions) => prevSessions.filter((s) => s.id !== chatId))

      // If this was the active chat, switch to landing page or select another chat
      if (activeChatId === chatId) {
        const remainingSessions = chatSessions.filter((s) => s.id !== chatId)
        if (remainingSessions.length > 0) {
          // Select the first remaining session
          setActiveChatId(remainingSessions[0].id)
          setCurrentView('chat')
        } else {
          // No more sessions, show landing page
          setActiveChatId(null)
          setCurrentView('landing')
        }
      }

      console.log('[handleDeleteChat] Successfully deleted chat session:', { chatId, requestId })
    } catch (error) {
      console.error('[handleDeleteChat] Unexpected error:', error)
      alert('An unexpected error occurred while deleting the chat session')
    }
  }

  const activeChat = activeChatId ? chatSessions.find((chat) => chat.id === activeChatId) : null

  // Show loading state while Clerk is initializing or requests are loading
  if (!isLoaded || isLoadingRequests) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {!isLoaded ? 'Loading...' : 'Loading your flight requests...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex overflow-hidden">
      {/* Backdrop when sidebar is overlay (phone + tablet); click to close */}
      {isTabletOrSmaller && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {sidebarOpen && (
        <div
          className={`
            ${isTabletOrSmaller ? "fixed left-0 top-0 h-full z-50 min-w-[280px] max-w-[360px] w-[clamp(280px,22vw,360px)]" : "relative min-w-[280px] max-w-[360px] w-[clamp(280px,22vw,360px)]"}
            transition-transform duration-300 ease-in-out
          `}
        >
          <ChatSidebar
            chatSessions={chatSessions}
            activeChatId={activeChatId}
            onSelectChat={(chatId) => {
              handleSelectChat(chatId)
              if (isTabletOrSmaller) setSidebarOpen(false)
            }}
            onNewChat={() => {
              handleNewChat()
              if (isTabletOrSmaller) setSidebarOpen(false)
            }}
            onDeleteChat={handleDeleteChat}
            onCancelChat={handleCancelChat}
            onArchiveChat={handleArchiveChat}
            archivedSessions={archivedSessions}
            onLoadArchive={loadArchivedSessions}
            isLoadingArchive={isLoadingArchive}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader
          sidebarOpen={sidebarOpen}
          onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
          isMobile={isTabletOrSmaller}
        />

        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {currentView === "landing" && (
            <LandingPage
              onStartChat={handleStartChat}
              userName={user?.firstName || user?.username || user?.emailAddresses[0]?.emailAddress?.split('@')[0]}
            />
          )}
          {currentView === "chat" && activeChat && (
            <ChatInterface
              activeChat={activeChat}
              isProcessing={isProcessing}
              onProcessingChange={setIsProcessing}
              onUpdateChat={handleUpdateChat}
              onArchiveChat={handleArchiveChat}
              isLoading={isSessionDataLoading}
            />
          )}
        </main>
      </div>
    </div>
  )
}
