/**
 * POST /api/chat/init
 * 
 * Initialize a new chat session with empty conversation
 * Called when user clicks "New" button to create a blank chat session
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  getOrCreateConversation,
  getIsoAgentIdFromClerkUserId,
} from '@/lib/conversation/message-persistence'
import {
  createOrUpdateChatSession,
  type ChatSessionInsert,
} from '@/lib/sessions/track-chat-session'

/**
 * Initialize a new chat session
 * Creates an empty conversation and chat_session for the user
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate user with Clerk
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to create a chat session' },
        { status: 401 }
      )
    }

    console.log('[Chat Init API] Initializing chat session for Clerk user:', userId)

    // Get ISO agent ID for the user
    let isoAgentId: string | null = null
    try {
      isoAgentId = await getIsoAgentIdFromClerkUserId(userId)
      if (isoAgentId) {
        console.log('[Chat Init API] ✅ ISO agent ID retrieved:', isoAgentId)
      } else {
        console.warn('[Chat Init API] ⚠️  ISO agent ID is null - user may not exist in iso_agents table')
        return NextResponse.json(
          {
            error: 'User not found',
            message: 'Your account is not synced to the database. Please contact support.',
          },
          { status: 404 }
        )
      }
    } catch (error) {
      console.error('[Chat Init API] ❌ Error getting ISO agent ID:', error)
      return NextResponse.json(
        {
          error: 'Database error',
          message: 'Failed to retrieve user information',
        },
        { status: 500 }
      )
    }

    // Create empty conversation (no request ID, no subject yet)
    let conversationId: string
    try {
      conversationId = await getOrCreateConversation({
        userId: isoAgentId,
        subject: 'New Flight Request',
        type: 'rfp_negotiation',
      })
      console.log('[Chat Init API] ✅ Conversation created:', conversationId)
    } catch (error) {
      console.error('[Chat Init API] ❌ Error creating conversation:', error)
      return NextResponse.json(
        {
          error: 'Database error',
          message: 'Failed to create conversation',
        },
        { status: 500 }
      )
    }

    // Create chat session linked to the conversation
    let chatSession
    try {
      const chatSessionData: ChatSessionInsert = {
        conversation_id: conversationId,
        iso_agent_id: isoAgentId,
        status: 'active',
      }

      chatSession = await createOrUpdateChatSession(chatSessionData)

      if (!chatSession) {
        throw new Error('Failed to create chat session')
      }

      console.log('[Chat Init API] ✅ Chat session created:', chatSession.id)
    } catch (error) {
      console.error('[Chat Init API] ❌ Error creating chat session:', error)
      return NextResponse.json(
        {
          error: 'Database error',
          message: 'Failed to create chat session',
        },
        { status: 500 }
      )
    }

    // Return the conversation and chat session IDs
    return NextResponse.json(
      {
        success: true,
        conversationId,
        chatSessionId: chatSession.id,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Chat Init API] ❌ Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to initialize chat session',
      },
      { status: 500 }
    )
  }
}
