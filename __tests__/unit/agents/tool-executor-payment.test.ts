/**
 * Tests for ONEK-340: Payment confirmation fixes (PM1, PM2)
 *
 * PM1: confirmPayment returns paymentConfirmationData & closedWonData nested objects
 * PM2: Partial payment validation (compare payment_amount to contract total)
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

// Mock Supabase admin — chains: from().select().eq().single()
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
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: () => mockFrom() },
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
// PM1: confirmPayment returns paymentConfirmationData & closedWonData
// =============================================================================

describe('ONEK-340 PM1: confirmPayment returns nested card data objects', () => {
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
    // @ts-expect-error -- ToolExecutor.execute has broader return type than test assertions need
    executor = new ToolExecutor({
      sessionId: 'session-123',
      userId: 'user-456',
      isoAgentId: ISO_AGENT_ID,
      requestId: REQUEST_ID,
    });
  });

  it('should return flat payment fields (contractId, paymentAmount, etc.)', async () => {
    const result = await executor.execute('confirm_payment', {
      contract_id: CONTRACT_ID,
      payment_amount: 55000,
      payment_method: 'wire',
      payment_reference: 'WIRE-12345',
    });

    expect(result.success).toBe(true);
    const data = expectData(result);
    expect(data.contractId).toBe(CONTRACT_ID);
    expect(data.contractNumber).toBe('CONTRACT-2026-001');
    expect(data.paymentAmount).toBe(55000);
    expect(data.paymentReference).toBe('WIRE-12345');
    expect(data.paymentMethod).toBe('wire');
    expect(data.currency).toBe('USD');
    expect(data.status).toBe('completed');
  });

  it('should return paymentConfirmationData nested object', async () => {
    const result = await executor.execute('confirm_payment', {
      contract_id: CONTRACT_ID,
      payment_amount: 55000,
      payment_method: 'wire',
      payment_reference: 'WIRE-12345',
    });

    expect(result.success).toBe(true);
    const data = expectData(result);
    const pcd = data.paymentConfirmationData as Record<string, unknown>;
    expect(pcd).toBeDefined();
    expect(pcd.contractId).toBe(CONTRACT_ID);
    expect(pcd.contractNumber).toBe('CONTRACT-2026-001');
    expect(pcd.paymentAmount).toBe(55000);
    expect(pcd.paymentMethod).toBe('wire');
    expect(pcd.paymentReference).toBe('WIRE-12345');
    expect(pcd.currency).toBe('USD');
    expect(pcd.paidAt).toBeDefined();
  });

  it('should return closedWonData nested object with enrichment', async () => {
    const result = await executor.execute('confirm_payment', {
      contract_id: CONTRACT_ID,
      payment_amount: 55000,
      payment_method: 'wire',
      payment_reference: 'WIRE-12345',
    });

    expect(result.success).toBe(true);
    const data = expectData(result);
    const cwd = data.closedWonData as Record<string, unknown>;
    expect(cwd).toBeDefined();
    expect(cwd.contractNumber).toBe('CONTRACT-2026-001');
    expect(cwd.customerName).toBe('John Smith');
    expect(cwd.flightRoute).toContain('KTEB');
    expect(cwd.flightRoute).toContain('KLAX');
    expect(cwd.dealValue).toBe(55000);
    expect(cwd.currency).toBe('USD');
    expect(cwd.proposalSentAt).toBeDefined();
    expect(cwd.contractSentAt).toBeDefined();
    expect(cwd.paymentReceivedAt).toBeDefined();
  });

  it('should return enrichment fields in flat data too', async () => {
    const result = await executor.execute('confirm_payment', {
      contract_id: CONTRACT_ID,
      payment_amount: 55000,
      payment_method: 'wire',
      payment_reference: 'WIRE-12345',
    });

    const data = expectData(result);
    expect(data.customerName).toBe('John Smith');
    expect(data.flightRoute).toContain('KTEB');
    expect(data.dealValue).toBe(55000);
  });

  it('should handle duplicate payment (already paid)', async () => {
    mockGetContractById.mockResolvedValue({
      ...mockContract,
      status: 'paid',
      payment_reference: 'WIRE-OLD',
      payment_amount: 55000,
      payment_method: 'wire',
      payment_date: '2026-04-12',
    });

    const result = await executor.execute('confirm_payment', {
      contract_id: CONTRACT_ID,
      payment_amount: 55000,
      payment_method: 'wire',
      payment_reference: 'WIRE-12345',
    });

    expect(result.success).toBe(true);
    const data = expectData(result);
    expect(data.message).toContain('already recorded');
    expect(data.paymentReference).toBe('WIRE-OLD');
    // Should NOT have called updateContractPayment
    expect(mockUpdateContractPayment).not.toHaveBeenCalled();
  });
});

// =============================================================================
// PM1b: Enrichment robustness — fallback requestId from contract
// =============================================================================

describe('ONEK-340 PM1b: Enrichment fallback when requestId context missing', () => {
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
    // @ts-expect-error -- ToolExecutor.execute has broader return type than test assertions need
    executor = new ToolExecutor({
      sessionId: 'session-123',
      userId: 'user-456',
      isoAgentId: ISO_AGENT_ID,
      // NOTE: No requestId in context
    });
  });

  it('should use contract.request_id for enrichment when context.requestId missing', async () => {
    const result = await executor.execute('confirm_payment', {
      contract_id: CONTRACT_ID,
      payment_amount: 55000,
      payment_method: 'wire',
      payment_reference: 'WIRE-12345',
    });

    expect(result.success).toBe(true);
    const data = expectData(result);
    // Should still have enrichment data via fallback to contract.request_id
    expect(data.customerName).toBe('John Smith');
    expect(data.flightRoute).toContain('KTEB');
  });
});

// =============================================================================
// PM2: Partial payment validation
// =============================================================================

describe('ONEK-340 PM2: Partial payment validation', () => {
  let executor: {
    execute: (tool: string, params: Record<string, unknown>) => Promise<ToolResult>;
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    mockGetContractById.mockResolvedValue(mockContract);
    mockUpdateContractPayment.mockResolvedValue({
      id: CONTRACT_ID,
      contract_number: 'CONTRACT-2026-001',
      status: 'paid',
      payment_reference: 'WIRE-PARTIAL',
      payment_amount: 20000,
      payment_received_at: new Date().toISOString(),
    });
    mockCompleteContract.mockResolvedValue({
      ...mockContract,
      status: 'completed',
    });

    // Enrichment mocks
    mockSingle.mockResolvedValue({
      data: { departure_airport: 'KTEB', arrival_airport: 'KLAX' },
      error: null,
    });
    mockGetProposalsByRequest.mockResolvedValue([mockProposal]);

    const { ToolExecutor } = await import('@/agents/jetvision-agent/tool-executor');
    // @ts-expect-error -- ToolExecutor.execute has broader return type than test assertions need
    executor = new ToolExecutor({
      sessionId: 'session-123',
      userId: 'user-456',
      isoAgentId: ISO_AGENT_ID,
      requestId: REQUEST_ID,
    });
  });

  it('should detect partial payment and include warning fields', async () => {
    const result = await executor.execute('confirm_payment', {
      contract_id: CONTRACT_ID,
      payment_amount: 20000,
      payment_method: 'wire',
      payment_reference: 'WIRE-PARTIAL',
    });

    expect(result.success).toBe(true);
    const data = expectData(result);
    expect(data.partial_payment).toBe(true);
    expect(data.remaining_balance).toBe(35000); // 55000 - 20000
    expect(data.message).toContain('partial');
  });

  it('should include partial payment info in paymentConfirmationData', async () => {
    const result = await executor.execute('confirm_payment', {
      contract_id: CONTRACT_ID,
      payment_amount: 20000,
      payment_method: 'wire',
      payment_reference: 'WIRE-PARTIAL',
    });

    const data = expectData(result);
    const pcd = data.paymentConfirmationData as Record<string, unknown>;
    expect(pcd).toBeDefined();
    expect(pcd.partial_payment).toBe(true);
    expect(pcd.remaining_balance).toBe(35000);
  });

  it('should include partial payment info in closedWonData', async () => {
    const result = await executor.execute('confirm_payment', {
      contract_id: CONTRACT_ID,
      payment_amount: 20000,
      payment_method: 'wire',
      payment_reference: 'WIRE-PARTIAL',
    });

    const data = expectData(result);
    const cwd = data.closedWonData as Record<string, unknown>;
    expect(cwd).toBeDefined();
    expect(cwd.partial_payment).toBe(true);
    expect(cwd.remaining_balance).toBe(35000);
  });

  it('should still process partial payment (not reject)', async () => {
    const result = await executor.execute('confirm_payment', {
      contract_id: CONTRACT_ID,
      payment_amount: 1000,
      payment_method: 'wire',
      payment_reference: 'WIRE-TINY',
    });

    expect(result.success).toBe(true);
    expect(mockUpdateContractPayment).toHaveBeenCalled();
    expect(mockCompleteContract).toHaveBeenCalled();
  });

  it('should NOT flag full payment as partial', async () => {
    mockUpdateContractPayment.mockResolvedValue({
      id: CONTRACT_ID,
      contract_number: 'CONTRACT-2026-001',
      status: 'paid',
      payment_reference: 'WIRE-FULL',
      payment_amount: 55000,
      payment_received_at: new Date().toISOString(),
    });

    const result = await executor.execute('confirm_payment', {
      contract_id: CONTRACT_ID,
      payment_amount: 55000,
      payment_method: 'wire',
      payment_reference: 'WIRE-FULL',
    });

    expect(result.success).toBe(true);
    const data = expectData(result);
    expect(data.partial_payment).toBeUndefined();
    expect(data.remaining_balance).toBeUndefined();
  });

  it('should NOT flag overpayment as partial', async () => {
    mockUpdateContractPayment.mockResolvedValue({
      id: CONTRACT_ID,
      contract_number: 'CONTRACT-2026-001',
      status: 'paid',
      payment_reference: 'WIRE-OVER',
      payment_amount: 60000,
      payment_received_at: new Date().toISOString(),
    });

    const result = await executor.execute('confirm_payment', {
      contract_id: CONTRACT_ID,
      payment_amount: 60000,
      payment_method: 'wire',
      payment_reference: 'WIRE-OVER',
    });

    expect(result.success).toBe(true);
    const data = expectData(result);
    expect(data.partial_payment).toBeUndefined();
    expect(data.remaining_balance).toBeUndefined();
  });
});

// =============================================================================
// Contract ID resolution for confirm_payment
// =============================================================================

describe('ONEK-340: Contract ID resolution strategies', () => {
  let executor: {
    execute: (tool: string, params: Record<string, unknown>) => Promise<ToolResult>;
  };

  beforeEach(async () => {
    vi.clearAllMocks();

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
    mockSingle.mockResolvedValue({
      data: { departure_airport: 'KTEB', arrival_airport: 'KLAX' },
      error: null,
    });
    mockGetProposalsByRequest.mockResolvedValue([mockProposal]);

    const { ToolExecutor } = await import('@/agents/jetvision-agent/tool-executor');
    // @ts-expect-error -- ToolExecutor.execute has broader return type than test assertions need
    executor = new ToolExecutor({
      sessionId: 'session-123',
      userId: 'user-456',
      isoAgentId: ISO_AGENT_ID,
      requestId: REQUEST_ID,
    });
  });

  it('should resolve contract by contract_number (Strategy 1)', async () => {
    mockGetContractByNumber.mockResolvedValue(mockContract);

    const result = await executor.execute('confirm_payment', {
      contract_id: 'CONTRACT-2026-001',
      payment_amount: 55000,
      payment_method: 'wire',
      payment_reference: 'WIRE-12345',
    });

    expect(result.success).toBe(true);
    expect(mockGetContractByNumber).toHaveBeenCalledWith('CONTRACT-2026-001');
  });

  it('should auto-resolve from request context (Strategy 2)', async () => {
    mockGetContractsByRequest.mockResolvedValue([mockContract]);

    const result = await executor.execute('confirm_payment', {
      payment_amount: 55000,
      payment_method: 'wire',
      payment_reference: 'WIRE-12345',
    });

    expect(result.success).toBe(true);
    expect(mockGetContractsByRequest).toHaveBeenCalledWith(REQUEST_ID);
  });

  it('should fail when required fields are missing', async () => {
    const result = await executor.execute('confirm_payment', {
      contract_id: CONTRACT_ID,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('required');
  });
});
