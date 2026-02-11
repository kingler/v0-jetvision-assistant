/**
 * @vitest-environment node
 */

/**
 * Contract Service Payment Function Tests
 *
 * Tests for updateContractPayment and completeContract.
 *
 * @see lib/services/contract-service.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ContractPaymentData } from '@/lib/types/contract';
import {
  MOCK_CONTRACT_ID,
  mockPaymentResult,
  mockCompletedContract,
} from '../../../fixtures/payment-test-data';

// =============================================================================
// MOCK SUPABASE CHAIN
// =============================================================================

const mockSingle = vi.fn();
const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
  findRequestByTripId: vi.fn(),
}));

// =============================================================================
// TESTS
// =============================================================================

describe('Contract Service - Payment Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chain defaults
    mockFrom.mockReturnValue({ update: mockUpdate });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ single: mockSingle });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ---------------------------------------------------------------------------
  // updateContractPayment
  // ---------------------------------------------------------------------------

  describe('updateContractPayment', () => {
    const paymentData: ContractPaymentData = {
      payment_reference: 'WT-2026-001',
      payment_amount: 45182.76,
      payment_date: '2026-02-10T12:00:00Z',
      payment_method: 'wire',
    };

    it('updates contract and returns payment result', async () => {
      mockSingle.mockResolvedValue({ data: mockPaymentResult, error: null });

      const { updateContractPayment } = await import('@/lib/services/contract-service');
      const result = await updateContractPayment(MOCK_CONTRACT_ID, paymentData);

      expect(result.id).toBe(MOCK_CONTRACT_ID);
      expect(result.contract_number).toBe('CONTRACT-2026-001');
      expect(result.status).toBe('paid');
      expect(result.payment_reference).toBe('WT-2026-001');
      expect(result.payment_amount).toBe(45182.76);
    });

    it('calls supabase update with status=paid and payment_received_at', async () => {
      mockSingle.mockResolvedValue({ data: mockPaymentResult, error: null });

      const { updateContractPayment } = await import('@/lib/services/contract-service');
      await updateContractPayment(MOCK_CONTRACT_ID, paymentData);

      expect(mockFrom).toHaveBeenCalledWith('contracts');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'paid',
          payment_reference: 'WT-2026-001',
          payment_amount: 45182.76,
          payment_received_at: expect.any(String),
        })
      );
      expect(mockEq).toHaveBeenCalledWith('id', MOCK_CONTRACT_ID);
    });

    it('passes cc_last_four when provided', async () => {
      mockSingle.mockResolvedValue({ data: mockPaymentResult, error: null });

      const { updateContractPayment } = await import('@/lib/services/contract-service');
      await updateContractPayment(MOCK_CONTRACT_ID, {
        ...paymentData,
        cc_last_four: '4242',
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          cc_last_four: '4242',
        })
      );
    });

    it('passes cc_last_four as null when not provided', async () => {
      mockSingle.mockResolvedValue({ data: mockPaymentResult, error: null });

      const { updateContractPayment } = await import('@/lib/services/contract-service');
      await updateContractPayment(MOCK_CONTRACT_ID, paymentData);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          cc_last_four: null,
        })
      );
    });

    it('throws on Supabase error', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Row not found', code: 'PGRST116' },
      });

      const { updateContractPayment } = await import('@/lib/services/contract-service');

      await expect(
        updateContractPayment(MOCK_CONTRACT_ID, paymentData)
      ).rejects.toThrow('Failed to update contract');
    });
  });

  // ---------------------------------------------------------------------------
  // completeContract
  // ---------------------------------------------------------------------------

  describe('completeContract', () => {
    it('updates status to completed with completed_at', async () => {
      mockSingle.mockResolvedValue({ data: mockCompletedContract, error: null });

      const { completeContract } = await import('@/lib/services/contract-service');
      await completeContract(MOCK_CONTRACT_ID);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          completed_at: expect.any(String),
          updated_at: expect.any(String),
        })
      );
    });

    it('returns full Contract (select *)', async () => {
      mockSingle.mockResolvedValue({ data: mockCompletedContract, error: null });

      const { completeContract } = await import('@/lib/services/contract-service');
      const result = await completeContract(MOCK_CONTRACT_ID);

      expect(result.id).toBe(MOCK_CONTRACT_ID);
      expect(result.status).toBe('completed');
      expect(result.completed_at).toBeDefined();
    });

    it('selects all columns', async () => {
      mockSingle.mockResolvedValue({ data: mockCompletedContract, error: null });

      const { completeContract } = await import('@/lib/services/contract-service');
      await completeContract(MOCK_CONTRACT_ID);

      expect(mockSelect).toHaveBeenCalledWith('*');
    });

    it('throws on Supabase error', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Connection refused', code: 'ECONNREFUSED' },
      });

      const { completeContract } = await import('@/lib/services/contract-service');

      await expect(completeContract(MOCK_CONTRACT_ID)).rejects.toThrow(
        'Failed to complete contract'
      );
    });
  });
});
