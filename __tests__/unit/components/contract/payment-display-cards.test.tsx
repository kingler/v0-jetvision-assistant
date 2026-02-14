/**
 * @vitest-environment jsdom
 */

/**
 * Payment Display Card Component Tests
 *
 * Tests for PaymentConfirmedCard and ClosedWonConfirmation components.
 *
 * @see components/contract/payment-confirmed-card.tsx
 * @see components/contract/closed-won-confirmation.tsx
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PaymentConfirmedCard } from '@/components/contract/payment-confirmed-card';
import { ClosedWonConfirmation } from '@/components/contract/closed-won-confirmation';

// =============================================================================
// PaymentConfirmedCard
// =============================================================================

describe('PaymentConfirmedCard', () => {
  const defaultProps = {
    contractId: 'contract-uuid-456',
    contractNumber: 'CONTRACT-2026-001',
    paymentAmount: 45182.76,
    paymentMethod: 'wire',
    paymentReference: 'WT-2026-001',
    paidAt: '2026-02-10T12:00:00Z',
    currency: 'USD',
  };

  it('renders "Payment Received" heading', () => {
    render(<PaymentConfirmedCard {...defaultProps} />);

    expect(screen.getByText('Payment Received')).toBeInTheDocument();
  });

  it('displays formatted amount with currency', () => {
    render(<PaymentConfirmedCard {...defaultProps} />);

    // The formatAmount function does `${currency} ${formatted}`
    // Amount 45182.76 formatted: "USD 45,182.76" (locale-dependent, but includes USD)
    expect(screen.getByText(/USD/)).toBeInTheDocument();
    expect(screen.getByText(/45,182\.76/)).toBeInTheDocument();
  });

  it('maps payment method "wire" to "Wire Transfer" label', () => {
    render(<PaymentConfirmedCard {...defaultProps} />);

    expect(screen.getByText('Wire Transfer')).toBeInTheDocument();
  });

  it('maps payment method "credit_card" to "Credit Card" label', () => {
    render(<PaymentConfirmedCard {...defaultProps} paymentMethod="credit_card" />);

    expect(screen.getByText('Credit Card')).toBeInTheDocument();
  });

  it('maps payment method "check" to "Check" label', () => {
    render(<PaymentConfirmedCard {...defaultProps} paymentMethod="check" />);

    expect(screen.getByText('Check')).toBeInTheDocument();
  });

  it('displays payment reference', () => {
    render(<PaymentConfirmedCard {...defaultProps} />);

    expect(screen.getByText('WT-2026-001')).toBeInTheDocument();
  });

  it('displays formatted timestamp', () => {
    render(<PaymentConfirmedCard {...defaultProps} />);

    // formatTimestamp uses en-US locale: "Feb 10, 2026, HH:MM AM/PM"
    expect(screen.getByText(/Feb 10, 2026/)).toBeInTheDocument();
  });

  it('displays contract number', () => {
    render(<PaymentConfirmedCard {...defaultProps} />);

    expect(screen.getByText(/CONTRACT-2026-001/)).toBeInTheDocument();
  });
});

// =============================================================================
// ClosedWonConfirmation
// =============================================================================

describe('ClosedWonConfirmation', () => {
  const defaultProps = {
    contractNumber: 'CONTRACT-2026-001',
    customerName: 'John Smith',
    flightRoute: 'KTEB to KVNY',
    dealValue: 45182.76,
    currency: 'USD',
  };

  it('renders "Deal Closed" heading', () => {
    render(<ClosedWonConfirmation {...defaultProps} />);

    expect(screen.getByText('Deal Closed')).toBeInTheDocument();
  });

  it('displays customer name', () => {
    render(<ClosedWonConfirmation {...defaultProps} />);

    expect(screen.getByText('John Smith')).toBeInTheDocument();
  });

  it('displays flight route', () => {
    render(<ClosedWonConfirmation {...defaultProps} />);

    expect(screen.getByText('KTEB to KVNY')).toBeInTheDocument();
  });

  it('displays formatted deal value', () => {
    render(<ClosedWonConfirmation {...defaultProps} />);

    expect(screen.getByText(/USD/)).toBeInTheDocument();
    expect(screen.getByText(/45,182\.76/)).toBeInTheDocument();
  });

  it('renders timeline when dates are provided', () => {
    render(
      <ClosedWonConfirmation
        {...defaultProps}
        proposalSentAt="2026-02-08T10:00:00Z"
        contractSentAt="2026-02-09T10:00:00Z"
        paymentReceivedAt="2026-02-10T12:00:00Z"
      />
    );

    expect(screen.getByText('Proposal Sent:')).toBeInTheDocument();
    expect(screen.getByText('Contract Sent:')).toBeInTheDocument();
    expect(screen.getByText('Payment Received:')).toBeInTheDocument();
  });

  it('omits timeline entries when dates are missing', () => {
    render(<ClosedWonConfirmation {...defaultProps} />);

    // No dates provided, so no timeline entries should appear
    expect(screen.queryByText('Proposal Sent:')).not.toBeInTheDocument();
    expect(screen.queryByText('Contract Sent:')).not.toBeInTheDocument();
    expect(screen.queryByText('Payment Received:')).not.toBeInTheDocument();
  });

  it('shows partial timeline when only some dates provided', () => {
    render(
      <ClosedWonConfirmation
        {...defaultProps}
        paymentReceivedAt="2026-02-10T12:00:00Z"
      />
    );

    expect(screen.queryByText('Proposal Sent:')).not.toBeInTheDocument();
    expect(screen.queryByText('Contract Sent:')).not.toBeInTheDocument();
    expect(screen.getByText('Payment Received:')).toBeInTheDocument();
  });

  it('displays contract number in description', () => {
    render(<ClosedWonConfirmation {...defaultProps} />);

    expect(screen.getByText(/CONTRACT-2026-001/)).toBeInTheDocument();
  });
});
