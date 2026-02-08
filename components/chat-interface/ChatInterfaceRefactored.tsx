/**
 * ChatInterface (Refactored)
 *
 * Refactored chat interface using extracted UI components.
 * This version reduces the original 2,475 lines to ~400 lines through:
 * - Extracted UI components (MessageList, ChatInput, StreamingIndicator, ErrorDisplay)
 * - Utility functions (messageTransformers, flightProgressValidation)
 * - Simplified local state management
 *
 * Note: This is a simplified version that can be used as a drop-in replacement.
 * For the full feature set, see the original chat-interface.tsx.
 *
 * @module components/chat-interface/ChatInterfaceRefactored
 */

'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { ChatSession } from '@/components/chat-sidebar';
import type { RFQFlight } from '@/components/avinode/rfq-flight-card';

// UI Components from the original
import { DynamicChatHeader } from '@/components/chat/dynamic-chat-header';
import { QuoteDetailsDrawer } from '@/components/quote-details-drawer';
import { OperatorMessageThread } from '@/components/avinode/operator-message-thread';
import { BookFlightModal } from '@/components/avinode/book-flight-modal';
import { CustomerSelectionDialog, type ClientProfile } from '@/components/customer-selection-dialog';

// Extracted Chat Interface Components
import {
  ChatMessageList,
  ChatInput,
  StreamingIndicator,
  ErrorDisplay,
} from './components';

// Utilities
import {
  shouldShowFlightProgress,
  calculateCurrentStep,
  unifyMessages,
} from './utils';

// Chat utilities
import { getBookFlightCustomer } from '@/lib/chat';

export interface ChatInterfaceProps {
  activeChat: ChatSession;
  isProcessing: boolean;
  onProcessingChange: (processing: boolean) => void;
  onUpdateChat: (chatId: string, updates: Partial<ChatSession>) => void;
}

/**
 * Refactored ChatInterface component.
 * Uses extracted UI components for better maintainability.
 */
export function ChatInterfaceRefactored({
  activeChat,
  isProcessing,
  onProcessingChange,
  onUpdateChat,
}: ChatInterfaceProps) {
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const workflowRef = useRef<HTMLDivElement>(null);

  // Local UI State
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamError, setStreamError] = useState<string | null>(null);

  // Modal/Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [isMessageThreadOpen, setIsMessageThreadOpen] = useState(false);
  const [messageThreadQuoteId, setMessageThreadQuoteId] = useState<string | undefined>();
  const [messageThreadFlightId, setMessageThreadFlightId] = useState<string | undefined>();
  const [messageThreadOperatorName, setMessageThreadOperatorName] = useState<string | undefined>();
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [pendingProposalFlightId, setPendingProposalFlightId] = useState<string | null>(null);
  const [pendingProposalQuoteId, setPendingProposalQuoteId] = useState<string | undefined>();
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);
  const [isBookFlightModalOpen, setIsBookFlightModalOpen] = useState(false);
  const [bookFlightData, setBookFlightData] = useState<RFQFlight | null>(null);

  // Trip ID State
  const [isTripIdLoading, setIsTripIdLoading] = useState(false);
  const [tripIdError, setTripIdError] = useState<string | undefined>();
  const [tripIdSubmitted, setTripIdSubmitted] = useState(activeChat.tripIdSubmitted || false);
  const [selectedRfqFlightIds, setSelectedRfqFlightIds] = useState<string[]>([]);

  // RFQ flights from activeChat
  const rfqFlights = useMemo(() => {
    return activeChat.rfqFlights || [];
  }, [activeChat.rfqFlights]);

  // Computed values
  const showFlightProgress = useMemo(
    () => shouldShowFlightProgress(activeChat),
    [activeChat]
  );

  const currentStep = useMemo(
    () => calculateCurrentStep(activeChat, rfqFlights.length, tripIdSubmitted),
    [activeChat, rfqFlights.length, tripIdSubmitted]
  );

  // Unified messages
  const unifiedMessages = useMemo(() => {
    return unifyMessages(
      activeChat.messages || [],
      activeChat.operatorMessages || {},
      rfqFlights
    );
  }, [activeChat.messages, activeChat.operatorMessages, rfqFlights]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat.messages?.length, streamingContent]);

  // Sync tripIdSubmitted with activeChat
  useEffect(() => {
    if (activeChat.tripIdSubmitted !== undefined && activeChat.tripIdSubmitted !== tripIdSubmitted) {
      setTripIdSubmitted(activeChat.tripIdSubmitted);
    }
  }, [activeChat.tripIdSubmitted, tripIdSubmitted]);

  // Handlers
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isProcessing) return;

    const message = inputValue.trim();
    setInputValue('');
    setIsTyping(true);
    setStreamError(null);
    onProcessingChange(true);

    try {
      // Add user message to chat
      const userMessage = {
        id: `user-${Date.now()}`,
        type: 'user' as const,
        content: message,
        timestamp: new Date(),
      };

      onUpdateChat(activeChat.id, {
        messages: [...(activeChat.messages || []), userMessage],
      });

      // Call chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          tripId: activeChat.tripId,
          requestId: activeChat.requestId || activeChat.conversationId,
          conversationHistory: (activeChat.messages || []).map((m) => ({
            role: m.type === 'user' ? 'user' : 'assistant',
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      let fullContent = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        fullContent += chunk;
        setStreamingContent(fullContent);
      }

      // Add agent response
      const agentMessage = {
        id: `agent-${Date.now()}`,
        type: 'agent' as const,
        content: fullContent,
        timestamp: new Date(),
      };

      onUpdateChat(activeChat.id, {
        messages: [...(activeChat.messages || []), userMessage, agentMessage],
      });

    } catch (error) {
      setStreamError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsTyping(false);
      setStreamingContent('');
      onProcessingChange(false);
    }
  }, [inputValue, isProcessing, activeChat, onUpdateChat, onProcessingChange]);

  const handleViewWorkflow = useCallback(() => {
    workflowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleViewChat = useCallback((flightId: string, quoteId?: string) => {
    const flight = rfqFlights.find((f: RFQFlight) => f.id === flightId || f.quoteId === quoteId);
    setMessageThreadFlightId(flightId);
    setMessageThreadQuoteId(quoteId);
    setMessageThreadOperatorName(flight?.operatorName);
    setIsMessageThreadOpen(true);
  }, [rfqFlights]);

  const handleGenerateProposal = useCallback((flightId: string, quoteId?: string) => {
    setPendingProposalFlightId(flightId);
    setPendingProposalQuoteId(quoteId);
    setIsCustomerDialogOpen(true);
  }, []);

  const handleCustomerSelected = useCallback(async (customer: ClientProfile) => {
    if (!pendingProposalFlightId) return;

    setIsGeneratingProposal(true);
    try {
      // TODO: Implement proposal generation API call
      console.log('Generating proposal for:', pendingProposalFlightId, customer);
    } finally {
      setIsGeneratingProposal(false);
      setIsCustomerDialogOpen(false);
      setPendingProposalFlightId(null);
      setPendingProposalQuoteId(undefined);
    }
  }, [pendingProposalFlightId]);

  const handleTripIdSubmit = useCallback(async (tripId: string) => {
    setIsTripIdLoading(true);
    setTripIdError(undefined);

    try {
      onUpdateChat(activeChat.id, { tripId, tripIdSubmitted: true });
      setTripIdSubmitted(true);
    } catch (error) {
      setTripIdError(error instanceof Error ? error.message : 'Failed to submit trip ID');
    } finally {
      setIsTripIdLoading(false);
    }
  }, [activeChat.id, onUpdateChat]);

  const handleBookFlight = useCallback((flightId: string, quoteId?: string) => {
    const flight = rfqFlights.find((f: RFQFlight) => f.id === flightId || f.quoteId === quoteId);
    if (flight) {
      setBookFlightData(flight);
      setIsBookFlightModalOpen(true);
    }
  }, [rfqFlights]);

  const handleViewQuoteDetails = useCallback((quoteId: string) => {
    setSelectedQuoteId(quoteId);
    setIsDrawerOpen(true);
  }, []);

  // Get book flight customer from active chat
  const bookFlightCustomer = useMemo(() => {
    return getBookFlightCustomer(activeChat);
  }, [activeChat]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <DynamicChatHeader
        activeChat={activeChat}
        flightRequestName={activeChat.generatedName}
        showTripId={!!activeChat.tripId}
        onViewQuoteDetails={handleViewQuoteDetails}
      />

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4">
          <div className="space-y-4" ref={workflowRef}>
            <ChatMessageList
              messages={unifiedMessages}
              rfqFlights={rfqFlights}
              selectedRfqFlightIds={selectedRfqFlightIds}
              shouldShowFlightSearchProgress={showFlightProgress}
              isProcessing={isProcessing}
              flightRequest={{
                departureAirport: { icao: activeChat.route?.split(' → ')[0] || 'TBD' },
                arrivalAirport: { icao: activeChat.route?.split(' → ')[1] || 'TBD' },
                departureDate: activeChat.isoDate || activeChat.date || '',
                passengers: activeChat.passengers || 1,
              }}
              deepLink={activeChat.deepLink}
              tripId={activeChat.tripId}
              isTripIdLoading={isTripIdLoading}
              tripIdError={tripIdError}
              tripIdSubmitted={tripIdSubmitted}
              currentStep={currentStep}
              rfqsLastFetchedAt={activeChat.rfqsLastFetchedAt}
              customerEmail={activeChat.customer?.email}
              customerName={activeChat.customer?.name}
              operatorMessages={activeChat.operatorMessages}
              onTripIdSubmit={handleTripIdSubmit}
              onRfqFlightSelectionChange={setSelectedRfqFlightIds}
              onViewChat={handleViewChat}
              onGenerateProposal={handleGenerateProposal}
              onReviewAndBook={(flightId) => {
                setSelectedQuoteId(flightId);
                setIsDrawerOpen(true);
              }}
              onBookFlight={handleBookFlight}
            />

            {/* Streaming Indicator */}
            {isTyping && (
              <StreamingIndicator
                content={streamingContent}
                status={activeChat.status === 'requesting_quotes' ? 'pending' : 'active'}
              />
            )}

            {/* Error Display */}
            {streamError && (
              <ErrorDisplay
                error={streamError}
                onDismiss={() => setStreamError(null)}
                onRetry={handleSendMessage}
              />
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input */}
      <ChatInput
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSendMessage}
        onViewWorkflow={handleViewWorkflow}
        isProcessing={isProcessing || isTyping}
        showViewWorkflow={(activeChat.currentStep ?? 0) >= 1}
      />

      {/* Quote Details Drawer */}
      <QuoteDetailsDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedQuoteId(null);
        }}
        // Note: quote prop omitted - ChatSession.quotes has different structure than QuoteDetails
        // The drawer will work without it or can fetch quote details by ID internally
        messages={selectedQuoteId && activeChat.operatorMessages ? activeChat.operatorMessages[selectedQuoteId] : undefined}
      />

      {/* Operator Message Thread */}
      {isMessageThreadOpen && (
        <OperatorMessageThread
          isOpen={isMessageThreadOpen}
          onClose={() => {
            setIsMessageThreadOpen(false);
            setMessageThreadQuoteId(undefined);
            setMessageThreadFlightId(undefined);
            setMessageThreadOperatorName(undefined);
          }}
          tripId={activeChat.tripId}
          requestId={activeChat.requestId}
          quoteId={messageThreadQuoteId}
          flightId={messageThreadFlightId}
          operatorName={messageThreadOperatorName}
        />
      )}

      {/* Customer Selection Dialog */}
      <CustomerSelectionDialog
        open={isCustomerDialogOpen}
        onClose={() => {
          setIsCustomerDialogOpen(false);
          setPendingProposalFlightId(null);
          setPendingProposalQuoteId(undefined);
        }}
        onSelect={handleCustomerSelected}
      />

      {/* Book Flight Modal */}
      {bookFlightData && (
        <BookFlightModal
          open={isBookFlightModalOpen}
          onClose={() => {
            setIsBookFlightModalOpen(false);
            setBookFlightData(null);
          }}
          flight={bookFlightData}
          customer={bookFlightCustomer}
          tripDetails={{
            departureAirport: { icao: activeChat.route?.split(' → ')[0] || 'KTEB', name: activeChat.route?.split(' → ')[0] || 'TEB' },
            arrivalAirport: { icao: activeChat.route?.split(' → ')[1] || 'KVNY', name: activeChat.route?.split(' → ')[1] || 'VNY' },
            departureDate: activeChat.date || new Date().toISOString().split('T')[0],
            passengers: activeChat.passengers || 1,
            tripId: activeChat.tripId,
          }}
          requestId={activeChat.requestId || ''}
          onContractSent={(contractData) => {
            console.log('[ChatInterfaceRefactored] Contract sent:', contractData);
            setIsBookFlightModalOpen(false);
            setBookFlightData(null);
          }}
        />
      )}

      {/* Generating Proposal Overlay */}
      {isGeneratingProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Generating proposal...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatInterfaceRefactored;
