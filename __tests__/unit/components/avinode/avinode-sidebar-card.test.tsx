/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { AvinodeSidebarCard } from '@/components/avinode/avinode-sidebar-card';

describe('AvinodeSidebarCard', () => {
  const mockPropsStage1 = {
    tripId: 'atrip-64956156',
    status: 'active' as const,
    route: 'KTEB → KVNY',
    date: 'Dec 20, 2025',
    passengers: 6,
    primaryAction: {
      label: 'Search Flights in Avinode',
      href: 'https://sandbox.avinode.com/search',
    },
    lastUpdated: '2 minutes ago',
  };

  const mockPropsStage2 = {
    tripId: 'N9J9VV',
    status: 'pending' as const,
    route: 'KTEB → KVNY',
    date: 'Dec 20, 2025',
    passengers: 6,
    quote: {
      price: {
        amount: 37036.32,
        currency: 'USD',
      },
      operator: 'Prime Jet, LLC',
      aircraft: 'Gulfstream G-IV',
    },
    quickActions: [
      { label: 'View in Avinode', onClick: vi.fn() },
      { label: 'Send Message', onClick: vi.fn() },
      { label: 'Cancel Request', onClick: vi.fn() },
    ],
    lastUpdated: '5 minutes ago',
  };

  describe('Stage 1 (Active Trip)', () => {
    it('renders card title', () => {
      render(<AvinodeSidebarCard {...mockPropsStage1} />);

      expect(screen.getByText(/flight request/i)).toBeInTheDocument();
    });

    it('renders active status with icon', () => {
      render(<AvinodeSidebarCard {...mockPropsStage1} />);

      expect(screen.getByText(/active trip/i)).toBeInTheDocument();
      expect(screen.getByText(/🟢/)).toBeInTheDocument();
    });

    it('renders trip ID', () => {
      render(<AvinodeSidebarCard {...mockPropsStage1} />);

      expect(screen.getByText(/trip id/i)).toBeInTheDocument();
      expect(screen.getByText(/atrip-64956156/)).toBeInTheDocument();
    });

    it('renders route', () => {
      render(<AvinodeSidebarCard {...mockPropsStage1} />);

      expect(screen.getByText(/route/i)).toBeInTheDocument();
      expect(screen.getByText(/kteb → kvny/i)).toBeInTheDocument();
    });

    it('renders date', () => {
      render(<AvinodeSidebarCard {...mockPropsStage1} />);

      expect(screen.getByText(/date:/i)).toBeInTheDocument();
      expect(screen.getByText(/dec 20, 2025/i)).toBeInTheDocument();
    });

    it('renders passenger count', () => {
      render(<AvinodeSidebarCard {...mockPropsStage1} />);

      expect(screen.getByText(/passengers/i)).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();
    });

    it('renders primary action button', () => {
      render(<AvinodeSidebarCard {...mockPropsStage1} />);

      const actionButton = screen.getByRole('link', { name: /search flights in avinode/i });
      expect(actionButton).toBeInTheDocument();
      expect(actionButton).toHaveAttribute('href', mockPropsStage1.primaryAction.href);
    });

    it('renders last updated timestamp', () => {
      render(<AvinodeSidebarCard {...mockPropsStage1} />);

      expect(screen.getByText(/last updated: 2 minutes ago/i)).toBeInTheDocument();
    });

    it('does not render quote section in stage 1', () => {
      render(<AvinodeSidebarCard {...mockPropsStage1} />);

      expect(screen.queryByText(/quote/i)).not.toBeInTheDocument();
    });

    it('does not render quick actions in stage 1', () => {
      render(<AvinodeSidebarCard {...mockPropsStage1} />);

      expect(screen.queryByText(/quick actions/i)).not.toBeInTheDocument();
    });
  });

  describe('Stage 2 (With Quote)', () => {
    it('renders pending status with icon', () => {
      render(<AvinodeSidebarCard {...mockPropsStage2} />);

      expect(screen.getByText(/pending confirmation/i)).toBeInTheDocument();
      expect(screen.getByText(/🟡/)).toBeInTheDocument();
    });

    it('renders quote section', () => {
      render(<AvinodeSidebarCard {...mockPropsStage2} />);

      expect(screen.getByText(/quote/i)).toBeInTheDocument();
    });

    it('renders quote price', () => {
      render(<AvinodeSidebarCard {...mockPropsStage2} />);

      expect(screen.getByText(/\$37,036\.32 usd/i)).toBeInTheDocument();
    });

    it('renders quote operator and aircraft', () => {
      render(<AvinodeSidebarCard {...mockPropsStage2} />);

      expect(screen.getByText(/prime jet, llc • gulfstream g-iv/i)).toBeInTheDocument();
    });

    it('renders quick actions section', () => {
      render(<AvinodeSidebarCard {...mockPropsStage2} />);

      expect(screen.getByText(/quick actions/i)).toBeInTheDocument();
    });

    it('renders all quick action buttons', () => {
      render(<AvinodeSidebarCard {...mockPropsStage2} />);

      expect(screen.getByRole('button', { name: /view in avinode/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel request/i })).toBeInTheDocument();
    });

    it('calls quick action onClick when button is clicked', () => {
      const mockOnClick = vi.fn();
      const propsWithMock = {
        ...mockPropsStage2,
        quickActions: [
          { label: 'View in Avinode', onClick: mockOnClick },
        ],
      };
      render(<AvinodeSidebarCard {...propsWithMock} />);

      const button = screen.getByRole('button', { name: /view in avinode/i });
      button.click();

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('does not render primary action in stage 2', () => {
      render(<AvinodeSidebarCard {...mockPropsStage2} />);

      expect(screen.queryByRole('link', { name: /search flights/i })).not.toBeInTheDocument();
    });
  });

  describe('Status Variants', () => {
    it('renders completed status', () => {
      const completedProps = {
        ...mockPropsStage1,
        status: 'completed' as const,
      };
      render(<AvinodeSidebarCard {...completedProps} />);

      expect(screen.getByText(/completed/i)).toBeInTheDocument();
    });

    it('renders cancelled status', () => {
      const cancelledProps = {
        ...mockPropsStage1,
        status: 'cancelled' as const,
      };
      render(<AvinodeSidebarCard {...cancelledProps} />);

      expect(screen.getByText(/cancelled/i)).toBeInTheDocument();
    });
  });

  it('applies compact styling for sidebar', () => {
    const { container } = render(<AvinodeSidebarCard {...mockPropsStage1} />);

    // Sidebar cards should be compact
    const card = container.querySelector('[data-slot="card"]');
    expect(card).toBeInTheDocument();
  });

  it('renders plane icon in title', () => {
    const { container } = render(<AvinodeSidebarCard {...mockPropsStage1} />);

    const icons = container.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(0);
  });
});
