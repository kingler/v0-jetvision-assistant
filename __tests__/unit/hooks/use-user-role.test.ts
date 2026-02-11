// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUserRole } from '@/lib/hooks/use-user-role';
import { useUser } from '@clerk/nextjs';

// Mock Clerk's useUser hook
vi.mock('@clerk/nextjs', () => ({
  useUser: vi.fn(),
}));

const mockUseUser = vi.mocked(useUser);

// Mock fetch
global.fetch = vi.fn();

describe('useUserRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null role and loading true initially', () => {
    mockUseUser.mockReturnValue({ user: { id: 'user-123' }, isLoaded: true } as any);

    const { result } = renderHook(() => useUserRole());

    expect(result.current.role).toBeNull();
    expect(result.current.loading).toBe(true);
    expect(result.current.isSalesRep).toBe(false);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isCustomer).toBe(false);
    expect(result.current.isOperator).toBe(false);
  });

  it('should fetch user role when user is loaded', async () => {
    mockUseUser.mockReturnValue({ user: { id: 'user-123' }, isLoaded: true } as any);

    const mockResponse = {
      ok: true,
      json: async () => ({ role: 'admin' }),
    };
    (global.fetch as any).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.role).toBe('admin');
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isSalesRep).toBe(false);
    expect(fetch).toHaveBeenCalledWith('/api/users/me');
  });

  it('should handle sales_rep role correctly', async () => {
    mockUseUser.mockReturnValue({ user: { id: 'user-123' }, isLoaded: true } as any);

    const mockResponse = {
      ok: true,
      json: async () => ({ role: 'sales_rep' }),
    };
    (global.fetch as any).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.role).toBe('sales_rep');
    expect(result.current.isSalesRep).toBe(true);
    expect(result.current.isAdmin).toBe(false);
  });

  it('should handle customer role correctly', async () => {
    mockUseUser.mockReturnValue({ user: { id: 'user-123' }, isLoaded: true } as any);

    const mockResponse = {
      ok: true,
      json: async () => ({ role: 'customer' }),
    };
    (global.fetch as any).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.role).toBe('customer');
    expect(result.current.isCustomer).toBe(true);
    expect(result.current.isAdmin).toBe(false);
  });

  it('should handle operator role correctly', async () => {
    mockUseUser.mockReturnValue({ user: { id: 'user-123' }, isLoaded: true } as any);

    const mockResponse = {
      ok: true,
      json: async () => ({ role: 'operator' }),
    };
    (global.fetch as any).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.role).toBe('operator');
    expect(result.current.isOperator).toBe(true);
    expect(result.current.isAdmin).toBe(false);
  });

  it('should handle fetch error gracefully', async () => {
    mockUseUser.mockReturnValue({ user: { id: 'user-123' }, isLoaded: true } as any);

    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.role).toBeNull();
    expect(result.current.isAdmin).toBe(false);
  });

  it('should not fetch if no user', () => {
    mockUseUser.mockReturnValue({ user: null, isLoaded: true } as any);

    renderHook(() => useUserRole());

    expect(fetch).not.toHaveBeenCalled();
  });

  it('should check permissions correctly for admin', async () => {
    mockUseUser.mockReturnValue({ user: { id: 'user-123' }, isLoaded: true } as any);

    const mockResponse = {
      ok: true,
      json: async () => ({ role: 'admin' }),
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
    mockUseUser.mockReturnValue({ user: { id: 'user-123' }, isLoaded: true } as any);

    const mockResponse = {
      ok: true,
      json: async () => ({ role: 'sales_rep' }),
    };
    (global.fetch as any).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Sales rep: quotes=['read','update'], no 'create'
    expect(result.current.hasPermission('quotes', 'read')).toBe(true);
    expect(result.current.hasPermission('quotes', 'update')).toBe(true);
    expect(result.current.hasPermission('quotes', 'create')).toBe(false);
    expect(result.current.hasPermission('users', 'delete')).toBe(false);
  });

  it('should normalize iso_agent to sales_rep (Clerk DB default)', async () => {
    mockUseUser.mockReturnValue({ user: { id: 'user-123' }, isLoaded: true } as any);

    // API returns 'iso_agent' (DB value), hook normalizes to 'sales_rep'
    const mockResponse = {
      ok: true,
      json: async () => ({ role: 'iso_agent' }),
    };
    (global.fetch as any).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // After normalization, role is 'sales_rep' — not 'iso_agent'
    expect(result.current.role).toBe('sales_rep');
    expect(result.current.isSalesRep).toBe(true);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.hasPermission('clients', 'create')).toBe(true);
    expect(result.current.hasPermission('quotes', 'read')).toBe(true);
    expect(result.current.hasPermission('quotes', 'create')).toBe(false);
    expect(result.current.hasPermission('users', 'delete')).toBe(false);
  });

  it('should check permissions correctly for customer', async () => {
    mockUseUser.mockReturnValue({ user: { id: 'user-123' }, isLoaded: true } as any);

    const mockResponse = {
      ok: true,
      json: async () => ({ role: 'customer' }),
    };
    (global.fetch as any).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Customer: quotes=['read_own'], users=['read_own','update_own']
    expect(result.current.hasPermission('quotes', 'read_own')).toBe(true);
    expect(result.current.hasPermission('quotes', 'read')).toBe(false);
    expect(result.current.hasPermission('quotes', 'create')).toBe(false);
    expect(result.current.hasPermission('users', 'read')).toBe(false);
  });
});
