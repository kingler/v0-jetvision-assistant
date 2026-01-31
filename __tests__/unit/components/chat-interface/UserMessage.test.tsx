/**
 * UserMessage Component Unit Tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserMessage } from '@/components/chat-interface/components/UserMessage';

describe('UserMessage', () => {
  it('should render message content', () => {
    render(<UserMessage content="Hello, I need a flight" />);

    expect(screen.getByText('Hello, I need a flight')).toBeInTheDocument();
  });

  it('should apply blue bubble styling', () => {
    render(<UserMessage content="Test message" />);

    const bubble = screen.getByText('Test message').closest('div');
    expect(bubble).toHaveClass('bg-blue-600');
    expect(bubble).toHaveClass('text-white');
    expect(bubble).toHaveClass('rounded-2xl');
  });

  it('should align to the right', () => {
    const { container } = render(<UserMessage content="Test message" />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('justify-end');
  });

  it('should display timestamp when provided', () => {
    const timestamp = new Date('2026-01-31T10:30:00');
    render(<UserMessage content="Test message" timestamp={timestamp} />);

    // Check for time display (format depends on locale)
    expect(screen.getByText(/10:30/)).toBeInTheDocument();
  });

  it('should not display timestamp when not provided', () => {
    render(<UserMessage content="Test message" />);

    // Check that there's no time element
    const timeElements = document.querySelectorAll('.text-blue-200');
    expect(timeElements.length).toBe(0);
  });

  it('should apply custom className', () => {
    const { container } = render(
      <UserMessage content="Test message" className="custom-class" />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('custom-class');
  });

  it('should preserve whitespace in content', () => {
    render(<UserMessage content="Line 1\nLine 2" />);

    const textElement = screen.getByText(/Line 1/);
    expect(textElement).toHaveClass('whitespace-pre-wrap');
  });
});
