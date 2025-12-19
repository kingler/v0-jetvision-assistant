/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { AvinodeActionRequired } from '@/components/avinode/avinode-action-required';
import type { WorkflowStatus } from '@/components/avinode/types';

describe('AvinodeActionRequired', () => {
  const defaultProps = {
    tripId: 'AVN-12345',
    searchLink: 'https://avinode.com/search/12345',
    viewLink: 'https://avinode.com/view/12345',
    status: 'pending' as WorkflowStatus,
  };

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  describe('Step Indicator Rendering', () => {
    it('should render all three steps in the step indicator', () => {
      render(<AvinodeActionRequired {...defaultProps} />);

      // Check for step labels - be specific to avoid matching instructions
      const step1 = screen.getByText('①');
      const step2 = screen.getByText('②');
      const step3 = screen.getByText('③');

      expect(step1).toBeInTheDocument();
      expect(step2).toBeInTheDocument();
      expect(step3).toBeInTheDocument();

      // Verify step labels are present
      expect(screen.getByText('Request Created')).toBeInTheDocument();
      expect(screen.getByText('Select in Avinode')).toBeInTheDocument();
      expect(screen.getByText('Quotes')).toBeInTheDocument();
    });

    it('should show step 1 as completed for pending status', () => {
      render(<AvinodeActionRequired {...defaultProps} status="pending" />);

      const step1 = screen.getByText('①');
      expect(step1).toHaveClass('bg-primary');
      expect(step1).toHaveClass('text-primary-foreground');
    });

    it('should show step 1 as completed and step 2 as current for searching status', () => {
      render(<AvinodeActionRequired {...defaultProps} status="searching" />);

      const step1 = screen.getByText('①');
      const step2 = screen.getByText('②');

      expect(step1).toHaveClass('bg-primary');
      expect(step2).toHaveClass('bg-primary');
    });

    it('should show step 1 and 2 as completed and step 3 as current for selected status', () => {
      render(<AvinodeActionRequired {...defaultProps} status="selected" />);

      const step1 = screen.getByText('①');
      const step2 = screen.getByText('②');
      const step3 = screen.getByText('③');

      expect(step1).toHaveClass('bg-primary');
      expect(step2).toHaveClass('bg-primary');
      // Step 3 should still be primary for 'selected' status (step 2 is current)
      expect(step3).toHaveClass('bg-muted');
    });

    it('should show all steps as completed for quotes_received status', () => {
      render(<AvinodeActionRequired {...defaultProps} status="quotes_received" />);

      const step1 = screen.getByText('①');
      const step2 = screen.getByText('②');
      const step3 = screen.getByText('③');

      expect(step1).toHaveClass('bg-primary');
      expect(step2).toHaveClass('bg-primary');
      expect(step3).toHaveClass('bg-success');
    });
  });

  describe('Status-Aware Rendering', () => {
    it('should render pending status with correct messaging', () => {
      render(<AvinodeActionRequired {...defaultProps} status="pending" />);

      expect(screen.getByText(/Request Created/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Open Avinode/i })).toBeInTheDocument();
    });

    it('should render searching status with correct messaging', () => {
      render(<AvinodeActionRequired {...defaultProps} status="searching" />);

      expect(screen.getByText(/Searching for available aircraft/i)).toBeInTheDocument();
    });

    it('should render selected status with correct messaging', () => {
      render(<AvinodeActionRequired {...defaultProps} status="selected" />);

      expect(screen.getByText(/Aircraft selected.*Waiting for operator quotes/i)).toBeInTheDocument();
    });

    it('should render quotes_received status with correct messaging', () => {
      render(<AvinodeActionRequired {...defaultProps} status="quotes_received" />);

      expect(screen.getByText(/Great news.*Quotes have been received/i)).toBeInTheDocument();
    });
  });

  describe('Primary CTA Button', () => {
    it('should render "Open Avinode" button with search link', () => {
      render(<AvinodeActionRequired {...defaultProps} />);

      const button = screen.getByRole('button', { name: /Open Avinode/i });
      expect(button).toBeInTheDocument();
    });

    it('should call onSearchClick when primary button is clicked', () => {
      const onSearchClick = vi.fn();
      render(<AvinodeActionRequired {...defaultProps} onSearchClick={onSearchClick} />);

      const button = screen.getByRole('button', { name: /Open Avinode/i });
      fireEvent.click(button);

      expect(onSearchClick).toHaveBeenCalledTimes(1);
    });

    it('should open search link in new tab when clicked', () => {
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      render(<AvinodeActionRequired {...defaultProps} />);

      const button = screen.getByRole('button', { name: /Open Avinode/i });
      fireEvent.click(button);

      expect(windowOpenSpy).toHaveBeenCalledWith(
        defaultProps.searchLink,
        '_blank',
        'noopener,noreferrer'
      );

      windowOpenSpy.mockRestore();
    });

    it('should use large button size for primary CTA', () => {
      render(<AvinodeActionRequired {...defaultProps} />);

      const button = screen.getByRole('button', { name: /Open Avinode/i });
      expect(button).toHaveClass('h-10'); // lg size
    });
  });

  describe('Secondary Copy Button', () => {
    it('should render "Copy Link" button', () => {
      render(<AvinodeActionRequired {...defaultProps} />);

      const button = screen.getByRole('button', { name: /Copy Link/i });
      expect(button).toBeInTheDocument();
    });

    it('should call onCopyLink when copy button is clicked', async () => {
      const onCopyLink = vi.fn();
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      render(<AvinodeActionRequired {...defaultProps} onCopyLink={onCopyLink} />);

      const button = screen.getByRole('button', { name: /Copy Link/i });
      fireEvent.click(button);

      // Wait for async clipboard operation
      await vi.waitFor(() => {
        expect(onCopyLink).toHaveBeenCalledTimes(1);
      });
    });

    it('should copy search link to clipboard when clicked', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      render(<AvinodeActionRequired {...defaultProps} />);

      const button = screen.getByRole('button', { name: /Copy Link/i });
      fireEvent.click(button);

      expect(writeTextMock).toHaveBeenCalledWith(defaultProps.searchLink);
    });

    it('should use outline variant for secondary button', () => {
      render(<AvinodeActionRequired {...defaultProps} />);

      const button = screen.getByRole('button', { name: /Copy Link/i });
      expect(button).toHaveClass('border');
    });
  });

  describe('Instructions List', () => {
    it('should render default instructions when none provided', () => {
      render(<AvinodeActionRequired {...defaultProps} />);

      expect(screen.getByText(/Open the Avinode marketplace/i)).toBeInTheDocument();
      expect(screen.getByText(/Review and select/i)).toBeInTheDocument();
      expect(screen.getByText(/Return here/i)).toBeInTheDocument();
    });

    it('should render custom instructions when provided', () => {
      const customInstructions = [
        'Custom step 1',
        'Custom step 2',
        'Custom step 3',
      ];

      render(
        <AvinodeActionRequired
          {...defaultProps}
          instructions={customInstructions}
        />
      );

      expect(screen.getByText('Custom step 1')).toBeInTheDocument();
      expect(screen.getByText('Custom step 2')).toBeInTheDocument();
      expect(screen.getByText('Custom step 3')).toBeInTheDocument();
    });

    it('should render instructions as numbered list', () => {
      render(<AvinodeActionRequired {...defaultProps} />);

      const listItems = screen.getAllByRole('listitem');
      expect(listItems.length).toBeGreaterThan(0);
    });
  });

  describe('Tip Text', () => {
    it('should render tip text about keeping tab open', () => {
      render(<AvinodeActionRequired {...defaultProps} />);

      expect(screen.getByText(/tip/i)).toBeInTheDocument();
      expect(screen.getByText(/keep.*tab open/i)).toBeInTheDocument();
    });

    it('should display tip with info icon', () => {
      render(<AvinodeActionRequired {...defaultProps} />);

      const tipSection = screen.getByText(/tip/i).closest('div');
      expect(tipSection).toBeInTheDocument();
    });
  });

  describe('Trip ID Display', () => {
    it('should display the trip ID', () => {
      render(<AvinodeActionRequired {...defaultProps} />);

      expect(screen.getByText(defaultProps.tripId)).toBeInTheDocument();
    });

    it('should display trip ID in monospace font', () => {
      render(<AvinodeActionRequired {...defaultProps} />);

      const tripIdElement = screen.getByText(defaultProps.tripId);
      expect(tripIdElement).toHaveClass('font-mono');
    });
  });

  describe('Dark Mode Support', () => {
    it('should render without errors in dark mode', () => {
      const { container } = render(<AvinodeActionRequired {...defaultProps} />);

      expect(container).toBeInTheDocument();
      // Component should use Tailwind dark: classes
      const htmlContent = container.innerHTML;
      expect(htmlContent).toContain('dark:');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels on buttons', () => {
      render(<AvinodeActionRequired {...defaultProps} />);

      const openButton = screen.getByRole('button', { name: /Open Avinode/i });
      const copyButton = screen.getByRole('button', { name: /Copy Link/i });

      expect(openButton).toBeInTheDocument();
      expect(copyButton).toBeInTheDocument();
    });

    it('should use semantic HTML structure', () => {
      render(<AvinodeActionRequired {...defaultProps} />);

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toBeInTheDocument();
    });

    it('should have proper list structure for instructions', () => {
      render(<AvinodeActionRequired {...defaultProps} />);

      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();
    });
  });

  describe('View Link Usage', () => {
    it('should use viewLink when status is quotes_received', () => {
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      render(
        <AvinodeActionRequired
          {...defaultProps}
          status="quotes_received"
          viewLink="https://avinode.com/view/12345"
        />
      );

      const button = screen.getByRole('button', { name: /Open Avinode/i });
      fireEvent.click(button);

      expect(windowOpenSpy).toHaveBeenCalledWith(
        'https://avinode.com/view/12345',
        '_blank',
        'noopener,noreferrer'
      );

      windowOpenSpy.mockRestore();
    });

    it('should fall back to searchLink if viewLink is not provided', () => {
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      const propsWithoutViewLink = {
        ...defaultProps,
        status: 'quotes_received' as WorkflowStatus,
        viewLink: undefined,
      };
      render(<AvinodeActionRequired {...propsWithoutViewLink} />);

      const button = screen.getByRole('button', { name: /Open Avinode/i });
      fireEvent.click(button);

      expect(windowOpenSpy).toHaveBeenCalledWith(
        defaultProps.searchLink,
        '_blank',
        'noopener,noreferrer'
      );

      windowOpenSpy.mockRestore();
    });
  });
});
