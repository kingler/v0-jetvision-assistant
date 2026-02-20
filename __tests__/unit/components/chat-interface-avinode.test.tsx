/**
 * Chat Interface Avinode Integration Tests
 *
 * Tests for ONEK-120: Enhance Chat Interface with Avinode Integration Components
 * Following TDD: RED phase - write failing tests first
 *
 * SKIPPED: These tests are in TDD RED phase. The ChatInterface component
 * does not yet implement the Avinode integration features (WebhookStatusIndicator,
 * AvinodeDeepLinks, TripIDInput, AvinodeActionRequired, quote notifications, etc.).
 * Re-enable once ONEK-120 implementation is complete.
 *
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatInterface } from '@/components/chat-interface';
import type { ChatSession } from '@/components/chat-sidebar';

// Mock scrollIntoView which is not available in jsdom
Element.prototype.scrollIntoView = vi.fn();

// Mock the Avinode components
vi.mock('@/components/avinode', () => ({
  FlightSearchProgress: vi.fn(() => (
    <div data-testid="flight-search-progress">Flight Search Progress</div>
  )),
  TripRequestCard: vi.fn(() => (
    <div data-testid="trip-request-card">Trip Request</div>
  )),
  AvinodeSearchCard: vi.fn(() => (
    <div data-testid="avinode-search-card">Avinode Search</div>
  )),
  TripIDInput: vi.fn(({ onSubmit, isLoading }) => (
    <div data-testid="trip-id-input">
      <input
        data-testid="trip-id-field"
        onChange={(e) => onSubmit?.(e.target.value)}
        disabled={isLoading}
      />
    </div>
  )),
  WebhookStatusIndicator: vi.fn(({ status }) => (
    <div data-testid="webhook-status" data-status={status}>
      {status}
    </div>
  )),
  AvinodeDeepLinks: vi.fn(({ tripId }) => (
    <a data-testid="avinode-deep-link" href={`https://avinode.com/trips/${tripId}`}>
      View in Avinode
    </a>
  )),
  AvinodeActionRequired: vi.fn(({ actions }) => (
    <div data-testid="avinode-action-required">
      {actions?.length || 0} actions required
    </div>
  )),
  RfqQuoteDetailsCard: vi.fn(() => (
    <div data-testid="rfq-quote-details-card">Quote Details</div>
  )),
  TripSummaryCard: vi.fn(() => (
    <div data-testid="trip-summary-card">Trip Summary</div>
  )),
  TripDetailsCard: vi.fn(() => (
    <div data-testid="trip-details-card">Trip Details</div>
  )),
  EmptyLegWatchCreated: vi.fn(() => (
    <div data-testid="empty-leg-watch-created">Watch Created</div>
  )),
  EmptyLegWatchList: vi.fn(() => (
    <div data-testid="empty-leg-watch-list">Watch List</div>
  )),
  EmptyLegMatchViewer: vi.fn(() => (
    <div data-testid="empty-leg-match-viewer">Match Viewer</div>
  )),
}));

// Mock useAvinodeQuotes hook
vi.mock('@/lib/hooks/use-avinode-quotes', () => ({
  useAvinodeQuotes: vi.fn(() => ({
    quotes: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    selectedQuoteId: null,
    selectQuote: vi.fn(),
    compareQuotes: vi.fn(),
    connectionStatus: 'connected',
  })),
}));

// Mock fetch for API calls
global.fetch = vi.fn();

describe.skip('ChatInterface Avinode Integration', () => {
  const mockOnProcessingChange = vi.fn();
  const mockOnUpdateChat = vi.fn();

  const createMockChat = (overrides: Partial<ChatSession> = {}): ChatSession => ({
    id: 'test-123',
    route: 'KJFK → KMIA',
    passengers: 4,
    date: '2025-01-15',
    status: 'understanding_request',
    currentStep: 1,
    totalSteps: 5,
    messages: [
      {
        id: 'msg-1',
        type: 'agent',
        content: 'Hello! How can I help you today?',
        timestamp: new Date(),
      },
    ],
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
        }),
      },
    });
  });

  describe('Webhook Status Indicator', () => {
    it('should display webhook status indicator in chat header when trip is active', () => {
      const chatWithTrip = createMockChat({
        tripId: 'TRP123456',
        deepLink: 'https://avinode.com/trips/TRP123456',
      });

      render(
        <ChatInterface
          activeChat={chatWithTrip}
          isProcessing={false}
          onProcessingChange={mockOnProcessingChange}
          onUpdateChat={mockOnUpdateChat}
        />
      );

      expect(screen.getByTestId('webhook-status')).toBeInTheDocument();
    });

    it('should not display webhook status when no trip is active', () => {
      const chatWithoutTrip = createMockChat({
        tripId: undefined,
      });

      render(
        <ChatInterface
          activeChat={chatWithoutTrip}
          isProcessing={false}
          onProcessingChange={mockOnProcessingChange}
          onUpdateChat={mockOnUpdateChat}
        />
      );

      expect(screen.queryByTestId('webhook-status')).not.toBeInTheDocument();
    });
  });

  describe('View in Avinode Button', () => {
    it('should display "View in Avinode" button when trip has deep link', () => {
      const chatWithDeepLink = createMockChat({
        tripId: 'TRP123456',
        deepLink: 'https://avinode.com/trips/TRP123456',
      });

      render(
        <ChatInterface
          activeChat={chatWithDeepLink}
          isProcessing={false}
          onProcessingChange={mockOnProcessingChange}
          onUpdateChat={mockOnUpdateChat}
        />
      );

      const viewButton = screen.getByRole('link', { name: /view in avinode/i });
      expect(viewButton).toBeInTheDocument();
      expect(viewButton).toHaveAttribute('href', expect.stringContaining('avinode.com'));
    });

    it('should not display "View in Avinode" button without deep link', () => {
      const chatWithoutDeepLink = createMockChat({
        tripId: undefined,
        deepLink: undefined,
      });

      render(
        <ChatInterface
          activeChat={chatWithoutDeepLink}
          isProcessing={false}
          onProcessingChange={mockOnProcessingChange}
          onUpdateChat={mockOnUpdateChat}
        />
      );

      expect(screen.queryByRole('link', { name: /view in avinode/i })).not.toBeInTheDocument();
    });
  });

  describe('Inline Quote Notifications', () => {
    it('should display new quote notification badge when quotes arrive', async () => {
      const { useAvinodeQuotes } = await import('@/lib/hooks/use-avinode-quotes');
      (useAvinodeQuotes as any).mockReturnValue({
        quotes: [
          {
            id: 'quote-1',
            operator_name: 'NetJets',
            aircraft_type: 'Citation X',
            total_price: 45000,
            score: 85,
            status: 'received',
          },
        ],
        isLoading: false,
        error: null,
        connectionStatus: 'connected',
        refetch: vi.fn(),
        selectedQuoteId: null,
        selectQuote: vi.fn(),
        compareQuotes: vi.fn(),
      });

      const chatWithTrip = createMockChat({
        tripId: 'TRP123456',
      });

      render(
        <ChatInterface
          activeChat={chatWithTrip}
          isProcessing={false}
          onProcessingChange={mockOnProcessingChange}
          onUpdateChat={mockOnUpdateChat}
        />
      );

      // Should show notification for new quote
      await waitFor(() => {
        expect(screen.getByText(/1 new quote/i)).toBeInTheDocument();
      });
    });

    it('should show quote count badge in header when quotes exist', async () => {
      const { useAvinodeQuotes } = await import('@/lib/hooks/use-avinode-quotes');
      (useAvinodeQuotes as any).mockReturnValue({
        quotes: [
          { id: 'q1', operator_name: 'NetJets', total_price: 45000 },
          { id: 'q2', operator_name: 'VistaJet', total_price: 48000 },
        ],
        isLoading: false,
        error: null,
        connectionStatus: 'connected',
        refetch: vi.fn(),
        selectedQuoteId: null,
        selectQuote: vi.fn(),
        compareQuotes: vi.fn(),
      });

      const chatWithTrip = createMockChat({
        tripId: 'TRP123456',
      });

      render(
        <ChatInterface
          activeChat={chatWithTrip}
          isProcessing={false}
          onProcessingChange={mockOnProcessingChange}
          onUpdateChat={mockOnUpdateChat}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/2 quotes/i)).toBeInTheDocument();
      });
    });
  });

  describe('Operator Quote Display', () => {
    it('should display operator quotes with distinct styling', () => {
      const chatWithQuotes = createMockChat({
        tripId: 'TRP123456',
        quotes: [
          {
            id: 'quote-1',
            operatorName: 'NetJets',
            aircraftType: 'Citation X',
            price: 25000,
            score: 85,
            ranking: 1,
            isRecommended: true,
          },
        ],
        messages: [
          {
            id: 'msg-1',
            type: 'agent',
            content: 'I found a Citation X available from NetJets for your route.',
            timestamp: new Date(),
            showQuotes: true,
          },
        ],
      });

      render(
        <ChatInterface
          activeChat={chatWithQuotes}
          isProcessing={false}
          onProcessingChange={mockOnProcessingChange}
          onUpdateChat={mockOnUpdateChat}
        />
      );

      // Agent message with quote info should be visible
      expect(screen.getByText(/citation x available/i)).toBeInTheDocument();
    });

    it('should display quote requests when available', () => {
      const chatWithQuoteRequests = createMockChat({
        tripId: 'TRP123456',
        quoteRequests: [
          {
            id: 'qr-1',
            jetType: 'Citation X',
            operatorName: 'NetJets',
            status: 'received',
            departureAirport: 'KJFK',
            arrivalAirport: 'KMIA',
            price: 25000,
            currency: 'USD',
          },
        ],
      });

      render(
        <ChatInterface
          activeChat={chatWithQuoteRequests}
          isProcessing={false}
          onProcessingChange={mockOnProcessingChange}
          onUpdateChat={mockOnUpdateChat}
        />
      );

      // Quote request should be visible in UI
      expect(chatWithQuoteRequests.quoteRequests).toHaveLength(1);
    });
  });

  describe('Trip ID Input Integration', () => {
    it('should show TripIDInput when user requests to connect existing trip', async () => {
      const chatWithoutTrip = createMockChat({
        tripId: undefined,
        showTripIdInput: true,
      } as any);

      render(
        <ChatInterface
          activeChat={chatWithoutTrip}
          isProcessing={false}
          onProcessingChange={mockOnProcessingChange}
          onUpdateChat={mockOnUpdateChat}
        />
      );

      expect(screen.getByTestId('trip-id-input')).toBeInTheDocument();
    });

    it('should update chat with tripId when TripIDInput is submitted', async () => {
      const chatWithInput = createMockChat({
        showTripIdInput: true,
      } as any);

      render(
        <ChatInterface
          activeChat={chatWithInput}
          isProcessing={false}
          onProcessingChange={mockOnProcessingChange}
          onUpdateChat={mockOnUpdateChat}
        />
      );

      const input = screen.getByTestId('trip-id-field');
      fireEvent.change(input, { target: { value: 'ABC123XYZ' } });

      await waitFor(() => {
        expect(mockOnUpdateChat).toHaveBeenCalledWith(
          'test-123',
          expect.objectContaining({
            tripId: 'ABC123XYZ',
          })
        );
      });
    });
  });

  describe('Quick Actions for Avinode', () => {
    it('should show "Connect Trip" quick action when no trip is connected', () => {
      const chatWithoutTrip = createMockChat({
        tripId: undefined,
      });

      render(
        <ChatInterface
          activeChat={chatWithoutTrip}
          isProcessing={false}
          onProcessingChange={mockOnProcessingChange}
          onUpdateChat={mockOnUpdateChat}
        />
      );

      expect(screen.getByRole('button', { name: /connect trip/i })).toBeInTheDocument();
    });

    it('should show "View Quotes" quick action when trip has quotes', async () => {
      const { useAvinodeQuotes } = await import('@/lib/hooks/use-avinode-quotes');
      (useAvinodeQuotes as any).mockReturnValue({
        quotes: [{ id: 'q1', operator_name: 'NetJets' }],
        isLoading: false,
        error: null,
        connectionStatus: 'connected',
        refetch: vi.fn(),
        selectedQuoteId: null,
        selectQuote: vi.fn(),
        compareQuotes: vi.fn(),
      });

      const chatWithTrip = createMockChat({
        tripId: 'TRP123456',
      });

      render(
        <ChatInterface
          activeChat={chatWithTrip}
          isProcessing={false}
          onProcessingChange={mockOnProcessingChange}
          onUpdateChat={mockOnUpdateChat}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /view quotes/i })).toBeInTheDocument();
      });
    });
  });

  describe('Workflow Status Updates from Webhooks', () => {
    it('should update workflow status when quote is received', async () => {
      const { useAvinodeQuotes } = await import('@/lib/hooks/use-avinode-quotes');

      // Start with no quotes
      (useAvinodeQuotes as any).mockReturnValue({
        quotes: [],
        isLoading: false,
        error: null,
        connectionStatus: 'connected',
        refetch: vi.fn(),
        selectedQuoteId: null,
        selectQuote: vi.fn(),
        compareQuotes: vi.fn(),
      });

      const chatWithTrip = createMockChat({
        tripId: 'TRP123456',
        status: 'requesting_quotes',
      });

      const { rerender } = render(
        <ChatInterface
          activeChat={chatWithTrip}
          isProcessing={false}
          onProcessingChange={mockOnProcessingChange}
          onUpdateChat={mockOnUpdateChat}
        />
      );

      // Simulate quote arrival
      (useAvinodeQuotes as any).mockReturnValue({
        quotes: [{ id: 'q1', operator_name: 'NetJets', total_price: 45000 }],
        isLoading: false,
        error: null,
        connectionStatus: 'connected',
        refetch: vi.fn(),
        selectedQuoteId: null,
        selectQuote: vi.fn(),
        compareQuotes: vi.fn(),
      });

      // Re-render to trigger update
      rerender(
        <ChatInterface
          activeChat={chatWithTrip}
          isProcessing={false}
          onProcessingChange={mockOnProcessingChange}
          onUpdateChat={mockOnUpdateChat}
        />
      );

      // Should call onUpdateChat to update workflow status
      await waitFor(() => {
        expect(mockOnUpdateChat).toHaveBeenCalled();
      });
    });
  });

  describe('Action Required Indicator', () => {
    it('should show action required when operator needs response', () => {
      const chatWithPendingAction = createMockChat({
        tripId: 'TRP123456',
        pendingActions: [
          {
            id: 'action-1',
            type: 'respond_to_quote',
            operatorName: 'NetJets',
            dueBy: new Date(Date.now() + 3600000), // 1 hour from now
          },
        ],
      } as any);

      render(
        <ChatInterface
          activeChat={chatWithPendingAction}
          isProcessing={false}
          onProcessingChange={mockOnProcessingChange}
          onUpdateChat={mockOnUpdateChat}
        />
      );

      expect(screen.getByTestId('avinode-action-required')).toBeInTheDocument();
    });
  });
});
