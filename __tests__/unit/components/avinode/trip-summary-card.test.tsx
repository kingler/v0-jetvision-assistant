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
});
