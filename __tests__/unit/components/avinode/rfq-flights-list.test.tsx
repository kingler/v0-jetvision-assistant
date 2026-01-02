/**
 * @vitest-environment jsdom
 */

/**
 * RFQFlightsList Component Tests
 *
 * Tests for the RFQ flights list component that displays
 * a list of available flights with selection capability.
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RFQFlightsList, type RFQFlightsListProps } from '@/components/avinode/rfq-flights-list';
import type { RFQFlight } from '@/components/avinode/rfq-flight-card';

// =============================================================================
// TEST DATA
// =============================================================================

const mockFlights: RFQFlight[] = [
  {
    id: 'flight-001',
    quoteId: 'quote-abc123',
    departureAirport: { icao: 'KTEB', name: 'Teterboro Airport' },
    arrivalAirport: { icao: 'KVNY', name: 'Van Nuys Airport' },
    departureDate: '2025-01-15',
    departureTime: '09:00',
    flightDuration: '5h 30m',
    aircraftType: 'Heavy Jet',
    aircraftModel: 'Gulfstream G200',
    passengerCapacity: 10,
    operatorName: 'Executive Jets LLC',
    operatorRating: 4.8,
    totalPrice: 32500,
    currency: 'USD',
    amenities: { wifi: true, pets: true, smoking: false, galley: true, lavatory: true, medical: false },
    rfqStatus: 'quoted',
    lastUpdated: '2025-01-05T10:30:00Z',
    isSelected: false,
  },
  {
    id: 'flight-002',
    quoteId: 'quote-def456',
    departureAirport: { icao: 'KTEB', name: 'Teterboro Airport' },
    arrivalAirport: { icao: 'KVNY', name: 'Van Nuys Airport' },
    departureDate: '2025-01-15',
    departureTime: '11:00',
    flightDuration: '5h 15m',
    aircraftType: 'Mid Jet',
    aircraftModel: 'Citation XLS',
    passengerCapacity: 8,
    operatorName: 'Sky Charter',
    operatorRating: 4.5,
    totalPrice: 25000,
    currency: 'USD',
    amenities: { wifi: true, pets: false, smoking: false, galley: true, lavatory: true, medical: false },
    rfqStatus: 'quoted',
    lastUpdated: '2025-01-05T09:00:00Z',
    isSelected: false,
  },
  {
    id: 'flight-003',
    quoteId: 'quote-ghi789',
    departureAirport: { icao: 'KTEB', name: 'Teterboro Airport' },
    arrivalAirport: { icao: 'KVNY', name: 'Van Nuys Airport' },
    departureDate: '2025-01-15',
    departureTime: '14:00',
    flightDuration: '5h 45m',
    aircraftType: 'Light Jet',
    aircraftModel: 'Phenom 300',
    passengerCapacity: 6,
    operatorName: 'Quick Air',
    operatorRating: 4.2,
    totalPrice: 18000,
    currency: 'USD',
    amenities: { wifi: false, pets: false, smoking: false, galley: false, lavatory: true, medical: false },
    rfqStatus: 'unanswered',
    lastUpdated: '2025-01-04T16:00:00Z',
    isSelected: false,
  },
];

// =============================================================================
// TESTS
// =============================================================================

describe('RFQFlightsList', () => {
  describe('Rendering', () => {
    it('renders all flights in the list', () => {
      render(<RFQFlightsList flights={mockFlights} />);

      expect(screen.getByText('Executive Jets LLC')).toBeInTheDocument();
      expect(screen.getByText('Sky Charter')).toBeInTheDocument();
      expect(screen.getByText('Quick Air')).toBeInTheDocument();
    });

    it('renders empty state when no flights', () => {
      render(<RFQFlightsList flights={[]} />);

      expect(screen.getByText(/No RFQs available/i)).toBeInTheDocument();
    });

    it('displays flight count', () => {
      render(<RFQFlightsList flights={mockFlights} />);

      expect(screen.getByText(/3 flights/i)).toBeInTheDocument();
    });

    it('renders loading state', () => {
      render(<RFQFlightsList flights={[]} isLoading />);

      expect(screen.getByTestId('flights-loading')).toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('renders with selectable flights', () => {
      render(<RFQFlightsList flights={mockFlights} selectable />);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(3);
    });

    it('tracks selected flights', () => {
      const onSelectionChange = vi.fn();
      render(
        <RFQFlightsList
          flights={mockFlights}
          selectable
          onSelectionChange={onSelectionChange}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);

      expect(onSelectionChange).toHaveBeenCalledWith(['flight-001']);
    });

    it('allows multiple selections', () => {
      const onSelectionChange = vi.fn();
      render(
        <RFQFlightsList
          flights={mockFlights}
          selectable
          onSelectionChange={onSelectionChange}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);

      expect(onSelectionChange).toHaveBeenLastCalledWith(['flight-001', 'flight-002']);
    });

    it('deselects previously selected flight', () => {
      const flightsWithSelected = mockFlights.map((f, i) => ({
        ...f,
        isSelected: i === 0,
      }));
      const onSelectionChange = vi.fn();

      render(
        <RFQFlightsList
          flights={flightsWithSelected}
          selectable
          onSelectionChange={onSelectionChange}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[0]).toBeChecked();

      fireEvent.click(checkboxes[0]);
      expect(onSelectionChange).toHaveBeenLastCalledWith([]);
    });

    it('displays selection count', () => {
      const flightsWithSelected = mockFlights.map((f, i) => ({
        ...f,
        isSelected: i < 2,
      }));

      render(<RFQFlightsList flights={flightsWithSelected} selectable />);

      expect(screen.getByText(/2 selected/i)).toBeInTheDocument();
    });

    it('shows select all checkbox', () => {
      render(<RFQFlightsList flights={mockFlights} selectable showSelectAll />);

      expect(screen.getByLabelText(/select all/i)).toBeInTheDocument();
    });

    it('selects all flights when select all is clicked', () => {
      const onSelectionChange = vi.fn();
      render(
        <RFQFlightsList
          flights={mockFlights}
          selectable
          showSelectAll
          onSelectionChange={onSelectionChange}
        />
      );

      const selectAll = screen.getByLabelText(/select all/i);
      fireEvent.click(selectAll);

      expect(onSelectionChange).toHaveBeenCalledWith(['flight-001', 'flight-002', 'flight-003']);
    });

    it('deselects all when select all is clicked with all selected', () => {
      const allSelected = mockFlights.map((f) => ({ ...f, isSelected: true }));
      const onSelectionChange = vi.fn();

      render(
        <RFQFlightsList
          flights={allSelected}
          selectable
          showSelectAll
          onSelectionChange={onSelectionChange}
        />
      );

      const selectAll = screen.getByLabelText(/select all/i);
      fireEvent.click(selectAll);

      expect(onSelectionChange).toHaveBeenCalledWith([]);
    });
  });

  describe('Sorting', () => {
    it('sorts by price (low to high)', () => {
      render(<RFQFlightsList flights={mockFlights} sortable initialSortBy="price-asc" />);

      const cards = screen.getAllByTestId('rfq-flight-card');
      expect(within(cards[0]).getByText('Quick Air')).toBeInTheDocument(); // $18,000
      expect(within(cards[1]).getByText('Sky Charter')).toBeInTheDocument(); // $25,000
      expect(within(cards[2]).getByText('Executive Jets LLC')).toBeInTheDocument(); // $32,500
    });

    it('sorts by price (high to low)', () => {
      render(<RFQFlightsList flights={mockFlights} sortable initialSortBy="price-desc" />);

      const cards = screen.getAllByTestId('rfq-flight-card');
      expect(within(cards[0]).getByText('Executive Jets LLC')).toBeInTheDocument(); // $32,500
      expect(within(cards[1]).getByText('Sky Charter')).toBeInTheDocument(); // $25,000
      expect(within(cards[2]).getByText('Quick Air')).toBeInTheDocument(); // $18,000
    });

    it('sorts by operator rating', () => {
      render(<RFQFlightsList flights={mockFlights} sortable initialSortBy="rating-desc" />);

      const cards = screen.getAllByTestId('rfq-flight-card');
      expect(within(cards[0]).getByText('Executive Jets LLC')).toBeInTheDocument(); // 4.8
      expect(within(cards[1]).getByText('Sky Charter')).toBeInTheDocument(); // 4.5
      expect(within(cards[2]).getByText('Quick Air')).toBeInTheDocument(); // 4.2
    });

    it('displays sort dropdown when sortable', () => {
      render(<RFQFlightsList flights={mockFlights} sortable />);

      expect(screen.getByRole('combobox', { name: /sort by/i })).toBeInTheDocument();
    });

    it('changes sort order when dropdown is changed', () => {
      render(<RFQFlightsList flights={mockFlights} sortable initialSortBy="price-asc" />);

      const sortDropdown = screen.getByRole('combobox', { name: /sort by/i });
      fireEvent.change(sortDropdown, { target: { value: 'price-desc' } });

      const cards = screen.getAllByTestId('rfq-flight-card');
      expect(within(cards[0]).getByText('Executive Jets LLC')).toBeInTheDocument();
    });
  });

  describe('Filtering by Status', () => {
    it('filters by quoted status', () => {
      render(
        <RFQFlightsList
          flights={mockFlights}
          filterable
          statusFilter="quoted"
        />
      );

      // Only quoted flights should be shown
      expect(screen.getByText('Executive Jets LLC')).toBeInTheDocument();
      expect(screen.getByText('Sky Charter')).toBeInTheDocument();
      expect(screen.queryByText('Quick Air')).not.toBeInTheDocument();
    });

    it('shows all flights when no filter', () => {
      render(<RFQFlightsList flights={mockFlights} filterable />);

      expect(screen.getByText('Executive Jets LLC')).toBeInTheDocument();
      expect(screen.getByText('Sky Charter')).toBeInTheDocument();
      expect(screen.getByText('Quick Air')).toBeInTheDocument();
    });

    it('displays filter buttons when filterable', () => {
      render(<RFQFlightsList flights={mockFlights} filterable />);

      expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /quoted/i })).toBeInTheDocument();
    });
  });

  describe('Continue Button', () => {
    it('shows continue button when flights are selected', () => {
      const flightsWithSelected = mockFlights.map((f, i) => ({
        ...f,
        isSelected: i === 0,
      }));

      render(
        <RFQFlightsList
          flights={flightsWithSelected}
          selectable
          showContinueButton
        />
      );

      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
    });

    it('disables continue button when no flights selected', () => {
      render(
        <RFQFlightsList
          flights={mockFlights}
          selectable
          showContinueButton
        />
      );

      const continueButton = screen.getByRole('button', { name: /continue/i });
      expect(continueButton).toBeDisabled();
    });

    it('calls onContinue when continue is clicked', () => {
      const flightsWithSelected = mockFlights.map((f, i) => ({
        ...f,
        isSelected: i === 0,
      }));
      const onContinue = vi.fn();

      render(
        <RFQFlightsList
          flights={flightsWithSelected}
          selectable
          showContinueButton
          onContinue={onContinue}
        />
      );

      const continueButton = screen.getByRole('button', { name: /continue/i });
      fireEvent.click(continueButton);

      expect(onContinue).toHaveBeenCalledWith([flightsWithSelected[0]]);
    });
  });

  describe('Price Breakdown', () => {
    it('passes showPriceBreakdown to flight cards', () => {
      render(<RFQFlightsList flights={mockFlights} showPriceBreakdown />);

      const priceSection = screen.getAllByTestId('price-section')[0];
      expect(priceSection).toBeInTheDocument();
    });
  });

  describe('Compact Mode', () => {
    it('renders in compact mode', () => {
      render(<RFQFlightsList flights={mockFlights} compact />);

      const list = screen.getByTestId('rfq-flights-list');
      expect(list).toHaveClass('space-y-4');
    });
  });

  describe('Accessibility', () => {
    it('has appropriate aria labels', () => {
      render(<RFQFlightsList flights={mockFlights} />);

      const list = screen.getByRole('list', { name: /available flights/i });
      expect(list).toBeInTheDocument();
    });

    it('announces selection changes to screen readers', () => {
      const flightsWithSelected = mockFlights.map((f, i) => ({
        ...f,
        isSelected: i === 0,
      }));

      render(<RFQFlightsList flights={flightsWithSelected} selectable />);

      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveTextContent(/1 flight selected/i);
    });
  });
});
