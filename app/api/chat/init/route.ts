/**
 * POST /api/chat/init
 *
 * Initialize a new chat session (LAZY - no database records created yet)
 * Called when user clicks "New" button to start a blank chat session
 *
 * Returns a temporary session ID that will be used until the first message is sent.
 * Database records (conversation + chat_session) are created lazily when the user
 * sends their first message, which also determines the conversation type.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getIsoAgentIdFromClerkUserId } from '@/lib/conversation/message-persistence'

/**
 * Generate a temporary session ID for client-side use
 * Format: temp-{timestamp}-{random}
 */
function generateTempSessionId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 10)
  return `temp-${timestamp}-${random}`
}

/**
 * Initialize a new chat session
 * Returns a temporary ID - database records created on first message
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

    console.log('[Chat Init API] Initializing temp chat session for Clerk user:', userId)

    // Verify user has an ISO agent ID (required for later database operations)
    // We validate this upfront to catch sync issues early
    let isoAgentId: string | null = null
    try {
      isoAgentId = await getIsoAgentIdFromClerkUserId(userId)
      if (!isoAgentId) {
        console.warn('[Chat Init API] ISO agent ID is null - user may not exist in iso_agents table')
        return NextResponse.json(
          {
            error: 'User not found',
            message: 'Your account is not synced to the database. Please contact support.',
          },
          { status: 404 }
        )
      }
      console.log('[Chat Init API] ISO agent ID verified:', isoAgentId)
    } catch (error) {
      console.error('[Chat Init API] Error getting ISO agent ID:', error)
      return NextResponse.json(
        {
          error: 'Database error',
          message: 'Failed to retrieve user information',
        },
        { status: 500 }
      )
    }

    // Generate temporary session ID (no database records created yet)
    const tempSessionId = generateTempSessionId()

    console.log('[Chat Init API] Generated temp session:', tempSessionId)

    // Return the temporary session ID
    // Database records will be created when the user sends their first message
    // At that point, the conversation type will be determined based on message content
    return NextResponse.json(
      {
        success: true,
        tempSessionId,
        isTemporary: true,
        // Include ISO agent ID so frontend can pass it back when creating real records
        isoAgentId,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Chat Init API] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to initialize chat session',
      },
      { status: 500 }
    )
  }
}
