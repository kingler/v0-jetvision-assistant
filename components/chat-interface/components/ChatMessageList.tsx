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
import { stripMarkdown } from '@/lib/utils/format';
import { calculateCurrentStep as calculateCurrentStepFromChat } from '../utils/flightProgressValidation';
import { deduplicateMessages, isProposalConfirmation } from '../utils/messageTransformers';
import type { ChatSession } from '@/components/chat-sidebar';

/**
 * Calculate the current step for FlightSearchProgress.
 * Delegates to the shared implementation in flightProgressValidation.ts.
 */
function calculateCurrentStep(
  currentStep: number | undefined,
  tripId: string | undefined,
  deepLink: string | undefined,
  rfqFlightsCount: number,
  tripIdSubmitted: boolean
): number {
  return calculateCurrentStepFromChat(
    { tripId, deepLink, currentStep } as ChatSession,
    rfqFlightsCount,
    tripIdSubmitted
  );
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
  onMarkPayment,
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

  // Deduplicate and separate messages, and find the insertion point for FlightSearchProgress
  const { messagesBeforeProgress, messagesAfterProgress, proposalConfirmations } = useMemo(() => {
    const deduplicated = deduplicateMessages(messages);

    // Separate proposal confirmations from regular messages
    const regularMessages: Array<{ message: UnifiedMessage; index: number }> = [];
    const proposalConfirmations: Array<{ message: UnifiedMessage; index: number }> = [];

    for (const item of deduplicated) {
      if (isProposalConfirmation(item.message)) {
        proposalConfirmations.push(item);
      } else {
        regularMessages.push(item);
      }
    }

    // Find the insertion point for FlightSearchProgress
    // It should appear right after the agent message that CREATED the trip
    // (the message with showDeepLink or deepLinkData, indicating create_trip was called)
    // This ensures correct positioning when user's initial request is incomplete
    // and multiple back-and-forth messages are needed to gather all required details
    let tripCreationIndex = -1;
    for (let i = 0; i < regularMessages.length; i++) {
      const msg = regularMessages[i].message;
      // Find the agent message where the trip was created
      if (msg.type === 'agent' && (msg.showDeepLink || msg.deepLinkData?.tripId || msg.deepLinkData?.deepLink)) {
        tripCreationIndex = i;
        break;
      }
    }

    // Fallback: If no trip creation message found, use first user message
    // This handles edge cases where deepLinkData might not be set on messages
    let insertionIndex = tripCreationIndex;
    if (insertionIndex === -1) {
      for (let i = 0; i < regularMessages.length; i++) {
        if (regularMessages[i].message.type === 'user') {
          insertionIndex = i;
          break;
        }
      }
    }

    // Split messages into before and after the FlightSearchProgress insertion point
    // FlightSearchProgress appears AFTER the insertion point message
    const splitIndex = insertionIndex >= 0 ? insertionIndex + 1 : 0;

    const before = regularMessages.slice(0, splitIndex);
    const after = regularMessages.slice(splitIndex);

    return {
      messagesBeforeProgress: before,
      messagesAfterProgress: after,
      proposalConfirmations,
    };
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

  // Helper to render a single message
  const renderMessage = ({ message, index }: { message: UnifiedMessage; index: number }) => (
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
              ((message.showQuotes && tripIdSubmitted) ||
                (rfqFlights.length > 0 && !shouldShowFlightSearchProgress))
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
          showContractSentConfirmation={message.showContractSentConfirmation}
          contractSentData={message.contractSentData}
          onMarkPayment={onMarkPayment}
          showPaymentConfirmation={message.showPaymentConfirmation}
          paymentConfirmationData={message.paymentConfirmationData}
          showClosedWon={message.showClosedWon}
          closedWonData={message.closedWonData}
          pdfPreviewBase64={message.pdfPreviewBase64}
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
  );

  return (
    <>
      {/* Messages BEFORE FlightSearchProgress (includes first user message / trip request) */}
      {messagesBeforeProgress.map(renderMessage)}

      {/* FlightSearchProgress - positioned right after the first user message (trip request) */}
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

      {/* Messages AFTER FlightSearchProgress (all subsequent conversation) */}
      {messagesAfterProgress.map(renderMessage)}

      {/* Proposal confirmations at the end */}
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
