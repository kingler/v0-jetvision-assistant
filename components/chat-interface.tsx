"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
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

  // Drawer state for viewing quote details
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null)

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

              if (data.error) {
                throw new Error(data.message || "Stream error")
              }

              if (data.content) {
                fullContent += data.content
                setStreamingContent(fullContent)
              }

              if (data.done) {
                // Stream complete - add final message
                // Determine workflow status based on tool calls
                let newStatus: string = "understanding_request"
                let newStep = 1
                let showDeepLink = false
                let deepLinkData: {
                  rfpId?: string
                  tripId?: string
                  deepLink?: string
                  departureAirport?: { icao: string; name?: string; city?: string }
                  arrivalAirport?: { icao: string; name?: string; city?: string }
                  departureDate?: string
                  passengers?: number
                } | undefined = undefined

                // Check for tool calls in the response
                if (data.tool_calls && Array.isArray(data.tool_calls)) {
                  for (const toolCall of data.tool_calls) {
                    if (toolCall.name === "search_flights") {
                      newStatus = "searching_aircraft"
                      newStep = 2
                    } else if (toolCall.name === "create_rfp") {
                      newStatus = "requesting_quotes"
                      newStep = 3
                      showDeepLink = true
                      // Extract RFP data for deeplink
                      if (toolCall.result) {
                        deepLinkData = {
                          rfpId: toolCall.result.rfp_id,
                          tripId: toolCall.result.trip_id,
                          deepLink: toolCall.result.deep_link || `https://marketplace.avinode.com/trip/${toolCall.result.trip_id}`,
                          departureAirport: toolCall.result.departure_airport,
                          arrivalAirport: toolCall.result.arrival_airport,
                          departureDate: toolCall.result.departure_date,
                          passengers: toolCall.result.passengers,
                        }
                      }
                    } else if (toolCall.name === "get_quotes" || toolCall.name === "get_quote_status") {
                      newStatus = "analyzing_options"
                      newStep = 4
                    }
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
                    deepLink: data.rfp_data.deep_link || `https://marketplace.avinode.com/trip/${data.rfp_data.trip_id}`,
                    departureAirport: data.rfp_data.departure_airport,
                    arrivalAirport: data.rfp_data.arrival_airport,
                    departureDate: data.rfp_data.departure_date,
                    passengers: data.rfp_data.passengers,
                  }
                }

                const agentMsg = {
                  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                  type: "agent" as const,
                  content: fullContent || data.content || "",
                  timestamp: new Date(),
                  showWorkflow: newStep > 1,
                  showDeepLink,
                  deepLinkData,
                }

                const updatedMessages = [...latestMessagesRef.current, agentMsg]
                latestMessagesRef.current = updatedMessages

                onUpdateChat(activeChat.id, {
                  messages: updatedMessages,
                  status: newStatus as typeof activeChat.status,
                  currentStep: newStep,
                  rfpId: deepLinkData?.rfpId,
                  tripId: deepLinkData?.tripId,
                })

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

    // Send message with streaming
    await sendMessageWithStreaming(userMessage)

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

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {activeChat.messages.map((message) => (
            <div key={message.id} className={cn("flex", message.type === "user" ? "justify-end" : "justify-start")}>
              {message.type === "user" ? (
                /* User messages - keep bubble styling */
                <div className="max-w-[85%] rounded-2xl px-4 py-3 whitespace-pre-wrap shadow-sm bg-blue-600 text-white">
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
                    deepLink: message.deepLinkData.deepLink || (activeChat.tripId ? `https://marketplace.avinode.com/trip/${activeChat.tripId}` : undefined),
                    departureAirport: message.deepLinkData.departureAirport || { icao: activeChat.route?.split(' → ')[0] || 'N/A' },
                    arrivalAirport: message.deepLinkData.arrivalAirport || { icao: activeChat.route?.split(' → ')[1] || 'N/A' },
                    departureDate: message.deepLinkData.departureDate || activeChat.date,
                    passengers: message.deepLinkData.passengers || activeChat.passengers,
                  } : undefined}
                  showQuotes={message.showQuotes}
                  quotes={activeChat.quotes}
                  showProposal={message.showProposal}
                  chatData={activeChat}
                  showCustomerPreferences={message.showCustomerPreferences}
                  customer={activeChat.customer}
                  onSelectQuote={handleSelectQuote}
                  onDeepLinkClick={() => console.log('[DeepLink] User clicked Avinode marketplace link')}
                  onCopyDeepLink={() => console.log('[DeepLink] User copied deep link')}
                />
              )}
            </div>
          ))}

          {/* Streaming Response / Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="max-w-[85%] bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl px-4 py-3 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                    <Plane className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Jetvision Agent</span>
                </div>
                {streamingContent ? (
                  <div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{stripMarkdown(streamingContent)}</p>
                    <span className="inline-block w-2 h-4 bg-blue-600 animate-pulse ml-0.5" />
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
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
