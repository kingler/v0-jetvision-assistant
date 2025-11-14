/**
 * Message Renderer Component
 *
 * Main component that routes MessageComponent objects to their
 * appropriate sub-components for rendering.
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { MessageComponent, MessageComponentProps } from './types';
import { QuoteCard } from './quote-card';
import { QuoteComparison } from './quote-comparison';
import { WorkflowStatus } from './workflow-status';
import { ProposalPreview } from './proposal-preview';
import { ActionButtons } from './action-buttons';
import { FormField } from './form-field';
import { FileAttachment } from './file-attachment';
import { ProgressIndicator } from './progress-indicator';

export interface MessageRendererProps {
  component: MessageComponent;
  onAction?: (action: string, data: any) => void;
  className?: string;
}

export function MessageRenderer({ component, onAction, className }: MessageRendererProps) {
  const handleAction = (action: string, data: any) => {
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
        <QuoteCard
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
