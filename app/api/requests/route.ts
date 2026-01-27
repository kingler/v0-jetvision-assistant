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
import type { Database, User, Request } from '@/lib/types/database';
import { loadMessages } from '@/lib/conversation/message-persistence';
import { AvinodeMCPServer } from '@/lib/mcp/avinode-server';

// Force dynamic rendering - API routes should not be statically generated
export const dynamic = 'force-dynamic';

// Singleton MCP server instance for Avinode tool calls
let mcpServer: AvinodeMCPServer | null = null;

function getMCPServer(): AvinodeMCPServer {
  if (!mcpServer) {
    mcpServer = new AvinodeMCPServer();
  }
  return mcpServer;
}

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

          // In the consolidated schema, conversationId IS the requestId
          // Messages are saved with request_id = request.id, so load directly
          // Load messages from database using request.id as the request_id
          const dbMessages = await loadMessages(request.id, { limit: 100 });

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

    // TODO: Trigger JetvisionAgent processing via /api/chat endpoint
    // The new single-agent architecture handles processing through the chat interface
    console.log('[POST /api/requests] Request created:', newRequest.id);

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

/**
 * DELETE /api/requests
 * Deletes a flight request from the database (hard delete)
 *
 * With consolidated schema (migration 030-033), this will cascade delete:
 * - Messages (ON DELETE CASCADE via request_id)
 * - Quotes (ON DELETE CASCADE via request_id)
 * - Proposals (ON DELETE CASCADE via request_id)
 *
 * Query parameters:
 * - id: Request ID to delete (required)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user via Clerk
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('id');

    // Validate request ID
    if (!requestId) {
      return NextResponse.json(
        { error: 'Missing request ID', message: 'Request ID is required' },
        { status: 400 }
      );
    }

    // Look up user in iso_agents table using Clerk user ID
    const { data: user, error: userError } = await supabaseAdmin
      .from('iso_agents')
      .select('id, role')
      .eq('clerk_user_id', userId)
      .single<Pick<User, 'id' | 'role'>>();

    if (userError || !user) {
      console.error('[DELETE /api/requests] User lookup failed:', {
        userId,
        error: userError?.message,
      });
      return NextResponse.json(
        { error: 'User not found', message: 'Your account may not be synced to the database.' },
        { status: 404 }
      );
    }

    // Validate request ID format (should be UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(requestId)) {
      return NextResponse.json(
        { error: 'Invalid request ID', message: 'Request ID must be a valid UUID' },
        { status: 400 }
      );
    }

    // Verify ownership - check if request exists and belongs to user
    const { data: existingRequest, error: fetchError } = await supabaseAdmin
      .from('requests')
      .select('id, iso_agent_id, status')
      .eq('id', requestId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116' || fetchError.message?.includes('No rows')) {
        return NextResponse.json(
          { error: 'Request not found', message: 'The specified request does not exist' },
          { status: 404 }
        );
      }
      console.error('[DELETE /api/requests] Database error:', fetchError);
      return NextResponse.json(
        { error: 'Database error', message: fetchError.message },
        { status: 500 }
      );
    }

    if (!existingRequest) {
      return NextResponse.json(
        { error: 'Request not found', message: 'The specified request does not exist' },
        { status: 404 }
      );
    }

    // Verify ownership (user must own the request or be an admin)
    if (existingRequest.iso_agent_id !== user.id && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have permission to delete this request' },
        { status: 403 }
      );
    }

    // Delete messages explicitly (CASCADE handles this too, but explicit is clearer)
    console.log('[DELETE /api/requests] Deleting messages for request:', requestId);
    const { error: messagesError, count: messagesCount } = await supabaseAdmin
      .from('messages')
      .delete({ count: 'exact' })
      .eq('request_id', requestId);

    if (messagesError) {
      console.warn('[DELETE /api/requests] Messages delete warning:', messagesError.message);
    } else {
      console.log('[DELETE /api/requests] Deleted messages:', messagesCount || 0);
    }

    // Delete the request (CASCADE will handle quotes and other related records)
    const { error: deleteError } = await supabaseAdmin
      .from('requests')
      .delete()
      .eq('id', requestId);

    if (deleteError) {
      console.error('[DELETE /api/requests] Deletion failed:', {
        requestId,
        error: deleteError.message,
      });
      return NextResponse.json(
        { error: 'Failed to delete request', message: deleteError.message },
        { status: 500 }
      );
    }

    console.log('[DELETE /api/requests] Successfully deleted request:', requestId);
    return NextResponse.json(
      { message: 'Request deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('[DELETE /api/requests] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/requests
 * Updates a flight request (cancel, archive, or other status changes)
 * 
 * Request body:
 * - id: Request ID (required)
 * - action: 'cancel' | 'archive' (required)
 * - reason: Optional cancellation reason (for cancel action)
 */
export async function PATCH(request: NextRequest) {
  try {
    // Authenticate user via Clerk
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json() as { id: string; action: 'cancel' | 'archive'; reason?: string; tripId?: string; rfqId?: string };
    const { id: requestId, action, reason, tripId: bodyTripId, rfqId: bodyRfqId } = body;

    // Validate request ID and action
    if (!requestId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields', message: 'Request ID and action are required' },
        { status: 400 }
      );
    }

    if (action !== 'cancel' && action !== 'archive') {
      return NextResponse.json(
        { error: 'Invalid action', message: 'Action must be "cancel" or "archive"' },
        { status: 400 }
      );
    }

    // Look up user in iso_agents table using Clerk user ID
    const { data: user, error: userError } = await supabaseAdmin
      .from('iso_agents')
      .select('id, role')
      .eq('clerk_user_id', userId)
      .single<Pick<User, 'id' | 'role'>>();

    // Handle user lookup errors
    if (userError || !user) {
      console.error('[PATCH /api/requests] User lookup failed:', {
        userId,
        error: userError?.message,
        code: userError?.code,
      });
      return NextResponse.json(
        { error: 'User not found', message: 'Your account may not be synced to the database. Please contact support.' },
        { status: 404 }
      );
    }

    // Verify ownership - check if request exists and belongs to user
    const { data: existingRequest, error: fetchError } = await supabaseAdmin
      .from('requests')
      .select('id, iso_agent_id, status, avinode_trip_id, avinode_rfq_id, metadata')
      .eq('id', requestId)
      .single();

    // Handle request lookup errors
    if (fetchError || !existingRequest) {
      console.error('[PATCH /api/requests] Request lookup failed:', {
        requestId,
        error: fetchError?.message,
        code: fetchError?.code,
      });
      return NextResponse.json(
        { error: 'Request not found', message: 'The specified request does not exist' },
        { status: 404 }
      );
    }

    // Verify ownership (user must own the request or be an admin)
    if (existingRequest.iso_agent_id !== user.id && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have permission to modify this request' },
        { status: 403 }
      );
    }

    // Handle cancel action
    if (action === 'cancel') {
      // Cancel RFQ in Avinode if an identifier exists
      const cancelId =
        bodyRfqId ||
        existingRequest.avinode_rfq_id ||
        bodyTripId ||
        existingRequest.avinode_trip_id;
      if (cancelId) {
        const server = getMCPServer();
        const isMockMode = server.isUsingMockMode();
        const cancelReason = reason || 'Cancelled by user';

        const attemptCancelIds = async (ids: string[]) => {
          const failures: Array<{ id: string; error: unknown }> = [];
          let successCount = 0;

          for (const id of ids) {
            try {
              console.log('[PATCH /api/requests] Attempting Avinode cancel', { id });
              await server.callTool('cancel_trip', { trip_id: id, reason: cancelReason });
              successCount += 1;
            } catch (error) {
              console.error('[PATCH /api/requests] Avinode cancel failed', { id, error });
              failures.push({ id, error });
            }
          }

          return { successCount, failures };
        };

        const isFullAvinodeId = (id: string) => {
          if (id.startsWith('arfq-') || id.startsWith('atrip-')) {
            return true;
          }

          return /^\d+$/.test(id);
        };

        const extractRfqIds = (rfqPayload: unknown): Set<string> => {
          const ids = new Set<string>();
          const payloadObject = (rfqPayload && typeof rfqPayload === 'object') ? rfqPayload as {
            rfqs?: unknown;
            data?: unknown;
          } : null;
          const nested =
            (Array.isArray(payloadObject?.rfqs) && payloadObject?.rfqs) ||
            (Array.isArray(payloadObject?.data) && payloadObject?.data) ||
            null;
          const items = nested || (Array.isArray(rfqPayload) ? rfqPayload : [rfqPayload]);

          for (const item of items) {
            if (!item || typeof item !== 'object') {
              continue;
            }
            const rfq = item as {
              rfq_id?: string;
              id?: string;
              href?: string;
              links?: { self?: { href?: string } };
            };

            if (rfq.rfq_id) {
              ids.add(rfq.rfq_id);
            }
            if (rfq.id) {
              ids.add(rfq.id);
            }

            const href = rfq.href || rfq.links?.self?.href;
            if (href) {
              const match = href.match(/\/rfqs\/([^/?#]+)/);
              if (match?.[1]) {
                ids.add(match[1]);
              }
            }
          }

          return ids;
        };
        try {
          console.log('[PATCH /api/requests] Cancelling trip in Avinode:', {
            tripId: cancelId,
            rfqId: existingRequest.avinode_rfq_id,
            reason: cancelReason,
            mockMode: isMockMode,
          });

          if (!isMockMode) {
            const candidateIds: string[] = [];

            if (existingRequest.avinode_rfq_id && isFullAvinodeId(existingRequest.avinode_rfq_id)) {
              candidateIds.push(existingRequest.avinode_rfq_id);
            }

            if (bodyRfqId && isFullAvinodeId(bodyRfqId)) {
              candidateIds.push(bodyRfqId);
            }

            if (bodyTripId || existingRequest.avinode_trip_id) {
              const rfqResult = await server.callTool('get_rfq_raw', {
                rfq_id: bodyTripId || existingRequest.avinode_trip_id,
              });

              const rfqIds = extractRfqIds(rfqResult);
              if (rfqIds.size > 0) {
                const fullIds = [...rfqIds].filter(isFullAvinodeId);
                console.log('[PATCH /api/requests] Extracted RFQ IDs for cancel:', {
                  tripId: bodyTripId || existingRequest.avinode_trip_id,
                  rfqIds: fullIds,
                });
                candidateIds.push(...fullIds);
              } else {
                // No RFQs found - trip may have no active RFQs (already cancelled, expired, or never had any)
                console.log('[PATCH /api/requests] No RFQs found for trip - skipping Avinode cancellation:', {
                  tripId: bodyTripId || existingRequest.avinode_trip_id,
                });
              }
            }

            if (existingRequest.avinode_trip_id && isFullAvinodeId(existingRequest.avinode_trip_id)) {
              candidateIds.push(existingRequest.avinode_trip_id);
            }

            // Only attempt Avinode cancellation if we have candidate IDs
            // If no RFQs exist, we'll just update the local database status
            if (candidateIds.length > 0 || (existingRequest.avinode_rfq_id && isFullAvinodeId(existingRequest.avinode_rfq_id))) {
              if (cancelId && isFullAvinodeId(cancelId)) {
                candidateIds.push(cancelId);
              }

              const uniqueCandidateIds = Array.from(new Set(candidateIds));
              const cancelResult = await attemptCancelIds(uniqueCandidateIds);

              // If all Avinode cancel attempts failed, check if we should treat this as an error
              // If the trip had no RFQs to begin with (rfqIds.size === 0), proceed with local cancellation
              if (cancelResult.successCount === 0 && candidateIds.length > 1) {
                // Had multiple candidate IDs but all failed - this is a real error
                throw new Error('Avinode cancellation failed for all RFQ identifiers.');
              } else if (cancelResult.successCount === 0) {
                // Only had the trip ID itself and it failed - likely no active RFQs
                console.log('[PATCH /api/requests] Trip cancel failed but proceeding with local cancellation (no active RFQs):', {
                  tripId: cancelId,
                  failures: cancelResult.failures.map(f => ({ id: f.id, error: String(f.error) })),
                });
              }
            } else {
              console.log('[PATCH /api/requests] No RFQ identifiers to cancel - updating local status only:', {
                tripId: cancelId,
              });
            }
          } else {
            console.warn('[PATCH /api/requests] Skipping Avinode cancellation in mock mode', {
              tripId: cancelId,
            });
          }
        } catch (error) {
          console.error('[PATCH /api/requests] Failed to cancel trip in Avinode:', error);
          return NextResponse.json(
            { error: 'Failed to cancel RFQ in Avinode', message: 'Avinode cancellation failed. Please try again.' },
            { status: 502 }
          );
        }
      }

      // Update request status to cancelled
      const { error: updateError } = await supabaseAdmin
        .from('requests')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
          metadata: {
            ...(existingRequest.metadata as Record<string, unknown> || {}),
            cancelled_at: new Date().toISOString(),
            cancellation_reason: reason || 'Cancelled by user',
          },
        })
        .eq('id', requestId);

      if (updateError) {
        console.error('[PATCH /api/requests] Failed to cancel request:', {
          requestId,
          error: updateError.message,
        });
        return NextResponse.json(
          { error: 'Failed to cancel request', message: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { message: 'Request cancelled successfully' },
        { status: 200 }
      );
    }

    // Handle archive action
    if (action === 'archive') {
      // Only allow archiving completed/booked requests
      const canArchive = existingRequest.status === 'completed' || 
                        existingRequest.status === 'sending_proposal' ||
                        existingRequest.status === 'cancelled';
      if (!canArchive) {
        return NextResponse.json(
          { error: 'Cannot archive request', message: 'Only completed, cancelled, or sent proposal requests can be archived' },
          { status: 400 }
        );
      }

      // Update request metadata to mark as archived
      // Note: We're using metadata to track archived status rather than a separate field
      // This preserves the request data while marking it as archived
      const { error: updateError } = await supabaseAdmin
        .from('requests')
        .update({
          updated_at: new Date().toISOString(),
          metadata: {
            ...(existingRequest.metadata as Record<string, unknown> || {}),
            archived: true,
            archived_at: new Date().toISOString(),
          },
        })
        .eq('id', requestId);

      if (updateError) {
        console.error('[PATCH /api/requests] Failed to archive request:', {
          requestId,
          error: updateError.message,
        });
        return NextResponse.json(
          { error: 'Failed to archive request', message: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { message: 'Request archived successfully' },
        { status: 200 }
      );
    }

    // This should never be reached due to validation above
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    // Handle unexpected errors
    console.error('[PATCH /api/requests] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'An unexpected error occurred while updating the request' },
      { status: 500 }
    );
  }
}
