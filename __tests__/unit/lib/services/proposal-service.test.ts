/**
 * Unit tests for Proposal Service
 *
 * Tests CRUD operations, status transitions, and foreign key resolution
 * for the proposals table integration.
 *
 * @see lib/services/proposal-service.ts
 */

import { describe, it, expect, beforeEach, beforeAll, vi, type Mock } from 'vitest';
import {
  createProposal,
  getProposalById,
  getProposalByNumber,
  getProposalsByRequest,
  getProposalsByAgent,
  updateProposalGenerated,
  updateProposalSent,
  updateProposalStatus,
  incrementProposalViewCount,
  incrementProposalDownloadCount,
  findClientProfileByEmail,
  getRequestIdFromTripId,
  createProposalWithResolution,
} from '@/lib/services/proposal-service';
import type { CreateProposalInput, FileMetadata, EmailMetadata, ProposalStatus } from '@/lib/types/proposal';

// Mock supabase admin client
vi.mock('@/lib/supabase/admin', () => {
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockEq = vi.fn();
  const mockIlike = vi.fn();
  const mockLimit = vi.fn();
  const mockMaybeSingle = vi.fn();
  const mockSingle = vi.fn();
  const mockOrder = vi.fn();
  const mockRpc = vi.fn();

  // Chain methods
  mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle, order: mockOrder });
  mockInsert.mockReturnValue({ select: mockSelect });
  mockUpdate.mockReturnValue({ eq: mockEq });
  mockEq.mockReturnValue({
    eq: mockEq,
    select: mockSelect,
    single: mockSingle,
    ilike: mockIlike,
    order: mockOrder,
    limit: mockLimit,
  });
  mockIlike.mockReturnValue({ limit: mockLimit });
  mockLimit.mockReturnValue({ maybeSingle: mockMaybeSingle, single: mockSingle });
  mockOrder.mockReturnValue({ limit: mockLimit });
  mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  mockSingle.mockResolvedValue({ data: null, error: null });

  return {
    supabaseAdmin: {
      from: vi.fn((table: string) => ({
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
      })),
      rpc: mockRpc,
    },
    findRequestByTripId: vi.fn(),
    // Export mocks for test access
    __mocks: {
      mockSelect,
      mockInsert,
      mockUpdate,
      mockEq,
      mockIlike,
      mockLimit,
      mockMaybeSingle,
      mockSingle,
      mockOrder,
      mockRpc,
    },
  };
});

// Get the mocked module - initialized in beforeAll
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockedAdmin: any;

describe('Proposal Service', () => {
  beforeAll(async () => {
    mockedAdmin = vi.mocked(await import('@/lib/supabase/admin'));
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createProposal', () => {
    it('should create a proposal with auto-generated proposal number', async () => {
      const input: CreateProposalInput = {
        request_id: 'request-123',
        iso_agent_id: 'agent-456',
        title: 'Flight Proposal: KTEB → KLAX',
        file_name: 'proposal-JV-ABC123.pdf',
        file_url: 'https://storage.example.com/proposal.pdf',
      };

      const expectedResult = {
        id: 'proposal-uuid-789',
        proposal_number: 'PROP-2025-001',
        status: 'draft',
        created_at: '2025-01-26T12:00:00Z',
      };

      // Mock RPC for proposal number generation
      (mockedAdmin as any).__mocks.mockRpc.mockResolvedValueOnce({
        data: 'PROP-2025-001',
        error: null,
      });

      // Mock insert chain
      const mockSingleInsert = vi.fn().mockResolvedValueOnce({
        data: expectedResult,
        error: null,
      });
      const mockSelectInsert = vi.fn().mockReturnValue({ single: mockSingleInsert });
      const mockInsertFn = vi.fn().mockReturnValue({ select: mockSelectInsert });

      (mockedAdmin.supabaseAdmin.from as Mock).mockReturnValueOnce({
        insert: mockInsertFn,
      });
      (mockedAdmin.supabaseAdmin.rpc as Mock).mockResolvedValueOnce({
        data: 'PROP-2025-001',
        error: null,
      });

      // Re-mock the from call for insert
      (mockedAdmin.supabaseAdmin.from as Mock).mockImplementation(() => ({
        insert: mockInsertFn,
      }));

      const result = await createProposal(input);

      expect(result).toEqual({
        id: expectedResult.id,
        proposal_number: expectedResult.proposal_number,
        status: 'draft',
        created_at: expectedResult.created_at,
      });
    });

    it('should fallback to timestamp-based proposal number if RPC fails', async () => {
      const input: CreateProposalInput = {
        request_id: 'request-123',
        iso_agent_id: 'agent-456',
        title: 'Flight Proposal',
        file_name: 'proposal.pdf',
        file_url: 'https://storage.example.com/proposal.pdf',
      };

      // Mock RPC failure
      (mockedAdmin.supabaseAdmin.rpc as Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'Function not found' },
      });

      const mockSingleInsert = vi.fn().mockResolvedValueOnce({
        data: {
          id: 'proposal-uuid',
          proposal_number: expect.stringMatching(/^PROP-2025-/),
          status: 'draft',
          created_at: '2025-01-26T12:00:00Z',
        },
        error: null,
      });
      const mockSelectInsert = vi.fn().mockReturnValue({ single: mockSingleInsert });
      const mockInsertFn = vi.fn().mockReturnValue({ select: mockSelectInsert });

      (mockedAdmin.supabaseAdmin.from as Mock).mockImplementation(() => ({
        insert: mockInsertFn,
      }));

      // The function should still work with fallback
      await expect(createProposal(input)).resolves.toBeDefined();
    });
  });

  describe('getProposalById', () => {
    it('should return proposal when found', async () => {
      const expectedProposal = {
        id: 'proposal-123',
        proposal_number: 'PROP-2025-001',
        request_id: 'request-456',
        iso_agent_id: 'agent-789',
        status: 'sent',
        title: 'Flight Proposal',
        file_name: 'proposal.pdf',
        file_url: 'https://example.com/proposal.pdf',
        created_at: '2025-01-26T12:00:00Z',
      };

      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: expectedProposal,
        error: null,
      });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      (mockedAdmin.supabaseAdmin.from as Mock).mockReturnValueOnce({
        select: mockSelect,
      });

      const result = await getProposalById('proposal-123');

      expect(result).toEqual(expectedProposal);
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('id', 'proposal-123');
    });

    it('should return null when proposal not found', async () => {
      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'No rows returned' },
      });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      (mockedAdmin.supabaseAdmin.from as Mock).mockReturnValueOnce({
        select: mockSelect,
      });

      const result = await getProposalById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('getProposalByNumber', () => {
    it('should return proposal when found by number', async () => {
      const expectedProposal = {
        id: 'proposal-123',
        proposal_number: 'PROP-2025-001',
        status: 'draft',
      };

      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: expectedProposal,
        error: null,
      });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      (mockedAdmin.supabaseAdmin.from as Mock).mockReturnValueOnce({
        select: mockSelect,
      });

      const result = await getProposalByNumber('PROP-2025-001');

      expect(result).toEqual(expectedProposal);
      expect(mockEq).toHaveBeenCalledWith('proposal_number', 'PROP-2025-001');
    });
  });

  describe('getProposalsByRequest', () => {
    it('should return all proposals for a request', async () => {
      const expectedProposals = [
        { id: 'p1', proposal_number: 'PROP-2025-001', status: 'sent' },
        { id: 'p2', proposal_number: 'PROP-2025-002', status: 'draft' },
      ];

      const mockOrder = vi.fn().mockResolvedValueOnce({
        data: expectedProposals,
        error: null,
      });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      (mockedAdmin.supabaseAdmin.from as Mock).mockReturnValueOnce({
        select: mockSelect,
      });

      const result = await getProposalsByRequest('request-123');

      expect(result).toEqual(expectedProposals);
      expect(mockEq).toHaveBeenCalledWith('request_id', 'request-123');
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should return empty array when no proposals found', async () => {
      const mockOrder = vi.fn().mockResolvedValueOnce({
        data: null,
        error: null,
      });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      (mockedAdmin.supabaseAdmin.from as Mock).mockReturnValueOnce({
        select: mockSelect,
      });

      const result = await getProposalsByRequest('request-with-no-proposals');

      expect(result).toEqual([]);
    });
  });

  describe('getProposalsByAgent', () => {
    it('should return proposals for an agent with filters', async () => {
      const expectedProposals = [
        { id: 'p1', proposal_number: 'PROP-2025-001', status: 'sent' },
      ];

      // Build a proper chain mock that returns itself for chaining
      const mockQuery = {
        eq: vi.fn(),
        order: vi.fn(),
        limit: vi.fn(),
      };

      // Setup the chain: select -> eq -> order -> eq -> limit
      mockQuery.eq.mockReturnValue(mockQuery);
      mockQuery.order.mockReturnValue(mockQuery);
      mockQuery.limit.mockResolvedValue({
        data: expectedProposals,
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue(mockQuery);

      (mockedAdmin.supabaseAdmin.from as Mock).mockReturnValueOnce({
        select: mockSelect,
      });

      const result = await getProposalsByAgent('agent-123', { status: 'sent', limit: 10 });

      expect(result).toEqual(expectedProposals);
      expect(mockQuery.eq).toHaveBeenCalledWith('iso_agent_id', 'agent-123');
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'sent');
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('updateProposalGenerated', () => {
    it('should update proposal with file metadata and set status to generated', async () => {
      const fileData: FileMetadata = {
        file_name: 'proposal-updated.pdf',
        file_url: 'https://storage.example.com/updated.pdf',
        file_path: 'proposals/agent-123/proposal-updated.pdf',
        file_size_bytes: 125000,
      };

      const expectedResult = {
        id: 'proposal-123',
        proposal_number: 'PROP-2025-001',
        status: 'generated',
        file_url: fileData.file_url,
        generated_at: '2025-01-26T12:30:00Z',
      };

      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: expectedResult,
        error: null,
      });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

      (mockedAdmin.supabaseAdmin.from as Mock).mockReturnValueOnce({
        update: mockUpdate,
      });

      const result = await updateProposalGenerated('proposal-123', fileData);

      expect(result.status).toBe('generated');
      expect(result.file_url).toBe(fileData.file_url);
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        file_name: fileData.file_name,
        file_url: fileData.file_url,
        file_path: fileData.file_path,
        file_size_bytes: fileData.file_size_bytes,
        status: 'generated',
      }));
    });
  });

  describe('updateProposalSent', () => {
    it('should update proposal with email metadata and set status to sent', async () => {
      const emailData: EmailMetadata = {
        sent_to_email: 'customer@example.com',
        sent_to_name: 'John Doe',
        email_subject: 'Your Flight Proposal',
        email_body: 'Please find attached...',
        email_message_id: 'msg-abc123',
      };

      const expectedResult = {
        id: 'proposal-123',
        proposal_number: 'PROP-2025-001',
        status: 'sent',
        sent_to_email: emailData.sent_to_email,
        sent_at: '2025-01-26T13:00:00Z',
      };

      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: expectedResult,
        error: null,
      });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

      (mockedAdmin.supabaseAdmin.from as Mock).mockReturnValueOnce({
        update: mockUpdate,
      });

      const result = await updateProposalSent('proposal-123', emailData);

      expect(result.status).toBe('sent');
      expect(result.sent_to_email).toBe(emailData.sent_to_email);
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        sent_to_email: emailData.sent_to_email,
        sent_to_name: emailData.sent_to_name,
        email_subject: emailData.email_subject,
        email_body: emailData.email_body,
        email_message_id: emailData.email_message_id,
        status: 'sent',
      }));
    });
  });

  describe('updateProposalStatus', () => {
    const statusTimestampMap: Record<ProposalStatus, string | null> = {
      draft: null,
      generated: null,
      sent: null,
      viewed: 'viewed_at',
      accepted: 'accepted_at',
      rejected: 'rejected_at',
      expired: 'expired_at',
    };

    it.each(['viewed', 'accepted', 'rejected', 'expired'] as ProposalStatus[])(
      'should set %s timestamp when updating to %s status',
      async (status) => {
        const mockSingle = vi.fn().mockResolvedValueOnce({
          data: { id: 'proposal-123', status },
          error: null,
        });
        const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
        const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
        const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

        (mockedAdmin.supabaseAdmin.from as Mock).mockReturnValueOnce({
          update: mockUpdate,
        });

        await updateProposalStatus('proposal-123', status);

        const expectedTimestampField = statusTimestampMap[status];
        if (expectedTimestampField) {
          expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
              status,
              [expectedTimestampField]: expect.any(String),
            })
          );
        }
      }
    );
  });

  describe('incrementProposalViewCount', () => {
    it('should increment view count and update last_viewed_at', async () => {
      // First call: getProposalById
      const mockSingleGet = vi.fn().mockResolvedValueOnce({
        data: { id: 'proposal-123', view_count: 5, status: 'sent' },
        error: null,
      });
      const mockEqGet = vi.fn().mockReturnValue({ single: mockSingleGet });
      const mockSelectGet = vi.fn().mockReturnValue({ eq: mockEqGet });

      // Second call: update
      const mockSingleUpdate = vi.fn().mockResolvedValueOnce({
        data: { id: 'proposal-123', view_count: 6, status: 'viewed' },
        error: null,
      });
      const mockSelectUpdate = vi.fn().mockReturnValue({ single: mockSingleUpdate });
      const mockEqUpdate = vi.fn().mockReturnValue({ select: mockSelectUpdate });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqUpdate });

      (mockedAdmin.supabaseAdmin.from as Mock)
        .mockReturnValueOnce({ select: mockSelectGet })
        .mockReturnValueOnce({ update: mockUpdate });

      const result = await incrementProposalViewCount('proposal-123');

      expect(result.view_count).toBe(6);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          view_count: 6,
          last_viewed_at: expect.any(String),
          status: 'viewed',
          viewed_at: expect.any(String),
        })
      );
    });

    it('should throw error when proposal not found', async () => {
      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'No rows returned' },
      });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      (mockedAdmin.supabaseAdmin.from as Mock).mockReturnValueOnce({
        select: mockSelect,
      });

      await expect(incrementProposalViewCount('non-existent')).rejects.toThrow(
        'Proposal not found: non-existent'
      );
    });
  });

  describe('incrementProposalDownloadCount', () => {
    it('should increment download count and update last_downloaded_at', async () => {
      // First call: getProposalById
      const mockSingleGet = vi.fn().mockResolvedValueOnce({
        data: { id: 'proposal-123', download_count: 2, status: 'viewed' },
        error: null,
      });
      const mockEqGet = vi.fn().mockReturnValue({ single: mockSingleGet });
      const mockSelectGet = vi.fn().mockReturnValue({ eq: mockEqGet });

      // Second call: update
      const mockSingleUpdate = vi.fn().mockResolvedValueOnce({
        data: { id: 'proposal-123', download_count: 3 },
        error: null,
      });
      const mockSelectUpdate = vi.fn().mockReturnValue({ single: mockSingleUpdate });
      const mockEqUpdate = vi.fn().mockReturnValue({ select: mockSelectUpdate });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqUpdate });

      (mockedAdmin.supabaseAdmin.from as Mock)
        .mockReturnValueOnce({ select: mockSelectGet })
        .mockReturnValueOnce({ update: mockUpdate });

      const result = await incrementProposalDownloadCount('proposal-123');

      expect(result.download_count).toBe(3);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          download_count: 3,
          last_downloaded_at: expect.any(String),
        })
      );
    });
  });

  describe('findClientProfileByEmail', () => {
    it('should find client profile by email (case-insensitive)', async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValueOnce({
        data: { id: 'client-123' },
        error: null,
      });
      const mockLimit = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockIlike = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockEq = vi.fn().mockReturnValue({ ilike: mockIlike });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      (mockedAdmin.supabaseAdmin.from as Mock).mockReturnValueOnce({
        select: mockSelect,
      });

      const result = await findClientProfileByEmail('Customer@Example.COM', 'agent-456');

      expect(result).toBe('client-123');
      expect(mockIlike).toHaveBeenCalledWith('email', 'customer@example.com');
    });

    it('should return null when client profile not found', async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValueOnce({
        data: null,
        error: null,
      });
      const mockLimit = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockIlike = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockEq = vi.fn().mockReturnValue({ ilike: mockIlike });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      (mockedAdmin.supabaseAdmin.from as Mock).mockReturnValueOnce({
        select: mockSelect,
      });

      const result = await findClientProfileByEmail('unknown@example.com', 'agent-456');

      expect(result).toBeNull();
    });
  });

  describe('getRequestIdFromTripId', () => {
    it('should resolve request_id from trip_id', async () => {
      (mockedAdmin.findRequestByTripId as Mock).mockResolvedValueOnce({
        id: 'request-123',
        avinode_trip_id: 'atrip-64956150',
      });

      const result = await getRequestIdFromTripId('atrip-64956150', 'agent-456');

      expect(result).toBe('request-123');
      expect(mockedAdmin.findRequestByTripId).toHaveBeenCalledWith('atrip-64956150', 'agent-456');
    });

    it('should return null when request not found', async () => {
      (mockedAdmin.findRequestByTripId as Mock).mockResolvedValueOnce(null);

      const result = await getRequestIdFromTripId('non-existent-trip', 'agent-456');

      expect(result).toBeNull();
    });
  });

  describe('createProposalWithResolution', () => {
    it('should create proposal with resolved foreign keys', async () => {
      // Mock findRequestByTripId
      (mockedAdmin.findRequestByTripId as Mock).mockResolvedValueOnce({
        id: 'request-123',
      });

      // Mock findClientProfileByEmail (via supabaseAdmin.from)
      const mockMaybeSingle = vi.fn().mockResolvedValueOnce({
        data: { id: 'client-456' },
        error: null,
      });
      const mockLimit = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockIlike = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockEq = vi.fn().mockReturnValue({ ilike: mockIlike });
      const mockSelectClient = vi.fn().mockReturnValue({ eq: mockEq });

      // Mock RPC for proposal number
      (mockedAdmin.supabaseAdmin.rpc as Mock).mockResolvedValueOnce({
        data: 'PROP-2025-005',
        error: null,
      });

      // Mock insert
      const mockSingleInsert = vi.fn().mockResolvedValueOnce({
        data: {
          id: 'proposal-789',
          proposal_number: 'PROP-2025-005',
          status: 'draft',
          created_at: '2025-01-26T12:00:00Z',
        },
        error: null,
      });
      const mockSelectInsert = vi.fn().mockReturnValue({ single: mockSingleInsert });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelectInsert });

      (mockedAdmin.supabaseAdmin.from as Mock)
        .mockReturnValueOnce({ select: mockSelectClient }) // findClientProfileByEmail
        .mockReturnValueOnce({ insert: mockInsert }); // createProposal

      const result = await createProposalWithResolution(
        {
          iso_agent_id: 'agent-789',
          title: 'Flight Proposal: KTEB → KLAX',
          file_name: 'proposal.pdf',
          file_url: 'https://example.com/proposal.pdf',
        },
        'atrip-64956150',
        'customer@example.com'
      );

      expect(result).toBeDefined();
      expect(result?.proposal_number).toBe('PROP-2025-005');
    });

    it('should return null when request cannot be resolved', async () => {
      (mockedAdmin.findRequestByTripId as Mock).mockResolvedValueOnce(null);

      const result = await createProposalWithResolution(
        {
          iso_agent_id: 'agent-789',
          title: 'Flight Proposal',
          file_name: 'proposal.pdf',
          file_url: 'https://example.com/proposal.pdf',
        },
        'non-existent-trip',
        'customer@example.com'
      );

      expect(result).toBeNull();
    });

    it('should throw error when request_id is not provided and tripId is missing', async () => {
      await expect(
        createProposalWithResolution(
          {
            iso_agent_id: 'agent-789',
            title: 'Flight Proposal',
            file_name: 'proposal.pdf',
            file_url: 'https://example.com/proposal.pdf',
          },
          undefined, // no tripId
          'customer@example.com'
        )
      ).rejects.toThrow('request_id is required');
    });
  });
});
