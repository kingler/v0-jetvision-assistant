/**
 * Airport Inference Engine
 *
 * Main orchestration engine for resolving user input to airport codes.
 * Uses a prioritized resolution chain with confidence scoring and
 * disambiguation support for multi-airport cities.
 */

import type {
  Airport,
  AirportQuery,
  AirportResolutionResult,
  AirportInferenceConfig,
  DisambiguationOption,
  ResolutionSource,
} from './types';
import { DEFAULT_INFERENCE_CONFIG } from './types';
import { FuzzyMatcher } from './fuzzy-matcher';
import {
  AIRPORTS,
  getAirportByIcao,
  getAirportByIata,
  getAirportsForCity,
  iataToIcao,
  isValidIcao,
  isValidIata,
} from './airport-database';

/**
 * Context for user preferences (simplified interface for now)
 * Full implementation will integrate with ContextPersistenceService
 */
export interface UserPreferenceContext {
  userId?: string;
  preferences?: Map<string, string>; // normalized query → ICAO
  frequentOrigins?: string[]; // ICAO codes
}

/**
 * Resolution context passed to the engine
 */
export interface ResolutionContext {
  /** Prefer private jet friendly airports */
  preferPrivateJetFriendly?: boolean;
  /** User preference context */
  userContext?: UserPreferenceContext;
  /** Enable MCP fallback for validation */
  useMcpFallback?: boolean;
}

/**
 * AirportInferenceEngine
 *
 * Resolves user input (city names, IATA codes, ICAO codes, fuzzy text)
 * to airport objects using a prioritized resolution chain:
 *
 * 1. User Preference - Previously selected airports for this query
 * 2. Direct ICAO - Exact 4-letter ICAO code match
 * 3. IATA Conversion - 3-letter IATA to ICAO conversion
 * 4. City Primary - City name to primary airport(s)
 * 5. Fuzzy Match - Approximate string matching
 * 6. MCP Fallback - External API validation (optional)
 */
export class AirportInferenceEngine {
  private fuzzyMatcher: FuzzyMatcher;
  private config: AirportInferenceConfig;

  constructor(config: Partial<AirportInferenceConfig> = {}) {
    this.config = { ...DEFAULT_INFERENCE_CONFIG, ...config };
    this.fuzzyMatcher = new FuzzyMatcher(AIRPORTS, {
      minScore: this.config.minFuzzyScore,
    });
  }

  /**
   * Resolve user input to an airport
   *
   * @param input - User input (city name, IATA/ICAO code, or fuzzy text)
   * @param context - Optional resolution context
   * @returns Resolution result with airport, confidence, and alternatives
   */
  async resolve(
    input: string,
    context: ResolutionContext = {}
  ): Promise<AirportResolutionResult> {
    const query = this.normalizeQuery(input);

    if (!query.normalized) {
      return this.createEmptyResult();
    }

    // Resolution chain with early exit on high confidence
    const resolvers: Array<
      () => Promise<AirportResolutionResult | null>
    > = [
      () => this.resolveFromUserPreference(query, context.userContext),
      () => this.resolveDirectICAO(query),
      () => this.resolveFromIATA(query),
      () => this.resolveFromCity(query, context.preferPrivateJetFriendly ?? this.config.preferPrivateJetFriendly),
      () => this.resolveFromFuzzyMatch(query),
    ];

    // Add MCP fallback if enabled
    if (context.useMcpFallback ?? this.config.useMcpFallback) {
      resolvers.push(() => this.resolveFromMCP(query));
    }

    for (const resolver of resolvers) {
      const result = await resolver();

      if (result) {
        // High confidence - return immediately
        if (result.confidence >= this.config.autoResolveThreshold) {
          return result;
        }

        // Disambiguation required - return with options
        if (result.requiresDisambiguation) {
          return result;
        }

        // Medium confidence with single airport - return it
        if (result.airport && result.confidence >= this.config.minFuzzyScore) {
          return result;
        }
      }
    }

    return this.createEmptyResult();
  }

  /**
   * Resolve multiple inputs in batch
   */
  async resolveBatch(
    inputs: string[],
    context: ResolutionContext = {}
  ): Promise<AirportResolutionResult[]> {
    return Promise.all(inputs.map((input) => this.resolve(input, context)));
  }

  /**
   * Normalize user input into a query object
   */
  private normalizeQuery(input: string): AirportQuery {
    const raw = input.trim();
    const normalized = raw.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    const upper = raw.toUpperCase();

    let possibleType: AirportQuery['possibleType'] = 'unknown';

    // Check if it looks like an airport code
    if (/^K?[A-Z]{3,4}$/i.test(raw)) {
      if (raw.length === 4 && /^K[A-Z]{3}$/i.test(raw)) {
        possibleType = 'icao';
      } else if (raw.length === 3) {
        possibleType = 'iata';
      } else if (raw.length === 4) {
        // Could be ICAO without K prefix (international) or IATA typo
        possibleType = isValidIcao(upper) ? 'icao' : 'unknown';
      }
    } else if (/^[a-z\s]+$/i.test(normalized) && normalized.length > 2) {
      possibleType = 'city';
    }

    return { raw, normalized, possibleType };
  }

  /**
   * Resolve from user's saved preferences
   */
  private async resolveFromUserPreference(
    query: AirportQuery,
    userContext?: UserPreferenceContext
  ): Promise<AirportResolutionResult | null> {
    if (!userContext?.userId || !userContext.preferences) {
      return null;
    }

    const preferredIcao = userContext.preferences.get(query.normalized);
    if (!preferredIcao) {
      return null;
    }

    const airport = getAirportByIcao(preferredIcao);
    if (!airport) {
      return null;
    }

    return {
      airport,
      confidence: 0.95,
      source: 'user_preference',
      alternatives: [],
      requiresDisambiguation: false,
    };
  }

  /**
   * Resolve direct ICAO code match
   */
  private async resolveDirectICAO(
    query: AirportQuery
  ): Promise<AirportResolutionResult | null> {
    const icao = query.raw.toUpperCase();

    // Try exact match
    let airport = getAirportByIcao(icao);

    // Try with K prefix for US airports
    if (!airport && icao.length === 3 && /^[A-Z]{3}$/.test(icao)) {
      airport = getAirportByIcao(`K${icao}`);
    }

    if (airport) {
      return {
        airport,
        confidence: 1.0,
        source: 'direct_icao',
        alternatives: [],
        requiresDisambiguation: false,
      };
    }

    return null;
  }

  /**
   * Resolve IATA code to ICAO
   */
  private async resolveFromIATA(
    query: AirportQuery
  ): Promise<AirportResolutionResult | null> {
    const iata = query.raw.toUpperCase();

    if (!isValidIata(iata)) {
      return null;
    }

    const airport = getAirportByIata(iata);
    if (airport) {
      return {
        airport,
        confidence: 0.95,
        source: 'iata_conversion',
        alternatives: [],
        requiresDisambiguation: false,
      };
    }

    return null;
  }

  /**
   * Resolve city name to airport(s)
   */
  private async resolveFromCity(
    query: AirportQuery,
    preferPrivateJetFriendly: boolean
  ): Promise<AirportResolutionResult | null> {
    const airports = getAirportsForCity(query.normalized);

    if (airports.length === 0) {
      return null;
    }

    // Sort by priority, optionally preferring private jet friendly
    const sorted = [...airports].sort((a, b) => {
      if (preferPrivateJetFriendly) {
        if (a.isPrivateJetFriendly && !b.isPrivateJetFriendly) return -1;
        if (!a.isPrivateJetFriendly && b.isPrivateJetFriendly) return 1;
      }
      return a.priority - b.priority;
    });

    const primary = sorted[0];
    const alternatives = sorted.slice(1, this.config.maxAlternatives + 1);

    // Single airport for city - high confidence
    if (airports.length === 1) {
      return {
        airport: primary,
        confidence: 0.9,
        source: 'city_primary',
        alternatives: [],
        requiresDisambiguation: false,
      };
    }

    // Multiple airports - require disambiguation
    const disambiguationOptions: DisambiguationOption[] = sorted
      .slice(0, this.config.maxAlternatives)
      .map((airport, index) => ({
        airport,
        reason: this.getAirportReason(airport, index === 0),
        confidence: index === 0 ? 0.7 : 0.5 - index * 0.1,
      }));

    return {
      airport: primary,
      confidence: 0.7,
      source: 'city_primary',
      alternatives,
      requiresDisambiguation: true,
      disambiguationOptions,
    };
  }

  /**
   * Resolve using fuzzy string matching
   */
  private async resolveFromFuzzyMatch(
    query: AirportQuery
  ): Promise<AirportResolutionResult | null> {
    const matches = this.fuzzyMatcher.match(
      query.normalized,
      this.config.maxAlternatives
    );

    if (matches.length === 0) {
      return null;
    }

    const [best, ...rest] = matches;
    const alternatives = rest.map((m) => m.airport);

    // High confidence match - no disambiguation needed
    if (best.score >= this.config.autoResolveThreshold) {
      return {
        airport: best.airport,
        confidence: best.score,
        source: 'fuzzy_match',
        alternatives,
        requiresDisambiguation: false,
      };
    }

    // Multiple close matches - require disambiguation
    const closeMatches = matches.filter(
      (m) => m.score >= this.config.minFuzzyScore
    );

    if (closeMatches.length > 1) {
      const disambiguationOptions: DisambiguationOption[] = closeMatches.map(
        (m) => ({
          airport: m.airport,
          reason: `Matched "${m.matchedField}" with ${Math.round(m.score * 100)}% confidence`,
          confidence: m.score,
        })
      );

      return {
        airport: best.airport,
        confidence: best.score,
        source: 'fuzzy_match',
        alternatives,
        requiresDisambiguation: true,
        disambiguationOptions,
      };
    }

    // Single fuzzy match
    return {
      airport: best.airport,
      confidence: best.score,
      source: 'fuzzy_match',
      alternatives,
      requiresDisambiguation: false,
    };
  }

  /**
   * Resolve using MCP API fallback (stub for future implementation)
   */
  private async resolveFromMCP(
    query: AirportQuery
  ): Promise<AirportResolutionResult | null> {
    // TODO: Implement MCP fallback using Avinode search_airports tool
    // This will be called via the MCP client when available
    //
    // Example integration:
    // const mcpClient = getMcpClient('avinode');
    // const result = await mcpClient.callTool('search_airports', { query: query.raw });
    // if (result.airports?.length > 0) {
    //   return { airport: result.airports[0], confidence: 0.85, source: 'mcp_fallback', ... };
    // }

    return null;
  }

  /**
   * Generate a human-readable reason for airport suggestion
   */
  private getAirportReason(airport: Airport, isPrimary: boolean): string {
    const reasons: string[] = [];

    if (isPrimary) {
      reasons.push('Primary airport');
    }

    if (airport.isPrivateJetFriendly) {
      reasons.push('Popular for private jets');
    } else {
      reasons.push('Commercial airport');
    }

    if (airport.iata) {
      reasons.push(`IATA: ${airport.iata}`);
    }

    return reasons.join(' • ');
  }

  /**
   * Create an empty result for no matches
   */
  private createEmptyResult(): AirportResolutionResult {
    return {
      airport: null,
      confidence: 0,
      source: 'fuzzy_match',
      alternatives: [],
      requiresDisambiguation: false,
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): AirportInferenceConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AirportInferenceConfig>): void {
    this.config = { ...this.config, ...config };

    // Update fuzzy matcher config
    if (config.minFuzzyScore !== undefined) {
      this.fuzzyMatcher.updateConfig({ minScore: config.minFuzzyScore });
    }
  }

  /**
   * Get the fuzzy matcher instance (for testing)
   */
  getFuzzyMatcher(): FuzzyMatcher {
    return this.fuzzyMatcher;
  }
}

/**
 * Create a pre-configured inference engine instance
 */
export function createAirportInferenceEngine(
  config?: Partial<AirportInferenceConfig>
): AirportInferenceEngine {
  return new AirportInferenceEngine(config);
}

/**
 * Singleton instance for convenience
 */
let defaultEngine: AirportInferenceEngine | null = null;

export function getDefaultAirportInferenceEngine(): AirportInferenceEngine {
  if (!defaultEngine) {
    defaultEngine = new AirportInferenceEngine();
  }
  return defaultEngine;
}

/**
 * Quick resolve function using default engine
 */
export async function resolveAirport(
  input: string,
  context?: ResolutionContext
): Promise<AirportResolutionResult> {
  return getDefaultAirportInferenceEngine().resolve(input, context);
}
