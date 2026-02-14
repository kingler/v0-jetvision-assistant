/**
 * StreamingIndicator Component Unit Tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StreamingIndicator } from '@/components/chat-interface/components/StreamingIndicator';

describe('StreamingIndicator', () => {
  it('renders streaming content when provided', () => {
    render(<StreamingIndicator content="Analyzing your request..." />);
    expect(screen.getByText(/Analyzing your request/)).toBeInTheDocument();
  });

  it('shows typing dots when content is empty', () => {
    const { container } = render(<StreamingIndicator content="" />);
    // TypingIndicator renders 3 bouncing dots
    const dots = container.querySelectorAll('.animate-bounce');
    expect(dots.length).toBeGreaterThanOrEqual(3);
  });

  it('shows cursor indicator when content is present and active', () => {
    const { container } = render(
      <StreamingIndicator content="Processing..." status="active" />
    );
    const cursor = container.querySelector('.animate-pulse');
    expect(cursor).toBeInTheDocument();
  });

  it('shows "Responding..." status label when active', () => {
    render(<StreamingIndicator content="Hello" status="active" />);
    expect(screen.getByText('Responding...')).toBeInTheDocument();
  });

  it('shows "Processing..." status label when pending', () => {
    render(<StreamingIndicator content="Hello" status="pending" />);
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('hides status label when completed', () => {
    render(<StreamingIndicator content="Done" status="completed" />);
    expect(screen.queryByText('Responding...')).not.toBeInTheDocument();
    expect(screen.queryByText('Processing...')).not.toBeInTheDocument();
  });

  it('hides status label when error', () => {
    render(<StreamingIndicator content="Error occurred" status="error" />);
    expect(screen.queryByText('Responding...')).not.toBeInTheDocument();
  });

  it('displays AI avatar', () => {
    render(<StreamingIndicator content="Test" />);
    expect(screen.getByText('AI')).toBeInTheDocument();
  });
});
