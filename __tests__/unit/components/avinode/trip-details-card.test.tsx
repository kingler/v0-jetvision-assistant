/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { TripDetailsCard } from '@/components/avinode/trip-details-card';

describe('TripDetailsCard', () => {
  const mockProps = {
    tripId: 'atrip-64956156',
    displayTripId: 'N9J9VV',
    departureAirport: {
      icao: 'KTEB',
      name: 'Teterboro',
      city: 'NJ',
    },
    arrivalAirport: {
      icao: 'KVNY',
      name: 'Van Nuys',
      city: 'CA',
    },
    departureDate: '2025-12-20T00:00:00Z',
    departureTime: '09:00',
    timezone: 'local',
    passengers: 6,
    status: 'active' as const,
    buyer: {
      company: 'Jetvision LLC',
      contact: 'Kingler Bercy',
    },
  };

  describe('Extended Trip Details', () => {
    it('renders display trip ID alongside system trip ID', () => {
      render(<TripDetailsCard {...mockProps} />);

      expect(screen.getByText(/N9J9VV/i)).toBeInTheDocument();
      expect(screen.getByText(/atrip-64956156/i)).toBeInTheDocument();
    });

    it('renders trip ID format correctly', () => {
      render(<TripDetailsCard {...mockProps} />);

      // Should show "N9J9VV (atrip-64956156)"
      const tripIdText = screen.getByText(/N9J9VV \(atrip-64956156\)/i);
      expect(tripIdText).toBeInTheDocument();
    });

    it('renders only system trip ID when display ID is missing', () => {
      const propsWithoutDisplay = { ...mockProps, displayTripId: undefined };
      render(<TripDetailsCard {...propsWithoutDisplay} />);

      expect(screen.getByText(/atrip-64956156/i)).toBeInTheDocument();
      expect(screen.queryByText(/N9J9VV/i)).not.toBeInTheDocument();
    });

    it('renders departure time with date', () => {
      render(<TripDetailsCard {...mockProps} />);

      expect(screen.getByText(/09:00/i)).toBeInTheDocument();
    });

    it('renders timezone indicator', () => {
      render(<TripDetailsCard {...mockProps} />);

      expect(screen.getByText(/local/i)).toBeInTheDocument();
    });

    it('renders full departure datetime format', () => {
      render(<TripDetailsCard {...mockProps} />);

      // Should show "December 20, 2025 at 09:00 local"
      expect(screen.getByText(/at 09:00 local/i)).toBeInTheDocument();
    });

    it('renders date without time when time is not provided', () => {
      const propsWithoutTime = { ...mockProps, departureTime: undefined, timezone: undefined };
      render(<TripDetailsCard {...propsWithoutTime} />);

      // Should show date but not time
      expect(screen.getByText(/december \d+, 2025/i)).toBeInTheDocument();
      expect(screen.queryByText(/at \d+:\d+/i)).not.toBeInTheDocument();
    });

    it('renders buyer company name', () => {
      render(<TripDetailsCard {...mockProps} />);

      expect(screen.getByText(/Jetvision LLC/i)).toBeInTheDocument();
    });

    it('renders buyer contact name', () => {
      render(<TripDetailsCard {...mockProps} />);

      expect(screen.getByText(/Kingler Bercy/i)).toBeInTheDocument();
    });

    it('renders buyer field with company and contact', () => {
      render(<TripDetailsCard {...mockProps} />);

      // Should show "Jetvision LLC (Kingler Bercy)"
      expect(screen.getByText(/Jetvision LLC \(Kingler Bercy\)/i)).toBeInTheDocument();
    });

    it('does not render buyer field when buyer is not provided', () => {
      const propsWithoutBuyer = { ...mockProps, buyer: undefined };
      render(<TripDetailsCard {...propsWithoutBuyer} />);

      expect(screen.queryByText(/buyer/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Jetvision LLC/i)).not.toBeInTheDocument();
    });
  });

  describe('Card Title', () => {
    it('renders trip details title', () => {
      render(<TripDetailsCard {...mockProps} />);

      expect(screen.getByText(/trip details/i)).toBeInTheDocument();
    });

    it('renders clipboard icon', () => {
      const { container } = render(<TripDetailsCard {...mockProps} />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Base Trip Summary Features', () => {
    it('renders departure airport ICAO', () => {
      render(<TripDetailsCard {...mockProps} />);

      expect(screen.getByText(/KTEB/i)).toBeInTheDocument();
    });

    it('renders arrival airport ICAO', () => {
      render(<TripDetailsCard {...mockProps} />);

      expect(screen.getByText(/KVNY/i)).toBeInTheDocument();
    });

    it('renders departure airport details', () => {
      render(<TripDetailsCard {...mockProps} />);

      expect(screen.getByText(/Teterboro/i)).toBeInTheDocument();
      expect(screen.getByText(/NJ/i)).toBeInTheDocument();
    });

    it('renders arrival airport details', () => {
      render(<TripDetailsCard {...mockProps} />);

      expect(screen.getByText(/Van Nuys/i)).toBeInTheDocument();
      expect(screen.getByText(/Van Nuys, CA/i)).toBeInTheDocument();
    });

    it('renders passenger count', () => {
      render(<TripDetailsCard {...mockProps} />);

      // Check for passenger label and count together
      expect(screen.getByText(/passengers/i)).toBeInTheDocument();
      const passengerRow = screen.getByText(/passengers/i).closest('div');
      expect(passengerRow).toHaveTextContent('6');
    });

    it('renders status badge', () => {
      render(<TripDetailsCard {...mockProps} />);

      expect(screen.getByText(/active/i)).toBeInTheDocument();
    });
  });

  describe('Copy Functionality', () => {
    it('renders copy button', () => {
      render(<TripDetailsCard {...mockProps} />);

      const copyButton = screen.getByRole('button', { name: /copy/i });
      expect(copyButton).toBeInTheDocument();
    });

    it('calls onCopyTripId when copy button is clicked', async () => {
      const user = userEvent.setup();
      const onCopyTripId = vi.fn();
      render(<TripDetailsCard {...mockProps} onCopyTripId={onCopyTripId} />);

      const copyButton = screen.getByRole('button', { name: /copy/i });
      await user.click(copyButton);

      expect(onCopyTripId).toHaveBeenCalledTimes(1);
    });
  });

  describe('Layout', () => {
    it('renders as a card component', () => {
      const { container } = render(<TripDetailsCard {...mockProps} />);

      const card = container.querySelector('[data-slot="card"]');
      expect(card).toBeInTheDocument();
    });

    it('renders all fields in order', () => {
      render(<TripDetailsCard {...mockProps} />);

      // Check for key field labels
      expect(screen.getByText(/trip id/i)).toBeInTheDocument();
      expect(screen.getByText(/departure/i)).toBeInTheDocument();
      expect(screen.getByText(/passengers/i)).toBeInTheDocument();
      expect(screen.getByText(/buyer/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has accessible button for copy', () => {
      render(<TripDetailsCard {...mockProps} />);

      const copyButton = screen.getByRole('button', { name: /copy/i });
      expect(copyButton).toBeInTheDocument();
    });

    it('displays airport information in readable format', () => {
      render(<TripDetailsCard {...mockProps} />);

      // Airport details should be readable
      expect(screen.getByText(/Teterboro, NJ/i)).toBeInTheDocument();
      expect(screen.getByText(/Van Nuys, CA/i)).toBeInTheDocument();
    });
  });
});
