/**
 * Tests for ONEK-339: Proposal flow fixes (P3, P6)
 *
 * P3: Forced-tool patterns route "send proposal" to prepare_proposal_email
 * P6: sendProposalEmail calls updateProposalSent and handles failures gracefully
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectForcedTool } from '@/lib/prompts/jetvision-system-prompt';

// ---------------------------------------------------------------------------
// Mocks for ToolExecutor (P6 tests)
// ---------------------------------------------------------------------------

const PROPOSAL_ID = 'aaaaaaaa-1111-2222-3333-444444444444';
const REQUEST_ID = 'bbbbbbbb-1111-2222-3333-444444444444';

const mockProposal = {
  id: PROPOSAL_ID,
  proposal_number: 'PROP-2026-001',
  title: 'Charter Flight Proposal',
  request_id: REQUEST_ID,
  file_url: 'https://storage.example.com/proposal.pdf',
  file_name: 'proposal.pdf',
  file_size_bytes: 12345,
  total_amount: 50000,
  final_amount: 50000,
  status: 'draft',
};

// Mock proposal-service
const mockGetProposalById = vi.fn();
const mockUpdateProposalSent = vi.fn();

vi.mock('@/lib/services/proposal-service', () => ({
  createProposalWithResolution: vi.fn(),
  getProposalById: (...args: unknown[]) => mockGetProposalById(...args),
  getProposalsByRequest: vi.fn().mockResolvedValue([]),
  updateProposalSent: (...args: unknown[]) => mockUpdateProposalSent(...args),
  updateProposalStatus: vi.fn(),
}));

// Mock contract-service
vi.mock('@/lib/services/contract-service', () => ({
  getContractByNumber: vi.fn(),
  getContractsByRequest: vi.fn().mockResolvedValue([]),
  getContractsByProposal: vi.fn().mockResolvedValue([]),
}));

// Mock Supabase admin
const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });
const mockEq = vi.fn(() => ({ eq: mockEq, single: mockSingle, select: mockSelect }));
const mockSelect = vi.fn(() => ({ eq: mockEq, single: mockSingle }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: () => mockFrom() },
  findRequestByTripId: vi.fn(),
}));

// Mock supabase mcp-helpers
vi.mock('@/lib/supabase/mcp-helpers', () => ({
  queryTable: vi.fn().mockResolvedValue({ data: [], error: null }),
  insertRow: vi.fn().mockResolvedValue({ data: null, error: null }),
  updateRow: vi.fn().mockResolvedValue({ data: null, error: null }),
  countRows: vi.fn().mockResolvedValue({ count: 0, error: null }),
}));

// Mock tools module
vi.mock('@/agents/jetvision-agent/tools', () => ({
  getToolCategory: vi.fn((name: string) => {
    if (['send_proposal_email', 'prepare_proposal_email', 'send_email', 'send_quote_email'].includes(name)) {
      return 'gmail';
    }
    return 'database';
  }),
}));

// =============================================================================
// P3: Forced-tool pattern tests
// =============================================================================

describe('ONEK-339 P3: Forced-tool patterns for proposal emails', () => {
  describe('should route to prepare_proposal_email (approval flow)', () => {
    const preparePhrases = [
      'send proposal to client',
      'send the proposal',
      'email the proposal',
      'send proposal email',
      'send a proposal to John',
      'email this proposal',
      'send that proposal',
      'prepare proposal email',
      'draft a proposal email',
      'generate proposal email',
      'create a proposal email',
      'email proposal to john@example.com',
      'send the proposal email to the client',
      'send proposal for review',
      'send proposal',
      'email proposal',
      'Can you send the proposal?',
      'Please send proposal to the customer',
    ];

    for (const phrase of preparePhrases) {
      it(`"${phrase}" -> prepare_proposal_email`, () => {
        expect(detectForcedTool(phrase)).toBe('prepare_proposal_email');
      });
    }
  });

  describe('should route to send_proposal_email (bypass review) ONLY for explicit bypass phrases', () => {
    const bypassPhrases = [
      'send proposal immediately',
      'send the proposal right away',
      'send proposal without review',
      'send the proposal without preview',
      'skip review and send proposal',
      'skip the preview for proposal',
      'skip approval for the proposal',
    ];

    for (const phrase of bypassPhrases) {
      it(`"${phrase}" -> send_proposal_email`, () => {
        expect(detectForcedTool(phrase)).toBe('send_proposal_email');
      });
    }
  });

  describe('should NOT route "send proposal now" to send_proposal_email (ambiguous)', () => {
    it('"send proposal now" -> prepare_proposal_email (not bypass)', () => {
      // "now" is ambiguous — user may mean "do it now" not "skip review"
      const result = detectForcedTool('send proposal now');
      expect(result).not.toBe('send_proposal_email');
      // Should be routed to prepare flow instead
      expect(result).toBe('prepare_proposal_email');
    });
  });

  describe('should NOT match proposal creation patterns', () => {
    it('"create a proposal" -> create_proposal (not email)', () => {
      expect(detectForcedTool('create a proposal')).toBe('create_proposal');
    });

    it('"generate a proposal" -> create_proposal (not email)', () => {
      expect(detectForcedTool('generate a proposal')).toBe('create_proposal');
    });
  });
});

// =============================================================================
// P6: sendProposalEmail status update tests
// =============================================================================

describe('ONEK-339 P6: sendProposalEmail status update', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let executor: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default mocks
    mockGetProposalById.mockResolvedValue(mockProposal);
    mockUpdateProposalSent.mockResolvedValue({
      id: PROPOSAL_ID,
      proposal_number: 'PROP-2026-001',
      status: 'sent',
      sent_to_email: 'client@example.com',
      sent_at: '2026-03-02T12:00:00Z',
    });

    // Request lookup returns null (no request found — acceptable for email send)
    mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle });
    mockSingle.mockResolvedValue({ data: null, error: null });

    // Import ToolExecutor fresh (after mocks are set up)
    const { ToolExecutor } = await import('@/agents/jetvision-agent/tool-executor');
    executor = new ToolExecutor({
      sessionId: 'test-session',
      userId: 'test-user',
      isoAgentId: 'test-agent',
    });

    // Set up a mock Gmail MCP that "sends" emails
    executor.setGmailMCP({
      sendEmail: vi.fn().mockResolvedValue({
        messageId: 'msg-12345',
        threadId: 'thread-67890',
      }),
    });
  });

  it('should call updateProposalSent after email is sent', async () => {
    const result = await executor.execute('send_proposal_email', {
      proposal_id: PROPOSAL_ID,
      to_email: 'client@example.com',
      to_name: 'Jane Doe',
    });

    expect(result.success).toBe(true);
    expect(mockUpdateProposalSent).toHaveBeenCalledTimes(1);
    expect(mockUpdateProposalSent).toHaveBeenCalledWith(PROPOSAL_ID, {
      sent_to_email: 'client@example.com',
      sent_to_name: 'Jane Doe',
      email_subject: expect.stringContaining('Charter Flight Proposal'),
      email_body: expect.any(String),
      email_message_id: 'msg-12345',
    });
    expect(result.data).toMatchObject({
      message_id: 'msg-12345',
      proposal_number: 'PROP-2026-001',
      status_updated: true,
    });
  });

  it('should still succeed if updateProposalSent throws (email already sent)', async () => {
    mockUpdateProposalSent.mockRejectedValue(
      new Error('Database connection failed')
    );

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await executor.execute('send_proposal_email', {
      proposal_id: PROPOSAL_ID,
      to_email: 'client@example.com',
      to_name: 'Jane Doe',
    });

    // Email was sent — overall result should be success
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      message_id: 'msg-12345',
      status_updated: false,
    });

    // Should log the failure prominently
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('CRITICAL'),
      expect.stringContaining('Proposal'),
      PROPOSAL_ID,
      expect.stringContaining('remains in previous status'),
      expect.stringContaining('Error'),
      'Database connection failed',
    );

    consoleSpy.mockRestore();
  });

  it('should use default name "Customer" when to_name is missing', async () => {
    const result = await executor.execute('send_proposal_email', {
      proposal_id: PROPOSAL_ID,
      to_email: 'client@example.com',
    });

    expect(result.success).toBe(true);
    expect(mockUpdateProposalSent).toHaveBeenCalledWith(
      PROPOSAL_ID,
      expect.objectContaining({
        sent_to_name: 'Customer',
      })
    );
  });

  it('should throw when proposal is not found', async () => {
    mockGetProposalById.mockResolvedValue(null);

    const result = await executor.execute('send_proposal_email', {
      proposal_id: 'nonexistent-id',
      to_email: 'client@example.com',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Proposal not found');
    expect(mockUpdateProposalSent).not.toHaveBeenCalled();
  });

  it('should return status_updated=true on successful update', async () => {
    const result = await executor.execute('send_proposal_email', {
      proposal_id: PROPOSAL_ID,
      to_email: 'client@example.com',
      to_name: 'Client',
    });

    expect(result.success).toBe(true);
    expect(result.data?.status_updated).toBe(true);
    expect(result.data?.sent_at).toBe('2026-03-02T12:00:00Z');
  });
});
