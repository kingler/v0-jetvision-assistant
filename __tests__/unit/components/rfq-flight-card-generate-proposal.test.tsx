/**
 * @vitest-environment jsdom
 */

/**
 * Test: RFQFlightCard Generate Proposal Button
 *
 * Tests the "Generate Proposal" button functionality in the RFQFlightCard component.
 * The button should:
 * - Only appear when rfqStatus is 'quoted'
 * - Call onGenerateProposal callback with correct parameters when clicked
 * - Not appear for other statuses (sent, unanswered, declined, expired)
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RFQFlightCard, type RFQFlight } from '@/components/avinode/rfq-flight-card';

// Mock flight data for testing
const createMockFlight = (overrides: Partial<RFQFlight> = {}): RFQFlight => ({
  id: 'flight-001',
  quoteId: 'quote-001',
  departureAirport: {
    icao: 'KTEB',
    name: 'Teterboro Airport',
    city: 'Teterboro, NJ',
  },
  arrivalAirport: {
    icao: 'KLAX',
    name: 'Los Angeles International Airport',
    city: 'Los Angeles, CA',
  },
  departureDate: '2026-02-15',
  departureTime: '09:00',
  flightDuration: '5h 30m',
  aircraftType: 'Midsize Jet',
  aircraftModel: 'Citation Sovereign',
  tailNumber: 'N680PJ',
  yearOfManufacture: 2019,
  passengerCapacity: 9,
  operatorName: 'Panorama Jets',
  operatorRating: 4.7,
  operatorEmail: 'charter@panoramajets.com',
  totalPrice: 42500,
  currency: 'USD',
  priceBreakdown: {
    basePrice: 35000,
    fuelSurcharge: 3200,
    taxes: 2625,
    fees: 1675,
  },
  validUntil: '2026-02-01',
  amenities: {
    wifi: true,
    pets: true,
    smoking: false,
    galley: true,
    lavatory: true,
    medical: false,
  },
  rfqStatus: 'quoted',
  lastUpdated: new Date().toISOString(),
  responseTimeMinutes: 45,
  isSelected: false,
  ...overrides,
});

describe('RFQFlightCard - Generate Proposal Button', () => {
  let mockOnGenerateProposal: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnGenerateProposal = vi.fn();
    // Suppress console.log from component
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('Button Visibility', () => {
    it('should show "Generate Proposal" button when rfqStatus is "quoted"', () => {
      const flight = createMockFlight({ rfqStatus: 'quoted' });

      render(
        <RFQFlightCard
          flight={flight}
          onGenerateProposal={mockOnGenerateProposal}
        />
      );

      const button = screen.getByRole('button', { name: /generate.*proposal/i });
      expect(button).toBeInTheDocument();
    });

    it('should NOT show "Generate Proposal" button when rfqStatus is "sent"', () => {
      const flight = createMockFlight({ rfqStatus: 'sent' });

      render(
        <RFQFlightCard
          flight={flight}
          onGenerateProposal={mockOnGenerateProposal}
        />
      );

      const button = screen.queryByRole('button', { name: /generate.*proposal/i });
      expect(button).not.toBeInTheDocument();
    });

    it('should NOT show "Generate Proposal" button when rfqStatus is "unanswered"', () => {
      const flight = createMockFlight({ rfqStatus: 'unanswered' });

      render(
        <RFQFlightCard
          flight={flight}
          onGenerateProposal={mockOnGenerateProposal}
        />
      );

      const button = screen.queryByRole('button', { name: /generate.*proposal/i });
      expect(button).not.toBeInTheDocument();
    });

    it('should NOT show "Generate Proposal" button when rfqStatus is "declined"', () => {
      const flight = createMockFlight({ rfqStatus: 'declined' });

      render(
        <RFQFlightCard
          flight={flight}
          onGenerateProposal={mockOnGenerateProposal}
        />
      );

      const button = screen.queryByRole('button', { name: /generate.*proposal/i });
      expect(button).not.toBeInTheDocument();
    });

    it('should NOT show "Generate Proposal" button when rfqStatus is "expired"', () => {
      const flight = createMockFlight({ rfqStatus: 'expired' });

      render(
        <RFQFlightCard
          flight={flight}
          onGenerateProposal={mockOnGenerateProposal}
        />
      );

      const button = screen.queryByRole('button', { name: /generate.*proposal/i });
      expect(button).not.toBeInTheDocument();
    });

    it('should NOT show button when onGenerateProposal callback is not provided', () => {
      const flight = createMockFlight({ rfqStatus: 'quoted' });

      render(<RFQFlightCard flight={flight} />);

      const button = screen.queryByRole('button', { name: /generate.*proposal/i });
      expect(button).not.toBeInTheDocument();
    });
  });

  describe('Button Click Behavior', () => {
    it('should call onGenerateProposal with flight ID when clicked', () => {
      const flight = createMockFlight({
        id: 'test-flight-123',
        rfqStatus: 'quoted',
      });

      render(
        <RFQFlightCard
          flight={flight}
          onGenerateProposal={mockOnGenerateProposal}
        />
      );

      const button = screen.getByRole('button', { name: /generate.*proposal/i });
      fireEvent.click(button);

      expect(mockOnGenerateProposal).toHaveBeenCalledTimes(1);
      expect(mockOnGenerateProposal).toHaveBeenCalledWith('test-flight-123', undefined);
    });

    it('should call onGenerateProposal with flight ID and quoteId when provided', () => {
      const flight = createMockFlight({
        id: 'test-flight-456',
        quoteId: 'quote-789',
        rfqStatus: 'quoted',
      });

      render(
        <RFQFlightCard
          flight={flight}
          onGenerateProposal={mockOnGenerateProposal}
          quoteId="quote-789"
        />
      );

      const button = screen.getByRole('button', { name: /generate.*proposal/i });
      fireEvent.click(button);

      expect(mockOnGenerateProposal).toHaveBeenCalledTimes(1);
      expect(mockOnGenerateProposal).toHaveBeenCalledWith('test-flight-456', 'quote-789');
    });
  });

  describe('Button in Compact View', () => {
    it('should show "Generate Proposal" button in compact view when quoted', () => {
      const flight = createMockFlight({ rfqStatus: 'quoted' });

      render(
        <RFQFlightCard
          flight={flight}
          onGenerateProposal={mockOnGenerateProposal}
          compact={true}
        />
      );

      const button = screen.getByRole('button', { name: /generate.*proposal/i });
      expect(button).toBeInTheDocument();
    });

    it('should call onGenerateProposal when clicked in compact view', () => {
      const flight = createMockFlight({
        id: 'compact-flight-001',
        rfqStatus: 'quoted',
      });

      render(
        <RFQFlightCard
          flight={flight}
          onGenerateProposal={mockOnGenerateProposal}
          compact={true}
          quoteId="compact-quote-001"
        />
      );

      const button = screen.getByRole('button', { name: /generate.*proposal/i });
      fireEvent.click(button);

      expect(mockOnGenerateProposal).toHaveBeenCalledWith('compact-flight-001', 'compact-quote-001');
    });
  });

  describe('Flight Data Display', () => {
    it('should display correct aircraft model', () => {
      const flight = createMockFlight({
        aircraftModel: 'Citation Sovereign',
        rfqStatus: 'quoted',
      });

      render(
        <RFQFlightCard
          flight={flight}
          onGenerateProposal={mockOnGenerateProposal}
        />
      );

      expect(screen.getByText(/Citation Sovereign/)).toBeInTheDocument();
    });

    it('should display correct operator name', () => {
      const flight = createMockFlight({
        operatorName: 'Panorama Jets',
        rfqStatus: 'quoted',
      });

      render(
        <RFQFlightCard
          flight={flight}
          onGenerateProposal={mockOnGenerateProposal}
        />
      );

      expect(screen.getByText(/Panorama Jets/)).toBeInTheDocument();
    });

    it('should display correct price', () => {
      const flight = createMockFlight({
        totalPrice: 42500,
        currency: 'USD',
        rfqStatus: 'quoted',
      });

      render(
        <RFQFlightCard
          flight={flight}
          onGenerateProposal={mockOnGenerateProposal}
        />
      );

      // Price should be formatted as $42,500
      expect(screen.getByText(/\$42,500/)).toBeInTheDocument();
    });

    it('should display "Quoted" status badge', () => {
      const flight = createMockFlight({ rfqStatus: 'quoted' });

      render(
        <RFQFlightCard
          flight={flight}
          onGenerateProposal={mockOnGenerateProposal}
        />
      );

      expect(screen.getByText(/Quoted/i)).toBeInTheDocument();
    });
  });
});
