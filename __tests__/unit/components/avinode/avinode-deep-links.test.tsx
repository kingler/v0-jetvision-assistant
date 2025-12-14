/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { AvinodeDeepLinks } from '@/components/avinode/avinode-deep-links';

describe('AvinodeDeepLinks', () => {
  const mockLinks = {
    searchInAvinode: {
      href: 'https://sandbox.avinode.com/marketplace/mvc/trips/buying/search',
      description: 'Search for this trip in Avinode marketplace',
    },
    viewInAvinode: {
      href: 'https://sandbox.avinode.com/marketplace/mvc/trips/buying/atrip-64956156',
      description: 'View trip details in Avinode',
    },
    cancel: {
      href: 'https://sandbox.avinode.com/api/trips/atrip-64956156/cancel',
      description: 'Cancel this trip request',
    },
  };

  it('renders section title', () => {
    render(<AvinodeDeepLinks links={mockLinks} />);

    expect(screen.getByText(/avinode actions/i)).toBeInTheDocument();
  });

  it('renders search link with primary styling', () => {
    render(<AvinodeDeepLinks links={mockLinks} />);

    const searchLink = screen.getByRole('link', { name: /search in avinode/i });
    expect(searchLink).toBeInTheDocument();
    expect(searchLink).toHaveAttribute('href', mockLinks.searchInAvinode.href);
    expect(searchLink).toHaveAttribute('target', '_blank');
    expect(searchLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders search link description', () => {
    render(<AvinodeDeepLinks links={mockLinks} />);

    expect(screen.getByText(mockLinks.searchInAvinode.description)).toBeInTheDocument();
  });

  it('renders view link with external link icon', () => {
    render(<AvinodeDeepLinks links={mockLinks} />);

    const viewLink = screen.getByRole('link', { name: /view trip/i });
    expect(viewLink).toBeInTheDocument();
    expect(viewLink).toHaveAttribute('href', mockLinks.viewInAvinode.href);
    expect(viewLink).toHaveAttribute('target', '_blank');
  });

  it('renders view link description', () => {
    render(<AvinodeDeepLinks links={mockLinks} />);

    expect(screen.getByText(mockLinks.viewInAvinode.description)).toBeInTheDocument();
  });

  it('renders cancel link with destructive styling', () => {
    render(<AvinodeDeepLinks links={mockLinks} />);

    const cancelLink = screen.getByRole('link', { name: /cancel trip/i });
    expect(cancelLink).toBeInTheDocument();
    expect(cancelLink).toHaveAttribute('href', mockLinks.cancel.href);
  });

  it('renders cancel link description', () => {
    render(<AvinodeDeepLinks links={mockLinks} />);

    expect(screen.getByText(mockLinks.cancel.description)).toBeInTheDocument();
  });

  it('displays truncated URLs for each link', () => {
    render(<AvinodeDeepLinks links={mockLinks} />);

    // Should show domain for all three links
    const urlElements = screen.getAllByText(/sandbox\.avinode\.com/);
    expect(urlElements).toHaveLength(3); // Search, View, Cancel
  });

  it('calls onLinkClick with correct link type when search link is clicked', () => {
    const onLinkClick = vi.fn();
    render(<AvinodeDeepLinks links={mockLinks} onLinkClick={onLinkClick} />);

    const searchLink = screen.getByRole('link', { name: /search in avinode/i });
    searchLink.click();

    expect(onLinkClick).toHaveBeenCalledWith('search');
  });

  it('calls onLinkClick with correct link type when view link is clicked', () => {
    const onLinkClick = vi.fn();
    render(<AvinodeDeepLinks links={mockLinks} onLinkClick={onLinkClick} />);

    const viewLink = screen.getByRole('link', { name: /view trip/i });
    viewLink.click();

    expect(onLinkClick).toHaveBeenCalledWith('view');
  });

  it('calls onLinkClick with correct link type when cancel link is clicked', () => {
    const onLinkClick = vi.fn();
    render(<AvinodeDeepLinks links={mockLinks} onLinkClick={onLinkClick} />);

    const cancelLink = screen.getByRole('link', { name: /cancel trip/i });
    cancelLink.click();

    expect(onLinkClick).toHaveBeenCalledWith('cancel');
  });

  it('renders external link icons', () => {
    const { container } = render(<AvinodeDeepLinks links={mockLinks} />);

    // Should have ExternalLink icons from lucide-react
    const icons = container.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('applies hover states to link cards', () => {
    const { container } = render(<AvinodeDeepLinks links={mockLinks} />);

    const linkCards = container.querySelectorAll('a');
    linkCards.forEach((card) => {
      expect(card.className).toMatch(/hover/);
    });
  });

  it('applies primary action styling to search link', () => {
    const { container } = render(<AvinodeDeepLinks links={mockLinks} />);

    const searchLink = screen.getByRole('link', { name: /search in avinode/i });
    expect(searchLink.className).toMatch(/border-primary/);
  });

  it('renders instructional text for next steps', () => {
    render(<AvinodeDeepLinks links={mockLinks} />);

    // Should have instructional text about using Avinode
    expect(screen.getByText(/click any link above/i)).toBeInTheDocument();
  });
});
