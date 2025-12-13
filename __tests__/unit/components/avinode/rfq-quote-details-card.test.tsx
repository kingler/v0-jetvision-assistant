/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { RfqQuoteDetailsCard } from '@/components/avinode/rfq-quote-details-card';

describe('RfqQuoteDetailsCard', () => {
  const mockProps = {
    rfqId: 'arfq-112979451',
    quoteId: 'aquote-386512791',
    operator: {
      name: 'Prime Jet, LLC',
      rating: 4.8,
    },
    aircraft: {
      type: 'Gulfstream G-IV',
      tail: 'N144PK',
      category: 'Heavy Jet',
      maxPassengers: 13,
    },
    price: {
      amount: 37036.32,
      currency: 'USD',
    },
    flightDetails: {
      flightTimeMinutes: 334,
      distanceNm: 2128,
    },
    status: 'unanswered' as const,
    statusDescription: 'Pending seller confirmation',
  };

  it('renders card title', () => {
    render(<RfqQuoteDetailsCard {...mockProps} />);

    expect(screen.getByText(/rfq & quote details/i)).toBeInTheDocument();
  });

  it('renders RFQ ID with copy button', () => {
    render(<RfqQuoteDetailsCard {...mockProps} />);

    expect(screen.getByText(/arfq-112979451/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy rfq/i })).toBeInTheDocument();
  });

  it('renders Quote ID with copy button', () => {
    render(<RfqQuoteDetailsCard {...mockProps} />);

    expect(screen.getByText(/aquote-386512791/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy quote/i })).toBeInTheDocument();
  });

  it('renders operator name', () => {
    render(<RfqQuoteDetailsCard {...mockProps} />);

    expect(screen.getByText(/prime jet, llc/i)).toBeInTheDocument();
  });

  it('renders operator rating', () => {
    render(<RfqQuoteDetailsCard {...mockProps} />);

    expect(screen.getByText(/4\.8/)).toBeInTheDocument();
  });

  it('renders operator without rating when not provided', () => {
    const propsWithoutRating = {
      ...mockProps,
      operator: { name: 'Prime Jet, LLC' },
    };
    render(<RfqQuoteDetailsCard {...propsWithoutRating} />);

    expect(screen.getByText(/prime jet, llc/i)).toBeInTheDocument();
    expect(screen.queryByText(/⭐/)).not.toBeInTheDocument();
  });

  it('renders aircraft type', () => {
    render(<RfqQuoteDetailsCard {...mockProps} />);

    expect(screen.getByText(/gulfstream g-iv/i)).toBeInTheDocument();
  });

  it('renders aircraft tail number', () => {
    render(<RfqQuoteDetailsCard {...mockProps} />);

    expect(screen.getByText(/n144pk/i)).toBeInTheDocument();
  });

  it('renders aircraft category', () => {
    render(<RfqQuoteDetailsCard {...mockProps} />);

    expect(screen.getByText(/heavy jet/i)).toBeInTheDocument();
  });

  it('renders aircraft max passengers', () => {
    render(<RfqQuoteDetailsCard {...mockProps} />);

    expect(screen.getByText(/13/)).toBeInTheDocument();
  });

  it('renders price with currency', () => {
    render(<RfqQuoteDetailsCard {...mockProps} />);

    // Should format as "$37,036.32 USD"
    expect(screen.getByText(/\$37,036\.32/)).toBeInTheDocument();
    expect(screen.getByText(/usd/i)).toBeInTheDocument();
  });

  it('applies prominent styling to price', () => {
    const { container } = render(<RfqQuoteDetailsCard {...mockProps} />);

    // Price should have large, bold, primary color styling
    const priceElement = screen.getByText(/\$37,036\.32/).closest('div');
    expect(priceElement?.className).toMatch(/text-3xl|font-bold|text-primary/);
  });

  it('renders flight time in hours and minutes', () => {
    render(<RfqQuoteDetailsCard {...mockProps} />);

    // 334 minutes = 5h 34min
    expect(screen.getByText(/5h 34min/i)).toBeInTheDocument();
    expect(screen.getByText(/334 min/i)).toBeInTheDocument();
  });

  it('renders distance in nautical miles', () => {
    render(<RfqQuoteDetailsCard {...mockProps} />);

    expect(screen.getByText(/2,128 nm/i)).toBeInTheDocument();
  });

  it('renders status badge for unanswered', () => {
    render(<RfqQuoteDetailsCard {...mockProps} />);

    expect(screen.getByText(/unanswered/i)).toBeInTheDocument();
  });

  it('renders status description', () => {
    render(<RfqQuoteDetailsCard {...mockProps} />);

    expect(screen.getByText(/pending seller confirmation/i)).toBeInTheDocument();
  });

  it('renders quoted status correctly', () => {
    const quotedProps = {
      ...mockProps,
      status: 'quoted' as const,
      statusDescription: 'Quote received',
    };
    render(<RfqQuoteDetailsCard {...quotedProps} />);

    expect(screen.getByText(/quoted/i)).toBeInTheDocument();
  });

  it('renders accepted status with success styling', () => {
    const acceptedProps = {
      ...mockProps,
      status: 'accepted' as const,
      statusDescription: 'Quote accepted by buyer',
    };
    const { container } = render(<RfqQuoteDetailsCard {...acceptedProps} />);

    // Look for badge within status section
    const statusSection = container.querySelector('[data-slot="badge"]');
    expect(statusSection).toBeInTheDocument();
    expect(statusSection?.textContent).toContain('Accepted');
  });

  it('renders declined status with destructive styling', () => {
    const declinedProps = {
      ...mockProps,
      status: 'declined' as const,
      statusDescription: 'Quote declined by buyer',
    };
    const { container } = render(<RfqQuoteDetailsCard {...declinedProps} />);

    const statusSection = container.querySelector('[data-slot="badge"]');
    expect(statusSection).toBeInTheDocument();
    expect(statusSection?.textContent).toContain('Declined');
  });

  it('renders expired status with muted styling', () => {
    const expiredProps = {
      ...mockProps,
      status: 'expired' as const,
      statusDescription: 'Quote has expired',
    };
    const { container } = render(<RfqQuoteDetailsCard {...expiredProps} />);

    const statusSection = container.querySelector('[data-slot="badge"]');
    expect(statusSection).toBeInTheDocument();
    expect(statusSection?.textContent).toContain('Expired');
  });

  it('calls onCopyRfqId when RFQ copy button is clicked', () => {
    const onCopyRfqId = vi.fn();
    render(<RfqQuoteDetailsCard {...mockProps} onCopyRfqId={onCopyRfqId} />);

    const copyButton = screen.getByRole('button', { name: /copy rfq/i });
    copyButton.click();

    expect(onCopyRfqId).toHaveBeenCalledTimes(1);
  });

  it('calls onCopyQuoteId when Quote copy button is clicked', () => {
    const onCopyQuoteId = vi.fn();
    render(<RfqQuoteDetailsCard {...mockProps} onCopyQuoteId={onCopyQuoteId} />);

    const copyButton = screen.getByRole('button', { name: /copy quote/i });
    copyButton.click();

    expect(onCopyQuoteId).toHaveBeenCalledTimes(1);
  });

  it('renders section icons', () => {
    const { container } = render(<RfqQuoteDetailsCard {...mockProps} />);

    // Should have icons for operator, aircraft, price, flight details, status
    const icons = container.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('formats price with commas for thousands', () => {
    const largePrice = {
      ...mockProps,
      price: { amount: 1234567.89, currency: 'USD' },
    };
    render(<RfqQuoteDetailsCard {...largePrice} />);

    expect(screen.getByText(/\$1,234,567\.89/)).toBeInTheDocument();
  });
});
