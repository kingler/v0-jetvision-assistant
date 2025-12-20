/**
 * Test Chat API Route (Development Only)
 *
 * This endpoint allows testing the chat without authentication.
 * Only available in development mode.
 *
 * GET /api/chat/test - Test GPT-5.2 with a sample message
 */

import { NextRequest } from 'next/server'
import OpenAI from 'openai'

// Only allow in development
const isDev = process.env.NODE_ENV === 'development'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const SYSTEM_PROMPT = `You are the JetVision AI Assistant, a professional private jet charter concierge. You help clients book private jet flights by:

1. Understanding their travel requirements (route, dates, passengers, preferences)
2. Searching for available aircraft that match their criteria
3. Analyzing quotes from operators to find the best options
4. Presenting recommendations with clear pricing and details
5. Facilitating the booking process

Your communication style should be:
- Professional yet warm and personable
- Clear and concise, avoiding jargon
- Proactive in offering relevant suggestions
- Knowledgeable about private aviation

When users provide flight requirements, acknowledge them and explain the next steps in the booking process.`

export async function GET(req: NextRequest) {
  // Block in production
  if (!isDev) {
    return new Response(
      JSON.stringify({ error: 'Not available in production' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Get test message from query param or use default
  const message = req.nextUrl.searchParams.get('message') ||
    'I need a private jet from New York to Miami for 4 passengers next Friday'

  if (!process.env.OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'OpenAI API key not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Create streaming response with GPT-5.2
    const stream = await openai.chat.completions.create({
      model: 'gpt-5.2',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message },
      ],
      stream: true,
      temperature: 0.7,
      max_completion_tokens: 1024,
    })

    // Set up SSE response
    const encoder = new TextEncoder()

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              const data = JSON.stringify({ content, done: false })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            }

            if (chunk.choices[0]?.finish_reason === 'stop') {
              const doneData = JSON.stringify({ content: '', done: true })
              controller.enqueue(encoder.encode(`data: ${doneData}\n\n`))
            }
          }

          controller.close()
        } catch (error) {
          console.error('[Test Chat API] Streaming error:', error)
          const errorData = JSON.stringify({
            error: true,
            message: 'Stream interrupted',
            done: true,
          })
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('[Test Chat API] Error:', error)

    if (error instanceof OpenAI.APIError) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API error', message: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
