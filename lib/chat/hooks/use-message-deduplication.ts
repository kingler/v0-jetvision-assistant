/**
 * useMessageDeduplication - Message Deduplication Logic
 *
 * Prevents duplicate messages from appearing in the chat.
 * Handles RFQ message detection and content-based deduplication.
 *
 * Extracted from: components/chat-interface.tsx (lines 779-905, 1934-1990)
 */

import { useRef, useCallback, useMemo } from 'react';
import type { RFQFlight } from '../types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Base message structure for deduplication
 */
export interface DeduplicatableMessage {
  id: string;
  type: 'user' | 'agent' | 'operator';
  content: string;
  timestamp: Date;
  showProposalSentConfirmation?: boolean;
  proposalSentData?: unknown;
  showContractSentConfirmation?: boolean;
  contractSentData?: unknown;
}

/**
 * Operator message from the messages map
 */
export interface OperatorMessageItem {
  id?: string;
  type: 'REQUEST' | 'RESPONSE' | 'INFO' | 'CONFIRMATION';
  content: string;
  timestamp: string;
  sender?: string;
}

/**
 * Unified message for rendering
 */
export interface UnifiedMessage extends DeduplicatableMessage {
  // Operator-specific fields
  operatorName?: string;
  operatorQuoteId?: string;
  operatorMessageType?: 'REQUEST' | 'RESPONSE' | 'INFO' | 'CONFIRMATION';
  // Agent-specific fields
  showDeepLink?: boolean;
  deepLinkData?: unknown;
  showWorkflow?: boolean;
  showQuotes?: boolean;
  showPipeline?: boolean;
  pipelineData?: unknown;
}

/**
 * Options for the deduplication hook
 */
export interface UseMessageDeduplicationOptions {
  /** Current chat ID (resets hashes when changed) */
  chatId: string;
}

/**
 * Return type for the deduplication hook
 */
export interface UseMessageDeduplicationReturn {
  /** Check if an RFQ message should be blocked (is duplicate) */
  shouldBlockRFQMessage: (
    content: string,
    existingMessages: DeduplicatableMessage[],
    currentStep: number,
    hasRfqFlights: boolean
  ) => boolean;
  /** Deduplicate an array of messages */
  deduplicateMessages: <T extends DeduplicatableMessage>(messages: T[]) => T[];
  /** Unify chat messages and operator messages into a single sorted array */
  unifyMessages: (
    chatMessages: DeduplicatableMessage[],
    operatorMessages: Record<string, OperatorMessageItem[]> | undefined,
    rfqFlights: RFQFlight[]
  ) => UnifiedMessage[];
  /** Clear all processed hashes (call when switching chats) */
  clearHashes: () => void;
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Create a content hash for deduplication.
 * Uses first 100 chars + last 50 chars + length for a simple hash.
 */
function createContentHash(content: string): string {
  const normalized = content.trim().toLowerCase().replace(/\s+/g, ' ');
  const firstPart = normalized.substring(0, 100);
  const lastPart = normalized.substring(Math.max(0, normalized.length - 50));
  return `${firstPart}|${lastPart}|${normalized.length}`;
}

/**
 * Check if message content indicates RFQ-related content.
 */
function isRFQMessage(content: string): boolean {
  const lower = content.trim().toLowerCase();
  return (
    lower.includes('rfq') ||
    lower.includes('quote') ||
    lower.includes('quotes') ||
    lower.includes('trip id') ||
    lower.includes('received quotes') ||
    lower.includes('here are') ||
    lower.includes('flight quotes')
  );
}

/**
 * Extract semantic RFQ fingerprint from message content.
 * Returns a string like "JDREBG|quotes_received|4" that uniquely identifies
 * an RFQ status update. Two messages with the same fingerprint are duplicates.
 */
function extractRFQFingerprint(content: string): string | null {
  const lower = content.trim().toLowerCase();
  if (!isRFQMessage(lower)) return null;

  // Extract trip ID (6-char alphanumeric like JDREBG, or atrip-xxx format)
  const tripIdMatch = content.match(/\b([A-Z0-9]{5,8})\b/i) ||
    content.match(/atrip-[\w-]+/i);
  const tripId = tripIdMatch ? tripIdMatch[0].toUpperCase() : 'UNKNOWN';

  // Determine status category from content
  let status = 'unknown';
  if (/no\s*(active|open)\s*trip|doesn't\s*look|not\s*active/i.test(content)) {
    status = 'not_active';
  } else if (/no\s*quotes?\s*(yet|received)|awaiting|pending/i.test(content)) {
    status = 'awaiting_quotes';
  } else if (/\d+\s*(of\s*\d+\s*)?operators?\s*(have\s*)?(responded|quoted|submitted)/i.test(content) ||
             /received?\s*\d+\s*quotes?/i.test(content) ||
             /quotes?\s*received/i.test(content)) {
    status = 'quotes_received';
  } else if (/proposal|ready|recommend/i.test(content)) {
    status = 'proposal_ready';
  }

  // Extract quote count
  const countMatch = content.match(/(\d+)\s*(of\s*\d+\s*)?(quotes?|operators?\s*(have\s*)?(responded|quoted))/i) ||
    content.match(/received?\s*(\d+)/i);
  const count = countMatch ? countMatch[1] : '0';

  return `${tripId}|${status}|${count}`;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook for message deduplication logic.
 *
 * Provides functions to:
 * - Check if RFQ messages should be blocked (duplicate detection)
 * - Deduplicate message arrays
 * - Unify chat and operator messages
 *
 * @example
 * ```tsx
 * const { shouldBlockRFQMessage, deduplicateMessages, unifyMessages } = useMessageDeduplication({
 *   chatId: activeChat.id,
 * });
 *
 * // Check if we should block a new RFQ message
 * if (shouldBlockRFQMessage(newContent, existingMessages, currentStep, hasRfqFlights)) {
 *   return; // Skip adding this message
 * }
 *
 * // Deduplicate before rendering
 * const uniqueMessages = deduplicateMessages(allMessages);
 *
 * // Unify for rendering
 * const unified = unifyMessages(chatMessages, operatorMessages, rfqFlights);
 * ```
 */
export function useMessageDeduplication(
  options: UseMessageDeduplicationOptions
): UseMessageDeduplicationReturn {
  const { chatId } = options;

  // Track processed content hashes to prevent duplicates across concurrent calls
  const processedHashesRef = useRef<Set<string>>(new Set());
  // Track semantic RFQ fingerprints (tripId+status+quoteCount) to block redundant status messages
  const seenRFQFingerprintsRef = useRef<Set<string>>(new Set());
  const currentChatIdRef = useRef<string>(chatId);

  // Reset hashes when chat changes
  if (currentChatIdRef.current !== chatId) {
    processedHashesRef.current.clear();
    seenRFQFingerprintsRef.current.clear();
    currentChatIdRef.current = chatId;
  }

  /**
   * Check if an RFQ message should be blocked (is duplicate).
   * Returns true if the message should be blocked.
   */
  const shouldBlockRFQMessage = useCallback(
    (
      content: string,
      existingMessages: DeduplicatableMessage[],
      currentStep: number,
      hasRfqFlights: boolean
    ): boolean => {
      // Only check RFQ-related messages
      if (!isRFQMessage(content)) {
        return false;
      }

      const hash = createContentHash(content);

      // Check if already processed (atomic-like operation)
      if (processedHashesRef.current.has(hash)) {
        console.log('[useMessageDeduplication] Blocking duplicate RFQ message (hash exists)');
        return true;
      }

      // Semantic fingerprint check: block messages about the same trip+status+count
      const fingerprint = extractRFQFingerprint(content);
      if (fingerprint && seenRFQFingerprintsRef.current.has(fingerprint)) {
        console.log('[useMessageDeduplication] Blocking duplicate RFQ message (same fingerprint):', fingerprint);
        processedHashesRef.current.add(hash);
        return true;
      }

      // Also check existing messages for matching fingerprints
      if (fingerprint) {
        for (const msg of existingMessages) {
          if (msg.type === 'agent') {
            const existingFingerprint = extractRFQFingerprint(msg.content);
            if (existingFingerprint === fingerprint) {
              console.log('[useMessageDeduplication] Blocking RFQ message matching existing fingerprint:', fingerprint);
              processedHashesRef.current.add(hash);
              seenRFQFingerprintsRef.current.add(fingerprint);
              return true;
            }
          }
        }
        seenRFQFingerprintsRef.current.add(fingerprint);
      }

      // Mark as processed immediately to prevent race conditions
      processedHashesRef.current.add(hash);

      // Check if any existing message has RFQ content
      const hasExistingRFQMessage = existingMessages.some(
        (msg) => msg.type === 'agent' && isRFQMessage(msg.content)
      );

      // Check if we're in Step 3 or 4 (RFQs displayed in FlightSearchProgress)
      const isInStep3Or4 = currentStep >= 3;

      // Block if any of these conditions are true
      if (hasExistingRFQMessage || isInStep3Or4 || hasRfqFlights) {
        console.log('[useMessageDeduplication] Blocking RFQ message:', {
          hasExistingRFQMessage,
          isInStep3Or4,
          hasRfqFlights,
        });
        return true;
      }

      return false;
    },
    []
  );

  /**
   * Deduplicate an array of messages.
   * Removes messages with duplicate IDs or exact content matches.
   */
  const deduplicateMessages = useCallback(
    <T extends DeduplicatableMessage>(messages: T[]): T[] => {
      const seenIds = new Map<string, T>();
      const seenContent = new Set<string>();

      return messages.filter((message) => {
        // Always keep user and operator messages (check by ID only)
        if (message.type === 'user' || message.type === 'operator') {
          if (seenIds.has(message.id)) {
            return false;
          }
          seenIds.set(message.id, message);
          return true;
        }

        // Always keep proposal confirmation messages
        if (message.showProposalSentConfirmation && message.proposalSentData) {
          if (seenIds.has(message.id)) {
            return false;
          }
          seenIds.set(message.id, message);
          return true;
        }

        // Always keep contract confirmation messages
        if (message.showContractSentConfirmation && message.contractSentData) {
          if (seenIds.has(message.id)) {
            return false;
          }
          seenIds.set(message.id, message);
          return true;
        }

        // For agent messages, check both ID and content
        if (seenIds.has(message.id)) {
          console.log('[useMessageDeduplication] Removing duplicate by ID:', message.id);
          return false;
        }

        const contentKey = message.content.trim();
        if (contentKey.length > 0 && seenContent.has(contentKey)) {
          console.log('[useMessageDeduplication] Removing duplicate by content');
          return false;
        }

        seenIds.set(message.id, message);
        if (contentKey.length > 0) {
          seenContent.add(contentKey);
        }
        return true;
      });
    },
    []
  );

  /**
   * Unify chat messages and operator messages into a single sorted array.
   */
  const unifyMessages = useCallback(
    (
      chatMessages: DeduplicatableMessage[],
      operatorMessages: Record<string, OperatorMessageItem[]> | undefined,
      rfqFlights: RFQFlight[]
    ): UnifiedMessage[] => {
      // Convert chat messages to unified format
      const unified: UnifiedMessage[] = chatMessages.map((msg) => ({
        ...msg,
        timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
      }));

      // Flatten operator messages and add to unified array
      if (operatorMessages) {
        for (const [quoteId, messages] of Object.entries(operatorMessages)) {
          const flight = rfqFlights.find((f) => f.quoteId === quoteId);

          for (const msg of messages || []) {
            unified.push({
              id: msg.id || `op-${quoteId}-${msg.timestamp}`,
              type: 'operator',
              content: msg.content,
              timestamp: new Date(msg.timestamp),
              operatorName: msg.sender || flight?.operatorName || 'Operator',
              operatorQuoteId: quoteId,
              operatorMessageType: msg.type,
            });
          }
        }
      }

      // Sort by timestamp (chronological order)
      unified.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // Deduplicate
      return deduplicateMessages(unified);
    },
    [deduplicateMessages]
  );

  /**
   * Clear all processed hashes.
   */
  const clearHashes = useCallback(() => {
    processedHashesRef.current.clear();
    seenRFQFingerprintsRef.current.clear();
  }, []);

  return {
    shouldBlockRFQMessage,
    deduplicateMessages,
    unifyMessages,
    clearHashes,
  };
}

export type UseMessageDeduplicationReturn_Type = ReturnType<typeof useMessageDeduplication>;
