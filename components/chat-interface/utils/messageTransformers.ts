/**
 * Message Transformers Utility
 *
 * Utilities for transforming and unifying messages from different sources
 * (user messages, agent messages, operator messages) into a common format.
 *
 * @module components/chat-interface/utils/messageTransformers
 */

import type { ChatSession, OperatorMessage } from '@/components/chat-sidebar';
import type { RFQFlight } from '@/components/avinode/rfq-flight-card';
import type { UnifiedMessage, OperatorMessageItem } from '../types';
import { safeParseTimestamp } from '@/lib/utils/format';

/**
 * Chat message from the ChatSession.messages array
 */
type ChatMessage = ChatSession['messages'][number];

/**
 * Unify all message sources into a single array for rendering.
 *
 * This function combines:
 * - User messages (from chat.messages where type === 'user')
 * - Agent messages (from chat.messages where type === 'agent')
 * - Operator messages (from chat.operatorMessages keyed by quote ID)
 *
 * Messages are sorted by timestamp to maintain chronological order.
 *
 * @param messages - Chat messages from the session
 * @param operatorMessages - Operator messages keyed by quote ID
 * @param rfqFlights - RFQ flight data for operator name lookup
 * @returns Unified array of messages sorted by timestamp
 *
 * @example
 * ```tsx
 * const unified = unifyMessages(
 *   activeChat.messages,
 *   activeChat.operatorMessages,
 *   rfqFlights
 * );
 * ```
 */
export function unifyMessages(
  messages: ChatMessage[] = [],
  operatorMessages: Record<string, OperatorMessageItem[]> = {},
  rfqFlights: RFQFlight[] = []
): UnifiedMessage[] {
  const unified: UnifiedMessage[] = [];

  // Transform chat messages (user and agent)
  for (const message of messages) {
    unified.push(transformChatMessage(message));
  }

  // Transform operator messages
  for (const [quoteId, opMessages] of Object.entries(operatorMessages)) {
    const operatorName = getOperatorNameForQuote(quoteId, rfqFlights);

    for (const opMessage of opMessages) {
      unified.push(transformOperatorMessage(opMessage, quoteId, operatorName));
    }
  }

  // Sort by timestamp
  return unified.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

/**
 * Transform a chat message to unified format.
 *
 * @param message - Chat message from the session
 * @returns Unified message format
 */
function transformChatMessage(message: ChatMessage): UnifiedMessage {
  return {
    id: message.id,
    type: message.type,
    content: message.content,
    timestamp: safeParseTimestamp(message.timestamp),
    // Agent message features
    showWorkflow: message.showWorkflow,
    showProposal: message.showProposal,
    showQuoteStatus: message.showQuoteStatus,
    showCustomerPreferences: message.showCustomerPreferences,
    showQuotes: message.showQuotes,
    showDeepLink: message.showDeepLink,
    deepLinkData: message.deepLinkData,
    showPipeline: message.showPipeline,
    pipelineData: message.pipelineData,
    showProposalSentConfirmation: message.showProposalSentConfirmation,
    proposalSentData: message.proposalSentData,
    showEmailApprovalRequest: message.showEmailApprovalRequest,
    emailApprovalData: message.emailApprovalData,
  };
}

/**
 * Transform an operator message to unified format.
 *
 * @param opMessage - Operator message
 * @param quoteId - Quote ID this message belongs to
 * @param operatorName - Operator company name
 * @returns Unified message format
 */
function transformOperatorMessage(
  opMessage: OperatorMessageItem,
  quoteId: string,
  operatorName: string
): UnifiedMessage {
  return {
    id: opMessage.id || `op-${quoteId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: 'operator',
    content: opMessage.content,
    timestamp: safeParseTimestamp(opMessage.timestamp),
    operatorName,
    operatorQuoteId: quoteId,
    operatorMessageType: opMessage.type,
  };
}

/**
 * Get operator name for a quote ID from RFQ flights.
 *
 * @param quoteId - Quote ID to look up
 * @param rfqFlights - RFQ flight data
 * @returns Operator name or 'Operator' if not found
 */
function getOperatorNameForQuote(
  quoteId: string,
  rfqFlights: RFQFlight[]
): string {
  const flight = rfqFlights.find((f) => f.quoteId === quoteId || f.id === quoteId);
  return flight?.operatorName || 'Operator';
}

/**
 * Filter messages by type.
 *
 * @param messages - Unified messages array
 * @param type - Message type to filter by
 * @returns Filtered messages
 */
export function filterByType(
  messages: UnifiedMessage[],
  type: 'user' | 'agent' | 'operator'
): UnifiedMessage[] {
  return messages.filter((m) => m.type === type);
}

/**
 * Get only proposal confirmation messages.
 *
 * @param messages - Unified messages array
 * @returns Messages that show proposal sent confirmation
 */
export function getProposalConfirmations(messages: UnifiedMessage[]): UnifiedMessage[] {
  return messages.filter(
    (m) =>
      m.showProposalSentConfirmation ||
      (m.content?.toLowerCase().includes('proposal') &&
        m.content?.toLowerCase().includes('sent'))
  );
}

/**
 * Get regular messages (excluding proposal confirmations).
 *
 * @param messages - Unified messages array
 * @returns Messages excluding proposal confirmations
 */
export function getRegularMessages(messages: UnifiedMessage[]): UnifiedMessage[] {
  const confirmations = new Set(getProposalConfirmations(messages).map((m) => m.id));
  return messages.filter((m) => !confirmations.has(m.id));
}

/**
 * Separate messages into regular and proposal confirmations.
 *
 * @param messages - Unified messages array
 * @returns Object with regularMessages and proposalConfirmations arrays
 */
export function separateProposalConfirmations(messages: UnifiedMessage[]): {
  regularMessages: UnifiedMessage[];
  proposalConfirmations: UnifiedMessage[];
} {
  return messages.reduce(
    (acc, message) => {
      const isProposalConfirmation =
        message.showProposalSentConfirmation ||
        (message.content?.toLowerCase().includes('proposal') &&
          message.content?.toLowerCase().includes('sent'));

      if (isProposalConfirmation) {
        acc.proposalConfirmations.push(message);
      } else {
        acc.regularMessages.push(message);
      }
      return acc;
    },
    {
      regularMessages: [] as UnifiedMessage[],
      proposalConfirmations: [] as UnifiedMessage[],
    }
  );
}

/**
 * Get the most recent message of a specific type.
 *
 * @param messages - Unified messages array
 * @param type - Message type to find
 * @returns Most recent message of the type, or undefined
 */
export function getMostRecentByType(
  messages: UnifiedMessage[],
  type: 'user' | 'agent' | 'operator'
): UnifiedMessage | undefined {
  return filterByType(messages, type).at(-1);
}

/**
 * Check if there are any unread operator messages.
 *
 * @param messages - Unified messages array
 * @param lastReadAt - Map of quote ID to last read timestamp
 * @returns Whether there are unread operator messages
 */
export function hasUnreadOperatorMessages(
  messages: UnifiedMessage[],
  lastReadAt: Record<string, string> = {}
): boolean {
  const operatorMessages = filterByType(messages, 'operator');

  return operatorMessages.some((m) => {
    const quoteId = m.operatorQuoteId;
    if (!quoteId) return false;

    const lastRead = lastReadAt[quoteId];
    if (!lastRead) return true;

    return m.timestamp > new Date(lastRead);
  });
}

/**
 * Count messages by type.
 *
 * @param messages - Unified messages array
 * @returns Object with counts for each message type
 */
export function countByType(messages: UnifiedMessage[]): {
  user: number;
  agent: number;
  operator: number;
  total: number;
} {
  const counts = { user: 0, agent: 0, operator: 0, total: messages.length };

  for (const message of messages) {
    if (message.type === 'user') counts.user++;
    else if (message.type === 'agent') counts.agent++;
    else if (message.type === 'operator') counts.operator++;
  }

  return counts;
}
