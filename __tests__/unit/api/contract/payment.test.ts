/**
 * @vitest-environment node
 */

/**
 * Contract Payment API Route Tests
 *
 * Tests for POST /api/contract/[id]/payment endpoint.
 * Records payment information and optionally completes a contract.
 *
 * @see app/api/contract/[id]/payment/route.ts
 */

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  MOCK_AGENT_ID,
  MOCK_CONTRACT_ID,
  MOCK_REQUEST_ID,
  mockContractRow,
  mockPaymentResult,
  mockCompletedContract,
  mockPaymentRequestBody,
} from '../../../fixtures/payment-test-data';

// =============================================================================
// MOCKS (hoisted)
// =============================================================================

const mockGetAuthenticatedAgent = vi.fn();
vi.mock('@/lib/utils/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils/api')>();
  return {
    ...actual,
    getAuthenticatedAgent: (...args: unknown[]) => mockGetAuthenticatedAgent(...args),
  };
});

const mockGetContractById = vi.fn();
const mockUpdateContractPayment = vi.fn();
const mockCompleteContract = vi.fn();
vi.mock('@/lib/services/contract-service', () => ({
  getContractById: (...args: unknown[]) => mockGetContractById(...args),
  updateContractPayment: (...args: unknown[]) => mockUpdateContractPayment(...args),
  completeContract: (...args: unknown[]) => mockCompleteContract(...args),
}));

const mockSaveMessage = vi.fn();
vi.mock('@/lib/conversation/message-persistence', () => ({
  saveMessage: (...args: unknown[]) => mockSaveMessage(...args),
}));

// =============================================================================
// HELPERS
// =============================================================================

function createMockRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/contract/test-id/payment', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function setupAuthMock(mode: 'success' | 'unauthorized' | 'not_found' = 'success') {
  if (mode === 'unauthorized') {
    const { NextResponse } = require('next/server');
    mockGetAuthenticatedAgent.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    );
  } else if (mode === 'not_found') {
    const { NextResponse } = require('next/server');
    mockGetAuthenticatedAgent.mockResolvedValue(
      NextResponse.json({ error: 'ISO agent not found' }, { status: 404 })
    );
  } else {
    mockGetAuthenticatedAgent.mockResolvedValue({ id: MOCK_AGENT_ID });
  }
}

let POST: typeof import('../../../../app/api/contract/[id]/payment/route')['POST'];

async function callPOST(body: unknown) {
  const request = createMockRequest(body);
  return POST(request, { params: Promise.resolve({ id: MOCK_CONTRACT_ID }) });
}

// =============================================================================
// TESTS
// =============================================================================

describe('POST /api/contract/[id]/payment', () => {
  beforeAll(async () => {
    const mod = await import('../../../../app/api/contract/[id]/payment/route');
    POST = mod.POST;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthMock('success');
    mockGetContractById.mockResolvedValue(mockContractRow);
    mockUpdateContractPayment.mockResolvedValue(mockPaymentResult);
    mockCompleteContract.mockResolvedValue(mockCompletedContract);
    mockSaveMessage.mockResolvedValue('msg-uuid-001');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------------------------

  describe('Authentication', () => {
    it('returns 401 when user is not authenticated', async () => {
      setupAuthMock('unauthorized');

      const response = await callPOST(mockPaymentRequestBody);

      expect(response.status).toBe(401);
    });

    it('returns 404 when agent is not found', async () => {
      setupAuthMock('not_found');

      const response = await callPOST(mockPaymentRequestBody);

      expect(response.status).toBe(404);
    });
  });

  // ---------------------------------------------------------------------------
  // Request Validation
  // ---------------------------------------------------------------------------

  describe('Request Validation', () => {
    it('returns 400 when payment_reference is empty', async () => {
      const response = await callPOST({
        ...mockPaymentRequestBody,
        payment_reference: '',
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('reference');
    });

    it('returns 400 when payment_reference is missing', async () => {
      const { payment_reference, ...body } = mockPaymentRequestBody;
      const response = await callPOST(body);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('reference');
    });

    it('returns 400 when payment_amount is zero', async () => {
      const response = await callPOST({
        ...mockPaymentRequestBody,
        payment_amount: 0,
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('amount');
    });

    it('returns 400 when payment_amount is negative', async () => {
      const response = await callPOST({
        ...mockPaymentRequestBody,
        payment_amount: -100,
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('amount');
    });

    it('returns 400 when payment_method is invalid', async () => {
      const response = await callPOST({
        ...mockPaymentRequestBody,
        payment_method: 'bitcoin',
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('method');
    });

    it('returns 400 when payment_method is missing', async () => {
      const { payment_method, ...body } = mockPaymentRequestBody;
      const response = await callPOST(body);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('method');
    });

    it('returns 400 when cc_last_four is not 4 digits', async () => {
      const response = await callPOST({
        ...mockPaymentRequestBody,
        payment_method: 'credit_card',
        cc_last_four: '12',
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('4 digits');
    });

    it('accepts valid cc_last_four with credit_card method', async () => {
      const response = await callPOST({
        ...mockPaymentRequestBody,
        payment_method: 'credit_card',
        cc_last_four: '4242',
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Contract Lookup
  // ---------------------------------------------------------------------------

  describe('Contract Lookup', () => {
    it('returns 404 when contract is not found', async () => {
      mockGetContractById.mockResolvedValue(null);

      const response = await callPOST(mockPaymentRequestBody);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('returns 404 when contract belongs to different agent (ownership check)', async () => {
      mockGetContractById.mockResolvedValue({
        ...mockContractRow,
        iso_agent_id: 'different-agent-id',
      });

      const response = await callPOST(mockPaymentRequestBody);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });
  });

  // ---------------------------------------------------------------------------
  // Status Validation
  // ---------------------------------------------------------------------------

  describe('Status Validation', () => {
    it.each(['draft', 'paid', 'completed', 'cancelled', 'expired'] as const)(
      'rejects contract in "%s" status',
      async (status) => {
        mockGetContractById.mockResolvedValue({
          ...mockContractRow,
          status,
        });

        const response = await callPOST(mockPaymentRequestBody);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain(status);
      }
    );

    it.each(['sent', 'signed', 'payment_pending'] as const)(
      'accepts contract in "%s" status',
      async (status) => {
        mockGetContractById.mockResolvedValue({
          ...mockContractRow,
          status,
        });

        const response = await callPOST(mockPaymentRequestBody);

        expect(response.status).toBe(200);
      }
    );
  });

  // ---------------------------------------------------------------------------
  // Successful Payment
  // ---------------------------------------------------------------------------

  describe('Successful Payment', () => {
    it('records payment and returns updated contract', async () => {
      const response = await callPOST(mockPaymentRequestBody);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.contract.payment_reference).toBe('WT-2026-001');
      expect(data.contract.payment_amount).toBe(45182.76);
    });

    it('uses current date when payment_date is not provided', async () => {
      const { payment_date, ...body } = mockPaymentRequestBody as Record<string, unknown>;
      await callPOST(body);

      expect(mockUpdateContractPayment).toHaveBeenCalledWith(
        MOCK_CONTRACT_ID,
        expect.objectContaining({
          payment_date: expect.any(String),
        })
      );
    });

    it('uses provided payment_date when given', async () => {
      await callPOST({
        ...mockPaymentRequestBody,
        payment_date: '2026-02-09T10:00:00Z',
      });

      expect(mockUpdateContractPayment).toHaveBeenCalledWith(
        MOCK_CONTRACT_ID,
        expect.objectContaining({
          payment_date: '2026-02-09T10:00:00Z',
        })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Mark Complete
  // ---------------------------------------------------------------------------

  describe('Mark Complete', () => {
    it('calls completeContract when markComplete is true', async () => {
      await callPOST({ ...mockPaymentRequestBody, markComplete: true });

      expect(mockCompleteContract).toHaveBeenCalledWith(MOCK_CONTRACT_ID);
    });

    it('skips completeContract when markComplete is false', async () => {
      await callPOST({ ...mockPaymentRequestBody, markComplete: false });

      expect(mockCompleteContract).not.toHaveBeenCalled();
    });

    it('returns completed status when markComplete is true', async () => {
      const response = await callPOST({ ...mockPaymentRequestBody, markComplete: true });
      const data = await response.json();

      expect(data.contract.status).toBe('completed');
    });
  });

  // ---------------------------------------------------------------------------
  // Message Persistence
  // ---------------------------------------------------------------------------

  describe('Message Persistence', () => {
    it('saves payment_confirmed and deal_closed messages when requestId is provided', async () => {
      await callPOST({ ...mockPaymentRequestBody, markComplete: true });

      expect(mockSaveMessage).toHaveBeenCalledTimes(2);

      // First call: payment_confirmed
      expect(mockSaveMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: MOCK_REQUEST_ID,
          senderType: 'ai_assistant',
          contentType: 'payment_confirmed',
          richContent: expect.objectContaining({
            paymentConfirmed: expect.objectContaining({
              contractNumber: 'CONTRACT-2026-001',
            }),
          }),
        })
      );

      // Second call: deal_closed
      expect(mockSaveMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: MOCK_REQUEST_ID,
          senderType: 'ai_assistant',
          contentType: 'deal_closed',
          richContent: expect.objectContaining({
            dealClosed: expect.objectContaining({
              customerName: 'John Smith',
            }),
          }),
        })
      );
    });

    it('skips message persistence when requestId is not provided', async () => {
      const { requestId, ...body } = mockPaymentRequestBody;
      await callPOST(body);

      expect(mockSaveMessage).not.toHaveBeenCalled();
    });

    it('does not fail payment response when message persistence fails', async () => {
      mockSaveMessage.mockRejectedValue(new Error('DB connection failed'));

      const response = await callPOST(mockPaymentRequestBody);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Error Handling
  // ---------------------------------------------------------------------------

  describe('Error Handling', () => {
    it('returns 500 when service throws unexpected error', async () => {
      mockUpdateContractPayment.mockRejectedValue(new Error('Supabase unreachable'));

      const response = await callPOST(mockPaymentRequestBody);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });
});
