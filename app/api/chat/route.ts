/**
 * Chat API Route
 *
 * Multi-Agent System integration for chat messages with SSE streaming.
 * Routes through OrchestratorAgent for intelligent conversation handling.
 * Falls back to direct OpenAI for simple queries.
 *
 * @see Linear issue ONEK-120 for Avinode integration
 * @see Linear issue ONEK-137 for multi-agent integration (IMPLEMENTED)
 */

import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import OpenAI from 'openai'
import type { ChatCompletionMessageToolCall } from 'openai/resources/chat/completions'
import { z } from 'zod'
import { AvinodeMCPServer } from '@/lib/mcp/avinode-server'
import { supabaseAdmin } from '@/lib/supabase'
import type { PipelineData, PipelineStats, PipelineRequest } from '@/lib/types/chat-agent'

// Agent integration imports
import {
  getOrCreateOrchestrator,
  createAgentSSEStream,
  SSE_HEADERS,
} from '@/lib/agents'
import type { AgentStreamResponse } from '@/lib/types/chat-agent'

// Feature flag for agent-based processing
const USE_AGENT_ORCHESTRATION = process.env.USE_AGENT_ORCHESTRATION !== 'false'

// Type guard for standard function tool calls
function isFunctionToolCall(
  toolCall: ChatCompletionMessageToolCall
): toolCall is ChatCompletionMessageToolCall & { type: 'function'; function: { name: string; arguments: string } } {
  return toolCall.type === 'function' && 'function' in toolCall
}

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

CRITICAL WORKFLOW: When a user provides flight details (airports, dates, passengers), you MUST:
1. Call create_trip to create a trip container and get the deep link
2. Present the deep link prominently so the user can access Avinode marketplace
3. The deep link is ESSENTIAL - it's how users select flights and get quotes

Tool Usage Rules:
- Flight request with airports + date + passengers → Call create_trip (returns deep_link)
- User provides a Trip ID → Call get_rfq with the Trip ID to retrieve all RFQs and quotes for that trip
- User asks about quote status → Call get_quote_status or get_quotes
- For flight search preview → Call search_flights (optional, for showing options)

Example: User says "I need a flight from KTEB to KVNY for 4 passengers on Jan 20"
→ Call create_trip with departure_airport, arrival_airport, passengers, departure_date
→ Present the deep_link prominently in your response
→ The deep link opens Avinode marketplace where user selects operators

Human-in-the-Loop Workflow:
1. User provides flight details → You call create_trip
2. You present the Avinode marketplace deep link prominently
3. The user opens the deep link in Avinode, reviews operators, and selects which ones to contact
4. After operators respond (10-30 minutes), user gets quotes with a Trip ID
5. User provides the Trip ID → You call get_rfq with the Trip ID to retrieve all RFQs and quotes for that trip
6. DO NOT list flight details in your response - they are already displayed in Step 3 of the UI
7. Instead, provide clear instructions about next steps

CRITICAL: When quotes are retrieved (after get_rfq is called):
- DO NOT list individual flights, aircraft types, operators, or pricing details in your message
- All flight details are already displayed in Step 3 of the UI workflow
- Instead, provide clear instructions:
  1. Wait for operators to respond (if status is "Unanswered" or "Sent")
  2. When operators provide quotes, a "Review and Book" button will appear on the flight card
  3. Click the "Review and Book" button on the flight card for the flight the customer selects
- Keep your response concise and focused on guidance, not repeating information already visible

Communication style:
- Professional yet warm and personable
- Clear and concise, avoiding jargon
- ALWAYS present the deep link prominently - it's the key to the marketplace
- Never duplicate information that's already displayed in the UI

Context:
- You work with operators via the Avinode marketplace
- The deep link (from create_trip) is how users access the marketplace to select operators
- After creating the trip, the user must MANUALLY select operators in Avinode via the deep link
- Quotes typically take 10-30 minutes to receive after operators are contacted
- ICAO codes are 4-letter airport identifiers (e.g., KTEB for Teterboro, KVNY for Van Nuys)
- Always use ICAO codes when calling tools
- Trip IDs are alphanumeric identifiers like atrip-64956150`

// OpenAI function definitions for Avinode tools
const AVINODE_TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'create_trip',
      description: 'Create a trip container in Avinode and return a deep link for manual operator selection. This is the PRIMARY tool for initiating the flight booking workflow. The deep link allows users to open the Avinode marketplace to select aircraft and send RFPs to operators. Use this FIRST when a user provides flight details.',
      parameters: {
        type: 'object',
        properties: {
          departure_airport: {
            type: 'string',
            description: 'Departure airport ICAO code (4 letters, e.g., KTEB, KJFK)',
          },
          arrival_airport: {
            type: 'string',
            description: 'Arrival airport ICAO code (4 letters, e.g., KOPF, KVNY)',
          },
          departure_date: {
            type: 'string',
            description: 'Departure date in YYYY-MM-DD format',
          },
          passengers: {
            type: 'number',
            description: 'Number of passengers (1-19)',
          },
          departure_time: {
            type: 'string',
            description: 'Optional departure time in HH:MM format',
          },
          return_date: {
            type: 'string',
            description: 'Optional return date for round-trip in YYYY-MM-DD format',
          },
          return_time: {
            type: 'string',
            description: 'Optional return time in HH:MM format',
          },
          aircraft_category: {
            type: 'string',
            enum: ['light', 'midsize', 'heavy', 'ultra-long-range'],
            description: 'Optional aircraft category preference',
          },
          special_requirements: {
            type: 'string',
            description: 'Optional special requirements or notes',
          },
          client_reference: {
            type: 'string',
            description: 'Optional internal reference ID for tracking',
          },
        },
        required: ['departure_airport', 'arrival_airport', 'departure_date', 'passengers'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_flights',
      description: 'Search for available charter flights and aircraft via Avinode marketplace. Use this when a user wants to preview available options before creating a trip.',
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
      description: 'Create a Request for Proposal (RFP) and send to operators to get quotes. Use this as an alternative to create_trip for automated RFP distribution.',
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
  {
    type: 'function',
    function: {
      name: 'get_rfq',
      description: 'Get RFQ (Request for Quote) details including all received quotes from operators. This tool automatically handles both RFQ IDs and Trip IDs: Use with RFQ ID (arfq-*) for a single RFQ, or Trip ID (atrip-*) to get all RFQs for that trip. When user provides a Trip ID, use this tool with the Trip ID to retrieve all RFQs and quotes.',
      parameters: {
        type: 'object',
        properties: {
          rfq_id: {
            type: 'string',
            description: 'The RFQ identifier (e.g., arfq-12345678) or Trip ID (e.g., atrip-12345678). If it starts with "atrip-", returns all RFQs for that trip.',
          },
        },
        required: ['rfq_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_quote',
      description: 'Get detailed information about a specific quote from an operator, including pricing breakdown, aircraft details, and availability.',
      parameters: {
        type: 'object',
        properties: {
          quote_id: {
            type: 'string',
            description: 'The quote identifier (e.g., aquote-12345678)',
          },
        },
        required: ['quote_id'],
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
 * Fetch pipeline data for the current user
 * Returns stats and recent requests for inline dashboard display
 *
 * @see ONEK-139 Inline Deals/Pipeline View in Chat
 */
async function fetchPipelineData(userId: string): Promise<PipelineData> {
  console.log(`[Chat API] Fetching pipeline data for user: ${userId}`)

  // Fetch requests with stats
  const { data: requests, error } = await supabaseAdmin
    .from('requests')
    .select('id, departure_airport, arrival_airport, departure_date, passengers, status, created_at')
    .eq('clerk_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('[Chat API] Error fetching pipeline data:', error)
    // Return empty data on error
    return {
      stats: {
        totalRequests: 0,
        pendingRequests: 0,
        completedRequests: 0,
        totalQuotes: 0,
        activeWorkflows: 0,
      },
      recentRequests: [],
      lastUpdated: new Date().toISOString(),
    }
  }

  // Calculate stats
  // Valid request_status values: draft, pending, analyzing, fetching_client_data,
  // searching_flights, awaiting_quotes, analyzing_proposals, generating_email,
  // sending_proposal, completed, failed, cancelled
  const stats: PipelineStats = {
    totalRequests: requests?.length || 0,
    pendingRequests: requests?.filter(r => r.status === 'pending' || r.status === 'draft').length || 0,
    completedRequests: requests?.filter(r => r.status === 'completed').length || 0,
    totalQuotes: 0, // Will be populated from quotes table if needed
    activeWorkflows: requests?.filter(r =>
      r.status === 'analyzing' ||
      r.status === 'fetching_client_data' ||
      r.status === 'searching_flights' ||
      r.status === 'awaiting_quotes' ||
      r.status === 'analyzing_proposals' ||
      r.status === 'generating_email' ||
      r.status === 'sending_proposal'
    ).length || 0,
  }

  // Fetch quote count
  const { count: quoteCount } = await supabaseAdmin
    .from('quotes')
    .select('*', { count: 'exact', head: true })
    .in('request_id', requests?.map(r => r.id) || [])

  stats.totalQuotes = quoteCount || 0

  // Map requests to PipelineRequest format
  const recentRequests: PipelineRequest[] = (requests || []).map(r => ({
    id: r.id,
    departureAirport: r.departure_airport || 'N/A',
    arrivalAirport: r.arrival_airport || 'N/A',
    departureDate: r.departure_date || '',
    passengers: r.passengers || 0,
    status: r.status || 'pending',
    createdAt: r.created_at || new Date().toISOString(),
    clientName: undefined, // client_name not in requests table - would need to join with client_profiles
  }))

  console.log(`[Chat API] Pipeline data fetched: ${stats.totalRequests} requests, ${stats.totalQuotes} quotes`)

  return {
    stats,
    recentRequests,
    lastUpdated: new Date().toISOString(),
  }
}

/**
 * POST /api/chat
 *
 * Handle chat messages with streaming responses and Avinode tool integration
 */
export async function POST(req: NextRequest) {
  try {
    // Check for auth bypass in development mode
    const isDevelopment = process.env.NODE_ENV === 'development'
    const bypassAuth = isDevelopment && process.env.BYPASS_AUTH === 'true'

    // Authenticate user with Clerk (or use dev bypass)
    const { userId: clerkUserId } = await auth()
    const userId = clerkUserId || (bypassAuth ? 'dev-user-bypass' : null)

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

    // =========================================================================
    // ONEK-137: Multi-Agent System Integration
    // When USE_AGENT_ORCHESTRATION is enabled, route through OrchestratorAgent
    // for intelligent conversation handling with full MAS coordination.
    // Falls back to direct OpenAI for simple queries or when disabled.
    // =========================================================================
    if (USE_AGENT_ORCHESTRATION) {
      try {
        console.log('[Chat API] Using OrchestratorAgent for processing')

        // Generate session ID (use existing or create new)
        const sessionId = context?.flightRequestId || `chat-${userId}-${Date.now()}`

        // Get or create orchestrator for this session
        const orchestrator = await getOrCreateOrchestrator(sessionId)

        // Execute with full conversation context
        const result = await orchestrator.execute({
          sessionId,
          userId,
          requestId: `msg-${Date.now()}`,
          metadata: {
            userMessage: message,
            conversationHistory,
            context,
          },
        })

        // Type assertion for result data that may contain workflow_status
        const resultData = result.data as { workflow_status?: string } | undefined

        console.log('[Chat API] OrchestratorAgent result:', {
          success: result.success,
          hasData: !!result.data,
          hasError: !!result.error,
          toolCallsCount: result.metadata?.toolCalls || 0,
          workflowStatus: resultData?.workflow_status,
        })

        // Check if workflow actually completed successfully
        // The orchestrator may return success:true but with workflow_status:'FAILED'
        // In that case, fall back to direct Avinode tools
        const workflowFailed = resultData?.workflow_status === 'FAILED'
        if (workflowFailed) {
          console.log('[Chat API] OrchestratorAgent workflow failed, falling back to direct Avinode tools')
          // Continue to legacy processing below
        } else {
          // Check if MCP is using mock mode for response metadata
          const mcp = getAvinodeMCP()
          const isMockMode = mcp.isUsingMockMode()

          // Stream response using the new adapter
          return new Response(createAgentSSEStream(result, isMockMode), {
            headers: SSE_HEADERS,
          })
        }
      } catch (agentError) {
        // Log but don't fail - fall back to direct OpenAI
        console.error('[Chat API] OrchestratorAgent error, falling back to OpenAI:', agentError)
        // Continue to traditional OpenAI processing below
      }
    }

    // =========================================================================
    // Legacy: Direct OpenAI Processing (fallback or when agent disabled)
    // =========================================================================

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

    // Check for ICAO airport codes (4 uppercase letters) - case-insensitive pattern
    const hasAirportCode = /\b[a-z]{4}\b/i.test(message) || // ICAO codes like KTEB, KLAX
      messageText.includes('teterboro') ||
      messageText.includes('van nuys') ||
      messageText.includes('los angeles') ||
      messageText.includes('new york') ||
      messageText.includes('jfk') ||
      messageText.includes('lax')

    // Check for passenger count
    const hasPassengers = messageText.includes('passenger') ||
      /\d+\s*(pax|people|person|guests?)/i.test(message)

    // Check for date reference
    const hasDate = messageText.includes('202') || // Years 2020-2029
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(message) ||
      /\d{1,2}[\/\-]\d{1,2}/.test(message) || // Date formats like 1/25 or 12-25
      messageText.includes('tomorrow') ||
      messageText.includes('next week')

    // Check for flight-related keywords
    const hasFlightKeywords = messageText.includes('flight') ||
      messageText.includes('charter') ||
      messageText.includes('jet') ||
      messageText.includes('fly') ||
      messageText.includes('travel')

    const hasFlightDetails = hasAirportCode && hasPassengers && (hasDate || hasFlightKeywords)

    const wantsRFP = messageText.includes('rfp') || messageText.includes('quote') ||
                     messageText.includes('book') || messageText.includes('proceed')

    // ONEK-139: Detect pipeline/deals view intent
    const wantsPipeline = messageText.includes('pipeline') ||
      messageText.includes('deals') ||
      messageText.includes('my requests') ||
      messageText.includes('my flights') ||
      messageText.includes('show me my') ||
      messageText.includes('my bookings') ||
      messageText.includes('active requests') ||
      messageText.includes('pending requests') ||
      (messageText.includes('show') && messageText.includes('request'))

    // Detect if message contains a Trip ID (6-12 alphanumeric characters)
    // Pattern: standalone alphanumeric string that looks like a Trip ID
    const tripIdPattern = /\b[A-Z0-9]{6,12}\b/i
    const hasTripId = tripIdPattern.test(message) &&
                      (messageText.includes('trip id') ||
                       messageText.includes('tripid') ||
                       messageText.includes('trip:') ||
                       messageText.includes('here is') ||
                       messageText.includes("here's") ||
                       messageText.includes('my trip') ||
                       // Also match if context indicates we're waiting for a trip ID
                       context?.tripId !== undefined)

    // Use 'required' for tool_choice when flight details, RFP request, or Trip ID is detected
    const toolChoice = hasFlightDetails || wantsRFP || hasTripId ? 'required' : 'auto'
    console.log(`[Chat API] Message analysis:`)
    console.log(`  - hasAirportCode: ${hasAirportCode}`)
    console.log(`  - hasPassengers: ${hasPassengers}`)
    console.log(`  - hasDate: ${hasDate}`)
    console.log(`  - hasFlightKeywords: ${hasFlightKeywords}`)
    console.log(`  - hasFlightDetails: ${hasFlightDetails}`)
    console.log(`  - wantsRFP: ${wantsRFP}`)
    console.log(`  - wantsPipeline: ${wantsPipeline}`)
    console.log(`  - hasTripId: ${hasTripId}`)
    console.log(`[Chat API] Tool choice: ${toolChoice}`)

    // ONEK-139: Handle pipeline requests with early return (no OpenAI call needed)
    if (wantsPipeline) {
      console.log('[Chat API] Pipeline intent detected - fetching pipeline data')
      const pipelineData = await fetchPipelineData(userId)
      const mcp = getAvinodeMCP()
      const isMockMode = mcp.isUsingMockMode()

      // Generate a friendly response message
      const pipelineContent = pipelineData.stats.totalRequests > 0
        ? `Here's your current pipeline! You have ${pipelineData.stats.totalRequests} total request${pipelineData.stats.totalRequests !== 1 ? 's' : ''}, with ${pipelineData.stats.pendingRequests} pending and ${pipelineData.stats.completedRequests} completed.`
        : `Your pipeline is empty. Start by creating a new flight request - just tell me where you'd like to fly!`

      const responseData = {
        content: pipelineContent,
        done: true,
        mock_mode: isMockMode,
        pipeline_data: pipelineData,
      }

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

    console.log(`[Chat API] OpenAI response:`)
    console.log(`  - finish_reason: ${initialResponse.choices[0]?.finish_reason}`)
    console.log(`  - tool_calls count: ${initialMessage?.tool_calls?.length || 0}`)
    if (initialMessage?.tool_calls) {
      for (const tc of initialMessage.tool_calls) {
        if ('function' in tc) {
          console.log(`  - tool: ${tc.function.name}`)
        }
      }
    }

    // Check if the model wants to call a tool
    if (initialMessage?.tool_calls && initialMessage.tool_calls.length > 0) {
      // Execute all tool calls
      const toolResults: OpenAI.Chat.ChatCompletionToolMessageParam[] = []

      // Track if we need to auto-chain create_rfp after search_flights
      let searchFlightsArgs: Record<string, unknown> | null = null
      let searchFlightsResult: { success: boolean; data?: unknown } | null = null

      for (const toolCall of initialMessage.tool_calls) {
        // Skip non-function tool calls
        if (!isFunctionToolCall(toolCall)) continue

        const args = JSON.parse(toolCall.function.arguments)
        console.log(`[Chat API] Executing tool: ${toolCall.function.name}`, args)

        const result = await executeAvinodeTool(toolCall.function.name, args)
        console.log(`[Chat API] Tool ${toolCall.function.name} result:`, JSON.stringify(result, null, 2))

        toolResults.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result.success ? result.data : { error: result.error }),
        })

        // Track search_flights for auto-chaining to create_rfp
        if (toolCall.function.name === 'search_flights' && result.success) {
          searchFlightsArgs = args
          searchFlightsResult = result
          console.log('[Chat API] search_flights succeeded, will auto-chain create_rfp')
        }

        // If this was create_rfp, add special metadata to the response
        if (toolCall.function.name === 'create_rfp' && result.success) {
          console.log('[Chat API] RFP created:', result.data)
        }
      }

      // AUTO-CHAIN: If search_flights was called but create_rfp was not, call it automatically
      // This ensures the deep link is always generated after a successful flight search
      const functionToolCalls = initialMessage.tool_calls.filter(isFunctionToolCall)
      const hasCreateRfp = functionToolCalls.some(tc => tc.function.name === 'create_rfp')

      if (searchFlightsArgs && searchFlightsResult && !hasCreateRfp) {
        console.log('[Chat API] Auto-chaining create_rfp after search_flights')

        // Extract operator IDs from search results if available
        const searchData = searchFlightsResult.data as { operators?: Array<{ id: string }> } | undefined
        const operatorIds = searchData?.operators?.map((op: { id: string }) => op.id) || ['auto-selected']

        const createRfpArgs = {
          flight_details: {
            departure_airport: searchFlightsArgs.departure_airport,
            arrival_airport: searchFlightsArgs.arrival_airport,
            passengers: searchFlightsArgs.passengers,
            departure_date: searchFlightsArgs.departure_date,
          },
          operator_ids: operatorIds,
        }

        console.log('[Chat API] Auto-calling create_rfp with:', createRfpArgs)

        const rfpResult = await executeAvinodeTool('create_rfp', createRfpArgs)

        // Add a synthetic tool call for create_rfp
        const syntheticToolCallId = `auto_create_rfp_${Date.now()}`
        const syntheticToolCall = {
          id: syntheticToolCallId,
          type: 'function' as const,
          function: {
            name: 'create_rfp',
            arguments: JSON.stringify(createRfpArgs),
          },
        }

        // Add to the assistant message's tool_calls
        initialMessage.tool_calls.push(syntheticToolCall)

        toolResults.push({
          role: 'tool',
          tool_call_id: syntheticToolCallId,
          content: JSON.stringify(rfpResult.success ? rfpResult.data : { error: rfpResult.error }),
        })

        if (rfpResult.success) {
          console.log('[Chat API] Auto-chained RFP created:', rfpResult.data)
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

      // Check if trip/RFP was created and include deep link
      let tripData = null
      let rfpData = null
      let rfqData = null
      // Re-filter to include any auto-chained tool calls
      const allFunctionToolCalls = initialMessage.tool_calls.filter(isFunctionToolCall)

      for (let i = 0; i < allFunctionToolCalls.length; i++) {
        const toolCall = allFunctionToolCalls[i]
        const toolResult = toolResults[i]
        if (!toolResult) continue

        const toolResultContent = typeof toolResult.content === 'string'
          ? toolResult.content
          : JSON.stringify(toolResult.content)

        // Handle create_trip tool - returns deep_link (PRIMARY workflow)
        if (toolCall.function.name === 'create_trip') {
          try {
            const parsed = JSON.parse(toolResultContent)
            if (parsed.trip_id && parsed.deep_link) {
              tripData = parsed
              console.log('[Chat API] Trip created with deep link:', {
                tripId: parsed.trip_id,
                deepLink: parsed.deep_link,
              })
            }
          } catch {
            // Ignore parse errors
          }
        }

        if (toolCall.function.name === 'create_rfp') {
          try {
            const parsed = JSON.parse(toolResultContent)
            if (parsed.rfp_id) {
              rfpData = parsed
            }
          } catch {
            // Ignore parse errors
          }
        }

        // Handle get_rfq tool - returns quotes data for a single RFQ
        if (toolCall.function.name === 'get_rfq') {
          try {
            const parsed = JSON.parse(toolResultContent)
            if (parsed.rfq_id || parsed.quotes) {
              rfqData = parsed
              console.log('[Chat API] RFQ data retrieved:', {
                rfqId: parsed.rfq_id,
                quotesCount: parsed.quotes?.length || 0,
              })
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
        trip_data?: unknown
        rfp_data?: unknown
        rfq_data?: unknown
        mock_mode: boolean
      } = {
        content: finalContent,
        done: true,
        tool_calls: allFunctionToolCalls.map((tc, i) => ({
          name: tc.function.name,
          result: toolResults[i] ? JSON.parse(
            typeof toolResults[i].content === 'string'
              ? toolResults[i].content
              : JSON.stringify(toolResults[i].content)
          ) : null,
        })),
        mock_mode: isMockMode,
      }

      if (tripData) {
        responseData.trip_data = tripData
        console.log(`[Chat API] Including trip_data in response:`, JSON.stringify(tripData, null, 2))
      }

      if (rfpData) {
        responseData.rfp_data = rfpData
      }

      if (rfqData) {
        responseData.rfq_data = rfqData
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
      // Handle other OpenAI API errors with more detail
      return new Response(
        JSON.stringify({
          error: 'OpenAI API error',
          message: error.message || 'An error occurred with the AI service',
          code: error.code,
          status: error.status,
        }),
        { status: error.status || 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Handle TypeError (e.g., missing methods, undefined access)
    if (error instanceof TypeError) {
      console.error('[Chat API] TypeError:', error.message, error.stack)
      return new Response(
        JSON.stringify({
          error: 'Server configuration error',
          message: process.env.NODE_ENV === 'development'
            ? `Configuration error: ${error.message}`
            : 'A server configuration error occurred. Please contact support.',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Handle generic errors with more detail
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const isDev = process.env.NODE_ENV === 'development'

    return new Response(
      JSON.stringify({
        error: 'Server error',
        message: isDev ? errorMessage : 'An unexpected error occurred. Please try again.',
        ...(isDev && error instanceof Error ? { stack: error.stack } : {}),
      }),
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
      tools: AVINODE_TOOLS.filter((t): t is OpenAI.Chat.ChatCompletionTool & { type: 'function'; function: { name: string } } =>
        t.type === 'function' && 'function' in t
      ).map((t) => t.function.name),
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
}
