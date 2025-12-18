/**
 * TypeScript types for Quote Comparison & Selection Interface
 * @module components/quotes/types
 */

/**
 * Operator information for a quote
 */
export interface OperatorInfo {
  id: string;
  name: string;
  logo?: string;
  rating: number;
  totalFlights: number;
  certifications: string[];
  location: string;
}

/**
 * Aircraft information for a quote
 */
export interface AircraftInfo {
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
 * Pricing details for a quote
 */
export interface PricingDetails {
  basePrice: number;
  taxes: number;
  fees: number;
  total: number;
  currency: string;
  pricePerHour?: number;
  fuelSurcharge?: number;
}

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

/**
 * Complete quote information
 */
export interface Quote {
  id: string;
  operator: OperatorInfo;
  aircraft: AircraftInfo;
  pricing: PricingDetails;
  scores: QuoteScores;
  departureTime: string;
  arrivalTime: string;
  flightDuration: number; // in minutes
  features: string[];
  prosCons: ProsCons;
  rank?: number;
  recommended?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

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
