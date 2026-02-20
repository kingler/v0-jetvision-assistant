/**
 * Tests for Reply Polling Service (ONEK-232)
 *
 * @see lib/services/reply-polling-service.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before imports
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// Mock inbox monitor
const mockCheckForCustomerReplies = vi.fn();
vi.mock('@/lib/services/inbox-monitor', () => ({
  checkForCustomerReplies: (...args: unknown[]) =>
    mockCheckForCustomerReplies(...args),
}));

// Mock message persistence
const mockSaveMessage = vi.fn();
vi.mock('@/lib/conversation/message-persistence', () => ({
  saveMessage: (...args: unknown[]) => mockSaveMessage(...args),
}));

import {
  getPendingProposals,
  checkAndRecordReply,
  pollForReplies,
  checkSingleReply,
} from '@/lib/services/reply-polling-service';

describe('Reply Polling Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // getPendingProposals
  // ---------------------------------------------------------------------------
  describe('getPendingProposals', () => {
    it('returns proposals from database', async () => {
      const mockData = [
        {
          id: 'prop-1',
          request_id: 'req-1',
          sent_at: '2026-02-18T10:00:00Z',
          sent_to_email: 'john@example.com',
          sent_to_name: 'John Doe',
          email_message_id: 'thread-1',
          metadata: null,
          status: 'sent',
        },
        {
          id: 'prop-2',
          request_id: 'req-2',
          sent_at: '2026-02-19T14:00:00Z',
          sent_to_email: 'jane@example.com',
          sent_to_name: null,
          email_message_id: null,
          metadata: null,
          status: 'sent',
        },
      ];

      // Build a chainable mock
      const chain = {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      };
      mockFrom.mockReturnValue(chain);

      const results = await getPendingProposals();

      expect(mockFrom).toHaveBeenCalledWith('proposals');
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        requestId: 'req-1',
        proposalId: 'prop-1',
        customerEmail: 'john@example.com',
        proposalSentAt: '2026-02-18T10:00:00Z',
        threadId: 'thread-1',
        customerName: 'John Doe',
      });
      expect(results[1]).toEqual({
        requestId: 'req-2',
        proposalId: 'prop-2',
        customerEmail: 'jane@example.com',
        proposalSentAt: '2026-02-19T14:00:00Z',
        threadId: undefined,
        customerName: undefined,
      });
    });

    it('filters out proposals with reply already detected in metadata', async () => {
      const mockData = [
        {
          id: 'prop-1',
          request_id: 'req-1',
          sent_at: '2026-02-18T10:00:00Z',
          sent_to_email: 'a@test.com',
          sent_to_name: null,
          email_message_id: null,
          metadata: { reply_detected_at: '2026-02-19T08:00:00Z' },
          status: 'sent',
        },
        {
          id: 'prop-2',
          request_id: 'req-2',
          sent_at: '2026-02-19T14:00:00Z',
          sent_to_email: 'b@test.com',
          sent_to_name: null,
          email_message_id: null,
          metadata: null,
          status: 'sent',
        },
      ];

      const chain = {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      };
      mockFrom.mockReturnValue(chain);

      const results = await getPendingProposals();

      // Should filter out the one with reply_detected_at
      expect(results).toHaveLength(1);
      expect(results[0].proposalId).toBe('prop-2');
    });

    it('returns empty array when no proposals', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      mockFrom.mockReturnValue(chain);

      const results = await getPendingProposals();
      expect(results).toHaveLength(0);
    });

    it('throws on database error', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'DB error' },
        }),
      };
      mockFrom.mockReturnValue(chain);

      await expect(getPendingProposals()).rejects.toThrow(
        'Failed to fetch pending proposals'
      );
    });
  });

  // ---------------------------------------------------------------------------
  // checkAndRecordReply
  // ---------------------------------------------------------------------------
  describe('checkAndRecordReply', () => {
    const proposal = {
      requestId: 'req-1',
      proposalId: 'prop-1',
      customerEmail: 'john@example.com',
      proposalSentAt: '2026-02-18T10:00:00Z',
      customerName: 'John Doe',
    };

    it('returns hasReply: false when no reply found', async () => {
      mockCheckForCustomerReplies.mockResolvedValue({ hasReply: false });

      const result = await checkAndRecordReply(proposal);

      expect(result.hasReply).toBe(false);
      expect(mockSaveMessage).not.toHaveBeenCalled();
    });

    it('saves message and updates proposal+request when reply found', async () => {
      mockCheckForCustomerReplies.mockResolvedValue({
        hasReply: true,
        replySnippet: 'Looks great, let me review the pricing.',
        replyDate: '2026-02-19T08:30:00Z',
      });
      mockSaveMessage.mockResolvedValue('msg-1');

      const updateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      mockFrom.mockReturnValue(updateChain);

      const result = await checkAndRecordReply(proposal);

      expect(result.hasReply).toBe(true);
      expect(result.replySnippet).toBe(
        'Looks great, let me review the pricing.'
      );
      expect(result.replyDate).toBe('2026-02-19T08:30:00Z');
      expect(result.messageId).toBe('msg-1');

      // Verify message was saved
      expect(mockSaveMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'req-1',
          senderType: 'system',
          senderName: 'Email Monitor',
          contentType: 'text',
        })
      );

      // Verify proposals table was updated first, then requests
      expect(mockFrom).toHaveBeenCalledWith('proposals');
      expect(mockFrom).toHaveBeenCalledWith('requests');
    });

    it('handles errors gracefully', async () => {
      mockCheckForCustomerReplies.mockRejectedValue(
        new Error('Gmail MCP unreachable')
      );

      const result = await checkAndRecordReply(proposal);

      expect(result.hasReply).toBe(false);
      expect(result.error).toBe('Gmail MCP unreachable');
    });
  });

  // ---------------------------------------------------------------------------
  // pollForReplies
  // ---------------------------------------------------------------------------
  describe('pollForReplies', () => {
    it('returns zero results when no proposals pending', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      mockFrom.mockReturnValue(chain);

      const result = await pollForReplies();

      expect(result.checked).toBe(0);
      expect(result.repliesFound).toBe(0);
      expect(result.errors).toBe(0);
    });

    it('checks all proposals and aggregates results', async () => {
      const mockData = [
        {
          id: 'prop-1',
          request_id: 'req-1',
          sent_at: '2026-02-18T10:00:00Z',
          sent_to_email: 'a@test.com',
          sent_to_name: null,
          email_message_id: null,
          metadata: null,
          status: 'sent',
        },
        {
          id: 'prop-2',
          request_id: 'req-2',
          sent_at: '2026-02-19T10:00:00Z',
          sent_to_email: 'b@test.com',
          sent_to_name: null,
          email_message_id: null,
          metadata: null,
          status: 'sent',
        },
      ];

      // First call: getPendingProposals (select chain)
      const selectChain = {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      };

      // Update calls for found replies
      const updateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      mockFrom
        .mockReturnValueOnce(selectChain) // getPendingProposals
        .mockReturnValue(updateChain); // update calls

      // First proposal: no reply, second: reply found
      mockCheckForCustomerReplies
        .mockResolvedValueOnce({ hasReply: false })
        .mockResolvedValueOnce({
          hasReply: true,
          replySnippet: 'Interested!',
          replyDate: '2026-02-20T10:00:00Z',
        });

      mockSaveMessage.mockResolvedValue('msg-2');

      const result = await pollForReplies();

      expect(result.checked).toBe(2);
      expect(result.repliesFound).toBe(1);
      expect(result.errors).toBe(0);
      expect(result.results).toHaveLength(2);
    });
  });

  // ---------------------------------------------------------------------------
  // checkSingleReply
  // ---------------------------------------------------------------------------
  describe('checkSingleReply', () => {
    it('returns null when no proposal found for request', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      };
      mockFrom.mockReturnValue(chain);

      const result = await checkSingleReply('nonexistent');
      expect(result).toBeNull();
    });

    it('returns cached result when reply already detected in metadata', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'prop-1',
            request_id: 'req-1',
            sent_at: '2026-02-18T10:00:00Z',
            sent_to_email: 'a@test.com',
            sent_to_name: null,
            email_message_id: null,
            metadata: { reply_detected_at: '2026-02-19T08:00:00Z' },
          },
          error: null,
        }),
      };
      mockFrom.mockReturnValue(chain);

      const result = await checkSingleReply('req-1');

      expect(result).toEqual({
        requestId: 'req-1',
        customerEmail: 'a@test.com',
        hasReply: true,
        replyDate: '2026-02-19T08:00:00Z',
      });
      // Should NOT call Gmail — cached result
      expect(mockCheckForCustomerReplies).not.toHaveBeenCalled();
    });

    it('checks Gmail when no reply detected yet', async () => {
      const selectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'prop-1',
            request_id: 'req-1',
            sent_at: '2026-02-18T10:00:00Z',
            sent_to_email: 'a@test.com',
            sent_to_name: 'Alice',
            email_message_id: null,
            metadata: null,
          },
          error: null,
        }),
      };

      const updateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      mockFrom
        .mockReturnValueOnce(selectChain)
        .mockReturnValue(updateChain);

      mockCheckForCustomerReplies.mockResolvedValue({
        hasReply: true,
        replySnippet: 'Let me check with my team.',
        replyDate: '2026-02-19T15:00:00Z',
      });
      mockSaveMessage.mockResolvedValue('msg-3');

      const result = await checkSingleReply('req-1');

      expect(result?.hasReply).toBe(true);
      expect(result?.replySnippet).toBe('Let me check with my team.');
      expect(mockCheckForCustomerReplies).toHaveBeenCalledWith({
        customerEmail: 'a@test.com',
        afterDate: '2026-02-18T10:00:00Z',
        threadId: undefined,
      });
    });
  });
});
