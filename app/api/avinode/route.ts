/**
 * Avinode MCP Tools API Route
 *
 * Provides HTTP access to Avinode MCP tools for the frontend.
 * Supports mock mode when AVINODE_API_KEY is not configured.
 *
 * @see Linear issue ONEK-120 for Avinode integration details
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { AvinodeMCPServer } from '@/lib/mcp/avinode-server'

// Type definitions for tool calls
interface ToolCallRequest {
  tool: 'search_flights' | 'create_rfp' | 'get_quote_status' | 'get_quotes' | 'search_airports' | 'send_trip_message' | 'get_trip_messages' | 'create_trip' | 'get_rfq' | 'get_rfq_raw' | 'list_trips' | 'cancel_trip'
  params: Record<string, unknown>
}

// Singleton MCP server instance
let mcpServer: AvinodeMCPServer | null = null

function getMCPServer(): AvinodeMCPServer {
  if (!mcpServer) {
    mcpServer = new AvinodeMCPServer()
  }
  return mcpServer
}

/**
 * POST /api/avinode
 *
 * Execute an Avinode MCP tool
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to access Avinode tools' },
        { status: 401 }
      )
    }

    // Parse request
    const body = await req.json() as ToolCallRequest

    if (!body.tool) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Tool name is required' },
        { status: 400 }
      )
    }

    const server = getMCPServer()

    // Log mock mode status
    const isMockMode = server.isUsingMockMode()
    console.log(`[Avinode API] Calling tool: ${body.tool} (mock mode: ${isMockMode})`)

    // Execute the tool based on the request
    let result: unknown

    switch (body.tool) {
      case 'search_flights': {
        const params = body.params as {
          departure_airport: string
          arrival_airport: string
          passengers: number
          departure_date: string
          aircraft_category?: string
        }

        if (!params.departure_airport || !params.arrival_airport || !params.passengers || !params.departure_date) {
          return NextResponse.json(
            { error: 'Bad Request', message: 'Missing required parameters for search_flights' },
            { status: 400 }
          )
        }

        result = await server.callTool('search_flights', params)
        break
      }

      case 'create_rfp': {
        const params = body.params as {
          flight_details: {
            departure_airport: string
            arrival_airport: string
            passengers: number
            departure_date: string
          }
          operator_ids: string[]
          special_requirements?: string
        }

        if (!params.flight_details || !params.operator_ids) {
          return NextResponse.json(
            { error: 'Bad Request', message: 'Missing required parameters for create_rfp' },
            { status: 400 }
          )
        }

        result = await server.callTool('create_rfp', params)
        break
      }

      case 'get_quote_status': {
        const params = body.params as { rfp_id: string }

        if (!params.rfp_id) {
          return NextResponse.json(
            { error: 'Bad Request', message: 'rfp_id is required for get_quote_status' },
            { status: 400 }
          )
        }

        result = await server.callTool('get_quote_status', params)
        break
      }

      case 'get_quotes': {
        const params = body.params as { rfp_id: string }

        if (!params.rfp_id) {
          return NextResponse.json(
            { error: 'Bad Request', message: 'rfp_id is required for get_quotes' },
            { status: 400 }
          )
        }

        result = await server.callTool('get_quotes', params)
        break
      }

      case 'search_airports': {
        const params = body.params as { query: string; country?: string }

        if (!params.query) {
          return NextResponse.json(
            { error: 'Bad Request', message: 'query is required for search_airports' },
            { status: 400 }
          )
        }

        // Use the mock client directly for airport search
        result = await server.callTool('search_airports', params)
        break
      }

      case 'send_trip_message': {
        const params = body.params as {
          trip_id: string
          message: string
          recipient_type?: 'all_operators' | 'specific_operator'
          operator_id?: string
        }

        if (!params.trip_id || !params.message) {
          return NextResponse.json(
            { error: 'Bad Request', message: 'trip_id and message are required for send_trip_message' },
            { status: 400 }
          )
        }

        if (params.recipient_type === 'specific_operator' && !params.operator_id) {
          return NextResponse.json(
            { error: 'Bad Request', message: 'operator_id is required when recipient_type is specific_operator' },
            { status: 400 }
          )
        }

        result = await server.callTool('send_trip_message', params)
        break
      }

      case 'get_trip_messages': {
        const params = body.params as {
          trip_id?: string
          request_id?: string
          limit?: number
          since?: string
        }

        if (!params.trip_id && !params.request_id) {
          return NextResponse.json(
            { error: 'Bad Request', message: 'Either trip_id or request_id is required for get_trip_messages' },
            { status: 400 }
          )
        }

        result = await server.callTool('get_trip_messages', params)
        break
      }

      case 'create_trip': {
        const params = body.params as {
          departure_airport: string
          arrival_airport: string
          departure_date: string
          passengers: number
          departure_time?: string
          return_date?: string
          return_time?: string
          aircraft_category?: string
          special_requirements?: string
          client_reference?: string
        }

        if (!params.departure_airport || !params.arrival_airport || !params.departure_date || !params.passengers) {
          return NextResponse.json(
            { error: 'Bad Request', message: 'departure_airport, arrival_airport, departure_date, and passengers are required for create_trip' },
            { status: 400 }
          )
        }

        result = await server.callTool('create_trip', params)
        break
      }

      case 'get_rfq': {
        const params = body.params as { rfq_id: string }

        if (!params.rfq_id) {
          return NextResponse.json(
            { error: 'Bad Request', message: 'rfq_id is required for get_rfq' },
            { status: 400 }
          )
        }

        result = await server.callTool('get_rfq', params)
        break
      }

      case 'get_rfq_raw': {
        const params = body.params as { rfq_id: string; options?: Record<string, unknown> }

        if (!params.rfq_id) {
          return NextResponse.json(
            { error: 'Bad Request', message: 'rfq_id is required for get_rfq_raw' },
            { status: 400 }
          )
        }

        result = await server.callTool('get_rfq_raw', params)
        break
      }

      case 'list_trips': {
        const params = body.params as {
          limit?: number
          status?: 'all' | 'active' | 'completed'
        }

        result = await server.callTool('list_trips', params)
        break
      }

      case 'cancel_trip': {
        const params = body.params as { trip_id: string; reason?: string }

        if (!params.trip_id) {
          return NextResponse.json(
            { error: 'Bad Request', message: 'trip_id is required for cancel_trip' },
            { status: 400 }
          )
        }

        result = await server.callTool('cancel_trip', params)
        break
      }

      default:
        return NextResponse.json(
          { error: 'Bad Request', message: `Unknown tool: ${body.tool}` },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      tool: body.tool,
      mock_mode: isMockMode,
      result,
    })
  } catch (error) {
    console.error('[Avinode API] Error:', error)

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/avinode
 *
 * Health check and tool listing
 */
export async function GET() {
  try {
    const server = getMCPServer()

    return NextResponse.json({
      status: 'ok',
      mock_mode: server.isUsingMockMode(),
      available_tools: [
        'search_flights',
        'create_rfp',
        'get_quote_status',
        'get_quotes',
        'search_airports',
        'send_trip_message',
        'get_trip_messages',
        'create_trip',
        'get_rfq',
        'get_rfq_raw',
        'list_trips',
        'cancel_trip',
      ],
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
