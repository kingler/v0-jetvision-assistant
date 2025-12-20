/**
 * Chat API Route
 *
 * Direct OpenAI integration for chat messages with SSE streaming.
 * Integrates with Avinode MCP tools for flight search and RFP creation.
 *
 * @see Linear issue ONEK-120 for Avinode integration
 * @see Linear issue ONEK-137 for multi-agent integration roadmap
 */

import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import OpenAI from 'openai'
import { z } from 'zod'
import { AvinodeMCPServer } from '@/lib/mcp/avinode-server'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Singleton MCP server for Avinode tools
let avinodeMCP: AvinodeMCPServer | null = null

function getAvinodeMCP(): AvinodeMCPServer {
  if (!avinodeMCP) {
    avinodeMCP = new AvinodeMCPServer()
  }
  return avinodeMCP
}

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
    tripId: z.string().optional(),
    rfpId: z.string().optional(),
  }).optional(),
})

// System prompt for JetVision assistant with Avinode integration
const SYSTEM_PROMPT = `You are the JetVision AI Assistant, a professional private jet charter concierge.

CRITICAL: When a user provides flight details (airports, dates, passengers), you MUST IMMEDIATELY call the appropriate tools. Do NOT respond conversationally first - call the tools right away.

Tool Usage Rules:
- If user mentions origin/destination airports + date + passengers → IMMEDIATELY call search_flights
- If user asks to "create RFP", "get quotes", "book", or "proceed" → IMMEDIATELY call create_rfp with search results
- If user asks about quote status → IMMEDIATELY call get_quote_status or get_quotes

Example: User says "I need a flight from KTEB to KVNY for 4 passengers on Jan 20"
→ You MUST call search_flights with those exact parameters, then create_rfp

Your workflow:
1. When flight details are provided → call search_flights immediately
2. Show results and ask if they want to proceed
3. When confirmed → call create_rfp to get operator quotes
4. Present the Avinode marketplace deep link to the user

Communication style:
- Professional yet warm and personable
- Clear and concise, avoiding jargon
- Proactive in using tools when information is available

Context:
- You work with operators via the Avinode marketplace
- Quotes typically take 10-30 minutes to receive
- ICAO codes are 4-letter airport identifiers (e.g., KTEB for Teterboro, KVNY for Van Nuys)
- Always use ICAO codes when calling tools`

// OpenAI function definitions for Avinode tools
const AVINODE_TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_flights',
      description: 'Search for available charter flights and aircraft via Avinode marketplace. Use this when a user asks about flight availability or wants to see options.',
      parameters: {
        type: 'object',
        properties: {
          departure_airport: {
            type: 'string',
            description: 'Departure airport ICAO code (4 letters, e.g., KTEB, KJFK)',
          },
          arrival_airport: {
            type: 'string',
            description: 'Arrival airport ICAO code (4 letters, e.g., KOPF, KMIA)',
          },
          passengers: {
            type: 'number',
            description: 'Number of passengers (1-19)',
          },
          departure_date: {
            type: 'string',
            description: 'Departure date in YYYY-MM-DD format',
          },
          aircraft_category: {
            type: 'string',
            enum: ['light', 'midsize', 'heavy', 'ultra-long-range'],
            description: 'Optional aircraft category filter',
          },
        },
        required: ['departure_airport', 'arrival_airport', 'passengers', 'departure_date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_rfp',
      description: 'Create a Request for Proposal (RFP) and send to operators to get quotes. Use this when the user wants to proceed with getting actual quotes.',
      parameters: {
        type: 'object',
        properties: {
          flight_details: {
            type: 'object',
            description: 'Flight details for the RFP',
            properties: {
              departure_airport: { type: 'string' },
              arrival_airport: { type: 'string' },
              passengers: { type: 'number' },
              departure_date: { type: 'string' },
            },
            required: ['departure_airport', 'arrival_airport', 'passengers', 'departure_date'],
          },
          operator_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of operator IDs to send RFP to (from search results)',
          },
          special_requirements: {
            type: 'string',
            description: 'Optional special requirements or notes',
          },
        },
        required: ['flight_details', 'operator_ids'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_quote_status',
      description: 'Get the status of an RFP and how many operators have responded. Use this to check on pending quote requests.',
      parameters: {
        type: 'object',
        properties: {
          rfp_id: {
            type: 'string',
            description: 'The RFP ID to check status for',
          },
        },
        required: ['rfp_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_quotes',
      description: 'Get all quotes received for an RFP. Use this to see the actual quotes from operators.',
      parameters: {
        type: 'object',
        properties: {
          rfp_id: {
            type: 'string',
            description: 'The RFP ID to get quotes for',
          },
        },
        required: ['rfp_id'],
      },
    },
  },
]

/**
 * Execute an Avinode tool and return the result
 */
async function executeAvinodeTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const mcp = getAvinodeMCP()
    const result = await mcp.callTool(name, args)
    return { success: true, data: result }
  } catch (error) {
    console.error(`[Chat API] Tool execution error (${name}):`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * POST /api/chat
 *
 * Handle chat messages with streaming responses and Avinode tool integration
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
      if (context.tripId) contextParts.push(`Trip ID: ${context.tripId}`)
      if (context.rfpId) contextParts.push(`RFP ID: ${context.rfpId}`)

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

    // Check if Avinode MCP is available (for tool use)
    const mcp = getAvinodeMCP()
    const isMockMode = mcp.isUsingMockMode()

    console.log(`[Chat API] Processing message with Avinode tools (mock mode: ${isMockMode})`)

    // Detect if message contains flight details that should trigger tool usage
    const messageText = message.toLowerCase()
    const hasFlightDetails = (
      (messageText.includes('kteb') || messageText.includes('teterboro') ||
       messageText.includes('kvny') || messageText.includes('van nuys') ||
       messageText.includes('klax') || messageText.includes('kjfk') ||
       /[a-z]{4}/.test(messageText)) && // Has airport-like codes
      (messageText.includes('passenger') || /\d+\s*(pax|people|person)/.test(messageText)) &&
      (messageText.includes('202') || messageText.includes('january') ||
       messageText.includes('february') || messageText.includes('march') ||
       /\d{1,2}[\/\-]\d{1,2}/.test(messageText)) // Has date-like content
    )
    const wantsRFP = messageText.includes('rfp') || messageText.includes('quote') ||
                     messageText.includes('book') || messageText.includes('proceed')

    // Use 'required' for tool_choice when flight details are detected
    const toolChoice = hasFlightDetails || wantsRFP ? 'required' : 'auto'
    console.log(`[Chat API] Tool choice: ${toolChoice} (hasFlightDetails: ${hasFlightDetails}, wantsRFP: ${wantsRFP})`)

    // First, make a non-streaming call to check for tool usage
    const initialResponse = await openai.chat.completions.create({
      model: 'gpt-4o', // Use GPT-4o for function calling (GPT-5.2 may not support tools yet)
      messages,
      tools: AVINODE_TOOLS,
      tool_choice: toolChoice as 'auto' | 'required',
      temperature: 0.7,
      max_tokens: 1024,
      user: userId,
    })

    const initialMessage = initialResponse.choices[0]?.message

    // Check if the model wants to call a tool
    if (initialMessage?.tool_calls && initialMessage.tool_calls.length > 0) {
      // Execute all tool calls
      const toolResults: OpenAI.Chat.ChatCompletionToolMessageParam[] = []

      for (const toolCall of initialMessage.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments)
        console.log(`[Chat API] Executing tool: ${toolCall.function.name}`, args)

        const result = await executeAvinodeTool(toolCall.function.name, args)

        toolResults.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result.success ? result.data : { error: result.error }),
        })

        // If this was create_rfp, add special metadata to the response
        if (toolCall.function.name === 'create_rfp' && result.success) {
          console.log('[Chat API] RFP created:', result.data)
        }
      }

      // Add the assistant message with tool calls and tool results
      messages.push(initialMessage as OpenAI.Chat.ChatCompletionMessageParam)
      messages.push(...toolResults)

      // Get final response after tool execution
      const finalResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        temperature: 0.7,
        max_tokens: 1024,
        user: userId,
      })

      const finalContent = finalResponse.choices[0]?.message?.content || ''

      // Check if RFP was created and include deep link
      let rfpData = null
      for (const toolCall of initialMessage.tool_calls) {
        if (toolCall.function.name === 'create_rfp') {
          const resultIndex = initialMessage.tool_calls.indexOf(toolCall)
          const toolResult = toolResults[resultIndex]
          try {
            const parsed = JSON.parse(toolResult.content)
            if (parsed.rfp_id) {
              rfpData = parsed
            }
          } catch {
            // Ignore parse errors
          }
        }
      }

      // Return non-streaming JSON response with tool results
      const responseData: {
        content: string
        done: boolean
        tool_calls?: Array<{ name: string; result: unknown }>
        rfp_data?: unknown
        mock_mode: boolean
      } = {
        content: finalContent,
        done: true,
        tool_calls: initialMessage.tool_calls.map((tc, i) => ({
          name: tc.function.name,
          result: JSON.parse(toolResults[i].content),
        })),
        mock_mode: isMockMode,
      }

      if (rfpData) {
        responseData.rfp_data = rfpData
      }

      // Return as SSE format for consistency
      const encoder = new TextEncoder()
      const readableStream = new ReadableStream({
        start(controller) {
          const data = JSON.stringify(responseData)
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          controller.close()
        },
      })

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // No tool calls - stream the response directly
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 1024,
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
              const data = JSON.stringify({ content, done: false, mock_mode: isMockMode })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            }

            // Check if stream is complete
            if (chunk.choices[0]?.finish_reason === 'stop') {
              const doneData = JSON.stringify({ content: '', done: true, mock_mode: isMockMode })
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
  const openaiConfigured = !!process.env.OPENAI_API_KEY
  let avinodeStatus = 'unknown'

  try {
    const mcp = getAvinodeMCP()
    avinodeStatus = mcp.isUsingMockMode() ? 'mock' : 'connected'
  } catch {
    avinodeStatus = 'error'
  }

  return new Response(
    JSON.stringify({
      status: 'ok',
      openai_configured: openaiConfigured,
      avinode_status: avinodeStatus,
      model: openaiConfigured ? 'gpt-4o' : null,
      tools: AVINODE_TOOLS.map((t) => t.function.name),
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
}
