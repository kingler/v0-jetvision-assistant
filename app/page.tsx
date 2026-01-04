"use client"

import { useState, useEffect } from "react"
import { UserButton, useUser } from "@clerk/nextjs"
import { ChatInterface } from "@/components/chat-interface"
import { WorkflowVisualization } from "@/components/workflow-visualization"
import { ChatSidebar, type ChatSession } from "@/components/chat-sidebar"
import { LandingPage } from "@/components/landing-page"
import { AppHeader } from "@/components/app-header"
import { useIsMobile } from "@/hooks/use-mobile"
import { requestsToChatSessions } from "@/lib/utils/request-to-chat-session"
import type { Request } from "@/lib/types/database"

type View = "landing" | "chat" | "workflow"

export default function JetvisionAgent() {
  const { user, isLoaded } = useUser()
  const [currentView, setCurrentView] = useState<View>("landing")
  const [isProcessing, setIsProcessing] = useState(false)
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [isLoadingRequests, setIsLoadingRequests] = useState(true)
  const isMobile = useIsMobile()
  // Sidebar starts collapsed on initial page load
  const [sidebarOpen, setSidebarOpen] = useState(false)

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

        // Fetch requests from API
        const response = await fetch('/api/requests?limit=50', {
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
        const requests: Request[] = data.requests || []
        const messagesByRequestId: Record<string, Array<{
          id: string;
          senderType: 'iso_agent' | 'operator' | 'ai_assistant';
          senderName: string | null;
          content: string;
          contentType: string;
          richContent: Record<string, unknown> | null;
          createdAt: string;
        }>> = data.messages || {}

        // Convert messages object to Map for easier lookup
        const messagesMap = new Map(
          Object.entries(messagesByRequestId).map(([requestId, messages]) => [requestId, messages])
        )

        // Convert database requests to chat sessions (with loaded messages)
        const sessions = requestsToChatSessions(requests, messagesMap)

        // Update state with loaded sessions
        setChatSessions(sessions)

        // Auto-select the first session if available and no chat is currently active
        // This only happens on initial load - user can manually select chats later
        if (sessions.length > 0 && !activeChatId) {
          setActiveChatId(sessions[0].id)
          setCurrentView('chat')
        }

        console.log('[JetvisionAgent] Loaded flight requests:', {
          count: sessions.length,
          sessionIds: sessions.map(s => s.id),
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

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId)
    setCurrentView("chat")
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
    // Add new chat to the beginning of the list
    setChatSessions([newChat, ...chatSessions])
    setActiveChatId(newChat.id)
    setCurrentView("chat")
    // Open sidebar automatically when a new trip/flight request is created
    // This ensures the user can see the new flight request card in the sidebar
    setSidebarOpen(true)
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
