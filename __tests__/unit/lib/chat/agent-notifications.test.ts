/**
 * Unit tests for lib/chat/agent-notifications.ts
 *
 * Tests the pure formatting functions that convert webhook events into
 * agent notification messages for the chat thread (ONEK-173).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  formatQuoteReceivedMessage,
  formatOperatorMessageNotification,
  resolveRequestIdForPersistence,
  type QuoteEventPayload,
} from '@/lib/chat/agent-notifications';

describe('formatQuoteReceivedMessage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-14T12:00:00Z'));
  });

  it('should format a single quote with operator name', () => {
    const events: QuoteEventPayload[] = [
      { quoteId: 'qt-1', operatorName: 'Jet Aviation', tripId: 'trp-1' },
    ];

    const result = formatQuoteReceivedMessage(events);

    expect(result.content).toBe('New quote received from Jet Aviation.');
    expect(result.type).toBe('agent');
    expect(result.isSystemEvent).toBe(true);
    expect(result.systemEventData.eventType).toBe('quote_received');
    expect(result.systemEventData.batchCount).toBe(1);
    expect(result.systemEventData.operatorName).toBe('Jet Aviation');
    expect(result.systemEventData.quoteId).toBe('qt-1');
  });

  it('should format a single quote without operator name', () => {
    const events: QuoteEventPayload[] = [
      { quoteId: 'qt-1' },
    ];

    const result = formatQuoteReceivedMessage(events);

    expect(result.content).toBe('New quote received.');
  });

  it('should format multiple quotes with operator names', () => {
    const events: QuoteEventPayload[] = [
      { quoteId: 'qt-1', operatorName: 'Jet Aviation' },
      { quoteId: 'qt-2', operatorName: 'NetJets' },
      { quoteId: 'qt-3', operatorName: 'VistaJet' },
    ];

    const result = formatQuoteReceivedMessage(events);

    expect(result.content).toBe('3 new quotes received from Jet Aviation, NetJets, and VistaJet.');
    expect(result.systemEventData.batchCount).toBe(3);
  });

  it('should format two quotes with "and" (no Oxford comma)', () => {
    const events: QuoteEventPayload[] = [
      { quoteId: 'qt-1', operatorName: 'Jet Aviation' },
      { quoteId: 'qt-2', operatorName: 'NetJets' },
    ];

    const result = formatQuoteReceivedMessage(events);

    expect(result.content).toBe('2 new quotes received from Jet Aviation and NetJets.');
  });

  it('should format multiple quotes without operator names', () => {
    const events: QuoteEventPayload[] = [
      { quoteId: 'qt-1' },
      { quoteId: 'qt-2' },
    ];

    const result = formatQuoteReceivedMessage(events);

    expect(result.content).toBe('2 new quotes received.');
  });

  it('should de-duplicate operator names', () => {
    const events: QuoteEventPayload[] = [
      { quoteId: 'qt-1', operatorName: 'Jet Aviation' },
      { quoteId: 'qt-2', operatorName: 'Jet Aviation' },
    ];

    const result = formatQuoteReceivedMessage(events);

    expect(result.content).toBe('2 new quotes received from Jet Aviation.');
  });

  it('should append route when provided', () => {
    const events: QuoteEventPayload[] = [
      { quoteId: 'qt-1', operatorName: 'NetJets' },
    ];

    const result = formatQuoteReceivedMessage(events, 'KTEB → KLAX');

    expect(result.content).toBe('New quote received from NetJets. Route: KTEB → KLAX.');
  });

  it('should generate a unique id with sys-quote prefix', () => {
    const events: QuoteEventPayload[] = [
      { quoteId: 'qt-1' },
    ];

    const result = formatQuoteReceivedMessage(events);

    expect(result.id).toMatch(/^sys-quote-/);
  });

  it('should set timestamp to current time', () => {
    const events: QuoteEventPayload[] = [
      { quoteId: 'qt-1' },
    ];

    const result = formatQuoteReceivedMessage(events);

    expect(result.timestamp).toEqual(new Date('2026-02-14T12:00:00Z'));
  });
});

describe('formatOperatorMessageNotification', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-14T12:00:00Z'));
  });

  it('should format a message with operator name and preview', () => {
    const result = formatOperatorMessageNotification(
      'Wheels Up',
      'qt-123',
      'We can offer a competitive rate for this route.',
    );

    expect(result.content).toBe(
      'New message from Wheels Up regarding quote qt-123: "We can offer a competitive rate for this route."',
    );
    expect(result.isSystemEvent).toBe(true);
    expect(result.systemEventData.eventType).toBe('operator_message');
    expect(result.systemEventData.operatorName).toBe('Wheels Up');
    expect(result.systemEventData.quoteId).toBe('qt-123');
  });

  it('should handle missing operator name', () => {
    const result = formatOperatorMessageNotification(
      undefined,
      'qt-123',
      'Hello',
    );

    expect(result.content).toContain('New message from an operator');
    expect(result.systemEventData.operatorName).toBeUndefined();
  });

  it('should handle missing quote ID', () => {
    const result = formatOperatorMessageNotification(
      'NetJets',
      undefined,
      'We are interested.',
    );

    expect(result.content).toBe('New message from NetJets: "We are interested."');
    expect(result.content).not.toContain('regarding quote');
  });

  it('should handle missing preview', () => {
    const result = formatOperatorMessageNotification(
      'VistaJet',
      'qt-456',
      undefined,
    );

    expect(result.content).toBe('New message from VistaJet regarding quote qt-456.');
  });

  it('should truncate long previews to 120 characters', () => {
    const longMessage = 'A'.repeat(200);

    const result = formatOperatorMessageNotification(
      'Operator',
      undefined,
      longMessage,
    );

    // 117 chars + "..."
    expect(result.content).toContain('A'.repeat(117) + '...');
    expect(result.content.length).toBeLessThan(200);
  });

  it('should handle all missing data gracefully', () => {
    const result = formatOperatorMessageNotification(undefined, undefined, undefined);

    expect(result.content).toBe('New message from an operator.');
    expect(result.type).toBe('agent');
    expect(result.isSystemEvent).toBe(true);
  });

  it('should generate a unique id with sys-msg prefix', () => {
    const result = formatOperatorMessageNotification('Op', 'qt-1', 'Hi');

    expect(result.id).toMatch(/^sys-msg-/);
  });
});

describe('resolveRequestIdForPersistence', () => {
  const validUUID = '12345678-1234-1234-1234-123456789abc';
  const validUUID2 = 'abcdef01-2345-6789-abcd-ef0123456789';
  const validUUID3 = 'deadbeef-cafe-babe-dead-beefcafebabe';

  it('should return requestId when it is a valid UUID', () => {
    const result = resolveRequestIdForPersistence({
      id: 'not-a-uuid',
      requestId: validUUID,
    });

    expect(result).toBe(validUUID);
  });

  it('should fall back to conversationId when requestId is not a UUID', () => {
    const result = resolveRequestIdForPersistence({
      id: 'not-a-uuid',
      requestId: 'chat-123',
      conversationId: validUUID2,
    });

    expect(result).toBe(validUUID2);
  });

  it('should fall back to id when neither requestId nor conversationId is a UUID', () => {
    const result = resolveRequestIdForPersistence({
      id: validUUID3,
      requestId: 'chat-123',
      conversationId: 'conv-456',
    });

    expect(result).toBe(validUUID3);
  });

  it('should return null when no valid UUID is found', () => {
    const result = resolveRequestIdForPersistence({
      id: 'not-a-uuid',
      requestId: 'chat-123',
      conversationId: 'conv-456',
    });

    expect(result).toBeNull();
  });

  it('should return null when requestId and conversationId are undefined', () => {
    const result = resolveRequestIdForPersistence({
      id: 'not-a-uuid',
    });

    expect(result).toBeNull();
  });

  it('should prefer requestId over conversationId when both are valid UUIDs', () => {
    const result = resolveRequestIdForPersistence({
      id: validUUID3,
      requestId: validUUID,
      conversationId: validUUID2,
    });

    expect(result).toBe(validUUID);
  });
});
