/**
 * Chat Session to UI Format Utility
 * 
 * Converts chat_sessions table data to ChatSession format for the sidebar UI.
 * This ensures chat sessions from the database can be displayed as cards
 * in the sidebar (DOM: main#main-content > div... > sidebar > cards).
 * 
 * Each card displays:
 * - Title: Trip ID (e.g., "T6WWSV") or "Flight Request #..."
 * - Status: "Quotes 0/5", "Requesting Quotes", etc.
 * - Route: "KTEB → KVNY"
 * - Passengers: "10 passengers"
 * - Date: "2026-01-20"
 * - Status Badge: "Requesting Quotes"
 * - Timestamp: "Just now"
 */

import type { ChatSession } from '@/components/chat-sidebar';

/**
 * Type for chat_sessions table row with related data
 * 
 * Note: This type will be replaced with Database['public']['Tables']['chat_sessions']['Row']
 * after running the migration and regenerating types.
 */
type ChatSessionRow = {
  id: string;
  conversation_id: string | null;
  request_id: string | null;
  iso_agent_id: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  avinode_trip_id: string | null;
  avinode_rfq_id: string | null;
  primary_quote_id: string | null;
  proposal_id: string | null;
  session_started_at: string;
  session_ended_at: string | null;
  last_activity_at: string;
  current_step: string | null;
  workflow_state: Record<string, unknown> | null;
  message_count: number | null;
  quotes_received_count: number | null;
  quotes_expected_count: number | null;
  operators_contacted_count: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
} & {
  conversation?: {
    id: string;
    request_id: string | null;
    quote_id: string | null;
    type: string;
    status: string;
    subject: string | null;
    last_message_at: string | null;
    message_count: number | null;
  } | null;
  request?: {
    id: string;
    departure_airport: string | null;
    arrival_airport: string | null;
    departure_date: string | null;
    return_date: string | null;
    passengers: number | null;
    aircraft_type: string | null;
    budget: number | null;
    status: string;
    avinode_trip_id: string | null;
    avinode_rfq_id: string | null;
    avinode_deep_link: string | null;
    created_at: string;
  } | null;
};

/**
 * Maps chat_session status to ChatSession status
 */
function mapChatSessionStatusToUIStatus(
  dbStatus: ChatSessionRow['status']
): ChatSession['status'] {
  // Map chat_session status enum to ChatSession status
  const statusMap: Record<string, ChatSession['status']> = {
    active: 'understanding_request', // Default for active sessions
    paused: 'understanding_request',
    completed: 'proposal_ready',
    archived: 'proposal_ready',
  };

  // If current_step is available, use that for more granular status
  // Otherwise use default mapping
  return statusMap[dbStatus] || 'understanding_request';
}

/**
 * Maps current_step to ChatSession status
 */
function mapCurrentStepToStatus(currentStep: string | null): ChatSession['status'] {
  if (!currentStep) return 'understanding_request';

  const stepMap: Record<string, ChatSession['status']> = {
    understanding_request: 'understanding_request',
    searching_aircraft: 'searching_aircraft',
    requesting_quotes: 'requesting_quotes',
    analyzing_options: 'analyzing_options',
    proposal_ready: 'proposal_ready',
  };

  return stepMap[currentStep] || 'understanding_request';
}

/**
 * Maps current_step to workflow step number
 */
function getWorkflowStepFromCurrentStep(currentStep: string | null): number {
  if (!currentStep) return 1;

  const stepMap: Record<string, number> = {
    understanding_request: 1,
    searching_aircraft: 2,
    requesting_quotes: 3,
    analyzing_options: 4,
    proposal_ready: 5,
  };

  return stepMap[currentStep] || 1;
}

/**
 * Formats date for display
 */
function formatDateForDisplay(dateString: string | null): string {
  if (!dateString) return 'Select date';

  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Select date';
  }
}

/**
 * Formats last activity timestamp for display
 */
function formatLastActivity(lastActivityAt: string | null): string {
  if (!lastActivityAt) return 'Just now';

  try {
    const now = new Date();
    const activity = new Date(lastActivityAt);
    const diffMs = now.getTime() - activity.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDateForDisplay(lastActivityAt);
  } catch {
    return 'Just now';
  }
}

/**
 * Converts a chat_sessions table row to ChatSession format for the UI
 * 
 * This function maps chat_session data (with related conversation and request)
 * to the ChatSession format used by the sidebar cards.
 * 
 * @param chatSessionRow - Chat session row from database with related data
 * @returns ChatSession object for UI display
 */
export function chatSessionToUIFormat(chatSessionRow: ChatSessionRow): ChatSession {
  const request = chatSessionRow.request;
  const conversation = chatSessionRow.conversation;

  // Generate route string from request airports
  const route = request?.departure_airport && request?.arrival_airport
    ? `${request.departure_airport} → ${request.arrival_airport}`
    : 'Select route';

  // Format date for display
  const date = formatDateForDisplay(request?.departure_date || null);

  // Map status - prefer current_step if available, otherwise use status
  const status = chatSessionRow.current_step
    ? mapCurrentStepToStatus(chatSessionRow.current_step)
    : mapChatSessionStatusToUIStatus(chatSessionRow.status);

  // Get workflow step
  const currentStep = getWorkflowStepFromCurrentStep(chatSessionRow.current_step);

  // Build ChatSession object for sidebar display
  const chatSession: ChatSession = {
    // Use request ID as primary ID (for consistency with request-based sessions)
    // Fall back to chat_session ID if no request_id exists
    id: chatSessionRow.request_id || chatSessionRow.id,
    conversationId: (chatSessionRow.conversation?.id || chatSessionRow.conversation_id) ?? undefined,
    requestId: chatSessionRow.request_id || chatSessionRow.request?.id || undefined,

    // Set conversation type based on whether request exists
    // Flight requests have a request_id, general chats don't
    conversationType: chatSessionRow.request_id || chatSessionRow.request ? 'flight_request' : 'general',

    // Basic flight information from request
    route,
    passengers: request?.passengers || 0,
    date,
    status,
    currentStep,
    totalSteps: 5,

    // Optional aircraft information
    aircraft: request?.aircraft_type || undefined,

    // Avinode integration fields from chat_session (prefer chat_session, fallback to request)
    tripId: chatSessionRow.avinode_trip_id || request?.avinode_trip_id || undefined,
    rfqId: chatSessionRow.avinode_rfq_id || request?.avinode_rfq_id || undefined,
    deepLink: request?.avinode_deep_link || undefined,

    // Quote statistics from chat_session
    quotesReceived: chatSessionRow.quotes_received_count || undefined,
    quotesTotal: chatSessionRow.quotes_expected_count || undefined,

    // Generated name - prefer conversation subject (LLM-generated title), fallback to request name
    generatedName: conversation?.subject || (request
      ? `${request.departure_airport || 'Unknown'} → ${request.arrival_airport || 'Unknown'} (${date})`
      : undefined),

    // Messages will be loaded separately (empty array for now)
    // Can be populated by loading messages from conversation_id
    messages: [],

    // Initialize rfqFlights as empty array (will be lazy-loaded when card is clicked)
    rfqFlights: [],

    // Metadata from chat_session
    ...(chatSessionRow.metadata && typeof chatSessionRow.metadata === 'object'
      ? {
          // Extract any additional metadata
          basePrice: (chatSessionRow.metadata as any)?.base_price,
          totalPrice: (chatSessionRow.metadata as any)?.total_price,
          margin: (chatSessionRow.metadata as any)?.margin,
        }
      : {}),
  };

  return chatSession;
}

/**
 * Converts an array of chat_sessions table rows to ChatSession format
 * 
 * @param chatSessionRows - Array of chat session rows from database
 * @returns Array of ChatSession objects for UI display
 */
export function chatSessionsToUIFormat(chatSessionRows: ChatSessionRow[]): ChatSession[] {
  return chatSessionRows.map((row) => chatSessionToUIFormat(row));
}
