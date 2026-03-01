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
 * - Timestamp: conversation start time (e.g., "2h ago")
 */

import type { ChatSession } from '@/components/chat-sidebar';
import type { RFQFlight } from '@/components/avinode/rfq-flight-card';
import { formatDate } from '@/lib/utils/format';

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
    trip_type: string | null;
    passengers: number | null;
    aircraft_type: string | null;
    budget: number | null;
    status: string;
    avinode_trip_id: string | null;
    avinode_rfq_id: string | null;
    avinode_deep_link: string | null;
    created_at: string;
  } | null;
  /** RFQ flights from quotes JOIN — partial because API returns a subset of RFQFlight fields */
  rfqFlights?: Array<Partial<RFQFlight> & { rfqStatus?: string }>;
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
    proposal_sent: 'proposal_sent',
    contract_generated: 'contract_generated',
    contract_sent: 'contract_sent',
    payment_pending: 'payment_pending',
    closed_won: 'closed_won',
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
    proposal_sent: 6,
    contract_generated: 7,
    contract_sent: 8,
    payment_pending: 9,
    closed_won: 10,
  };

  return stepMap[currentStep] || 1;
}

/**
 * Maps request.status to ChatSession status when current_step is null.
 * Returns null if no specific mapping exists (caller should use default).
 */
function mapRequestStatusToUIStatus(requestStatus: string): ChatSession['status'] | null {
  const statusMap: Record<string, ChatSession['status']> = {
    trip_created: 'searching_aircraft',
    searching_flights: 'searching_aircraft',
    awaiting_user_action: 'searching_aircraft',
    avinode_session_active: 'searching_aircraft',
    awaiting_quotes: 'requesting_quotes',
    monitoring_for_quotes: 'requesting_quotes',
    analyzing_proposals: 'analyzing_options',
    generating_email: 'analyzing_options',
    sending_proposal: 'proposal_ready',
    proposal_sent: 'proposal_sent',
    contract_generated: 'contract_generated',
    contract_sent: 'contract_sent',
    payment_pending: 'payment_pending',
    completed: 'closed_won',
    closed_won: 'closed_won',
  };
  return statusMap[requestStatus] || null;
}

/**
 * Maps request.status to workflow step number when current_step is null.
 * Returns null if no specific mapping exists (caller should use default).
 */
function getWorkflowStepFromRequestStatus(requestStatus: string): number | null {
  const stepMap: Record<string, number> = {
    trip_created: 2,
    searching_flights: 2,
    awaiting_user_action: 2,
    avinode_session_active: 2,
    awaiting_quotes: 3,
    monitoring_for_quotes: 3,
    analyzing_proposals: 4,
    generating_email: 4,
    sending_proposal: 5,
    proposal_sent: 6,
    contract_generated: 7,
    contract_sent: 8,
    payment_pending: 9,
    completed: 10,
    closed_won: 10,
  };
  return stepMap[requestStatus] || null;
}

/**
 * Formats date for display
 */
function formatDateForDisplay(dateString: string | null): string {
  if (!dateString) return 'Select date';

  try {
    return formatDate(dateString);
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
  // Guard: departure_airport may be stored as a string or JSON object { icao: "KTEB" }
  const depCode = typeof request?.departure_airport === 'object' && request?.departure_airport !== null
    ? (request.departure_airport as unknown as { icao: string }).icao
    : request?.departure_airport;
  const arrCode = typeof request?.arrival_airport === 'object' && request?.arrival_airport !== null
    ? (request.arrival_airport as unknown as { icao: string }).icao
    : request?.arrival_airport;
  const route = depCode && arrCode
    ? `${depCode} → ${arrCode}`
    : 'Select route';

  // Format date for display
  const date = formatDateForDisplay(request?.departure_date || null);

  // Map status - prefer current_step, then request.status, then chat_session status
  const status = chatSessionRow.current_step
    ? mapCurrentStepToStatus(chatSessionRow.current_step)
    : (request?.status ? mapRequestStatusToUIStatus(request.status) : null)
      ?? mapChatSessionStatusToUIStatus(chatSessionRow.status);

  // Get workflow step - prefer current_step, then request.status, then default
  const currentStep = chatSessionRow.current_step
    ? getWorkflowStepFromCurrentStep(chatSessionRow.current_step)
    : (request?.status ? getWorkflowStepFromRequestStatus(request.status) : null)
      ?? 1;

  // Build ChatSession object for sidebar display
  const resolvedId = chatSessionRow.request_id || chatSessionRow.id;
  const resolvedConversationId = (chatSessionRow.conversation?.id || chatSessionRow.conversation_id) ?? undefined;
  const resolvedRequestId = chatSessionRow.request_id || chatSessionRow.request?.id || undefined;


  const chatSession: ChatSession = {
    // Use request ID as primary ID (for consistency with request-based sessions)
    // Fall back to chat_session ID if no request_id exists
    id: resolvedId,
    conversationId: resolvedConversationId,
    requestId: resolvedRequestId,

    // Set conversation type based on whether request exists
    // Flight requests have a request_id, general chats don't
    conversationType: chatSessionRow.request_id || chatSessionRow.request ? 'flight_request' : 'general',

    // Basic flight information from request
    route,
    passengers: request?.passengers || 0,
    date,
    isoDate: request?.departure_date ? request.departure_date.split('T')[0] : undefined,
    // Infer round_trip if return_date exists even when trip_type is 'single_leg'
    tripType: (request?.trip_type === 'multi_city' ? 'multi_city' : request?.trip_type === 'round_trip' || request?.return_date ? 'round_trip' : request?.trip_type === 'one_way' || request?.trip_type === 'single_leg' ? 'one_way' : undefined) as ChatSession['tripType'],
    returnDate: request?.return_date ? request.return_date.split('T')[0] : undefined,
    status,
    currentStep,
    totalSteps: 10,

    // Optional aircraft information
    aircraft: request?.aircraft_type || undefined,

    // Avinode integration fields from chat_session (prefer chat_session, fallback to request)
    tripId: chatSessionRow.avinode_trip_id || request?.avinode_trip_id || undefined,
    rfqId: chatSessionRow.avinode_rfq_id || request?.avinode_rfq_id || undefined,
    deepLink: request?.avinode_deep_link || undefined,

    // Quote statistics: prefer database fields, fallback to computing from rfqFlights
    quotesReceived: chatSessionRow.quotes_received_count ??
      (chatSessionRow.rfqFlights?.filter((f) => f.rfqStatus === 'quoted')?.length) ??
      undefined,
    quotesTotal: chatSessionRow.quotes_expected_count ??
      (chatSessionRow.rfqFlights?.length) ??
      undefined,

    // Generated name - prefer conversation subject (LLM-generated title), fallback to request name
    // Filter out internal tool call commands like "get_rfq XXXXX" from being used as names
    generatedName: (() => {
      const subject = conversation?.subject;
      // Filter out internal tool call patterns (e.g., "get_rfq XXXXX", "create_trip", etc.)
      const isInternalCommand = subject && (
        subject.startsWith('get_rfq ') ||
        subject.startsWith('get_quote ') ||
        subject.startsWith('create_trip ') ||
        subject.startsWith('cancel_trip ') ||
        subject.startsWith('send_trip_message ')
      );

      if (subject && !isInternalCommand) {
        return subject;
      }

      // Fallback to route-based name from request data (reuse extracted ICAO codes)
      if (depCode && arrCode) {
        return `${depCode} → ${arrCode} (${date})`;
      }

      // Final fallback using tripId if available
      if (chatSessionRow.avinode_trip_id || request?.avinode_trip_id) {
        return `Trip ${chatSessionRow.avinode_trip_id || request?.avinode_trip_id}`;
      }

      return undefined;
    })(),

    // Messages will be loaded separately (empty array for now)
    // Can be populated by loading messages from conversation_id
    messages: [],

    // Cast needed: API returns partial RFQFlight fields, components handle missing fields gracefully
    rfqFlights: (chatSessionRow.rfqFlights || []) as RFQFlight[],

    // Conversation start timestamp (used for sidebar display)
    sessionStartedAt:
      chatSessionRow.session_started_at ||
      chatSessionRow.created_at ||
      request?.created_at ||
      undefined,

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
