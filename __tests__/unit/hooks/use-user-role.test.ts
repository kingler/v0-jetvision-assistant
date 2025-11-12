// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUserRole } from '@/lib/hooks/use-user-role';
import { UserRole } from '@/lib/types/database';

// Mock Clerk's useUser hook
vi.mock('@clerk/nextjs', () => ({
  useUser: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

describe('useUserRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null role and loading true initially', () => {
    const { useUser } = require('@clerk/nextjs');
    useUser.mockReturnValue({ user: { id: 'user-123' }, isLoaded: true });

    const { result } = renderHook(() => useUserRole());

    expect(result.current.role).toBeNull();
    expect(result.current.loading).toBe(true);
    expect(result.current.isSalesRep).toBe(false);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isCustomer).toBe(false);
    expect(result.current.isOperator).toBe(false);
  });

  it('should fetch user role when user is loaded', async () => {
    const { useUser } = require('@clerk/nextjs');
    useUser.mockReturnValue({ user: { id: 'user-123' }, isLoaded: true });

    const mockResponse = {
      ok: true,
      json: async () => ({ role: UserRole.ADMIN }),
    };
    (global.fetch as any).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.role).toBe(UserRole.ADMIN);
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isSalesRep).toBe(false);
    expect(fetch).toHaveBeenCalledWith('/api/users/me');
  });

  it('should handle sales_rep role correctly', async () => {
    const { useUser } = require('@clerk/nextjs');
    useUser.mockReturnValue({ user: { id: 'user-123' }, isLoaded: true });

    const mockResponse = {
      ok: true,
      json: async () => ({ role: UserRole.SALES_REP }),
    };
    (global.fetch as any).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.role).toBe(UserRole.SALES_REP);
    expect(result.current.isSalesRep).toBe(true);
    expect(result.current.isAdmin).toBe(false);
  });

  it('should handle customer role correctly', async () => {
    const { useUser } = require('@clerk/nextjs');
    useUser.mockReturnValue({ user: { id: 'user-123' }, isLoaded: true });

    const mockResponse = {
      ok: true,
      json: async () => ({ role: UserRole.CUSTOMER }),
    };
    (global.fetch as any).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.role).toBe(UserRole.CUSTOMER);
    expect(result.current.isCustomer).toBe(true);
    expect(result.current.isAdmin).toBe(false);
  });

  it('should handle operator role correctly', async () => {
    const { useUser } = require('@clerk/nextjs');
    useUser.mockReturnValue({ user: { id: 'user-123' }, isLoaded: true });

    const mockResponse = {
      ok: true,
      json: async () => ({ role: UserRole.OPERATOR }),
    };
    (global.fetch as any).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.role).toBe(UserRole.OPERATOR);
    expect(result.current.isOperator).toBe(true);
    expect(result.current.isAdmin).toBe(false);
  });

  it('should handle fetch error gracefully', async () => {
    const { useUser } = require('@clerk/nextjs');
    useUser.mockReturnValue({ user: { id: 'user-123' }, isLoaded: true });

    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.role).toBeNull();
    expect(result.current.isAdmin).toBe(false);
  });

  it('should not fetch if no user', () => {
    const { useUser } = require('@clerk/nextjs');
    useUser.mockReturnValue({ user: null, isLoaded: true });

    renderHook(() => useUserRole());

    expect(fetch).not.toHaveBeenCalled();
  });

  it('should check permissions correctly for admin', async () => {
    const { useUser } = require('@clerk/nextjs');
    useUser.mockReturnValue({ user: { id: 'user-123' }, isLoaded: true });

    const mockResponse = {
      ok: true,
      json: async () => ({ role: UserRole.ADMIN }),
    };
    (global.fetch as any).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Admin has all permissions
    expect(result.current.hasPermission('users', 'create')).toBe(true);
    expect(result.current.hasPermission('users', 'read')).toBe(true);
    expect(result.current.hasPermission('users', 'update')).toBe(true);
    expect(result.current.hasPermission('users', 'delete')).toBe(true);
  });

  it('should check permissions correctly for sales_rep', async () => {
    const { useUser } = require('@clerk/nextjs');
    useUser.mockReturnValue({ user: { id: 'user-123' }, isLoaded: true });

    const mockResponse = {
      ok: true,
      json: async () => ({ role: UserRole.SALES_REP }),
    };
    (global.fetch as any).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Sales rep has specific permissions
    expect(result.current.hasPermission('quotes', 'create')).toBe(true);
    expect(result.current.hasPermission('quotes', 'read')).toBe(true);
    expect(result.current.hasPermission('quotes', 'update')).toBe(true);
    expect(result.current.hasPermission('users', 'delete')).toBe(false);
  });

  it('should check permissions correctly for customer', async () => {
    const { useUser } = require('@clerk/nextjs');
    useUser.mockReturnValue({ user: { id: 'user-123' }, isLoaded: true });

    const mockResponse = {
      ok: true,
      json: async () => ({ role: UserRole.CUSTOMER }),
    };
    (global.fetch as any).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Customer has limited permissions
    expect(result.current.hasPermission('quotes', 'read')).toBe(true);
    expect(result.current.hasPermission('quotes', 'create')).toBe(false);
    expect(result.current.hasPermission('users', 'read')).toBe(false);
  });
});