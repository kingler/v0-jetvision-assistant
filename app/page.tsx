"use client"

import { useState, useEffect } from "react"
import { UserButton, useUser } from "@clerk/nextjs"
import { ChatInterface } from "@/components/chat-interface"
import { WorkflowVisualization } from "@/components/workflow-visualization"
import { SettingsPanel } from "@/components/settings-panel"
import { ChatSidebar, type ChatSession } from "@/components/chat-sidebar"
import { LandingPage } from "@/components/landing-page"
import { Button } from "@/components/ui/button"
import { Settings, ChevronRight, ChevronLeft } from "lucide-react"
import Image from "next/image"
import { useCaseChats } from "@/lib/mock-data"
import { useIsMobile } from "@/hooks/use-mobile"

type View = "landing" | "chat" | "workflow" | "settings"

export default function JetvisionAgent() {
  const { user, isLoaded } = useUser()
  const [currentView, setCurrentView] = useState<View>("landing")
  const [isProcessing, setIsProcessing] = useState(false)
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(useCaseChats)
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
      status: "understanding_request",
      currentStep: 1,
      totalSteps: 5,
      messages: [
        {
          id: "1",
          type: "user",
          content: message,
          timestamp: new Date(),
        },
        {
          id: "2",
          type: "agent",
          content:
            "Thank you for reaching out! I'll help you with that. Let me gather some details to provide you with the best options.",
          timestamp: new Date(),
        },
      ],
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
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
        <header className="border-b border-gray-800 bg-black sticky top-0 z-30">
          <div className="container mx-auto px-3 sm:px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="text-gray-300 hover:text-white hover:bg-gray-800 flex-shrink-0"
                  aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
                  aria-expanded={sidebarOpen}
                >
                  {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
                <Image
                  src="/images/jetvision-logo.png"
                  alt="Jetvision"
                  width={120}
                  height={32}
                  className="h-6 sm:h-7 w-auto flex-shrink-0"
                />
                <div className="hidden md:block border-l border-gray-600 pl-4">
                  <p className="text-sm text-gray-300 font-medium">AI-powered Private Jet Booking</p>
                </div>
              </div>

              <nav className="flex items-center space-x-2 sm:space-x-3">
                <Button
                  variant={currentView === "settings" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setCurrentView("settings")}
                  className={`flex items-center space-x-2 rounded-lg transition-all ${
                    currentView === "settings"
                      ? "bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm"
                      : "text-gray-300 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
                <div className="flex items-center space-x-2">
                  {user && (
                    <span className="hidden sm:inline text-sm text-gray-300">
                      {user.firstName || user.username || user.emailAddresses[0]?.emailAddress}
                    </span>
                  )}
                  <UserButton
                    appearance={{
                      elements: {
                        avatarBox: 'w-8 h-8 sm:w-9 sm:h-9',
                      },
                    }}
                    afterSignOutUrl="/sign-in"
                  />
                </div>
              </nav>
            </div>
          </div>
        </header>

        <main
          className={`
          ${currentView === "workflow" ? "overflow-y-auto" : "overflow-hidden"}
          ${isMobile ? "h-[calc(100vh-60px)]" : "h-[calc(100vh-64px)]"}
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
          {currentView === "settings" && <SettingsPanel />}
        </main>
      </div>
    </div>
  )
}
