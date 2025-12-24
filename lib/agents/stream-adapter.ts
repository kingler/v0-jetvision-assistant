/**
 * SSE Stream Adapter
 *
 * Converts OrchestratorAgent results to SSE streaming format
 * for consumption by chat-interface.tsx
 */

import type { AgentResult } from '@agents/core/types'
import type {
  AgentStreamResponse,
  AgentMetadata,
  ConversationState,
  TripData,
  RFQData,
  ToolCallResult,
  UserIntent,
  ConversationPhase,
  RFPData,
} from '@/lib/types/chat-agent'

/**
 * Extended metadata type for orchestrator results
 * The OrchestratorAgent includes these additional fields in its result data
 */
interface OrchestratorResultData {
  response?: string
  toolCalls?: Array<{
    name: string
    result: unknown
    error?: string
  }>
  intent?: UserIntent
  conversationState?: ConversationState
  nextActions?: AgentMetadata['nextActions']
  workflowState?: AgentMetadata['workflowState']
  agentChain?: string[]
  processingTime?: number
  tripData?: TripData
  rfqData?: RFQData
  rfpData?: Partial<RFPData>
  extractedData?: Partial<RFPData>
  flightRequest?: Partial<RFPData>
}

/**
 * Convert AgentResult to AgentStreamResponse
 *
 * @param result - The result from OrchestratorAgent.execute()
 * @param mockMode - Whether running in mock mode
 * @returns AgentStreamResponse for SSE streaming
 */
export function convertAgentResultToStreamResponse(
  result: AgentResult,
  mockMode: boolean = false
): AgentStreamResponse {
  // The orchestrator stores its response data in result.data
  const data = (result.data || {}) as OrchestratorResultData
  const executionMetadata = result.metadata || { executionTime: 0 }

  // Extract tool calls from result data
  const toolCalls: ToolCallResult[] = (data.toolCalls || []).map((tc) => ({
    name: tc.name,
    result: tc.result,
    status: tc.error ? 'error' : 'success',
    error: tc.error,
  }))

  // Extract trip data from tool calls or data
  const tripData = extractTripData(toolCalls, data)

  // Extract RFQ data from tool calls or data
  const rfqData = extractRFQData(toolCalls, data)

  // Build agent metadata
  const agentMetadata: AgentMetadata = {
    intent: data.intent || 'GENERAL_CONVERSATION',
    conversationState: extractConversationState(data),
    nextActions: data.nextActions,
    workflowState: data.workflowState,
    agentChain: data.agentChain,
    processingTime: data.processingTime || executionMetadata.executionTime,
  }

  // Build response
  const response: AgentStreamResponse = {
    content: data.response || '',
    done: true,
    tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
    trip_data: tripData,
    rfp_data: extractRFPData(data),
    rfq_data: rfqData,
    mock_mode: mockMode,
    agent: agentMetadata,
  }

  // Add error if present
  if (result.error) {
    response.error = {
      code: 'AGENT_ERROR',
      message: result.error.message || 'Unknown error',
      recoverable: true,
    }
  }

  return response
}

/**
 * Create a ReadableStream for SSE from AgentResult
 *
 * @param result - The result from OrchestratorAgent.execute()
 * @param mockMode - Whether running in mock mode
 * @returns ReadableStream for SSE response
 */
export function createAgentSSEStream(
  result: AgentResult,
  mockMode: boolean = false
): ReadableStream {
  const encoder = new TextEncoder()
  const response = convertAgentResultToStreamResponse(result, mockMode)

  return new ReadableStream({
    start(controller) {
      // Send the response as SSE data
      const data = `data: ${JSON.stringify(response)}\n\n`
      controller.enqueue(encoder.encode(data))
      controller.close()
    },
  })
}

/**
 * Create an incremental SSE stream for streaming responses
 *
 * @param generator - AsyncGenerator yielding partial responses
 * @param mockMode - Whether running in mock mode
 * @returns ReadableStream for SSE response
 */
export function createIncrementalSSEStream(
  generator: AsyncGenerator<Partial<AgentStreamResponse>>,
  mockMode: boolean = false
): ReadableStream {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const partial of generator) {
          const response: Partial<AgentStreamResponse> = {
            ...partial,
            mock_mode: mockMode,
            done: false,
          }
          const data = `data: ${JSON.stringify(response)}\n\n`
          controller.enqueue(encoder.encode(data))
        }

        // Send final done message
        const finalResponse: Partial<AgentStreamResponse> = {
          content: '',
          done: true,
          mock_mode: mockMode,
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalResponse)}\n\n`))
        controller.close()
      } catch (error) {
        const errorResponse: Partial<AgentStreamResponse> = {
          content: '',
          done: true,
          mock_mode: mockMode,
          error: {
            code: 'STREAM_ERROR',
            message: error instanceof Error ? error.message : 'Unknown streaming error',
            recoverable: false,
          },
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorResponse)}\n\n`))
        controller.close()
      }
    },
  })
}

// ============================================================================
// Helper Functions
// ============================================================================

function extractTripData(
  toolCalls: ToolCallResult[],
  metadata: Record<string, unknown>
): TripData | null {
  // Check tool calls for create_trip result
  const createTripCall = toolCalls.find((tc) => tc.name === 'create_trip')
  if (createTripCall?.result && typeof createTripCall.result === 'object') {
    const result = createTripCall.result as Record<string, unknown>
    return {
      tripId: (result.tripId || result.trip_id) as string,
      deepLink: (result.deepLink || result.deep_link) as string,
      departureAirport: (result.departureAirport || result.departure_airport) as string,
      arrivalAirport: (result.arrivalAirport || result.arrival_airport) as string,
      departureDate: (result.departureDate || result.departure_date) as string,
      passengers: (result.passengers || result.pax) as number,
      status: (result.status || 'created') as string,
      createdAt: (result.createdAt || new Date().toISOString()) as string,
    }
  }

  // Check metadata for trip data
  if (metadata.tripData && typeof metadata.tripData === 'object') {
    return metadata.tripData as TripData
  }

  return null
}

function extractRFQData(
  toolCalls: ToolCallResult[],
  metadata: Record<string, unknown>
): RFQData | null {
  // Check tool calls for get_rfq or get_quotes result
  const rfqCall = toolCalls.find(
    (tc) => tc.name === 'get_rfq' || tc.name === 'get_quotes'
  )
  if (rfqCall?.result && typeof rfqCall.result === 'object') {
    const result = rfqCall.result as Record<string, unknown>
    return {
      rfqId: (result.rfqId || result.rfq_id) as string,
      tripId: (result.tripId || result.trip_id) as string,
      status: (result.status || 'pending') as string,
      quotes: result.quotes as RFQData['quotes'],
      receivedAt: (result.receivedAt || new Date().toISOString()) as string,
    }
  }

  // Check metadata for RFQ data
  if (metadata.rfqData && typeof metadata.rfqData === 'object') {
    return metadata.rfqData as RFQData
  }

  return null
}

function extractRFPData(
  metadata: Record<string, unknown>
): Partial<RFPData> | null {
  // Check for RFP data in various locations
  const rfpData =
    metadata.rfpData ||
    metadata.extractedData ||
    metadata.flightRequest

  if (rfpData && typeof rfpData === 'object') {
    return rfpData as Partial<RFPData>
  }

  return null
}

function extractConversationState(
  metadata: Record<string, unknown>
): ConversationState {
  const state = metadata.conversationState as Partial<ConversationState> | undefined

  return {
    phase: (state?.phase || 'gathering_info') as ConversationPhase,
    extractedData: (state?.extractedData || {}) as Partial<RFPData>,
    pendingQuestions: (state?.pendingQuestions || []) as string[],
    conversationHistory: state?.conversationHistory,
  }
}

// ============================================================================
// SSE Response Headers
// ============================================================================

/**
 * Standard headers for SSE responses
 */
export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no', // Disable nginx buffering
} as const
