/**
 * JetVision AI Assistant - Type Exports
 * Central export point for all TypeScript types
 */

// Database types
export * from './database';

// Quote types (consolidated from components/quotes, components/avinode, components/message-components)
// Note: We use explicit exports to avoid naming conflicts with database types
export {
  // Core entities
  type QuoteOperator,
  type QuoteAircraft,
  type QuotePricing,
  type AirportInfo,
  type BuyerInfo,
  type FlightDetails,
  type LinkInfo,
  type Passenger,
  // Scoring
  type ScoreBreakdown,
  type QuoteScores,
  type ProsCons,
  // Status types (renamed to avoid conflict with database QuoteStatus)
  type TripStatus,
  type QuoteStatus as UIQuoteStatus,
  type WebhookStatus,
  type WorkflowStatus,
  type AvinodeMessageType,
  type AuthMethod,
  type EnvironmentType,
  // Quote interfaces (renamed to avoid conflict with database Quote)
  type Quote as UIQuote,
  type SimpleQuote,
  type SidebarQuote,
  // Strict variants
  type StrictQuote,
  type StrictQuoteOperator,
  type StrictQuoteAircraft,
  type StrictQuotePricing,
  // Filtering & sorting
  type QuoteFilters,
  type QuoteSortOption,
  type QuoteViewMode,
  type QuickFilterPreset,
  type QuoteAction,
  // Comparison & stats
  type ComparisonState,
  type QuoteStats,
  // Quick actions
  type QuickAction,
  // Legacy aliases
  type OperatorInfo,
  type AircraftInfo,
  type PricingDetails,
  type PriceInfo,
  type FlightDetailsInfo,
  type QuoteInfo,
} from './quotes';
