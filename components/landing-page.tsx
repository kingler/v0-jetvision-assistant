"use client"

import type React from "react"
import { useState, useCallback } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"
import {
  StarterCard,
  useSmartStarters,
  type ConversationStarter,
} from "@/components/conversation-starters"

interface LandingPageProps {
  onStartChat: (message: string) => void
  userName?: string
  /** Optional user context for smart starters */
  userContext?: {
    activeRequestCount?: number
    pendingQuotesCount?: number
    hotOpportunitiesCount?: number
  }
}

/**
 * Map starter actions to chat messages
 */
const ACTION_TO_MESSAGE: Record<string, string> = {
  "new-flight-request": "I want to start a new flight request",
  "show-active-requests": "Show me my active flight requests",
  "show-deals": "Show me my current deals and quotes",
  "show-hot-opportunities": "Show me hot opportunities that need attention",
  "show-pipeline": "Show me my request pipeline summary",
}

/**
 * LandingPage - Initial view with conversation starters
 *
 * Displays greeting, input field, and smart conversation starters
 * that adapt based on user context.
 */
export function LandingPage({ onStartChat, userName, userContext }: LandingPageProps) {
  const [message, setMessage] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Get smart starters based on user context
  const { starters, isLoading } = useSmartStarters(userContext)

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 17) return "Good afternoon"
    return "Good evening"
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmedMessage = message.trim()

    // Form validation
    if (!trimmedMessage) {
      setError("Please enter a message to start a chat")
      return
    }

    if (trimmedMessage.length < 3) {
      setError("Message must be at least 3 characters long")
      return
    }

    if (trimmedMessage.length > 500) {
      setError("Message must be less than 500 characters")
      return
    }

    try {
      onStartChat(trimmedMessage)
    } catch (err) {
      setError("Failed to start chat. Please try again.")
      console.error("Error starting chat:", err)
    }
  }

  /**
   * Handle starter click - map action to chat message
   */
  const handleStarterClick = useCallback(
    (action: string, _starter: ConversationStarter) => {
      const chatMessage = ACTION_TO_MESSAGE[action] || `Start action: ${action}`
      onStartChat(chatMessage)
    },
    [onStartChat]
  )

  return (
    <div className="relative flex-1 flex items-center justify-center p-4 sm:p-8">
      <div className="max-w-2xl w-full space-y-6 sm:space-y-8">
        {/* Greeting */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <Image
              src="/images/jetvision-logo.png"
              alt="Jetvision"
              width={280}
              height={140}
              priority
              className="h-[112px] sm:h-[140px] w-auto max-w-[200px]"
              style={{ width: 'auto', height: 'auto' }}
            />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
            {getGreeting()}{userName ? `, ${userName}` : ''}
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground">How can I help you today?</p>
        </div>

        {/* Main Input */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-error-bg border border-error-border rounded-lg p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="relative">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message to start a new chat..."
              className="pr-12 h-12 sm:h-14 text-base sm:text-lg border-2 border-border focus:border-primary"
            />
            <Button
              type="submit"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary hover:bg-primary/90"
              disabled={!message.trim()}
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>

        {/* Conversation Starters */}
        <div className="space-y-4">
          <p className="text-center text-muted-foreground font-medium">
            Or try one of these:
          </p>
          <div className="grid gap-3">
            {isLoading ? (
              <>
                <StarterCard icon={Send} title="" description="" onClick={() => {}} loading />
                <StarterCard icon={Send} title="" description="" onClick={() => {}} loading />
              </>
            ) : (
              starters.map((starter) => (
                <StarterCard
                  key={starter.id}
                  icon={starter.icon}
                  title={starter.title}
                  description={starter.description}
                  onClick={() => handleStarterClick(starter.action, starter)}
                  variant={starter.variant}
                  badge={starter.badge}
                  disabled={starter.disabled}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
