/**
 * Tests for ONEK-338: Contract pipeline fixes (C2-C8)
 *
 * C2+C6: generateContract returns contractSentData for UI card
 * C3: send_contract_email tool exists and works
 * C4: PDF generation integrated into generateContract
 * C7: update_contract_status tool exists and works
 * C8: Two-step flow: generate_contract (draft) → send_contract_email (sent)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectForcedTool } from '@/lib/prompts/jetvision-system-prompt';

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
};

const mockContract = {
  id: CONTRACT_ID,
  contract_number: 'CONTRACT-2026-001',
  status: 'draft',
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
};

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetProposalById = vi.fn();
const mockGetProposalsByRequest = vi.fn();
const mockGetContractByNumber = vi.fn();
const mockGetContractsByRequest = vi.fn();
const mockGetContractById = vi.fn();
const mockUpdateContractGenerated = vi.fn();
const mockUpdateContractSent = vi.fn();
const mockUpdateContractStatus = vi.fn();
const mockCreateContract = vi.fn();

vi.mock('@/lib/services/proposal-service', () => ({
  createProposalWithResolution: vi.fn(),
  getProposalById: (...args: unknown[]) => mockGetProposalById(...args),
  getProposalsByRequest: (...args: unknown[]) => mockGetProposalsByRequest(...args),
  updateProposalSent: vi.fn(),
  updateProposalStatus: vi.fn(),
}));

vi.mock('@/lib/services/contract-service', () => ({
  getContractById: (...args: unknown[]) => mockGetContractById(...args),
  getContractByNumber: (...args: unknown[]) => mockGetContractByNumber(...args),
  getContractsByRequest: (...args: unknown[]) => mockGetContractsByRequest(...args),
  getContractsByProposal: vi.fn().mockResolvedValue([]),
  createContract: (...args: unknown[]) => mockCreateContract(...args),
  updateContractGenerated: (...args: unknown[]) => mockUpdateContractGenerated(...args),
  updateContractSent: (...args: unknown[]) => mockUpdateContractSent(...args),
  updateContractStatus: (...args: unknown[]) => mockUpdateContractStatus(...args),
}));

// Mock Supabase admin
const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });
const mockEq = vi.fn(() => ({ eq: mockEq, single: mockSingle, select: mockSelect }));
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
// C2+C6: Forced-tool patterns for contract tools
// =============================================================================

describe('ONEK-338 C2+C6+C3+C7: Forced-tool patterns for contract tools', () => {
  describe('should route generate contract phrases to generate_contract', () => {
    const phrases = [
      'generate a contract',
      'create a contract',
      'draft a contract',
      'generate contract',
      'create contract for this booking',
    ];

    for (const phrase of phrases) {
      it(`"${phrase}" -> generate_contract`, () => {
        expect(detectForcedTool(phrase)).toBe('generate_contract');
      });
    }
  });

  describe('should route send contract phrases to send_contract_email', () => {
    const phrases = [
      'send the contract',
      'email the contract',
      'send contract to the client',
      'send contract to john@example.com',
    ];

    for (const phrase of phrases) {
      it(`"${phrase}" -> send_contract_email`, () => {
        expect(detectForcedTool(phrase)).toBe('send_contract_email');
      });
    }
  });

  describe('should route contract status phrases to update_contract_status', () => {
    const phrases = [
      'update contract status',
      'change the contract status',
      'customer has signed the contract',
      'cancel the contract',
    ];

    for (const phrase of phrases) {
      it(`"${phrase}" -> update_contract_status`, () => {
        expect(detectForcedTool(phrase)).toBe('update_contract_status');
      });
    }
  });
});

// =============================================================================
// C2+C6: generateContract returns contractSentData
// =============================================================================

describe('ONEK-338 C2+C6: generateContract returns enriched data', () => {
  // Test executor typed flexibly for assertion convenience
  let executor: { execute: (tool: string, params: Record<string, unknown>) => Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> };

  beforeEach(async () => {
    vi.clearAllMocks();

    mockGetProposalsByRequest.mockResolvedValue([mockProposal]);
    mockGetProposalById.mockResolvedValue(mockProposal);
    mockGetContractsByRequest.mockResolvedValue([]);
    mockCreateContract.mockResolvedValue({
      id: CONTRACT_ID,
      contract_number: 'CONTRACT-2026-001',
      status: 'draft',
      created_at: '2026-04-15T00:00:00.000Z',
    });
    mockUpdateContractGenerated.mockResolvedValue({
      id: CONTRACT_ID,
      contract_number: 'CONTRACT-2026-001',
      status: 'draft',
      file_url: 'https://storage.example.com/contract.pdf',
    });

    const { ToolExecutor } = await import('@/agents/jetvision-agent/tool-executor');
    // @ts-expect-error -- ToolExecutor.execute has broader return type than test assertions need
    executor = new ToolExecutor({
      sessionId: 'session-123',
      userId: 'user-456',
      isoAgentId: ISO_AGENT_ID,
      requestId: REQUEST_ID,
    });
  });

  it('should return customerName, customerEmail, flightRoute in generate_contract result', async () => {
    const result = await executor.execute('generate_contract', {
      proposal_id: PROPOSAL_ID,
      request_id: REQUEST_ID,
    });

    expect(result.success).toBe(true);
    const data = expectData(result);
    expect(data.customerName).toBe('John Smith');
    expect(result.data!.customerEmail).toBe('john@example.com');
    expect(result.data!.flightRoute).toContain('KTEB');
    expect(result.data!.flightRoute).toContain('KLAX');
    expect(result.data!.totalAmount).toBe(55000);
    expect(result.data!.currency).toBe('USD');
  });

  it('should return pdfUrl after PDF generation and upload', async () => {
    const result = await executor.execute('generate_contract', {
      proposal_id: PROPOSAL_ID,
      request_id: REQUEST_ID,
    });

    expect(result.success).toBe(true);
    expect(result.data!.pdfUrl).toBe('https://storage.example.com/contract.pdf');
  });

  it('should return enriched data for existing contract (duplicate guard)', async () => {
    mockGetContractsByRequest.mockResolvedValue([mockContract]);

    const result = await executor.execute('generate_contract', {
      proposal_id: PROPOSAL_ID,
      request_id: REQUEST_ID,
    });

    expect(result.success).toBe(true);
    expect(result.data!.customerName).toBe('John Smith');
    expect(result.data!.customerEmail).toBe('john@example.com');
    expect(result.data!.flightRoute).toContain('KTEB');
    expect(result.data!.totalAmount).toBe(55000);
    expect(result.data!.message).toContain('already exists');
  });

  it('should include draft status and send instruction in message', async () => {
    const result = await executor.execute('generate_contract', {
      proposal_id: PROPOSAL_ID,
      request_id: REQUEST_ID,
    });

    expect(result.success).toBe(true);
    expect(result.data!.status).toBe('draft');
    expect(result.data!.message).toContain('send_contract_email');
  });
});

// =============================================================================
// C3: send_contract_email tool
// =============================================================================

describe('ONEK-338 C3: send_contract_email tool', () => {
  // Test executor typed flexibly for assertion convenience
  let executor: { execute: (tool: string, params: Record<string, unknown>) => Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> };

  beforeEach(async () => {
    vi.clearAllMocks();

    mockGetContractById.mockResolvedValue(mockContract);
    mockUpdateContractSent.mockResolvedValue({
      id: CONTRACT_ID,
      contract_number: 'CONTRACT-2026-001',
      status: 'sent',
      sent_to_email: 'john@example.com',
      sent_at: '2026-04-15T00:00:00.000Z',
    });

    const { ToolExecutor } = await import('@/agents/jetvision-agent/tool-executor');
    // @ts-expect-error -- ToolExecutor.execute has broader return type than test assertions need
    executor = new ToolExecutor({
      sessionId: 'session-123',
      userId: 'user-456',
      isoAgentId: ISO_AGENT_ID,
      requestId: REQUEST_ID,
    });
  });

  it('should send contract email and update status to sent', async () => {
    const result = await executor.execute('send_contract_email', {
      contract_id: CONTRACT_ID,
    });

    expect(result.success).toBe(true);
    expect(result.data!.emailSent).toBe(true);
    expect(result.data!.status).toBe('sent');
    expect(result.data!.contractNumber).toBe('CONTRACT-2026-001');
    expect(result.data!.customerName).toBe('John Smith');
    expect(result.data!.customerEmail).toBe('john@example.com');
    expect(mockUpdateContractSent).toHaveBeenCalledWith(
      CONTRACT_ID,
      expect.objectContaining({ sent_to_email: 'john@example.com' })
    );
  });

  it('should auto-resolve contract_id from request context', async () => {
    mockGetContractsByRequest.mockResolvedValue([mockContract]);

    const result = await executor.execute('send_contract_email', {});

    expect(result.success).toBe(true);
    expect(result.data!.contractId).toBe(CONTRACT_ID);
  });

  it('should resolve contract by contract number', async () => {
    mockGetContractByNumber.mockResolvedValue(mockContract);

    const result = await executor.execute('send_contract_email', {
      contract_id: 'CONTRACT-2026-001',
    });

    expect(result.success).toBe(true);
    expect(mockGetContractByNumber).toHaveBeenCalledWith('CONTRACT-2026-001');
  });

  it('should use custom email and name when provided', async () => {
    const result = await executor.execute('send_contract_email', {
      contract_id: CONTRACT_ID,
      to_email: 'custom@example.com',
      to_name: 'Custom Name',
    });

    expect(result.success).toBe(true);
    expect(result.data!.customerEmail).toBe('custom@example.com');
    expect(result.data!.customerName).toBe('Custom Name');
  });

  it('should fail when contract not found', async () => {
    mockGetContractById.mockResolvedValue(null);
    mockGetContractsByRequest.mockResolvedValue([]);

    const result = await executor.execute('send_contract_email', {
      contract_id: CONTRACT_ID,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Contract not found');
  });
});

// =============================================================================
// C7: update_contract_status tool
// =============================================================================

describe('ONEK-338 C7: update_contract_status tool', () => {
  // Test executor typed flexibly for assertion convenience
  let executor: { execute: (tool: string, params: Record<string, unknown>) => Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> };

  beforeEach(async () => {
    vi.clearAllMocks();

    mockUpdateContractStatus.mockResolvedValue({
      ...mockContract,
      status: 'signed',
    });

    const { ToolExecutor } = await import('@/agents/jetvision-agent/tool-executor');
    // @ts-expect-error -- ToolExecutor.execute has broader return type than test assertions need
    executor = new ToolExecutor({
      sessionId: 'session-123',
      userId: 'user-456',
      isoAgentId: ISO_AGENT_ID,
      requestId: REQUEST_ID,
    });
  });

  it('should update contract status', async () => {
    const result = await executor.execute('update_contract_status', {
      contract_id: CONTRACT_ID,
      status: 'signed',
    });

    expect(result.success).toBe(true);
    expect(result.data!.status).toBe('signed');
    expect(mockUpdateContractStatus).toHaveBeenCalledWith(CONTRACT_ID, 'signed');
  });

  it('should auto-resolve contract_id from request context', async () => {
    mockGetContractsByRequest.mockResolvedValue([mockContract]);

    const result = await executor.execute('update_contract_status', {
      status: 'signed',
    });

    expect(result.success).toBe(true);
    expect(mockUpdateContractStatus).toHaveBeenCalledWith(CONTRACT_ID, 'signed');
  });

  it('should resolve contract by contract number', async () => {
    mockGetContractByNumber.mockResolvedValue(mockContract);

    const result = await executor.execute('update_contract_status', {
      contract_id: 'CONTRACT-2026-001',
      status: 'cancelled',
    });

    expect(result.success).toBe(true);
    expect(mockGetContractByNumber).toHaveBeenCalledWith('CONTRACT-2026-001');
  });

  it('should fail when status is not provided', async () => {
    const result = await executor.execute('update_contract_status', {
      contract_id: CONTRACT_ID,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('status is required');
  });
});

// =============================================================================
// C8: Two-step flow verification
// =============================================================================

describe('ONEK-338 C8: Two-step contract flow (draft → sent)', () => {
  // Test executor typed flexibly for assertion convenience
  let executor: { execute: (tool: string, params: Record<string, unknown>) => Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> };

  beforeEach(async () => {
    vi.clearAllMocks();

    mockGetProposalsByRequest.mockResolvedValue([mockProposal]);
    mockGetProposalById.mockResolvedValue(mockProposal);
    mockGetContractsByRequest.mockResolvedValue([]);
    mockCreateContract.mockResolvedValue({
      id: CONTRACT_ID,
      contract_number: 'CONTRACT-2026-001',
      status: 'draft',
      created_at: '2026-04-15T00:00:00.000Z',
    });
    mockUpdateContractGenerated.mockResolvedValue({
      id: CONTRACT_ID,
      contract_number: 'CONTRACT-2026-001',
      status: 'draft',
      file_url: 'https://storage.example.com/contract.pdf',
    });
    mockGetContractById.mockResolvedValue({
      ...mockContract,
      status: 'draft',
    });
    mockUpdateContractSent.mockResolvedValue({
      id: CONTRACT_ID,
      contract_number: 'CONTRACT-2026-001',
      status: 'sent',
      sent_to_email: 'john@example.com',
      sent_at: '2026-04-15T00:00:00.000Z',
    });

    const { ToolExecutor } = await import('@/agents/jetvision-agent/tool-executor');
    // @ts-expect-error -- ToolExecutor.execute has broader return type than test assertions need
    executor = new ToolExecutor({
      sessionId: 'session-123',
      userId: 'user-456',
      isoAgentId: ISO_AGENT_ID,
      requestId: REQUEST_ID,
    });
  });

  it('step 1: generate_contract creates draft with PDF', async () => {
    const result = await executor.execute('generate_contract', {
      proposal_id: PROPOSAL_ID,
      request_id: REQUEST_ID,
    });

    expect(result.success).toBe(true);
    expect(result.data!.status).toBe('draft');
    expect(result.data!.contractId).toBe(CONTRACT_ID);
    expect(result.data!.pdfUrl).toBeDefined();
  });

  it('step 2: send_contract_email sends email and updates to sent', async () => {
    const result = await executor.execute('send_contract_email', {
      contract_id: CONTRACT_ID,
    });

    expect(result.success).toBe(true);
    expect(result.data!.status).toBe('sent');
    expect(result.data!.emailSent).toBe(true);
    expect(mockUpdateContractSent).toHaveBeenCalled();
  });
});

// =============================================================================
// Tool definitions verification
// =============================================================================

describe('ONEK-338: Tool definitions exist', () => {
  it('should include send_contract_email in ALL_TOOLS', async () => {
    const { ALL_TOOLS } = await import('@/agents/jetvision-agent/tools');
    const tool = ALL_TOOLS.find(t => t.function.name === 'send_contract_email');
    expect(tool).toBeDefined();
    expect(tool?.function.description).toContain('Send');
    expect(tool?.function.description).toContain('contract');
  });

  it('should include update_contract_status in ALL_TOOLS', async () => {
    const { ALL_TOOLS } = await import('@/agents/jetvision-agent/tools');
    const tool = ALL_TOOLS.find(t => t.function.name === 'update_contract_status');
    expect(tool).toBeDefined();
    expect(tool?.function.description).toContain('Update');
    expect(tool?.function.description).toContain('status');
  });

  it('should map send_contract_email to database category', async () => {
    const { TOOL_CATEGORIES } = await import('@/agents/jetvision-agent/tools');
    expect(TOOL_CATEGORIES['send_contract_email']).toBe('database');
  });

  it('should map update_contract_status to database category', async () => {
    const { TOOL_CATEGORIES } = await import('@/agents/jetvision-agent/tools');
    expect(TOOL_CATEGORIES['update_contract_status']).toBe('database');
  });
});
