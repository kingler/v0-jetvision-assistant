/**
 * @vitest-environment node
 */

/**
 * Message Persistence - Payment Content Type Tests
 *
 * Tests that saveMessage correctly persists payment_confirmed
 * and deal_closed messages to the database.
 *
 * @see lib/conversation/message-persistence.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  MOCK_REQUEST_ID,
  mockPaymentConfirmedRichContent,
  mockDealClosedRichContent,
} from '../../fixtures/payment-test-data';

// =============================================================================
// MOCK SUPABASE
// =============================================================================

const mockSingle = vi.fn();
const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}));

// =============================================================================
// TESTS
// =============================================================================

describe('saveMessage - Payment Content Types', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ insert: mockInsert });
    mockInsert.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockSingle.mockResolvedValue({ data: { id: 'msg-uuid-001' }, error: null });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('inserts payment_confirmed with correct rich_content shape', async () => {
    const { saveMessage } = await import('@/lib/conversation/message-persistence');

    await saveMessage({
      requestId: MOCK_REQUEST_ID,
      senderType: 'ai_assistant',
      content: 'Payment confirmed for CONTRACT-2026-001',
      contentType: 'payment_confirmed',
      richContent: mockPaymentConfirmedRichContent,
    });

    expect(mockFrom).toHaveBeenCalledWith('messages');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        request_id: MOCK_REQUEST_ID,
        content_type: 'payment_confirmed',
        rich_content: mockPaymentConfirmedRichContent,
      })
    );
  });

  it('inserts deal_closed with correct rich_content shape', async () => {
    const { saveMessage } = await import('@/lib/conversation/message-persistence');

    await saveMessage({
      requestId: MOCK_REQUEST_ID,
      senderType: 'ai_assistant',
      content: 'Deal closed for CONTRACT-2026-001',
      contentType: 'deal_closed',
      richContent: mockDealClosedRichContent,
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        content_type: 'deal_closed',
        rich_content: mockDealClosedRichContent,
      })
    );
  });

  it('sets sender_type to ai_assistant', async () => {
    const { saveMessage } = await import('@/lib/conversation/message-persistence');

    await saveMessage({
      requestId: MOCK_REQUEST_ID,
      senderType: 'ai_assistant',
      content: 'Payment confirmed',
      contentType: 'payment_confirmed',
      richContent: mockPaymentConfirmedRichContent,
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        sender_type: 'ai_assistant',
      })
    );
  });

  it('returns message ID on success', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'msg-uuid-xyz' }, error: null });

    const { saveMessage } = await import('@/lib/conversation/message-persistence');

    const id = await saveMessage({
      requestId: MOCK_REQUEST_ID,
      senderType: 'ai_assistant',
      content: 'Payment confirmed',
      contentType: 'payment_confirmed',
      richContent: mockPaymentConfirmedRichContent,
    });

    expect(id).toBe('msg-uuid-xyz');
  });

  it('throws for iso_agent sender type missing senderIsoAgentId', async () => {
    const { saveMessage } = await import('@/lib/conversation/message-persistence');

    await expect(
      saveMessage({
        requestId: MOCK_REQUEST_ID,
        senderType: 'iso_agent',
        content: 'Test',
        contentType: 'text',
      })
    ).rejects.toThrow('senderIsoAgentId is required');
  });

  it('throws for operator sender type missing senderOperatorId', async () => {
    const { saveMessage } = await import('@/lib/conversation/message-persistence');

    await expect(
      saveMessage({
        requestId: MOCK_REQUEST_ID,
        senderType: 'operator',
        content: 'Test',
        contentType: 'text',
      })
    ).rejects.toThrow('senderOperatorId is required');
  });

  it('succeeds for ai_assistant without agent ID fields', async () => {
    const { saveMessage } = await import('@/lib/conversation/message-persistence');

    const id = await saveMessage({
      requestId: MOCK_REQUEST_ID,
      senderType: 'ai_assistant',
      content: 'Payment confirmed',
      contentType: 'payment_confirmed',
      richContent: mockPaymentConfirmedRichContent,
    });

    expect(id).toBe('msg-uuid-001');
  });

  it('throws on Supabase insert failure', async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'Insert failed' },
    });

    const { saveMessage } = await import('@/lib/conversation/message-persistence');

    await expect(
      saveMessage({
        requestId: MOCK_REQUEST_ID,
        senderType: 'ai_assistant',
        content: 'Payment confirmed',
        contentType: 'payment_confirmed',
        richContent: mockPaymentConfirmedRichContent,
      })
    ).rejects.toThrow('Failed to save message');
  });

  it('sets status to sent by default', async () => {
    const { saveMessage } = await import('@/lib/conversation/message-persistence');

    await saveMessage({
      requestId: MOCK_REQUEST_ID,
      senderType: 'ai_assistant',
      content: 'Payment confirmed',
      contentType: 'payment_confirmed',
      richContent: mockPaymentConfirmedRichContent,
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'sent',
      })
    );
  });

  it('defaults contentType to text when not provided', async () => {
    const { saveMessage } = await import('@/lib/conversation/message-persistence');

    await saveMessage({
      requestId: MOCK_REQUEST_ID,
      senderType: 'ai_assistant',
      content: 'Plain text message',
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        content_type: 'text',
      })
    );
  });
});
