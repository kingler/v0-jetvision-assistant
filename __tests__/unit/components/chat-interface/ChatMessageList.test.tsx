/**
 * ChatMessageList Component Unit Tests
 *
 * Tests message rendering, deduplication, FlightSearchProgress insertion,
 * and proposal confirmation ordering.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatMessageList } from '@/components/chat-interface/components/ChatMessageList';
import type { ChatMessageListProps, UnifiedMessage } from '@/components/chat-interface/types';

// Mock heavy child components to keep tests fast and focused
vi.mock('@/components/chat/agent-message', () => ({
  AgentMessage: ({ content }: { content: string }) => (
    <div data-testid="agent-msg">{content}</div>
  ),
}));

vi.mock('@/components/avinode/flight-search-progress', () => ({
  FlightSearchProgress: () => <div data-testid="flight-progress" />,
}));

// Helper to create a minimal UnifiedMessage
function makeMessage(overrides: Partial<UnifiedMessage> & { id: string; type: UnifiedMessage['type'] }): UnifiedMessage {
  return {
    content: 'default content',
    timestamp: new Date('2025-06-15T10:00:00Z'),
    ...overrides,
  };
}

// Shared default props
const noopAsync = vi.fn().mockResolvedValue(undefined);
const noop = vi.fn();

function defaultProps(overrides: Partial<ChatMessageListProps> = {}): ChatMessageListProps {
  return {
    messages: [],
    rfqFlights: [],
    selectedRfqFlightIds: [],
    shouldShowFlightSearchProgress: false,
    isProcessing: false,
    onTripIdSubmit: noopAsync,
    onRfqFlightSelectionChange: noop,
    onViewChat: noop,
    onGenerateProposal: noop,
    onReviewAndBook: noop,
    onBookFlight: noop,
    ...overrides,
  };
}

describe('ChatMessageList', () => {
  describe('empty state', () => {
    it('renders nothing when messages array is empty', () => {
      const { container } = render(<ChatMessageList {...defaultProps()} />);
      // Should render the fragment but with no visible child elements
      expect(container.innerHTML).toBe('');
    });
  });

  describe('rendering message types', () => {
    it('renders user messages with UserMessage component', () => {
      const messages: UnifiedMessage[] = [
        makeMessage({ id: 'u1', type: 'user', content: 'I need a flight to LA' }),
      ];

      render(<ChatMessageList {...defaultProps({ messages })} />);
      expect(screen.getByText('I need a flight to LA')).toBeInTheDocument();
    });

    it('renders agent messages with AgentMessage component', () => {
      const messages: UnifiedMessage[] = [
        makeMessage({ id: 'a1', type: 'agent', content: 'Looking for flights' }),
      ];

      render(<ChatMessageList {...defaultProps({ messages })} />);
      expect(screen.getByTestId('agent-msg')).toBeInTheDocument();
      expect(screen.getByText('Looking for flights')).toBeInTheDocument();
    });

    it('renders operator messages with OperatorMessage component', () => {
      const messages: UnifiedMessage[] = [
        makeMessage({
          id: 'op1',
          type: 'operator',
          content: 'Quote ready for review',
          operatorName: 'NetJets',
          operatorQuoteId: 'q1',
          operatorMessageType: 'RESPONSE',
        }),
      ];

      render(<ChatMessageList {...defaultProps({ messages })} />);
      expect(screen.getByText('Quote ready for review')).toBeInTheDocument();
      expect(screen.getByText('NetJets')).toBeInTheDocument();
    });

    it('renders multiple message types in order', () => {
      const messages: UnifiedMessage[] = [
        makeMessage({ id: 'u1', type: 'user', content: 'User msg', timestamp: new Date('2025-06-15T10:00:00Z') }),
        makeMessage({ id: 'a1', type: 'agent', content: 'Agent response', timestamp: new Date('2025-06-15T10:01:00Z') }),
      ];

      const { container } = render(<ChatMessageList {...defaultProps({ messages })} />);
      const text = container.textContent || '';
      const userIdx = text.indexOf('User msg');
      const agentIdx = text.indexOf('Agent response');
      expect(userIdx).toBeLessThan(agentIdx);
    });
  });

  describe('deduplication', () => {
    it('deduplicates messages with same ID', () => {
      const messages: UnifiedMessage[] = [
        makeMessage({ id: 'dup1', type: 'agent', content: 'First version' }),
        makeMessage({ id: 'dup1', type: 'agent', content: 'First version' }),
      ];

      render(<ChatMessageList {...defaultProps({ messages })} />);
      const agentMsgs = screen.getAllByTestId('agent-msg');
      expect(agentMsgs).toHaveLength(1);
    });

    it('deduplicates agent messages with same content', () => {
      const messages: UnifiedMessage[] = [
        makeMessage({ id: 'a1', type: 'agent', content: 'Identical content' }),
        makeMessage({ id: 'a2', type: 'agent', content: 'Identical content' }),
      ];

      render(<ChatMessageList {...defaultProps({ messages })} />);
      const agentMsgs = screen.getAllByTestId('agent-msg');
      expect(agentMsgs).toHaveLength(1);
    });

    it('keeps user messages with same content (different IDs)', () => {
      const messages: UnifiedMessage[] = [
        makeMessage({ id: 'u1', type: 'user', content: 'Same text' }),
        makeMessage({ id: 'u2', type: 'user', content: 'Same text' }),
      ];

      render(<ChatMessageList {...defaultProps({ messages })} />);
      const elements = screen.getAllByText('Same text');
      expect(elements).toHaveLength(2);
    });
  });

  describe('FlightSearchProgress', () => {
    it('shows FlightSearchProgress when shouldShowFlightSearchProgress=true', () => {
      const messages: UnifiedMessage[] = [
        makeMessage({ id: 'u1', type: 'user', content: 'Flight request' }),
      ];

      render(
        <ChatMessageList
          {...defaultProps({
            messages,
            shouldShowFlightSearchProgress: true,
            flightRequest: {
              departureAirport: { icao: 'KTEB' },
              arrivalAirport: { icao: 'KLAX' },
              departureDate: '2025-06-15',
              passengers: 4,
            },
          })}
        />
      );

      expect(screen.getByTestId('flight-progress')).toBeInTheDocument();
    });

    it('hides FlightSearchProgress when shouldShowFlightSearchProgress=false', () => {
      const messages: UnifiedMessage[] = [
        makeMessage({ id: 'u1', type: 'user', content: 'Flight request' }),
      ];

      render(
        <ChatMessageList
          {...defaultProps({
            messages,
            shouldShowFlightSearchProgress: false,
          })}
        />
      );

      expect(screen.queryByTestId('flight-progress')).not.toBeInTheDocument();
    });

    it('hides FlightSearchProgress when no flightRequest provided', () => {
      const messages: UnifiedMessage[] = [
        makeMessage({ id: 'u1', type: 'user', content: 'Flight request' }),
      ];

      render(
        <ChatMessageList
          {...defaultProps({
            messages,
            shouldShowFlightSearchProgress: true,
            // no flightRequest
          })}
        />
      );

      expect(screen.queryByTestId('flight-progress')).not.toBeInTheDocument();
    });
  });

  describe('proposal confirmations', () => {
    it('renders proposal confirmations after regular messages', () => {
      const messages: UnifiedMessage[] = [
        makeMessage({ id: 'u1', type: 'user', content: 'Send proposal', timestamp: new Date('2025-06-15T10:00:00Z') }),
        makeMessage({
          id: 'p1',
          type: 'agent',
          content: 'Proposal has been sent to the client',
          timestamp: new Date('2025-06-15T10:01:00Z'),
          showProposalSentConfirmation: true,
          proposalSentData: {} as any,
        }),
        makeMessage({ id: 'a1', type: 'agent', content: 'Regular follow-up', timestamp: new Date('2025-06-15T10:02:00Z') }),
      ];

      const { container } = render(<ChatMessageList {...defaultProps({ messages })} />);
      const text = container.textContent || '';
      // Proposal confirmations should appear at the end
      const regularIdx = text.indexOf('Regular follow-up');
      const proposalIdx = text.indexOf('Proposal has been sent');
      expect(regularIdx).toBeLessThan(proposalIdx);
    });
  });
});
