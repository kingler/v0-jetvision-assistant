"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Plane, DollarSign, Calendar } from "lucide-react"

interface LandingPageProps {
  onStartChat: (message: string) => void
}

export function LandingPage({ onStartChat }: LandingPageProps) {
  const [message, setMessage] = useState("")

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 17) return "Good afternoon"
    return "Good evening"
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim()) {
      onStartChat(message.trim())
    }
  }

  const handleSuggestedPrompt = (prompt: string) => {
    onStartChat(prompt)
  }

  const suggestedPrompts = [
    {
      text: "I want to help book a flight for a new client",
      icon: Plane,
      description: "Start a new booking request",
    },
    {
      text: "Pull up flight preferences for [Client Name/Email]",
      icon: DollarSign,
      description: "View client preferences and history",
    },
    {
      text: "What kind of planes are available next week?",
      icon: Calendar,
      description: "Check aircraft availability",
    },
  ]

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
      <div className="max-w-2xl w-full space-y-6 sm:space-y-8">
        {/* Greeting */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            {getGreeting()}, Adrian
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300">How can I help you today?</p>
        </div>

        {/* Main Input */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message to start a new chat..."
              className="pr-12 h-12 sm:h-14 text-base sm:text-lg border-2 border-gray-200 dark:border-gray-700 focus:border-cyan-500 dark:focus:border-cyan-400"
            />
            <Button
              type="submit"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-cyan-600 hover:bg-cyan-700"
              disabled={!message.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>

        {/* Suggested Prompts */}
        <div className="space-y-4">
          <p className="text-center text-gray-500 dark:text-gray-400 font-medium">Or try one of these:</p>
          <div className="grid gap-3">
            {suggestedPrompts.map((prompt, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-auto p-3 sm:p-4 justify-start text-left hover:bg-gray-50 dark:hover:bg-gray-800 border-2 hover:border-cyan-300 dark:hover:border-cyan-600 transition-all bg-transparent"
                onClick={() => handleSuggestedPrompt(prompt.text)}
              >
                <div className="flex items-center space-x-3 w-full">
                  <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-cyan-100 dark:bg-cyan-900 rounded-lg flex items-center justify-center">
                    <prompt.icon className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base text-gray-900 dark:text-white">{prompt.text}</p>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{prompt.description}</p>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
