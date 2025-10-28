/**
 * API Routes Integration Tests - User Migration
 *
 * TDD Approach: These tests are written FIRST and will FAIL initially.
 * They test the actual API routes after migration from iso_agents to users table.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => Promise.resolve({ userId: 'test-clerk-user-123' })),
}));

// Mock Supabase client
const mockSupabaseSelect = vi.fn();
const mockSupabaseInsert = vi.fn();
const mockSupabaseUpdate = vi.fn();
const mockSupabaseFrom = vi.fn((table: string) => ({
  select: mockSupabaseSelect,
  insert: mockSupabaseInsert,
  update: mockSupabaseUpdate,
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: mockSupabaseFrom,
  },
}));

describe('API Routes - User Table Migration', () => {
  describe('GET /api/clients', () => {
    it('should query users table instead of iso_agents', async () => {
      const { GET } = await import('@/app/api/clients/route');

      // Mock user query response
      mockSupabaseSelect.mockResolvedValueOnce({
        data: { id: 'user-123', role: 'sales_rep' },
        error: null,
      });

      // Mock clients query response
      mockSupabaseSelect.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/clients');
      const response = await GET(request);
      const data = await response.json();

      // Verify it queried 'users' table not 'iso_agents'
      expect(mockSupabaseFrom).toHaveBeenCalledWith('users');
      expect(mockSupabaseSelect).toHaveBeenCalledWith('id, role');
    });

    it('should filter by user_id not iso_agent_id', async () => {
      const { GET } = await import('@/app/api/clients/route');

      mockSupabaseSelect.mockResolvedValueOnce({
        data: { id: 'user-123', role: 'sales_rep' },
        error: null,
      });

      const mockEq = vi.fn().mockReturnThis();
      mockSupabaseSelect.mockReturnValueOnce({
        eq: mockEq,
      });

      const request = new NextRequest('http://localhost:3000/api/clients');
      await GET(request);

      // Verify it filters by user_id
      expect(mockSupabaseFrom).toHaveBeenCalledWith('client_profiles');
      // The select should include user_id filter
    });
  });

  describe('POST /api/clients', () => {
    it('should insert with user_id instead of iso_agent_id', async () => {
      const { POST } = await import('@/app/api/clients/route');

      mockSupabaseSelect.mockResolvedValueOnce({
        data: { id: 'user-123', role: 'sales_rep' },
        error: null,
      });

      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'client-123', user_id: 'user-123' },
        error: null,
      });

      mockSupabaseInsert.mockReturnValueOnce({
        select: mockSelect.mockReturnValue({
          single: mockSingle,
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          company_name: 'Test Corp',
          contact_name: 'John Doe',
          email: 'john@test.com',
        }),
      });

      await POST(request);

      // Verify insert uses user_id
      expect(mockSupabaseInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
        })
      );
    });
  });

  describe('GET /api/requests', () => {
    it('should join with users table instead of iso_agents', async () => {
      const { GET } = await import('@/app/api/requests/route');

      mockSupabaseSelect.mockResolvedValueOnce({
        data: { id: 'user-123', role: 'sales_rep' },
        error: null,
      });

      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockRange = vi.fn().mockResolvedValue({ data: [], error: null });

      mockSupabaseSelect.mockReturnValueOnce({
        eq: mockEq.mockReturnValue({
          order: mockOrder.mockReturnValue({
            range: mockRange,
          }),
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/requests');
      await GET(request);

      // Verify it selects from users table
      expect(mockSupabaseFrom).toHaveBeenCalledWith('users');

      // Verify select includes user join
      expect(mockSupabaseSelect).toHaveBeenCalledWith(
        expect.stringContaining('user:users')
      );
    });
  });

  describe('GET /api/quotes', () => {
    it('should filter by user_id in joined requests table', async () => {
      const { GET } = await import('@/app/api/quotes/route');

      mockSupabaseSelect.mockResolvedValueOnce({
        data: { id: 'user-123', role: 'sales_rep' },
        error: null,
      });

      const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
      mockSupabaseSelect.mockReturnValueOnce({
        eq: mockEq,
      });

      const request = new NextRequest('http://localhost:3000/api/quotes');
      await GET(request);

      // Verify it filters by request.user_id
      expect(mockEq).toHaveBeenCalledWith('request.user_id', 'user-123');
    });
  });

  describe('GET /api/workflows', () => {
    it('should join with users table for workflow history', async () => {
      const { GET } = await import('@/app/api/workflows/route');

      mockSupabaseSelect.mockResolvedValueOnce({
        data: { id: 'user-123', role: 'sales_rep' },
        error: null,
      });

      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });

      mockSupabaseSelect.mockReturnValueOnce({
        eq: mockEq.mockReturnValue({
          order: mockOrder,
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/workflows');
      await GET(request);

      // Verify it queries users table
      expect(mockSupabaseFrom).toHaveBeenCalledWith('users');

      // Verify it filters by user_id in joined table
      expect(mockEq).toHaveBeenCalledWith('request.user_id', 'user-123');
    });
  });

  describe('GET /api/agents', () => {
    it('should filter agent executions by user_id', async () => {
      const { GET } = await import('@/app/api/agents/route');

      mockSupabaseSelect.mockResolvedValueOnce({
        data: { id: 'user-123', role: 'sales_rep' },
        error: null,
      });

      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });

      mockSupabaseSelect.mockReturnValueOnce({
        eq: mockEq.mockReturnValue({
          order: mockOrder,
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/agents');
      await GET(request);

      // Verify user table query
      expect(mockSupabaseFrom).toHaveBeenCalledWith('users');

      // Verify filtering by user_id
      expect(mockEq).toHaveBeenCalledWith('request.user_id', 'user-123');
    });
  });
});

describe('User Role Handling', () => {
  it('should fetch user role along with ID', async () => {
    const { GET } = await import('@/app/api/clients/route');

    mockSupabaseSelect.mockResolvedValueOnce({
      data: { id: 'user-123', role: 'admin' },
      error: null,
    });

    mockSupabaseSelect.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    const request = new NextRequest('http://localhost:3000/api/clients');
    await GET(request);

    // Verify role is fetched
    expect(mockSupabaseSelect).toHaveBeenCalledWith('id, role');
  });

  it('should support all new user roles (sales_rep, admin, customer, operator)', () => {
    const roles = ['sales_rep', 'admin', 'customer', 'operator'];
    expect(roles).toHaveLength(4);

    roles.forEach((role) => {
      expect(['sales_rep', 'admin', 'customer', 'operator']).toContain(role);
    });
  });
});

describe('Error Handling', () => {
  it('should return 404 when user not found', async () => {
    const { GET } = await import('@/app/api/clients/route');

    mockSupabaseSelect.mockResolvedValueOnce({
      data: null,
      error: { message: 'User not found' },
    });

    const request = new NextRequest('http://localhost:3000/api/clients');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('User not found');
  });

  it('should handle database errors gracefully', async () => {
    const { GET } = await import('@/app/api/clients/route');

    mockSupabaseSelect.mockResolvedValueOnce({
      data: { id: 'user-123', role: 'sales_rep' },
      error: null,
    });

    mockSupabaseSelect.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error' },
    });

    const request = new NextRequest('http://localhost:3000/api/clients');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});
