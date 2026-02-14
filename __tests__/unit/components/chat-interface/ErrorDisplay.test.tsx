/**
 * ErrorDisplay Component Unit Tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorDisplay } from '@/components/chat-interface/components/ErrorDisplay';

describe('ErrorDisplay', () => {
  it('renders error message', () => {
    render(<ErrorDisplay error="Failed to send message" />);
    expect(screen.getByText('Failed to send message')).toBeInTheDocument();
  });

  it('renders error heading', () => {
    render(<ErrorDisplay error="Some error" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    render(<ErrorDisplay error="Error" onDismiss={onDismiss} />);

    const dismissButton = screen.getByText('Dismiss');
    fireEvent.click(dismissButton);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when X button is clicked', () => {
    const onDismiss = vi.fn();
    render(<ErrorDisplay error="Error" onDismiss={onDismiss} />);

    const xButton = screen.getByLabelText('Dismiss error');
    fireEvent.click(xButton);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = vi.fn();
    render(<ErrorDisplay error="Error" onRetry={onRetry} />);

    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('hides dismiss button when onDismiss not provided', () => {
    render(<ErrorDisplay error="Error" />);
    expect(screen.queryByText('Dismiss')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Dismiss error')).not.toBeInTheDocument();
  });

  it('hides retry button when onRetry not provided', () => {
    render(<ErrorDisplay error="Error" />);
    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  it('shows both buttons when both handlers provided', () => {
    render(
      <ErrorDisplay
        error="Error"
        onDismiss={vi.fn()}
        onRetry={vi.fn()}
      />
    );
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });
});
