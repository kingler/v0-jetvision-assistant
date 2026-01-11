/**
 * RFQFlightCard Component Tests
 *
 * Tests for the showActionButtons logic and Generate Proposal button functionality
 *
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RFQFlightCard, type RFQFlight } from '@/components/avinode/rfq-flight-card';

/**
 * Mock flight data factory
 *
 * Note: RFQs always have a price from the initial quote request.
 * The status changes when the operator responds:
 * - 'sent'/'unanswered': RFQ sent, awaiting operator response
 * - 'quoted': Operator accepted/confirmed with message
 * - 'declined': Operator declined the request
 * - 'expired': Quote validity period ended
 */
function createMockFlight(overrides: Partial<RFQFlight> = {}): RFQFlight {
  return {
    id: 'flight-test-123',
    quoteId: 'aquote-123456',
    departureAirport: {
      icao: 'KDFW',
      name: 'Dallas/Fort Worth International',
      city: 'Dallas',
    },
    arrivalAirport: {
      icao: 'KDEN',
      name: 'Denver International',
      city: 'Denver',
    },
    departureDate: '2026-01-12',
    departureTime: '10:00',
    flightDuration: '2h 15m',
    aircraftType: 'Super midsize jet',
    aircraftModel: 'Challenger 350',
    tailNumber: 'N123AB',
    yearOfManufacture: 2022,
    passengerCapacity: 7,
    operatorName: 'Test Operator',
    operatorRating: 4.5,
    // Price is always present - it's part of the initial RFQ
    totalPrice: 34900,
    currency: 'USD',
    amenities: {
      wifi: true,
      pets: false,
      smoking: false,
      galley: true,
      lavatory: true,
      medical: false,
    },
    rfqStatus: 'quoted',
    lastUpdated: new Date().toISOString(),
    isSelected: false,
    ...overrides,
  };
}

describe('RFQFlightCard', () => {
  describe('showActionButtons logic', () => {
    it('should show Generate Proposal button when rfqStatus is "quoted"', () => {
      const mockOnGenerateProposal = vi.fn();
      const flight = createMockFlight({ rfqStatus: 'quoted' });

      render(
        <RFQFlightCard
          flight={flight}
          onGenerateProposal={mockOnGenerateProposal}
        />
      );

      // Button should be visible when status is 'quoted'
      const generateButton = screen.getByRole('button', { name: /generate.*proposal/i });
      expect(generateButton).toBeInTheDocument();
    });

    it('should show Generate Proposal button when rfqStatus is "quoted" regardless of hasMessages', () => {
      const mockOnGenerateProposal = vi.fn();
      const flight = createMockFlight({ rfqStatus: 'quoted' });

      // hasMessages=false should NOT affect button visibility
      render(
        <RFQFlightCard
          flight={flight}
          hasMessages={false}
          onGenerateProposal={mockOnGenerateProposal}
        />
      );

      // Button should still be visible - status 'quoted' is what matters
      const generateButton = screen.getByRole('button', { name: /generate.*proposal/i });
      expect(generateButton).toBeInTheDocument();
    });

    it('should NOT show Generate Proposal button when rfqStatus is "unanswered"', () => {
      const mockOnGenerateProposal = vi.fn();
      const flight = createMockFlight({ rfqStatus: 'unanswered' });

      render(
        <RFQFlightCard
          flight={flight}
          onGenerateProposal={mockOnGenerateProposal}
        />
      );

      // Button should NOT be visible - awaiting operator response
      const generateButton = screen.queryByRole('button', { name: /generate.*proposal/i });
      expect(generateButton).not.toBeInTheDocument();
    });

    it('should NOT show Generate Proposal button when rfqStatus is "sent"', () => {
      const mockOnGenerateProposal = vi.fn();
      const flight = createMockFlight({ rfqStatus: 'sent' });

      render(
        <RFQFlightCard
          flight={flight}
          onGenerateProposal={mockOnGenerateProposal}
        />
      );

      const generateButton = screen.queryByRole('button', { name: /generate.*proposal/i });
      expect(generateButton).not.toBeInTheDocument();
    });

    it('should NOT show Generate Proposal button when rfqStatus is "declined"', () => {
      const mockOnGenerateProposal = vi.fn();
      const flight = createMockFlight({ rfqStatus: 'declined' });

      render(
        <RFQFlightCard
          flight={flight}
          onGenerateProposal={mockOnGenerateProposal}
        />
      );

      const generateButton = screen.queryByRole('button', { name: /generate.*proposal/i });
      expect(generateButton).not.toBeInTheDocument();
    });

    it('should NOT show Generate Proposal button when rfqStatus is "expired"', () => {
      const mockOnGenerateProposal = vi.fn();
      const flight = createMockFlight({ rfqStatus: 'expired' });

      render(
        <RFQFlightCard
          flight={flight}
          onGenerateProposal={mockOnGenerateProposal}
        />
      );

      const generateButton = screen.queryByRole('button', { name: /generate.*proposal/i });
      expect(generateButton).not.toBeInTheDocument();
    });
  });

  describe('Generate Proposal button callback', () => {
    it('should call onGenerateProposal with flightId and quoteId when clicked', () => {
      const mockOnGenerateProposal = vi.fn();
      const flight = createMockFlight({
        id: 'flight-abc123',
        quoteId: 'aquote-789',
        rfqStatus: 'quoted',
      });

      render(
        <RFQFlightCard
          flight={flight}
          onGenerateProposal={mockOnGenerateProposal}
          quoteId="aquote-789"
        />
      );

      const generateButton = screen.getByRole('button', { name: /generate.*proposal/i });
      fireEvent.click(generateButton);

      expect(mockOnGenerateProposal).toHaveBeenCalledTimes(1);
      expect(mockOnGenerateProposal).toHaveBeenCalledWith('flight-abc123', 'aquote-789');
    });

    it('should not render Generate Proposal button if callback is not provided', () => {
      const flight = createMockFlight({ rfqStatus: 'quoted' });

      render(
        <RFQFlightCard
          flight={flight}
          // onGenerateProposal not provided
        />
      );

      // Button should not be visible if callback not provided
      const generateButton = screen.queryByRole('button', { name: /generate.*proposal/i });
      expect(generateButton).not.toBeInTheDocument();
    });
  });

  describe('rfqStatus badge display', () => {
    const statusTestCases: Array<{ status: RFQFlight['rfqStatus']; expectedText: string }> = [
      { status: 'quoted', expectedText: 'Quoted' },
      { status: 'unanswered', expectedText: 'Unanswered' },
      { status: 'sent', expectedText: 'Sent' },
      { status: 'declined', expectedText: 'Declined' },
      { status: 'expired', expectedText: 'Expired' },
    ];

    statusTestCases.forEach(({ status, expectedText }) => {
      it(`should display "${expectedText}" badge when rfqStatus is "${status}"`, () => {
        const flight = createMockFlight({ rfqStatus: status });

        render(<RFQFlightCard flight={flight} />);

        // Find the status badge
        const statusBadge = screen.getByTestId('rfq-status-badge');
        expect(statusBadge).toHaveTextContent(expectedText);
      });
    });
  });

  describe('Book Flight button', () => {
    it('should show Book Flight button when rfqStatus is "quoted"', () => {
      const mockOnBookFlight = vi.fn();
      const flight = createMockFlight({ rfqStatus: 'quoted' });

      render(
        <RFQFlightCard
          flight={flight}
          onBookFlight={mockOnBookFlight}
        />
      );

      const bookButton = screen.getByRole('button', { name: /book.*flight/i });
      expect(bookButton).toBeInTheDocument();
    });

    it('should call onBookFlight with flightId and quoteId when clicked', () => {
      const mockOnBookFlight = vi.fn();
      const flight = createMockFlight({
        id: 'flight-xyz',
        rfqStatus: 'quoted',
      });

      render(
        <RFQFlightCard
          flight={flight}
          onBookFlight={mockOnBookFlight}
          quoteId="aquote-456"
        />
      );

      const bookButton = screen.getByRole('button', { name: /book.*flight/i });
      fireEvent.click(bookButton);

      expect(mockOnBookFlight).toHaveBeenCalledWith('flight-xyz', 'aquote-456');
    });
  });

  describe('compact view with showActionButtons', () => {
    it('should show action buttons in compact view when rfqStatus is "quoted"', () => {
      const mockOnGenerateProposal = vi.fn();
      const mockOnBookFlight = vi.fn();
      const flight = createMockFlight({ rfqStatus: 'quoted' });

      render(
        <RFQFlightCard
          flight={flight}
          compact={true}
          onGenerateProposal={mockOnGenerateProposal}
          onBookFlight={mockOnBookFlight}
        />
      );

      // In compact view, buttons should appear when status is 'quoted'
      const generateButton = screen.getByRole('button', { name: /generate.*proposal/i });
      const bookButton = screen.getByRole('button', { name: /book.*flight/i });

      expect(generateButton).toBeInTheDocument();
      expect(bookButton).toBeInTheDocument();
    });
  });
});
