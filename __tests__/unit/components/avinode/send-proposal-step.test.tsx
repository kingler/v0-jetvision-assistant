/**
 * @vitest-environment jsdom
 */

/**
 * SendProposalStep Component Tests
 *
 * Tests for the Step 4 Send Proposal component that allows users
 * to generate PDFs and send proposals to customers via email.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SendProposalStep, type SendProposalStepProps } from '@/components/avinode/send-proposal-step';
import type { RFQFlight } from '@/lib/mcp/clients/avinode-client';

// =============================================================================
// TEST DATA
// =============================================================================

const mockFlight1: RFQFlight = {
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
  aircraftModel: 'Gulfstream G650',
  tailNumber: 'N650EJ',
  yearOfManufacture: 2022,
  passengerCapacity: 16,
  operatorName: 'Executive Jet Management',
  operatorRating: 4.8,
  price: 45000,
  currency: 'USD',
  priceBreakdown: {
    base: 40000,
    taxes: 3000,
    fees: 2000,
  },
  validUntil: '2025-01-10',
  amenities: {
    wifi: true,
    pets: true,
    smoking: false,
    galley: true,
    lavatory: true,
    medical: true,
  },
  rfqStatus: 'quoted',
  lastUpdated: '2025-01-05T10:30:00Z',
  isSelected: true,
};

const mockFlight2: RFQFlight = {
  id: 'flight-002',
  quoteId: 'quote-def456',
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
  departureTime: '10:00',
  flightDuration: '5h 15m',
  aircraftType: 'Midsize Jet',
  aircraftModel: 'Citation XLS+',
  passengerCapacity: 9,
  operatorName: 'NetJets',
  operatorRating: 4.9,
  price: 35000,
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
  lastUpdated: '2025-01-05T11:00:00Z',
  isSelected: true,
};

const mockTripDetails = {
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
  passengers: 6,
  tripId: 'atrip-64956151',
};

const defaultProps: SendProposalStepProps = {
  selectedFlights: [mockFlight1],
  tripDetails: mockTripDetails,
  customerEmail: 'john.smith@example.com',
  customerName: 'John Smith',
};

// =============================================================================
// TESTS
// =============================================================================

describe('SendProposalStep', () => {
  describe('Rendering', () => {
    it('renders the component with selected flights', () => {
      render(<SendProposalStep {...defaultProps} />);

      // Has a heading with "Send Proposal"
      expect(screen.getByRole('heading', { name: /send proposal/i })).toBeInTheDocument();
      // Component displays shortened model name "G650"
      expect(screen.getByText(/G650/)).toBeInTheDocument();
    });

    it('displays customer information', () => {
      render(<SendProposalStep {...defaultProps} />);

      // Name input has the value
      expect(screen.getByDisplayValue('John Smith')).toBeInTheDocument();
      expect(screen.getByDisplayValue('john.smith@example.com')).toBeInTheDocument();
    });

    it('shows selected flights summary', () => {
      render(<SendProposalStep {...defaultProps} selectedFlights={[mockFlight1, mockFlight2]} />);

      expect(screen.getByText(/2 flights selected/i)).toBeInTheDocument();
      // Component displays shortened model names
      expect(screen.getByText(/G650/)).toBeInTheDocument();
      expect(screen.getByText(/XLS\+/)).toBeInTheDocument();
    });

    it('displays route information', () => {
      render(<SendProposalStep {...defaultProps} />);

      expect(screen.getByText(/KTEB/)).toBeInTheDocument();
      expect(screen.getByText(/KVNY/)).toBeInTheDocument();
    });

    it('shows pricing summary', () => {
      render(<SendProposalStep {...defaultProps} />);

      // Should show total price from selected flights (appears twice: in card and total)
      const priceElements = screen.getAllByText(/\$45,000/);
      expect(priceElements.length).toBeGreaterThan(0);
    });
  });

  describe('Customer Email Input', () => {
    it('allows editing customer email', () => {
      render(<SendProposalStep {...defaultProps} />);

      const emailInput = screen.getByLabelText(/customer email/i);
      expect(emailInput).toHaveValue('john.smith@example.com');

      fireEvent.change(emailInput, { target: { value: 'new@email.com' } });
      expect(emailInput).toHaveValue('new@email.com');
    });

    it('validates email format', async () => {
      // Need to provide onSendProposal so the button isn't disabled
      const onSendProposal = vi.fn().mockResolvedValue({ success: true });
      render(<SendProposalStep {...defaultProps} onSendProposal={onSendProposal} />);

      const emailInput = screen.getByLabelText(/customer email/i);
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

      const sendButton = screen.getByRole('button', { name: /send proposal/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/valid email/i)).toBeInTheDocument();
      });
      // onSendProposal should not be called when email is invalid
      expect(onSendProposal).not.toHaveBeenCalled();
    });
  });

  describe('PDF Preview', () => {
    it('shows generate preview button', () => {
      render(<SendProposalStep {...defaultProps} />);

      expect(screen.getByRole('button', { name: /preview pdf/i })).toBeInTheDocument();
    });

    it('calls onGeneratePreview when preview button clicked', async () => {
      const onGeneratePreview = vi.fn().mockResolvedValue({
        success: true,
        previewUrl: 'blob:preview'
      });

      render(<SendProposalStep {...defaultProps} onGeneratePreview={onGeneratePreview} />);

      const previewButton = screen.getByRole('button', { name: /preview pdf/i });
      fireEvent.click(previewButton);

      await waitFor(() => {
        expect(onGeneratePreview).toHaveBeenCalled();
      });
    });

    it('shows loading state during preview generation', async () => {
      const onGeneratePreview = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );

      render(<SendProposalStep {...defaultProps} onGeneratePreview={onGeneratePreview} />);

      const previewButton = screen.getByRole('button', { name: /preview pdf/i });
      fireEvent.click(previewButton);

      // Button should show "Generating..."
      expect(screen.getByRole('button', { name: /generating/i })).toBeInTheDocument();
    });
  });

  describe('Send Proposal', () => {
    it('shows send proposal button', () => {
      render(<SendProposalStep {...defaultProps} />);

      expect(screen.getByRole('button', { name: /send proposal/i })).toBeInTheDocument();
    });

    it('calls onSendProposal when send button clicked', async () => {
      const onSendProposal = vi.fn().mockResolvedValue({ success: true });

      render(<SendProposalStep {...defaultProps} onSendProposal={onSendProposal} />);

      const sendButton = screen.getByRole('button', { name: /send proposal/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(onSendProposal).toHaveBeenCalledWith(expect.objectContaining({
          customerEmail: 'john.smith@example.com',
          customerName: 'John Smith',
          selectedFlights: [mockFlight1],
        }));
      });
    });

    it('shows loading state during send', async () => {
      const onSendProposal = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );

      render(<SendProposalStep {...defaultProps} onSendProposal={onSendProposal} />);

      const sendButton = screen.getByRole('button', { name: /send proposal/i });
      fireEvent.click(sendButton);

      // Button should show "Sending..."
      expect(screen.getByRole('button', { name: /sending/i })).toBeInTheDocument();
    });

    it('shows success message after sending', async () => {
      const onSendProposal = vi.fn().mockResolvedValue({ success: true });

      render(<SendProposalStep {...defaultProps} onSendProposal={onSendProposal} />);

      const sendButton = screen.getByRole('button', { name: /send proposal/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/sent successfully/i)).toBeInTheDocument();
      });
    });

    it('shows error message on failure', async () => {
      const onSendProposal = vi.fn().mockResolvedValue({
        success: false,
        error: 'Failed to send email'
      });

      render(<SendProposalStep {...defaultProps} onSendProposal={onSendProposal} />);

      const sendButton = screen.getByRole('button', { name: /send proposal/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to send/i)).toBeInTheDocument();
      });
    });
  });

  describe('Status Indicator', () => {
    it('shows idle status initially', () => {
      render(<SendProposalStep {...defaultProps} />);

      expect(screen.getByText(/ready to send/i)).toBeInTheDocument();
    });

    it('shows generating status during PDF generation', async () => {
      const onGeneratePreview = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );

      render(<SendProposalStep {...defaultProps} onGeneratePreview={onGeneratePreview} />);

      const previewButton = screen.getByRole('button', { name: /preview pdf/i });
      fireEvent.click(previewButton);

      // Status indicator shows "Generating PDF..."
      expect(screen.getByText(/generating pdf/i)).toBeInTheDocument();
    });
  });

  describe('Compact Flight Summary', () => {
    it('shows compact view of selected flights', () => {
      render(<SendProposalStep {...defaultProps} selectedFlights={[mockFlight1, mockFlight2]} />);

      // Should show aircraft models in compact format
      expect(screen.getByText(/G650/)).toBeInTheDocument();
      expect(screen.getByText(/XLS\+/)).toBeInTheDocument();
    });

    it('shows operator names', () => {
      render(<SendProposalStep {...defaultProps} />);

      // The component shows "Executive Jet • 4.8" in the operator line
      expect(screen.getByText(/Executive/)).toBeInTheDocument();
    });

    it('shows prices for each flight', () => {
      render(<SendProposalStep {...defaultProps} selectedFlights={[mockFlight1, mockFlight2]} />);

      // Both prices appear in the flight cards
      const prices45k = screen.getAllByText(/\$45,000/);
      const prices35k = screen.getAllByText(/\$35,000/);
      expect(prices45k.length).toBeGreaterThan(0);
      expect(prices35k.length).toBeGreaterThan(0);
    });
  });

  describe('Go Back', () => {
    it('shows back button when onGoBack is provided', () => {
      const onGoBack = vi.fn();
      render(<SendProposalStep {...defaultProps} onGoBack={onGoBack} />);

      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });

    it('hides back button when onGoBack is not provided', () => {
      render(<SendProposalStep {...defaultProps} />);

      expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
    });

    it('calls onGoBack when back button clicked', () => {
      const onGoBack = vi.fn();
      render(<SendProposalStep {...defaultProps} onGoBack={onGoBack} />);

      const backButton = screen.getByRole('button', { name: /back/i });
      fireEvent.click(backButton);

      expect(onGoBack).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has accessible form labels', () => {
      render(<SendProposalStep {...defaultProps} />);

      expect(screen.getByLabelText(/customer email/i)).toBeInTheDocument();
    });

    it('has accessible buttons', () => {
      const onGoBack = vi.fn();
      render(<SendProposalStep {...defaultProps} onGoBack={onGoBack} />);

      expect(screen.getByRole('button', { name: /preview pdf/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send proposal/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows message when no flights selected', () => {
      render(<SendProposalStep {...defaultProps} selectedFlights={[]} />);

      expect(screen.getByText(/no flights selected/i)).toBeInTheDocument();
    });

    it('disables send button when no flights', () => {
      render(<SendProposalStep {...defaultProps} selectedFlights={[]} />);

      const sendButton = screen.getByRole('button', { name: /send proposal/i });
      expect(sendButton).toBeDisabled();
    });
  });
});
