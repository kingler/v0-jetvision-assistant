/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { SkipToContent } from '@/components/skip-to-content';

describe('SkipToContent', () => {
  beforeEach(() => {
    // Create main content element for navigation target
    const mainContent = document.createElement('div');
    mainContent.id = 'main-content';
    mainContent.tabIndex = -1;
    document.body.appendChild(mainContent);
  });

  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<SkipToContent />);

      const link = screen.getByTestId('skip-to-content');
      expect(link).toBeInTheDocument();
      expect(link).toHaveTextContent('Skip to main content');
    });

    it('renders with custom label', () => {
      render(<SkipToContent label="Jump to content" />);

      expect(screen.getByText('Jump to content')).toBeInTheDocument();
    });

    it('renders with custom target ID', () => {
      render(<SkipToContent targetId="custom-main" />);

      const link = screen.getByTestId('skip-to-content');
      expect(link).toHaveAttribute('href', '#custom-main');
    });

    it('renders with custom className', () => {
      render(<SkipToContent className="custom-class" />);

      const link = screen.getByTestId('skip-to-content');
      expect(link).toHaveClass('custom-class');
    });
  });

  describe('Accessibility', () => {
    it('is hidden by default (sr-only)', () => {
      render(<SkipToContent />);

      const link = screen.getByTestId('skip-to-content');
      expect(link).toHaveClass('sr-only');
    });

    it('becomes visible on focus', () => {
      render(<SkipToContent />);

      const link = screen.getByTestId('skip-to-content');
      expect(link).toHaveClass('focus:not-sr-only');
    });

    it('has proper href attribute', () => {
      render(<SkipToContent targetId="main-content" />);

      const link = screen.getByTestId('skip-to-content');
      expect(link).toHaveAttribute('href', '#main-content');
    });

    it('has focus-visible styles for keyboard users', () => {
      render(<SkipToContent />);

      const link = screen.getByTestId('skip-to-content');
      expect(link).toHaveClass('focus:outline-none');
      expect(link).toHaveClass('focus:ring-2');
    });
  });

  describe('Click Interaction', () => {
    it('prevents default on click', async () => {
      render(<SkipToContent />);

      const link = screen.getByTestId('skip-to-content');
      const event = { preventDefault: vi.fn() };

      fireEvent.click(link, event);

      // Link should not navigate via href
      expect(window.location.hash).not.toBe('#main-content');
    });

    it('focuses target element on click', async () => {
      const user = userEvent.setup();
      render(<SkipToContent />);

      const link = screen.getByTestId('skip-to-content');
      await user.click(link);

      const mainContent = document.getElementById('main-content');
      expect(document.activeElement).toBe(mainContent);
    });

    it('scrolls target into view on click', async () => {
      const scrollIntoViewMock = vi.fn();
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        mainContent.scrollIntoView = scrollIntoViewMock;
      }

      const user = userEvent.setup();
      render(<SkipToContent />);

      const link = screen.getByTestId('skip-to-content');
      await user.click(link);

      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
      });
    });
  });

  describe('Keyboard Interaction', () => {
    it('activates on Enter key', async () => {
      const user = userEvent.setup();
      render(<SkipToContent />);

      const link = screen.getByTestId('skip-to-content');
      link.focus();
      await user.keyboard('{Enter}');

      const mainContent = document.getElementById('main-content');
      expect(document.activeElement).toBe(mainContent);
    });

    it('activates on Space key', async () => {
      const user = userEvent.setup();
      render(<SkipToContent />);

      const link = screen.getByTestId('skip-to-content');
      link.focus();
      await user.keyboard(' ');

      const mainContent = document.getElementById('main-content');
      expect(document.activeElement).toBe(mainContent);
    });

    it('does not activate on other keys', async () => {
      const user = userEvent.setup();
      render(<SkipToContent />);

      const link = screen.getByTestId('skip-to-content');
      link.focus();

      await user.keyboard('a');

      // Should still be focused on skip link
      expect(document.activeElement).toBe(link);
    });
  });

  describe('Target Element Handling', () => {
    it('handles missing target element gracefully', async () => {
      // Remove the main content element
      const mainContent = document.getElementById('main-content');
      mainContent?.remove();

      const user = userEvent.setup();
      render(<SkipToContent targetId="non-existent" />);

      const link = screen.getByTestId('skip-to-content');

      // Should not throw error
      await expect(user.click(link)).resolves.not.toThrow();
    });

    it('navigates to custom target', async () => {
      // Create custom target
      const customTarget = document.createElement('section');
      customTarget.id = 'custom-section';
      customTarget.tabIndex = -1;
      document.body.appendChild(customTarget);

      const user = userEvent.setup();
      render(<SkipToContent targetId="custom-section" />);

      const link = screen.getByTestId('skip-to-content');
      await user.click(link);

      expect(document.activeElement).toBe(customTarget);

      // Cleanup
      customTarget.remove();
    });
  });

  describe('Visual Design', () => {
    it('has high z-index for visibility', () => {
      render(<SkipToContent />);

      const link = screen.getByTestId('skip-to-content');
      expect(link).toHaveClass('z-[9999]');
    });

    it('is positioned fixed', () => {
      render(<SkipToContent />);

      const link = screen.getByTestId('skip-to-content');
      expect(link).toHaveClass('fixed');
    });

    it('uses primary color scheme', () => {
      render(<SkipToContent />);

      const link = screen.getByTestId('skip-to-content');
      expect(link).toHaveClass('bg-primary');
      expect(link).toHaveClass('text-primary-foreground');
    });

    it('has shadow for contrast', () => {
      render(<SkipToContent />);

      const link = screen.getByTestId('skip-to-content');
      expect(link).toHaveClass('shadow-lg');
    });
  });
});
