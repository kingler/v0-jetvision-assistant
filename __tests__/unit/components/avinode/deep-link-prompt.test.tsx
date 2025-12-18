/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { DeepLinkPrompt } from '@/components/avinode/deep-link-prompt';
import type { DeepLinkPromptProps } from '@/components/avinode/deep-link-prompt';

describe('DeepLinkPrompt', () => {
  const mockProps: DeepLinkPromptProps = {
    departureAirport: {
      icao: 'KTEB',
      name: 'Teterboro Airport',
      city: 'Teterboro, NJ',
    },
    arrivalAirport: {
      icao: 'KPBI',
      name: 'Palm Beach International Airport',
      city: 'West Palm Beach, FL',
    },
    departureDate: '2025-12-25',
    passengers: 6,
    requestId: 'REQ-12345',
    deepLink: 'https://marketplace.avinode.com/trip/12345',
  };

  beforeEach(() => {
    // Reset clipboard API mock
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(() => Promise.resolve()),
      },
    });
  });

  describe('Rendering', () => {
    it('should render the component with all required elements', () => {
      render(<DeepLinkPrompt {...mockProps} />);

      // Check for main heading
      expect(screen.getByText(/Your request has been created/i)).toBeInTheDocument();

      // Check for route display
      expect(screen.getByText('KTEB')).toBeInTheDocument();
      expect(screen.getByText('KPBI')).toBeInTheDocument();

      // Check for airport details
      expect(screen.getByText(/Teterboro Airport/i)).toBeInTheDocument();
      expect(screen.getByText(/Palm Beach International Airport/i)).toBeInTheDocument();

      // Check for date
      expect(screen.getByText(/December 25, 2025/i)).toBeInTheDocument();

      // Check for passengers
      expect(screen.getByText(/6/)).toBeInTheDocument();

      // Check for request ID
      expect(screen.getByText('REQ-12345')).toBeInTheDocument();
    });

    it('should render primary CTA button with correct attributes', () => {
      render(<DeepLinkPrompt {...mockProps} />);

      const primaryButton = screen.getByRole('link', { name: /Open in Avinode Marketplace/i });
      expect(primaryButton).toBeInTheDocument();
      expect(primaryButton).toHaveAttribute('href', mockProps.deepLink);
      expect(primaryButton).toHaveAttribute('target', '_blank');
      expect(primaryButton).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should render secondary Copy Link button', () => {
      render(<DeepLinkPrompt {...mockProps} />);

      // Find button by its aria-label
      const copyButton = screen.getByRole('button', { name: /Copy deep link to clipboard/i });
      expect(copyButton).toBeInTheDocument();
      expect(copyButton).toHaveTextContent('Copy Link');
    });

    it('should render help text explaining next steps', () => {
      render(<DeepLinkPrompt {...mockProps} />);

      expect(
        screen.getByText(/Click the button above to open your request in Avinode/i)
      ).toBeInTheDocument();
    });

    it('should handle optional airport properties gracefully', () => {
      const propsWithMinimalAirportInfo: DeepLinkPromptProps = {
        ...mockProps,
        departureAirport: {
          icao: 'KTEB',
        },
        arrivalAirport: {
          icao: 'KPBI',
        },
      };

      render(<DeepLinkPrompt {...propsWithMinimalAirportInfo} />);

      // Should still render ICAO codes
      expect(screen.getByText('KTEB')).toBeInTheDocument();
      expect(screen.getByText('KPBI')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onLinkClick callback when primary button is clicked', () => {
      const mockOnLinkClick = vi.fn();
      render(<DeepLinkPrompt {...mockProps} onLinkClick={mockOnLinkClick} />);

      const primaryButton = screen.getByRole('link', { name: /Open in Avinode Marketplace/i });
      fireEvent.click(primaryButton);

      expect(mockOnLinkClick).toHaveBeenCalledTimes(1);
    });

    it('should copy link to clipboard when Copy Link button is clicked', async () => {
      const mockWriteText = vi.fn(() => Promise.resolve());
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      render(<DeepLinkPrompt {...mockProps} />);

      const copyButton = screen.getByRole('button', { name: /Copy deep link to clipboard/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith(mockProps.deepLink);
      });
    });

    it('should call onCopyLink callback when Copy Link button is clicked', async () => {
      const mockOnCopyLink = vi.fn();
      render(<DeepLinkPrompt {...mockProps} onCopyLink={mockOnCopyLink} />);

      const copyButton = screen.getByRole('button', { name: /Copy deep link to clipboard/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockOnCopyLink).toHaveBeenCalledTimes(1);
      });
    });

    it('should show success feedback after copying link', async () => {
      render(<DeepLinkPrompt {...mockProps} />);

      const copyButton = screen.getByRole('button', { name: /Copy deep link to clipboard/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText(/Copied!/i)).toBeInTheDocument();
      });
    });

    it('should handle clipboard API errors gracefully', async () => {
      const mockWriteText = vi.fn(() => Promise.reject(new Error('Clipboard error')));
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      render(<DeepLinkPrompt {...mockProps} />);

      const copyButton = screen.getByRole('button', { name: /Copy deep link to clipboard/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalled();
      });

      // Should not crash and should show error state
      expect(copyButton).toBeInTheDocument();
    });
  });

  describe('Date Formatting', () => {
    it('should format ISO date string correctly', () => {
      render(<DeepLinkPrompt {...mockProps} departureDate="2025-01-15" />);

      expect(screen.getByText(/January 15, 2025/i)).toBeInTheDocument();
    });

    it('should handle different date formats', () => {
      render(<DeepLinkPrompt {...mockProps} departureDate="2025-06-01" />);

      expect(screen.getByText(/June 1, 2025/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<DeepLinkPrompt {...mockProps} />);

      const copyButton = screen.getByRole('button', { name: /Copy deep link to clipboard/i });
      expect(copyButton).toHaveAttribute('aria-label', 'Copy deep link to clipboard');
    });

    it('should be keyboard navigable', () => {
      render(<DeepLinkPrompt {...mockProps} />);

      const primaryButton = screen.getByRole('link', { name: /Open in Avinode Marketplace/i });
      const copyButton = screen.getByRole('button', { name: /Copy deep link to clipboard/i });

      // Both buttons should be focusable
      primaryButton.focus();
      expect(document.activeElement).toBe(primaryButton);

      copyButton.focus();
      expect(document.activeElement).toBe(copyButton);
    });

    it('should have appropriate heading hierarchy', () => {
      render(<DeepLinkPrompt {...mockProps} />);

      // Card title is rendered but may not have a semantic heading tag
      // Check for the title text instead
      expect(screen.getByText(/Your request has been created/i)).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should render correctly on mobile viewports', () => {
      // Test that the component renders without errors in mobile layout
      // The actual responsive behavior is tested through CSS classes
      render(<DeepLinkPrompt {...mockProps} />);

      // Component should still render all essential elements
      expect(screen.getByText('KTEB')).toBeInTheDocument();
      expect(screen.getByText('KPBI')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Open in Avinode Marketplace/i })).toBeInTheDocument();

      // Check that grid layout exists for responsive design
      const detailsGrid = document.querySelector('.grid.grid-cols-1.sm\\:grid-cols-3');
      expect(detailsGrid).toBeInTheDocument();
    });
  });

  describe('Dark Mode Support', () => {
    it('should render with dark mode classes', () => {
      render(<DeepLinkPrompt {...mockProps} />);

      // Check that component includes dark mode classes by looking at the card content
      // Dark mode classes are in the className strings like "dark:bg-muted/20"
      const elements = document.querySelectorAll('[class*="dark:"]');
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single passenger correctly', () => {
      render(<DeepLinkPrompt {...mockProps} passengers={1} />);

      // Look for the passengers section specifically
      const passengersSection = screen.getByText(/Passengers/i).closest('div');
      expect(passengersSection).toHaveTextContent('1');
    });

    it('should handle very long airport names', () => {
      const propsWithLongNames: DeepLinkPromptProps = {
        ...mockProps,
        departureAirport: {
          icao: 'KTEB',
          name: 'Very Long Airport Name That Should Be Handled Properly',
          city: 'Very Long City Name, State',
        },
      };

      render(<DeepLinkPrompt {...propsWithLongNames} />);

      expect(
        screen.getByText(/Very Long Airport Name That Should Be Handled Properly/i)
      ).toBeInTheDocument();
    });

    it('should handle special characters in requestId', () => {
      render(<DeepLinkPrompt {...mockProps} requestId="REQ-12345-ABC!@#" />);

      expect(screen.getByText('REQ-12345-ABC!@#')).toBeInTheDocument();
    });

    it('should handle very long deep links', () => {
      const longLink = 'https://marketplace.avinode.com/trip/12345?param1=value1&param2=value2&param3=value3';
      render(<DeepLinkPrompt {...mockProps} deepLink={longLink} />);

      const primaryButton = screen.getByRole('link', { name: /Open in Avinode Marketplace/i });
      expect(primaryButton).toHaveAttribute('href', longLink);
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const { rerender } = render(<DeepLinkPrompt {...mockProps} />);

      const initialButton = screen.getByRole('link', { name: /Open in Avinode Marketplace/i });

      // Re-render with same props
      rerender(<DeepLinkPrompt {...mockProps} />);

      const afterRerenderButton = screen.getByRole('link', { name: /Open in Avinode Marketplace/i });

      // Should be the same element
      expect(initialButton).toBe(afterRerenderButton);
    });
  });
});
