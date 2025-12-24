/**
 * Consolidated Quote Types
 * @module lib/types/quotes
 *
 * Central type definitions for quotes, operators, aircraft, and pricing.
 * This consolidates duplicate types from:
 * - components/quotes/types.ts
 * - components/avinode/types.ts
 * - components/message-components/types.ts
 */

// =============================================================================
// CORE ENTITY TYPES
// =============================================================================

/**
 * Operator information - unified across all components
 */
export interface QuoteOperator {
  id?: string;
  name: string;
  logo?: string;
  rating?: number;
  totalFlights?: number;
  certifications?: string[];
  location?: string;
}

/**
 * Aircraft information - unified across all components
 */
export interface QuoteAircraft {
  id?: string;
  type: string;
  model?: string;
  tail?: string;
  category?: string;
  year?: number;
  capacity?: number;
  maxPassengers?: number;
  range?: number;
  speed?: number;
  amenities?: string[];
  imageUrl?: string;
}

/**
 * Pricing details - unified across all components
 */
export interface QuotePricing {
  amount?: number;
  basePrice?: number;
  taxes?: number;
  fees?: number;
  total?: number;
  currency: string;
  pricePerHour?: number;
  fuelSurcharge?: number;
}

/**
 * Airport information
 */
export interface AirportInfo {
  icao: string;
  name?: string;
  city?: string;
}

/**
 * Passenger information for trip details
 * Represents a single passenger with their details
 */
export interface Passenger {
  /** Full name of the passenger */
  name: string;
  /** Type of passenger - determines pricing and seating requirements */
  type: 'adult' | 'child' | 'infant';
  /** Optional date of birth (ISO format: YYYY-MM-DD) */
  dateOfBirth?: string;
  /** Optional passport number for international flights */
  passportNumber?: string;
  /** Optional special requests or requirements */
  specialRequests?: string;
  /** Optional seat preference */
  seatPreference?: 'window' | 'aisle' | 'middle' | 'no-preference';
}

/**
 * Buyer information
 */
export interface BuyerInfo {
  company: string;
  contact: string;
}

/**
 * Flight details
 */
export interface FlightDetails {
  flightTimeMinutes?: number;
  flightDuration?: number; // in minutes (alias)
  distanceNm?: number;
  departureTime?: string;
  arrivalTime?: string;
}

/**
 * Link information for deep links
 */
export interface LinkInfo {
  href: string;
  description: string;
}

// =============================================================================
// QUOTE SCORING & ANALYSIS
// =============================================================================

/**
 * Individual score breakdown
 */
export interface ScoreBreakdown {
  category: string;
  score: number;
  maxScore: number;
  weight: number;
  description: string;
}

/**
 * Quote scoring information
 */
export interface QuoteScores {
  overall: number;
  price: number;
  safety: number;
  availability: number;
  operatorRating: number;
  aircraftQuality: number;
  breakdown: ScoreBreakdown[];
}

/**
 * Pros and cons for a quote
 */
export interface ProsCons {
  pros: string[];
  cons: string[];
}

// =============================================================================
// STATUS TYPES
// =============================================================================

/**
 * Trip status
 */
export type TripStatus = 'active' | 'pending' | 'completed' | 'cancelled';

/**
 * Quote status (Avinode-specific)
 */
export type QuoteStatus =
  | 'unanswered'
  | 'quoted'
  | 'accepted'
  | 'declined'
  | 'expired';

/**
 * Webhook connection status
 */
export type WebhookStatus = 'connected' | 'delayed' | 'disconnected';

/**
 * Workflow status for action required components
 */
export type WorkflowStatus = 'pending' | 'searching' | 'selected' | 'quotes_received';

/**
 * Message type for communication
 */
export type AvinodeMessageType = 'REQUEST' | 'RESPONSE' | 'INFO' | 'CONFIRMATION';

/**
 * Authentication method
 */
export type AuthMethod = 'bearer' | 'api_key';

/**
 * Environment type
 */
export type EnvironmentType = 'sandbox' | 'production';

// =============================================================================
// COMPLETE QUOTE INTERFACE
// =============================================================================

/**
 * Complete quote information - full-featured for analysis/comparison
 */
export interface Quote {
  id: string;
  operator: QuoteOperator;
  aircraft: QuoteAircraft;
  pricing: QuotePricing;
  scores?: QuoteScores;
  departureTime?: string;
  arrivalTime?: string;
  flightDuration?: number; // in minutes
  features?: string[];
  prosCons?: ProsCons;
  rank?: number;
  recommended?: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Simplified quote for message components
 */
export interface SimpleQuote {
  id: string;
  operatorName: string;
  aircraftType: string;
  price: number;
  currency?: string;
  departureTime: string;
  arrivalTime: string;
  flightDuration: string;
  operatorRating?: number;
  isRecommended?: boolean;
  isSelected?: boolean;
}

/**
 * Quote for sidebar display
 */
export interface SidebarQuote {
  price: QuotePricing;
  operator: string;
  aircraft: string;
}

// =============================================================================
// FILTERING & SORTING
// =============================================================================

/**
 * Filter options for quotes
 */
export interface QuoteFilters {
  priceRange: [number, number];
  aircraftTypes: string[];
  departureTimeRange: [string, string];
  operatorRating: number;
  minCapacity?: number;
  amenities?: string[];
  certifications?: string[];
}

/**
 * Sort options for quotes
 */
export type QuoteSortOption =
  | 'price-asc'
  | 'price-desc'
  | 'rating-asc'
  | 'rating-desc'
  | 'departure-asc'
  | 'departure-desc'
  | 'recommended';

/**
 * View mode for quote display
 */
export type QuoteViewMode = 'grid' | 'list';

/**
 * Quick filter presets
 */
export type QuickFilterPreset = 'best-value' | 'fastest' | 'cheapest' | 'highest-rated';

/**
 * Quote action types
 */
export type QuoteAction =
  | 'select'
  | 'compare'
  | 'download-pdf'
  | 'add-note'
  | 'share'
  | 'request-details';

// =============================================================================
// COMPARISON & STATS
// =============================================================================

/**
 * Quote comparison state
 */
export interface ComparisonState {
  selectedQuotes: Quote[];
  maxSelections: number;
}

/**
 * Quote statistics
 */
export interface QuoteStats {
  total: number;
  averagePrice: number;
  priceRange: [number, number];
  averageRating: number;
  recommendedCount: number;
}

// =============================================================================
// QUICK ACTIONS
// =============================================================================

/**
 * Quick action for sidebar
 */
export interface QuickAction {
  label: string;
  onClick: () => void;
}

// =============================================================================
// LEGACY TYPE ALIASES (for backwards compatibility)
// These map to the new unified types
// =============================================================================

/** @deprecated Use QuoteOperator instead */
export type OperatorInfo = QuoteOperator;

/** @deprecated Use QuoteAircraft instead */
export type AircraftInfo = QuoteAircraft;

/** @deprecated Use QuotePricing instead */
export type PricingDetails = QuotePricing;

/** @deprecated Use QuotePricing instead */
export type PriceInfo = QuotePricing;

/** @deprecated Use FlightDetails instead */
export type FlightDetailsInfo = FlightDetails;

/** @deprecated Use SidebarQuote instead */
export type QuoteInfo = SidebarQuote;

// =============================================================================
// STRICT TYPE VARIANTS (for components requiring all fields)
// =============================================================================

/**
 * Quote with all operator fields required - for detailed quote cards
 */
export interface StrictQuoteOperator {
  id: string;
  name: string;
  logo?: string;
  rating: number;
  totalFlights: number;
  certifications: string[];
  location: string;
}

/**
 * Quote with all aircraft fields required - for detailed quote cards
 */
export interface StrictQuoteAircraft {
  id: string;
  type: string;
  model: string;
  year: number;
  capacity: number;
  range: number;
  speed: number;
  amenities: string[];
  imageUrl?: string;
}

/**
 * Quote with all pricing fields required - for detailed quote cards
 */
export interface StrictQuotePricing {
  basePrice: number;
  taxes: number;
  fees: number;
  total: number;
  currency: string;
  pricePerHour?: number;
  fuelSurcharge?: number;
}

/**
 * Full quote with all fields required - for detailed quote cards and comparison
 * This is the strict version used by components/quotes/quote-card.tsx
 */
export interface StrictQuote {
  id: string;
  operator: StrictQuoteOperator;
  aircraft: StrictQuoteAircraft;
  pricing: StrictQuotePricing;
  scores: QuoteScores;
  departureTime: string;
  arrivalTime: string;
  flightDuration: number;
  features: string[];
  prosCons: ProsCons;
  rank?: number;
  recommended?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
