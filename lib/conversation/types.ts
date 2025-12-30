/**
 * Conversation Types
 *
 * TypeScript interfaces for conversational context management,
 * aircraft category inference, and disambiguation handling.
 */

import type { Airport, DisambiguationOption } from '../airports/types';

/**
 * Aircraft category types for private jets
 */
export type AircraftCategory =
  | 'turboprop'
  | 'very_light_jet'
  | 'light_jet'
  | 'midsize_jet'
  | 'super_midsize_jet'
  | 'heavy_jet'
  | 'ultra_long_range';

/**
 * Result of aircraft category inference from passenger count
 */
export interface AircraftCategoryInference {
  /** Number of passengers provided */
  passengerCount: number;
  /** Primary recommended aircraft category */
  recommendedCategory: AircraftCategory;
  /** Alternative categories that could work */
  alternativeCategories: AircraftCategory[];
  /** Confidence score (0-1) */
  confidence: number;
  /** Human-readable reasoning for the recommendation */
  reasoning: string;
}

/**
 * Trip type classification
 */
export type TripType = 'one_way' | 'round_trip' | 'multi_leg';

/**
 * Extracted flight details from conversation
 */
export interface FlightDetails {
  /** Departure airport */
  departureAirport?: Airport;
  /** Arrival airport */
  arrivalAirport?: Airport;
  /** Departure date */
  departureDate?: Date;
  /** Return date (for round trips) */
  returnDate?: Date;
  /** Number of passengers */
  passengerCount?: number;
  /** Inferred or specified aircraft category */
  aircraftCategory?: AircraftCategory;
  /** Type of trip */
  tripType?: TripType;
  /** Additional notes or requirements */
  notes?: string;
}

/**
 * Field types that can require disambiguation
 */
export type DisambiguationField =
  | 'departure'
  | 'arrival'
  | 'date'
  | 'passengers'
  | 'aircraft';

/**
 * Context for a disambiguation question
 */
export interface DisambiguationContext {
  /** Which field needs clarification */
  field: DisambiguationField;
  /** Options to present to the user */
  options: DisambiguationOption[];
  /** Original user query that triggered disambiguation */
  userQuery: string;
  /** When the disambiguation was created */
  timestamp: Date;
  /** Whether the user has responded */
  resolved: boolean;
  /** User's selected option (after resolution) */
  selectedOption?: DisambiguationOption;
}

/**
 * Session-level conversation context
 */
export interface ConversationContext {
  /** Unique session identifier */
  sessionId: string;
  /** User identifier */
  userId: string;
  /** Resolved entities from the conversation */
  resolvedEntities: Map<string, unknown>;
  /** Pending disambiguation questions */
  pendingDisambiguations: DisambiguationContext[];
  /** Extracted flight details so far */
  extractedFlightDetails: Partial<FlightDetails>;
  /** Number of conversation turns */
  turnCount: number;
  /** Session start time */
  startedAt: Date;
  /** Last activity time */
  lastActivityAt: Date;
}

/**
 * Configuration for aircraft category inference
 */
export interface AircraftCategoryConfig {
  /** Whether to suggest alternatives that are slightly above capacity */
  suggestLargerAlternatives: boolean;
  /** Whether to include category reasoning in results */
  includeReasoning: boolean;
  /** Preference for cabin comfort over efficiency */
  preferComfort: boolean;
}

/**
 * Default configuration for aircraft category inference
 */
export const DEFAULT_AIRCRAFT_CONFIG: AircraftCategoryConfig = {
  suggestLargerAlternatives: true,
  includeReasoning: true,
  preferComfort: true,
};

/**
 * Range definition for an aircraft category
 */
export interface CategoryRange {
  /** Aircraft category */
  category: AircraftCategory;
  /** Minimum passengers (inclusive) */
  minPax: number;
  /** Maximum passengers (inclusive) */
  maxPax: number;
  /** Typical/optimal range as string */
  typicalRange: string;
  /** Typical range in nautical miles */
  rangeNm?: number;
  /** Typical cruise speed in knots */
  cruiseSpeedKts?: number;
}

/**
 * Human-readable category names
 */
export const CATEGORY_DISPLAY_NAMES: Record<AircraftCategory, string> = {
  turboprop: 'Turboprop',
  very_light_jet: 'Very Light Jet',
  light_jet: 'Light Jet',
  midsize_jet: 'Midsize Jet',
  super_midsize_jet: 'Super Midsize Jet',
  heavy_jet: 'Heavy Jet',
  ultra_long_range: 'Ultra Long Range Jet',
};

/**
 * Conversation turn representing a single exchange
 */
export interface ConversationTurn {
  /** Turn identifier */
  id: string;
  /** User's message */
  userMessage: string;
  /** Assistant's response */
  assistantResponse: string;
  /** Entities extracted in this turn */
  extractedEntities: Partial<FlightDetails>;
  /** Disambiguation triggered (if any) */
  disambiguation?: DisambiguationContext;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Full conversation history
 */
export interface ConversationHistory {
  /** Session identifier */
  sessionId: string;
  /** User identifier */
  userId: string;
  /** All conversation turns */
  turns: ConversationTurn[];
  /** Final extracted flight details */
  finalDetails?: FlightDetails;
  /** Conversation status */
  status: 'active' | 'completed' | 'abandoned';
  /** When the conversation started */
  startedAt: Date;
  /** When the conversation ended (if completed) */
  completedAt?: Date;
}
