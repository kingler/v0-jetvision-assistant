"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Send, Loader2, Plane, FileText, Eye, Clock, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { WorkflowVisualization } from "./workflow-visualization"
import { ProposalPreview } from "./proposal-preview"
import { QuoteCard } from "@/components/aviation"
import type { ChatSession, Quote } from "./chat-sidebar"

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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [activeChat.messages, isTyping])

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
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return

    const userMessage = inputValue.trim()
    setInputValue("")
    setIsTyping(true)
    onProcessingChange(true)

    await simulateWorkflowProgress(userMessage)

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

  const QuoteComparisonDisplay = () => {
    const quotes = activeChat.quotes || []
    const sortedQuotes = [...quotes].sort((a, b) => a.rank - b.rank)

    if (quotes.length === 0) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Compare Flight Quotes</h4>
            <Badge variant="outline" className="text-xs">
              0 quotes received
            </Badge>
          </div>
          <div className="p-8 text-center border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Waiting for quotes from operators...
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Quotes will appear here once received from the flight search workflow.
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Compare Flight Quotes</h4>
          <Badge variant="outline" className="text-xs">
            {quotes.length} quote{quotes.length !== 1 ? 's' : ''} received
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedQuotes.map((quote) => (
            <QuoteCard
              key={quote.id}
              id={quote.id}
              operatorName={quote.operatorName}
              aircraftType={quote.aircraftType}
              price={quote.price}
              aiScore={quote.aiScore}
              rank={quote.rank}
              totalQuotes={quotes.length}
              operatorRating={quote.operatorRating}
              departureTime={quote.departureTime}
              arrivalTime={quote.arrivalTime}
              flightDuration={quote.flightDuration}
              isRecommended={quote.isRecommended}
              isSelected={activeChat.selectedQuoteId === quote.id}
              onSelect={() => handleSelectQuote(quote.id)}
              compact={false}
            />
          ))}
        </div>

        {activeChat.selectedQuoteId && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              ✓ You've selected a quote. I can send this proposal to your client, or you can select a different option.
            </p>
          </div>
        )}
      </div>
    )
  }

  const QuoteStatusDisplay = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Live Quote Status:</h4>
        <Badge variant="outline" className="text-xs">
          {activeChat.quotesReceived || 2}/{activeChat.quotesTotal || 5} responded
        </Badge>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center space-x-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="flex-1">NetJets - Challenger 350</span>
          <span className="text-xs text-green-600">8 min</span>
        </div>
        <div className="flex items-center space-x-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="flex-1">Flexjet - Citation X</span>
          <span className="text-xs text-green-600">12 min</span>
        </div>
        <div className="flex items-center space-x-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Clock className="w-4 h-4 text-gray-400 animate-pulse" />
          <span className="flex-1">Vista Global - Learjet 75</span>
          <span className="text-xs text-gray-500">15 min ago</span>
        </div>
        <div className="flex items-center space-x-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Clock className="w-4 h-4 text-gray-400 animate-pulse" />
          <span className="flex-1">Wheels Up - Hawker 900XP</span>
          <span className="text-xs text-gray-500">15 min ago</span>
        </div>
        <div className="flex items-center space-x-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Clock className="w-4 h-4 text-gray-400 animate-pulse" />
          <span className="flex-1">XOJET - Citation Excel</span>
          <span className="text-xs text-gray-500">15 min ago</span>
        </div>
      </div>
    </div>
  )

  const CustomerPreferencesDisplay = () => (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">K</span>
        </div>
        <h4 className="font-medium text-sm">Customer Preferences - {activeChat.customer?.name}</h4>
        <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
          Returning Customer
        </Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-orange-600 dark:text-orange-400 font-medium">🌮 Catering</span>
          </div>
          <p className="text-orange-700 dark:text-orange-300">{activeChat.customer?.preferences?.catering}</p>
        </div>
        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-purple-600 dark:text-purple-400 font-medium">🚗 Ground Transport</span>
          </div>
          <p className="text-purple-700 dark:text-purple-300">{activeChat.customer?.preferences?.groundTransport}</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Chat Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Flight Request #{activeChat.id}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {activeChat.route} • {activeChat.passengers} passengers • {activeChat.date}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {activeChat.status === "proposal_ready" && (
              <Badge className="bg-green-500 text-white">
                <FileText className="w-3 h-3 mr-1" />
                Proposal Ready
              </Badge>
            )}
            {activeChat.status === "requesting_quotes" && (
              <Badge className="bg-cyan-500 text-white">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Requesting Quotes
              </Badge>
            )}
            {activeChat.status === "understanding_request" && (
              <Badge className="bg-blue-500 text-white">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Understanding Request
              </Badge>
            )}
            {activeChat.status === "searching_aircraft" && (
              <Badge className="bg-purple-500 text-white">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Searching Aircraft
              </Badge>
            )}
            {activeChat.status === "analyzing_options" && (
              <Badge className="bg-orange-500 text-white">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Analyzing Options
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {activeChat.messages.map((message) => (
            <div key={message.id} className={cn("flex", message.type === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 whitespace-pre-wrap shadow-sm",
                  message.type === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700",
                )}
              >
                {message.type === "agent" && (
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                      <Plane className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Jetvision Agent</span>
                  </div>
                )}
                <p className="text-sm leading-relaxed">{message.content}</p>

                {message.showCustomerPreferences && activeChat.customer && (
                  <div className="mt-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                    <CustomerPreferencesDisplay />
                  </div>
                )}

                {message.showWorkflow && (
                  <div className="mt-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                    <WorkflowVisualization
                      isProcessing={activeChat.status !== "proposal_ready"}
                      embedded={true}
                      currentStep={activeChat.currentStep}
                      status={activeChat.status}
                    />
                  </div>
                )}

                {message.showQuoteStatus && (
                  <div className="mt-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                    <QuoteStatusDisplay />
                  </div>
                )}

                {message.showQuotes && activeChat.quotes && activeChat.quotes.length > 0 && (
                  <div className="mt-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                    <QuoteComparisonDisplay />
                  </div>
                )}

                {message.showProposal && (
                  <div className="mt-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                    <ProposalPreview embedded={true} chatData={activeChat} />
                  </div>
                )}

                <p className="text-xs opacity-60 mt-2">{message.timestamp.toLocaleTimeString()}</p>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl px-4 py-3 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                    <Plane className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Jetvision Agent</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-sm">Processing your request...</span>
                </div>
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
    </div>
  )
}
