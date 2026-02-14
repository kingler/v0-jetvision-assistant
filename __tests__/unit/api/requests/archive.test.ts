/**
 * @vitest-environment node
 */

/**
 * Archive API Route Tests (ONEK-257 / ONEK-258 / ONEK-260)
 *
 * Tests for PATCH /api/requests archive action.
 * Verifies session_status, current_step, and session_ended_at
 * are properly set in the database when archiving.
 *
 * @see app/api/requests/route.ts (lines 706-761)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// =============================================================================
// MOCKS (hoisted)
// =============================================================================

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

const { mockSupabaseClient, mockSupabaseAdmin } = vi.hoisted(() => {
  const mockUpdate = vi.fn();
  const mockEq = vi.fn();
  const mockSelect = vi.fn();
  const mockSingle = vi.fn();

  return {
    mockSupabaseClient: { from: vi.fn() },
    mockSupabaseAdmin: {
      from: vi.fn(() => ({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            single: mockSingle,
          }),
        }),
        update: mockUpdate.mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      })),
      _mocks: { mockUpdate, mockEq, mockSelect, mockSingle },
    },
  };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabaseClient),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: mockSupabaseAdmin,
}));

vi.mock('@/lib/conversation/message-persistence', () => ({
  loadMessages: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/mcp/avinode-server', () => ({
  AvinodeMCPServer: vi.fn().mockImplementation(() => ({
    callTool: vi.fn(),
    isUsingMockMode: vi.fn().mockReturnValue(true),
  })),
}));

vi.mock('@agents/core', () => ({
  AgentFactory: {
    getInstance: vi.fn(() => ({
      createAndInitialize: vi.fn().mockResolvedValue({
        execute: vi.fn().mockResolvedValue({ success: true }),
      }),
    })),
  },
  AgentType: { ORCHESTRATOR: 'orchestrator' },
}));

import { auth } from '@clerk/nextjs/server';
import { PATCH } from '@/app/api/requests/route';

// =============================================================================
// HELPERS
// =============================================================================

function createPatchRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/requests', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function setupAuth(userId = 'user-123') {
  vi.mocked(auth).mockResolvedValue({
    userId,
    sessionId: 'sess-123',
    sessionClaims: null,
    actor: null,
    has: () => false,
    debug: () => null,
  } as any);
}

function setupRequestLookup(
  requestData: Record<string, unknown>,
  updateResult: { error: unknown } = { error: null }
) {
  const mockUpdateEq = vi.fn().mockResolvedValue(updateResult);
  const mockUpdateFn = vi.fn().mockReturnValue({ eq: mockUpdateEq });

  mockSupabaseAdmin.from.mockImplementation((table: string) => {
    if (table === 'iso_agents') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'agent-123', role: 'iso_agent' },
              error: null,
            }),
          }),
        }),
      };
    }
    // 'requests' table
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: requestData,
            error: null,
          }),
        }),
      }),
      update: mockUpdateFn,
    };
  });

  return { mockUpdateFn, mockUpdateEq };
}

// =============================================================================
// TESTS
// =============================================================================

describe('PATCH /api/requests - Archive Action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth(); // Sets Clerk auth mock
  });

  describe('session_status update (ONEK-260)', () => {
    it('should set session_status to "archived" when archiving a completed request', async () => {
      const { mockUpdateFn } = setupRequestLookup({
        id: 'req-123',
        status: 'completed',
        current_step: 'completed',
        metadata: {},
        iso_agent_id: 'agent-123',
      });

      const request = createPatchRequest({
        id: 'req-123',
        action: 'archive',
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Request archived successfully');

      // Verify session_status was set to 'archived'
      const updateCall = mockUpdateFn.mock.calls[0]?.[0];
      expect(updateCall).toHaveProperty('session_status', 'archived');
    });

    it('should set session_ended_at timestamp when archiving', async () => {
      const { mockUpdateFn } = setupRequestLookup({
        id: 'req-123',
        status: 'completed',
        current_step: 'completed',
        metadata: {},
        iso_agent_id: 'agent-123',
      });

      const request = createPatchRequest({
        id: 'req-123',
        action: 'archive',
      });

      await PATCH(request);

      const updateCall = mockUpdateFn.mock.calls[0]?.[0];
      expect(updateCall).toHaveProperty('session_ended_at');
      expect(updateCall.session_ended_at).toBeTruthy();
    });

    it('should set metadata.archived to true', async () => {
      const { mockUpdateFn } = setupRequestLookup({
        id: 'req-123',
        status: 'completed',
        current_step: 'completed',
        metadata: { some_key: 'some_value' },
        iso_agent_id: 'agent-123',
      });

      const request = createPatchRequest({
        id: 'req-123',
        action: 'archive',
      });

      await PATCH(request);

      const updateCall = mockUpdateFn.mock.calls[0]?.[0];
      expect(updateCall.metadata).toHaveProperty('archived', true);
      expect(updateCall.metadata).toHaveProperty('archived_at');
      // Preserve existing metadata
      expect(updateCall.metadata).toHaveProperty('some_key', 'some_value');
    });

    it('should set current_step to "closed_won" when provided', async () => {
      const { mockUpdateFn } = setupRequestLookup({
        id: 'req-123',
        status: 'completed',
        current_step: 'payment_pending',
        metadata: {},
        iso_agent_id: 'agent-123',
      });

      const request = createPatchRequest({
        id: 'req-123',
        action: 'archive',
        current_step: 'closed_won',
      });

      await PATCH(request);

      const updateCall = mockUpdateFn.mock.calls[0]?.[0];
      expect(updateCall).toHaveProperty('current_step', 'closed_won');
    });
  });

  describe('archive eligibility', () => {
    it('should allow archiving requests with current_step "closed_won"', async () => {
      setupRequestLookup({
        id: 'req-123',
        status: 'sending_proposal', // some non-completed status
        current_step: 'closed_won',
        metadata: {},
        iso_agent_id: 'agent-123',
      });

      const request = createPatchRequest({
        id: 'req-123',
        action: 'archive',
      });

      const response = await PATCH(request);
      expect(response.status).toBe(200);
    });

    it('should allow archiving requests with current_step "payment_pending"', async () => {
      setupRequestLookup({
        id: 'req-123',
        status: 'pending',
        current_step: 'payment_pending',
        metadata: {},
        iso_agent_id: 'agent-123',
      });

      const request = createPatchRequest({
        id: 'req-123',
        action: 'archive',
      });

      const response = await PATCH(request);
      expect(response.status).toBe(200);
    });

    it('should reject archiving requests with status "understanding_request"', async () => {
      setupRequestLookup({
        id: 'req-123',
        status: 'understanding_request',
        current_step: 'understanding_request',
        metadata: {},
        iso_agent_id: 'agent-123',
      });

      const request = createPatchRequest({
        id: 'req-123',
        action: 'archive',
      });

      const response = await PATCH(request);
      expect(response.status).toBe(400);
    });

    it('should return error message explaining allowed statuses for archive rejection', async () => {
      setupRequestLookup({
        id: 'req-123',
        status: 'requesting_quotes',
        current_step: 'requesting_quotes',
        metadata: {},
        iso_agent_id: 'agent-123',
      });

      const request = createPatchRequest({
        id: 'req-123',
        action: 'archive',
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(data.error).toBe('Cannot archive request');
      expect(data.message).toContain('completed');
    });
  });

  describe('database error handling', () => {
    it('should return 500 when database update fails', async () => {
      setupRequestLookup(
        {
          id: 'req-123',
          status: 'completed',
          current_step: 'completed',
          metadata: {},
          iso_agent_id: 'agent-123',
        },
        { error: { message: 'Connection timeout' } }
      );

      const request = createPatchRequest({
        id: 'req-123',
        action: 'archive',
      });

      const response = await PATCH(request);
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.error).toBe('Failed to archive request');
    });
  });
});
