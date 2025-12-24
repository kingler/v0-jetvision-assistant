/**
 * Rich Messages - Barrel Exports
 *
 * Central export file for rich message rendering components.
 */

// Message Bubble
export { MessageBubble } from '../message-bubble';
export type { MessageBubbleProps, Message, ReplyInfo } from '../message-bubble';

// Message List
export { MessageList } from '../message-list';
export type { MessageListProps } from '../message-list';

// Rich Markdown
export { RichMarkdown } from '../rich-markdown';
export type { RichMarkdownProps } from '../rich-markdown';

// Re-export message components for convenience
export {
  MessageRenderer,
  QuoteCard,
  QuoteComparison,
  WorkflowStatus,
  ProposalPreview,
  ActionButtons,
  FormField,
  FileAttachment,
  ProgressIndicator,
} from '../message-components';

export type {
  MessageComponent,
  TextComponent,
  QuoteCardComponent,
  QuoteComparisonComponent,
  WorkflowStatusComponent,
  ProposalPreviewComponent,
  ActionButtonsComponent,
  FormFieldComponent,
  FileAttachmentComponent,
  ProgressIndicatorComponent,
} from '../message-components/types';

// MessageRendererProps is exported from the message-renderer module, not types
export type { MessageRendererProps } from '../message-components/message-renderer';
