/**
 * Tests for ONEK-341: Deal Closure fixes (CL1, CL2, CL3)
 *
 * CL1: ClosedWonConfirmation rendering — already fixed by Task 4 (not re-tested here)
 * CL2: session_status not updated in DB after payment — must update requests table
 * CL3: confirm_payment must NOT auto-archive — status should be 'closed_won' not 'archived'
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ToolResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

/** Assert result has data and return it typed */
function expectData(result: ToolResult): Record<string, unknown> {
  expect(result.data).toBeDefined();
  return result.data!;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROPOSAL_ID = 'aaaaaaaa-1111-2222-3333-444444444444';
const REQUEST_ID = 'bbbbbbbb-1111-2222-3333-444444444444';
const CONTRACT_ID = 'cccccccc-1111-2222-3333-444444444444';
const ISO_AGENT_ID = 'dddddddd-1111-2222-3333-444444444444';

const mockProposal = {
  id: PROPOSAL_ID,
  proposal_number: 'PROP-2026-001',
  title: 'Charter Flight Proposal',
  request_id: REQUEST_ID,
  file_url: 'https://storage.example.com/proposal.pdf',
  file_name: 'proposal.pdf',
  file_size_bytes: 12345,
  total_amount: 50000,
  final_amount: 55000,
  status: 'sent',
  sent_to_name: 'John Smith',
  sent_to_email: 'john@example.com',
  sent_at: '2026-04-10T00:00:00.000Z',
  created_at: '2026-04-09T00:00:00.000Z',
};

const mockContract = {
  id: CONTRACT_ID,
  contract_number: 'CONTRACT-2026-001',
  status: 'signed',
  request_id: REQUEST_ID,
  proposal_id: PROPOSAL_ID,
  iso_agent_id: ISO_AGENT_ID,
  client_name: 'John Smith',
  client_email: 'john@example.com',
  departure_airport: 'KTEB',
  arrival_airport: 'KLAX',
  departure_date: '2026-04-15',
  total_amount: 55000,
  file_url: 'https://storage.example.com/contract.pdf',
  sent_at: '2026-04-11T00:00:00.000Z',
  created_at: '2026-04-10T00:00:00.000Z',
  // No payment_reference — payment not yet recorded
  payment_reference: null,
  payment_amount: null,
  payment_method: null,
  payment_date: null,
};

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetProposalsByRequest = vi.fn();
const mockGetContractByNumber = vi.fn();
const mockGetContractsByRequest = vi.fn();
const mockGetContractById = vi.fn();
const mockUpdateContractPayment = vi.fn();
const mockCompleteContract = vi.fn();

vi.mock('@/lib/services/proposal-service', () => ({
  createProposalWithResolution: vi.fn(),
  getProposalById: vi.fn(),
  getProposalsByRequest: (...args: unknown[]) => mockGetProposalsByRequest(...args),
  updateProposalSent: vi.fn(),
  updateProposalStatus: vi.fn(),
}));

vi.mock('@/lib/services/contract-service', () => ({
  getContractById: (...args: unknown[]) => mockGetContractById(...args),
  getContractByNumber: (...args: unknown[]) => mockGetContractByNumber(...args),
  getContractsByRequest: (...args: unknown[]) => mockGetContractsByRequest(...args),
  getContractsByProposal: vi.fn().mockResolvedValue([]),
  createContract: vi.fn(),
  updateContractGenerated: vi.fn(),
  updateContractSent: vi.fn(),
  updateContractStatus: vi.fn(),
  updateContractPayment: (...args: unknown[]) => mockUpdateContractPayment(...args),
  completeContract: (...args: unknown[]) => mockCompleteContract(...args),
}));

// Mock Supabase admin — supports both select chains and update chains
const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });
const mockLimit = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockOrder = vi.fn(() => ({ limit: mockLimit }));
const mockNot = vi.fn(() => ({ order: mockOrder }));
const mockEq = vi.fn((): Record<string, unknown> => ({
  eq: mockEq,
  single: mockSingle,
  select: mockSelect,
  not: mockNot,
}));
const mockSelect = vi.fn(() => ({ eq: mockEq, single: mockSingle }));
const mockUpdate = vi.fn((_data: Record<string, unknown>) => ({ eq: mockEq }));
const mockFrom = vi.fn((_table: string) => ({ select: mockSelect, update: mockUpdate }));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: (table: string) => mockFrom(table) },
  findRequestByTripId: vi.fn(),
  uploadContractPdf: vi.fn().mockResolvedValue({
    success: true,
    publicUrl: 'https://storage.example.com/contract.pdf',
    filePath: 'agent-123/contract.pdf',
    fileSizeBytes: 54321,
  }),
}));

vi.mock('@/lib/supabase/mcp-helpers', () => ({
  queryTable: vi.fn().mockResolvedValue({
    data: [{
      id: REQUEST_ID,
      departure_airport: 'KTEB',
      arrival_airport: 'KLAX',
      departure_date: '2026-04-15',
      aircraft_type: 'Heavy Jet',
      passengers: 6,
    }],
    error: null,
  }),
  insertRow: vi.fn().mockResolvedValue({ data: null, error: null }),
  updateRow: vi.fn().mockResolvedValue({ data: null, error: null }),
  countRows: vi.fn().mockResolvedValue({ count: 0, error: null }),
}));

vi.mock('@/lib/pdf', () => ({
  generateContract: vi.fn().mockResolvedValue({
    contractId: 'local-contract-123',
    contractNumber: '031526',
    pdfBuffer: Buffer.from('mock-pdf'),
    pdfBase64: 'bW9jay1wZGY=',
    fileName: 'Jetvision_Contract_KTEB_KLAX_2026-04-15.pdf',
    generatedAt: '2026-04-15T00:00:00.000Z',
    pricing: { flightCost: 50000, totalAmount: 55000, currency: 'USD' },
  }),
}));

vi.mock('@/agents/jetvision-agent/tools', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    getToolCategory: vi.fn((name: string) => {
      if (['send_email', 'send_proposal_email', 'prepare_proposal_email', 'send_quote_email'].includes(name)) {
        return 'gmail';
      }
      return 'database';
    }),
  };
});

// =============================================================================
// CL2: confirmPayment updates requests table with session_status: 'closed_won'
// =============================================================================

describe('ONEK-341 CL2: confirmPayment updates request session_status to closed_won', () => {
  let executor: {
    execute: (tool: string, params: Record<string, unknown>) => Promise<ToolResult>;
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default: contract exists, no prior payment
    mockGetContractById.mockResolvedValue(mockContract);
    mockUpdateContractPayment.mockResolvedValue({
      id: CONTRACT_ID,
      contract_number: 'CONTRACT-2026-001',
      status: 'paid',
      payment_reference: 'WIRE-12345',
      payment_amount: 55000,
      payment_received_at: new Date().toISOString(),
    });
    mockCompleteContract.mockResolvedValue({
      ...mockContract,
      status: 'completed',
    });

    // Enrichment: requests table lookup returns flight route
    mockSingle.mockResolvedValue({
      data: { departure_airport: 'KTEB', arrival_airport: 'KLAX' },
      error: null,
    });
    // Enrichment: proposals lookup
    mockGetProposalsByRequest.mockResolvedValue([mockProposal]);

    const { ToolExecutor } = await import('@/agents/jetvision-agent/tool-executor');
    // @ts-expect-error -- ToolExecutor constructor context type mismatch in tests
    executor = new ToolExecutor({
      sessionId: 'session-123',
      userId: 'user-456',
      isoAgentId: ISO_AGENT_ID,
      requestId: REQUEST_ID,
    });
  });

  it('should call supabaseAdmin.from("requests").update() after payment', async () => {
    const result = await executor.execute('confirm_payment', {
      contract_id: CONTRACT_ID,
      payment_amount: 55000,
      payment_method: 'wire',
      payment_reference: 'WIRE-12345',
    });

    expect(result.success).toBe(true);

    // Verify that from('requests') was called (for the update)
    const fromCalls = mockFrom.mock.calls.map((c: unknown[]) => c[0]);
    expect(fromCalls).toContain('requests');

    // Verify that update() was called with closed_won fields
    expect(mockUpdate).toHaveBeenCalled();
    const updateArg = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updateArg.status).toBe('closed_won');
    expect(updateArg.session_status).toBe('closed_won');
    expect(updateArg.current_step).toBe('closed_won');
    expect(updateArg.session_ended_at).toBeDefined();
    expect(updateArg.last_activity_at).toBeDefined();
  });

  it('should use context.requestId for the request status update', async () => {
    await executor.execute('confirm_payment', {
      contract_id: CONTRACT_ID,
      payment_amount: 55000,
      payment_method: 'wire',
      payment_reference: 'WIRE-12345',
    });

    // The eq chain should have been called with the request ID
    const eqCalls = mockEq.mock.calls.map((c: unknown[]) => c);
    const idEqCall = eqCalls.find(
      (c: unknown[]) => c[0] === 'id' && c[1] === REQUEST_ID,
    );
    expect(idEqCall).toBeDefined();
  });

  it('should set session_status to closed_won NOT archived (CL3)', async () => {
    await executor.execute('confirm_payment', {
      contract_id: CONTRACT_ID,
      payment_amount: 55000,
      payment_method: 'wire',
      payment_reference: 'WIRE-12345',
    });

    expect(mockUpdate).toHaveBeenCalled();
    const updateArg = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    // CL3: Must be 'closed_won', NOT 'archived'
    expect(updateArg.session_status).toBe('closed_won');
    expect(updateArg.session_status).not.toBe('archived');
    expect(updateArg.status).toBe('closed_won');
    expect(updateArg.status).not.toBe('archived');
  });

  it('should still succeed even when request status update fails (non-blocking)', async () => {
    // Make the update chain throw an error
    mockUpdate.mockImplementationOnce(() => {
      throw new Error('DB connection failed');
    });

    const result = await executor.execute('confirm_payment', {
      contract_id: CONTRACT_ID,
      payment_amount: 55000,
      payment_method: 'wire',
      payment_reference: 'WIRE-12345',
    });

    // Payment should still succeed
    expect(result.success).toBe(true);
    const data = expectData(result);
    expect(data.contractId).toBe(CONTRACT_ID);
    expect(data.paymentAmount).toBe(55000);
    expect(data.message).toContain('Payment');
  });

  it('should not update requests when it is a duplicate payment (already paid)', async () => {
    mockGetContractById.mockResolvedValue({
      ...mockContract,
      status: 'paid',
      payment_reference: 'WIRE-OLD',
      payment_amount: 55000,
      payment_method: 'wire',
      payment_date: '2026-04-12',
    });

    await executor.execute('confirm_payment', {
      contract_id: CONTRACT_ID,
      payment_amount: 55000,
      payment_method: 'wire',
      payment_reference: 'WIRE-12345',
    });

    // update() should NOT be called for duplicate payments
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

// =============================================================================
// CL2b: Enrichment fallback — use contract.request_id when context missing
// =============================================================================

describe('ONEK-341 CL2b: Request status update uses enrichmentRequestId fallback', () => {
  let executor: {
    execute: (tool: string, params: Record<string, unknown>) => Promise<ToolResult>;
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Contract has request_id FK even though context.requestId is missing
    mockGetContractById.mockResolvedValue(mockContract);
    mockUpdateContractPayment.mockResolvedValue({
      id: CONTRACT_ID,
      contract_number: 'CONTRACT-2026-001',
      status: 'paid',
      payment_reference: 'WIRE-12345',
      payment_amount: 55000,
      payment_received_at: new Date().toISOString(),
    });
    mockCompleteContract.mockResolvedValue({
      ...mockContract,
      status: 'completed',
    });

    // Enrichment: requests table lookup returns flight route
    mockSingle.mockResolvedValue({
      data: { departure_airport: 'KTEB', arrival_airport: 'KLAX' },
      error: null,
    });
    // Enrichment: proposals lookup
    mockGetProposalsByRequest.mockResolvedValue([mockProposal]);

    // Strategy 3 fallback — mock the Supabase chain for most-recent contract
    mockMaybeSingle.mockResolvedValue({ data: { id: CONTRACT_ID }, error: null });

    const { ToolExecutor } = await import('@/agents/jetvision-agent/tool-executor');
    // @ts-expect-error -- ToolExecutor constructor context type mismatch in tests
    executor = new ToolExecutor({
      sessionId: 'session-123',
      userId: 'user-456',
      isoAgentId: ISO_AGENT_ID,
      // NOTE: No requestId in context — should fall back to contract.request_id
    });
  });

  it('should use contract.request_id for status update when context.requestId missing', async () => {
    const result = await executor.execute('confirm_payment', {
      contract_id: CONTRACT_ID,
      payment_amount: 55000,
      payment_method: 'wire',
      payment_reference: 'WIRE-12345',
    });

    expect(result.success).toBe(true);

    // Should have called update with closed_won
    expect(mockUpdate).toHaveBeenCalled();
    const updateArg = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updateArg.session_status).toBe('closed_won');

    // The eq chain should include the contract's request_id as fallback
    const eqCalls = mockEq.mock.calls.map((c: unknown[]) => c);
    const idEqCall = eqCalls.find(
      (c: unknown[]) => c[0] === 'id' && c[1] === REQUEST_ID,
    );
    expect(idEqCall).toBeDefined();
  });

  it('should skip request status update when no requestId available at all', async () => {
    // Contract also has no request_id
    mockGetContractById.mockResolvedValue({
      ...mockContract,
      request_id: null,
    });

    const result = await executor.execute('confirm_payment', {
      contract_id: CONTRACT_ID,
      payment_amount: 55000,
      payment_method: 'wire',
      payment_reference: 'WIRE-12345',
    });

    expect(result.success).toBe(true);
    // update() should NOT be called — no request to update
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
