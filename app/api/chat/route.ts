/**
 * Chat API Route
 *
 * Direct OpenAI integration for chat messages with SSE streaming.
 * Replaces ChatKit with native OpenAI API calls.
 *
 * @see Linear issue ONEK-137 for multi-agent integration roadmap
 */

import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import OpenAI from 'openai'
import { z } from 'zod'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Request validation schema
const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message is required').max(10000, 'Message too long'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })).optional().default([]),
  context: z.object({
    flightRequestId: z.string().optional(),
    route: z.string().optional(),
    passengers: z.number().optional(),
    date: z.string().optional(),
  }).optional(),
})

// System prompt for JetVision assistant
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

When users provide flight requirements, acknowledge them and explain the next steps in the booking process.

Important context:
- You work with a network of trusted operators
- Quotes typically take 10-30 minutes to receive
- You can help with one-way, round-trip, and multi-leg flights
- Aircraft types range from light jets to heavy jets and turboprops`

/**
 * POST /api/chat
 *
 * Handle chat messages with streaming responses
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate user with Clerk
    const { userId } = await auth()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Please sign in to use the chat' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate environment
    if (!process.env.OPENAI_API_KEY) {
      console.error('[Chat API] Missing OPENAI_API_KEY')
      return new Response(
        JSON.stringify({ error: 'Configuration error', message: 'Chat service is not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Parse and validate request body
    const body = await req.json()
    const validationResult = ChatRequestSchema.safeParse(body)

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation error',
          message: validationResult.error.errors[0]?.message || 'Invalid request',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { message, conversationHistory, context } = validationResult.data

    // Build messages array for OpenAI
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
    ]

    // Add context if available
    if (context) {
      const contextParts = []
      if (context.flightRequestId) contextParts.push(`Flight Request ID: ${context.flightRequestId}`)
      if (context.route) contextParts.push(`Route: ${context.route}`)
      if (context.passengers) contextParts.push(`Passengers: ${context.passengers}`)
      if (context.date) contextParts.push(`Date: ${context.date}`)

      if (contextParts.length > 0) {
        messages.push({
          role: 'system',
          content: `Current flight request context:\n${contextParts.join('\n')}`,
        })
      }
    }

    // Add conversation history
    messages.push(...conversationHistory)

    // Add current user message
    messages.push({ role: 'user', content: message })

    // Create streaming response
    // Note: GPT-5.2 uses max_completion_tokens instead of max_tokens
    const stream = await openai.chat.completions.create({
      model: 'gpt-5.2',
      messages,
      stream: true,
      temperature: 0.7,
      max_completion_tokens: 1024,
      user: userId,
    })

    // Set up SSE response
    const encoder = new TextEncoder()

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              // Send SSE formatted data
              const data = JSON.stringify({ content, done: false })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            }

            // Check if stream is complete
            if (chunk.choices[0]?.finish_reason === 'stop') {
              const doneData = JSON.stringify({ content: '', done: true })
              controller.enqueue(encoder.encode(`data: ${doneData}\n\n`))
            }
          }

          controller.close()
        } catch (error) {
          console.error('[Chat API] Streaming error:', error)
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
    console.error('[Chat API] Error:', error)

    // Handle specific OpenAI errors
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        return new Response(
          JSON.stringify({ error: 'API error', message: 'Invalid API key configuration' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }
      if (error.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limited', message: 'Too many requests. Please try again in a moment.' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ error: 'Server error', message: 'An unexpected error occurred' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

/**
 * GET /api/chat
 *
 * Health check endpoint
 */
export async function GET() {
  const configured = !!process.env.OPENAI_API_KEY

  return new Response(
    JSON.stringify({
      status: 'ok',
      configured,
      model: configured ? 'gpt-5.2' : null,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
}
