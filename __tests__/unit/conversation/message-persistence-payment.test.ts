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
  MOCK_CONTRACT_ID,
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

  // ---------------------------------------------------------------------------
  // Edge cases (ONEK-246)
  // ---------------------------------------------------------------------------

  it('persists payment_confirmed with null richContent fields gracefully', async () => {
    const { saveMessage } = await import('@/lib/conversation/message-persistence');

    await saveMessage({
      requestId: MOCK_REQUEST_ID,
      senderType: 'ai_assistant',
      content: 'Payment confirmed',
      contentType: 'payment_confirmed',
      richContent: {
        paymentConfirmed: {
          contractId: MOCK_CONTRACT_ID,
          contractNumber: 'CONTRACT-2026-001',
          paymentAmount: 0,
          paymentMethod: 'wire',
          paymentReference: '',
          paidAt: '',
          currency: 'USD',
        },
      },
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        content_type: 'payment_confirmed',
        rich_content: expect.objectContaining({
          paymentConfirmed: expect.objectContaining({
            paymentAmount: 0,
            paymentReference: '',
          }),
        }),
      })
    );
  });

  it('persists deal_closed with proposalSentAt timestamp', async () => {
    const { saveMessage } = await import('@/lib/conversation/message-persistence');

    const richContent = {
      dealClosed: {
        ...mockDealClosedRichContent.dealClosed,
        proposalSentAt: '2026-02-08T10:00:00Z',
        contractSentAt: '2026-02-09T14:00:00Z',
      },
    };

    await saveMessage({
      requestId: MOCK_REQUEST_ID,
      senderType: 'ai_assistant',
      content: 'Deal closed',
      contentType: 'deal_closed',
      richContent,
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        rich_content: expect.objectContaining({
          dealClosed: expect.objectContaining({
            proposalSentAt: '2026-02-08T10:00:00Z',
            contractSentAt: '2026-02-09T14:00:00Z',
          }),
        }),
      })
    );
  });

  it('persists payment with credit_card method', async () => {
    const { saveMessage } = await import('@/lib/conversation/message-persistence');

    await saveMessage({
      requestId: MOCK_REQUEST_ID,
      senderType: 'ai_assistant',
      content: 'Payment confirmed via credit card',
      contentType: 'payment_confirmed',
      richContent: {
        paymentConfirmed: {
          contractId: MOCK_CONTRACT_ID,
          contractNumber: 'CONTRACT-2026-002',
          paymentAmount: 92500,
          paymentMethod: 'credit_card',
          paymentReference: 'CC-4242-2026-001',
          paidAt: '2026-02-14T16:30:00Z',
          currency: 'USD',
        },
      },
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        rich_content: expect.objectContaining({
          paymentConfirmed: expect.objectContaining({
            paymentMethod: 'credit_card',
          }),
        }),
      })
    );
  });

  it('persists payment with large amount (6+ digits)', async () => {
    const { saveMessage } = await import('@/lib/conversation/message-persistence');

    await saveMessage({
      requestId: MOCK_REQUEST_ID,
      senderType: 'ai_assistant',
      content: 'Payment confirmed',
      contentType: 'payment_confirmed',
      richContent: {
        paymentConfirmed: {
          contractId: MOCK_CONTRACT_ID,
          contractNumber: 'CONTRACT-2026-003',
          paymentAmount: 1250000.50,
          paymentMethod: 'wire',
          paymentReference: 'WT-2026-003',
          paidAt: '2026-02-14T16:30:00Z',
          currency: 'EUR',
        },
      },
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        rich_content: expect.objectContaining({
          paymentConfirmed: expect.objectContaining({
            paymentAmount: 1250000.50,
            currency: 'EUR',
          }),
        }),
      })
    );
  });

  it('handles undefined richContent without crashing', async () => {
    const { saveMessage } = await import('@/lib/conversation/message-persistence');

    await saveMessage({
      requestId: MOCK_REQUEST_ID,
      senderType: 'ai_assistant',
      content: 'Payment confirmed',
      contentType: 'payment_confirmed',
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        content_type: 'payment_confirmed',
      })
    );
  });
});
