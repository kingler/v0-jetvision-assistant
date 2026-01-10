/**
 * Conversation Starters Components
 *
 * Card-style components for quick-start conversation actions.
 * Matches the existing LandingPage pattern.
 */

// Components
export { StarterCard, type StarterCardProps, type StarterCardVariant } from "./starter-card"
export { ConversationStarterHub } from "./conversation-starter-hub"
export {
  FlightRequestStarter,
  type FlightRequestStarterProps,
  type FlightRequestData,
  type FlightRequestDefaults,
  type Airport,
} from "./flight-request-starter"

export {
  ActiveRequestsStarter,
  type ActiveRequestsStarterProps,
  type ActiveRequest,
  type RequestStatus,
  type ConnectionStatus,
} from "./active-requests-starter"

export {
  DealsStarter,
  type DealsStarterProps,
  type Deal,
  type DealStatus,
  type ConnectionStatus as DealConnectionStatus,
} from "./deals-starter"

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
