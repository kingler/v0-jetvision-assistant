/**
 * @vitest-environment jsdom
 */

/**
 * RFQFlightCard Component Tests
 *
 * Tests for the RFQ flight card component that displays
 * individual flight options retrieved from Avinode RFQ.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RFQFlightCard, type RFQFlightCardProps } from '@/components/avinode/rfq-flight-card';

// =============================================================================
// TEST DATA
// =============================================================================

const mockFlight: RFQFlightCardProps['flight'] = {
  id: 'flight-001',
  quoteId: 'quote-abc123',
  departureAirport: {
    icao: 'KTEB',
    name: 'Teterboro Airport',
    city: 'Teterboro, NJ',
  },
  arrivalAirport: {
    icao: 'KVNY',
    name: 'Van Nuys Airport',
    city: 'Van Nuys, CA',
  },
  departureDate: '2025-01-15',
  departureTime: '09:00',
  flightDuration: '5h 30m',
  aircraftType: 'Heavy Jet',
  aircraftModel: 'Gulfstream G200',
  tailNumber: 'N123AB',
  yearOfManufacture: 2018,
  passengerCapacity: 10,
  tailPhotoUrl: 'https://example.com/g200.jpg',
  operatorName: 'Executive Jets LLC',
  operatorRating: 4.8,
  operatorEmail: 'ops@executivejets.com',
  totalPrice: 32500,
  currency: 'USD',
  priceBreakdown: {
    basePrice: 28000,
    taxes: 2500,
    fees: 2000,
  },
  validUntil: '2025-01-10',
  amenities: {
    wifi: true,
    pets: true,
    smoking: false,
    galley: true,
    lavatory: true,
    medical: false,
  },
  rfqStatus: 'quoted',
  lastUpdated: '2025-01-05T10:30:00Z',
  responseTimeMinutes: 45,
  isSelected: false,
};

const minimalFlight: RFQFlightCardProps['flight'] = {
  id: 'flight-002',
  quoteId: 'quote-def456',
  departureAirport: { icao: 'KJFK' },
  arrivalAirport: { icao: 'KLAX' },
  departureDate: '2025-02-20',
  flightDuration: '6h',
  aircraftType: 'Mid Jet',
  aircraftModel: 'Citation XLS',
  passengerCapacity: 8,
  operatorName: 'Sky Charter',
  totalPrice: 25000,
  currency: 'USD',
  amenities: {
    wifi: false,
    pets: false,
    smoking: false,
    galley: false,
    lavatory: true,
    medical: false,
  },
  rfqStatus: 'unanswered',
  lastUpdated: '2025-01-04T08:00:00Z',
};

// =============================================================================
// TESTS
// =============================================================================

describe('RFQFlightCard', () => {
  describe('Rendering', () => {
    it('renders with all flight details', () => {
      render(<RFQFlightCard flight={mockFlight} />);

      // Route visualization
      expect(screen.getByText('KTEB')).toBeInTheDocument();
      expect(screen.getByText('KVNY')).toBeInTheDocument();
      expect(screen.getByText('Teterboro Airport')).toBeInTheDocument();
      expect(screen.getByText('Van Nuys Airport')).toBeInTheDocument();

      // Aircraft details
      expect(screen.getByText('Gulfstream G200')).toBeInTheDocument();
      expect(screen.getByText('Heavy Jet')).toBeInTheDocument();
      expect(screen.getByText(/N123AB/)).toBeInTheDocument();
      expect(screen.getByText(/2018/)).toBeInTheDocument();
      expect(screen.getByText(/10 passengers/i)).toBeInTheDocument();

      // Operator info
      expect(screen.getByText('Executive Jets LLC')).toBeInTheDocument();
      expect(screen.getByText(/4.8/)).toBeInTheDocument();

      // Pricing - $32,500 displays as currency symbol, not "USD" text
      expect(screen.getByText(/\$32,500/)).toBeInTheDocument();

      // Flight duration
      expect(screen.getByText('5h 30m')).toBeInTheDocument();
    });

    it('renders with minimal flight data', () => {
      render(<RFQFlightCard flight={minimalFlight} />);

      expect(screen.getByText('KJFK')).toBeInTheDocument();
      expect(screen.getByText('KLAX')).toBeInTheDocument();
      expect(screen.getByText('Citation XLS')).toBeInTheDocument();
      expect(screen.getByText('Sky Charter')).toBeInTheDocument();
      expect(screen.getByText(/\$25,000/)).toBeInTheDocument();
    });

    it('renders aircraft image when provided', () => {
      render(<RFQFlightCard flight={mockFlight} />);

      const image = screen.getByRole('img', { name: /gulfstream g200/i });
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/g200.jpg');
    });

    it('renders placeholder when no aircraft image', () => {
      render(<RFQFlightCard flight={minimalFlight} />);

      // Should show plane icon placeholder
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      expect(screen.getByTestId('aircraft-placeholder')).toBeInTheDocument();
    });
  });

  describe('Status Badge', () => {
    it('displays quoted status badge', () => {
      render(<RFQFlightCard flight={mockFlight} />);

      const badge = screen.getByText(/quoted/i);
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-green-100', 'text-green-700');
    });

    it('displays unanswered status badge', () => {
      render(<RFQFlightCard flight={minimalFlight} />);

      const badge = screen.getByText(/unanswered/i);
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-amber-100', 'text-amber-700');
    });

    it('displays sent status badge', () => {
      const flight = { ...mockFlight, rfqStatus: 'sent' as const };
      render(<RFQFlightCard flight={flight} />);

      const badge = screen.getByText(/sent/i);
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-blue-100', 'text-blue-700');
    });

    it('displays declined status badge', () => {
      const flight = { ...mockFlight, rfqStatus: 'declined' as const };
      render(<RFQFlightCard flight={flight} />);

      const badge = screen.getByText(/declined/i);
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-red-100', 'text-red-700');
    });

    it('displays expired status badge', () => {
      const flight = { ...mockFlight, rfqStatus: 'expired' as const };
      render(<RFQFlightCard flight={flight} />);

      const badge = screen.getByText(/expired/i);
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-700');
    });
  });

  describe('Amenities', () => {
    it('displays enabled amenities', () => {
      render(<RFQFlightCard flight={mockFlight} />);

      // WiFi enabled
      expect(screen.getByTestId('amenity-wifi')).toHaveClass('text-green-600');
      // Pets enabled
      expect(screen.getByTestId('amenity-pets')).toHaveClass('text-green-600');
      // Galley enabled
      expect(screen.getByTestId('amenity-galley')).toHaveClass('text-green-600');
      // Lavatory enabled
      expect(screen.getByTestId('amenity-lavatory')).toHaveClass('text-green-600');
    });

    it('displays disabled amenities', () => {
      render(<RFQFlightCard flight={mockFlight} />);

      // Smoking disabled
      expect(screen.getByTestId('amenity-smoking')).toHaveClass('text-gray-300');
      // Medical disabled
      expect(screen.getByTestId('amenity-medical')).toHaveClass('text-gray-300');
    });
  });

  describe('Selection', () => {
    it('shows unchecked checkbox when not selected', () => {
      render(<RFQFlightCard flight={mockFlight} selectable />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });

    it('shows checked checkbox when selected', () => {
      const selectedFlight = { ...mockFlight, isSelected: true };
      render(<RFQFlightCard flight={selectedFlight} selectable />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('calls onSelect when checkbox is clicked', () => {
      const onSelect = vi.fn();
      render(<RFQFlightCard flight={mockFlight} selectable onSelect={onSelect} />);

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(onSelect).toHaveBeenCalledWith(mockFlight.id, true);
    });

    it('calls onSelect with false when deselecting', () => {
      const onSelect = vi.fn();
      const selectedFlight = { ...mockFlight, isSelected: true };
      render(<RFQFlightCard flight={selectedFlight} selectable onSelect={onSelect} />);

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(onSelect).toHaveBeenCalledWith(mockFlight.id, false);
    });

    it('hides checkbox when selectable is false', () => {
      render(<RFQFlightCard flight={mockFlight} selectable={false} />);

      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('applies selected styling when selected', () => {
      const selectedFlight = { ...mockFlight, isSelected: true };
      render(<RFQFlightCard flight={selectedFlight} selectable />);

      const card = screen.getByTestId('rfq-flight-card');
      expect(card).toHaveClass('ring-2', 'ring-blue-500');
    });
  });

  describe('Price Breakdown', () => {
    it('shows price breakdown on hover', async () => {
      render(<RFQFlightCard flight={mockFlight} showPriceBreakdown />);

      const priceSection = screen.getByTestId('price-section');
      fireEvent.mouseEnter(priceSection);

      expect(await screen.findByText(/Base:/)).toBeInTheDocument();
      expect(screen.getByText(/\$28,000/)).toBeInTheDocument();
      expect(screen.getByText(/Taxes:/)).toBeInTheDocument();
      expect(screen.getByText(/\$2,500/)).toBeInTheDocument();
      expect(screen.getByText(/Fees:/)).toBeInTheDocument();
      expect(screen.getByText(/\$2,000/)).toBeInTheDocument();
    });

    it('does not show breakdown when not provided', () => {
      render(<RFQFlightCard flight={minimalFlight} showPriceBreakdown />);

      const priceSection = screen.getByTestId('price-section');
      fireEvent.mouseEnter(priceSection);

      expect(screen.queryByText(/Base:/)).not.toBeInTheDocument();
    });
  });

  describe('Response Time', () => {
    it('displays response time when available', () => {
      render(<RFQFlightCard flight={mockFlight} />);

      expect(screen.getByText(/45 min response/i)).toBeInTheDocument();
    });

    it('does not display response time when not available', () => {
      render(<RFQFlightCard flight={minimalFlight} />);

      expect(screen.queryByText(/response/i)).not.toBeInTheDocument();
    });
  });

  describe('Quote Validity', () => {
    it('displays valid until date', () => {
      render(<RFQFlightCard flight={mockFlight} />);

      // The text contains "Valid until" and the date - use a more flexible matcher
      const validityElement = screen.getByText(/Valid until/i);
      expect(validityElement).toBeInTheDocument();
      // The date is in the same element
      expect(validityElement.textContent).toMatch(/Jan.*10.*2025/i);
    });

    it('does not display validity when not provided', () => {
      render(<RFQFlightCard flight={minimalFlight} />);

      expect(screen.queryByText(/Valid until/i)).not.toBeInTheDocument();
    });
  });

  describe('Date Formatting', () => {
    it('formats departure date correctly', () => {
      render(<RFQFlightCard flight={mockFlight} />);

      expect(screen.getByText(/Jan 15, 2025/i)).toBeInTheDocument();
    });

    it('shows departure time when available', () => {
      render(<RFQFlightCard flight={mockFlight} />);

      expect(screen.getByText(/09:00/)).toBeInTheDocument();
    });
  });

  describe('Last Updated', () => {
    it('displays last updated timestamp', () => {
      render(<RFQFlightCard flight={mockFlight} />);

      expect(screen.getByText(/Updated/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has accessible labels for amenities', () => {
      render(<RFQFlightCard flight={mockFlight} />);

      expect(screen.getByLabelText(/wifi/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/pets/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/smoking/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/galley/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/lavatory/i)).toBeInTheDocument();
    });

    it('has accessible checkbox label', () => {
      render(<RFQFlightCard flight={mockFlight} selectable />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('aria-label', 'Select flight from Executive Jets LLC');
    });
  });

  describe('Compact Mode', () => {
    it('renders in compact mode', () => {
      render(<RFQFlightCard flight={mockFlight} compact />);

      const card = screen.getByTestId('rfq-flight-card');
      expect(card).toHaveClass('h-auto');

      // Should still show essential info
      expect(screen.getByText('KTEB')).toBeInTheDocument();
      expect(screen.getByText('Gulfstream G200')).toBeInTheDocument();
      expect(screen.getByText(/\$32,500/)).toBeInTheDocument();
    });
  });

  // =============================================================================
  // NEW TESTS: Review and Book Button (replaces checkbox)
  // =============================================================================

  describe('Review and Book Button', () => {
    it('shows "Review and Book" button when showBookButton is true', () => {
      render(<RFQFlightCard flight={mockFlight} showBookButton />);

      const button = screen.getByRole('button', { name: /review and book/i });
      expect(button).toBeInTheDocument();
    });

    it('hides checkbox when showBookButton is true', () => {
      render(<RFQFlightCard flight={mockFlight} showBookButton selectable />);

      // Checkbox should not be present when showBookButton is true
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('enables button when rfqStatus is "quoted"', () => {
      const quotedFlight = { ...mockFlight, rfqStatus: 'quoted' as const };
      render(<RFQFlightCard flight={quotedFlight} showBookButton />);

      const button = screen.getByRole('button', { name: /review and book/i });
      expect(button).not.toBeDisabled();
    });

    it('disables button when rfqStatus is "unanswered"', () => {
      const unansweredFlight = { ...minimalFlight, rfqStatus: 'unanswered' as const };
      render(<RFQFlightCard flight={unansweredFlight} showBookButton />);

      const button = screen.getByRole('button', { name: /review and book/i });
      expect(button).toBeDisabled();
    });

    it('disables button when rfqStatus is "sent"', () => {
      const sentFlight = { ...mockFlight, rfqStatus: 'sent' as const };
      render(<RFQFlightCard flight={sentFlight} showBookButton />);

      const button = screen.getByRole('button', { name: /review and book/i });
      expect(button).toBeDisabled();
    });

    it('disables button when rfqStatus is "declined"', () => {
      const declinedFlight = { ...mockFlight, rfqStatus: 'declined' as const };
      render(<RFQFlightCard flight={declinedFlight} showBookButton />);

      const button = screen.getByRole('button', { name: /review and book/i });
      expect(button).toBeDisabled();
    });

    it('disables button when rfqStatus is "expired"', () => {
      const expiredFlight = { ...mockFlight, rfqStatus: 'expired' as const };
      render(<RFQFlightCard flight={expiredFlight} showBookButton />);

      const button = screen.getByRole('button', { name: /review and book/i });
      expect(button).toBeDisabled();
    });

    it('calls onReviewAndBook callback when button is clicked', () => {
      const onReviewAndBook = vi.fn();
      render(<RFQFlightCard flight={mockFlight} showBookButton onReviewAndBook={onReviewAndBook} />);

      const button = screen.getByRole('button', { name: /review and book/i });
      fireEvent.click(button);

      expect(onReviewAndBook).toHaveBeenCalledWith(mockFlight.id);
    });

    it('does not call onReviewAndBook when button is disabled', () => {
      const onReviewAndBook = vi.fn();
      const unansweredFlight = { ...minimalFlight, rfqStatus: 'unanswered' as const };
      render(<RFQFlightCard flight={unansweredFlight} showBookButton onReviewAndBook={onReviewAndBook} />);

      const button = screen.getByRole('button', { name: /review and book/i });
      fireEvent.click(button);

      expect(onReviewAndBook).not.toHaveBeenCalled();
    });

    it('shows "Awaiting Quote" text on disabled button when unanswered', () => {
      const unansweredFlight = { ...minimalFlight, rfqStatus: 'unanswered' as const };
      render(<RFQFlightCard flight={unansweredFlight} showBookButton />);

      expect(screen.getByText(/awaiting quote/i)).toBeInTheDocument();
    });

    it('shows "Quote Unavailable" text on disabled button when declined', () => {
      const declinedFlight = { ...mockFlight, rfqStatus: 'declined' as const };
      render(<RFQFlightCard flight={declinedFlight} showBookButton />);

      expect(screen.getByText(/quote unavailable/i)).toBeInTheDocument();
    });

    it('shows "Quote Expired" text on disabled button when expired', () => {
      const expiredFlight = { ...mockFlight, rfqStatus: 'expired' as const };
      render(<RFQFlightCard flight={expiredFlight} showBookButton />);

      expect(screen.getByText(/quote expired/i)).toBeInTheDocument();
    });

    it('has proper aria-label for accessibility', () => {
      render(<RFQFlightCard flight={mockFlight} showBookButton />);

      const button = screen.getByRole('button', { name: /review and book/i });
      expect(button).toHaveAttribute('aria-label', 'Review and book flight from Executive Jets LLC');
    });

    it('shows prominent status badge in card header', () => {
      render(<RFQFlightCard flight={mockFlight} showBookButton />);

      const badge = screen.getByTestId('status-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent(/quoted/i);
    });
  });

  // =============================================================================
  // NEW TESTS: Improved Card Layout
  // =============================================================================

  describe('Improved Card Layout', () => {
    it('has a well-structured card with proper sections', () => {
      render(<RFQFlightCard flight={mockFlight} showBookButton />);

      // Card should have test ID
      expect(screen.getByTestId('rfq-flight-card')).toBeInTheDocument();

      // Route section should be visible
      expect(screen.getByTestId('route-section')).toBeInTheDocument();

      // Aircraft section should be visible
      expect(screen.getByTestId('aircraft-section')).toBeInTheDocument();

      // Price section should be visible
      expect(screen.getByTestId('price-section')).toBeInTheDocument();
    });

    it('displays operator info in dedicated section', () => {
      render(<RFQFlightCard flight={mockFlight} showBookButton />);

      expect(screen.getByTestId('operator-section')).toBeInTheDocument();
      expect(screen.getByText('Executive Jets LLC')).toBeInTheDocument();
    });
  });
});
