'use client';

/**
 * ChatInterfaceRefactored
 *
 * Refactored version of chat-interface.tsx that uses extracted modules:
 * - useChatState for state management
 * - useStreamingChat for SSE streaming
 * - useTripIdSubmit for trip ID handling
 * - useRFQPolling for quote polling
 *
 * This component reduces the original 3,729 lines to ~500 lines
 * by leveraging the extracted hooks and utilities.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  useChatState,
  useStreamingChat,
  useTripIdSubmit,
  useRFQPolling,
  RFQStatus,
  WorkflowStatus,
  type ChatMessage,
  type RFQFlight,
  type DeepLinkData,
} from '@/lib/chat';

// UI Components (to be imported from existing component library)
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Card } from '@/components/ui/card';
// import { MessageBubble } from './MessageBubble';
// import { WorkflowProgress } from './WorkflowProgress';
// import { RFQFlightCard } from './RFQFlightCard';
// import { DeepLinkCard } from './DeepLinkCard';

/**
 * Props for ChatInterfaceRefactored
 */
export interface ChatInterfaceRefactoredProps {
  /** Initial trip ID (optional) */
  initialTripId?: string;
  /** API endpoint for chat */
  apiEndpoint?: string;
  /** Enable RFQ polling */
  enablePolling?: boolean;
  /** Callback when quotes are received */
  onQuotesReceived?: (flights: RFQFlight[]) => void;
  /** Callback when deep link is received */
  onDeepLinkReceived?: (data: DeepLinkData) => void;
  /** Custom className */
  className?: string;
}

/**
 * Refactored Chat Interface Component
 */
export function ChatInterfaceRefactored({
  initialTripId,
  apiEndpoint = '/api/chat',
  enablePolling = true,
  onQuotesReceived,
  onDeepLinkReceived,
  className = '',
}: ChatInterfaceRefactoredProps) {
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize chat state
  const chatState = useChatState({
    tripId: initialTripId || '',
  });

  const { state, actions, computed } = chatState;

  // Initialize streaming chat
  const streamingChat = useStreamingChat({
    chatState,
    apiEndpoint,
    onQuotesReceived: (quotes, flights) => {
      onQuotesReceived?.(flights);
    },
    onDeepLinkReceived,
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });

  // Initialize trip ID submit
  const tripIdSubmit = useTripIdSubmit({
    chatState,
    apiEndpoint,
    onRFQsLoaded: (flights) => {
      onQuotesReceived?.(flights);
    },
    onQuotesUpdated: (flights) => {
      onQuotesReceived?.(flights);
    },
    onError: (error) => {
      console.error('Trip ID submit error:', error);
    },
  });

  // Initialize RFQ polling
  const rfqPolling = useRFQPolling({
    chatState,
    tripIdSubmit,
    enabled: enablePolling,
    onNewQuotes: (newQuotes) => {
      // Show notification for new quotes
      console.log(`${newQuotes.length} new quote(s) received`);
    },
    onStatusChange: (flight, previousStatus) => {
      console.log(`Flight ${flight.id} status changed from ${previousStatus} to ${flight.rfqStatus}`);
    },
  });

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!computed.canSendMessage) {
        return;
      }

      await streamingChat.submitInput();
    },
    [computed.canSendMessage, streamingChat]
  );

  // Handle input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      actions.setInputValue(e.target.value);
    },
    [actions]
  );

  // Handle key press (Enter to submit)
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e as unknown as React.FormEvent);
      }
    },
    [handleSubmit]
  );

  // Handle flight selection
  const handleFlightToggle = useCallback(
    (flightId: string) => {
      actions.toggleFlightSelection(flightId);
    },
    [actions]
  );

  // Handle select all flights
  const handleSelectAll = useCallback(() => {
    if (computed.selectedFlightsCount === state.rfqFlights.length) {
      actions.deselectAllFlights();
    } else {
      actions.selectAllFlights();
    }
  }, [computed.selectedFlightsCount, state.rfqFlights.length, actions]);

  // Handle trip ID input from deep link
  const handleTripIdSubmit = useCallback(
    async (tripId: string) => {
      await tripIdSubmit.submitTripId(tripId);
    },
    [tripIdSubmit]
  );

  // Handle manual quote refresh
  const handleRefreshQuotes = useCallback(async () => {
    await rfqPolling.pollNow();
  }, [rfqPolling]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (state.scrollToBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      actions.resetScrollToBottom();
    }
  }, [state.scrollToBottom, actions]);

  // Load initial trip if provided
  useEffect(() => {
    if (initialTripId && !state.messages.length) {
      handleTripIdSubmit(initialTripId);
    }
  }, [initialTripId, state.messages.length, handleTripIdSubmit]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamingChat.cancelRequest();
      tripIdSubmit.cancelRequest();
      rfqPolling.stopPolling();
    };
  }, [streamingChat, tripIdSubmit, rfqPolling]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {state.messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            showWorkflow={message.showWorkflow && state.showWorkflow}
            workflowStatus={state.workflowStatus}
            currentStep={state.currentStep}
          />
        ))}

        {/* Deep Link Card */}
        {state.showDeepLink && state.deepLinkData && (
          <DeepLinkCard
            data={state.deepLinkData}
            onTripIdSubmit={handleTripIdSubmit}
          />
        )}

        {/* RFQ Flights */}
        {state.showQuotes && state.rfqFlights.length > 0 && (
          <RFQFlightsList
            flights={state.rfqFlights}
            selectedIds={state.selectedFlightIds}
            onToggle={handleFlightToggle}
            onSelectAll={handleSelectAll}
            onRefresh={handleRefreshQuotes}
            isPolling={rfqPolling.isPolling}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {state.error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200">
          <p className="text-red-600 text-sm">{state.error}</p>
          <button
            onClick={() => actions.clearError()}
            className="text-red-500 text-xs underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={state.inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={state.isLoading || state.isSending}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!computed.canSendMessage}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state.isSending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Message Bubble Component
 */
interface MessageBubbleProps {
  message: ChatMessage;
  showWorkflow?: boolean;
  workflowStatus?: string;
  currentStep?: number;
}

function MessageBubble({
  message,
  showWorkflow,
  workflowStatus,
  currentStep,
}: MessageBubbleProps) {
  const isUser = message.type === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] px-4 py-3 rounded-lg ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        {message.content || (
          <span className="text-gray-400 italic">Thinking...</span>
        )}

        {showWorkflow && workflowStatus && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <WorkflowProgress status={workflowStatus} step={currentStep || 1} />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Workflow Progress Component
 */
interface WorkflowProgressProps {
  status: string;
  step: number;
}

function WorkflowProgress({ status, step }: WorkflowProgressProps) {
  const steps = [
    { id: 1, label: 'Understanding Request', status: WorkflowStatus.UNDERSTANDING_REQUEST },
    { id: 2, label: 'Searching Aircraft', status: WorkflowStatus.SEARCHING_AIRCRAFT },
    { id: 3, label: 'Requesting Quotes', status: WorkflowStatus.REQUESTING_QUOTES },
    { id: 4, label: 'Analyzing Options', status: WorkflowStatus.ANALYZING_OPTIONS },
    { id: 5, label: 'Proposal Ready', status: WorkflowStatus.PROPOSAL_READY },
  ];

  return (
    <div className="flex items-center gap-2 text-xs">
      {steps.map((s, i) => (
        <React.Fragment key={s.id}>
          <div
            className={`px-2 py-1 rounded ${
              s.id <= step
                ? s.id === step
                  ? 'bg-blue-500 text-white'
                  : 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-500'
            }`}
          >
            {s.label}
          </div>
          {i < steps.length - 1 && (
            <div className="text-gray-400">→</div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/**
 * Deep Link Card Component
 */
interface DeepLinkCardProps {
  data: DeepLinkData;
  onTripIdSubmit: (tripId: string) => void;
}

function DeepLinkCard({ data, onTripIdSubmit }: DeepLinkCardProps) {
  const handleOpenLink = () => {
    if (data.deepLink) {
      window.open(data.deepLink, '_blank');
    }
  };

  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm">
      <h3 className="font-medium text-lg mb-2">Trip Created</h3>
      <div className="text-sm text-gray-600 space-y-1">
        {data.tripId && <p>Trip ID: {data.tripId}</p>}
        {data.departureAirport && (
          <p>
            From:{' '}
            {typeof data.departureAirport === 'string'
              ? data.departureAirport
              : data.departureAirport.icao}
          </p>
        )}
        {data.arrivalAirport && (
          <p>
            To:{' '}
            {typeof data.arrivalAirport === 'string'
              ? data.arrivalAirport
              : data.arrivalAirport.icao}
          </p>
        )}
        {data.departureDate && <p>Date: {data.departureDate}</p>}
        {data.passengers && <p>Passengers: {data.passengers}</p>}
      </div>
      <div className="mt-4 flex gap-2">
        {data.deepLink && (
          <button
            onClick={handleOpenLink}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Open in Avinode
          </button>
        )}
        {data.tripId && (
          <button
            onClick={() => onTripIdSubmit(data.tripId!)}
            className="px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50"
          >
            Check Quotes
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * RFQ Flights List Component
 */
interface RFQFlightsListProps {
  flights: RFQFlight[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onRefresh: () => void;
  isPolling: boolean;
}

function RFQFlightsList({
  flights,
  selectedIds,
  onToggle,
  onSelectAll,
  onRefresh,
  isPolling,
}: RFQFlightsListProps) {
  const quotedFlights = flights.filter((f) => f.rfqStatus === RFQStatus.QUOTED);
  const pendingFlights = flights.filter(
    (f) => f.rfqStatus === RFQStatus.SENT || f.rfqStatus === RFQStatus.UNANSWERED
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-lg">
          {quotedFlights.length} Quote(s), {pendingFlights.length} Pending
        </h3>
        <div className="flex gap-2">
          <button
            onClick={onSelectAll}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
          >
            {selectedIds.length === flights.length ? 'Deselect All' : 'Select All'}
          </button>
          <button
            onClick={onRefresh}
            disabled={isPolling}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            {isPolling ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {flights.map((flight) => (
          <RFQFlightCard
            key={flight.id}
            flight={flight}
            isSelected={selectedIds.includes(flight.id)}
            onToggle={() => onToggle(flight.id)}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * RFQ Flight Card Component
 */
interface RFQFlightCardProps {
  flight: RFQFlight;
  isSelected: boolean;
  onToggle: () => void;
}

function RFQFlightCard({ flight, isSelected, onToggle }: RFQFlightCardProps) {
  const statusColors = {
    [RFQStatus.QUOTED]: 'bg-green-100 text-green-800',
    [RFQStatus.SENT]: 'bg-blue-100 text-blue-800',
    [RFQStatus.UNANSWERED]: 'bg-yellow-100 text-yellow-800',
    [RFQStatus.DECLINED]: 'bg-red-100 text-red-800',
    [RFQStatus.EXPIRED]: 'bg-gray-100 text-gray-800',
  };

  return (
    <div
      className={`border rounded-lg p-4 ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
      }`}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="font-medium">{flight.operatorName}</div>
          <div className="text-sm text-gray-600">
            {flight.aircraftType} ({flight.tailNumber || 'TBD'})
          </div>
          <div className="text-sm text-gray-600">
            {flight.departureAirport.icao} → {flight.arrivalAirport.icao}
          </div>
          <div className="text-sm text-gray-600">{flight.departureDate}</div>
        </div>

        <div className="text-right">
          <span
            className={`px-2 py-1 text-xs rounded ${
              statusColors[flight.rfqStatus] || 'bg-gray-100'
            }`}
          >
            {flight.rfqStatus}
          </span>
          {flight.totalPrice > 0 && (
            <div className="mt-2 font-semibold">
              {flight.currency} {flight.totalPrice.toLocaleString()}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex justify-between items-center">
        <div className="flex gap-2 text-xs text-gray-500">
          {flight.amenities.wifi && <span>WiFi</span>}
          {flight.amenities.pets && <span>Pets</span>}
          {flight.amenities.lavatory && <span>Lavatory</span>}
        </div>

        <button
          onClick={onToggle}
          className={`px-3 py-1 text-sm rounded ${
            isSelected
              ? 'bg-blue-600 text-white'
              : 'border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {isSelected ? 'Selected' : 'Select'}
        </button>
      </div>
    </div>
  );
}

export default ChatInterfaceRefactored;
