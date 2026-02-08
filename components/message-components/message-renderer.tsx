/**
 * Message Renderer Component
 *
 * Main component that routes MessageComponent objects to their
 * appropriate sub-components for rendering.
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { MessageComponent, MessageComponentProps } from './types';
import { SimpleQuoteCard } from '@/components/quotes/quote-card';
import { QuoteComparison } from './quote-comparison';
import { WorkflowStatus } from './workflow-status';
import { ProposalPreview } from './proposal-preview';
import { ActionButtons } from './action-buttons';
import { FormField } from './form-field';
import { FileAttachment } from './file-attachment';
import { ProgressIndicator } from './progress-indicator';
import {
  AvinodeConnectionStatus,
  TripSummaryCard,
  AvinodeDeepLinks,
  AvinodeAuthStatus,
  RfqQuoteDetailsCard,
  TripDetailsCard,
  AvinodeMessageCard,
} from '@/components/avinode';
import { PipelineDashboard } from './pipeline-dashboard';
import { InlineDashboard } from './inline-dashboard';
import { OperatorChatInline } from './operator-chat-inline';

export interface MessageRendererProps {
  component: MessageComponent;
  onAction?: (action: string, data: Record<string, unknown>) => void;
  className?: string;
}

export function MessageRenderer({ component, onAction, className }: MessageRendererProps) {
  const handleAction = (action: string, data: Record<string, unknown>) => {
    onAction?.(action, data);
  };

  switch (component.type) {
    case 'text':
      return (
        <div className={`prose prose-sm max-w-none ${className || ''} ${component.className || ''}`}>
          {component.markdown ? (
            <ReactMarkdown>{component.content}</ReactMarkdown>
          ) : (
            <p className="whitespace-pre-wrap">{component.content}</p>
          )}
        </div>
      );

    case 'quote_card':
      return (
        <SimpleQuoteCard
          quote={component.quote}
          onSelect={(quoteId) => handleAction('select_quote', { quoteId })}
          onViewDetails={(quoteId) => handleAction('view_quote_details', { quoteId })}
          className={`${className || ''} ${component.className || ''}`}
        />
      );

    case 'quote_comparison':
      return (
        <QuoteComparison
          quotes={component.quotes}
          onSelectQuote={(quoteId) => handleAction('select_quote', { quoteId })}
          onCompare={() => handleAction('compare_quotes', {})}
          className={`${className || ''} ${component.className || ''}`}
        />
      );

    case 'workflow_status':
      return (
        <WorkflowStatus
          stage={component.stage}
          progress={component.progress}
          message={component.message}
          details={component.details}
          className={`${className || ''} ${component.className || ''}`}
        />
      );

    case 'proposal_preview':
      return (
        <ProposalPreview
          proposal={component.proposal}
          onDownload={(proposalId) => handleAction('download_proposal', { proposalId })}
          onView={(proposalId) => handleAction('view_proposal', { proposalId })}
          onAccept={(proposalId) => handleAction('accept_proposal', { proposalId })}
          className={`${className || ''} ${component.className || ''}`}
        />
      );

    case 'action_buttons':
      return (
        <ActionButtons
          actions={component.actions}
          layout={component.layout}
          onAction={(actionId, value) => handleAction('button_action', { actionId, value })}
          className={`${className || ''} ${component.className || ''}`}
        />
      );

    case 'form_field':
      return (
        <FormField
          field={component.field}
          onSubmit={(name, value) => handleAction('form_submit', { name, value })}
          onChange={(name, value) => handleAction('form_change', { name, value })}
          className={`${className || ''} ${component.className || ''}`}
        />
      );

    case 'file_attachment':
      return (
        <FileAttachment
          file={component.file}
          onDownload={(fileId) => handleAction('download_file', { fileId })}
          onPreview={(fileId) => handleAction('preview_file', { fileId })}
          className={`${className || ''} ${component.className || ''}`}
        />
      );

    case 'progress_indicator':
      return (
        <ProgressIndicator
          message={component.message}
          progress={component.progress}
          variant={component.variant}
          cancellable={component.cancellable}
          onCancel={component.onCancel}
          className={`${className || ''} ${component.className || ''}`}
        />
      );

    case 'avinode_connection_status':
      return (
        <AvinodeConnectionStatus
          success={component.success}
          message={component.message}
          timestamp={component.timestamp}
        />
      );

    case 'avinode_trip_summary':
      return (
        <TripSummaryCard
          tripId={component.tripId}
          departureAirport={component.departureAirport}
          arrivalAirport={component.arrivalAirport}
          departureDate={component.departureDate}
          passengers={component.passengers}
          status={component.status}
          tripType={component.tripType}
          returnDate={component.returnDate}
          onCopyTripId={component.onCopyTripId || (() => handleAction('copy_trip_id', { tripId: component.tripId }))}
        />
      );

    case 'avinode_deep_links':
      return (
        <AvinodeDeepLinks
          links={component.links}
          onLinkClick={component.onLinkClick || ((type) => handleAction('avinode_link_click', { linkType: type }))}
        />
      );

    case 'avinode_auth_status':
      return (
        <AvinodeAuthStatus
          method={component.method}
          environment={component.environment}
          baseUrl={component.baseUrl}
          expiresAt={component.expiresAt}
          isValid={component.isValid}
        />
      );

    case 'avinode_rfq_quote_details':
      return (
        <RfqQuoteDetailsCard
          rfqId={component.rfqId}
          quoteId={component.quoteId}
          operator={component.operator}
          aircraft={component.aircraft}
          price={component.price}
          flightDetails={component.flightDetails}
          status={component.status}
          statusDescription={component.statusDescription}
        />
      );

    case 'avinode_trip_details':
      return (
        <TripDetailsCard
          tripId={component.tripId}
          displayTripId={component.displayTripId}
          departureAirport={component.departureAirport}
          arrivalAirport={component.arrivalAirport}
          departureDate={component.departureDate}
          departureTime={component.departureTime}
          timezone={component.timezone}
          passengers={component.passengers}
          status={component.status}
          buyer={component.buyer}
          onCopyTripId={component.onCopyTripId || (() => handleAction('copy_trip_id', { tripId: component.tripId }))}
        />
      );

    case 'avinode_message':
      return (
        <AvinodeMessageCard
          messageType={component.messageType}
          content={component.content}
          timestamp={component.timestamp}
          sender={component.sender}
        />
      );

    case 'pipeline_dashboard':
      return (
        <PipelineDashboard
          stats={component.stats}
          requests={component.requests}
          onViewRequest={component.onViewRequest || ((requestId) => handleAction('view_request', { requestId }))}
          onRefresh={component.onRefresh || (() => handleAction('refresh_pipeline', {}))}
          className={`${className || ''} ${component.className || ''}`}
        />
      );

    case 'operator_chat_inline':
      return (
        <OperatorChatInline
          flightContext={component.flightContext}
          messages={component.messages}
          hasNewMessages={component.hasNewMessages}
          onViewFullThread={component.onViewFullThread || ((quoteId) => handleAction('view_full_thread', { quoteId }))}
          onReply={component.onReply || ((quoteId) => handleAction('reply_to_operator', { quoteId }))}
          className={`${className || ''} ${component.className || ''}`}
        />
      );

    case 'inline_dashboard':
      return (
        <InlineDashboard
          pipeline={component.pipeline}
          analytics={component.analytics}
          metrics={component.metrics}
          hotOpportunities={component.hotOpportunities}
          dateRange={component.dateRange}
          onViewRequest={component.onViewRequest || ((requestId) => handleAction('view_request', { requestId }))}
          onRefresh={component.onRefresh || (() => handleAction('refresh_dashboard', {}))}
          onPeriodChange={component.onPeriodChange || ((period) => handleAction('change_period', { period }))}
          onViewAllOpportunities={component.onViewAllOpportunities || (() => handleAction('view_all_opportunities', {}))}
          className={`${className || ''} ${component.className || ''}`}
        />
      );

    default:
      // Type guard to ensure exhaustive checking
      const _exhaustiveCheck: never = component;
      console.error('Unknown message component type:', _exhaustiveCheck);
      return (
        <div className={`p-4 border border-destructive rounded-lg ${className || ''}`}>
          <p className="text-destructive text-sm">
            Unknown component type. Please check your message configuration.
          </p>
        </div>
      );
  }
}
