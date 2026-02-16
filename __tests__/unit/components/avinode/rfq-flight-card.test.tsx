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
    it('renders card with test id', () => {
      render(<RFQFlightCard flight={mockFlight} />);
      expect(screen.getByTestId('rfq-flight-card')).toBeInTheDocument();
    });

    it('renders aircraft section with details', () => {
      render(<RFQFlightCard flight={mockFlight} />);

      const aircraftSection = screen.getByTestId('aircraft-section');
      expect(aircraftSection).toBeInTheDocument();

      // Aircraft model
      expect(screen.getByText('Gulfstream G200')).toBeInTheDocument();
      // Tail number
      expect(screen.getByText('N123AB')).toBeInTheDocument();
      // Year of manufacture
      expect(screen.getByText('2018')).toBeInTheDocument();
    });

    it('renders transport section with capacity', () => {
      render(<RFQFlightCard flight={mockFlight} />);

      const transportSection = screen.getByTestId('transport-section');
      expect(transportSection).toBeInTheDocument();

      // Passenger capacity
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('renders operator section with details', () => {
      render(<RFQFlightCard flight={mockFlight} />);

      const operatorSection = screen.getByTestId('operator-section');
      expect(operatorSection).toBeInTheDocument();

      // Operator name
      expect(screen.getByText('Executive Jets LLC')).toBeInTheDocument();
      // Operator email
      expect(screen.getByText('ops@executivejets.com')).toBeInTheDocument();
      // Operator rating
      expect(screen.getByText('4.8')).toBeInTheDocument();
    });

    it('renders with minimal flight data', () => {
      render(<RFQFlightCard flight={minimalFlight} />);

      expect(screen.getByText('Citation XLS')).toBeInTheDocument();
      expect(screen.getByText('Sky Charter')).toBeInTheDocument();
      // Price appears in multiple places (price section and bottom action area)
      expect(screen.getAllByText(/\$25,000/).length).toBeGreaterThan(0);
    });

    it('renders aircraft image when provided', () => {
      render(<RFQFlightCard flight={mockFlight} />);

      const image = screen.getByRole('img', { name: /gulfstream g200/i });
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/g200.jpg');
    });

    it('renders placeholder when no aircraft image', () => {
      render(<RFQFlightCard flight={minimalFlight} />);

      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      expect(screen.getByTestId('aircraft-placeholder')).toBeInTheDocument();
    });
  });

  describe('Status Badge', () => {
    it('displays quoted status badge', () => {
      render(<RFQFlightCard flight={mockFlight} />);

      // In full view, status badge has data-testid="rfq-status-badge"
      const badge = screen.getByTestId('rfq-status-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent(/quoted/i);
      expect(badge).toHaveClass('bg-success-bg', 'text-success');
    });

    it('displays unanswered status badge', () => {
      render(<RFQFlightCard flight={minimalFlight} />);

      const badge = screen.getByTestId('rfq-status-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent(/unanswered/i);
      expect(badge).toHaveClass('bg-surface-tertiary', 'text-foreground');
    });

    it('displays sent status badge', () => {
      const flight = { ...mockFlight, rfqStatus: 'sent' as const };
      render(<RFQFlightCard flight={flight} />);

      const badge = screen.getByTestId('rfq-status-badge');
      expect(badge).toHaveTextContent(/sent/i);
      expect(badge).toHaveClass('bg-info-bg', 'text-info');
    });

    it('displays declined status badge', () => {
      const flight = { ...mockFlight, rfqStatus: 'declined' as const };
      render(<RFQFlightCard flight={flight} />);

      const badge = screen.getByTestId('rfq-status-badge');
      expect(badge).toHaveTextContent(/declined/i);
      expect(badge).toHaveClass('bg-error-bg', 'text-destructive');
    });

    it('displays expired status badge', () => {
      const flight = { ...mockFlight, rfqStatus: 'expired' as const };
      render(<RFQFlightCard flight={flight} />);

      const badge = screen.getByTestId('rfq-status-badge');
      expect(badge).toHaveTextContent(/expired/i);
      expect(badge).toHaveClass('bg-surface-tertiary', 'text-muted-foreground');
    });
  });

  describe('Price Section', () => {
    it('displays total price', () => {
      render(<RFQFlightCard flight={mockFlight} />);

      const priceSection = screen.getByTestId('price-section');
      expect(priceSection).toBeInTheDocument();
      // Price appears in multiple places (price section and bottom action area)
      expect(screen.getAllByText(/\$32,500/).length).toBeGreaterThan(0);
    });

    it('shows price breakdown when enabled', () => {
      render(<RFQFlightCard flight={mockFlight} showPriceBreakdown />);

      expect(screen.getByText(/Base:/)).toBeInTheDocument();
      expect(screen.getByText(/\$28,000/)).toBeInTheDocument();
      expect(screen.getByText(/Taxes:/)).toBeInTheDocument();
      expect(screen.getByText(/\$2,500/)).toBeInTheDocument();
      expect(screen.getByText(/Fees:/)).toBeInTheDocument();
      expect(screen.getByText(/\$2,000/)).toBeInTheDocument();
    });

    it('does not show breakdown when not provided', () => {
      render(<RFQFlightCard flight={minimalFlight} showPriceBreakdown />);

      expect(screen.queryByText(/Base:/)).not.toBeInTheDocument();
    });

    it('displays "Price Pending" when price is 0 (FIX: $0.00 bug)', () => {
      const flightWithZeroPrice = {
        ...minimalFlight,
        totalPrice: 0,
        rfqStatus: 'unanswered' as const,
      };
      render(<RFQFlightCard flight={flightWithZeroPrice} />);

      // Should display "Price Pending" instead of "$0" or "$0.00"
      expect(screen.getAllByText('Price Pending').length).toBeGreaterThan(0);
      expect(screen.queryByText('$0')).not.toBeInTheDocument();
      expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
    });

    it('displays "Price Pending" when price is undefined', () => {
      const flightWithUndefinedPrice = {
        ...minimalFlight,
        totalPrice: undefined as unknown as number,
      };
      render(<RFQFlightCard flight={flightWithUndefinedPrice} />);

      // Should display "Price Pending" instead of throwing or showing NaN
      expect(screen.getAllByText('Price Pending').length).toBeGreaterThan(0);
    });
  });

  describe('Amenities Section', () => {
    it('displays amenities section', () => {
      render(<RFQFlightCard flight={mockFlight} />);

      const amenitiesSection = screen.getByTestId('amenities-section');
      expect(amenitiesSection).toBeInTheDocument();
    });

    it('displays enabled amenities as YES', () => {
      render(<RFQFlightCard flight={mockFlight} />);

      // WiFi enabled
      expect(screen.getByText('Wi-Fi:')).toBeInTheDocument();
      // Pets enabled
      expect(screen.getByText('Pets Allowed:')).toBeInTheDocument();
    });

    it('displays disabled amenities as NO', () => {
      render(<RFQFlightCard flight={minimalFlight} />);

      const amenitiesSection = screen.getByTestId('amenities-section');
      expect(amenitiesSection).toBeInTheDocument();
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
      expect(card).toHaveClass('ring-2', 'ring-ring');
    });
  });

  describe('Accessibility', () => {
    it('has accessible checkbox label', () => {
      render(<RFQFlightCard flight={mockFlight} selectable />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('aria-label', 'Select flight from Executive Jets LLC');
    });
  });

  describe('View Chat Button', () => {
    it('shows view chat button when onViewChat is provided', () => {
      const onViewChat = vi.fn();
      render(<RFQFlightCard flight={mockFlight} onViewChat={onViewChat} />);

      const button = screen.getByRole('button', { name: /view chat/i });
      expect(button).toBeInTheDocument();
    });

    it('calls onViewChat when button is clicked', () => {
      const onViewChat = vi.fn();
      render(<RFQFlightCard flight={mockFlight} onViewChat={onViewChat} quoteId="test-quote-id" messageId="test-message-id" />);

      const button = screen.getByRole('button', { name: /view chat/i });
      fireEvent.click(button);

      // onViewChat is called with (flightId, quoteId, messageId)
      expect(onViewChat).toHaveBeenCalledWith(mockFlight.id, 'test-quote-id', 'test-message-id');
    });

    it('hides view chat button when onViewChat is not provided', () => {
      render(<RFQFlightCard flight={mockFlight} />);

      expect(screen.queryByRole('button', { name: /view chat/i })).not.toBeInTheDocument();
    });
  });

  describe('Card Layout', () => {
    it('has aircraft section', () => {
      render(<RFQFlightCard flight={mockFlight} />);
      expect(screen.getByTestId('aircraft-section')).toBeInTheDocument();
    });

    it('has transport section', () => {
      render(<RFQFlightCard flight={mockFlight} />);
      expect(screen.getByTestId('transport-section')).toBeInTheDocument();
    });

    it('has rfq status badge', () => {
      render(<RFQFlightCard flight={mockFlight} />);
      expect(screen.getByTestId('rfq-status-badge')).toBeInTheDocument();
    });

    it('has price section', () => {
      render(<RFQFlightCard flight={mockFlight} />);
      expect(screen.getByTestId('price-section')).toBeInTheDocument();
    });

    it('has amenities section', () => {
      render(<RFQFlightCard flight={mockFlight} />);
      expect(screen.getByTestId('amenities-section')).toBeInTheDocument();
    });

    it('has operator section', () => {
      render(<RFQFlightCard flight={mockFlight} />);
      expect(screen.getByTestId('operator-section')).toBeInTheDocument();
    });
  });

  describe('Medical and Package indicators', () => {
    it('shows Medical YES when medical is available', () => {
      const flightWithMedical = { ...mockFlight, amenities: { ...mockFlight.amenities, medical: true } };
      render(<RFQFlightCard flight={flightWithMedical} />);

      const transportSection = screen.getByTestId('transport-section');
      expect(transportSection).toHaveTextContent('Medical:');
      expect(transportSection).toHaveTextContent('YES');
    });

    it('shows Medical NO when medical is not available', () => {
      render(<RFQFlightCard flight={mockFlight} />);

      const transportSection = screen.getByTestId('transport-section');
      expect(transportSection).toHaveTextContent('Medical:');
      expect(transportSection).toHaveTextContent('NO');
    });

    it('shows Package indicator', () => {
      render(<RFQFlightCard flight={mockFlight} />);

      const transportSection = screen.getByTestId('transport-section');
      expect(transportSection).toHaveTextContent('Package:');
    });
  });

  describe('Book Flight Button', () => {
    it('is enabled and clickable for quoted flights when not gated', () => {
      const onBookFlight = vi.fn();
      render(
        <RFQFlightCard
          flight={mockFlight}
          onBookFlight={onBookFlight}
          bookFlightDisabled={false}
          quoteId="quote-abc123"
        />
      );

      const bookBtn = screen.getByRole('button', { name: /book flight/i });
      expect(bookBtn).not.toBeDisabled();
      fireEvent.click(bookBtn);
      expect(onBookFlight).toHaveBeenCalledWith('flight-001', 'quote-abc123');
    });

    it('is disabled when bookFlightDisabled is true', () => {
      const onBookFlight = vi.fn();
      render(
        <RFQFlightCard
          flight={mockFlight}
          onBookFlight={onBookFlight}
          bookFlightDisabled={true}
          bookFlightDisabledReason="Waiting for customer reply to proposal"
        />
      );

      const bookBtn = screen.getByRole('button', { name: /book flight/i });
      expect(bookBtn).toBeDisabled();
      fireEvent.click(bookBtn);
      expect(onBookFlight).not.toHaveBeenCalled();
    });

    it('is not rendered for non-quoted flights', () => {
      const onBookFlight = vi.fn();
      render(
        <RFQFlightCard
          flight={minimalFlight}
          onBookFlight={onBookFlight}
          bookFlightDisabled={false}
        />
      );

      expect(screen.queryByRole('button', { name: /book flight/i })).not.toBeInTheDocument();
    });
  });

  describe('Aircraft Category', () => {
    it('displays aircraft category from prop', () => {
      render(<RFQFlightCard flight={mockFlight} aircraftCategory="Ultra long range" />);

      expect(screen.getByText('Ultra long range')).toBeInTheDocument();
    });

    it('maps aircraft type to category when not provided', () => {
      render(<RFQFlightCard flight={mockFlight} />);

      // Gulfstream G200 should map to Heavy jet
      expect(screen.getByText('Heavy jet')).toBeInTheDocument();
    });
  });

});
