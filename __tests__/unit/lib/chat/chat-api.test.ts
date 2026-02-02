/**
 * Chat API Service Unit Tests
 *
 * Tests for lib/chat/api/chat-api.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sendMessage,
  fetchRFQs,
  buildConversationHistory,
} from '@/lib/chat/api/chat-api';

// =============================================================================
// MOCKS
// =============================================================================

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// =============================================================================
// sendMessage TESTS
// =============================================================================

describe('sendMessage', () => {
  it('should send a message and return response with abort controller', async () => {
    const mockResponse = new Response(JSON.stringify({ success: true }), {
      status: 200,
    });
    mockFetch.mockResolvedValueOnce(mockResponse);

    const result = await sendMessage({
      message: 'I need a flight from KTEB to KLAX',
      conversationHistory: [],
    });

    expect(result.response).toBe(mockResponse);
    expect(result.abortController).toBeInstanceOf(AbortController);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/chat',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('should include tripId and requestId in request body', async () => {
    mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));

    await sendMessage({
      message: 'test message',
      tripId: 'trip-123',
      requestId: 'req-456',
      conversationId: 'conv-789',
      conversationHistory: [],
    });

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);

    expect(body.tripId).toBe('trip-123');
    expect(body.requestId).toBe('req-456');
    expect(body.context.conversationId).toBe('conv-789');
    expect(body.context.tripId).toBe('trip-123');
  });

  it('should include conversation history in request body', async () => {
    mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));

    await sendMessage({
      message: 'test',
      conversationHistory: [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' },
      ],
    });

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);

    expect(body.conversationHistory).toHaveLength(2);
    expect(body.conversationHistory[0].role).toBe('user');
  });

  it('should throw error on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response('Internal Server Error', { status: 500, statusText: 'Internal Server Error' })
    );

    await expect(
      sendMessage({
        message: 'test',
        conversationHistory: [],
      })
    ).rejects.toThrow('Chat API error: 500 Internal Server Error');
  });

  it('should pass abort signal to fetch', async () => {
    mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));

    await sendMessage({
      message: 'test',
      conversationHistory: [],
    });

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].signal).toBeInstanceOf(AbortSignal);
  });
});

// =============================================================================
// fetchRFQs TESTS
// =============================================================================

describe('fetchRFQs', () => {
  it('should fetch RFQs for a trip ID', async () => {
    const mockResponse = new Response(JSON.stringify({ rfqData: {} }), {
      status: 200,
    });
    mockFetch.mockResolvedValueOnce(mockResponse);

    const result = await fetchRFQs({
      tripId: 'trip-123',
      conversationHistory: [],
    });

    expect(result).toBe(mockResponse);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/chat',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('should include skipMessagePersistence in request', async () => {
    mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));

    await fetchRFQs({
      tripId: 'trip-123',
      conversationHistory: [],
    });

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);

    expect(body.skipMessagePersistence).toBe(true);
    expect(body.message).toContain('Get RFQs for Trip ID trip-123');
  });

  it('should include requestId and conversationId', async () => {
    mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));

    await fetchRFQs({
      tripId: 'trip-123',
      requestId: 'req-456',
      conversationId: 'conv-789',
      conversationHistory: [],
    });

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);

    expect(body.requestId).toBe('req-456');
    expect(body.context.conversationId).toBe('conv-789');
  });

  it('should throw error on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response('Not Found', { status: 404, statusText: 'Not Found' })
    );

    await expect(
      fetchRFQs({
        tripId: 'trip-123',
        conversationHistory: [],
      })
    ).rejects.toThrow('RFQ API error: 404 Not Found');
  });
});

// =============================================================================
// buildConversationHistory TESTS
// =============================================================================

describe('buildConversationHistory', () => {
  it('should convert user messages to user role', () => {
    const messages = [{ type: 'user' as const, content: 'Hello' }];

    const result = buildConversationHistory(messages);

    expect(result[0].role).toBe('user');
    expect(result[0].content).toBe('Hello');
  });

  it('should convert agent messages to assistant role', () => {
    const messages = [{ type: 'agent' as const, content: 'Hi there!' }];

    const result = buildConversationHistory(messages);

    expect(result[0].role).toBe('assistant');
    expect(result[0].content).toBe('Hi there!');
  });

  it('should handle mixed messages', () => {
    const messages = [
      { type: 'user' as const, content: 'Question' },
      { type: 'agent' as const, content: 'Answer' },
      { type: 'user' as const, content: 'Follow-up' },
    ];

    const result = buildConversationHistory(messages);

    expect(result).toHaveLength(3);
    expect(result[0].role).toBe('user');
    expect(result[1].role).toBe('assistant');
    expect(result[2].role).toBe('user');
  });

  it('should return empty array for empty input', () => {
    const result = buildConversationHistory([]);
    expect(result).toEqual([]);
  });
});
