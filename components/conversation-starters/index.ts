/**
 * Conversation Starters Components
 *
 * Card-style components for quick-start conversation actions.
 * Matches the existing LandingPage pattern.
 */

// Components
export { StarterCard, type StarterCardProps, type StarterCardVariant } from "./starter-card"
export { ConversationStarterHub } from "./conversation-starter-hub"

// Types
export type {
  ConversationStarter,
  ConversationStarterHubProps,
  StarterCategory,
  StarterCategoryConfig,
} from "./types"

// Default starters configuration
export { DEFAULT_STARTERS, getDefaultStarters } from "./default-starters"

// Hooks
export {
  useSmartStarters,
  type UserContext,
  type SmartStartersResult,
} from "./hooks"
