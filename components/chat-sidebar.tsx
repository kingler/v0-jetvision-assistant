"use client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, MessageSquare, CheckCircle, Clock, Loader2, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Quote {
  id: string
  operatorName: string
  aircraftType: string
  price: number
  aiScore: number
  rank: number
  operatorRating: number
  departureTime: string
  arrivalTime: string
  flightDuration: string
  isRecommended: boolean
}

export interface ChatSession {
  id: string
  route: string
  passengers: number
  date: string
  status: "proposal_ready" | "requesting_quotes" | "understanding_request" | "searching_aircraft" | "analyzing_options"
  currentStep: number
  totalSteps: number
  aircraft?: string
  operator?: string
  quotesReceived?: number
  quotesTotal?: number
  basePrice?: number
  totalPrice?: number
  margin?: number
  quotes?: Quote[]
  selectedQuoteId?: string
  chatkitThreadId?: string | null
  customer?: {
    name: string
    isReturning: boolean
    preferences: Record<string, string>
  }
  messages: Array<{
    id: string
    type: "user" | "agent"
    content: string
    timestamp: Date
    showWorkflow?: boolean
    showProposal?: boolean
    showQuoteStatus?: boolean
    showCustomerPreferences?: boolean
    showQuotes?: boolean
  }>
}

interface ChatSidebarProps {
  chatSessions: ChatSession[]
  activeChatId: string | null // Allow null for landing page state
  onSelectChat: (chatId: string) => void
  onNewChat: () => void
}

const workflowSteps = {
  1: { title: "Understanding Request", icon: CheckCircle },
  2: { title: "Searching Aircraft", icon: Clock },
  3: { title: "Requesting Quotes", icon: Loader2 },
  4: { title: "Analyzing Options", icon: Clock },
  5: { title: "Generating Proposal", icon: FileText },
}

export function ChatSidebar({ chatSessions, activeChatId, onSelectChat, onNewChat }: ChatSidebarProps) {
  const getWorkflowIcon = (step: number, status: string) => {
    const IconComponent = workflowSteps[step as keyof typeof workflowSteps]?.icon || Clock

    if (status === "proposal_ready" && step <= 5) {
      return <CheckCircle className="w-4 h-4 text-green-500" />
    } else if (status === "requesting_quotes" && step === 3) {
      return <Loader2 className="w-4 h-4 text-cyan-500 animate-spin" />
    } else if (step < getCurrentStepNumber(status)) {
      return <CheckCircle className="w-4 h-4 text-green-500" />
    } else if (step === getCurrentStepNumber(status)) {
      return <Loader2 className="w-4 h-4 text-cyan-500 animate-spin" />
    } else {
      return <IconComponent className="w-4 h-4 text-gray-400" />
    }
  }

  const getCurrentStepNumber = (status: string): number => {
    switch (status) {
      case "understanding_request":
        return 1
      case "searching_aircraft":
        return 2
      case "requesting_quotes":
        return 3
      case "analyzing_options":
        return 4
      case "proposal_ready":
        return 5
      default:
        return 1
    }
  }

  const getStatusBadge = (session: ChatSession) => {
    if (session.status === "proposal_ready") {
      return (
        <Badge variant="default" className="bg-green-500 text-xs">
          Proposal Ready
        </Badge>
      )
    } else if (session.status === "requesting_quotes") {
      return (
        <Badge variant="default" className="bg-cyan-500 text-xs">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Quotes {session.quotesReceived || 0}/{session.quotesTotal || 5}
        </Badge>
      )
    } else {
      return (
        <Badge variant="secondary" className="bg-gray-400 text-white text-xs">
          Pending
        </Badge>
      )
    }
  }

  const getLastActivity = (session: ChatSession): string => {
    const lastMessage = session.messages[session.messages.length - 1]
    if (!lastMessage) return "Just now"

    const now = new Date()
    const messageTime = new Date(lastMessage.timestamp)
    const diffMinutes = Math.floor((now.getTime() - messageTime.getTime()) / (1000 * 60))

    if (diffMinutes < 1) return "Just now"
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`
    return `${Math.floor(diffMinutes / 1440)}d ago`
  }

  return (
    <div className="w-80 sm:w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">Open Chats</h2>
          <Button size="sm" onClick={onNewChat} className="bg-cyan-600 hover:bg-cyan-700 text-xs sm:text-sm">
            <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
            New
          </Button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {chatSessions.length} active flight request{chatSessions.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="p-1 sm:p-2 space-y-2">
          {chatSessions.map((session) => (
            <Card
              key={session.id}
              className={cn(
                "cursor-pointer transition-all duration-200 hover:shadow-md",
                activeChatId === session.id
                  ? "ring-2 ring-cyan-500 bg-cyan-50 dark:bg-cyan-950"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800",
              )}
              onClick={() => onSelectChat(session.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelectChat(session.id)
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`Flight Request ${session.id}: ${session.route}, ${session.passengers} passengers, ${session.date}`}
              aria-pressed={activeChatId === session.id}
            >
              <CardContent className="p-2 sm:p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                    <h3 className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                      Flight Request #{session.id}
                    </h3>
                  </div>
                  <div className="flex-shrink-0">{getStatusBadge(session)}</div>
                </div>

                <div className="space-y-1 mb-2">
                  <p className="text-xs text-gray-600 dark:text-gray-300 truncate">{session.route}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {session.passengers} passengers • {session.date}
                  </p>
                  {session.aircraft && session.operator && (
                    <p className="text-xs text-green-600 dark:text-green-400 truncate">
                      {session.aircraft} • {session.operator}
                    </p>
                  )}
                </div>

                {/* Workflow Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1 sm:space-x-2 min-w-0 flex-1">
                    {getWorkflowIcon(session.currentStep, session.status)}
                    <span className="text-xs text-gray-600 dark:text-gray-300 truncate">
                      {workflowSteps[session.currentStep as keyof typeof workflowSteps]?.title}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{getLastActivity(session)}</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-2">
                  <div
                    className={cn(
                      "h-1 rounded-full transition-all duration-300",
                      session.status === "proposal_ready" ? "bg-green-500" : "bg-cyan-500",
                    )}
                    style={{
                      width: `${Math.min((session.currentStep / session.totalSteps) * 100, 100)}%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
            <span>Proposal Ready</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-cyan-500 rounded-full flex-shrink-0"></div>
            <span>Processing</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0"></div>
            <span>Pending</span>
          </div>
        </div>
      </div>
    </div>
  )
}
