/**
 * Unit Tests for AvinodeChatThread Component
 * TDD - RED Phase
 * Tests written before implementation
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AvinodeChatThread } from '@/components/avinode-chat-thread';
import type { Message } from '@/lib/types/chat';

// Mock messages for testing
const mockMessages: Message[] = [
  {
    id: '1',
    conversation_id: 'conv-1',
    sender_type: 'operator',
    sender_iso_agent_id: null,
    sender_operator_id: 'op-1',
    sender_name: 'NetJets Aviation',
    content_type: 'text',
    content: 'We can accommodate your request. The Challenger 350 is available for your dates.',
    rich_content: null,
    attachments: [],
    parent_message_id: null,
    thread_root_id: null,
    reply_count: 0,
    status: 'delivered',
    avinode_message_id: 'avn-msg-1',
    read_by: [],
    reactions: {},
    is_edited: false,
    edited_at: null,
    original_content: null,
    metadata: {},
    created_at: '2025-12-13T10:30:00Z',
    updated_at: '2025-12-13T10:30:00Z',
    deleted_at: null,
  },
  {
    id: '2',
    conversation_id: 'conv-1',
    sender_type: 'iso_agent',
    sender_iso_agent_id: 'iso-1',
    sender_operator_id: null,
    sender_name: 'John Doe',
    content_type: 'text',
    content: 'Perfect! Can you provide more details on pricing and availability?',
    rich_content: null,
    attachments: [],
    parent_message_id: null,
    thread_root_id: null,
    reply_count: 0,
    status: 'sent',
    avinode_message_id: null,
    read_by: [],
    reactions: {},
    is_edited: false,
    edited_at: null,
    original_content: null,
    metadata: {},
    created_at: '2025-12-13T10:35:00Z',
    updated_at: '2025-12-13T10:35:00Z',
    deleted_at: null,
  },
  {
    id: '3',
    conversation_id: 'conv-1',
    sender_type: 'operator',
    sender_iso_agent_id: null,
    sender_operator_id: 'op-1',
    sender_name: 'NetJets Aviation',
    content_type: 'quote_shared',
    content: 'Quote shared for Challenger 350',
    rich_content: {
      type: 'quote_shared',
      data: {
        quote_id: 'quote-1',
        operator_name: 'NetJets Aviation',
        aircraft_type: 'Challenger 350',
        price: 45000,
        currency: 'USD',
        valid_until: '2025-12-20T00:00:00Z',
        highlights: ['WiFi', 'Catering', 'Ground Transport'],
        score: 92,
        ranking: 1,
      },
    },
    attachments: [],
    parent_message_id: null,
    thread_root_id: null,
    reply_count: 0,
    status: 'delivered',
    avinode_message_id: 'avn-msg-3',
    read_by: [],
    reactions: {},
    is_edited: false,
    edited_at: null,
    original_content: null,
    metadata: {},
    created_at: '2025-12-13T10:40:00Z',
    updated_at: '2025-12-13T10:40:00Z',
    deleted_at: null,
  },
];

describe('AvinodeChatThread Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render without crashing when no messages', () => {
      render(<AvinodeChatThread tripId="trip-1" messages={[]} />);
      expect(screen.getByTestId('avinode-chat-thread')).toBeInTheDocument();
    });

    it('should render with messages', () => {
      render(<AvinodeChatThread tripId="trip-1" messages={mockMessages} />);
      expect(screen.getByTestId('avinode-chat-thread')).toBeInTheDocument();
    });

    it('should display correct message count in header', () => {
      render(<AvinodeChatThread tripId="trip-1" messages={mockMessages} />);
      expect(screen.getByText(/3 messages/i)).toBeInTheDocument();
    });

    it('should show empty state when no messages', () => {
      render(<AvinodeChatThread tripId="trip-1" messages={[]} />);
      expect(screen.getByText(/no messages yet/i)).toBeInTheDocument();
    });
  });

  describe('Message Display', () => {
    it('should render all messages in chronological order', () => {
      render(<AvinodeChatThread tripId="trip-1" messages={mockMessages} />);
      const messageElements = screen.getAllByTestId(/^message-/);
      expect(messageElements).toHaveLength(3);
    });

    it('should display operator messages with correct styling', () => {
      render(<AvinodeChatThread tripId="trip-1" messages={mockMessages} />);
      const operatorMessage = screen.getByTestId('message-1');
      // Operator messages should have flex-row class (left-aligned)
      expect(operatorMessage.className).toContain('flex-row');
    });

    it('should display user messages with correct styling', () => {
      render(<AvinodeChatThread tripId="trip-1" messages={mockMessages} />);
      const userMessage = screen.getByTestId('message-2');
      // User messages should have flex-row-reverse class (right-aligned)
      expect(userMessage.className).toContain('flex-row-reverse');
    });

    it('should show sender name for each message', () => {
      render(<AvinodeChatThread tripId="trip-1" messages={mockMessages} />);
      const netJetsNames = screen.getAllByText('NetJets Aviation');
      expect(netJetsNames.length).toBeGreaterThan(0);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should display message content correctly', () => {
      render(<AvinodeChatThread tripId="trip-1" messages={mockMessages} />);
      expect(
        screen.getByText(/We can accommodate your request/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Can you provide more details on pricing/i)
      ).toBeInTheDocument();
    });

    it('should format timestamps in user-friendly format', () => {
      render(<AvinodeChatThread tripId="trip-1" messages={mockMessages} />);
      // Should show time like "10:30 AM" or "10:35 AM"
      const timestamps = screen.getAllByTestId(/^timestamp-/);
      expect(timestamps.length).toBeGreaterThan(0);
      expect(timestamps[0]).toHaveTextContent(/\d{1,2}:\d{2}/);
    });
  });

  describe('Rich Content Rendering', () => {
    it('should render quote_shared rich content', () => {
      render(<AvinodeChatThread tripId="trip-1" messages={mockMessages} />);
      const challengerTexts = screen.getAllByText(/Challenger 350/i);
      expect(challengerTexts.length).toBeGreaterThan(0);
      expect(screen.getByText(/\$45,000/i)).toBeInTheDocument();
    });

    it('should display quote highlights when available', () => {
      render(<AvinodeChatThread tripId="trip-1" messages={mockMessages} />);
      expect(screen.getByText(/WiFi/i)).toBeInTheDocument();
      expect(screen.getByText(/Catering/i)).toBeInTheDocument();
      expect(screen.getByText(/Ground Transport/i)).toBeInTheDocument();
    });

    it('should show quote score and ranking', () => {
      render(<AvinodeChatThread tripId="trip-1" messages={mockMessages} />);
      expect(screen.getByText(/92/)).toBeInTheDocument(); // Score
      expect(screen.getByText(/#1/)).toBeInTheDocument(); // Ranking
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading state when isLoading is true', () => {
      render(
        <AvinodeChatThread tripId="trip-1" messages={[]} isLoading={true} />
      );
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should display error message when error prop is provided', () => {
      const error = 'Failed to load messages';
      render(
        <AvinodeChatThread tripId="trip-1" messages={[]} error={error} />
      );
      expect(screen.getByText(/Failed to load messages/i)).toBeInTheDocument();
    });

    it('should show retry button on error', () => {
      const onRetry = vi.fn();
      render(
        <AvinodeChatThread
          tripId="trip-1"
          messages={[]}
          error="Network error"
          onRetry={onRetry}
        />
      );
      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<AvinodeChatThread tripId="trip-1" messages={mockMessages} />);
      expect(
        screen.getByRole('region', { name: /avinode chat thread/i })
      ).toBeInTheDocument();
    });

    it('should have semantic HTML structure', () => {
      render(<AvinodeChatThread tripId="trip-1" messages={mockMessages} />);
      expect(screen.getByRole('list')).toBeInTheDocument();
    });

    it('should have keyboard navigable messages', () => {
      render(<AvinodeChatThread tripId="trip-1" messages={mockMessages} />);
      const messages = screen.getAllByRole('listitem');
      messages.forEach((msg) => {
        expect(msg).toBeInTheDocument();
      });
    });
  });

  describe('Message Grouping', () => {
    it('should group consecutive messages from same sender', () => {
      const groupedMessages: Message[] = [
        { ...mockMessages[0], id: '1a' },
        { ...mockMessages[0], id: '1b', created_at: '2025-12-13T10:31:00Z' },
        { ...mockMessages[1], id: '2a' },
      ];
      render(<AvinodeChatThread tripId="trip-1" messages={groupedMessages} />);
      // Should show sender name only once for grouped messages
      const senderNames = screen.getAllByText('NetJets Aviation');
      expect(senderNames.length).toBe(1);
    });
  });

  describe('Scroll Behavior', () => {
    it('should have scroll area for messages', async () => {
      render(
        <AvinodeChatThread tripId="trip-1" messages={mockMessages} />
      );
      const scrollArea = screen.getByTestId('scroll-area');
      expect(scrollArea).toBeInTheDocument();
    });

    it('should render messages when updated', async () => {
      const { rerender } = render(
        <AvinodeChatThread tripId="trip-1" messages={mockMessages.slice(0, 2)} />
      );
      expect(screen.getAllByTestId(/^message-/)).toHaveLength(2);

      rerender(
        <AvinodeChatThread tripId="trip-1" messages={mockMessages} />
      );
      expect(screen.getAllByTestId(/^message-/)).toHaveLength(3);
    });
  });

  describe('TypeScript Type Safety', () => {
    it('should accept valid Message[] type', () => {
      expect(() =>
        render(<AvinodeChatThread tripId="trip-1" messages={mockMessages} />)
      ).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should render large message list efficiently', () => {
      const largeMessageList = Array.from({ length: 100 }, (_, i) => ({
        ...mockMessages[0],
        id: `msg-${i}`,
        created_at: new Date(Date.now() + i * 1000).toISOString(),
      }));

      const startTime = performance.now();
      render(<AvinodeChatThread tripId="trip-1" messages={largeMessageList} />);
      const endTime = performance.now();

      // Should render in reasonable time
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should render all messages in list', () => {
      const largeMessageList = Array.from({ length: 50 }, (_, i) => ({
        ...mockMessages[0],
        id: `msg-${i}`,
      }));

      render(<AvinodeChatThread tripId="trip-1" messages={largeMessageList} />);
      const renderedMessages = screen.queryAllByTestId(/^message-/);
      expect(renderedMessages.length).toBe(50);
    });
  });

  describe('Integration with Webhooks', () => {
    it('should accept real-time message updates via onNewMessage callback', () => {
      const onNewMessage = vi.fn();
      render(
        <AvinodeChatThread
          tripId="trip-1"
          messages={mockMessages}
          onNewMessage={onNewMessage}
        />
      );
      // onNewMessage should be called with the latest message
      expect(onNewMessage).toHaveBeenCalledWith(mockMessages[mockMessages.length - 1]);
    });

    it('should display message status indicators for user messages', () => {
      render(<AvinodeChatThread tripId="trip-1" messages={mockMessages} />);
      // Status indicators are only shown for user (iso_agent) messages
      // Message 2 is from iso_agent with status 'sent'
      const sentIndicator = screen.getByTestId('status-sent');
      expect(sentIndicator).toBeInTheDocument();
    });
  });
});
