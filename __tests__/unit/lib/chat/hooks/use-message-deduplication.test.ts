/**
 * useMessageDeduplication Hook Unit Tests
 *
 * Tests for lib/chat/hooks/use-message-deduplication.ts
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useMessageDeduplication,
  type DeduplicatableMessage,
  type OperatorMessageItem,
} from '@/lib/chat/hooks/use-message-deduplication';
import type { RFQFlight } from '@/lib/chat/types';
import { RFQStatus } from '@/lib/chat/constants';

// =============================================================================
// TEST DATA
// =============================================================================

const createMessage = (
  id: string,
  type: 'user' | 'agent' | 'operator',
  content: string,
  timestampOffset = 0
): DeduplicatableMessage => ({
  id,
  type,
  content,
  timestamp: new Date(Date.now() + timestampOffset),
});

const mockRFQFlight: RFQFlight = {
  id: 'flight-1',
  quoteId: 'quote-1',
  departureAirport: { icao: 'KTEB', name: 'Teterboro' },
  arrivalAirport: { icao: 'KLAX', name: 'Los Angeles' },
  departureDate: '2026-02-15',
  flightDuration: '5h 30m',
  aircraftType: 'Gulfstream G650',
  aircraftModel: 'G650',
  passengerCapacity: 14,
  operatorName: 'NetJets',
  totalPrice: 50000,
  currency: 'USD',
  amenities: { wifi: true, pets: false, smoking: false, galley: false, lavatory: true, medical: false },
  rfqStatus: RFQStatus.QUOTED,
  lastUpdated: '2026-01-31T10:00:00Z',
};

// =============================================================================
// TESTS: deduplicateMessages
// =============================================================================

describe('useMessageDeduplication', () => {
  describe('deduplicateMessages', () => {
    it('should remove duplicate messages by ID', () => {
      const { result } = renderHook(() =>
        useMessageDeduplication({ chatId: 'chat-1' })
      );

      const messages = [
        createMessage('msg-1', 'user', 'Hello'),
        createMessage('msg-1', 'user', 'Hello'), // Duplicate ID
        createMessage('msg-2', 'agent', 'Hi there'),
      ];

      const deduplicated = result.current.deduplicateMessages(messages);

      expect(deduplicated).toHaveLength(2);
      expect(deduplicated.map((m) => m.id)).toEqual(['msg-1', 'msg-2']);
    });

    it('should remove duplicate agent messages by content', () => {
      const { result } = renderHook(() =>
        useMessageDeduplication({ chatId: 'chat-1' })
      );

      const messages = [
        createMessage('msg-1', 'agent', 'Same content'),
        createMessage('msg-2', 'agent', 'Same content'), // Duplicate content
        createMessage('msg-3', 'agent', 'Different content'),
      ];

      const deduplicated = result.current.deduplicateMessages(messages);

      expect(deduplicated).toHaveLength(2);
      expect(deduplicated.map((m) => m.id)).toEqual(['msg-1', 'msg-3']);
    });

    it('should NOT remove user messages with same content', () => {
      const { result } = renderHook(() =>
        useMessageDeduplication({ chatId: 'chat-1' })
      );

      const messages = [
        createMessage('msg-1', 'user', 'Same content'),
        createMessage('msg-2', 'user', 'Same content'), // Same content, different ID
      ];

      const deduplicated = result.current.deduplicateMessages(messages);

      expect(deduplicated).toHaveLength(2);
    });

    it('should NOT remove operator messages with same content', () => {
      const { result } = renderHook(() =>
        useMessageDeduplication({ chatId: 'chat-1' })
      );

      const messages = [
        createMessage('msg-1', 'operator', 'Same content'),
        createMessage('msg-2', 'operator', 'Same content'),
      ];

      const deduplicated = result.current.deduplicateMessages(messages);

      expect(deduplicated).toHaveLength(2);
    });

    it('should preserve proposal confirmation messages', () => {
      const { result } = renderHook(() =>
        useMessageDeduplication({ chatId: 'chat-1' })
      );

      const messages = [
        {
          ...createMessage('msg-1', 'agent', 'Proposal sent'),
          showProposalSentConfirmation: true,
          proposalSentData: { proposalId: 'prop-1', some: 'data' },
        },
        {
          ...createMessage('msg-2', 'agent', 'Proposal sent to different client'),
          showProposalSentConfirmation: true,
          proposalSentData: { proposalId: 'prop-2', other: 'data' },
        },
      ];

      const deduplicated = result.current.deduplicateMessages(messages);

      expect(deduplicated).toHaveLength(2);
    });

    it('should handle empty array', () => {
      const { result } = renderHook(() =>
        useMessageDeduplication({ chatId: 'chat-1' })
      );

      const deduplicated = result.current.deduplicateMessages([]);

      expect(deduplicated).toEqual([]);
    });
  });

  // =============================================================================
  // TESTS: shouldBlockRFQMessage
  // =============================================================================

  describe('shouldBlockRFQMessage', () => {
    it('should NOT block non-RFQ messages', () => {
      const { result } = renderHook(() =>
        useMessageDeduplication({ chatId: 'chat-1' })
      );

      const shouldBlock = result.current.shouldBlockRFQMessage(
        'Hello, how can I help?',
        [],
        1,
        false
      );

      expect(shouldBlock).toBe(false);
    });

    it('should block RFQ message when existing RFQ message exists', () => {
      const { result } = renderHook(() =>
        useMessageDeduplication({ chatId: 'chat-1' })
      );

      const existingMessages = [
        createMessage('msg-1', 'agent', 'Here are your flight quotes'),
      ];

      const shouldBlock = result.current.shouldBlockRFQMessage(
        'Here are your new quotes',
        existingMessages,
        2,
        false
      );

      expect(shouldBlock).toBe(true);
    });

    it('should block RFQ message when in Step 3 or higher', () => {
      const { result } = renderHook(() =>
        useMessageDeduplication({ chatId: 'chat-1' })
      );

      const shouldBlock = result.current.shouldBlockRFQMessage(
        'Here are your quotes',
        [],
        3,
        false
      );

      expect(shouldBlock).toBe(true);
    });

    it('should block RFQ message when hasRfqFlights is true', () => {
      const { result } = renderHook(() =>
        useMessageDeduplication({ chatId: 'chat-1' })
      );

      const shouldBlock = result.current.shouldBlockRFQMessage(
        'Received quotes for your trip',
        [],
        1,
        true
      );

      expect(shouldBlock).toBe(true);
    });

    it('should block duplicate RFQ messages with same hash', () => {
      const { result } = renderHook(() =>
        useMessageDeduplication({ chatId: 'chat-1' })
      );

      // First call should not block
      const shouldBlockFirst = result.current.shouldBlockRFQMessage(
        'Here are your RFQ results',
        [],
        1,
        false
      );

      // Second call with same content should block (hash already exists)
      const shouldBlockSecond = result.current.shouldBlockRFQMessage(
        'Here are your RFQ results',
        [],
        1,
        false
      );

      expect(shouldBlockFirst).toBe(false);
      expect(shouldBlockSecond).toBe(true);
    });
  });

  // =============================================================================
  // TESTS: unifyMessages
  // =============================================================================

  describe('unifyMessages', () => {
    it('should combine chat and operator messages', () => {
      const { result } = renderHook(() =>
        useMessageDeduplication({ chatId: 'chat-1' })
      );

      const chatMessages = [
        createMessage('msg-1', 'user', 'Hello', 0),
        createMessage('msg-2', 'agent', 'Hi there', 1000),
      ];

      const operatorMessages: Record<string, OperatorMessageItem[]> = {
        'quote-1': [
          {
            id: 'op-1',
            type: 'RESPONSE',
            content: 'Operator response',
            timestamp: new Date(Date.now() + 500).toISOString(),
            sender: 'NetJets',
          },
        ],
      };

      const unified = result.current.unifyMessages(
        chatMessages,
        operatorMessages,
        [mockRFQFlight]
      );

      expect(unified).toHaveLength(3);
      expect(unified[0].type).toBe('user');
      expect(unified[1].type).toBe('operator');
      expect(unified[2].type).toBe('agent');
    });

    it('should sort messages by timestamp', () => {
      const { result } = renderHook(() =>
        useMessageDeduplication({ chatId: 'chat-1' })
      );

      const chatMessages = [
        createMessage('msg-1', 'user', 'First', 0),
        createMessage('msg-2', 'agent', 'Third', 2000),
      ];

      const operatorMessages: Record<string, OperatorMessageItem[]> = {
        'quote-1': [
          {
            id: 'op-1',
            type: 'RESPONSE',
            content: 'Second',
            timestamp: new Date(Date.now() + 1000).toISOString(),
          },
        ],
      };

      const unified = result.current.unifyMessages(
        chatMessages,
        operatorMessages,
        [mockRFQFlight]
      );

      expect(unified[0].content).toBe('First');
      expect(unified[1].content).toBe('Second');
      expect(unified[2].content).toBe('Third');
    });

    it('should handle undefined operator messages', () => {
      const { result } = renderHook(() =>
        useMessageDeduplication({ chatId: 'chat-1' })
      );

      const chatMessages = [createMessage('msg-1', 'user', 'Hello')];

      const unified = result.current.unifyMessages(chatMessages, undefined, []);

      expect(unified).toHaveLength(1);
      expect(unified[0].content).toBe('Hello');
    });

    it('should add operator metadata to operator messages', () => {
      const { result } = renderHook(() =>
        useMessageDeduplication({ chatId: 'chat-1' })
      );

      const operatorMessages: Record<string, OperatorMessageItem[]> = {
        'quote-1': [
          {
            id: 'op-1',
            type: 'RESPONSE',
            content: 'Response from operator',
            timestamp: new Date().toISOString(),
            sender: 'NetJets',
          },
        ],
      };

      const unified = result.current.unifyMessages([], operatorMessages, [mockRFQFlight]);

      expect(unified).toHaveLength(1);
      expect(unified[0].operatorName).toBe('NetJets');
      expect(unified[0].operatorQuoteId).toBe('quote-1');
      expect(unified[0].operatorMessageType).toBe('RESPONSE');
    });
  });

  // =============================================================================
  // TESTS: clearHashes
  // =============================================================================

  describe('clearHashes', () => {
    it('should clear processed hashes', () => {
      const { result } = renderHook(() =>
        useMessageDeduplication({ chatId: 'chat-1' })
      );

      // Process an RFQ message
      result.current.shouldBlockRFQMessage('RFQ quote response', [], 1, false);

      // Clear hashes
      act(() => {
        result.current.clearHashes();
      });

      // Same message should not be blocked after clearing
      const shouldBlock = result.current.shouldBlockRFQMessage(
        'RFQ quote response',
        [],
        1,
        false
      );

      expect(shouldBlock).toBe(false);
    });
  });

  // =============================================================================
  // TESTS: Chat ID Change
  // =============================================================================

  describe('chatId change', () => {
    it('should reset hashes when chatId changes', () => {
      const { result, rerender } = renderHook(
        ({ chatId }) => useMessageDeduplication({ chatId }),
        { initialProps: { chatId: 'chat-1' } }
      );

      // Process an RFQ message
      result.current.shouldBlockRFQMessage('RFQ quote test', [], 1, false);

      // Change chatId
      rerender({ chatId: 'chat-2' });

      // Same message should not be blocked with new chatId
      const shouldBlock = result.current.shouldBlockRFQMessage(
        'RFQ quote test',
        [],
        1,
        false
      );

      expect(shouldBlock).toBe(false);
    });
  });
});
