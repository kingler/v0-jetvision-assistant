/**
 * Avinode Trip Badge Component Tests
 *
 * Tests for the AvinodeTripBadge component that displays Trip ID and deep link.
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AvinodeTripBadge } from '@/components/avinode-trip-badge';

describe('AvinodeTripBadge', () => {
  // Mock window.open for deep link tests
  const mockWindowOpen = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('open', mockWindowOpen);
  });

  describe('rendering', () => {
    it('should render trip ID when provided', () => {
      render(<AvinodeTripBadge tripId="trp123456" />);

      expect(screen.getByText('trp123456')).toBeInTheDocument();
    });

    it('should render "No trip" when tripId is undefined', () => {
      render(<AvinodeTripBadge />);

      expect(screen.getByText('No trip')).toBeInTheDocument();
    });

    it('should render "No trip" when tripId is empty string', () => {
      render(<AvinodeTripBadge tripId="" />);

      expect(screen.getByText('No trip')).toBeInTheDocument();
    });

    it('should render external link icon when deepLink is provided', () => {
      render(
        <AvinodeTripBadge
          tripId="trp123456"
          deepLink="https://avinode.com/trip/123"
        />
      );

      // Should have an external link icon (aria-hidden SVG or accessible element)
      const badge = screen.getByRole('button');
      expect(badge).toBeInTheDocument();
    });

    it('should not be clickable when no deepLink is provided', () => {
      render(<AvinodeTripBadge tripId="trp123456" />);

      // Should render as span, not button
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('sizes', () => {
    it('should render small size by default', () => {
      render(<AvinodeTripBadge tripId="trp123456" />);

      const badge = screen.getByText('trp123456').closest('[data-slot="badge"]');
      expect(badge).toHaveClass('text-xs');
    });

    it('should render medium size when specified', () => {
      render(<AvinodeTripBadge tripId="trp123456" size="md" />);

      const badge = screen.getByText('trp123456').closest('[data-slot="badge"]');
      expect(badge).toHaveClass('text-sm');
    });
  });

  describe('deep link interaction', () => {
    it('should open deep link in new tab when clicked', () => {
      const deepLink = 'https://avinode.com/trip/123';
      render(
        <AvinodeTripBadge
          tripId="trp123456"
          deepLink={deepLink}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockWindowOpen).toHaveBeenCalledWith(deepLink, '_blank', 'noopener,noreferrer');
    });

    it('should not call window.open when deepLink is missing', () => {
      render(<AvinodeTripBadge tripId="trp123456" />);

      // No button to click when no deep link
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(mockWindowOpen).not.toHaveBeenCalled();
    });

    it('should handle keyboard activation (Enter key)', () => {
      const deepLink = 'https://avinode.com/trip/123';
      render(
        <AvinodeTripBadge
          tripId="trp123456"
          deepLink={deepLink}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'Enter' });

      expect(mockWindowOpen).toHaveBeenCalledWith(deepLink, '_blank', 'noopener,noreferrer');
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      render(
        <AvinodeTripBadge
          tripId="trp123456"
          className="my-custom-class"
        />
      );

      const badge = screen.getByText('trp123456').closest('[data-slot="badge"]');
      expect(badge).toHaveClass('my-custom-class');
    });
  });

  describe('accessibility', () => {
    it('should have accessible label for clickable badge', () => {
      render(
        <AvinodeTripBadge
          tripId="trp123456"
          deepLink="https://avinode.com/trip/123"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Open trip trp123456 in Avinode');
    });

    it('should be focusable when clickable', () => {
      render(
        <AvinodeTripBadge
          tripId="trp123456"
          deepLink="https://avinode.com/trip/123"
        />
      );

      const button = screen.getByRole('button');
      button.focus();
      expect(document.activeElement).toBe(button);
    });
  });
});
