/**
 * RBAC Middleware Unit Tests (TDD RED Phase)
 *
 * Tests for Role-Based Access Control middleware implementation
 * Following TDD approach: Write tests FIRST, then implementation
 *
 * Coverage:
 * - hasPermission() - Permission checking for all 4 roles × 5 resources × 6 actions
 * - getUserRole() - Fetching user role from database
 * - withRBAC() - Middleware wrapper for API route protection
 * - requireRoles() - Role requirement helper
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import type { UserRole } from '../../../lib/types/database';
import {
  hasPermission,
  getUserRole,
  withRBAC,
  requireRoles,
  PERMISSIONS,
  type Resource,
  type Action,
  type PermissionCheck,
} from '@/lib/middleware/rbac';
import { mockUser } from '../../utils/mock-factories';

// Mock Supabase client - must be declared before vi.mock()
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
  })),
};

// Mock Auth function - must be declared before vi.mock()
const mockAuthFn = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabaseClient),
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: () => mockAuthFn(),
}));

describe('RBAC Middleware - Permission Matrix', () => {
  describe('hasPermission()', () => {
    describe('sales_rep role', () => {
      const role: UserRole = 'sales_rep';

      it('should allow create on clients', () => {
        expect(hasPermission(role, 'clients', 'create')).toBe(true);
      });

      it('should allow read on clients', () => {
        expect(hasPermission(role, 'clients', 'read')).toBe(true);
      });

      it('should allow update on clients', () => {
        expect(hasPermission(role, 'clients', 'update')).toBe(true);
      });

      it('should allow delete on clients', () => {
        expect(hasPermission(role, 'clients', 'delete')).toBe(true);
      });

      it('should allow create on requests', () => {
        expect(hasPermission(role, 'requests', 'create')).toBe(true);
      });

      it('should allow read on requests', () => {
        expect(hasPermission(role, 'requests', 'read')).toBe(true);
      });

      it('should allow update on requests', () => {
        expect(hasPermission(role, 'requests', 'update')).toBe(true);
      });

      it('should allow delete on requests', () => {
        expect(hasPermission(role, 'requests', 'delete')).toBe(true);
      });

      it('should allow read on quotes', () => {
        expect(hasPermission(role, 'quotes', 'read')).toBe(true);
      });

      it('should allow update on quotes', () => {
        expect(hasPermission(role, 'quotes', 'update')).toBe(true);
      });

      it('should deny create on quotes', () => {
        expect(hasPermission(role, 'quotes', 'create')).toBe(false);
      });

      it('should deny delete on quotes', () => {
        expect(hasPermission(role, 'quotes', 'delete')).toBe(false);
      });

      it('should allow read_own on users', () => {
        expect(hasPermission(role, 'users', 'read_own')).toBe(true);
      });

      it('should allow update_own on users', () => {
        expect(hasPermission(role, 'users', 'update_own')).toBe(true);
      });

      it('should deny create on users', () => {
        expect(hasPermission(role, 'users', 'create')).toBe(false);
      });

      it('should deny update on users', () => {
        expect(hasPermission(role, 'users', 'update')).toBe(false);
      });

      it('should deny delete on users', () => {
        expect(hasPermission(role, 'users', 'delete')).toBe(false);
      });

      it('should allow read_own on analytics', () => {
        expect(hasPermission(role, 'analytics', 'read_own')).toBe(true);
      });

      it('should deny read_all on analytics', () => {
        expect(hasPermission(role, 'analytics', 'read_all')).toBe(false);
      });
    });

    describe('admin role', () => {
      const role: UserRole = 'admin';

      it('should allow all CRUD on clients', () => {
        expect(hasPermission(role, 'clients', 'create')).toBe(true);
        expect(hasPermission(role, 'clients', 'read')).toBe(true);
        expect(hasPermission(role, 'clients', 'update')).toBe(true);
        expect(hasPermission(role, 'clients', 'delete')).toBe(true);
      });

      it('should allow all CRUD on requests', () => {
        expect(hasPermission(role, 'requests', 'create')).toBe(true);
        expect(hasPermission(role, 'requests', 'read')).toBe(true);
        expect(hasPermission(role, 'requests', 'update')).toBe(true);
        expect(hasPermission(role, 'requests', 'delete')).toBe(true);
      });

      it('should allow all CRUD on quotes', () => {
        expect(hasPermission(role, 'quotes', 'create')).toBe(true);
        expect(hasPermission(role, 'quotes', 'read')).toBe(true);
        expect(hasPermission(role, 'quotes', 'update')).toBe(true);
        expect(hasPermission(role, 'quotes', 'delete')).toBe(true);
      });

      it('should allow all CRUD on users', () => {
        expect(hasPermission(role, 'users', 'create')).toBe(true);
        expect(hasPermission(role, 'users', 'read')).toBe(true);
        expect(hasPermission(role, 'users', 'update')).toBe(true);
        expect(hasPermission(role, 'users', 'delete')).toBe(true);
      });

      it('should allow read_all on analytics', () => {
        expect(hasPermission(role, 'analytics', 'read_all')).toBe(true);
      });
    });

    describe('customer role', () => {
      const role: UserRole = 'customer';

      it('should deny all actions on clients', () => {
        expect(hasPermission(role, 'clients', 'create')).toBe(false);
        expect(hasPermission(role, 'clients', 'read')).toBe(false);
        expect(hasPermission(role, 'clients', 'update')).toBe(false);
        expect(hasPermission(role, 'clients', 'delete')).toBe(false);
      });

      it('should allow read_own on requests', () => {
        expect(hasPermission(role, 'requests', 'read_own')).toBe(true);
      });

      it('should deny create/update/delete on requests', () => {
        expect(hasPermission(role, 'requests', 'create')).toBe(false);
        expect(hasPermission(role, 'requests', 'update')).toBe(false);
        expect(hasPermission(role, 'requests', 'delete')).toBe(false);
      });

      it('should allow read_own on quotes', () => {
        expect(hasPermission(role, 'quotes', 'read_own')).toBe(true);
      });

      it('should deny create/update/delete on quotes', () => {
        expect(hasPermission(role, 'quotes', 'create')).toBe(false);
        expect(hasPermission(role, 'quotes', 'update')).toBe(false);
        expect(hasPermission(role, 'quotes', 'delete')).toBe(false);
      });

      it('should allow read_own on users', () => {
        expect(hasPermission(role, 'users', 'read_own')).toBe(true);
      });

      it('should allow update_own on users', () => {
        expect(hasPermission(role, 'users', 'update_own')).toBe(true);
      });

      it('should deny all actions on analytics', () => {
        expect(hasPermission(role, 'analytics', 'read_own')).toBe(false);
        expect(hasPermission(role, 'analytics', 'read_all')).toBe(false);
      });
    });

    describe('operator role', () => {
      const role: UserRole = 'operator';

      it('should allow read on clients', () => {
        expect(hasPermission(role, 'clients', 'read')).toBe(true);
      });

      it('should deny create/update/delete on clients', () => {
        expect(hasPermission(role, 'clients', 'create')).toBe(false);
        expect(hasPermission(role, 'clients', 'update')).toBe(false);
        expect(hasPermission(role, 'clients', 'delete')).toBe(false);
      });

      it('should allow read and update on requests', () => {
        expect(hasPermission(role, 'requests', 'read')).toBe(true);
        expect(hasPermission(role, 'requests', 'update')).toBe(true);
      });

      it('should deny create/delete on requests', () => {
        expect(hasPermission(role, 'requests', 'create')).toBe(false);
        expect(hasPermission(role, 'requests', 'delete')).toBe(false);
      });

      it('should allow create/read/update on quotes', () => {
        expect(hasPermission(role, 'quotes', 'create')).toBe(true);
        expect(hasPermission(role, 'quotes', 'read')).toBe(true);
        expect(hasPermission(role, 'quotes', 'update')).toBe(true);
      });

      it('should deny delete on quotes', () => {
        expect(hasPermission(role, 'quotes', 'delete')).toBe(false);
      });

      it('should allow read on users', () => {
        expect(hasPermission(role, 'users', 'read')).toBe(true);
      });

      it('should deny create/update/delete on users', () => {
        expect(hasPermission(role, 'users', 'create')).toBe(false);
        expect(hasPermission(role, 'users', 'update')).toBe(false);
        expect(hasPermission(role, 'users', 'delete')).toBe(false);
      });

      it('should allow read_all on analytics', () => {
        expect(hasPermission(role, 'analytics', 'read_all')).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should return false for invalid role', () => {
        expect(hasPermission('invalid_role' as UserRole, 'clients', 'read')).toBe(false);
      });

      it('should return false for invalid resource', () => {
        expect(hasPermission('admin', 'invalid_resource' as Resource, 'read')).toBe(false);
      });

      it('should return false for invalid action', () => {
        expect(hasPermission('admin', 'clients', 'invalid_action' as Action)).toBe(false);
      });

      it('should handle null role', () => {
        expect(hasPermission(null as any, 'clients', 'read')).toBe(false);
      });

      it('should handle undefined role', () => {
        expect(hasPermission(undefined as any, 'clients', 'read')).toBe(false);
      });
    });
  });

  describe('PERMISSIONS constant', () => {
    it('should have all 4 roles defined', () => {
      expect(PERMISSIONS).toHaveProperty('sales_rep');
      expect(PERMISSIONS).toHaveProperty('admin');
      expect(PERMISSIONS).toHaveProperty('customer');
      expect(PERMISSIONS).toHaveProperty('operator');
    });

    it('should have all 5 resources for each role', () => {
      const roles: UserRole[] = ['sales_rep', 'admin', 'customer', 'operator'];
      const resources: Resource[] = ['clients', 'requests', 'quotes', 'users', 'analytics'];

      roles.forEach((role) => {
        resources.forEach((resource) => {
          expect(PERMISSIONS[role]).toHaveProperty(resource);
          expect(Array.isArray(PERMISSIONS[role]![resource])).toBe(true);
        });
      });
    });

    it('should have correct permissions for sales_rep', () => {
      expect(PERMISSIONS.sales_rep!.clients).toEqual(['create', 'read', 'update', 'delete']);
      expect(PERMISSIONS.sales_rep!.requests).toEqual(['create', 'read', 'update', 'delete']);
      expect(PERMISSIONS.sales_rep!.quotes).toEqual(['read', 'update']);
      expect(PERMISSIONS.sales_rep!.users).toEqual(['read_own', 'update_own']);
      expect(PERMISSIONS.sales_rep!.analytics).toEqual(['read_own']);
    });

    it('should have correct permissions for admin', () => {
      expect(PERMISSIONS.admin!.clients).toEqual(['create', 'read', 'update', 'delete']);
      expect(PERMISSIONS.admin!.requests).toEqual(['create', 'read', 'update', 'delete']);
      expect(PERMISSIONS.admin!.quotes).toEqual(['create', 'read', 'update', 'delete']);
      expect(PERMISSIONS.admin!.users).toEqual(['create', 'read', 'update', 'delete']);
      expect(PERMISSIONS.admin!.analytics).toEqual(['read_all']);
    });

    it('should have correct permissions for customer', () => {
      expect(PERMISSIONS.customer!.clients).toEqual([]);
      expect(PERMISSIONS.customer!.requests).toEqual(['read_own']);
      expect(PERMISSIONS.customer!.quotes).toEqual(['read_own']);
      expect(PERMISSIONS.customer!.users).toEqual(['read_own', 'update_own']);
      expect(PERMISSIONS.customer!.analytics).toEqual([]);
    });

    it('should have correct permissions for operator', () => {
      expect(PERMISSIONS.operator!.clients).toEqual(['read']);
      expect(PERMISSIONS.operator!.requests).toEqual(['read', 'update']);
      expect(PERMISSIONS.operator!.quotes).toEqual(['create', 'read', 'update']);
      expect(PERMISSIONS.operator!.users).toEqual(['read']);
      expect(PERMISSIONS.operator!.analytics).toEqual(['read_all']);
    });
  });
});

describe('RBAC Middleware - User Role Fetching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserRole()', () => {
    it('should fetch user role from database by clerk_user_id', async () => {
      const mockUserData = mockUser({ role: 'admin' });

      const mockSingleFn = vi.fn().mockResolvedValueOnce({
        data: mockUserData,
        error: null,
      });

      const mockEqFn = vi.fn().mockReturnValueOnce({ single: mockSingleFn });
      const mockSelectFn = vi.fn().mockReturnValueOnce({ eq: mockEqFn });
      mockSupabaseClient.from = vi.fn().mockReturnValueOnce({ select: mockSelectFn });

      const role = await getUserRole('user_123');

      expect(role).toBe('admin');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('iso_agents');
      expect(mockSelectFn).toHaveBeenCalledWith('role');
      expect(mockEqFn).toHaveBeenCalledWith('clerk_user_id', 'user_123');
    });

    it('should return null if user not found', async () => {
      const mockSingleFn = vi.fn().mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Row not found' },
      });
      const mockEqFn = vi.fn().mockReturnValueOnce({ single: mockSingleFn });
      const mockSelectFn = vi.fn().mockReturnValueOnce({ eq: mockEqFn });
      mockSupabaseClient.from = vi.fn().mockReturnValueOnce({ select: mockSelectFn });

      const role = await getUserRole('nonexistent_user');

      expect(role).toBeNull();
    });

    it('should return null on database error', async () => {
      const mockSingleFn = vi.fn().mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST500', message: 'Database error' },
      });
      const mockEqFn = vi.fn().mockReturnValueOnce({ single: mockSingleFn });
      const mockSelectFn = vi.fn().mockReturnValueOnce({ eq: mockEqFn });
      mockSupabaseClient.from = vi.fn().mockReturnValueOnce({ select: mockSelectFn });

      const role = await getUserRole('user_123');

      expect(role).toBeNull();
    });

    it('should handle different user roles', async () => {
      const roles: UserRole[] = ['sales_rep', 'admin', 'customer', 'operator'];

      for (const expectedRole of roles) {
        const mockSingleFn = vi.fn().mockResolvedValueOnce({
          data: mockUser({ role: expectedRole }),
          error: null,
        });
        const mockEqFn = vi.fn().mockReturnValueOnce({ single: mockSingleFn });
        const mockSelectFn = vi.fn().mockReturnValueOnce({ eq: mockEqFn });
        mockSupabaseClient.from = vi.fn().mockReturnValueOnce({ select: mockSelectFn });

        const role = await getUserRole('user_123');
        expect(role).toBe(expectedRole);
      }
    });

    it('should handle legacy iso_agent role', async () => {
      const mockSingleFn = vi.fn().mockResolvedValueOnce({
        data: mockUser({ role: 'iso_agent' }),
        error: null,
      });
      const mockEqFn = vi.fn().mockReturnValueOnce({ single: mockSingleFn });
      const mockSelectFn = vi.fn().mockReturnValueOnce({ eq: mockEqFn });
      mockSupabaseClient.from = vi.fn().mockReturnValueOnce({ select: mockSelectFn });

      const role = await getUserRole('user_123');

      // iso_agent should be mapped to sales_rep or handled appropriately
      expect(['iso_agent', 'sales_rep']).toContain(role);
    });
  });
});

describe('RBAC Middleware - Route Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('withRBAC()', () => {
    const mockHandler = vi.fn(async (req: NextRequest) => {
      return NextResponse.json({ success: true });
    });

    it('should return 401 if user not authenticated', async () => {
      mockAuthFn.mockResolvedValueOnce({ userId: null });

      const protectedHandler = withRBAC(mockHandler, {
        resource: 'clients',
        action: 'read',
      });

      const request = new NextRequest('http://localhost:3000/api/clients');
      const response = await protectedHandler(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should return 403 if user lacks permission', async () => {
      mockAuthFn.mockResolvedValueOnce({ userId: 'user_123' });

      const mockSingleFn = vi.fn().mockResolvedValueOnce({
        data: mockUser({ role: 'customer' }),
        error: null,
      });
      const mockEqFn = vi.fn().mockReturnValueOnce({ single: mockSingleFn });
      const mockSelectFn = vi.fn().mockReturnValueOnce({ eq: mockEqFn });
      mockSupabaseClient.from = vi.fn().mockReturnValueOnce({ select: mockSelectFn });

      const protectedHandler = withRBAC(mockHandler, {
        resource: 'clients',
        action: 'create',
      });

      const request = new NextRequest('http://localhost:3000/api/clients');
      const response = await protectedHandler(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Forbidden');
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should call handler if user has permission', async () => {
      mockAuthFn.mockResolvedValueOnce({ userId: 'user_123' });

      const mockSingleFn = vi.fn().mockResolvedValueOnce({
        data: mockUser({ role: 'admin' }),
        error: null,
      });
      const mockEqFn = vi.fn().mockReturnValueOnce({ single: mockSingleFn });
      const mockSelectFn = vi.fn().mockReturnValueOnce({ eq: mockEqFn });
      mockSupabaseClient.from = vi.fn().mockReturnValueOnce({ select: mockSelectFn });

      const protectedHandler = withRBAC(mockHandler, {
        resource: 'clients',
        action: 'create',
      });

      const request = new NextRequest('http://localhost:3000/api/clients');
      const response = await protectedHandler(request);

      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalled();
      expect(mockHandler.mock.calls[0][0]).toBe(request);
      expect((mockHandler.mock.calls[0] as any)[1]).toEqual({ userId: 'user_123', role: 'admin' });
    });

    it('should pass user info to handler context', async () => {
      mockAuthFn.mockResolvedValueOnce({ userId: 'user_123' });
      const mockUserData = mockUser({ role: 'sales_rep' });

      const mockSingleFn = vi.fn().mockResolvedValueOnce({
        data: mockUserData,
        error: null,
      });
      const mockEqFn = vi.fn().mockReturnValueOnce({ single: mockSingleFn });
      const mockSelectFn = vi.fn().mockReturnValueOnce({ eq: mockEqFn });
      mockSupabaseClient.from = vi.fn().mockReturnValueOnce({ select: mockSelectFn });

      const contextCapture = vi.fn();
      const handlerWithContext = vi.fn(async (req: NextRequest, context?: any) => {
        contextCapture(context);
        return NextResponse.json({ success: true });
      });

      const protectedHandler = withRBAC(handlerWithContext, {
        resource: 'clients',
        action: 'read',
      });

      const request = new NextRequest('http://localhost:3000/api/clients');
      await protectedHandler(request);

      expect(contextCapture).toHaveBeenCalled();
      const capturedContext = contextCapture.mock.calls[0][0];
      expect(capturedContext).toHaveProperty('userId', 'user_123');
      expect(capturedContext).toHaveProperty('role', 'sales_rep');
    });

    it('should handle multiple permission checks', async () => {
      mockAuthFn.mockResolvedValueOnce({ userId: 'user_123' });

      const mockSingleFn = vi.fn().mockResolvedValueOnce({
        data: mockUser({ role: 'operator' }),
        error: null,
      });
      const mockEqFn = vi.fn().mockReturnValueOnce({ single: mockSingleFn });
      const mockSelectFn = vi.fn().mockReturnValueOnce({ eq: mockEqFn });
      mockSupabaseClient.from = vi.fn().mockReturnValueOnce({ select: mockSelectFn });

      const protectedHandler = withRBAC(mockHandler, {
        resource: 'quotes',
        action: 'create',
      });

      const request = new NextRequest('http://localhost:3000/api/quotes');
      const response = await protectedHandler(request);

      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalled();
    });

    it('should return 500 on unexpected error', async () => {
      mockAuthFn.mockRejectedValueOnce(new Error('Auth service unavailable'));

      const protectedHandler = withRBAC(mockHandler, {
        resource: 'clients',
        action: 'read',
      });

      const request = new NextRequest('http://localhost:3000/api/clients');
      const response = await protectedHandler(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Internal server error');
    });
  });
});

describe('RBAC Middleware - Role Helpers', () => {
  describe('requireRoles()', () => {
    it('should return true if user has required role', () => {
      expect(requireRoles('admin', ['admin'])).toBe(true);
    });

    it('should return true if user has one of multiple required roles', () => {
      expect(requireRoles('admin', ['admin', 'sales_rep'])).toBe(true);
      expect(requireRoles('sales_rep', ['admin', 'sales_rep'])).toBe(true);
    });

    it('should return false if user does not have required role', () => {
      expect(requireRoles('customer', ['admin'])).toBe(false);
    });

    it('should return false if user has none of the required roles', () => {
      expect(requireRoles('customer', ['admin', 'sales_rep', 'operator'])).toBe(false);
    });

    it('should handle empty required roles array', () => {
      expect(requireRoles('admin', [])).toBe(true);
    });

    it('should handle null user role', () => {
      expect(requireRoles(null as any, ['admin'])).toBe(false);
    });

    it('should handle undefined user role', () => {
      expect(requireRoles(undefined as any, ['admin'])).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(requireRoles('Admin' as UserRole, ['admin'])).toBe(false);
    });
  });
});

describe('RBAC Middleware - Type Exports', () => {
  it('should export Resource type', () => {
    const resource: Resource = 'clients';
    expect(['clients', 'requests', 'quotes', 'users', 'analytics']).toContain(resource);
  });

  it('should export Action type', () => {
    const action: Action = 'create';
    expect(['create', 'read', 'update', 'delete', 'read_own', 'read_all']).toContain(action);
  });

  it('should export PermissionCheck type', () => {
    const check: PermissionCheck = {
      resource: 'clients',
      action: 'create',
    };
    expect(check).toHaveProperty('resource');
    expect(check).toHaveProperty('action');
  });
});
