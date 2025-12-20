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
  tool: 'search_flights' | 'create_rfp' | 'get_quote_status' | 'get_quotes' | 'search_airports'
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
