/**
 * messageTransformers Unit Tests
 *
 * Tests timestamp validation and message unification logic.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import { unifyMessages } from '@/components/chat-interface/utils/messageTransformers';

// Minimal chat message matching ChatSession['messages'][number]
function makeChatMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: 'msg-1',
    type: 'agent' as const,
    content: 'Hello',
    timestamp: new Date('2026-01-15T10:30:00Z'),
    ...overrides,
  };
}

// Minimal operator message matching OperatorMessageItem
function makeOperatorMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: 'op-1',
    type: 'RESPONSE' as const,
    content: 'Quote ready',
    timestamp: '2026-01-15T11:00:00Z',
    sender: 'NetJets',
    ...overrides,
  };
}

describe('messageTransformers', () => {
  describe('unifyMessages - chat message timestamps', () => {
    it('should pass through valid Date timestamps unchanged', () => {
      const validDate = new Date('2026-01-15T10:30:00Z');
      const messages = [makeChatMessage({ timestamp: validDate })];

      const result = unifyMessages(messages, {}, []);

      expect(result[0].timestamp.getTime()).toBe(validDate.getTime());
    });

    it('should parse valid ISO string timestamps', () => {
      const messages = [makeChatMessage({ timestamp: '2026-01-15T10:30:00Z' as unknown as Date })];

      const result = unifyMessages(messages, {}, []);

      expect(result[0].timestamp.getTime()).toBe(new Date('2026-01-15T10:30:00Z').getTime());
    });

    it('should fall back to epoch for Invalid Date objects', () => {
      const invalidDate = new Date('not-a-date');
      const messages = [makeChatMessage({ timestamp: invalidDate })];

      const result = unifyMessages(messages, {}, []);

      expect(result[0].timestamp.getTime()).toBe(0); // epoch
    });

    it('should fall back to epoch for invalid string timestamps', () => {
      const messages = [makeChatMessage({ timestamp: 'garbage' as unknown as Date })];

      const result = unifyMessages(messages, {}, []);

      expect(result[0].timestamp.getTime()).toBe(0);
    });

    it('should fall back to epoch for null timestamps', () => {
      const messages = [makeChatMessage({ timestamp: null })];

      const result = unifyMessages(messages, {}, []);

      expect(result[0].timestamp.getTime()).toBe(0);
    });

    it('should fall back to epoch for undefined timestamps', () => {
      const messages = [makeChatMessage({ timestamp: undefined })];

      const result = unifyMessages(messages, {}, []);

      expect(result[0].timestamp.getTime()).toBe(0);
    });
  });

  describe('unifyMessages - operator message timestamps', () => {
    it('should parse valid ISO string operator timestamps', () => {
      const opMessages = { 'quote-1': [makeOperatorMessage()] };

      const result = unifyMessages([], opMessages, []);

      expect(result[0].timestamp.getTime()).toBe(new Date('2026-01-15T11:00:00Z').getTime());
    });

    it('should fall back to epoch for invalid operator timestamps', () => {
      const opMessages = {
        'quote-1': [makeOperatorMessage({ timestamp: 'not-valid' })],
      };

      const result = unifyMessages([], opMessages, []);

      expect(result[0].timestamp.getTime()).toBe(0);
    });
  });

  describe('unifyMessages - chronological sorting', () => {
    it('should sort messages chronologically', () => {
      const messages = [
        makeChatMessage({ id: 'msg-2', timestamp: new Date('2026-01-15T12:00:00Z') }),
        makeChatMessage({ id: 'msg-1', timestamp: new Date('2026-01-15T10:00:00Z') }),
      ];

      const result = unifyMessages(messages, {}, []);

      expect(result[0].id).toBe('msg-1');
      expect(result[1].id).toBe('msg-2');
    });

    it('should interleave operator and chat messages by timestamp', () => {
      const messages = [
        makeChatMessage({ id: 'msg-1', timestamp: new Date('2026-01-15T10:00:00Z') }),
        makeChatMessage({ id: 'msg-3', timestamp: new Date('2026-01-15T12:00:00Z') }),
      ];
      const opMessages = {
        'quote-1': [makeOperatorMessage({ id: 'op-2', timestamp: '2026-01-15T11:00:00Z' })],
      };

      const result = unifyMessages(messages, opMessages, []);

      expect(result[0].id).toBe('msg-1');
      expect(result[1].id).toBe('op-2');
      expect(result[2].id).toBe('msg-3');
    });

    it('should sort invalid-timestamp messages to the start (epoch)', () => {
      const messages = [
        makeChatMessage({ id: 'valid', timestamp: new Date('2026-01-15T10:00:00Z') }),
        makeChatMessage({ id: 'invalid', timestamp: new Date('garbage') }),
      ];

      const result = unifyMessages(messages, {}, []);

      expect(result[0].id).toBe('invalid'); // epoch sorts first
      expect(result[1].id).toBe('valid');
    });
  });

  describe('unifyMessages - operator name lookup', () => {
    it('should use operator name from rfqFlights when available', () => {
      const opMessages = {
        'quote-1': [makeOperatorMessage({ sender: undefined })],
      };
      const rfqFlights = [
        { quoteId: 'quote-1', operatorName: 'Executive Jets', id: 'flight-1' },
      ] as Array<{ quoteId: string; operatorName: string; id: string }>;

      const result = unifyMessages([], opMessages, rfqFlights as never[]);

      expect(result[0].operatorName).toBe('Executive Jets');
    });

    it('should default to "Operator" when no name found', () => {
      const opMessages = {
        'quote-unknown': [makeOperatorMessage({ sender: undefined })],
      };

      const result = unifyMessages([], opMessages, []);

      expect(result[0].operatorName).toBe('Operator');
    });
  });
});
