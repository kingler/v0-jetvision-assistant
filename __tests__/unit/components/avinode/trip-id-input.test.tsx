/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TripIDInput } from '@/components/avinode/trip-id-input';

describe('TripIDInput', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render input field with label', () => {
      render(<TripIDInput onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Avinode Trip ID')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter trip id/i)).toBeInTheDocument();
    });

    it('should render submit button', () => {
      render(<TripIDInput onSubmit={mockOnSubmit} />);

      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    });

    it('should render cancel button when onCancel is provided', () => {
      render(<TripIDInput onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should not render cancel button when onCancel is not provided', () => {
      render(<TripIDInput onSubmit={mockOnSubmit} />);

      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    });

    it('should display help text when provided', () => {
      const helpText = 'Find your Trip ID in the Avinode email';
      render(<TripIDInput onSubmit={mockOnSubmit} helpText={helpText} />);

      expect(screen.getByText(helpText)).toBeInTheDocument();
    });

    it('should display default help text when not provided', () => {
      render(<TripIDInput onSubmit={mockOnSubmit} />);

      expect(screen.getByText(/you can find the trip id/i)).toBeInTheDocument();
    });

    it('should display error message when provided', () => {
      const errorMessage = 'Invalid Trip ID format';
      render(<TripIDInput onSubmit={mockOnSubmit} error={errorMessage} />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toHaveClass('text-destructive');
    });
  });

  describe('Auto-uppercase transformation', () => {
    it('should convert lowercase input to uppercase', async () => {
      const user = userEvent.setup();
      render(<TripIDInput onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText(/enter trip id/i) as HTMLInputElement;
      await user.type(input, 'abc123');

      expect(input.value).toBe('ABC123');
    });

    it('should keep uppercase input as is', async () => {
      const user = userEvent.setup();
      render(<TripIDInput onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText(/enter trip id/i) as HTMLInputElement;
      await user.type(input, 'ABC123');

      expect(input.value).toBe('ABC123');
    });

    it('should handle mixed case input', async () => {
      const user = userEvent.setup();
      render(<TripIDInput onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText(/enter trip id/i) as HTMLInputElement;
      await user.type(input, 'AbC123');

      expect(input.value).toBe('ABC123');
    });
  });

  describe('Format validation', () => {
    it('should remove non-alphanumeric characters', async () => {
      const user = userEvent.setup();
      render(<TripIDInput onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText(/enter trip id/i) as HTMLInputElement;
      await user.type(input, 'ABC-123!@#');

      expect(input.value).toBe('ABC123');
    });

    it('should allow alphanumeric characters only', async () => {
      const user = userEvent.setup();
      render(<TripIDInput onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText(/enter trip id/i) as HTMLInputElement;
      await user.type(input, 'A1B2C3');

      expect(input.value).toBe('A1B2C3');
    });

    it('should show validation error for input shorter than 6 characters', async () => {
      const user = userEvent.setup();
      render(<TripIDInput onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText(/enter trip id/i);
      const submitButton = screen.getByRole('button', { name: /submit/i });

      await user.type(input, 'ABC12');

      expect(submitButton).toBeDisabled();
    });

    it('should show validation error for input longer than 12 characters', async () => {
      const user = userEvent.setup();
      render(<TripIDInput onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText(/enter trip id/i) as HTMLInputElement;

      await user.type(input, 'ABCDEFGHIJKLMNOP');

      // Should truncate or prevent input beyond 12 chars
      expect(input.value.length).toBeLessThanOrEqual(12);
    });

    it('should enable submit button for valid input (6-12 alphanumeric chars)', async () => {
      const user = userEvent.setup();
      render(<TripIDInput onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText(/enter trip id/i);
      const submitButton = screen.getByRole('button', { name: /submit/i });

      await user.type(input, 'ABC123');

      expect(submitButton).not.toBeDisabled();
    });

    it('should display validation feedback in real-time', async () => {
      const user = userEvent.setup();
      render(<TripIDInput onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText(/enter trip id/i);

      // Initially empty
      expect(screen.queryByText(/trip id must be/i)).not.toBeInTheDocument();

      // Type less than 6 chars
      await user.type(input, 'ABC');
      expect(screen.getByText(/trip id must be/i)).toBeInTheDocument();

      // Type valid length
      await user.clear(input);
      await user.type(input, 'ABC123');
      expect(screen.queryByText(/trip id must be/i)).not.toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('should disable input when loading', () => {
      render(<TripIDInput onSubmit={mockOnSubmit} isLoading={true} />);

      const input = screen.getByPlaceholderText(/enter trip id/i);
      expect(input).toBeDisabled();
    });

    it('should disable submit button when loading', () => {
      render(<TripIDInput onSubmit={mockOnSubmit} isLoading={true} />);

      const submitButton = screen.getByRole('button', { name: /submit/i });
      expect(submitButton).toBeDisabled();
    });

    it('should show loading spinner when loading', () => {
      render(<TripIDInput onSubmit={mockOnSubmit} isLoading={true} />);

      const button = screen.getByRole('button', { name: /submitting trip id/i });
      // Check for loading icon or spinner (Loader2 component)
      expect(button.querySelector('svg')).toBeInTheDocument();
      expect(button.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should disable cancel button when loading', () => {
      render(<TripIDInput onSubmit={mockOnSubmit} onCancel={mockOnCancel} isLoading={true} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('Form submission', () => {
    it('should call onSubmit with valid trip ID when submit button is clicked', async () => {
      const user = userEvent.setup();
      render(<TripIDInput onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText(/enter trip id/i);
      const submitButton = screen.getByRole('button', { name: /submit/i });

      await user.type(input, 'ABC123');
      await user.click(submitButton);

      expect(mockOnSubmit).toHaveBeenCalledWith('ABC123');
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });

    it('should call onSubmit when Enter key is pressed', async () => {
      const user = userEvent.setup();
      render(<TripIDInput onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText(/enter trip id/i);

      await user.type(input, 'ABC123{Enter}');

      expect(mockOnSubmit).toHaveBeenCalledWith('ABC123');
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });

    it('should not call onSubmit with invalid trip ID', async () => {
      const user = userEvent.setup();
      render(<TripIDInput onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText(/enter trip id/i);
      const submitButton = screen.getByRole('button', { name: /submit/i });

      await user.type(input, 'ABC');

      expect(submitButton).toBeDisabled();
      await user.click(submitButton);

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should not submit when Enter is pressed with invalid trip ID', async () => {
      const user = userEvent.setup();
      render(<TripIDInput onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText(/enter trip id/i);

      await user.type(input, 'ABC{Enter}');

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<TripIDInput onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should handle async onSubmit correctly', async () => {
      const user = userEvent.setup();
      const asyncOnSubmit = vi.fn().mockResolvedValue(undefined);

      render(<TripIDInput onSubmit={asyncOnSubmit} />);

      const input = screen.getByPlaceholderText(/enter trip id/i);
      const submitButton = screen.getByRole('button', { name: /submit/i });

      await user.type(input, 'ABC123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(asyncOnSubmit).toHaveBeenCalledWith('ABC123');
      });
    });
  });

  describe('Keyboard support', () => {
    it('should support Tab navigation', async () => {
      const user = userEvent.setup();
      render(<TripIDInput onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const input = screen.getByPlaceholderText(/enter trip id/i);

      input.focus();
      expect(document.activeElement).toBe(input);

      await user.tab();
      // After input, tab should go to submit button, but it may be disabled
      // Just verify tab navigation works
      expect(document.activeElement).not.toBe(input);

      await user.tab();
      // Should tab to next button
      expect(document.activeElement).not.toBe(input);
    });

    it('should support Escape key to trigger cancel', async () => {
      const user = userEvent.setup();
      render(<TripIDInput onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const input = screen.getByPlaceholderText(/enter trip id/i);
      input.focus();

      await user.keyboard('{Escape}');

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<TripIDInput onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText(/enter trip id/i);
      expect(input).toHaveAttribute('aria-label', 'Avinode Trip ID');
    });

    it('should mark input as invalid when there is a validation error', async () => {
      const user = userEvent.setup();
      render(<TripIDInput onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText(/enter trip id/i);
      await user.type(input, 'ABC');

      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('should mark input as valid when input is correct', async () => {
      const user = userEvent.setup();
      render(<TripIDInput onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText(/enter trip id/i);
      await user.type(input, 'ABC123');

      expect(input).toHaveAttribute('aria-invalid', 'false');
    });

    it('should link error message to input via aria-describedby', () => {
      const errorMessage = 'Invalid Trip ID';
      render(<TripIDInput onSubmit={mockOnSubmit} error={errorMessage} />);

      const input = screen.getByPlaceholderText(/enter trip id/i);
      const errorElement = screen.getByText(errorMessage);

      expect(input).toHaveAttribute('aria-describedby');
      expect(errorElement).toHaveAttribute('id');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty input gracefully', () => {
      render(<TripIDInput onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole('button', { name: /submit/i });
      expect(submitButton).toBeDisabled();
    });

    it('should handle rapid input changes', async () => {
      const user = userEvent.setup();
      render(<TripIDInput onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText(/enter trip id/i) as HTMLInputElement;

      await user.type(input, 'ABC');
      await user.type(input, '123');
      await user.type(input, 'XYZ');

      expect(input.value).toBe('ABC123XYZ');
    });

    it('should clear validation error when input becomes valid', async () => {
      const user = userEvent.setup();
      render(<TripIDInput onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText(/enter trip id/i);

      // Type invalid input
      await user.type(input, 'ABC');
      expect(screen.getByText(/trip id must be/i)).toBeInTheDocument();

      // Make it valid
      await user.type(input, '123');
      expect(screen.queryByText(/trip id must be/i)).not.toBeInTheDocument();
    });

    it('should handle paste events correctly', async () => {
      const user = userEvent.setup();
      render(<TripIDInput onSubmit={mockOnSubmit} />);

      const input = screen.getByPlaceholderText(/enter trip id/i) as HTMLInputElement;

      await user.click(input);
      await user.paste('abc-123-xyz');

      expect(input.value).toBe('ABC123XYZ');
    });
  });
});
