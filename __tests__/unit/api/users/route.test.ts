/**
 * User Management API Tests (Admin)
 * Tests for /api/users endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH } from '@/app/api/users/route';
import { mockUser } from '../../../utils/mock-factories';

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        range: vi.fn(),
      })),
      order: vi.fn(() => ({
        range: vi.fn(),
      })),
      range: vi.fn(),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  })),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabaseClient),
}));

// Mock Clerk auth
const mockAuthFn = vi.fn();
vi.mock('@clerk/nextjs/server', () => ({
  auth: () => mockAuthFn(),
}));

describe('/api/users (Admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/users', () => {
    it('should return paginated list of users for admin', async () => {
      mockAuthFn.mockResolvedValueOnce({ userId: 'admin_123' });

      const mockUsers = [
        mockUser({ role: 'sales_rep' }),
        mockUser({ role: 'customer' }),
        mockUser({ role: 'operator' }),
      ];

      const mockRangeFn = vi.fn().mockResolvedValueOnce({
        data: mockUsers,
        error: null,
        count: 3,
      });

      const mockOrderFn = vi.fn().mockReturnValueOnce({ range: mockRangeFn });
      const mockSelectFn = vi.fn().mockReturnValueOnce({ order: mockOrderFn });
      mockSupabaseClient.from = vi.fn().mockReturnValueOnce({ select: mockSelectFn });

      // Mock getUserRole to return admin
      const mockSingleFn = vi.fn().mockResolvedValueOnce({
        data: mockUser({ role: 'admin' }),
        error: null,
      });
      const mockEqFn = vi.fn().mockReturnValueOnce({ single: mockSingleFn });
      const mockSelectFn2 = vi.fn().mockReturnValueOnce({ eq: mockEqFn });
      mockSupabaseClient.from = vi.fn()
        .mockReturnValueOnce({ select: mockSelectFn2 }) // getUserRole
        .mockReturnValueOnce({ select: mockSelectFn }); // actual query

      const request = new NextRequest('http://localhost:3000/api/users?page=1&limit=50');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toHaveProperty('users');
      expect(body).toHaveProperty('pagination');
      expect(body.users).toHaveLength(3);
      expect(body.pagination.total).toBe(3);
    });

    it('should filter users by role', async () => {
      mockAuthFn.mockResolvedValueOnce({ userId: 'admin_123' });

      const mockUsers = [mockUser({ role: 'admin' })];

      // Route chain is: .from().select().order().range().eq() when role filter is applied
      const mockEqFn2 = vi.fn().mockResolvedValueOnce({
        data: mockUsers,
        error: null,
        count: 1,
      });
      const mockRangeFn = vi.fn().mockReturnValueOnce({ eq: mockEqFn2 });
      const mockOrderFn = vi.fn().mockReturnValueOnce({ range: mockRangeFn });
      const mockSelectFn = vi.fn().mockReturnValueOnce({ order: mockOrderFn });

      // Mock getUserRole
      const mockSingleFn = vi.fn().mockResolvedValueOnce({
        data: mockUser({ role: 'admin' }),
        error: null,
      });
      const mockEqFn = vi.fn().mockReturnValueOnce({ single: mockSingleFn });
      const mockSelectFn2 = vi.fn().mockReturnValueOnce({ eq: mockEqFn });
      mockSupabaseClient.from = vi.fn()
        .mockReturnValueOnce({ select: mockSelectFn2 })
        .mockReturnValueOnce({ select: mockSelectFn });

      const request = new NextRequest('http://localhost:3000/api/users?role=admin');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.users).toHaveLength(1);
      expect(body.users[0].role).toBe('admin');
    });

    it('should return 403 for non-admin users', async () => {
      mockAuthFn.mockResolvedValueOnce({ userId: 'user_123' });

      // Mock getUserRole to return non-admin
      const mockSingleFn = vi.fn().mockResolvedValueOnce({
        data: mockUser({ role: 'customer' }),
        error: null,
      });
      const mockEqFn = vi.fn().mockReturnValueOnce({ single: mockSingleFn });
      const mockSelectFn = vi.fn().mockReturnValueOnce({ eq: mockEqFn });
      mockSupabaseClient.from = vi.fn().mockReturnValueOnce({ select: mockSelectFn });

      const request = new NextRequest('http://localhost:3000/api/users');
      const response = await GET(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Forbidden');
    });
  });

  describe('PATCH /api/users', () => {
    it('should allow admin to update any user', async () => {
      mockAuthFn.mockResolvedValueOnce({ userId: 'admin_123' });

      const updatedUser = mockUser({ full_name: 'Updated User', role: 'sales_rep' });
      const mockSingleFn = vi.fn().mockResolvedValueOnce({
        data: updatedUser,
        error: null,
      });
      const mockSelectFn = vi.fn().mockReturnValueOnce({ single: mockSingleFn });
      const mockEqFn = vi.fn().mockReturnValueOnce({ select: mockSelectFn });
      const mockUpdateFn = vi.fn().mockReturnValueOnce({ eq: mockEqFn });
      mockSupabaseClient.from = vi.fn().mockReturnValueOnce({ update: mockUpdateFn });

      // Mock getUserRole to return admin
      const mockSingleFn2 = vi.fn().mockResolvedValueOnce({
        data: mockUser({ role: 'admin' }),
        error: null,
      });
      const mockEqFn2 = vi.fn().mockReturnValueOnce({ single: mockSingleFn2 });
      const mockSelectFn2 = vi.fn().mockReturnValueOnce({ eq: mockEqFn2 });
      mockSupabaseClient.from = vi.fn()
        .mockReturnValueOnce({ select: mockSelectFn2 })
        .mockReturnValueOnce({ update: mockUpdateFn });

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'PATCH',
        body: JSON.stringify({
          userId: 'user_456',
          full_name: 'Updated User',
        }),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.user.full_name).toBe('Updated User');
    });

    it('should require userId in request body', async () => {
      mockAuthFn.mockResolvedValueOnce({ userId: 'admin_123' });

      // Mock getUserRole
      const mockSingleFn = vi.fn().mockResolvedValueOnce({
        data: mockUser({ role: 'admin' }),
        error: null,
      });
      const mockEqFn = vi.fn().mockReturnValueOnce({ single: mockSingleFn });
      const mockSelectFn = vi.fn().mockReturnValueOnce({ eq: mockEqFn });
      mockSupabaseClient.from = vi.fn().mockReturnValueOnce({ select: mockSelectFn });

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'PATCH',
        body: JSON.stringify({
          full_name: 'Updated Name',
        }),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('userId is required');
    });

    it('should return 403 for non-admin users', async () => {
      mockAuthFn.mockResolvedValueOnce({ userId: 'user_123' });

      // Mock getUserRole to return non-admin
      const mockSingleFn = vi.fn().mockResolvedValueOnce({
        data: mockUser({ role: 'sales_rep' }),
        error: null,
      });
      const mockEqFn = vi.fn().mockReturnValueOnce({ single: mockSingleFn });
      const mockSelectFn = vi.fn().mockReturnValueOnce({ eq: mockEqFn });
      mockSupabaseClient.from = vi.fn().mockReturnValueOnce({ select: mockSelectFn });

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'PATCH',
        body: JSON.stringify({
          userId: 'user_456',
          full_name: 'Hacker',
        }),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Forbidden');
    });
  });
});
