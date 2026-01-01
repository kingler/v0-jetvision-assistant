"use client"

import { useState, useEffect } from "react"
import { UserButton, useUser } from "@clerk/nextjs"
import { ChatInterface } from "@/components/chat-interface"
import { WorkflowVisualization } from "@/components/workflow-visualization"
import { ChatSidebar, type ChatSession } from "@/components/chat-sidebar"
import { LandingPage } from "@/components/landing-page"
import { AppHeader } from "@/components/app-header"
import { useIsMobile } from "@/hooks/use-mobile"

type View = "landing" | "chat" | "workflow"

export default function JetvisionAgent() {
  const { user, isLoaded } = useUser()
  const [currentView, setCurrentView] = useState<View>("landing")
  const [isProcessing, setIsProcessing] = useState(false)
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile)

  useEffect(() => {
    setSidebarOpen(!isMobile)
  }, [isMobile])

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId)
    setCurrentView("chat")
  }

  const handleStartChat = (message: string) => {
    const newChatId = (chatSessions.length + 1).toString()
    const newChat: ChatSession = {
      id: newChatId,
      route: "Select route",
      passengers: 1,
      date: "Select date",
      status: "understanding_request", // Start at step 1 - will be updated by API response
      currentStep: 1,
      totalSteps: 5,
      messages: [
        {
          id: "1",
          type: "user",
          content: message,
          timestamp: new Date(),
        },
        // No static agent message - ChatInterface will call the API and add the real response
      ],
      // Flag to indicate this chat needs an initial API call
      needsInitialApiCall: true,
      initialUserMessage: message,
    }
    setChatSessions([newChat, ...chatSessions])
    setActiveChatId(newChat.id)
    setCurrentView("chat")
  }

  const handleNewChat = () => {
    setCurrentView("landing")
    setActiveChatId(null)
  }

  const handleUpdateChat = (chatId: string, updates: Partial<ChatSession>) => {
    setChatSessions((prevSessions) =>
      prevSessions.map((session) => (session.id === chatId ? { ...session, ...updates } : session)),
    )
  }

  const activeChat = activeChatId ? chatSessions.find((chat) => chat.id === activeChatId) : null

  // Show loading state while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex overflow-hidden">
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {sidebarOpen && (
        <div
          className={`
            ${isMobile ? "fixed left-0 top-0 h-full z-50 w-80" : "relative w-80"}
            transition-transform duration-300 ease-in-out
          `}
        >
          <ChatSidebar
            chatSessions={chatSessions}
            activeChatId={activeChatId}
            onSelectChat={(chatId) => {
              handleSelectChat(chatId)
              if (isMobile) setSidebarOpen(false)
            }}
            onNewChat={() => {
              handleNewChat()
              if (isMobile) setSidebarOpen(false)
            }}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader
          sidebarOpen={sidebarOpen}
          onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
          isMobile={isMobile}
        />

        <main
          className={`
          flex-1 flex flex-col min-h-0
          ${currentView === "workflow" ? "overflow-y-auto" : "overflow-hidden"}
        `}
        >
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
              onViewWorkflow={() => setCurrentView("workflow")}
              onUpdateChat={handleUpdateChat}
            />
          )}
          {currentView === "workflow" && activeChat && (
            <WorkflowVisualization
              isProcessing={isProcessing}
              currentStep={activeChat.currentStep}
              status={activeChat.status}
            />
          )}
        </main>
      </div>
    </div>
  )
}
