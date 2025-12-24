/**
 * Unit Tests for lib/utils/api.ts
 *
 * Tests authentication helpers: getAuthenticatedAgent and getAuthenticatedUser
 * Validates correct querying of iso_agents table with proper error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedAgent,
  getAuthenticatedUser,
  isErrorResponse,
  ISOAgent,
  AuthenticatedUser,
} from '@/lib/utils/api';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock Supabase client
const mockSupabaseFrom = vi.fn();
const mockSupabaseSelect = vi.fn();
const mockSupabaseEq = vi.fn();
const mockSupabaseSingle = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => mockSupabaseFrom()),
  },
}));

import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase/client';

describe('lib/utils/api - Authentication Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default Supabase query chain mock
    mockSupabaseFrom.mockReturnValue({
      select: mockSupabaseSelect,
    });
    mockSupabaseSelect.mockReturnValue({
      eq: mockSupabaseEq,
    });
    mockSupabaseEq.mockReturnValue({
      single: mockSupabaseSingle,
    });
  });

  describe('getAuthenticatedAgent', () => {
    const mockClerkUserId = 'user_clerk123';

    it('should return 401 if user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const result = await getAuthenticatedAgent();

      expect(isErrorResponse(result)).toBe(true);
      if (isErrorResponse(result)) {
        const data = await result.json();
        expect(result.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
        expect(data.message).toContain('No authentication token');
      }
    });

    it('should return ISO agent id when found', async () => {
      const mockISOAgent = { id: 'iso-agent-uuid-123' };

      vi.mocked(auth).mockResolvedValue({ userId: mockClerkUserId } as any);
      mockSupabaseSingle.mockResolvedValue({
        data: mockISOAgent,
        error: null,
      });

      const result = await getAuthenticatedAgent();

      expect(isErrorResponse(result)).toBe(false);
      expect(result).toEqual(mockISOAgent);
      expect(mockSupabaseFrom).toHaveBeenCalledWith('iso_agents');
      expect(mockSupabaseSelect).toHaveBeenCalledWith('id');
      expect(mockSupabaseEq).toHaveBeenCalledWith('clerk_user_id', mockClerkUserId);
    });

    it('should return 404 with clear message when ISO agent not found (PGRST116)', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: mockClerkUserId } as any);
      mockSupabaseSingle.mockResolvedValue({
        data: null,
        error: {
          code: 'PGRST116',
          message: 'No rows returned',
          details: null,
          hint: null,
        },
      });

      const result = await getAuthenticatedAgent();

      expect(isErrorResponse(result)).toBe(true);
      if (isErrorResponse(result)) {
        const data = await result.json();
        expect(result.status).toBe(404);
        expect(data.error).toBe('ISO agent not found');
        expect(data.message).toContain('No ISO agent record found');
        expect(data.message).toContain(mockClerkUserId);
      }
    });

    it('should return 404 when query returns null data', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: mockClerkUserId } as any);
      mockSupabaseSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await getAuthenticatedAgent();

      expect(isErrorResponse(result)).toBe(true);
      if (isErrorResponse(result)) {
        const data = await result.json();
        expect(result.status).toBe(404);
        expect(data.error).toBe('ISO agent not found');
        expect(data.message).toContain('No ISO agent record found');
      }
    });

    it('should return 500 for database connection errors', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: mockClerkUserId } as any);
      mockSupabaseSingle.mockResolvedValue({
        data: null,
        error: {
          code: '08000',
          message: 'Connection failure',
          details: 'Database connection lost',
          hint: null,
        },
      });

      const result = await getAuthenticatedAgent();

      expect(isErrorResponse(result)).toBe(true);
      if (isErrorResponse(result)) {
        const data = await result.json();
        expect(result.status).toBe(500);
        expect(data.error).toBe('Database error');
        expect(data.message).toBe('Failed to retrieve ISO agent record');
      }
    });

    it('should query iso_agents table with correct column names', async () => {
      const mockISOAgent = { id: 'iso-agent-uuid-123' };

      vi.mocked(auth).mockResolvedValue({ userId: mockClerkUserId } as any);
      mockSupabaseSingle.mockResolvedValue({
        data: mockISOAgent,
        error: null,
      });

      await getAuthenticatedAgent();

      // Verify correct table and column usage
      expect(mockSupabaseFrom).toHaveBeenCalledWith('iso_agents');
      expect(mockSupabaseSelect).toHaveBeenCalledWith('id');
      expect(mockSupabaseEq).toHaveBeenCalledWith('clerk_user_id', mockClerkUserId);
    });
  });

  describe('getAuthenticatedUser', () => {
    const mockClerkUserId = 'user_clerk456';

    it('should return 401 if user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const result = await getAuthenticatedUser();

      expect(isErrorResponse(result)).toBe(true);
      if (isErrorResponse(result)) {
        const data = await result.json();
        expect(result.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
        expect(data.message).toContain('No authentication token');
      }
    });

    it('should return user data with id, role, and clerkUserId when found', async () => {
      const mockISOAgent = {
        id: 'iso-agent-uuid-456',
        role: 'iso_agent' as const,
      };

      vi.mocked(auth).mockResolvedValue({ userId: mockClerkUserId } as any);
      mockSupabaseSingle.mockResolvedValue({
        data: mockISOAgent,
        error: null,
      });

      const result = await getAuthenticatedUser();

      expect(isErrorResponse(result)).toBe(false);
      if (!isErrorResponse(result)) {
        expect(result).toEqual({
          id: mockISOAgent.id,
          role: mockISOAgent.role,
          clerkUserId: mockClerkUserId,
        });
      }
      expect(mockSupabaseFrom).toHaveBeenCalledWith('iso_agents');
      expect(mockSupabaseSelect).toHaveBeenCalledWith('id, role');
      expect(mockSupabaseEq).toHaveBeenCalledWith('clerk_user_id', mockClerkUserId);
    });

    it('should handle null role by converting to undefined', async () => {
      const mockISOAgent = {
        id: 'iso-agent-uuid-789',
        role: null,
      };

      vi.mocked(auth).mockResolvedValue({ userId: mockClerkUserId } as any);
      mockSupabaseSingle.mockResolvedValue({
        data: mockISOAgent,
        error: null,
      });

      const result = await getAuthenticatedUser();

      expect(isErrorResponse(result)).toBe(false);
      if (!isErrorResponse(result)) {
        expect(result.role).toBeUndefined();
        expect(result.id).toBe(mockISOAgent.id);
        expect(result.clerkUserId).toBe(mockClerkUserId);
      }
    });

    it('should return 404 with clear message when ISO agent not found (PGRST116)', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: mockClerkUserId } as any);
      mockSupabaseSingle.mockResolvedValue({
        data: null,
        error: {
          code: 'PGRST116',
          message: 'No rows returned',
          details: null,
          hint: null,
        },
      });

      const result = await getAuthenticatedUser();

      expect(isErrorResponse(result)).toBe(true);
      if (isErrorResponse(result)) {
        const data = await result.json();
        expect(result.status).toBe(404);
        expect(data.error).toBe('ISO agent not found');
        expect(data.message).toContain('No ISO agent record found');
        expect(data.message).toContain(mockClerkUserId);
      }
    });

    it('should return 404 when query returns null data', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: mockClerkUserId } as any);
      mockSupabaseSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await getAuthenticatedUser();

      expect(isErrorResponse(result)).toBe(true);
      if (isErrorResponse(result)) {
        const data = await result.json();
        expect(result.status).toBe(404);
        expect(data.error).toBe('ISO agent not found');
      }
    });

    it('should return 500 for database connection errors', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: mockClerkUserId } as any);
      mockSupabaseSingle.mockResolvedValue({
        data: null,
        error: {
          code: '08000',
          message: 'Connection failure',
          details: 'Database connection lost',
          hint: null,
        },
      });

      const result = await getAuthenticatedUser();

      expect(isErrorResponse(result)).toBe(true);
      if (isErrorResponse(result)) {
        const data = await result.json();
        expect(result.status).toBe(500);
        expect(data.error).toBe('Database error');
        expect(data.message).toBe('Failed to retrieve ISO agent record');
      }
    });

    it('should query iso_agents table with correct column names (id, role)', async () => {
      const mockISOAgent = {
        id: 'iso-agent-uuid-999',
        role: 'admin' as const,
      };

      vi.mocked(auth).mockResolvedValue({ userId: mockClerkUserId } as any);
      mockSupabaseSingle.mockResolvedValue({
        data: mockISOAgent,
        error: null,
      });

      await getAuthenticatedUser();

      // Verify correct table and column usage
      expect(mockSupabaseFrom).toHaveBeenCalledWith('iso_agents');
      expect(mockSupabaseSelect).toHaveBeenCalledWith('id, role');
      expect(mockSupabaseEq).toHaveBeenCalledWith('clerk_user_id', mockClerkUserId);
    });

    it('should handle all user_role enum values correctly', async () => {
      const roles: Array<'iso_agent' | 'admin' | 'operator'> = [
        'iso_agent',
        'admin',
        'operator',
      ];

      for (const role of roles) {
        vi.clearAllMocks();
        const mockISOAgent = {
          id: `iso-agent-${role}`,
          role,
        };

        vi.mocked(auth).mockResolvedValue({ userId: mockClerkUserId } as any);
        mockSupabaseSingle.mockResolvedValue({
          data: mockISOAgent,
          error: null,
        });

        const result = await getAuthenticatedUser();

        expect(isErrorResponse(result)).toBe(false);
        if (!isErrorResponse(result)) {
          expect(result.role).toBe(role);
        }
      }
    });
  });

  describe('isErrorResponse', () => {
    it('should return true for NextResponse instances', () => {
      const errorResponse = NextResponse.json({ error: 'Test' }, { status: 400 });
      expect(isErrorResponse(errorResponse)).toBe(true);
    });

    it('should return false for non-NextResponse values', () => {
      const isoAgent: ISOAgent = { id: 'test-id' };
      expect(isErrorResponse(isoAgent)).toBe(false);

      const user: AuthenticatedUser = {
        id: 'test-id',
        role: 'iso_agent',
        clerkUserId: 'clerk-123',
      };
      expect(isErrorResponse(user)).toBe(false);
    });
  });
});

