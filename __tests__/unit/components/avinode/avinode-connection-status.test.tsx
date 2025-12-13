/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { AvinodeConnectionStatus } from '@/components/avinode/avinode-connection-status';

describe('AvinodeConnectionStatus', () => {
  const mockSuccessProps = {
    success: true,
    message: 'Trip successfully created in Avinode marketplace.',
    timestamp: '2025-12-13T15:27:23Z',
  };

  const mockFailureProps = {
    success: false,
    message: 'Failed to connect to Avinode API. Please check your credentials.',
    timestamp: '2025-12-13T15:30:45Z',
  };

  describe('Success State', () => {
    it('renders success title', () => {
      render(<AvinodeConnectionStatus {...mockSuccessProps} />);

      expect(screen.getByText(/avinode api connection test - success/i)).toBeInTheDocument();
    });

    it('renders success icon', () => {
      const { container } = render(<AvinodeConnectionStatus {...mockSuccessProps} />);

      // Should have CheckCircle icon
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('renders success message', () => {
      render(<AvinodeConnectionStatus {...mockSuccessProps} />);

      expect(screen.getByText(/trip successfully created in avinode marketplace/i)).toBeInTheDocument();
    });

    it('renders timestamp', () => {
      render(<AvinodeConnectionStatus {...mockSuccessProps} />);

      expect(screen.getByText(/timestamp: 2025-12-13t15:27:23z/i)).toBeInTheDocument();
    });

    it('applies success styling', () => {
      const { container } = render(<AvinodeConnectionStatus {...mockSuccessProps} />);

      const statusCard = container.firstChild;
      expect(statusCard).toHaveClass('bg-green-50');
      expect(statusCard).toHaveClass('border-l-4');
      expect(statusCard).toHaveClass('border-green-500');
    });

    it('applies dark mode success styling', () => {
      const { container } = render(<AvinodeConnectionStatus {...mockSuccessProps} />);

      const statusCard = container.firstChild;
      expect(statusCard?.className).toMatch(/dark:bg-green-950\/30/);
    });
  });

  describe('Failure State', () => {
    it('renders failure title', () => {
      render(<AvinodeConnectionStatus {...mockFailureProps} />);

      expect(screen.getByText(/avinode api connection test - failed/i)).toBeInTheDocument();
    });

    it('renders failure icon', () => {
      const { container } = render(<AvinodeConnectionStatus {...mockFailureProps} />);

      // Should have XCircle icon
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('renders failure message', () => {
      render(<AvinodeConnectionStatus {...mockFailureProps} />);

      expect(screen.getByText(/failed to connect to avinode api/i)).toBeInTheDocument();
    });

    it('renders timestamp for failure', () => {
      render(<AvinodeConnectionStatus {...mockFailureProps} />);

      expect(screen.getByText(/timestamp: 2025-12-13t15:30:45z/i)).toBeInTheDocument();
    });

    it('applies failure styling', () => {
      const { container } = render(<AvinodeConnectionStatus {...mockFailureProps} />);

      const statusCard = container.firstChild;
      expect(statusCard).toHaveClass('bg-red-50');
      expect(statusCard).toHaveClass('border-l-4');
      expect(statusCard).toHaveClass('border-red-500');
    });

    it('applies dark mode failure styling', () => {
      const { container } = render(<AvinodeConnectionStatus {...mockFailureProps} />);

      const statusCard = container.firstChild;
      expect(statusCard?.className).toMatch(/dark:bg-red-950\/30/);
    });
  });

  describe('Typography', () => {
    it('applies correct title typography', () => {
      const { container } = render(<AvinodeConnectionStatus {...mockSuccessProps} />);

      const title = screen.getByText(/avinode api connection test - success/i);
      expect(title).toHaveClass('text-base');
      expect(title).toHaveClass('font-semibold');
    });

    it('applies correct timestamp typography', () => {
      const { container } = render(<AvinodeConnectionStatus {...mockSuccessProps} />);

      const timestamp = screen.getByText(/timestamp:/i);
      expect(timestamp).toHaveClass('text-xs');
      expect(timestamp?.className).toMatch(/text-muted-foreground/);
    });
  });

  describe('Icon Colors', () => {
    it('renders green icon for success', () => {
      const { container } = render(<AvinodeConnectionStatus {...mockSuccessProps} />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon?.getAttribute('class')).toContain('text-green-500');
    });

    it('renders red icon for failure', () => {
      const { container } = render(<AvinodeConnectionStatus {...mockFailureProps} />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon?.getAttribute('class')).toContain('text-red-500');
    });
  });

  describe('Layout', () => {
    it('renders with proper padding', () => {
      const { container } = render(<AvinodeConnectionStatus {...mockSuccessProps} />);

      const statusCard = container.firstChild;
      expect(statusCard).toHaveClass('p-4');
    });

    it('renders with rounded corners', () => {
      const { container } = render(<AvinodeConnectionStatus {...mockSuccessProps} />);

      const statusCard = container.firstChild;
      expect(statusCard).toHaveClass('rounded-lg');
    });
  });
});
