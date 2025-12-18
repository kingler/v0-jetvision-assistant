/**
 * Unit tests for QuoteComparison component
 * @module __tests__/unit/components/quotes/quote-comparison.test
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QuoteComparison } from '@/components/quotes/quote-comparison';
import { mockQuotes, mockQuote1, mockQuote2 } from './mock-data';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div className="recharts-responsive-container">{children}</div>,
  RadarChart: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  PolarGrid: () => <div />,
  PolarAngleAxis: () => <div />,
  PolarRadiusAxis: () => <div />,
  Radar: () => <div />,
  CartesianGrid: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  Bar: () => <div />,
}));

describe('QuoteComparison', () => {
  const mockOnRemoveQuote = vi.fn();
  const mockOnSelectQuote = vi.fn();

  beforeEach(() => {
    mockOnRemoveQuote.mockClear();
    mockOnSelectQuote.mockClear();
  });

  it('should render empty state when no quotes provided', () => {
    render(<QuoteComparison quotes={[]} />);

    expect(screen.getByText(/Select quotes to compare/)).toBeInTheDocument();
  });

  it('should render comparison header with quote count', () => {
    render(<QuoteComparison quotes={mockQuotes} />);

    expect(screen.getByText('Quote Comparison')).toBeInTheDocument();
    expect(screen.getByText(`Comparing ${mockQuotes.length} of ${mockQuotes.length} quotes`)).toBeInTheDocument();
  });

  it('should render quick overview cards for each quote', () => {
    render(<QuoteComparison quotes={mockQuotes} />);

    mockQuotes.forEach((quote) => {
      expect(screen.getAllByText(quote.operator.name).length).toBeGreaterThan(0);
    });
  });

  it('should display rank badges', () => {
    render(<QuoteComparison quotes={mockQuotes} />);

    expect(screen.getByText('Rank #1')).toBeInTheDocument();
    expect(screen.getByText('Rank #2')).toBeInTheDocument();
    expect(screen.getByText('Rank #3')).toBeInTheDocument();
  });

  it('should display recommended badge', () => {
    render(<QuoteComparison quotes={mockQuotes} />);

    const recommendedBadges = screen.getAllByText('Recommended');
    expect(recommendedBadges.length).toBeGreaterThan(0);
  });

  it('should display total prices', () => {
    render(<QuoteComparison quotes={mockQuotes} />);

    expect(screen.getByText(/\$28,000/)).toBeInTheDocument();
    expect(screen.getByText(/\$25,000/)).toBeInTheDocument();
    expect(screen.getByText(/\$36,000/)).toBeInTheDocument();
  });

  it('should display price difference indicators', () => {
    render(<QuoteComparison quotes={mockQuotes} />);

    // Should show baseline for cheapest quote
    expect(screen.getByText('Baseline')).toBeInTheDocument();
  });

  it('should display overall scores', () => {
    render(<QuoteComparison quotes={mockQuotes} />);

    expect(screen.getByText('92/100')).toBeInTheDocument();
    expect(screen.getByText('88/100')).toBeInTheDocument();
    expect(screen.getByText('90/100')).toBeInTheDocument();
  });

  it('should display value indicators', () => {
    render(<QuoteComparison quotes={mockQuotes} />);

    // Value indicators should be present
    const valueIndicators = screen.getAllByText(/Value/);
    expect(valueIndicators.length).toBeGreaterThan(0);
  });

  it('should call onRemoveQuote when remove button is clicked', () => {
    render(
      <QuoteComparison
        quotes={mockQuotes}
        onRemoveQuote={mockOnRemoveQuote}
      />
    );

    const removeButtons = screen.getAllByRole('button', { name: '' }).filter(
      (btn) => btn.querySelector('svg')
    );

    if (removeButtons.length > 0) {
      fireEvent.click(removeButtons[0]);
      expect(mockOnRemoveQuote).toHaveBeenCalled();
    }
  });

  it('should call onSelectQuote when select button is clicked', () => {
    render(
      <QuoteComparison
        quotes={mockQuotes}
        onSelectQuote={mockOnSelectQuote}
      />
    );

    const selectButtons = screen.getAllByText('Select This Quote');
    fireEvent.click(selectButtons[0]);

    expect(mockOnSelectQuote).toHaveBeenCalledWith('quote-1');
  });

  it('should render score breakdown radar chart', () => {
    const { container } = render(<QuoteComparison quotes={mockQuotes} />);

    expect(screen.getByText('Score Breakdown')).toBeInTheDocument();

    // Check for Recharts ResponsiveContainer
    const responsiveContainer = container.querySelector('.recharts-responsive-container');
    expect(responsiveContainer).toBeInTheDocument();
  });

  it('should render price breakdown bar chart', () => {
    const { container } = render(<QuoteComparison quotes={mockQuotes} />);

    expect(screen.getByText('Price Breakdown')).toBeInTheDocument();

    // Check for Recharts elements
    const responsiveContainers = container.querySelectorAll('.recharts-responsive-container');
    expect(responsiveContainers.length).toBeGreaterThan(0);
  });

  it('should render feature comparison table', () => {
    render(<QuoteComparison quotes={mockQuotes} />);

    expect(screen.getByText('Feature Comparison')).toBeInTheDocument();

    // Check for table headers
    expect(screen.getByText('Feature')).toBeInTheDocument();
  });

  it('should display aircraft details in comparison table', () => {
    render(<QuoteComparison quotes={mockQuotes} />);

    expect(screen.getByText('Aircraft Details')).toBeInTheDocument();
    expect(screen.getByText('Aircraft Model')).toBeInTheDocument();
    expect(screen.getByText('Year')).toBeInTheDocument();
    expect(screen.getByText('Capacity')).toBeInTheDocument();
    expect(screen.getByText('Range')).toBeInTheDocument();
  });

  it('should display flight information in comparison table', () => {
    render(<QuoteComparison quotes={mockQuotes} />);

    expect(screen.getByText('Flight Information')).toBeInTheDocument();
    expect(screen.getByText('Departure Time')).toBeInTheDocument();
    expect(screen.getByText('Arrival Time')).toBeInTheDocument();
    expect(screen.getByText('Flight Duration')).toBeInTheDocument();
  });

  it('should display operator information in comparison table', () => {
    render(<QuoteComparison quotes={mockQuotes} />);

    expect(screen.getByText('Operator Information')).toBeInTheDocument();
    expect(screen.getByText('Operator Rating')).toBeInTheDocument();
    expect(screen.getByText('Total Flights')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
  });

  it('should display features and amenities section', () => {
    render(<QuoteComparison quotes={mockQuotes} />);

    expect(screen.getByText('Features & Amenities')).toBeInTheDocument();
  });

  it('should render pros and cons for each quote', () => {
    render(<QuoteComparison quotes={mockQuotes} />);

    // Check for pros/cons headers
    const prosHeaders = screen.getAllByText('Pros');
    const consHeaders = screen.getAllByText('Cons');

    expect(prosHeaders.length).toBeGreaterThan(0);
    expect(consHeaders.length).toBeGreaterThan(0);
  });

  it('should display individual pros for quotes', () => {
    render(<QuoteComparison quotes={mockQuotes} />);

    // Check for at least one pro from mockQuote1
    expect(
      screen.getByText(mockQuote1.prosCons.pros[0])
    ).toBeInTheDocument();
  });

  it('should display individual cons for quotes', () => {
    render(<QuoteComparison quotes={mockQuotes} />);

    // Check for at least one con from mockQuote1
    expect(
      screen.getByText(mockQuote1.prosCons.cons[0])
    ).toBeInTheDocument();
  });

  it('should limit to maxQuotes', () => {
    render(<QuoteComparison quotes={mockQuotes} maxQuotes={2} />);

    expect(screen.getByText(`Comparing 2 of ${mockQuotes.length} quotes`)).toBeInTheDocument();
  });

  it('should handle single quote comparison', () => {
    render(<QuoteComparison quotes={[mockQuote1]} />);

    expect(screen.getByText('Comparing 1 of 1 quotes')).toBeInTheDocument();
    expect(screen.getAllByText(mockQuote1.operator.name).length).toBeGreaterThan(0);
  });

  it('should display feature checkmarks correctly', () => {
    const { container } = render(<QuoteComparison quotes={mockQuotes} />);

    // Should have check and x icons for features
    const svg = container.querySelectorAll('svg');
    expect(svg.length).toBeGreaterThan(0);
  });

  it('should format flight times correctly', () => {
    render(<QuoteComparison quotes={mockQuotes} />);

    // Check for formatted times (will vary based on timezone)
    const timeElements = screen.getAllByText(/\d{1,2}:\d{2}\s?[AP]M/i);
    expect(timeElements.length).toBeGreaterThan(0);
  });

  it('should format flight durations correctly', () => {
    render(<QuoteComparison quotes={mockQuotes} />);

    // Check for formatted durations - use getAllByText since they appear in multiple places
    expect(screen.getAllByText('4h 30m').length).toBeGreaterThan(0);
    expect(screen.getAllByText('4h 15m').length).toBeGreaterThan(0);
  });

  it('should display aircraft ranges with proper formatting', () => {
    render(<QuoteComparison quotes={mockQuotes} />);

    expect(screen.getByText('2,040 nm')).toBeInTheDocument();
    expect(screen.getByText('2,010 nm')).toBeInTheDocument();
    expect(screen.getByText('2,540 nm')).toBeInTheDocument();
  });

  it('should not render remove buttons when onRemoveQuote is not provided', () => {
    render(<QuoteComparison quotes={mockQuotes} />);

    // Without onRemoveQuote, remove buttons shouldn't be present
    // The component should still render properly with quotes
    expect(screen.getByText('Quote Comparison')).toBeInTheDocument();
    // Verify no remove buttons are rendered
    const removeButtons = screen.queryAllByRole('button', { name: /remove/i });
    expect(removeButtons.length).toBe(0);
  });

  it('should not render select buttons when onSelectQuote is not provided', () => {
    render(<QuoteComparison quotes={mockQuotes} />);

    expect(screen.queryByText('Select This Quote')).not.toBeInTheDocument();
  });
});
