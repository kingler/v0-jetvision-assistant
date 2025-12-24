/**
 * Message Components - Barrel Exports
 *
 * Central export file for all message components and types.
 */

// Types
export type {
  MessageComponent,
  MessageComponentProps,
  BaseMessageComponent,
  TextComponent,
  QuoteCardComponent,
  QuoteComparisonComponent,
  WorkflowStatusComponent,
  ProposalPreviewComponent,
  ActionButtonsComponent,
  FormFieldComponent,
  FileAttachmentComponent,
  ProgressIndicatorComponent,
  PipelineDashboardComponent,
} from './types';

export { isComponentType } from './types';

// Main Renderer
export { MessageRenderer } from './message-renderer';
export type { MessageRendererProps } from './message-renderer';

// Individual Components
// Re-export SimpleQuoteCard from consolidated location as QuoteCard for backwards compatibility
export {
  SimpleQuoteCard as QuoteCard,
  type SimpleQuoteCardProps as QuoteCardProps,
} from '@/components/quotes/quote-card';

export { QuoteComparison } from './quote-comparison';
export type { QuoteComparisonProps } from './quote-comparison';

export { WorkflowStatus } from './workflow-status';
export type { WorkflowStatusProps } from './workflow-status';

export { ProposalPreview } from './proposal-preview';
export type { ProposalPreviewProps } from './proposal-preview';

export { ActionButton } from './action-button';
export type { ActionButtonProps } from './action-button';

export { ActionButtons } from './action-buttons';
export type { ActionButtonsProps } from './action-buttons';

export { FormField } from './form-field';
export type { FormFieldProps } from './form-field';

export { FileAttachment } from './file-attachment';
export type { FileAttachmentProps } from './file-attachment';

export { ProgressIndicator } from './progress-indicator';
export type { ProgressIndicatorProps } from './progress-indicator';

export { PipelineDashboard } from './pipeline-dashboard';
export type { PipelineDashboardProps } from './pipeline-dashboard';
