/**
 * Session Management Module
 *
 * Barrel exports for session tracking and conversation state management.
 *
 * @module lib/sessions
 */

// Chat session tracking (Supabase-backed)
export {
  createOrUpdateChatSession,
  getActiveChatSession,
  getChatSessionByRequest,
  getChatSessionsByTripId,
  updateChatSessionActivity,
  updateChatSessionWithTripInfo,
  updateChatSessionWithQuote,
  updateChatSessionWithProposal,
  completeChatSession,
  updateChatSessionType,
  getUserActiveChatSessions,
} from './track-chat-session';

export type {
  ChatSession,
  ChatSessionInsert,
  ChatSessionUpdate,
} from './track-chat-session';

// Redis conversation store (ONEK-115)
export {
  RedisConversationStore,
  createConversationStore,
  getConversationStore,
  resetConversationStore,
} from './redis-conversation-store';

export type {
  RedisConfig,
  StoreHealth,
} from './redis-conversation-store';
