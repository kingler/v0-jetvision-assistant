/**
 * Tool UI Registry
 *
 * Maps tool names to React components and prop extraction functions.
 * Inspired by MCP UI's declarative tool-to-UI mapping pattern.
 *
 * Only tools that produce visual output are registered here.
 * Text-only tools (cancel_trip, send_trip_message, etc.) fall through
 * and their results are displayed as markdown text by the agent.
 */

import type { ComponentType } from 'react';
import type { UIActionResult } from '@mcp-ui/server';

// Composite wrappers
import { TripCreatedUI } from '@/components/mcp-ui/composites/TripCreatedUI';
import { RfqResultsUI } from '@/components/mcp-ui/composites/RfqResultsUI';
import { QuoteComparisonUI } from '@/components/mcp-ui/composites/QuoteComparisonUI';
import { EmailApprovalUI } from '@/components/mcp-ui/composites/EmailApprovalUI';

// Existing components used directly
import { RfqQuoteDetailsCard } from '@/components/avinode';
import { ProposalPreview } from '@/components/message-components/proposal-preview';
import { PipelineDashboard } from '@/components/message-components/pipeline-dashboard';
import { OperatorChatInline } from '@/components/message-components/operator-chat-inline';

// Types
import type { RFQFlight } from '@/lib/chat/types';

// =============================================================================
// REGISTRY TYPES
// =============================================================================

// Generic component type - components have varied prop shapes resolved at runtime via extractProps
type AnyComponent = ComponentType<any>;

export interface ToolUIEntry {
  /** The React component to render for this tool's output */
  component: AnyComponent;
  /** Extract component props from tool input + result */
  extractProps: (
    toolInput: Record<string, unknown>,
    toolResult: Record<string, unknown>,
    onAction: (action: UIActionResult) => void
  ) => Record<string, unknown>;
}

// =============================================================================
// PROP EXTRACTORS
// =============================================================================

function extractCreateTripProps(
  input: Record<string, unknown>,
  result: Record<string, unknown>,
  onAction: (action: UIActionResult) => void
): Record<string, unknown> {
  return {
    tripId: result.trip_id || '',
    deepLink: result.deep_link || '',
    departureAirport: normalizeAirport(
      input.departure_airport || result.departure_airport
    ),
    arrivalAirport: normalizeAirport(
      input.arrival_airport || result.arrival_airport
    ),
    departureDate: (input.departure_date || result.departure_date || '') as string,
    passengers: (input.passengers || result.passengers || 1) as number,
    tripType: input.return_date ? 'round_trip' : 'single_leg',
    returnDate: input.return_date as string | undefined,
    onAction,
  };
}

function extractGetRfqProps(
  _input: Record<string, unknown>,
  result: Record<string, unknown>,
  onAction: (action: UIActionResult) => void
): Record<string, unknown> {
  // The result contains flights array (pre-transformed by API)
  const flights = (result.flights as RFQFlight[]) || [];
  return { flights, onAction };
}

function extractGetQuoteProps(
  _input: Record<string, unknown>,
  result: Record<string, unknown>,
  onAction: (action: UIActionResult) => void
): Record<string, unknown> {
  return {
    rfqId: result.rfqId || result.rfq_id || '',
    quoteId: result.quoteId || result.quote_id || '',
    operator: {
      name: result.operatorName || result.operator_name || 'Unknown',
      rating: result.operatorRating || result.operator_rating,
    },
    aircraft: {
      type: result.aircraftType || result.aircraft_type || 'Unknown',
      tail: result.tailNumber || result.tail_number || '',
      category: result.aircraftCategory || '',
      maxPassengers: result.passengerCapacity || result.passenger_capacity || 0,
    },
    price: {
      amount: result.totalPrice || result.total_price || 0,
      currency: result.currency || 'USD',
    },
    flightDetails: {
      flightTimeMinutes: result.flightTimeMinutes || 0,
      distanceNm: result.distanceNm || 0,
    },
    status: result.rfqStatus || result.rfq_status || result.status || 'quoted',
    statusDescription: result.statusDescription,
  };
}

function extractGetTripMessagesProps(
  input: Record<string, unknown>,
  result: Record<string, unknown>,
  onAction: (action: UIActionResult) => void
): Record<string, unknown> {
  const messages = (result.messages as Array<Record<string, unknown>>) || [];
  return {
    flightContext: {
      quoteId: input.request_id || '',
      operatorName: 'Operator',
    },
    messages: messages.map((m) => ({
      id: m.id || `msg-${Date.now()}`,
      content: m.content || '',
      timestamp: m.sentAt || m.sent_at || new Date().toISOString(),
      type: m.senderType === 'seller' ? 'RESPONSE' : 'REQUEST',
      sender: m.senderName || m.sender_name,
    })),
    onViewFullThread: (quoteId: string) => {
      onAction({ type: 'prompt', payload: { prompt: `Show full thread for ${quoteId}` } });
    },
    onReply: (quoteId: string) => {
      onAction({ type: 'prompt', payload: { prompt: `Reply to operator for ${quoteId}` } });
    },
  };
}

function extractListRequestsProps(
  _input: Record<string, unknown>,
  result: Record<string, unknown>,
  onAction: (action: UIActionResult) => void
): Record<string, unknown> {
  const requests = (result.requests as Array<Record<string, unknown>>) || [];
  return {
    stats: {
      totalRequests: (result.total as number) || requests.length,
      pendingRequests: requests.filter((r) => r.status === 'pending').length,
      completedRequests: requests.filter((r) => r.status === 'completed').length,
      totalQuotes: 0,
      activeWorkflows: requests.filter((r) => r.status === 'in_progress').length,
    },
    requests: requests.map((r) => ({
      id: r.id as string,
      departureAirport: r.departure_airport as string,
      arrivalAirport: r.arrival_airport as string,
      departureDate: r.departure_date as string,
      passengers: r.passengers as number,
      status: r.status as string,
      createdAt: r.created_at as string,
      clientName: r.client_name as string | undefined,
    })),
    onViewRequest: (requestId: string) => {
      onAction({ type: 'prompt', payload: { prompt: `Show details for request ${requestId}` } });
    },
    onRefresh: () => {
      onAction({ type: 'tool', payload: { toolName: 'list_requests', params: {} } });
    },
  };
}

function extractGetQuotesProps(
  _input: Record<string, unknown>,
  result: Record<string, unknown>,
  onAction: (action: UIActionResult) => void
): Record<string, unknown> {
  const quotes = (result.quotes as Array<Record<string, unknown>>) || [];
  return {
    quotes: quotes.map((q) => ({
      id: q.id || q.quote_id || '',
      operatorName: q.operator_name || q.operatorName || 'Unknown',
      aircraftType: q.aircraft_type || q.aircraftType || 'Unknown',
      price: q.total_price || q.totalPrice || q.base_price || 0,
      departureTime: q.departure_time || q.departureTime || '',
      arrivalTime: q.arrival_time || q.arrivalTime || '',
      flightDuration: q.flight_duration || q.flightDuration || '',
      score: q.score as number | undefined,
      isRecommended: q.isRecommended as boolean | undefined,
    })),
    onAction,
  };
}

function extractProposalProps(
  _input: Record<string, unknown>,
  result: Record<string, unknown>,
  onAction: (action: UIActionResult) => void
): Record<string, unknown> {
  return {
    proposal: {
      id: result.id || result.proposal_id || '',
      title: result.title || result.proposal_number || 'Charter Flight Proposal',
      flightDetails: {
        route: `${result.departure_airport || 'TBD'} → ${result.arrival_airport || 'TBD'}`,
        date: result.departure_date || 'TBD',
        passengers: result.passengers || 0,
      },
      selectedQuote: {
        operatorName: result.operator_name || 'Selected Operator',
        aircraftType: result.aircraft_type || 'TBD',
        price: result.total_amount || result.total_price || 0,
      },
      summary: result.summary as string | undefined,
    },
    onView: (proposalId: string) => {
      onAction({ type: 'link', payload: { url: (result.file_url as string) || '' } });
    },
    onAccept: (proposalId: string) => {
      onAction({
        type: 'tool',
        payload: { toolName: 'send_proposal_email', params: { proposal_id: proposalId } },
      });
    },
  };
}

function extractEmailApprovalProps(
  _input: Record<string, unknown>,
  result: Record<string, unknown>,
  onAction: (action: UIActionResult) => void
): Record<string, unknown> {
  return {
    proposalId: result.proposal_id || '',
    proposalNumber: result.proposal_number,
    to: result.to || { email: '', name: '' },
    subject: result.subject || '',
    body: result.body || '',
    attachments: result.attachments || [],
    flightDetails: result.flight_details,
    pricing: result.pricing,
    generatedAt: result.generated_at,
    requestId: result.request_id,
    onAction,
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function normalizeAirport(
  airport: unknown
): { icao: string; name: string; city: string } {
  if (typeof airport === 'string') {
    return { icao: airport, name: airport, city: '' };
  }
  if (airport && typeof airport === 'object') {
    const a = airport as Record<string, unknown>;
    return {
      icao: (a.icao as string) || '',
      name: (a.name as string) || (a.icao as string) || '',
      city: (a.city as string) || '',
    };
  }
  return { icao: '', name: 'Unknown', city: '' };
}

// =============================================================================
// REGISTRY
// =============================================================================

/**
 * Tool UI Registry - maps tool names to React components.
 *
 * Only 9 of 26 tools have visual output. The rest are text-only
 * and don't need registry entries.
 */
export const TOOL_UI_REGISTRY: Record<string, ToolUIEntry> = {
  create_trip: {
    component: TripCreatedUI,
    extractProps: extractCreateTripProps,
  },
  get_rfq: {
    component: RfqResultsUI,
    extractProps: extractGetRfqProps,
  },
  get_quote: {
    component: RfqQuoteDetailsCard,
    extractProps: extractGetQuoteProps,
  },
  get_trip_messages: {
    component: OperatorChatInline,
    extractProps: extractGetTripMessagesProps,
  },
  list_requests: {
    component: PipelineDashboard,
    extractProps: extractListRequestsProps,
  },
  get_quotes: {
    component: QuoteComparisonUI,
    extractProps: extractGetQuotesProps,
  },
  create_proposal: {
    component: ProposalPreview,
    extractProps: extractProposalProps,
  },
  get_proposal: {
    component: ProposalPreview,
    extractProps: extractProposalProps,
  },
  prepare_proposal_email: {
    component: EmailApprovalUI,
    extractProps: extractEmailApprovalProps,
  },
};

/**
 * Look up a tool's UI entry. Returns undefined for text-only tools.
 */
export function getToolUIEntry(toolName: string): ToolUIEntry | undefined {
  return TOOL_UI_REGISTRY[toolName];
}
