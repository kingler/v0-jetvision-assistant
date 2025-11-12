/**
 * Current User API Tests
 * Tests for /api/users/me endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH } from '@/app/api/users/me/route';
import { mockUser } from '../../../../utils/mock-factories';

// Mock Supabase client with default resolved values
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
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

describe('/api/users/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/users/me', () => {
    it('should return current user profile', async () => {
      mockAuthFn.mockResolvedValueOnce({ userId: 'user_123' });

      const mockUserData = mockUser({ role: 'sales_rep' });

      // First call for getUserRole in withRBAC
      const mockSingleFn1 = vi.fn().mockResolvedValueOnce({
        data: mockUserData,
        error: null,
      });
      const mockEqFn1 = vi.fn().mockReturnValueOnce({ single: mockSingleFn1 });
      const mockSelectFn1 = vi.fn().mockReturnValueOnce({ eq: mockEqFn1 });

      // Second call for actual route handler
      const mockSingleFn2 = vi.fn().mockResolvedValueOnce({
        data: mockUserData,
        error: null,
      });
      const mockEqFn2 = vi.fn().mockReturnValueOnce({ single: mockSingleFn2 });
      const mockSelectFn2 = vi.fn().mockReturnValueOnce({ eq: mockEqFn2 });

      mockSupabaseClient.from = vi.fn()
        .mockReturnValueOnce({ select: mockSelectFn1 }) // getUserRole
        .mockReturnValueOnce({ select: mockSelectFn2 }); // actual query

      const request = new NextRequest('http://localhost:3000/api/users/me');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toHaveProperty('user');
      expect(body.user.role).toBe('sales_rep');
    });

    it('should return 404 if user not found', async () => {
      mockAuthFn.mockResolvedValueOnce({ userId: 'user_123' });

      const mockUserData = mockUser({ role: 'sales_rep' });

      // First call for getUserRole in withRBAC (succeeds)
      const mockSingleFn1 = vi.fn().mockResolvedValueOnce({
        data: mockUserData,
        error: null,
      });
      const mockEqFn1 = vi.fn().mockReturnValueOnce({ single: mockSingleFn1 });
      const mockSelectFn1 = vi.fn().mockReturnValueOnce({ eq: mockEqFn1 });

      // Second call for actual route handler (fails)
      const mockSingleFn2 = vi.fn().mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Row not found' },
      });
      const mockEqFn2 = vi.fn().mockReturnValueOnce({ single: mockSingleFn2 });
      const mockSelectFn2 = vi.fn().mockReturnValueOnce({ eq: mockEqFn2 });

      mockSupabaseClient.from = vi.fn()
        .mockReturnValueOnce({ select: mockSelectFn1 })
        .mockReturnValueOnce({ select: mockSelectFn2 });

      const request = new NextRequest('http://localhost:3000/api/users/me');
      const response = await GET(request);

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('User not found');
    });
  });

  describe('PATCH /api/users/me', () => {
    it('should update current user profile', async () => {
      mockAuthFn.mockResolvedValueOnce({ userId: 'user_123' });

      const updatedUser = mockUser({ full_name: 'Updated Name', role: 'sales_rep' });
      const mockSingleFn = vi.fn().mockResolvedValueOnce({
        data: updatedUser,
        error: null,
      });
      const mockSelectFn = vi.fn().mockReturnValueOnce({ single: mockSingleFn });
      const mockEqFn = vi.fn().mockReturnValueOnce({ select: mockSelectFn });
      const mockUpdateFn = vi.fn().mockReturnValueOnce({ eq: mockEqFn });
      mockSupabaseClient.from = vi.fn().mockReturnValueOnce({ update: mockUpdateFn });

      const request = new NextRequest('http://localhost:3000/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ full_name: 'Updated Name' }),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.user.full_name).toBe('Updated Name');
      expect(mockUpdateFn).toHaveBeenCalled();
    });

    it('should prevent updating sensitive fields', async () => {
      mockAuthFn.mockResolvedValueOnce({ userId: 'user_123' });

      const request = new NextRequest('http://localhost:3000/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          role: 'admin', // Should be filtered out
          clerk_user_id: 'different_id', // Should be filtered out
        }),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('No valid fields to update');
    });

    it('should allow updating allowed fields', async () => {
      mockAuthFn.mockResolvedValueOnce({ userId: 'user_123' });

      const updatedUser = mockUser({ phone: '+1234567890', role: 'sales_rep' });
      const mockSingleFn = vi.fn().mockResolvedValueOnce({
        data: updatedUser,
        error: null,
      });
      const mockSelectFn = vi.fn().mockReturnValueOnce({ single: mockSingleFn });
      const mockEqFn = vi.fn().mockReturnValueOnce({ select: mockSelectFn });
      const mockUpdateFn = vi.fn().mockReturnValueOnce({ eq: mockEqFn });
      mockSupabaseClient.from = vi.fn().mockReturnValueOnce({ update: mockUpdateFn });

      const request = new NextRequest('http://localhost:3000/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          phone: '+1234567890',
          full_name: 'New Name',
        }),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toHaveProperty('user');
    });
  });
});
