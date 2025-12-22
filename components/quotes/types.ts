/**
 * TypeScript types for Quote Comparison & Selection Interface
 * @module components/quotes/types
 *
 * @deprecated Import from '@/lib/types/quotes' instead.
 * This file re-exports types for backwards compatibility.
 */

// Re-export all quote types from centralized location
export {
  // Core entities
  type QuoteOperator,
  type QuoteAircraft,
  type QuotePricing,
  type AirportInfo,
  type BuyerInfo,
  type FlightDetails,
  type LinkInfo,
  // Scoring
  type ScoreBreakdown,
  type QuoteScores,
  type ProsCons,
  // Status types
  type TripStatus,
  type QuoteStatus,
  type WebhookStatus,
  type WorkflowStatus,
  type AvinodeMessageType,
  type AuthMethod,
  type EnvironmentType,
  // Quote interfaces
  type Quote,
  type SimpleQuote,
  type SidebarQuote,
  // Strict quote variants (all fields required)
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
  // Legacy aliases (deprecated)
  type OperatorInfo,
  type AircraftInfo,
  type PricingDetails,
  type PriceInfo,
  type FlightDetailsInfo,
  type QuoteInfo,
} from '@/lib/types/quotes';
