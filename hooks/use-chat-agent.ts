/**
 * React Hook for Chat Agent Service
 * Provides easy integration between React components and the chat agent service
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { chatAgentService } from '@/lib/services/chat-agent-service'
import type {
  ChatAgentRequest,
  ChatAgentResponse,
  ChatMessage,
  ChatSession,
  WorkflowState,
  QuoteData,
  ChatIntent,
} from '@/lib/types/chat-agent'

export interface UseChatAgentOptions {
  sessionId: string
  userId: string
  onWorkflowUpdate?: (workflow: WorkflowState) => void
  onQuotesUpdate?: (quotes: QuoteData[]) => void
  onError?: (error: Error) => void
}

export interface UseChatAgentReturn {
  // State
  messages: ChatMessage[]
  isProcessing: boolean
  currentWorkflow: WorkflowState | null

  // Actions
  sendMessage: (content: string, intent?: ChatIntent) => Promise<void>
  clearMessages: () => void

  // Session management
  session: ChatSession | null
  loadSession: (sessionId: string) => Promise<void>
  createNewSession: () => Promise<void>
}

/**
 * Hook for integrating chat UI with agent service
 */
export function useChatAgent(options: UseChatAgentOptions): UseChatAgentReturn {
  const { sessionId, userId, onWorkflowUpdate, onQuotesUpdate, onError } = options

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowState | null>(null)
  const [session, setSession] = useState<ChatSession | null>(null)

  const workflowSubscriptionRef = useRef<(() => void) | null>(null)
  const quotesSubscriptionRef = useRef<(() => void) | null>(null)

  /**
   * Send a message to the agent
   */
  const sendMessage = useCallback(
    async (content: string, intent?: ChatIntent) => {
      if (!content.trim() || isProcessing) return

      setIsProcessing(true)

      // Create user message
      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        type: 'user',
        content: content.trim(),
        timestamp: new Date(),
      }

      // Add user message to chat immediately
      setMessages((prev) => [...prev, userMessage])

      try {
        // Create request
        const request: ChatAgentRequest = {
          sessionId,
          userId,
          messageId: userMessage.id,
          content: content.trim(),
          intent,
          context: {
            previousMessages: messages,
            currentWorkflow: currentWorkflow || undefined,
          },
        }

        // Send to agent service
        const response: ChatAgentResponse = await chatAgentService.sendMessage(request)

        // Create agent message from response
        const agentMessage: ChatMessage = {
          id: response.messageId,
          type: 'agent',
          content: response.content,
          timestamp: new Date(),
          intent: response.intent,
          responseType: response.responseType,
          data: response.data,
          suggestedActions: response.suggestedActions,
          metadata: response.metadata,
        }

        // Add agent response to chat
        setMessages((prev) => [...prev, agentMessage])

        // Update workflow if present in response
        if (response.data?.workflowState) {
          setCurrentWorkflow(response.data.workflowState)

          // Subscribe to workflow updates if we haven't already
          if (
            !workflowSubscriptionRef.current &&
            response.data.workflowState.id
          ) {
            workflowSubscriptionRef.current = chatAgentService.subscribeToWorkflow(
              response.data.workflowState.id,
              (workflow) => {
                setCurrentWorkflow(workflow)
                if (onWorkflowUpdate) {
                  onWorkflowUpdate(workflow)
                }
              }
            )
          }
        }

        // Subscribe to quote updates if RFP was created
        if (response.data?.rfp && !quotesSubscriptionRef.current) {
          quotesSubscriptionRef.current = chatAgentService.subscribeToQuotes(
            response.data.rfp.id,
            (quotes) => {
              if (onQuotesUpdate) {
                onQuotesUpdate(quotes)
              }
            }
          )
        }
      } catch (error) {
        console.error('[useChatAgent] Error sending message:', error)

        // Add error message
        const errorMessage: ChatMessage = {
          id: `err-${Date.now()}`,
          type: 'agent',
          content: 'I apologize, but I encountered an error. Please try again.',
          timestamp: new Date(),
        }

        setMessages((prev) => [...prev, errorMessage])

        if (onError && error instanceof Error) {
          onError(error)
        }
      } finally {
        setIsProcessing(false)
      }
    },
    [
      sessionId,
      userId,
      messages,
      currentWorkflow,
      isProcessing,
      onWorkflowUpdate,
      onQuotesUpdate,
      onError,
    ]
  )

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    setMessages([])
    setCurrentWorkflow(null)

    // Unsubscribe from all subscriptions
    if (workflowSubscriptionRef.current) {
      workflowSubscriptionRef.current()
      workflowSubscriptionRef.current = null
    }

    if (quotesSubscriptionRef.current) {
      quotesSubscriptionRef.current()
      quotesSubscriptionRef.current = null
    }
  }, [])

  /**
   * Load session history
   */
  const loadSession = useCallback(async (sessionId: string) => {
    try {
      const loadedSession = await chatAgentService.getSessionHistory(sessionId)
      setSession(loadedSession)
      setMessages(loadedSession.messages)

      if (loadedSession.currentWorkflow) {
        setCurrentWorkflow(loadedSession.currentWorkflow)
      }
    } catch (error) {
      console.error('[useChatAgent] Error loading session:', error)
      if (onError && error instanceof Error) {
        onError(error)
      }
    }
  }, [onError])

  /**
   * Create new session
   */
  const createNewSession = useCallback(async () => {
    try {
      const newSession = await chatAgentService.createSession(userId)
      setSession(newSession)
      clearMessages()
    } catch (error) {
      console.error('[useChatAgent] Error creating session:', error)
      if (onError && error instanceof Error) {
        onError(error)
      }
    }
  }, [userId, clearMessages, onError])

  /**
   * Cleanup subscriptions on unmount
   */
  useEffect(() => {
    return () => {
      if (workflowSubscriptionRef.current) {
        workflowSubscriptionRef.current()
      }

      if (quotesSubscriptionRef.current) {
        quotesSubscriptionRef.current()
      }
    }
  }, [])

  return {
    messages,
    isProcessing,
    currentWorkflow,
    sendMessage,
    clearMessages,
    session,
    loadSession,
    createNewSession,
  }
}
