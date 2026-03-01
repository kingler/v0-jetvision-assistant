/**
 * Tests for ONEK-322: confirm_payment tool non-UUID contract ID resolution
 *
 * Verifies that the confirmPayment method in ToolExecutor correctly resolves
 * local contract IDs (e.g., CONTRACT-MM7XPEY4-QADB) to database UUIDs.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase admin — needed for the iso_agent_id fallback query (strategy 3)
const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
const mockLimit = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockOrder = vi.fn(() => ({ limit: mockLimit }));
const mockNot = vi.fn(() => ({ order: mockOrder }));
const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });
const mockEq = vi.fn(() => ({ not: mockNot, limit: mockLimit, single: mockSingle, eq: mockEq, order: mockOrder }));
const mockOr = vi.fn(() => ({ limit: mockLimit }));
const mockSelect = vi.fn(() => ({ eq: mockEq, or: mockOr }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}));

// Mock contract service
const mockGetContractByNumber = vi.fn();
const mockGetContractsByRequest = vi.fn();
const mockGetContractById = vi.fn();
const mockUpdateContractPayment = vi.fn();
const mockCompleteContract = vi.fn();

vi.mock('@/lib/services/contract-service', () => ({
  getContractByNumber: (...args: unknown[]) => mockGetContractByNumber(...args),
  getContractsByRequest: (...args: unknown[]) => mockGetContractsByRequest(...args),
  getContractsByProposal: vi.fn().mockResolvedValue([]),
  getContractById: (...args: unknown[]) => mockGetContractById(...args),
  updateContractPayment: (...args: unknown[]) => mockUpdateContractPayment(...args),
  completeContract: (...args: unknown[]) => mockCompleteContract(...args),
}));

// Mock proposal service
vi.mock('@/lib/services/proposal-service', () => ({
  createProposalWithResolution: vi.fn(),
  getProposalById: vi.fn(),
  getProposalsByRequest: vi.fn().mockResolvedValue([]),
  updateProposalSent: vi.fn(),
  updateProposalStatus: vi.fn(),
}));

// Mock supabase mcp-helpers
vi.mock('@/lib/supabase/mcp-helpers', () => ({
  queryTable: vi.fn(),
  insertRow: vi.fn(),
  updateRow: vi.fn(),
  countRows: vi.fn(),
}));

// Mock the tools module for getToolCategory
vi.mock('@/agents/jetvision-agent/tools', () => ({
  getToolCategory: vi.fn((name: string) => {
    if (name === 'confirm_payment') return 'database';
    return 'unknown';
  }),
}));

const DB_UUID = '12345678-1234-1234-1234-123456789abc';
const LOCAL_CONTRACT_ID = 'CONTRACT-MM7XPEY4-QADB';
const REQUEST_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

describe('ONEK-322: confirmPayment non-UUID contract ID resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    // Default: payment succeeds when called with a valid UUID
    mockUpdateContractPayment.mockResolvedValue({
      id: DB_UUID,
      contract_number: 'CONTRACT-2026-005',
      payment_reference: 'PAY-001',
      payment_amount: 5000,
    });
    mockCompleteContract.mockResolvedValue({
      id: DB_UUID,
      contract_number: 'CONTRACT-2026-005',
      status: 'completed',
    });
    mockGetContractById.mockResolvedValue(null); // no duplicate payment
    mockGetContractsByRequest.mockResolvedValue([]);
  });

  describe('Strategy 1: getContractByNumber lookup', () => {
    it('should resolve a local CONTRACT-xxx ID via getContractByNumber', async () => {
      mockGetContractByNumber.mockResolvedValue({
        id: DB_UUID,
        contract_number: LOCAL_CONTRACT_ID,
        status: 'sent',
      });

      const { ToolExecutor } = await import(
        '@/agents/jetvision-agent/tool-executor'
      );

      const executor = new ToolExecutor({
        sessionId: 'test',
        requestId: REQUEST_ID,
        isoAgentId: 'agent-1',
        userId: 'user-1',
      });

      const result = await executor.execute('confirm_payment', {
        contract_id: LOCAL_CONTRACT_ID,
        payment_amount: 5000,
        payment_method: 'wire',
        payment_reference: 'PAY-001',
      });

      // getContractByNumber should be called with the local ID
      expect(mockGetContractByNumber).toHaveBeenCalledWith(LOCAL_CONTRACT_ID);

      // updateContractPayment should be called with the resolved DB UUID, not the local ID
      expect(mockUpdateContractPayment).toHaveBeenCalledWith(
        DB_UUID,
        expect.objectContaining({ payment_reference: 'PAY-001' }),
      );
    });
  });

  describe('Strategy 2: fallback to requestId context', () => {
    it('should resolve via getContractsByRequest when getContractByNumber returns null', async () => {
      mockGetContractByNumber.mockResolvedValue(null);

      mockGetContractsByRequest.mockResolvedValue([
        { id: DB_UUID, contract_number: 'CONTRACT-2026-005', status: 'sent' },
      ]);

      const { ToolExecutor } = await import(
        '@/agents/jetvision-agent/tool-executor'
      );

      const executor = new ToolExecutor({
        sessionId: 'test',
        requestId: REQUEST_ID,
        isoAgentId: 'agent-1',
        userId: 'user-1',
      });

      const result = await executor.execute('confirm_payment', {
        contract_id: LOCAL_CONTRACT_ID,
        payment_amount: 5000,
        payment_method: 'wire',
        payment_reference: 'PAY-001',
      });

      // Should have tried getContractByNumber first
      expect(mockGetContractByNumber).toHaveBeenCalledWith(LOCAL_CONTRACT_ID);

      // Then fallen back to getContractsByRequest
      expect(mockGetContractsByRequest).toHaveBeenCalledWith(REQUEST_ID);

      // And used the resolved UUID for payment
      expect(mockUpdateContractPayment).toHaveBeenCalledWith(
        DB_UUID,
        expect.objectContaining({ payment_reference: 'PAY-001' }),
      );
    });
  });

  describe('UUID passthrough', () => {
    it('should pass through a valid UUID without resolution', async () => {
      const { ToolExecutor } = await import(
        '@/agents/jetvision-agent/tool-executor'
      );

      const executor = new ToolExecutor({
        sessionId: 'test',
        requestId: REQUEST_ID,
        isoAgentId: 'agent-1',
        userId: 'user-1',
      });

      const result = await executor.execute('confirm_payment', {
        contract_id: DB_UUID,
        payment_amount: 5000,
        payment_method: 'wire',
        payment_reference: 'PAY-001',
      });

      // Should NOT call getContractByNumber for a valid UUID
      expect(mockGetContractByNumber).not.toHaveBeenCalled();

      // Should use the UUID directly
      expect(mockUpdateContractPayment).toHaveBeenCalledWith(
        DB_UUID,
        expect.objectContaining({ payment_reference: 'PAY-001' }),
      );
    });
  });
});
