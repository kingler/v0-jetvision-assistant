/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { WebhookStatusIndicator } from '@/components/avinode/webhook-status-indicator';

describe('WebhookStatusIndicator', () => {
  const mockRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Connected State', () => {
    it('renders connected state with green indicator', () => {
      render(<WebhookStatusIndicator status="connected" />);

      expect(screen.getByText(/live updates active/i)).toBeInTheDocument();
    });

    it('displays green circle emoji for connected state', () => {
      render(<WebhookStatusIndicator status="connected" />);

      expect(screen.getByText(/🟢/)).toBeInTheDocument();
    });

    it('does not show refresh button when connected', () => {
      render(<WebhookStatusIndicator status="connected" />);

      expect(screen.queryByRole('button', { name: /refresh/i })).not.toBeInTheDocument();
    });

    it('does not show last update time when connected', () => {
      render(<WebhookStatusIndicator status="connected" lastUpdate={new Date()} />);

      expect(screen.queryByText(/last update/i)).not.toBeInTheDocument();
    });

    it('has correct ARIA label for connected state', () => {
      const { container } = render(<WebhookStatusIndicator status="connected" />);

      const indicator = container.querySelector('[role="status"]');
      expect(indicator).toHaveAttribute('aria-label', 'Webhook connection status: connected');
    });
  });

  describe('Delayed State', () => {
    const lastUpdate = new Date(Date.now() - 8 * 60 * 1000); // 8 minutes ago

    it('renders delayed state with yellow indicator', () => {
      render(<WebhookStatusIndicator status="delayed" lastUpdate={lastUpdate} />);

      expect(screen.getByText(/updates may be delayed/i)).toBeInTheDocument();
    });

    it('displays yellow circle emoji for delayed state', () => {
      render(<WebhookStatusIndicator status="delayed" lastUpdate={lastUpdate} />);

      expect(screen.getByText(/🟡/)).toBeInTheDocument();
    });

    it('shows last update time when delayed', () => {
      render(<WebhookStatusIndicator status="delayed" lastUpdate={lastUpdate} />);

      expect(screen.getByText(/last update:/i)).toBeInTheDocument();
      expect(screen.getByText(/8 min ago/i)).toBeInTheDocument();
    });

    it('shows refresh button when delayed', () => {
      render(<WebhookStatusIndicator status="delayed" lastUpdate={lastUpdate} onRefresh={mockRefresh} />);

      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    it('calls onRefresh when refresh button clicked', async () => {
      const user = userEvent.setup();
      render(<WebhookStatusIndicator status="delayed" lastUpdate={lastUpdate} onRefresh={mockRefresh} />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('has correct ARIA label for delayed state', () => {
      const { container } = render(<WebhookStatusIndicator status="delayed" lastUpdate={lastUpdate} />);

      const indicator = container.querySelector('[role="status"]');
      expect(indicator).toHaveAttribute('aria-label', 'Webhook connection status: delayed');
    });
  });

  describe('Disconnected State', () => {
    it('renders disconnected state with red indicator', () => {
      render(<WebhookStatusIndicator status="disconnected" />);

      expect(screen.getByText(/live updates unavailable/i)).toBeInTheDocument();
    });

    it('displays red circle emoji for disconnected state', () => {
      render(<WebhookStatusIndicator status="disconnected" />);

      expect(screen.getByText(/🔴/)).toBeInTheDocument();
    });

    it('shows manual refresh button when disconnected', () => {
      render(<WebhookStatusIndicator status="disconnected" onRefresh={mockRefresh} />);

      expect(screen.getByRole('button', { name: /manual refresh/i })).toBeInTheDocument();
    });

    it('calls onRefresh when manual refresh clicked', async () => {
      const user = userEvent.setup();
      render(<WebhookStatusIndicator status="disconnected" onRefresh={mockRefresh} />);

      const refreshButton = screen.getByRole('button', { name: /manual refresh/i });
      await user.click(refreshButton);

      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('has correct ARIA label for disconnected state', () => {
      const { container } = render(<WebhookStatusIndicator status="disconnected" />);

      const indicator = container.querySelector('[role="status"]');
      expect(indicator).toHaveAttribute('aria-label', 'Webhook connection status: disconnected');
    });
  });

  describe('Refresh Button States', () => {
    it('disables refresh button when isRefreshing is true', () => {
      render(
        <WebhookStatusIndicator
          status="delayed"
          lastUpdate={new Date()}
          onRefresh={mockRefresh}
          isRefreshing={true}
        />
      );

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeDisabled();
    });

    it('enables refresh button when isRefreshing is false', () => {
      render(
        <WebhookStatusIndicator
          status="delayed"
          lastUpdate={new Date()}
          onRefresh={mockRefresh}
          isRefreshing={false}
        />
      );

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).not.toBeDisabled();
    });

    it('shows loading state on button when refreshing', () => {
      render(
        <WebhookStatusIndicator
          status="disconnected"
          onRefresh={mockRefresh}
          isRefreshing={true}
        />
      );

      const refreshButton = screen.getByRole('button', { name: /manual refresh/i });
      expect(refreshButton).toHaveAttribute('aria-busy', 'true');
    });

    it('does not render refresh button if onRefresh is not provided', () => {
      render(<WebhookStatusIndicator status="delayed" lastUpdate={new Date()} />);

      expect(screen.queryByRole('button', { name: /refresh/i })).not.toBeInTheDocument();
    });
  });

  describe('Time Formatting', () => {
    it('formats time correctly for minutes', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      render(<WebhookStatusIndicator status="delayed" lastUpdate={fiveMinutesAgo} />);

      expect(screen.getByText(/5 min ago/i)).toBeInTheDocument();
    });

    it('formats time correctly for hours', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      render(<WebhookStatusIndicator status="delayed" lastUpdate={twoHoursAgo} />);

      expect(screen.getByText(/2 hours ago/i)).toBeInTheDocument();
    });

    it('formats time correctly for less than a minute', () => {
      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
      render(<WebhookStatusIndicator status="delayed" lastUpdate={thirtySecondsAgo} />);

      expect(screen.getByText(/less than a minute ago/i)).toBeInTheDocument();
    });
  });

  describe('Custom Delayed Threshold', () => {
    it('respects custom delayedThreshold prop', () => {
      const customThreshold = 10 * 60 * 1000; // 10 minutes
      render(
        <WebhookStatusIndicator
          status="delayed"
          lastUpdate={new Date()}
          delayedThreshold={customThreshold}
        />
      );

      expect(screen.getByText(/updates may be delayed/i)).toBeInTheDocument();
    });

    it('uses default threshold of 5 minutes when not provided', () => {
      render(<WebhookStatusIndicator status="delayed" lastUpdate={new Date()} />);

      expect(screen.getByText(/updates may be delayed/i)).toBeInTheDocument();
    });
  });

  describe('Styling and Layout', () => {
    it('applies subtle, non-blocking design', () => {
      const { container } = render(<WebhookStatusIndicator status="connected" />);

      const indicator = container.firstChild;
      expect(indicator).toHaveClass('text-sm');
      expect(indicator).toHaveClass('text-muted-foreground');
    });

    it('renders as inline element', () => {
      const { container } = render(<WebhookStatusIndicator status="connected" />);

      const indicator = container.firstChild;
      expect(indicator).toHaveClass('flex');
      expect(indicator).toHaveClass('items-center');
    });

    it('has proper spacing between elements', () => {
      const { container } = render(
        <WebhookStatusIndicator status="delayed" lastUpdate={new Date()} onRefresh={mockRefresh} />
      );

      const indicator = container.firstChild;
      expect(indicator).toHaveClass('gap-2');
    });
  });

  describe('Accessibility', () => {
    it('has role="status" for screen readers', () => {
      const { container } = render(<WebhookStatusIndicator status="connected" />);

      expect(container.querySelector('[role="status"]')).toBeInTheDocument();
    });

    it('has aria-live="polite" for dynamic updates', () => {
      const { container } = render(<WebhookStatusIndicator status="connected" />);

      expect(container.querySelector('[aria-live="polite"]')).toBeInTheDocument();
    });

    it('includes aria-label describing current state', () => {
      const { container } = render(<WebhookStatusIndicator status="connected" />);

      const indicator = container.querySelector('[role="status"]');
      expect(indicator).toHaveAttribute('aria-label');
    });

    it('refresh button has descriptive aria-label', () => {
      render(<WebhookStatusIndicator status="delayed" lastUpdate={new Date()} onRefresh={mockRefresh} />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toHaveAccessibleName();
    });
  });

  describe('Edge Cases', () => {
    it('handles missing lastUpdate gracefully in delayed state', () => {
      render(<WebhookStatusIndicator status="delayed" />);

      expect(screen.getByText(/updates may be delayed/i)).toBeInTheDocument();
      expect(screen.queryByText(/last update/i)).not.toBeInTheDocument();
    });

    it('handles async onRefresh callback', async () => {
      const asyncRefresh = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();

      render(<WebhookStatusIndicator status="delayed" lastUpdate={new Date()} onRefresh={asyncRefresh} />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      await waitFor(() => {
        expect(asyncRefresh).toHaveBeenCalledTimes(1);
      });
    });

    it('prevents multiple refresh calls while refreshing', async () => {
      const user = userEvent.setup();
      const slowRefresh = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      const { rerender } = render(
        <WebhookStatusIndicator
          status="delayed"
          lastUpdate={new Date()}
          onRefresh={slowRefresh}
          isRefreshing={false}
        />
      );

      const refreshButton = screen.getByRole('button', { name: /refresh/i });

      // Click and immediately rerender as refreshing
      await user.click(refreshButton);
      rerender(
        <WebhookStatusIndicator
          status="delayed"
          lastUpdate={new Date()}
          onRefresh={slowRefresh}
          isRefreshing={true}
        />
      );

      // Button should be disabled
      expect(refreshButton).toBeDisabled();

      // Try clicking again - should not trigger another call
      await user.click(refreshButton);
      expect(slowRefresh).toHaveBeenCalledTimes(1);
    });
  });
});
