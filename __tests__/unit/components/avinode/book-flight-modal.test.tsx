/**
 * Book Flight Modal Component Tests
 *
 * Ensures the selected customer name and email from the generated proposal
 * are displayed in the Customer section and that invalid customer state
 * does not trigger "Customer name is required" (buttons disabled, fallback message shown).
 *
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BookFlightModal, type TripDetails } from '@/components/avinode/book-flight-modal';
import type { RFQFlight } from '@/lib/mcp/clients/avinode-client';

// =============================================================================
// MOCK DATA
// =============================================================================

const mockFlight: RFQFlight = {
  id: 'flight-001',
  quoteId: 'quote-abc',
  departureAirport: { icao: 'KORD', name: 'O\'Hare', city: 'Chicago' },
  arrivalAirport: { icao: 'KMCI', name: 'Kansas City Intl', city: 'Kansas City' },
  departureDate: '2026-05-02',
  departureTime: '16:00',
  flightDuration: '2h 15m',
  aircraftType: 'Falcon 7X',
  aircraftModel: 'Falcon 7X',
  passengerCapacity: 4,
  operatorName: 'Sandbox Dev Operator',
  totalPrice: 45000,
  currency: 'USD',
  priceBreakdown: { basePrice: 42000, taxes: 2000, fees: 1000 },
  amenities: {
    wifi: true,
    pets: false,
    smoking: false,
    galley: true,
    lavatory: true,
    medical: false,
  },
  rfqStatus: 'quoted',
  lastUpdated: '2026-01-15T12:00:00Z',
};

const defaultTripDetails: TripDetails = {
  departureAirport: { icao: 'KORD', name: 'KORD' },
  arrivalAirport: { icao: 'KMCI', name: 'KMCI' },
  departureDate: '2026-05-02',
  departureTime: '16:00',
  passengers: 4,
  tripId: 'trp123',
};

const validCustomer = {
  name: 'Jane Smith',
  email: 'jane.smith@example.com',
  company: 'Acme Corp',
  phone: '+1-555-0100',
};

// =============================================================================
// TESTS
// =============================================================================

describe('BookFlightModal', () => {
  const mockOnClose = vi.fn();
  const mockOnContractSent = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('Customer section display', () => {
    it('displays customer name and email when both are provided (from generated proposal)', () => {
      render(
        <BookFlightModal
          open={true}
          onClose={mockOnClose}
          flight={mockFlight}
          customer={validCustomer}
          tripDetails={defaultTripDetails}
          requestId="req-123"
        />
      );

      expect(screen.getByText('Customer')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('jane.smith@example.com')).toBeInTheDocument();
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.queryByTestId('book-flight-no-customer')).not.toBeInTheDocument();
    });

    it('displays customer name and email when only name and email are set (no company/phone)', () => {
      render(
        <BookFlightModal
          open={true}
          onClose={mockOnClose}
          flight={mockFlight}
          customer={{ name: 'John Doe', email: 'john@test.com' }}
          tripDetails={defaultTripDetails}
          requestId="req-123"
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@test.com')).toBeInTheDocument();
      expect(screen.queryByTestId('book-flight-no-customer')).not.toBeInTheDocument();
    });

    it('shows fallback message when customer name is empty (prevents "Customer name is required" error)', () => {
      render(
        <BookFlightModal
          open={true}
          onClose={mockOnClose}
          flight={mockFlight}
          customer={{ name: '', email: 'jane@example.com' }}
          tripDetails={defaultTripDetails}
          requestId="req-123"
        />
      );

      const fallback = screen.getByTestId('book-flight-no-customer');
      expect(fallback).toBeInTheDocument();
      expect(fallback).toHaveTextContent(/Generate a proposal and select a customer first/);
      expect(screen.queryByText('jane@example.com')).not.toBeInTheDocument();
    });

    it('shows fallback message when customer email is empty', () => {
      render(
        <BookFlightModal
          open={true}
          onClose={mockOnClose}
          flight={mockFlight}
          customer={{ name: 'Jane Smith', email: '' }}
          tripDetails={defaultTripDetails}
          requestId="req-123"
        />
      );

      expect(screen.getByTestId('book-flight-no-customer')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });

    it('shows fallback when both name and email are empty', () => {
      render(
        <BookFlightModal
          open={true}
          onClose={mockOnClose}
          flight={mockFlight}
          customer={{ name: '', email: '' }}
          tripDetails={defaultTripDetails}
          requestId="req-123"
        />
      );

      expect(screen.getByTestId('book-flight-no-customer')).toBeInTheDocument();
    });

    it('treats whitespace-only name as invalid and shows fallback', () => {
      render(
        <BookFlightModal
          open={true}
          onClose={mockOnClose}
          flight={mockFlight}
          customer={{ name: '   ', email: 'jane@example.com' }}
          tripDetails={defaultTripDetails}
          requestId="req-123"
        />
      );

      expect(screen.getByTestId('book-flight-no-customer')).toBeInTheDocument();
    });
  });

  describe('Preview Contract and Send Contract buttons', () => {
    it('enables Preview Contract and Send Contract when customer has name and email', () => {
      render(
        <BookFlightModal
          open={true}
          onClose={mockOnClose}
          flight={mockFlight}
          customer={validCustomer}
          tripDetails={defaultTripDetails}
          requestId="req-123"
        />
      );

      const previewBtn = screen.getByRole('button', { name: /Preview/i });
      const sendBtn = screen.getByRole('button', { name: /Send Contract/i });
      expect(previewBtn).not.toBeDisabled();
      expect(sendBtn).not.toBeDisabled();
    });

    it('disables Preview Contract and Send Contract when customer name is missing', () => {
      render(
        <BookFlightModal
          open={true}
          onClose={mockOnClose}
          flight={mockFlight}
          customer={{ name: '', email: 'jane@example.com' }}
          tripDetails={defaultTripDetails}
          requestId="req-123"
        />
      );

      const previewBtn = screen.getByRole('button', { name: /Preview/i });
      const sendBtn = screen.getByRole('button', { name: /Send Contract/i });
      expect(previewBtn).toBeDisabled();
      expect(sendBtn).toBeDisabled();
    });

    it('disables Preview Contract and Send Contract when customer email is missing', () => {
      render(
        <BookFlightModal
          open={true}
          onClose={mockOnClose}
          flight={mockFlight}
          customer={{ name: 'Jane Smith', email: '' }}
          tripDetails={defaultTripDetails}
          requestId="req-123"
        />
      );

      const previewBtn = screen.getByRole('button', { name: /Preview/i });
      const sendBtn = screen.getByRole('button', { name: /Send Contract/i });
      expect(previewBtn).toBeDisabled();
      expect(sendBtn).toBeDisabled();
    });
  });

  describe('Dialog and flight details (no regression)', () => {
    it('renders dialog with title and description', () => {
      render(
        <BookFlightModal
          open={true}
          onClose={mockOnClose}
          flight={mockFlight}
          customer={validCustomer}
          tripDetails={defaultTripDetails}
          requestId="req-123"
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Book Flight')).toBeInTheDocument();
      expect(screen.getByText(/Review flight details and send a contract to the customer/)).toBeInTheDocument();
    });

    it('renders flight details section with route, date, aircraft, passengers, operator', () => {
      render(
        <BookFlightModal
          open={true}
          onClose={mockOnClose}
          flight={mockFlight}
          customer={validCustomer}
          tripDetails={defaultTripDetails}
          requestId="req-123"
        />
      );

      expect(screen.getByText('Flight Details')).toBeInTheDocument();
      expect(screen.getByText(/KORD → KMCI/)).toBeInTheDocument();
      expect(screen.getByText(/Falcon 7X - Falcon 7X/)).toBeInTheDocument();
      expect(screen.getByText(/4 passenger/)).toBeInTheDocument();
      expect(screen.getByText('Sandbox Dev Operator')).toBeInTheDocument();
    });

    it('renders pricing summary section', () => {
      render(
        <BookFlightModal
          open={true}
          onClose={mockOnClose}
          flight={mockFlight}
          customer={validCustomer}
          tripDetails={defaultTripDetails}
          requestId="req-123"
        />
      );

      expect(screen.getByText('Pricing Summary')).toBeInTheDocument();
      expect(screen.getByText('$42,000')).toBeInTheDocument();
    });

    it('does not render error state initially (no "Customer name is required" in DOM)', () => {
      render(
        <BookFlightModal
          open={true}
          onClose={mockOnClose}
          flight={mockFlight}
          customer={{ name: '', email: '' }}
          tripDetails={defaultTripDetails}
          requestId="req-123"
        />
      );

      expect(screen.queryByText(/Customer name is required/)).not.toBeInTheDocument();
      expect(screen.queryByText('Error')).not.toBeInTheDocument();
    });
  });

  describe('Cancel and close', () => {
    it('calls onClose when Cancel is clicked', () => {
      render(
        <BookFlightModal
          open={true}
          onClose={mockOnClose}
          flight={mockFlight}
          customer={validCustomer}
          tripDetails={defaultTripDetails}
          requestId="req-123"
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });
});
