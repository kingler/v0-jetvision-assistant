/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { TripSummaryCard } from '@/components/avinode/trip-summary-card';

describe('TripSummaryCard', () => {
  const mockProps = {
    tripId: 'atrip-64956156',
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
    departureDate: '2025-12-20',
    passengers: 6,
    status: 'active' as const,
  };

  it('renders trip ID with copy button', () => {
    render(<TripSummaryCard {...mockProps} />);

    expect(screen.getByText(/atrip-64956156/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
  });

  it('renders departure airport information', () => {
    render(<TripSummaryCard {...mockProps} />);

    expect(screen.getByText('KTEB')).toBeInTheDocument();
    expect(screen.getByText(/Teterboro/i)).toBeInTheDocument();
    expect(screen.getByText(/NJ/i)).toBeInTheDocument();
  });

  it('renders arrival airport information', () => {
    render(<TripSummaryCard {...mockProps} />);

    expect(screen.getByText('KVNY')).toBeInTheDocument();
    expect(screen.getByText(/Van Nuys/i)).toBeInTheDocument();
    expect(screen.getByText(/CA/i)).toBeInTheDocument();
  });

  it('renders departure date formatted correctly', () => {
    render(<TripSummaryCard {...mockProps} />);

    // Should format as "December 20, 2025"
    expect(screen.getByText(/December 20, 2025/i)).toBeInTheDocument();
  });

  it('renders passenger count', () => {
    render(<TripSummaryCard {...mockProps} />);

    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('renders active status badge', () => {
    render(<TripSummaryCard {...mockProps} />);

    const statusBadge = screen.getByText(/active/i);
    expect(statusBadge).toBeInTheDocument();
  });

  it('renders trip details title', () => {
    render(<TripSummaryCard {...mockProps} />);

    expect(screen.getByText(/trip details/i)).toBeInTheDocument();
  });

  it('calls onCopyTripId when copy button is clicked', () => {
    const onCopyTripId = vi.fn();
    render(<TripSummaryCard {...mockProps} onCopyTripId={onCopyTripId} />);

    const copyButton = screen.getByRole('button', { name: /copy/i });
    copyButton.click();

    expect(onCopyTripId).toHaveBeenCalledTimes(1);
  });

  it('renders flight route visualization', () => {
    const { container } = render(<TripSummaryCard {...mockProps} />);

    // Should have departure icon, flight path, and arrival icon
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders One-Way badge by default', () => {
    render(<TripSummaryCard {...mockProps} />);
    expect(screen.getByText('One-Way')).toBeInTheDocument();
  });

  it('renders Round-Trip badge when tripType is round_trip', () => {
    render(
      <TripSummaryCard
        {...mockProps}
        tripType="round_trip"
        returnDate="2025-12-25"
      />
    );
    expect(screen.getByText('Round-Trip')).toBeInTheDocument();
    expect(screen.queryByText('One-Way')).not.toBeInTheDocument();
  });

  it('renders return route for round-trip', () => {
    render(
      <TripSummaryCard
        {...mockProps}
        tripType="round_trip"
        returnDate="2025-12-25"
      />
    );
    // "Outbound" and "Return" labels appear in the route sections
    expect(screen.getAllByText('Outbound').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Return').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/December 25, 2025/i)).toBeInTheDocument();
  });

  it('renders Multi-City badge when tripType is multi_city', () => {
    render(
      <TripSummaryCard
        {...mockProps}
        tripType="multi_city"
        segments={[
          {
            departureAirport: { icao: 'KTEB', name: 'Teterboro', city: 'NJ' },
            arrivalAirport: { icao: 'EGGW', name: 'London Luton', city: 'London' },
            departureDate: '2025-12-20',
            passengers: 4,
          },
          {
            departureAirport: { icao: 'EGGW', name: 'London Luton', city: 'London' },
            arrivalAirport: { icao: 'LFPB', name: 'Le Bourget', city: 'Paris' },
            departureDate: '2025-12-22',
            passengers: 4,
          },
          {
            departureAirport: { icao: 'LFPB', name: 'Le Bourget', city: 'Paris' },
            arrivalAirport: { icao: 'KTEB', name: 'Teterboro', city: 'NJ' },
            departureDate: '2025-12-25',
            passengers: 4,
          },
        ]}
      />
    );
    expect(screen.getByText('Multi-City')).toBeInTheDocument();
    expect(screen.queryByText('One-Way')).not.toBeInTheDocument();
  });

  it('renders all segment legs for multi-city trip', () => {
    render(
      <TripSummaryCard
        {...mockProps}
        tripType="multi_city"
        segments={[
          {
            departureAirport: { icao: 'KTEB', name: 'Teterboro', city: 'NJ' },
            arrivalAirport: { icao: 'EGGW', name: 'London Luton', city: 'London' },
            departureDate: '2025-12-20',
            passengers: 4,
          },
          {
            departureAirport: { icao: 'EGGW', name: 'London Luton', city: 'London' },
            arrivalAirport: { icao: 'LFPB', name: 'Le Bourget', city: 'Paris' },
            departureDate: '2025-12-22',
            passengers: 4,
          },
        ]}
      />
    );
    expect(screen.getByText('Leg 1')).toBeInTheDocument();
    expect(screen.getByText('Leg 2')).toBeInTheDocument();
    // EGGW appears in both segments
    expect(screen.getAllByText('EGGW').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('LFPB').length).toBeGreaterThanOrEqual(1);
  });
});
