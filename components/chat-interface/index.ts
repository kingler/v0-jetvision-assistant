/**
 * Chat Interface Module
 *
 * Exports all components and types for the chat interface.
 *
 * This module contains extracted components from the main chat-interface.tsx file,
 * following the refactoring plan to improve maintainability and testability.
 *
 * @module chat-interface
 */

// Components
export {
  UserMessage,
  type UserMessageProps,
  OperatorMessage,
  type OperatorMessageProps,
  ChatMessageList,
  ChatInput,
  type ChatInputProps,
  QuickActions,
  type QuickActionsProps,
  type QuickAction,
  StreamingIndicator,
  type StreamingIndicatorProps,
  ErrorDisplay,
  type ErrorDisplayProps,
} from './components';

// Types
export type {
  UnifiedMessage,
  OperatorMessageItem,
  FlightRequestData,
  ChatMessageListProps,
} from './types';

// Utils
export {
  shouldShowFlightProgress,
  calculateCurrentStep,
  getStepLabel,
  isWorkflowAtQuotesStage,
  isUserActionRequired,
  unifyMessages,
  filterByType,
  getProposalConfirmations,
  getRegularMessages,
  separateProposalConfirmations,
  getMostRecentByType,
  hasUnreadOperatorMessages,
  countByType,
  isProposalConfirmation,
  deduplicateMessages,
} from './utils';

// EXPERIMENTAL: Incomplete refactored version — do NOT use in production.
// Production uses ChatInterface re-exported from chat-interface-main.tsx below.
export {
  ChatInterfaceRefactored,
  type ChatInterfaceProps,
} from './ChatInterfaceRefactored';

// Production ChatInterface — canonical re-export
// Import via `@/components/chat-interface` to get this component.
export { ChatInterface } from '../chat-interface-main';
