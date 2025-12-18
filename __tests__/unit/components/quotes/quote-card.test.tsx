/**
 * Unit tests for QuoteCard component
 * @module __tests__/unit/components/quotes/quote-card.test
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QuoteCard } from '@/components/quotes/quote-card';
import { mockQuote1, mockQuote2 } from './mock-data';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('QuoteCard', () => {
  const mockOnAction = vi.fn();

  beforeEach(() => {
    mockOnAction.mockClear();
  });

  it('should render quote card with operator information', () => {
    render(<QuoteCard quote={mockQuote1} />);

    expect(screen.getByText(mockQuote1.operator.name)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(mockQuote1.operator.location))).toBeInTheDocument();
  });

  it('should render aircraft information', () => {
    render(<QuoteCard quote={mockQuote1} />);

    expect(screen.getByText(mockQuote1.aircraft.type)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(mockQuote1.aircraft.model))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${mockQuote1.aircraft.capacity} seats`))).toBeInTheDocument();
  });

  it('should render pricing information', () => {
    render(<QuoteCard quote={mockQuote1} />);

    // Check for total price
    const totalPrice = screen.getByText(/\$28,000/);
    expect(totalPrice).toBeInTheDocument();
  });

  it('should display recommended badge for recommended quotes', () => {
    render(<QuoteCard quote={mockQuote1} />);

    expect(screen.getByText('RECOMMENDED')).toBeInTheDocument();
  });

  it('should not display recommended badge for non-recommended quotes', () => {
    render(<QuoteCard quote={mockQuote2} />);

    expect(screen.queryByText('RECOMMENDED')).not.toBeInTheDocument();
  });

  it('should display rank badge when rank is provided', () => {
    render(<QuoteCard quote={mockQuote1} />);

    expect(screen.getByText('#1')).toBeInTheDocument();
  });

  it('should display overall score', () => {
    render(<QuoteCard quote={mockQuote1} />);

    expect(screen.getByText('92/100')).toBeInTheDocument();
  });

  it('should display score breakdown', () => {
    render(<QuoteCard quote={mockQuote1} />);

    expect(screen.getByText('85/100')).toBeInTheDocument(); // Price score
    expect(screen.getByText('95/100')).toBeInTheDocument(); // Safety score
  });

  it('should display features', () => {
    render(<QuoteCard quote={mockQuote1} />);

    // Check first few features are rendered
    expect(screen.getByText('WiFi')).toBeInTheDocument();
    expect(screen.getByText('Catering')).toBeInTheDocument();
  });

  it('should call onAction when select button is clicked', () => {
    render(<QuoteCard quote={mockQuote1} onAction={mockOnAction} />);

    const selectButton = screen.getByText('Select Quote');
    fireEvent.click(selectButton);

    expect(mockOnAction).toHaveBeenCalledWith('select', mockQuote1);
    expect(mockOnAction).toHaveBeenCalledTimes(1);
  });

  it('should call onAction when download button is clicked', () => {
    render(<QuoteCard quote={mockQuote1} onAction={mockOnAction} />);

    const downloadButton = screen.getByText('Download');
    fireEvent.click(downloadButton);

    expect(mockOnAction).toHaveBeenCalledWith('download-pdf', mockQuote1);
  });

  it('should call onAction when note button is clicked', () => {
    render(<QuoteCard quote={mockQuote1} onAction={mockOnAction} />);

    const noteButton = screen.getByText('Note');
    fireEvent.click(noteButton);

    expect(mockOnAction).toHaveBeenCalledWith('add-note', mockQuote1);
  });

  it('should call onAction when share button is clicked', () => {
    render(<QuoteCard quote={mockQuote1} onAction={mockOnAction} />);

    const shareButton = screen.getByText('Share');
    fireEvent.click(shareButton);

    expect(mockOnAction).toHaveBeenCalledWith('share', mockQuote1);
  });

  it('should show comparison button when showComparison is true', () => {
    render(<QuoteCard quote={mockQuote1} showComparison={true} />);

    expect(screen.getByText('Compare')).toBeInTheDocument();
  });

  it('should not show comparison button when showComparison is false', () => {
    render(<QuoteCard quote={mockQuote1} showComparison={false} />);

    expect(screen.queryByText('Compare')).not.toBeInTheDocument();
  });

  it('should apply selected styling when isSelected is true', () => {
    const { container } = render(<QuoteCard quote={mockQuote1} isSelected={true} />);

    const card = container.querySelector('.ring-2');
    expect(card).toBeInTheDocument();
  });

  it('should display operator rating stars', () => {
    render(<QuoteCard quote={mockQuote1} />);

    // Check rating value is displayed
    expect(screen.getByText(/4\.8/)).toBeInTheDocument();
  });

  it('should display flight duration', () => {
    render(<QuoteCard quote={mockQuote1} />);

    expect(screen.getByText('4h 30m')).toBeInTheDocument();
  });

  it('should display pros when available', () => {
    render(<QuoteCard quote={mockQuote1} />);

    // First pro should be visible
    expect(
      screen.getByText(mockQuote1.prosCons.pros[0])
    ).toBeInTheDocument();
  });

  it('should handle quotes without pros/cons gracefully', () => {
    const quoteWithoutProsCons = {
      ...mockQuote1,
      prosCons: { pros: [], cons: [] },
    };

    render(<QuoteCard quote={quoteWithoutProsCons} />);

    // Should still render the card with operator info
    expect(screen.getByText(mockQuote1.operator.name)).toBeInTheDocument();
  });

  it('should format currency correctly', () => {
    render(<QuoteCard quote={mockQuote1} />);

    // Check various price displays
    expect(screen.getByText(/\$25,000/)).toBeInTheDocument(); // Base price
    expect(screen.getByText(/\$28,000/)).toBeInTheDocument(); // Total price
  });
});
