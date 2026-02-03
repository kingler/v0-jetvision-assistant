/**
 * ChatMessageList Component
 *
 * Renders the list of chat messages including user, agent, and operator messages.
 * Handles message deduplication, FlightSearchProgress integration, and
 * proposal confirmation ordering.
 *
 * Extracted from: components/chat-interface.tsx (lines 1890-2293)
 */

'use client';

import React, { useMemo, useRef } from 'react';
import { AgentMessage } from '@/components/chat/agent-message';
import { FlightSearchProgress } from '@/components/avinode/flight-search-progress';
import { UserMessage } from './UserMessage';
import { OperatorMessage } from './OperatorMessage';
import type { ChatMessageListProps, UnifiedMessage, OperatorMessageItem } from '../types';

/**
 * Strip markdown formatting from text for plain text display
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[\s]*[-*+]\s+/gm, '• ')
    .replace(/^[\s]*(\d+)\.\s+/gm, '$1. ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Check if a message is a proposal confirmation
 */
function isProposalConfirmation(message: UnifiedMessage): boolean {
  if (message.showProposalSentConfirmation && message.proposalSentData) {
    return true;
  }

  const content = message.content?.toLowerCase() || '';
  return (
    (content.includes('proposal') && content.includes('sent')) ||
    content.includes('was sent to')
  );
}

/**
 * Deduplicate messages by ID and content
 */
function deduplicateMessages(
  messages: UnifiedMessage[]
): Array<{ message: UnifiedMessage; index: number }> {
  return messages.reduce((acc, message, index) => {
    // Always keep user messages and operator messages (check by ID only)
    if (message.type === 'user' || message.type === 'operator') {
      const hasDuplicateId = acc.some(
        ({ message: existing }) => existing.id === message.id
      );
      if (!hasDuplicateId) {
        acc.push({ message, index });
      }
      return acc;
    }

    // Always keep proposal-sent confirmation messages
    if (message.showProposalSentConfirmation && message.proposalSentData) {
      const hasDuplicateId = acc.some(
        ({ message: existing }) => existing.id === message.id
      );
      if (!hasDuplicateId) {
        acc.push({ message, index });
      }
      return acc;
    }

    // For agent messages, check for true duplicates
    const messageContent = (message.content || '').trim();

    // Check if we already have a message with the same ID
    const hasDuplicateId = acc.some(
      ({ message: existing }) => existing.id === message.id && message.id !== undefined
    );
    if (hasDuplicateId) {
      return acc;
    }

    // Check if we already have a message with exact same content
    const hasDuplicateContent = acc.some(({ message: existing }) => {
      if (existing.type !== 'agent' || message.type !== 'agent') return false;
      const existingContent = (existing.content || '').trim();
      return existingContent === messageContent && messageContent.length > 0;
    });
    if (hasDuplicateContent) {
      return acc;
    }

    acc.push({ message, index });
    return acc;
  }, [] as Array<{ message: UnifiedMessage; index: number }>);
}

/**
 * Calculate the current step for FlightSearchProgress
 *
 * Step progression:
 * 1. Trip request created (basic info captured)
 * 2. Deep link available (user can open Avinode)
 * 3. Trip ID available (RFQs can be viewed/fetched)
 * 4. RFQ flights loaded AND user has submitted/viewed (ready for proposal)
 */
function calculateCurrentStep(
  currentStep: number | undefined,
  tripId: string | undefined,
  deepLink: string | undefined,
  rfqFlightsCount: number,
  tripIdSubmitted: boolean
): number {
  // Step 4: If we have RFQ flights AND tripId is submitted (ready to send proposal)
  if (rfqFlightsCount > 0 && tripIdSubmitted) {
    return 4;
  }

  // Step 3: If we have tripId (regardless of whether RFQs are loaded)
  // This ensures Step 3 is shown when tripId exists with or without RFQs
  // FIX: Previously fell through to Step 2 when tripId existed but rfqFlightsCount > 0 and !tripIdSubmitted
  if (tripId) {
    return 3;
  }

  // Step 2: If we have deepLink (means request created, ready to select in Avinode)
  if (deepLink) {
    return 2;
  }

  // Step 1: Default (request created)
  return currentStep || 1;
}

/**
 * ChatMessageList component for rendering chat messages.
 *
 * @example
 * ```tsx
 * <ChatMessageList
 *   messages={unifiedMessages}
 *   rfqFlights={rfqFlights}
 *   selectedRfqFlightIds={selectedIds}
 *   shouldShowFlightSearchProgress={true}
 *   isProcessing={false}
 *   flightRequest={flightRequest}
 *   deepLink={activeChat.deepLink}
 *   tripId={activeChat.tripId}
 *   tripIdSubmitted={tripIdSubmitted}
 *   onTripIdSubmit={handleTripIdSubmit}
 *   onRfqFlightSelectionChange={setSelectedIds}
 *   onViewChat={handleViewChat}
 *   onGenerateProposal={handleGenerateProposal}
 *   onReviewAndBook={handleReviewAndBook}
 *   onBookFlight={handleBookFlight}
 * />
 * ```
 */
export function ChatMessageList({
  messages,
  rfqFlights,
  selectedRfqFlightIds,
  shouldShowFlightSearchProgress,
  isProcessing,
  flightRequest,
  deepLink,
  tripId,
  isTripIdLoading = false,
  tripIdError,
  tripIdSubmitted = false,
  currentStep,
  rfqsLastFetchedAt,
  customerEmail,
  customerName,
  operatorMessages,
  onTripIdSubmit,
  onRfqFlightSelectionChange,
  onViewChat,
  onGenerateProposal,
  onReviewAndBook,
  onBookFlight,
  onViewRequest,
  onRefreshPipeline,
}: ChatMessageListProps) {
  const workflowRef = useRef<HTMLDivElement>(null);

  // Deduplicate and separate messages
  const { regularMessages, proposalConfirmations } = useMemo(() => {
    const deduplicated = deduplicateMessages(messages);

    return deduplicated.reduce(
      (acc, item) => {
        if (isProposalConfirmation(item.message)) {
          acc.proposalConfirmations.push(item);
        } else {
          acc.regularMessages.push(item);
        }
        return acc;
      },
      {
        regularMessages: [] as Array<{ message: UnifiedMessage; index: number }>,
        proposalConfirmations: [] as Array<{ message: UnifiedMessage; index: number }>,
      }
    );
  }, [messages]);

  // Calculate current step for FlightSearchProgress
  const calculatedStep = useMemo(
    () =>
      calculateCurrentStep(
        currentStep,
        tripId,
        deepLink,
        rfqFlights.length,
        tripIdSubmitted
      ),
    [currentStep, tripId, deepLink, rfqFlights.length, tripIdSubmitted]
  );

  // Enhance RFQ flights with message data
  const enhancedRfqFlights = useMemo(() => {
    if (!operatorMessages) return rfqFlights;

    return rfqFlights.map((flight) => {
      const flightMessages = operatorMessages[flight.quoteId || ''] || [];
      const hasMessages = flightMessages.length > 0;
      const latestMessage = hasMessages
        ? flightMessages.reduce((latest: OperatorMessageItem | null, msg) => {
            if (!latest) return msg;
            const latestTime = new Date(latest.timestamp).getTime();
            const msgTime = new Date(msg.timestamp).getTime();
            return msgTime > latestTime ? msg : latest;
          }, null)
        : null;

      return {
        ...flight,
        hasMessages,
        hasNewMessages: hasMessages,
        sellerMessage: latestMessage?.content || flight.sellerMessage,
      };
    });
  }, [rfqFlights, operatorMessages]);

  // Handler for operator message view thread
  const handleViewThread = (quoteId: string) => {
    const flight = rfqFlights.find((f) => f.quoteId === quoteId);
    if (flight) {
      onViewChat(flight.id, quoteId);
    }
  };

  return (
    <>
      {/* Regular messages (user, operator, agent) in chronological order */}
      {regularMessages.map(({ message, index }) => (
        <React.Fragment key={message.id || `msg-${index}`}>
          {message.type === 'user' ? (
            <UserMessage content={message.content} timestamp={message.timestamp} />
          ) : message.type === 'operator' ? (
            <OperatorMessage
              content={message.content}
              operatorName={message.operatorName}
              messageType={message.operatorMessageType}
              quoteId={message.operatorQuoteId}
              timestamp={message.timestamp}
              onViewThread={handleViewThread}
            />
          ) : (
            <AgentMessage
              content={stripMarkdown(message.content)}
              timestamp={message.timestamp}
              showDeepLink={shouldShowFlightSearchProgress ? false : message.showDeepLink}
              showTripIdInput={shouldShowFlightSearchProgress ? false : message.showDeepLink}
              showWorkflow={shouldShowFlightSearchProgress ? false : message.showWorkflow}
              workflowProps={
                shouldShowFlightSearchProgress
                  ? undefined
                  : message.showWorkflow
                    ? {
                        isProcessing,
                        currentStep: calculatedStep,
                        status: 'pending',
                        tripId,
                        deepLink,
                      }
                    : undefined
              }
              deepLinkData={shouldShowFlightSearchProgress ? undefined : message.deepLinkData}
              onTripIdSubmit={onTripIdSubmit}
              isTripIdLoading={isTripIdLoading}
              tripIdError={tripIdError}
              tripIdSubmitted={tripIdSubmitted}
              showQuotes={(() => {
                const isInStep3Or4 = calculatedStep >= 3;
                return (
                  !isInStep3Or4 &&
                  (message.showQuotes && tripIdSubmitted) ||
                  (rfqFlights.length > 0 && !shouldShowFlightSearchProgress)
                );
              })()}
              rfqFlights={
                (() => {
                  const isInStep3Or4 = calculatedStep >= 3;
                  const shouldShowQuotes =
                    !isInStep3Or4 &&
                    ((message.showQuotes && tripIdSubmitted) ||
                      (rfqFlights.length > 0 && !shouldShowFlightSearchProgress));
                  return shouldShowQuotes ? enhancedRfqFlights : [];
                })()
              }
              selectedRfqFlightIds={selectedRfqFlightIds}
              rfqsLastFetchedAt={rfqsLastFetchedAt}
              onRfqFlightSelectionChange={onRfqFlightSelectionChange}
              onReviewAndBook={onReviewAndBook}
              onBookFlight={onBookFlight}
              customerEmail={customerEmail}
              customerName={customerName}
              selectedFlights={[]}
              onViewChat={onViewChat}
              onGenerateProposal={onGenerateProposal}
              showPipeline={message.showPipeline}
              pipelineData={message.pipelineData}
              showProposalSentConfirmation={message.showProposalSentConfirmation}
              proposalSentData={message.proposalSentData}
              showEmailApprovalRequest={message.showEmailApprovalRequest}
              emailApprovalData={message.emailApprovalData}
              onViewRequest={onViewRequest}
              onRefreshPipeline={onRefreshPipeline}
              showOperatorMessages={false}
              operatorMessages={undefined}
              operatorFlightContext={undefined}
              onViewOperatorThread={undefined}
              onReplyToOperator={undefined}
            />
          )}
        </React.Fragment>
      ))}

      {/* FlightSearchProgress after ALL regular messages */}
      {shouldShowFlightSearchProgress && flightRequest && (
        <div ref={workflowRef} className="mt-4 mb-4" style={{ overflow: 'visible' }}>
          <FlightSearchProgress
            currentStep={calculatedStep}
            flightRequest={flightRequest}
            deepLink={deepLink}
            tripId={tripId}
            isTripIdLoading={isTripIdLoading}
            tripIdError={tripIdError}
            tripIdSubmitted={tripIdSubmitted}
            rfqFlights={rfqFlights}
            isRfqFlightsLoading={false}
            selectedRfqFlightIds={selectedRfqFlightIds}
            rfqsLastFetchedAt={rfqsLastFetchedAt}
            customerEmail={customerEmail}
            customerName={customerName}
            onTripIdSubmit={onTripIdSubmit}
            onRfqFlightSelectionChange={onRfqFlightSelectionChange}
            onViewChat={onViewChat}
            onGenerateProposal={onGenerateProposal}
            onReviewAndBook={onReviewAndBook}
            onBookFlight={onBookFlight}
            isTripCreated={!!(tripId || deepLink)}
          />
        </div>
      )}

      {/* Proposal confirmations AFTER FlightSearchProgress */}
      {proposalConfirmations.map(({ message, index }) => (
        <AgentMessage
          key={message.id || `proposal-${index}`}
          content={message.content}
          timestamp={message.timestamp}
          showProposalSentConfirmation={true}
          proposalSentData={message.proposalSentData}
          showDeepLink={false}
          showTripIdInput={false}
          showWorkflow={false}
          showQuotes={false}
          showProposal={false}
          showCustomerPreferences={false}
          showPipeline={false}
          rfqFlights={[]}
          selectedRfqFlightIds={[]}
          onTripIdSubmit={onTripIdSubmit}
          isTripIdLoading={false}
          tripIdSubmitted={false}
          onRfqFlightSelectionChange={onRfqFlightSelectionChange}
          onReviewAndBook={onReviewAndBook}
          onBookFlight={onBookFlight}
          onViewChat={onViewChat}
          onGenerateProposal={onGenerateProposal}
        />
      ))}
    </>
  );
}

export default ChatMessageList;
