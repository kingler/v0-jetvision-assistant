/**
 * Message Bubble Component Tests
 *
 * Tests for the MessageBubble wrapper component that provides
 * user/agent styling, timestamps, and threading support.
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageBubble } from '@/components/message-bubble';
import type { MessageComponent } from '@/components/message-components/types';

describe('MessageBubble', () => {
  const mockTextComponent: MessageComponent = {
    type: 'text',
    content: 'Hello, World!',
  };

  describe('Rendering', () => {
    it('should render user message with correct styling', () => {
      const { container } = render(
        <MessageBubble
          id="msg-1"
          role="user"
          timestamp={new Date('2024-01-15T10:30:00')}
          components={[mockTextComponent]}
        />
      );

      expect(screen.getByText('Hello, World!')).toBeInTheDocument();

      // Check for user-specific styling classes
      const bubble = container.querySelector('[data-role="user"]');
      expect(bubble).toBeInTheDocument();
    });

    it('should render agent message with correct styling', () => {
      const { container } = render(
        <MessageBubble
          id="msg-2"
          role="agent"
          timestamp={new Date('2024-01-15T10:31:00')}
          components={[mockTextComponent]}
        />
      );

      expect(screen.getByText('Hello, World!')).toBeInTheDocument();

      // Check for agent-specific styling classes
      const bubble = container.querySelector('[data-role="agent"]');
      expect(bubble).toBeInTheDocument();
    });

    it('should render system message with correct styling', () => {
      const { container } = render(
        <MessageBubble
          id="msg-3"
          role="system"
          timestamp={new Date('2024-01-15T10:32:00')}
          components={[mockTextComponent]}
        />
      );

      const bubble = container.querySelector('[data-role="system"]');
      expect(bubble).toBeInTheDocument();
    });

    it('should display timestamp when showTimestamp is true', () => {
      render(
        <MessageBubble
          id="msg-4"
          role="user"
          timestamp={new Date('2024-01-15T10:30:00')}
          components={[mockTextComponent]}
          showTimestamp={true}
        />
      );

      // Should show time in HH:MM format
      expect(screen.getByText(/10:30/)).toBeInTheDocument();
    });

    it('should not display timestamp when showTimestamp is false', () => {
      const { container } = render(
        <MessageBubble
          id="msg-5"
          role="user"
          timestamp={new Date('2024-01-15T10:30:00')}
          components={[mockTextComponent]}
          showTimestamp={false}
        />
      );

      expect(container.querySelector('[data-testid="timestamp"]')).not.toBeInTheDocument();
    });

    it('should render avatar for agent messages', () => {
      render(
        <MessageBubble
          id="msg-6"
          role="agent"
          timestamp={new Date()}
          components={[mockTextComponent]}
          avatar="https://example.com/agent-avatar.png"
        />
      );

      const avatar = screen.getByRole('img', { hidden: true });
      expect(avatar).toHaveAttribute('src', 'https://example.com/agent-avatar.png');
    });

    it('should render fallback avatar when no avatar prop provided', () => {
      const { container } = render(
        <MessageBubble
          id="msg-7"
          role="agent"
          timestamp={new Date()}
          components={[mockTextComponent]}
        />
      );

      // Should have default avatar element
      const avatar = container.querySelector('[data-testid="default-avatar"]');
      expect(avatar).toBeInTheDocument();
    });
  });

  describe('Multiple Components', () => {
    it('should render multiple message components in order', () => {
      const components: MessageComponent[] = [
        { type: 'text', content: 'First message' },
        { type: 'text', content: 'Second message' },
        {
          type: 'action_buttons',
          actions: [
            { id: 'action-1', label: 'Button 1', value: 'btn1' },
          ],
        },
      ];

      render(
        <MessageBubble
          id="msg-8"
          role="agent"
          timestamp={new Date()}
          components={components}
        />
      );

      expect(screen.getByText('First message')).toBeInTheDocument();
      expect(screen.getByText('Second message')).toBeInTheDocument();
      expect(screen.getByText('Button 1')).toBeInTheDocument();
    });
  });

  describe('Threading Support', () => {
    it('should render reply indicator when replyTo is provided', () => {
      render(
        <MessageBubble
          id="msg-9"
          role="user"
          timestamp={new Date()}
          components={[mockTextComponent]}
          replyTo={{
            id: 'msg-1',
            preview: 'Original message preview',
            author: 'Agent',
          }}
        />
      );

      expect(screen.getByText(/Original message preview/)).toBeInTheDocument();
      expect(screen.getByText(/Agent/)).toBeInTheDocument();
    });

    it('should call onReplyClick when reply button is clicked', () => {
      const mockOnReplyClick = vi.fn();

      render(
        <MessageBubble
          id="msg-10"
          role="agent"
          timestamp={new Date()}
          components={[mockTextComponent]}
          onReplyClick={mockOnReplyClick}
        />
      );

      const replyButton = screen.getByRole('button', { name: /reply/i });
      fireEvent.click(replyButton);

      expect(mockOnReplyClick).toHaveBeenCalledWith('msg-10');
    });

    it('should not show reply button when onReplyClick is not provided', () => {
      render(
        <MessageBubble
          id="msg-11"
          role="agent"
          timestamp={new Date()}
          components={[mockTextComponent]}
        />
      );

      const replyButton = screen.queryByRole('button', { name: /reply/i });
      expect(replyButton).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should render loading state when isLoading is true', () => {
      render(
        <MessageBubble
          id="msg-12"
          role="agent"
          timestamp={new Date()}
          components={[mockTextComponent]}
          isLoading={true}
        />
      );

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    });

    it('should not render components when isLoading is true', () => {
      render(
        <MessageBubble
          id="msg-13"
          role="agent"
          timestamp={new Date()}
          components={[mockTextComponent]}
          isLoading={true}
        />
      );

      expect(screen.queryByText('Hello, World!')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should render error message when error prop is provided', () => {
      render(
        <MessageBubble
          id="msg-14"
          role="agent"
          timestamp={new Date()}
          components={[mockTextComponent]}
          error="Failed to load message"
        />
      );

      expect(screen.getByText(/Failed to load message/i)).toBeInTheDocument();
    });

    it('should call onRetry when retry button is clicked', () => {
      const mockOnRetry = vi.fn();

      render(
        <MessageBubble
          id="msg-15"
          role="agent"
          timestamp={new Date()}
          components={[mockTextComponent]}
          error="Failed to load message"
          onRetry={mockOnRetry}
        />
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      expect(mockOnRetry).toHaveBeenCalledWith('msg-15');
    });
  });

  describe('Status Indicators', () => {
    it('should show sending status', () => {
      render(
        <MessageBubble
          id="msg-16"
          role="user"
          timestamp={new Date()}
          components={[mockTextComponent]}
          status="sending"
        />
      );

      expect(screen.getByTestId('status-sending')).toBeInTheDocument();
    });

    it('should show sent status', () => {
      render(
        <MessageBubble
          id="msg-17"
          role="user"
          timestamp={new Date()}
          components={[mockTextComponent]}
          status="sent"
        />
      );

      expect(screen.getByTestId('status-sent')).toBeInTheDocument();
    });

    it('should show delivered status', () => {
      render(
        <MessageBubble
          id="msg-18"
          role="user"
          timestamp={new Date()}
          components={[mockTextComponent]}
          status="delivered"
        />
      );

      expect(screen.getByTestId('status-delivered')).toBeInTheDocument();
    });

    it('should show failed status', () => {
      render(
        <MessageBubble
          id="msg-19"
          role="user"
          timestamp={new Date()}
          components={[mockTextComponent]}
          status="failed"
        />
      );

      expect(screen.getByTestId('status-failed')).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <MessageBubble
          id="msg-20"
          role="user"
          timestamp={new Date()}
          components={[mockTextComponent]}
          className="custom-bubble-class"
        />
      );

      const bubble = container.querySelector('.custom-bubble-class');
      expect(bubble).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <MessageBubble
          id="msg-21"
          role="user"
          timestamp={new Date()}
          components={[mockTextComponent]}
          author="John Doe"
        />
      );

      const bubble = screen.getByRole('article');
      expect(bubble).toHaveAttribute('aria-label', expect.stringContaining('John Doe'));
    });

    it('should have aria-live region for agent messages', () => {
      render(
        <MessageBubble
          id="msg-22"
          role="agent"
          timestamp={new Date()}
          components={[mockTextComponent]}
        />
      );

      const bubble = screen.getByRole('article');
      expect(bubble).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Action Handling', () => {
    it('should forward onAction to MessageRenderer', () => {
      const mockOnAction = vi.fn();

      render(
        <MessageBubble
          id="msg-23"
          role="agent"
          timestamp={new Date()}
          components={[
            {
              type: 'action_buttons',
              actions: [
                { id: 'action-1', label: 'Test Action', value: 'test' },
              ],
            },
          ]}
          onAction={mockOnAction}
        />
      );

      const button = screen.getByText('Test Action');
      fireEvent.click(button);

      expect(mockOnAction).toHaveBeenCalled();
    });
  });
});
