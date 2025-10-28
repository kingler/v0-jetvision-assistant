/**
 * Tests for /api/workflows route
 *
 * Tests GET endpoint for retrieving workflow states.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/workflows/route';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase/client';

describe('GET /api/workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null, sessionId: null, sessionClaims: null, actor: null, has: () => false, debug: () => null });

    const request = new NextRequest('http://localhost:3000/api/workflows');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return all workflow states for authenticated user', async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: 'user-123',
      sessionId: 'session-123',
      sessionClaims: null,
      actor: null,
      has: () => true,
      debug: () => null
    });

    const mockWorkflows = [
      {
        id: 'workflow-1',
        request_id: 'req-1',
        current_state: 'analyzing',
        metadata: {
          startedAt: '2025-10-22T10:00:00Z',
          currentAgent: 'orchestrator',
        },
        created_at: '2025-10-22T10:00:00Z',
        updated_at: '2025-10-22T10:00:30Z',
      },
      {
        id: 'workflow-2',
        request_id: 'req-2',
        current_state: 'completed',
        metadata: {
          startedAt: '2025-10-21T15:00:00Z',
          completedAt: '2025-10-21T15:30:00Z',
          duration: 1800000,
        },
        created_at: '2025-10-21T15:00:00Z',
        updated_at: '2025-10-21T15:30:00Z',
      },
    ];

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'user-123' },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'workflow_history') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockWorkflows,
                error: null,
              }),
            }),
          }),
        };
      }
    });
    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/workflows');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.workflow_history).toHaveLength(2);
    expect(data.workflow_history[0].current_state).toBe('analyzing');
    expect(data.workflow_history[1].current_state).toBe('completed');
  });

  it('should filter workflows by request_id', async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: 'user-123',
      sessionId: 'session-123',
      sessionClaims: null,
      actor: null,
      has: () => true,
      debug: () => null
    });

    const mockWorkflows = [
      {
        id: 'workflow-1',
        request_id: 'req-specific',
        current_state: 'searching_flights',
        metadata: {},
        created_at: '2025-10-22T10:00:00Z',
      },
    ];

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'user-123' },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'workflow_history') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: mockWorkflows,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
    });
    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/workflows?request_id=req-specific');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.workflow_history).toHaveLength(1);
    expect(data.workflow_history[0].request_id).toBe('req-specific');
    expect(data.workflow_history[0].current_state).toBe('searching_flights');
  });

  it('should filter workflows by current_state', async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: 'user-123',
      sessionId: 'session-123',
      sessionClaims: null,
      actor: null,
      has: () => true,
      debug: () => null
    });

    const mockWorkflows = [
      {
        id: 'workflow-1',
        request_id: 'req-1',
        current_state: 'awaiting_quotes',
      },
      {
        id: 'workflow-2',
        request_id: 'req-2',
        current_state: 'awaiting_quotes',
      },
    ];

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'user-123' },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'workflow_history') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockWorkflows,
                error: null,
              }),
            }),
          }),
        };
      }
    });
    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/workflows?state=awaiting_quotes');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.workflow_history).toHaveLength(2);
    expect(data.workflow_history[0].current_state).toBe('awaiting_quotes');
    expect(data.workflow_history[1].current_state).toBe('awaiting_quotes');
  });

  it('should respect limit parameter', async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: 'user-123',
      sessionId: 'session-123',
      sessionClaims: null,
      actor: null,
      has: () => true,
      debug: () => null
    });

    const mockWorkflows = [
      { id: 'workflow-1', request_id: 'req-1', current_state: 'analyzing' },
      { id: 'workflow-2', request_id: 'req-2', current_state: 'completed' },
      { id: 'workflow-3', request_id: 'req-3', current_state: 'failed' },
    ];

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'user-123' },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'workflow_history') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockWorkflows,
                error: null,
              }),
            }),
          }),
        };
      }
    });
    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/workflows?limit=3');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.workflow_history).toHaveLength(3);
  });

  it('should return empty array when no workflows found', async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: 'user-123',
      sessionId: 'session-123',
      sessionClaims: null,
      actor: null,
      has: () => true,
      debug: () => null
    });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'user-123' },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'workflow_history') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        };
      }
    });
    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/workflows');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.workflow_history).toEqual([]);
  });

  it('should include workflow metadata in response', async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: 'user-123',
      sessionId: 'session-123',
      sessionClaims: null,
      actor: null,
      has: () => true,
      debug: () => null
    });

    const mockWorkflows = [
      {
        id: 'workflow-1',
        request_id: 'req-1',
        current_state: 'analyzing_proposals',
        metadata: {
          quotesReceived: 5,
          bestPrice: 45000,
          recommendedOperator: 'Operator A',
        },
        created_at: '2025-10-22T10:00:00Z',
        updated_at: '2025-10-22T10:15:00Z',
      },
    ];

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'user-123' },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'workflow_history') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockWorkflows,
                error: null,
              }),
            }),
          }),
        };
      }
    });
    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/workflows');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.workflow_history[0].metadata.quotesReceived).toBe(5);
    expect(data.workflow_history[0].metadata.bestPrice).toBe(45000);
    expect(data.workflow_history[0].metadata.recommendedOperator).toBe('Operator A');
  });

  it('should return 500 on database error', async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: 'user-123',
      sessionId: 'session-123',
      sessionClaims: null,
      actor: null,
      has: () => true,
      debug: () => null
    });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'user-123' },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'workflow_history') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database connection failed' },
              }),
            }),
          }),
        };
      }
    });
    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/workflows');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch workflow history');
  });
});
