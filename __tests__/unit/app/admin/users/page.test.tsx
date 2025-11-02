// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminUsersPage from '@/app/admin/users/page';
import { UserRole } from '@/lib/types/database';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  redirect: vi.fn(),
}));

// Mock Clerk
vi.mock('@clerk/nextjs', () => ({
  useUser: vi.fn(),
}));

// Mock useUserRole hook
vi.mock('@/lib/hooks/use-user-role', () => ({
  useUserRole: vi.fn(),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe('AdminUsersPage', () => {
  const mockUsers = [
    {
      id: 'user-1',
      clerk_id: 'clerk-1',
      email: 'admin@example.com',
      name: 'Admin User',
      role: UserRole.ADMIN,
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'user-2',
      clerk_id: 'clerk-2',
      email: 'sales@example.com',
      name: 'Sales Rep',
      role: UserRole.SALES_REP,
      status: 'active',
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    },
    {
      id: 'user-3',
      clerk_id: 'clerk-3',
      email: 'customer@example.com',
      name: 'Customer User',
      role: UserRole.CUSTOMER,
      status: 'inactive',
      created_at: '2024-01-03T00:00:00Z',
      updated_at: '2024-01-03T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    const { useUser } = require('@clerk/nextjs');
    const { useUserRole } = require('@/lib/hooks/use-user-role');

    useUser.mockReturnValue({
      user: { id: 'admin-user' },
      isLoaded: true,
    });

    useUserRole.mockReturnValue({
      role: UserRole.ADMIN,
      loading: false,
      isSalesRep: false,
      isAdmin: true,
      isCustomer: false,
      isOperator: false,
      hasPermission: vi.fn(() => true),
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockUsers,
    });
  });

  it('should redirect non-admin users', () => {
    const { redirect } = require('next/navigation');
    const { useUserRole } = require('@/lib/hooks/use-user-role');

    useUserRole.mockReturnValue({
      role: UserRole.CUSTOMER,
      loading: false,
      isSalesRep: false,
      isAdmin: false,
      isCustomer: true,
      isOperator: false,
      hasPermission: vi.fn(() => false),
    });

    render(<AdminUsersPage />);
    expect(redirect).toHaveBeenCalledWith('/dashboard');
  });

  it('should display loading state initially', () => {
    const { useUserRole } = require('@/lib/hooks/use-user-role');

    useUserRole.mockReturnValue({
      role: null,
      loading: true,
      isSalesRep: false,
      isAdmin: false,
      isCustomer: false,
      isOperator: false,
      hasPermission: vi.fn(),
    });

    render(<AdminUsersPage />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should display list of users', async () => {
    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      expect(screen.getByText('Sales Rep')).toBeInTheDocument();
      expect(screen.getByText('sales@example.com')).toBeInTheDocument();
      expect(screen.getByText('Customer User')).toBeInTheDocument();
      expect(screen.getByText('customer@example.com')).toBeInTheDocument();
    });
  });

  it('should display user roles with badges', async () => {
    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Admin', { selector: '.badge' })).toBeInTheDocument();
      expect(screen.getByText('Sales Rep', { selector: '.badge' })).toBeInTheDocument();
      expect(screen.getByText('Customer', { selector: '.badge' })).toBeInTheDocument();
    });
  });

  it('should display user status indicators', async () => {
    render(<AdminUsersPage />);

    await waitFor(() => {
      const activeStatuses = screen.getAllByText('Active');
      expect(activeStatuses).toHaveLength(2);
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });
  });

  it('should filter users by search term', async () => {
    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search users/i);
    await userEvent.type(searchInput, 'sales');

    await waitFor(() => {
      expect(screen.queryByText('Admin User')).not.toBeInTheDocument();
      expect(screen.getByText('Sales Rep')).toBeInTheDocument();
      expect(screen.queryByText('Customer User')).not.toBeInTheDocument();
    });
  });

  it('should filter users by role', async () => {
    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
      expect(screen.getByText('Sales Rep')).toBeInTheDocument();
      expect(screen.getByText('Customer User')).toBeInTheDocument();
    });

    const roleFilter = screen.getByLabelText(/filter by role/i);
    await userEvent.selectOptions(roleFilter, UserRole.ADMIN);

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
      expect(screen.queryByText('Sales Rep')).not.toBeInTheDocument();
      expect(screen.queryByText('Customer User')).not.toBeInTheDocument();
    });
  });

  it('should toggle user active status', async () => {
    const { toast } = require('sonner');

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsers,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockUsers[2], status: 'active' }),
      });

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Customer User')).toBeInTheDocument();
    });

    const inactiveUser = mockUsers[2];
    const toggleButton = screen.getByTestId(`toggle-status-${inactiveUser.id}`);
    await userEvent.click(toggleButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('User status updated successfully');
    });

    expect(fetch).toHaveBeenCalledWith(
      `/api/users/${inactiveUser.id}`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'active' }),
      })
    );
  });

  it('should handle status toggle error', async () => {
    const { toast } = require('sonner');

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsers,
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to update status' }),
      });

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Customer User')).toBeInTheDocument();
    });

    const inactiveUser = mockUsers[2];
    const toggleButton = screen.getByTestId(`toggle-status-${inactiveUser.id}`);
    await userEvent.click(toggleButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update user status');
    });
  });

  it('should display user created date', async () => {
    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText(/jan 1, 2024/i)).toBeInTheDocument();
      expect(screen.getByText(/jan 2, 2024/i)).toBeInTheDocument();
      expect(screen.getByText(/jan 3, 2024/i)).toBeInTheDocument();
    });
  });

  it('should have responsive table design', async () => {
    render(<AdminUsersPage />);

    await waitFor(() => {
      const table = screen.getByRole('table');
      expect(table).toHaveClass('responsive-table');
    });
  });

  it('should display empty state when no users', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText(/no users found/i)).toBeInTheDocument();
    });
  });

  it('should handle fetch error gracefully', async () => {
    const { toast } = require('sonner');

    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to load users');
      expect(screen.getByText(/failed to load users/i)).toBeInTheDocument();
    });
  });

  it('should refresh data when refresh button clicked', async () => {
    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await userEvent.click(refreshButton);

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenLastCalledWith('/api/users');
  });
});