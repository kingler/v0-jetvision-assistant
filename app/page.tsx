"use client"

import { useState, useEffect } from "react"
import { UserButton, useUser } from "@clerk/nextjs"
import { ChatInterface } from "@/components/chat-interface"
import { WorkflowVisualization } from "@/components/workflow-visualization"
import { ChatSidebar, type ChatSession } from "@/components/chat-sidebar"
import { LandingPage } from "@/components/landing-page"
import { AppHeader } from "@/components/app-header"
import { useIsMobile } from "@/hooks/use-mobile"
import { chatSessionsToUIFormat } from "@/lib/utils/chat-session-to-ui"

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

        // Load messages for sessions with request IDs
        let messagesByRequestId: Record<string, Array<{
          id: string;
          senderType: 'iso_agent' | 'operator' | 'ai_assistant';
          senderName: string | null;
          content: string;
          contentType: string;
          richContent: Record<string, unknown> | null;
          createdAt: string;
        }>> = {}

        try {
          const requestsResponse = await fetch('/api/requests?limit=50', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          })

          if (requestsResponse.ok) {
            const requestsData = await requestsResponse.json()
            messagesByRequestId = requestsData.messages || {}
          }
        } catch (error) {
          console.warn('[JetvisionAgent] Failed to load request messages:', error)
        }

        const messagesMap = new Map(
          Object.entries(messagesByRequestId).map(([requestId, messages]) => [requestId, messages])
        )

        const sessionsWithMessages = sessions.map((session) => {
          if (!session.requestId) return session
          const messages = messagesMap.get(session.requestId)
          if (!messages || messages.length === 0) return session

          return {
            ...session,
            messages: messages.map((msg) => ({
              id: msg.id,
              type: (msg.senderType === 'iso_agent' ? 'user' : 'agent') as 'user' | 'agent',
              content: msg.content,
              timestamp: new Date(msg.createdAt),
            })),
          }
        })

        // Update state with loaded sessions
        setChatSessions(sessionsWithMessages as any)

        // Always show landing page on initial load, even if sessions exist
        // User can manually select chats from the sidebar
        setCurrentView('landing')
        setActiveChatId(null)

        console.log('[JetvisionAgent] Loaded chat sessions:', {
          count: sessionsWithMessages.length,
          sessionIds: sessionsWithMessages.map(s => s.id),
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

  const handleNewChat = async () => {
    // When starting a new chat, always show the landing page
    // User can start a conversation from the landing page
    setCurrentView("landing")
    setActiveChatId(null)
    setSidebarOpen(true)
  }

  const handleUpdateChat = (chatId: string, updates: Partial<ChatSession>) => {
    setChatSessions((prevSessions) => {
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

      // Check if session can be archived
      const canArchive = session.status === 'analyzing_options' || 
                        session.status === 'requesting_quotes' ||
                        session.status === 'searching_aircraft' ||
                        session.status === 'understanding_request';
      if (canArchive) {
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

      // Call PATCH API endpoint to archive
      const response = await fetch('/api/requests', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: requestId,
          action: 'archive',
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

      // Remove archived session from active chats
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
              ? sessions.find((s: any) => s.id === chatId)
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
          const requestExists = verifyData.requests?.some((r: any) => r.id === requestId)
          
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
            onDeleteChat={handleDeleteChat}
            onCancelChat={handleCancelChat}
            onArchiveChat={handleArchiveChat}
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
