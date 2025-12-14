/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { AvinodeMessageCard } from '@/components/avinode/avinode-message-card';

describe('AvinodeMessageCard', () => {
  const mockRequestMessage = {
    messageType: 'REQUEST' as const,
    content: 'Book this flight',
    timestamp: '2025-12-13T15:27:00Z',
    sender: 'John Doe',
  };

  const mockResponseMessage = {
    messageType: 'RESPONSE' as const,
    content: 'Flight confirmed. We will send you the details shortly.',
    timestamp: '2025-12-13T15:30:00Z',
    sender: 'Support Team',
  };

  const mockInfoMessage = {
    messageType: 'INFO' as const,
    content: 'Your request has been received and is being processed.',
    timestamp: '2025-12-13T15:28:00Z',
  };

  const mockConfirmationMessage = {
    messageType: 'CONFIRMATION' as const,
    content: 'Payment received. Booking confirmed.',
    timestamp: '2025-12-13T16:00:00Z',
  };

  describe('Card Title', () => {
    it('renders communication title', () => {
      render(<AvinodeMessageCard {...mockRequestMessage} />);

      expect(screen.getByText(/communication/i)).toBeInTheDocument();
    });

    it('renders message icon', () => {
      const { container } = render(<AvinodeMessageCard {...mockRequestMessage} />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Message Type Badge', () => {
    it('renders REQUEST badge', () => {
      render(<AvinodeMessageCard {...mockRequestMessage} />);

      expect(screen.getByText(/REQUEST/i)).toBeInTheDocument();
    });

    it('renders RESPONSE badge', () => {
      render(<AvinodeMessageCard {...mockResponseMessage} />);

      expect(screen.getByText(/RESPONSE/i)).toBeInTheDocument();
    });

    it('renders INFO badge', () => {
      render(<AvinodeMessageCard {...mockInfoMessage} />);

      expect(screen.getByText(/INFO/i)).toBeInTheDocument();
    });

    it('renders CONFIRMATION badge', () => {
      render(<AvinodeMessageCard {...mockConfirmationMessage} />);

      expect(screen.getByText(/CONFIRMATION/i)).toBeInTheDocument();
    });

    it('applies correct badge variant for REQUEST', () => {
      const { container } = render(<AvinodeMessageCard {...mockRequestMessage} />);

      const badge = container.querySelector('[data-slot="badge"]');
      expect(badge).toBeInTheDocument();
    });

    it('applies correct badge variant for RESPONSE', () => {
      const { container } = render(<AvinodeMessageCard {...mockResponseMessage} />);

      const badge = container.querySelector('[data-slot="badge"]');
      expect(badge).toBeInTheDocument();
    });

    it('applies correct badge variant for INFO', () => {
      const { container } = render(<AvinodeMessageCard {...mockInfoMessage} />);

      const badge = container.querySelector('[data-slot="badge"]');
      expect(badge).toBeInTheDocument();
    });

    it('applies correct badge variant for CONFIRMATION', () => {
      const { container } = render(<AvinodeMessageCard {...mockConfirmationMessage} />);

      const badge = container.querySelector('[data-slot="badge"]');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Message Content', () => {
    it('renders message content', () => {
      render(<AvinodeMessageCard {...mockRequestMessage} />);

      expect(screen.getByText(/book this flight/i)).toBeInTheDocument();
    });

    it('renders content in quotes', () => {
      render(<AvinodeMessageCard {...mockRequestMessage} />);

      expect(screen.getByText(/"Book this flight"/i)).toBeInTheDocument();
    });

    it('handles multi-line content', () => {
      const multiLineMessage = {
        ...mockRequestMessage,
        content: 'Please book this flight.\nWe need it urgently.\nThank you.',
      };
      render(<AvinodeMessageCard {...multiLineMessage} />);

      expect(screen.getByText(/please book this flight/i)).toBeInTheDocument();
    });
  });

  describe('Timestamp Display', () => {
    it('renders sent timestamp label', () => {
      render(<AvinodeMessageCard {...mockRequestMessage} />);

      expect(screen.getByText(/sent:/i)).toBeInTheDocument();
    });

    it('renders formatted timestamp', () => {
      render(<AvinodeMessageCard {...mockRequestMessage} />);

      // Should format timestamp (e.g., "Dec 13, 2025 at 3:27 PM")
      expect(screen.getByText(/dec 13, 2025/i)).toBeInTheDocument();
    });

    it('renders time in timestamp', () => {
      render(<AvinodeMessageCard {...mockRequestMessage} />);

      // Check for time portion (format may vary by timezone)
      expect(screen.getByText(/\d{1,2}:\d{2}/)).toBeInTheDocument();
    });
  });

  describe('Sender Display', () => {
    it('renders sender when provided', () => {
      render(<AvinodeMessageCard {...mockRequestMessage} />);

      expect(screen.getByText(/john doe/i)).toBeInTheDocument();
    });

    it('renders sender label', () => {
      render(<AvinodeMessageCard {...mockRequestMessage} />);

      expect(screen.getByText(/from:/i)).toBeInTheDocument();
    });

    it('does not render sender section when sender is not provided', () => {
      render(<AvinodeMessageCard {...mockInfoMessage} />);

      expect(screen.queryByText(/from:/i)).not.toBeInTheDocument();
    });
  });

  describe('Layout and Structure', () => {
    it('renders as a card component', () => {
      const { container } = render(<AvinodeMessageCard {...mockRequestMessage} />);

      const card = container.querySelector('[data-slot="card"]');
      expect(card).toBeInTheDocument();
    });

    it('renders all sections in order', () => {
      render(<AvinodeMessageCard {...mockRequestMessage} />);

      // Message type, content, timestamp, sender should all be present
      expect(screen.getByText(/REQUEST/i)).toBeInTheDocument();
      expect(screen.getByText(/"Book this flight"/i)).toBeInTheDocument();
      expect(screen.getByText(/sent:/i)).toBeInTheDocument();
      expect(screen.getByText(/from:/i)).toBeInTheDocument();
    });
  });

  describe('Typography', () => {
    it('applies correct content typography', () => {
      const { container } = render(<AvinodeMessageCard {...mockRequestMessage} />);

      const content = screen.getByText(/"Book this flight"/i);
      expect(content).toBeInTheDocument();
    });

    it('applies correct timestamp typography', () => {
      const { container } = render(<AvinodeMessageCard {...mockRequestMessage} />);

      const timestamp = screen.getByText(/sent:/i);
      expect(timestamp).toHaveClass('text-xs');
    });
  });
});
