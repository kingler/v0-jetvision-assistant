/**
 * Airport Inference System Types
 *
 * Core TypeScript interfaces for the airport resolution engine,
 * supporting ICAO/IATA conversion, city mapping, and disambiguation.
 */

/**
 * Represents a single airport with all relevant metadata
 */
export interface Airport {
  /** 4-letter ICAO code (e.g., "KTEB") */
  icao: string;
  /** 3-letter IATA code (e.g., "TEB") or null if no IATA code */
  iata: string | null;
  /** Full airport name (e.g., "Teterboro Airport") */
  name: string;
  /** City name (e.g., "Teterboro") */
  city: string;
  /** State/Province code (e.g., "NJ") */
  state: string;
  /** Country code (e.g., "US") */
  country: string;
  /** Latitude in decimal degrees */
  latitude: number;
  /** Longitude in decimal degrees */
  longitude: number;
  /** IANA timezone (e.g., "America/New_York") */
  timezone: string;
  /** Whether this airport is commonly used for private jets */
  isPrivateJetFriendly: boolean;
  /** Priority for city resolution - lower = higher priority */
  priority: number;
  /** Alternative names/codes for fuzzy matching */
  aliases: string[];
}

/**
 * Source of how an airport was resolved
 */
export type ResolutionSource =
  | 'direct_icao'
  | 'iata_conversion'
  | 'city_primary'
  | 'fuzzy_match'
  | 'mcp_fallback'
  | 'user_preference'
  | 'search_history';

/**
 * Option presented during disambiguation
 */
export interface DisambiguationOption {
  /** The airport option */
  airport: Airport;
  /** Human-readable reason for this suggestion */
  reason: string;
  /** Confidence score for this option (0-1) */
  confidence: number;
}

/**
 * Result of airport resolution
 */
export interface AirportResolutionResult {
  /** Resolved airport or null if not found */
  airport: Airport | null;
  /** Confidence score (0-1) */
  confidence: number;
  /** How the airport was resolved */
  source: ResolutionSource;
  /** Alternative airports that could match */
  alternatives: Airport[];
  /** Whether user needs to choose between options */
  requiresDisambiguation: boolean;
  /** Options to present if disambiguation required */
  disambiguationOptions?: DisambiguationOption[];
}

/**
 * Normalized query for airport lookup
 */
export interface AirportQuery {
  /** Original user input */
  raw: string;
  /** Lowercase, trimmed input */
  normalized: string;
  /** Detected type of input */
  possibleType: 'icao' | 'iata' | 'city' | 'unknown';
}

/**
 * Match result from fuzzy matching
 */
export interface FuzzyMatch {
  /** Matched airport */
  airport: Airport;
  /** Similarity score (0-1) */
  score: number;
  /** Which field matched (name, city, icao, iata, alias) */
  matchedField: string;
}

/**
 * User's preferred airport for a specific query
 */
export interface UserAirportPreference {
  /** User ID */
  userId: string;
  /** Normalized query that triggered this preference */
  queryNormalized: string;
  /** Selected ICAO code */
  icao: string;
  /** Number of times user selected this */
  selectionCount: number;
  /** Last time this preference was used */
  lastUsed: Date;
}

/**
 * Entry in user's search history
 */
export interface SearchHistoryEntry {
  /** User ID */
  userId: string;
  /** Departure airport ICAO */
  departureIcao: string;
  /** Arrival airport ICAO */
  arrivalIcao: string;
  /** Passenger count from search */
  passengerCount: number;
  /** Number of times this route was searched */
  searchCount: number;
  /** Last search timestamp */
  lastSearched: Date;
}

/**
 * Configuration for the airport inference engine
 */
export interface AirportInferenceConfig {
  /** Minimum confidence to auto-resolve without disambiguation (default: 0.8) */
  autoResolveThreshold: number;
  /** Minimum fuzzy match score to consider (default: 0.5) */
  minFuzzyScore: number;
  /** Whether to prefer private jet friendly airports (default: true) */
  preferPrivateJetFriendly: boolean;
  /** Whether to use MCP fallback for validation (default: true) */
  useMcpFallback: boolean;
  /** Maximum alternatives to return (default: 5) */
  maxAlternatives: number;
}

/**
 * Default configuration values
 */
export const DEFAULT_INFERENCE_CONFIG: AirportInferenceConfig = {
  autoResolveThreshold: 0.8,
  minFuzzyScore: 0.5,
  preferPrivateJetFriendly: true,
  useMcpFallback: true,
  maxAlternatives: 5,
};
