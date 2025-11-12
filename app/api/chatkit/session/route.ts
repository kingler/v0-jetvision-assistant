/**
 * ChatKit Session API Route
 *
 * Creates ChatKit sessions for frontend chat interface.
 * Integrates with OpenAI Agent Builder workflows.
 *
 * @see docs/GPT5_CHATKIT_INTEGRATION.md for setup guide
 */

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * POST /api/chatkit/session
 *
 * Create a new ChatKit session for a user
 *
 * Request body:
 * - deviceId: string - Unique device identifier for the user
 *
 * Response:
 * - client_secret: string - Session token for ChatKit
 */
export async function POST(req: NextRequest) {
  try {
    const { deviceId } = await req.json()

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Missing required field: deviceId' },
        { status: 400 }
      )
    }

    // Validate environment variables
    if (!process.env.OPENAI_API_KEY) {
      console.error('ChatKit session creation failed: Missing OPENAI_API_KEY')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    if (!process.env.CHATKIT_WORKFLOW_ID) {
      console.error('ChatKit session creation failed: Missing CHATKIT_WORKFLOW_ID')
      return NextResponse.json(
        {
          error: 'ChatKit not configured',
          message:
            'Please create a workflow in OpenAI Agent Builder and set CHATKIT_WORKFLOW_ID',
        },
        { status: 500 }
      )
    }

    // Create ChatKit session
    // NOTE: This requires the OpenAI ChatKit API to be available
    // If you get errors, check that ChatKit is enabled for your OpenAI organization
    const session = await (openai as any).chatkit.sessions.create({
      workflow: {
        id: process.env.CHATKIT_WORKFLOW_ID,
      },
      user: deviceId,
    })

    console.log(`[ChatKit] Created session for device: ${deviceId}`)

    return NextResponse.json({
      client_secret: session.client_secret,
    })
  } catch (error: any) {
    console.error('ChatKit session creation failed:', error)

    // Handle specific OpenAI API errors
    if (error.status === 404) {
      return NextResponse.json(
        {
          error: 'Workflow not found',
          message: `Workflow ${process.env.CHATKIT_WORKFLOW_ID} not found. Please check CHATKIT_WORKFLOW_ID in .env.local`,
        },
        { status: 404 }
      )
    }

    if (error.status === 401) {
      return NextResponse.json(
        {
          error: 'Authentication failed',
          message: 'Invalid OPENAI_API_KEY. Please check your API key.',
        },
        { status: 401 }
      )
    }

    // Generic error response
    return NextResponse.json(
      {
        error: 'Failed to create session',
        message: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/chatkit/session
 *
 * Health check endpoint
 */
export async function GET() {
  const configured = !!(
    process.env.OPENAI_API_KEY && process.env.CHATKIT_WORKFLOW_ID
  )

  return NextResponse.json({
    status: 'ok',
    configured,
    workflowId: configured ? process.env.CHATKIT_WORKFLOW_ID : null,
  })
}
