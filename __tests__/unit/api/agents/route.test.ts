/**
 * Tests for /api/agents route
 *
 * Tests GET endpoint for retrieving agent execution history and metrics.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/agents/route';

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

describe('GET /api/agents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null, sessionId: null, sessionClaims: null, actor: null, has: () => false, debug: () => null });

    const request = new NextRequest('http://localhost:3000/api/agents');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return all agent executions for authenticated user', async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: 'user-123',
      sessionId: 'session-123',
      sessionClaims: null,
      actor: null,
      has: () => true,
      debug: () => null
    });

    const mockExecutions = [
      {
        id: 'exec-1',
        agent_type: 'orchestrator',
        request_id: 'req-1',
        status: 'completed',
        duration_ms: 1200,
        input_tokens: 500,
        output_tokens: 300,
        created_at: '2025-10-22T10:00:00Z',
      },
      {
        id: 'exec-2',
        agent_type: 'client_data',
        request_id: 'req-1',
        status: 'completed',
        duration_ms: 800,
        input_tokens: 200,
        output_tokens: 150,
        created_at: '2025-10-22T10:01:00Z',
      },
      {
        id: 'exec-3',
        agent_type: 'flight_search',
        request_id: 'req-1',
        status: 'running',
        duration_ms: null,
        input_tokens: 300,
        output_tokens: null,
        created_at: '2025-10-22T10:02:00Z',
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
      } else if (table === 'agent_executions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockExecutions,
                error: null,
              }),
            }),
          }),
        };
      }
    });
    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/agents');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.executions).toHaveLength(3);
    expect(data.executions[0].agent_type).toBe('orchestrator');
    expect(data.executions[0].status).toBe('completed');
    expect(data.executions[2].status).toBe('running');
  });

  it('should filter executions by agent_type', async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: 'user-123',
      sessionId: 'session-123',
      sessionClaims: null,
      actor: null,
      has: () => true,
      debug: () => null
    });

    const mockExecutions = [
      {
        id: 'exec-1',
        agent_type: 'orchestrator',
        status: 'completed',
        duration_ms: 1200,
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
      } else if (table === 'agent_executions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: mockExecutions,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
    });
    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/agents?agent_type=orchestrator');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.executions).toHaveLength(1);
    expect(data.executions[0].agent_type).toBe('orchestrator');
  });

  it('should filter executions by request_id', async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: 'user-123',
      sessionId: 'session-123',
      sessionClaims: null,
      actor: null,
      has: () => true,
      debug: () => null
    });

    const mockExecutions = [
      {
        id: 'exec-1',
        agent_type: 'orchestrator',
        request_id: 'req-specific',
        status: 'completed',
      },
      {
        id: 'exec-2',
        agent_type: 'client_data',
        request_id: 'req-specific',
        status: 'completed',
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
      } else if (table === 'agent_executions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: mockExecutions,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
    });
    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/agents?request_id=req-specific');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.executions).toHaveLength(2);
    expect(data.executions[0].request_id).toBe('req-specific');
    expect(data.executions[1].request_id).toBe('req-specific');
  });

  it('should filter executions by status', async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: 'user-123',
      sessionId: 'session-123',
      sessionClaims: null,
      actor: null,
      has: () => true,
      debug: () => null
    });

    const mockExecutions = [
      {
        id: 'exec-1',
        agent_type: 'error_monitor',
        status: 'failed',
        error_message: 'API timeout',
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
      } else if (table === 'agent_executions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: mockExecutions,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
    });
    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/agents?status=failed');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.executions).toHaveLength(1);
    expect(data.executions[0].status).toBe('failed');
    expect(data.executions[0].error_message).toBe('API timeout');
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

    const mockExecutions = [
      { id: 'exec-1', agent_type: 'orchestrator' },
      { id: 'exec-2', agent_type: 'client_data' },
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
      } else if (table === 'agent_executions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockExecutions,
                error: null,
              }),
            }),
          }),
        };
      }
    });
    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/agents?limit=2');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.executions).toHaveLength(2);
  });

  it('should return empty array when no executions found', async () => {
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
      } else if (table === 'agent_executions') {
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

    const request = new NextRequest('http://localhost:3000/api/agents');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.executions).toEqual([]);
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
      } else if (table === 'agent_executions') {
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

    const request = new NextRequest('http://localhost:3000/api/agents');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch executions');
  });
});
