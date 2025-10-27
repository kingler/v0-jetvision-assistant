import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfilePage from '@/app/settings/profile/page';
import { UserRole } from '@/lib/types/database';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
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

describe('ProfilePage', () => {
  const mockUser = {
    id: 'user-123',
    emailAddresses: [{ emailAddress: 'test@example.com' }],
    firstName: 'John',
    lastName: 'Doe',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    const { useUser } = require('@clerk/nextjs');
    const { useUserRole } = require('@/lib/hooks/use-user-role');

    useUser.mockReturnValue({
      user: mockUser,
      isLoaded: true,
    });

    useUserRole.mockReturnValue({
      role: UserRole.SALES_REP,
      loading: false,
      isSalesRep: true,
      isAdmin: false,
      isCustomer: false,
      isOperator: false,
      hasPermission: vi.fn(() => true),
    });
  });

  it('should render loading state initially', () => {
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

    render(<ProfilePage />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should display user profile information', async () => {
    const mockUserData = {
      id: 'user-123',
      clerk_id: 'clerk-123',
      email: 'test@example.com',
      name: 'John Doe',
      role: UserRole.SALES_REP,
      phone: '+1234567890',
      timezone: 'America/New_York',
      avatar_url: '/avatar.jpg',
      status: 'active',
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUserData,
    });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('+1234567890')).toBeInTheDocument();
      expect(screen.getByText('Sales Representative')).toBeInTheDocument();
    });
  });

  it('should allow editing profile fields', async () => {
    const mockUserData = {
      id: 'user-123',
      clerk_id: 'clerk-123',
      email: 'test@example.com',
      name: 'John Doe',
      role: UserRole.SALES_REP,
      phone: '+1234567890',
      timezone: 'America/New_York',
      avatar_url: '/avatar.jpg',
      status: 'active',
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUserData,
    });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    });

    const phoneInput = screen.getByLabelText(/phone/i);
    await userEvent.clear(phoneInput);
    await userEvent.type(phoneInput, '+9876543210');

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    expect(saveButton).toBeEnabled();
  });

  it('should handle profile update successfully', async () => {
    const { toast } = require('sonner');
    const mockUserData = {
      id: 'user-123',
      clerk_id: 'clerk-123',
      email: 'test@example.com',
      name: 'John Doe',
      role: UserRole.SALES_REP,
      phone: '+1234567890',
      timezone: 'America/New_York',
      avatar_url: '/avatar.jpg',
      status: 'active',
    };

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockUserData, phone: '+9876543210' }),
      });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('+1234567890')).toBeInTheDocument();
    });

    const phoneInput = screen.getByLabelText(/phone/i);
    await userEvent.clear(phoneInput);
    await userEvent.type(phoneInput, '+9876543210');

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Profile updated successfully');
    });
  });

  it('should handle profile update error', async () => {
    const { toast } = require('sonner');
    const mockUserData = {
      id: 'user-123',
      clerk_id: 'clerk-123',
      email: 'test@example.com',
      name: 'John Doe',
      role: UserRole.SALES_REP,
      phone: '+1234567890',
      timezone: 'America/New_York',
      avatar_url: '/avatar.jpg',
      status: 'active',
    };

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserData,
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Update failed' }),
      });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('+1234567890')).toBeInTheDocument();
    });

    const phoneInput = screen.getByLabelText(/phone/i);
    await userEvent.clear(phoneInput);
    await userEvent.type(phoneInput, '+9876543210');

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update profile');
    });
  });

  it('should show commission settings for sales_rep role', async () => {
    const mockUserData = {
      id: 'user-123',
      clerk_id: 'clerk-123',
      email: 'test@example.com',
      name: 'John Doe',
      role: UserRole.SALES_REP,
      phone: '+1234567890',
      timezone: 'America/New_York',
      avatar_url: '/avatar.jpg',
      status: 'active',
      commission_rate: 0.15,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUserData,
    });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText(/commission settings/i)).toBeInTheDocument();
      expect(screen.getByText('15%')).toBeInTheDocument();
    });
  });

  it('should show preferences for customer role', async () => {
    const { useUserRole } = require('@/lib/hooks/use-user-role');
    useUserRole.mockReturnValue({
      role: UserRole.CUSTOMER,
      loading: false,
      isSalesRep: false,
      isAdmin: false,
      isCustomer: true,
      isOperator: false,
      hasPermission: vi.fn(() => true),
    });

    const mockUserData = {
      id: 'user-123',
      clerk_id: 'clerk-123',
      email: 'test@example.com',
      name: 'John Doe',
      role: UserRole.CUSTOMER,
      phone: '+1234567890',
      timezone: 'America/New_York',
      avatar_url: '/avatar.jpg',
      status: 'active',
      preferences: {
        email_notifications: true,
        sms_notifications: false,
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUserData,
    });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText(/notification preferences/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email notifications/i)).toBeChecked();
      expect(screen.getByLabelText(/sms notifications/i)).not.toBeChecked();
    });
  });

  it('should handle avatar upload', async () => {
    const { toast } = require('sonner');
    const mockUserData = {
      id: 'user-123',
      clerk_id: 'clerk-123',
      email: 'test@example.com',
      name: 'John Doe',
      role: UserRole.SALES_REP,
      phone: '+1234567890',
      timezone: 'America/New_York',
      avatar_url: '/avatar.jpg',
      status: 'active',
    };

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ avatar_url: '/new-avatar.jpg' }),
      });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const file = new File(['avatar'], 'avatar.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(/change avatar/i);

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Avatar updated successfully');
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/users/me/avatar',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      })
    );
  });

  it('should validate timezone selection', async () => {
    const mockUserData = {
      id: 'user-123',
      clerk_id: 'clerk-123',
      email: 'test@example.com',
      name: 'John Doe',
      role: UserRole.SALES_REP,
      phone: '+1234567890',
      timezone: 'America/New_York',
      avatar_url: '/avatar.jpg',
      status: 'active',
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUserData,
    });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('America/New_York')).toBeInTheDocument();
    });

    const timezoneSelect = screen.getByLabelText(/timezone/i);
    await userEvent.selectOptions(timezoneSelect, 'Europe/London');

    expect(timezoneSelect).toHaveValue('Europe/London');
  });
});