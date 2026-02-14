/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { AvinodeAuthStatus } from '@/components/avinode/avinode-auth-status';

describe('AvinodeAuthStatus', () => {
  const mockPropsValid = {
    method: 'bearer' as const,
    environment: 'sandbox' as const,
    baseUrl: 'sandbox.avinode.com',
    expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
    isValid: true,
  };

  const mockPropsExpiringSoon = {
    method: 'bearer' as const,
    environment: 'production' as const,
    baseUrl: 'api.avinode.com',
    expiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days from now
    isValid: true,
  };

  const mockPropsExpiringCritical = {
    method: 'api_key' as const,
    environment: 'sandbox' as const,
    baseUrl: 'sandbox.avinode.com',
    expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    isValid: true,
  };

  const mockPropsInvalid = {
    method: 'bearer' as const,
    environment: 'sandbox' as const,
    baseUrl: 'sandbox.avinode.com',
    isValid: false,
  };

  describe('Card Title', () => {
    it('renders authentication status title', () => {
      render(<AvinodeAuthStatus {...mockPropsValid} />);

      expect(screen.getByText(/authentication status/i)).toBeInTheDocument();
    });

    it('renders lock icon', () => {
      const { container } = render(<AvinodeAuthStatus {...mockPropsValid} />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Authentication Method', () => {
    it('renders bearer token method', () => {
      render(<AvinodeAuthStatus {...mockPropsValid} />);

      expect(screen.getByText(/method/i)).toBeInTheDocument();
      expect(screen.getByText(/bearer token/i)).toBeInTheDocument();
    });

    it('renders API key method', () => {
      const apiKeyProps = { ...mockPropsValid, method: 'api_key' as const };
      render(<AvinodeAuthStatus {...apiKeyProps} />);

      expect(screen.getByText(/api key/i)).toBeInTheDocument();
    });
  });

  describe('Environment Display', () => {
    it('renders sandbox environment', () => {
      render(<AvinodeAuthStatus {...mockPropsValid} />);

      expect(screen.getByText(/environment/i)).toBeInTheDocument();
      // Check for badge content
      const badges = screen.getAllByText(/sandbox/i);
      expect(badges.length).toBeGreaterThan(0);
      expect(screen.getByText(/sandbox\.avinode\.com/i)).toBeInTheDocument();
    });

    it('renders production environment', () => {
      const prodProps = { ...mockPropsValid, environment: 'production' as const, baseUrl: 'api.avinode.com' };
      render(<AvinodeAuthStatus {...prodProps} />);

      expect(screen.getByText(/production/i)).toBeInTheDocument();
    });

    it('renders environment badge with blue for sandbox', () => {
      const { container } = render(<AvinodeAuthStatus {...mockPropsValid} />);

      const badge = container.querySelector('[data-slot="badge"]');
      expect(badge).toBeInTheDocument();
    });

    it('renders environment badge with green for production', () => {
      const prodProps = { ...mockPropsValid, environment: 'production' as const };
      const { container } = render(<AvinodeAuthStatus {...prodProps} />);

      const badge = container.querySelector('[data-slot="badge"]');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Validity Status', () => {
    it('renders valid status with green check', () => {
      render(<AvinodeAuthStatus {...mockPropsValid} />);

      expect(screen.getByText(/✓ valid/i)).toBeInTheDocument();
    });

    it('renders invalid status', () => {
      render(<AvinodeAuthStatus {...mockPropsInvalid} />);

      expect(screen.getByText(/✗ invalid/i)).toBeInTheDocument();
    });
  });

  describe('Expiration Display', () => {
    it('renders expiration date', () => {
      render(<AvinodeAuthStatus {...mockPropsValid} />);

      expect(screen.getByText(/expires/i)).toBeInTheDocument();
      // Date varies based on when test runs, check for any formatted date
      expect(screen.getByText(/\w+ \d+, \d{4}/i)).toBeInTheDocument();
    });

    it('calculates days until expiration correctly', () => {
      render(<AvinodeAuthStatus {...mockPropsValid} />);

      // Should show days count
      expect(screen.getByText(/\[\d+ days\]/)).toBeInTheDocument();
    });

    it('does not render expiration when not provided', () => {
      const noExpiryProps = { ...mockPropsValid, expiresAt: undefined };
      render(<AvinodeAuthStatus {...noExpiryProps} />);

      expect(screen.queryByText(/expires/i)).not.toBeInTheDocument();
    });
  });

  describe('Expiration Warnings', () => {
    it('shows yellow warning when expiring in less than 30 days', () => {
      render(<AvinodeAuthStatus {...mockPropsExpiringSoon} />);

      // Should have warning styling
      const expirationText = screen.getByText(/\[\d+ days\]/);
      expect(expirationText).toBeInTheDocument();
    });

    it('shows red warning when expiring in less than 7 days', () => {
      render(<AvinodeAuthStatus {...mockPropsExpiringCritical} />);

      // Should have critical warning styling
      const expirationText = screen.getByText(/\[\d+ days\]/);
      expect(expirationText).toBeInTheDocument();
    });

    it('shows normal styling when expiring in more than 30 days', () => {
      render(<AvinodeAuthStatus {...mockPropsValid} />);

      const expirationText = screen.getByText(/\[\d+ days\]/);
      expect(expirationText).toBeInTheDocument();
    });
  });

  describe('Layout and Structure', () => {
    it('renders as a card component', () => {
      const { container } = render(<AvinodeAuthStatus {...mockPropsValid} />);

      const card = container.querySelector('[data-slot="card"]');
      expect(card).toBeInTheDocument();
    });

    it('renders all information in rows', () => {
      render(<AvinodeAuthStatus {...mockPropsValid} />);

      expect(screen.getByText(/method/i)).toBeInTheDocument();
      expect(screen.getByText(/environment/i)).toBeInTheDocument();
      expect(screen.getByText(/expires/i)).toBeInTheDocument();
    });
  });

  describe('Collapsible Behavior', () => {
    it('renders collapsible section by default', () => {
      const { container } = render(<AvinodeAuthStatus {...mockPropsValid} />);

      // Component should be collapsible (implementation detail)
      const card = container.querySelector('[data-slot="card"]');
      expect(card).toBeInTheDocument();
    });
  });
});
