/**
 * Chat Module
 *
 * Centralized exports for chat functionality extracted from chat-interface.tsx.
 * This module provides reusable utilities for SSE parsing, data transformation,
 * and type definitions.
 */

// Constants
export * from './constants';

// Types (canonical definitions)
export * from './types';

// Parsers
export * from './parsers';

// Transformers
export * from './transformers';

// Hooks - export selectively to avoid duplicate type exports
export {
  useChatState,
  chatReducer,
  initialChatState,
  type ChatState,
  type ChatAction,
  type UseChatStateReturn,
} from './hooks/use-chat-state';

export {
  useStreamingChat,
  type UseStreamingChatOptions,
  type SendMessageResult,
  type UseStreamingChatReturn,
} from './hooks/use-streaming-chat';

export {
  useTripIdSubmit,
  type UseTripIdSubmitOptions,
  type TripIdSubmitResult,
  type UseTripIdSubmitReturn,
} from './hooks/use-trip-id-submit';

export {
  useRFQPolling,
  type UseRFQPollingOptions,
  type PollingState,
  type UseRFQPollingReturn,
} from './hooks/use-rfq-polling';

export {
  useWebhookSubscription,
  type UseWebhookSubscriptionOptions,
  type UseWebhookSubscriptionReturn,
  type WebhookEvent,
  type WebhookEventPayload,
} from './hooks/use-webhook-subscription';

export {
  useMessageDeduplication,
  type UseMessageDeduplicationOptions,
  type UseMessageDeduplicationReturn,
  type DeduplicatableMessage,
  type UnifiedMessage,
  type OperatorMessageItem,
} from './hooks/use-message-deduplication';

export {
  useProposalGeneration,
  type UseProposalGenerationOptions,
  type UseProposalGenerationReturn,
  type ClientProfile,
  type CustomerData,
} from './hooks/use-proposal-generation';

// API Services (client-side)
export * from './api';

// Book Flight customer derivation (selected proposal customer for contract modal)
export { getBookFlightCustomer } from './book-flight-customer';
