/**
 * Operator Thread Management
 *
 * Utilities for managing multiple operator conversations within a single RFQ.
 * Each operator has their own thread with:
 * - Conversation history (messages both directions)
 * - Quote status and details
 * - Read/unread state
 */

import type { OperatorThread, OperatorMessage } from '@/components/chat-sidebar';

/**
 * Initialize operator threads from RFQ data
 * Creates thread entries for all operators who received the RFQ
 */
/** Unified seller type with all optional properties */
interface SellerData {
  id?: string;
  sellerId?: string;
  name?: string;
  companyName?: string;
  sellerName?: string;
  status?: string;
  quoteId?: string;
  quote?: {
    price?: number;
    currency?: string;
    validUntil?: string;
    aircraft?: { type?: string };
  };
}

export function initializeOperatorThreads(
  rfqData: {
    sellers?: SellerData[];
    requests?: SellerData[];
  }
): Record<string, OperatorThread> {
  const threads: Record<string, OperatorThread> = {};

  // Process sellers array (from get_rfq response)
  const sellers: SellerData[] = rfqData.sellers || rfqData.requests || [];

  for (const seller of sellers) {
    const operatorId = seller.id || seller.sellerId || '';
    if (!operatorId) continue;

    const status = mapSellerStatusToThreadStatus(seller.status);

    threads[operatorId] = {
      operatorId,
      operatorName: seller.name || seller.companyName || seller.sellerName || 'Unknown Operator',
      quoteId: seller.quoteId,
      status,
      messages: [],
      hasUnreadMessages: false,
      quote: seller.quote ? {
        price: seller.quote.price || 0,
        currency: seller.quote.currency || 'USD',
        validUntil: seller.quote.validUntil,
        aircraftType: seller.quote.aircraft?.type,
      } : undefined,
    };
  }

  return threads;
}

/**
 * Map Avinode seller status to thread status
 */
function mapSellerStatusToThreadStatus(
  status?: string
): OperatorThread['status'] {
  switch (status?.toLowerCase()) {
    case 'quoted':
      return 'quoted';
    case 'declined':
    case 'rejected':
      return 'declined';
    case 'expired':
      return 'expired';
    case 'accepted':
    case 'booked':
      return 'accepted';
    case 'pending':
    case 'sent':
    default:
      return 'awaiting_response';
  }
}

/**
 * Add message to operator thread
 */
export function addMessageToThread(
  threads: Record<string, OperatorThread>,
  operatorId: string,
  message: OperatorMessage
): Record<string, OperatorThread> {
  const thread = threads[operatorId];
  if (!thread) {
    console.warn(`[OperatorThreads] Thread not found for operator: ${operatorId}`);
    return threads;
  }

  return {
    ...threads,
    [operatorId]: {
      ...thread,
      messages: [...thread.messages, message],
      lastMessageAt: message.timestamp,
      hasUnreadMessages: message.type === 'RESPONSE', // Mark unread if from operator
      status: thread.status === 'quoted' || thread.status === 'awaiting_response'
        ? 'in_negotiation'
        : thread.status,
    },
  };
}

/**
 * Mark thread messages as read
 */
export function markThreadAsRead(
  threads: Record<string, OperatorThread>,
  operatorId: string
): Record<string, OperatorThread> {
  const thread = threads[operatorId];
  if (!thread) return threads;

  return {
    ...threads,
    [operatorId]: {
      ...thread,
      hasUnreadMessages: false,
    },
  };
}

/**
 * Update thread status when quote is received
 */
export function updateThreadWithQuote(
  threads: Record<string, OperatorThread>,
  operatorId: string,
  quote: {
    quoteId: string;
    price: number;
    currency: string;
    validUntil?: string;
    aircraftType?: string;
    sellerMessage?: string;
  }
): Record<string, OperatorThread> {
  const thread = threads[operatorId];
  if (!thread) {
    // Create new thread if doesn't exist
    return {
      ...threads,
      [operatorId]: {
        operatorId,
        operatorName: 'Unknown Operator',
        quoteId: quote.quoteId,
        status: 'quoted',
        messages: quote.sellerMessage ? [{
          id: `quote-msg-${Date.now()}`,
          type: 'RESPONSE',
          content: quote.sellerMessage,
          timestamp: new Date().toISOString(),
          sender: 'Operator',
          operatorId,
        }] : [],
        hasUnreadMessages: true,
        quote: {
          price: quote.price,
          currency: quote.currency,
          validUntil: quote.validUntil,
          aircraftType: quote.aircraftType,
        },
      },
    };
  }

  return {
    ...threads,
    [operatorId]: {
      ...thread,
      quoteId: quote.quoteId,
      status: 'quoted',
      hasUnreadMessages: true,
      quote: {
        price: quote.price,
        currency: quote.currency,
        validUntil: quote.validUntil,
        aircraftType: quote.aircraftType,
      },
      messages: quote.sellerMessage ? [
        ...thread.messages,
        {
          id: `quote-msg-${Date.now()}`,
          type: 'RESPONSE' as const,
          content: quote.sellerMessage,
          timestamp: new Date().toISOString(),
          sender: thread.operatorName,
          operatorId,
        },
      ] : thread.messages,
    },
  };
}

/**
 * Get threads with unread messages
 */
export function getUnreadThreads(
  threads: Record<string, OperatorThread>
): OperatorThread[] {
  return Object.values(threads).filter(t => t.hasUnreadMessages);
}

/**
 * Get thread count by status
 */
export function getThreadCountsByStatus(
  threads: Record<string, OperatorThread>
): Record<OperatorThread['status'], number> {
  const counts: Record<OperatorThread['status'], number> = {
    rfq_sent: 0,
    awaiting_response: 0,
    quoted: 0,
    in_negotiation: 0,
    declined: 0,
    expired: 0,
    accepted: 0,
  };

  for (const thread of Object.values(threads)) {
    counts[thread.status]++;
  }

  return counts;
}

/**
 * Merge messages from Avinode API into operator threads
 * Groups messages by operator ID
 */
export function mergeMessagesIntoThreads(
  threads: Record<string, OperatorThread>,
  messages: Array<{
    id: string;
    content: string;
    timestamp: string;
    senderType?: string;
    senderId?: string;
    senderName?: string;
    operatorId?: string;
    requestId?: string;
  }>
): Record<string, OperatorThread> {
  let updatedThreads = { ...threads };

  for (const msg of messages) {
    // Determine operator ID from message
    const operatorId = msg.operatorId || msg.senderId || msg.requestId;
    if (!operatorId) continue;

    // Determine message type (REQUEST = outbound from user, RESPONSE = inbound from operator)
    const isBuyerMessage = msg.senderType?.toLowerCase().includes('buyer') ||
                          msg.senderType?.toLowerCase() === 'mine';

    const operatorMessage: OperatorMessage = {
      id: msg.id,
      type: isBuyerMessage ? 'REQUEST' : 'RESPONSE',
      content: msg.content,
      timestamp: msg.timestamp,
      sender: msg.senderName || (isBuyerMessage ? 'You' : 'Operator'),
      operatorId,
    };

    // Ensure thread exists
    if (!updatedThreads[operatorId]) {
      updatedThreads[operatorId] = {
        operatorId,
        operatorName: msg.senderName || 'Unknown Operator',
        status: 'awaiting_response',
        messages: [],
        hasUnreadMessages: false,
      };
    }

    // Add message if not duplicate
    const existingIds = new Set(updatedThreads[operatorId].messages.map(m => m.id));
    if (!existingIds.has(msg.id)) {
      updatedThreads = addMessageToThread(updatedThreads, operatorId, operatorMessage);
    }
  }

  return updatedThreads;
}

/**
 * Prepare message for sending to specific operator
 */
export interface SendMessageParams {
  requestId: string;
  operatorId: string;
  message: string;
}

/**
 * Generate a suggested response based on operator's message
 * This is a placeholder - the actual AI generation happens in the agent
 */
export function generateResponseContext(
  thread: OperatorThread,
  latestMessage: OperatorMessage
): {
  operatorId: string;
  operatorName: string;
  conversationHistory: OperatorMessage[];
  latestMessage: OperatorMessage;
  quoteDetails?: OperatorThread['quote'];
} {
  return {
    operatorId: thread.operatorId,
    operatorName: thread.operatorName,
    conversationHistory: thread.messages,
    latestMessage,
    quoteDetails: thread.quote,
  };
}
