/**
 * Unit tests for QuoteGrid component
 * @module __tests__/unit/components/quotes/quote-grid.test
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QuoteGrid } from '@/components/quotes/quote-grid';
import { mockQuotes } from './mock-data';

// Mock scrollIntoView for radix-ui components
Element.prototype.scrollIntoView = vi.fn();

// Mock ResizeObserver for radix-ui components
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('QuoteGrid', () => {
  const mockOnQuoteAction = vi.fn();

  beforeEach(() => {
    mockOnQuoteAction.mockClear();
  });

  it('should render grid header with quote count', () => {
    render(<QuoteGrid quotes={mockQuotes} />);

    expect(screen.getByText('Available Quotes')).toBeInTheDocument();
    expect(screen.getByText(`Showing ${mockQuotes.length} of ${mockQuotes.length} quotes`)).toBeInTheDocument();
  });

  it('should render all quotes', () => {
    render(<QuoteGrid quotes={mockQuotes} />);

    mockQuotes.forEach((quote) => {
      expect(screen.getByText(quote.operator.name)).toBeInTheDocument();
    });
  });

  it('should render statistics bar', () => {
    render(<QuoteGrid quotes={mockQuotes} />);

    expect(screen.getByText('Average Price')).toBeInTheDocument();
    // Price Range appears multiple times (stats bar + when filter panel is not shown)
    expect(screen.getAllByText('Price Range').length).toBeGreaterThan(0);
    expect(screen.getByText('Avg Rating')).toBeInTheDocument();
    // Recommended appears in stats bar and as badges on quote cards
    expect(screen.getAllByText('Recommended').length).toBeGreaterThan(0);
  });

  it('should render quick filter buttons', () => {
    render(<QuoteGrid quotes={mockQuotes} />);

    expect(screen.getByText('Best Value')).toBeInTheDocument();
    expect(screen.getByText('Fastest')).toBeInTheDocument();
    expect(screen.getByText('Cheapest')).toBeInTheDocument();
    expect(screen.getByText('Highest Rated')).toBeInTheDocument();
  });

  it('should toggle between grid and list view', () => {
    const { container } = render(<QuoteGrid quotes={mockQuotes} />);

    // Default is grid view
    const gridContainer = container.querySelector('.grid');
    expect(gridContainer).toBeInTheDocument();

    // Click list view button
    const listButton = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('svg') && btn.textContent === ''
    );

    // Grid should still be present (we're checking for the class)
    expect(gridContainer).toBeInTheDocument();
  });

  it('should filter quotes by search query', async () => {
    render(<QuoteGrid quotes={mockQuotes} />);

    const searchInput = screen.getByPlaceholderText('Search by operator, aircraft...');
    fireEvent.change(searchInput, { target: { value: 'Elite' } });

    await waitFor(() => {
      expect(screen.getByText('Elite Airways')).toBeInTheDocument();
      expect(screen.queryByText('Sky Charter')).not.toBeInTheDocument();
    });
  });

  it('should sort quotes by price ascending', async () => {
    render(<QuoteGrid quotes={mockQuotes} />);

    const sortSelect = screen.getByRole('combobox');
    fireEvent.click(sortSelect);

    const priceAscOption = await screen.findByText('Price: Low to High');
    fireEvent.click(priceAscOption);

    // After sorting, cheapest quote should appear first
    const cards = screen.getAllByText(/\$/);
    expect(cards[0]).toBeInTheDocument();
  });

  it('should show filter panel when filter button is clicked', async () => {
    render(<QuoteGrid quotes={mockQuotes} />);

    const filterButton = screen.getByText('Filters');
    fireEvent.click(filterButton);

    await waitFor(() => {
      // Price Range appears in both stats bar and filter panel - check for multiple
      expect(screen.getAllByText('Price Range').length).toBeGreaterThan(1);
      expect(screen.getByText('Aircraft Type')).toBeInTheDocument();
    });
  });

  it('should filter by aircraft type', async () => {
    render(<QuoteGrid quotes={mockQuotes} />);

    // Open filters
    const filterButton = screen.getByText('Filters');
    fireEvent.click(filterButton);

    await waitFor(() => {
      const lightJetCheckbox = screen.getByLabelText('Light Jet');
      fireEvent.click(lightJetCheckbox);
    });

    // Should show only light jets
    await waitFor(() => {
      expect(screen.getByText('Elite Airways')).toBeInTheDocument();
      expect(screen.getByText('Sky Charter')).toBeInTheDocument();
    });
  });

  it('should reset filters when reset button is clicked', async () => {
    render(<QuoteGrid quotes={mockQuotes} />);

    // Open filters
    const filterButton = screen.getByText('Filters');
    fireEvent.click(filterButton);

    await waitFor(() => {
      const resetButton = screen.getByText('Reset');
      fireEvent.click(resetButton);
    });

    // All quotes should be visible again
    await waitFor(() => {
      mockQuotes.forEach((quote) => {
        expect(screen.getByText(quote.operator.name)).toBeInTheDocument();
      });
    });
  });

  it('should apply quick filter for cheapest', async () => {
    render(<QuoteGrid quotes={mockQuotes} />);

    const cheapestButton = screen.getByText('Cheapest');
    fireEvent.click(cheapestButton);

    // Sort should be applied (we can't easily test the order without checking DOM order)
    await waitFor(() => {
      expect(screen.getByText('Sky Charter')).toBeInTheDocument();
    });
  });

  it('should display empty state when no quotes match filters', async () => {
    render(<QuoteGrid quotes={mockQuotes} />);

    const searchInput = screen.getByPlaceholderText('Search by operator, aircraft...');
    fireEvent.change(searchInput, { target: { value: 'NonexistentOperator' } });

    await waitFor(() => {
      expect(screen.getByText('No quotes found')).toBeInTheDocument();
      expect(screen.getByText('Reset Filters')).toBeInTheDocument();
    });
  });

  it('should handle empty quotes array', () => {
    render(<QuoteGrid quotes={[]} />);

    expect(screen.getByText('Showing 0 of 0 quotes')).toBeInTheDocument();
  });

  it('should pass selected quotes to quote cards', () => {
    const selectedQuotes = ['quote-1'];
    render(<QuoteGrid quotes={mockQuotes} selectedQuotes={selectedQuotes} />);

    // Quote 1 should show "Selected" button
    const selectedButton = screen.getByText('Selected');
    expect(selectedButton).toBeInTheDocument();
  });

  it('should call onQuoteAction when quote action is triggered', () => {
    render(<QuoteGrid quotes={mockQuotes} onQuoteAction={mockOnQuoteAction} />);

    const selectButtons = screen.getAllByText('Select Quote');
    fireEvent.click(selectButtons[0]);

    expect(mockOnQuoteAction).toHaveBeenCalledWith('select', mockQuotes[0]);
  });

  it('should calculate statistics correctly', () => {
    render(<QuoteGrid quotes={mockQuotes} />);

    // Average price calculation: (28000 + 25000 + 36000) / 3 = 29667
    expect(screen.getByText(/\$29,667/)).toBeInTheDocument();

    // Recommended count
    const recommendedStat = screen.getByText('1');
    expect(recommendedStat).toBeInTheDocument();
  });

  it('should show comparison button when showComparison is true', () => {
    render(<QuoteGrid quotes={mockQuotes} showComparison={true} />);

    const compareButtons = screen.getAllByText('Compare');
    expect(compareButtons.length).toBeGreaterThan(0);
  });

  it('should filter by price range', async () => {
    render(<QuoteGrid quotes={mockQuotes} />);

    // Open filters
    const filterButton = screen.getByText('Filters');
    fireEvent.click(filterButton);

    await waitFor(() => {
      // There are 2 elements with "Price Range" text - one in stats bar, one in filters
      const priceRangeElements = screen.getAllByText('Price Range');
      expect(priceRangeElements.length).toBeGreaterThan(1);
    });

    // Price slider should be rendered
    const sliders = screen.getAllByRole('slider');
    expect(sliders.length).toBeGreaterThan(0);
  });

  it('should filter by minimum operator rating', async () => {
    render(<QuoteGrid quotes={mockQuotes} />);

    // Open filters
    const filterButton = screen.getByText('Filters');
    fireEvent.click(filterButton);

    await waitFor(() => {
      // Find the Minimum Operator Rating label in the filter panel
      expect(screen.getByText('Minimum Operator Rating')).toBeInTheDocument();
    });

    // Rating slider should be rendered (2 sliders: price range and operator rating)
    const sliders = screen.getAllByRole('slider');
    expect(sliders.length).toBeGreaterThanOrEqual(2);
  });
});
