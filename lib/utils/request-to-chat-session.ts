/**
 * Request to ChatSession Mapping Utility
 * 
 * Converts database Request objects to ChatSession format for the UI.
 * This ensures flight requests persist across page refreshes by loading
 * them from the database and mapping them to the chat interface format.
 * 
 * Messages are loaded separately via API and passed in.
 */

import type { Request } from '@/lib/types/database';
import type { ChatSession } from '@/components/chat-sidebar';
import { formatDate } from '@/lib/utils/format';

/**
 * Maps database request status to ChatSession status
 * 
 * @param dbStatus - Database request status enum value
 * @returns ChatSession status string
 */
function mapRequestStatusToChatStatus(
  dbStatus: Request['status']
): ChatSession['status'] {
  // Map database statuses to chat session statuses
  const statusMap: Record<string, ChatSession['status']> = {
    draft: 'understanding_request',
    pending: 'understanding_request',
    analyzing: 'understanding_request',
    fetching_client_data: 'understanding_request',
    searching_flights: 'searching_aircraft',
    awaiting_quotes: 'requesting_quotes',
    analyzing_proposals: 'analyzing_options',
    generating_email: 'analyzing_options',
    sending_proposal: 'proposal_ready',
    completed: 'proposal_ready',
    failed: 'understanding_request', // Reset to beginning on failure
    cancelled: 'understanding_request',
  };

  return statusMap[dbStatus] || 'understanding_request';
}

/**
 * Determines the current workflow step based on request status
 * 
 * @param dbStatus - Database request status enum value
 * @returns Step number (1-5)
 */
function getWorkflowStep(dbStatus: Request['status']): number {
  const stepMap: Record<string, number> = {
    draft: 1,
    pending: 1,
    analyzing: 1,
    fetching_client_data: 1,
    searching_flights: 2,
    awaiting_quotes: 3,
    analyzing_proposals: 4,
    generating_email: 4,
    sending_proposal: 5,
    completed: 5,
    failed: 1,
    cancelled: 1,
  };

  return stepMap[dbStatus] || 1;
}

/**
 * Generates a descriptive name for the flight request
 * 
 * @param request - Database request object
 * @returns Generated name string
 */
function generateFlightName(request: Request): string {
  const departure = request.departure_airport || 'Unknown';
  const arrival = request.arrival_airport || 'Unknown';
  const date = request.departure_date
    ? formatDate(request.departure_date)
    : 'Unknown date';

  return `${departure} → ${arrival} (${date})`;
}

/**
 * Message type for chat messages loaded from database
 */
export interface LoadedMessage {
  id: string;
  senderType: 'iso_agent' | 'operator' | 'ai_assistant';
  senderName: string | null;
  content: string;
  contentType: string;
  richContent: Record<string, unknown> | null;
  createdAt: string;
}

/**
 * Converts a database Request to a ChatSession
 * 
 * This function maps all relevant fields from the database request
 * to the ChatSession format used by the UI components.
 * 
 * @param request - Database request object from Supabase
 * @param messages - Optional array of messages to include in the session
 * @returns ChatSession object for UI display
 */
export function requestToChatSession(
  request: Request,
  messages: LoadedMessage[] = []
): ChatSession {
  // Generate route string from airports
  const route = request.departure_airport && request.arrival_airport
    ? `${request.departure_airport} → ${request.arrival_airport}`
    : 'Select route';

  // Format date for display
  const date = request.departure_date
    ? formatDate(request.departure_date)
    : 'Select date';

  // Map status and workflow step
  const status = mapRequestStatusToChatStatus(request.status);
  const currentStep = getWorkflowStep(request.status);

  // Build ChatSession object
  const chatSession: ChatSession = {
    // Use request ID as chat session ID for persistence
    id: request.id,
    
    // Basic flight information
    route,
    passengers: request.passengers || 1,
    date,
    status,
    currentStep,
    totalSteps: 5,

    // Optional aircraft information
    aircraft: request.aircraft_type || undefined,

    // Avinode integration fields
    tripId: request.avinode_trip_id || undefined,
    rfqId: request.avinode_rfq_id || undefined,
    deepLink: request.avinode_deep_link || undefined,

    // Generated name for display
    generatedName: generateFlightName(request),

    // Conversation start timestamp
    sessionStartedAt: request.created_at || undefined,

    // Convert loaded messages to ChatSession format
    messages: messages.map((msg) => ({
      id: msg.id,
      type: msg.senderType === 'iso_agent' ? 'user' : 'agent',
      content: msg.content,
      timestamp: new Date(msg.createdAt),
      // Include rich content if available
      ...(msg.richContent && { richContent: msg.richContent }),
    })),

    // Metadata from request
    ...(request.metadata && typeof request.metadata === 'object'
      ? {
          // Extract any additional metadata that might be useful
          quotesReceived: (request.metadata as any)?.quotes_received,
          quotesTotal: (request.metadata as any)?.quotes_total,
          basePrice: (request.metadata as any)?.base_price,
          totalPrice: (request.metadata as any)?.total_price,
          margin: (request.metadata as any)?.margin,
        }
      : {}),
  };

  return chatSession;
}


/**
 * Converts an array of database Requests to ChatSessions
 * 
 * @param requests - Array of database request objects
 * @param messagesByRequestId - Map of request IDs to their messages
 * @returns Array of ChatSession objects
 */
export function requestsToChatSessions(
  requests: Request[],
  messagesByRequestId: Map<string, LoadedMessage[]> = new Map()
): ChatSession[] {
  return requests.map((request) => 
    requestToChatSession(request, messagesByRequestId.get(request.id) || [])
  );
}
