/**
 * Requests API Route - RFP request management
 * 
 * Handles CRUD operations for flight requests with proper authentication
 * and user session management.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { AgentFactory } from '@agents/core';
import { AgentType } from '@agents/core/types';
import type { Database, User, Request } from '@/lib/types/database';
import { getConversationForRequest, loadMessages } from '@/lib/conversation/message-persistence';

// Force dynamic rendering - API routes should not be statically generated
export const dynamic = 'force-dynamic';

/**
 * GET /api/requests
 * Fetches flight requests for the authenticated user
 * 
 * Query parameters:
 * - status: Filter by request status (optional)
 * - limit: Number of results per page (default: 50)
 * - offset: Pagination offset (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user via Clerk
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create server-side Supabase client for proper authentication context
    const supabase = await createClient();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Look up user in iso_agents table using Clerk user ID
    // Use admin client to bypass RLS since we already have Clerk authentication
    const { data: user, error: userError } = await supabaseAdmin
      .from('iso_agents')
      .select('id, role')
      .eq('clerk_user_id', userId)
      .single<Pick<User, 'id' | 'role'>>();

    // Handle user lookup errors
    if (userError || !user) {
      console.error('[GET /api/requests] User lookup failed:', {
        userId,
        error: userError?.message,
        code: userError?.code,
      });
      return NextResponse.json(
        { error: 'User not found', message: 'Your account may not be synced to the database. Please contact support.' },
        { status: 404 }
      );
    }

    // Build query for user's requests
    // Note: Using iso_agent_id (not user_id) to match database schema
    let query = supabase
      .from('requests')
      .select('*')
      .eq('iso_agent_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply status filter if provided
    if (status) {
      query = query.eq('status', status as Database['public']['Enums']['request_status']);
    }

    // Execute query
    const { data: requests, error } = await query;

    // Handle query errors
    if (error) {
      console.error('[GET /api/requests] Database query failed:', {
        userId: user.id,
        error: error.message,
        code: error.code,
      });
      return NextResponse.json(
        { error: 'Failed to fetch requests', message: error.message },
        { status: 500 }
      );
    }

    // Load messages for all requests in parallel
    const requestsWithMessages = await Promise.all(
      (requests || []).map(async (request) => {
        try {
          // Validate requestId is a UUID (not a temp ID)
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(request.id)) {
            return { request, messages: [] };
          }

          // Get conversation for this request
          const conversationId = await getConversationForRequest(request.id);
          
          if (!conversationId) {
            return { request, messages: [] };
          }

          // Load messages from database
          const dbMessages = await loadMessages(conversationId, 100);

          // Convert to API response format
          const messages = dbMessages.map((msg) => ({
            id: msg.id,
            senderType: msg.senderType,
            senderName: msg.senderName,
            content: msg.content,
            contentType: msg.contentType,
            richContent: msg.richContent,
            createdAt: msg.createdAt,
          }));

          return { request, messages };
        } catch (error) {
          console.error(`[GET /api/requests] Error loading messages for request ${request.id}:`, error);
          // Return request with empty messages on error
          return { request, messages: [] };
        }
      })
    );

    // Return successful response with requests, messages, and pagination info
    return NextResponse.json({
      requests: requestsWithMessages.map(({ request }) => request),
      messages: requestsWithMessages.reduce((acc, { request, messages }) => {
        acc[request.id] = messages;
        return acc;
      }, {} as Record<string, typeof requestsWithMessages[0]['messages']>),
      pagination: {
        limit,
        offset,
        total: requests?.length || 0,
      },
    });
  } catch (error) {
    // Handle unexpected errors
    console.error('[GET /api/requests] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'An unexpected error occurred while fetching requests' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/requests
 * Creates a new flight request for the authenticated user
 * 
 * Required fields:
 * - departure_airport: ICAO code for departure airport
 * - arrival_airport: ICAO code for arrival airport
 * - departure_date: ISO date string for departure
 * - passengers: Number of passengers
 * 
 * Optional fields:
 * - return_date: ISO date string for return flight
 * - client_profile_id: UUID of client profile
 * - aircraft_type: Preferred aircraft type
 * - budget: Budget range
 * - special_requirements: Additional requirements
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user via Clerk
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create server-side Supabase client for proper authentication context
    const supabase = await createClient();

    // Parse request body
    const body = await request.json() as Record<string, any>;
    const {
      client_profile_id,
      departure_airport,
      arrival_airport,
      departure_date,
      return_date,
      passengers,
      aircraft_type,
      budget,
      special_requirements
    } = body;

    // Validate required fields
    if (!departure_airport || !arrival_airport || !departure_date || !passengers) {
      return NextResponse.json(
        { error: 'Missing required fields', message: 'departure_airport, arrival_airport, departure_date, and passengers are required' },
        { status: 400 }
      );
    }

    // Look up user in iso_agents table using Clerk user ID
    // Use admin client to bypass RLS since we already have Clerk authentication
    const { data: user, error: userError } = await supabaseAdmin
      .from('iso_agents')
      .select('id, role')
      .eq('clerk_user_id', userId)
      .single<Pick<User, 'id' | 'role'>>();

    // Handle user lookup errors
    if (userError || !user) {
      console.error('[POST /api/requests] User lookup failed:', {
        userId,
        error: userError?.message,
        code: userError?.code,
      });
      return NextResponse.json(
        { error: 'User not found', message: 'Your account may not be synced to the database. Please contact support.' },
        { status: 404 }
      );
    }

    // Create new request in database
    // Note: Using iso_agent_id (not user_id) to match database schema
    const { data: newRequest, error } = await supabase
      .from('requests')
      .insert({
        iso_agent_id: user.id,
        client_profile_id: client_profile_id || null,
        departure_airport,
        arrival_airport,
        departure_date,
        return_date: return_date || null,
        passengers,
        aircraft_type: aircraft_type || null,
        budget: budget || null,
        special_requirements: special_requirements || null,
        status: 'pending',
        metadata: {},
      })
      .select()
      .single();

    // Handle database insertion errors
    if (error) {
      console.error('[POST /api/requests] Database insertion failed:', {
        userId: user.id,
        error: error.message,
        code: error.code,
      });
      return NextResponse.json(
        { error: 'Failed to create request', message: error.message },
        { status: 500 }
      );
    }

    // Trigger orchestrator in background (non-blocking)
    triggerOrchestrator(newRequest.id, userId).catch((err) => {
      console.error('[POST /api/requests] Orchestrator trigger failed:', err);
      // Don't fail the request creation if orchestrator fails
    });

    // Return successful response
    return NextResponse.json(
      { request: newRequest, message: 'Request created. Processing started.' },
      { status: 201 }
    );
  } catch (error) {
    // Handle unexpected errors
    console.error('[POST /api/requests] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'An unexpected error occurred while creating the request' },
      { status: 500 }
    );
  }
}

async function triggerOrchestrator(requestId: string, userId: string) {
  const factory = AgentFactory.getInstance();
  const orchestrator = await factory.createAndInitialize({
    type: AgentType.ORCHESTRATOR,
    name: 'RFP Orchestrator',
    model: 'gpt-4-turbo-preview',
    temperature: 0.7,
  });
  await orchestrator.execute({ sessionId: `session-${Date.now()}`, requestId, userId });
}
