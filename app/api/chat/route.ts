/**
 * Chat API Route - Simplified Single Agent Architecture
 *
 * Uses JetvisionAgent for all chat processing with unified access to:
 * - Avinode MCP (flights, trips, quotes)
 * - Database (CRM tables via Supabase)
 * - Gmail (email sending)
 */

import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { createJetvisionAgent } from '@/agents/jetvision-agent';
import { AvinodeMCPServer } from '@/lib/mcp/avinode-server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  getOrCreateConversation,
  saveMessage,
  getIsoAgentIdFromClerkUserId,
} from '@/lib/conversation/message-persistence';
import {
  createOrUpdateChatSession,
  type ChatSessionInsert,
} from '@/lib/sessions/track-chat-session';

// =============================================================================
// REQUEST VALIDATION
// =============================================================================

const ChatRequestSchema = z.object({
  message: z.string().min(1).max(10000),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional().default([]),
  context: z.object({
    conversationId: z.string().optional(),
    tripId: z.string().optional(),
  }).optional(),
  skipMessagePersistence: z.boolean().optional().default(false),
  tripId: z.string().optional(), // Allow tripId at top level for convenience
});

// =============================================================================
// SINGLETON MCP SERVER
// =============================================================================

let avinodeMCP: AvinodeMCPServer | null = null;

function getAvinodeMCP(): AvinodeMCPServer {
  if (!avinodeMCP) {
    avinodeMCP = new AvinodeMCPServer();
  }
  return avinodeMCP;
}

// =============================================================================
// SSE HELPERS
// =============================================================================

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
};

function createSSEStream(
  generator: () => AsyncGenerator<string, void, unknown>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const data of generator()) {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });
}

// =============================================================================
// CONVERSATION TYPE CLASSIFICATION
// =============================================================================

function classifyConversationType(message: string): 'flight_request' | 'general' {
  const lower = message.toLowerCase();

  // Flight indicators
  const hasAirport = /\b[Kk][A-Za-z]{3}\b/.test(message) ||
    /(teterboro|van nuys|los angeles|new york|miami|chicago|denver)/i.test(message);
  const hasFlightTerms = /(flight|charter|jet|book|travel|fly)/i.test(lower);
  const hasPassengers = /\d+\s*(pax|passenger|people|person)/i.test(lower);
  const hasDate = /\d{4}-\d{2}-\d{2}|january|february|march|april|may|june|july|august|september|october|november|december/i.test(message);

  if (hasFlightTerms && (hasAirport || hasPassengers || hasDate)) {
    return 'flight_request';
  }

  // Trip ID lookup
  if (/\b[A-Z0-9]{6}\b/i.test(message) || /atrip-/i.test(message)) {
    return 'flight_request';
  }

  return 'general';
}

// =============================================================================
// POST HANDLER
// =============================================================================

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Validate request
    const body = await req.json();
    const validation = ChatRequestSchema.safeParse(body);
    if (!validation.success) {
      return Response.json({ error: validation.error.message }, { status: 400 });
    }

    const { message, conversationHistory, context, skipMessagePersistence, tripId: requestTripId } = validation.data;

    // 3. Get ISO agent ID
    console.log('[Chat API] Looking up ISO agent for Clerk user:', userId);
    const isoAgentId = await getIsoAgentIdFromClerkUserId(userId);
    if (!isoAgentId) {
      console.error('[Chat API] ❌ No ISO agent ID for user:', {
        clerkUserId: userId,
        message: 'User needs to be synced to iso_agents table',
      });
      return Response.json({
        error: 'User not found',
        code: 'ISO_AGENT_NOT_SYNCED',
        message: 'Your account is not synced to the database. Please try refreshing the page or contact support.',
        details: { clerkUserId: userId },
      }, { status: 404 });
    }
    console.log('[Chat API] ✅ Found ISO agent:', { clerkUserId: userId, isoAgentId });

    // 4. Get or create conversation
    const conversationType = classifyConversationType(message);
    let conversationId = context?.conversationId;

    if (!conversationId || conversationId.startsWith('temp-')) {
      // Create new conversation
      conversationId = await getOrCreateConversation({
        userId: isoAgentId,
        subject: message.slice(0, 100),
        type: conversationType === 'flight_request' ? 'rfp_negotiation' : 'general_inquiry',
      });
    }

    // 5. Save user message (skip if explicitly requested for background operations like get_rfq)
    // This prevents cluttering conversation history with technical tool calls
    if (!skipMessagePersistence) {
      await saveMessage({
        conversationId,
        senderType: 'iso_agent',
        senderIsoAgentId: isoAgentId,
        content: message,
        contentType: 'text',
      });
    } else {
      console.log('[Chat API] Skipping message persistence for:', { conversationId, messagePreview: message.slice(0, 50) });
    }

    // 6. Create agent and execute
    const agent = createJetvisionAgent({
      sessionId: conversationId,
      userId,
      isoAgentId,
      requestId: conversationId,
    });

    // Connect Avinode MCP
    const mcp = getAvinodeMCP();
    agent.setAvinodeMCP({
      callTool: (name, params) => mcp.callTool(name, params),
      isConnected: () => true,
    });

    // Execute agent
    const result = await agent.execute(message, conversationHistory);

    // 7. Save assistant response
    await saveMessage({
      conversationId,
      senderType: 'ai_assistant',
      content: result.message,
      contentType: 'text',
      metadata: {
        toolResults: result.toolResults,
        tripId: result.tripId,
        deepLink: result.deepLink,
      },
    });

    // 8. Update request with trip info and flight details if created
    if (result.tripId || result.rfpData) {
      const updateData: Record<string, unknown> = {
        status: 'trip_created',
      };

      // Add trip info if available
      if (result.tripId) {
        updateData.avinode_trip_id = result.tripId;
        updateData.avinode_deep_link = result.deepLink;
      }

      // Add flight details from rfpData (create_trip params)
      if (result.rfpData) {
        if (result.rfpData.departure_airport) {
          updateData.departure_airport = result.rfpData.departure_airport;
        }
        if (result.rfpData.arrival_airport) {
          updateData.arrival_airport = result.rfpData.arrival_airport;
        }
        if (result.rfpData.departure_date) {
          updateData.departure_date = result.rfpData.departure_date;
        }
        if (result.rfpData.passengers) {
          updateData.passengers = result.rfpData.passengers;
        }
        if (result.rfpData.return_date) {
          updateData.return_date = result.rfpData.return_date;
        }
        if (result.rfpData.special_requirements) {
          updateData.special_requirements = result.rfpData.special_requirements;
        }
      }

      await supabaseAdmin
        .from('requests')
        .update(updateData)
        .eq('id', conversationId);
    }

    // 9. Update chat session
    const sessionData: ChatSessionInsert = {
      iso_agent_id: isoAgentId,
      session_status: 'active',
      conversation_type: conversationType,
      ...(result.tripId ? { avinode_trip_id: result.tripId } : {}),
    };
    await createOrUpdateChatSession(sessionData, conversationId);

    // 10. Transform tool results to tool_calls format for frontend
    const toolCalls = result.toolResults.map((tr) => ({
      name: tr.name,
      result: tr.success ? tr.data : { error: tr.error },
    }));

    // 11. Extract rfq_data from get_rfq tool results
    let rfqData: {
      quotes?: unknown[];
      rfqs?: unknown[];
      flights?: unknown[];
      total_rfqs?: number;
      total_quotes?: number;
      status?: string;
      message?: string;
    } | undefined;

    for (const tr of result.toolResults) {
      if (tr.name === 'get_rfq') {
        if (tr.success && tr.data) {
          const data = tr.data as Record<string, unknown>;
          console.log('[Chat API] ✅ get_rfq tool succeeded:', {
            hasFlights: !!(data.flights),
            flightsCount: Array.isArray(data.flights) ? data.flights.length : 0,
            hasRfqs: !!(data.rfqs),
            rfqsCount: Array.isArray(data.rfqs) ? data.rfqs.length : 0,
            hasQuotes: !!(data.quotes),
            quotesCount: Array.isArray(data.quotes) ? data.quotes.length : 0,
            totalFlights: data.flights_received || 0,
            status: data.status,
          });
          
          rfqData = {
            quotes: data.quotes as unknown[],
            rfqs: data.rfqs as unknown[],
            flights: data.flights as unknown[],
            total_rfqs: data.total_rfqs as number,
            total_quotes: data.total_quotes as number,
            status: data.status as string,
            message: data.message as string,
          };
          break;
        } else {
          // Tool call failed - log the error
          console.error('[Chat API] ❌ get_rfq tool failed:', {
            error: tr.error,
            data: tr.data,
          });
          
          // Still extract data if it exists (some errors might have partial data)
          if (tr.data && typeof tr.data === 'object') {
            const data = tr.data as Record<string, unknown>;
            if (data.flights || data.rfqs) {
              rfqData = {
                quotes: data.quotes as unknown[],
                rfqs: data.rfqs as unknown[],
                flights: data.flights as unknown[],
                total_rfqs: data.total_rfqs as number,
                total_quotes: data.total_quotes as number,
                status: data.status as string,
                message: data.message as string || `Error: ${tr.error}`,
              };
            }
          }
        }
      }
    }

    // 12. Return SSE response
    const stream = createSSEStream(async function* () {
      // Send content
      yield JSON.stringify({
        content: result.message,
        conversation_id: conversationId,
        conversation_type: conversationType,
      });

      // Send trip data if created (includes flight details from rfpData)
      if (result.tripId || result.rfpData) {
        yield JSON.stringify({
          trip_data: {
            trip_id: result.tripId,
            deep_link: result.deepLink,
            // Include flight details from create_trip params
            departure_airport: result.rfpData?.departure_airport,
            arrival_airport: result.rfpData?.arrival_airport,
            departure_date: result.rfpData?.departure_date,
            passengers: result.rfpData?.passengers,
            return_date: result.rfpData?.return_date,
            special_requirements: result.rfpData?.special_requirements,
          },
        });
      }

      // Send RFQ data if fetched
      if (rfqData) {
        yield JSON.stringify({
          rfq_data: rfqData,
        });
      }

      // Signal completion with tool_calls for workflow status determination
      yield JSON.stringify({
        done: true,
        tool_calls: toolCalls,
        conversation_id: conversationId,
        chat_session_id: conversationId,
        conversation_type: conversationType,
      });
    });

    return new Response(stream, { headers: SSE_HEADERS });

  } catch (error) {
    console.error('[Chat API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}

// =============================================================================
// GET HANDLER - Health check
// =============================================================================

export async function GET() {
  return Response.json({
    status: 'ok',
    agent: 'JetvisionAgent',
    tools: {
      avinode: 8,
      database: 12,
      gmail: 3,
    },
  });
}
