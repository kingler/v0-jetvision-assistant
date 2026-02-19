/**
 * Agent Notification Utilities
 *
 * Pure functions that format Avinode webhook events into agent message objects
 * suitable for injection into the chat thread. These messages surface system
 * events (new quotes, operator messages) as natural-language agent messages
 * rather than silent data refreshes.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type SystemEventType =
  | 'quote_received'
  | 'operator_message'
  | 'quote_declined'
  | 'proposal_ready'
  | 'contract_sent';

export interface SystemEventData {
  eventType: SystemEventType;
  operatorName?: string;
  quoteId?: string;
  batchCount?: number;
  tripId?: string;
  /** Short preview of operator message content */
  messagePreview?: string;
}

export interface AgentNotificationMessage {
  id: string;
  type: 'agent';
  content: string;
  timestamp: Date;
  isSystemEvent: true;
  systemEventData: SystemEventData;
}

/** Minimal quote event payload from webhook */
export interface QuoteEventPayload {
  quoteId: string;
  operatorName?: string;
  tripId?: string;
}

// ─── Message Formatting ──────────────────────────────────────────────────────

/**
 * Format one or more quote-received events into a single batched agent message.
 *
 * - Single quote: "New quote received from Jet Aviation."
 * - Multiple quotes: "3 new quotes received from Jet Aviation, NetJets, and VistaJet."
 * - Missing operator names: "New quote received." / "3 new quotes received."
 */
export function formatQuoteReceivedMessage(
  events: QuoteEventPayload[],
  route?: string,
): AgentNotificationMessage {
  const count = events.length;
  const operatorNames = events
    .map((e) => e.operatorName)
    .filter((name): name is string => !!name);

  // De-duplicate operator names (same operator may quote multiple legs)
  const uniqueNames = [...new Set(operatorNames)];

  let content: string;
  if (count === 1) {
    content = uniqueNames.length > 0
      ? `New quote received from ${uniqueNames[0]}.`
      : 'New quote received.';
  } else {
    const namesList = formatNamesList(uniqueNames);
    content = namesList
      ? `${count} new quotes received from ${namesList}.`
      : `${count} new quotes received.`;
  }

  if (route) {
    content += ` Route: ${route}.`;
  }

  return {
    id: `sys-quote-${Date.now()}`,
    type: 'agent',
    content,
    timestamp: new Date(),
    isSystemEvent: true,
    systemEventData: {
      eventType: 'quote_received',
      batchCount: count,
      operatorName: uniqueNames[0],
      quoteId: events[0]?.quoteId,
      tripId: events[0]?.tripId,
    },
  };
}

/**
 * Format an operator message event into an agent notification message.
 *
 * Content: "New message from Wheels Up regarding quote QT-123: 'We can offer...'"
 * Falls back gracefully when operator name or preview is missing.
 */
export function formatOperatorMessageNotification(
  operatorName: string | undefined,
  quoteId: string | undefined,
  preview: string | undefined,
): AgentNotificationMessage {
  const sender = operatorName || 'an operator';
  let content = `New message from ${sender}`;

  if (quoteId) {
    content += ` regarding quote ${quoteId}`;
  }

  if (preview) {
    // Truncate long previews to 120 characters
    const truncated = preview.length > 120
      ? preview.slice(0, 117) + '...'
      : preview;
    content += `: "${truncated}"`;
  }

  // Ensure trailing period
  if (!content.endsWith('"') && !content.endsWith('.')) {
    content += '.';
  }

  return {
    id: `sys-msg-${Date.now()}`,
    type: 'agent',
    content,
    timestamp: new Date(),
    isSystemEvent: true,
    systemEventData: {
      eventType: 'operator_message',
      operatorName: operatorName || undefined,
      quoteId,
    },
  };
}

// ─── Request ID Resolution ───────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve a valid UUID request ID from the chat session for persistence.
 *
 * Tries requestId → conversationId → id, returning the first valid UUID.
 * This deduplicates the pattern used in handleContractSent and handlePaymentConfirm.
 */
export function resolveRequestIdForPersistence(chat: {
  id: string;
  requestId?: string;
  conversationId?: string;
}): string | null {
  if (chat.requestId && UUID_REGEX.test(chat.requestId)) {
    return chat.requestId;
  }
  if (chat.conversationId && UUID_REGEX.test(chat.conversationId)) {
    return chat.conversationId;
  }
  if (chat.id && UUID_REGEX.test(chat.id)) {
    return chat.id;
  }
  return null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Format a list of names with Oxford comma:
 * [] → ""
 * ["A"] → "A"
 * ["A", "B"] → "A and B"
 * ["A", "B", "C"] → "A, B, and C"
 */
function formatNamesList(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}
