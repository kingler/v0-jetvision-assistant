/**
 * Fuzzy Matcher for Airport Resolution
 *
 * Implements fuzzy string matching using Levenshtein distance
 * and other similarity algorithms to match user input to airports.
 */

import type { Airport, FuzzyMatch } from './types';

/**
 * Configuration options for fuzzy matching
 */
export interface FuzzyMatcherConfig {
  /** Minimum similarity score to include in results (default: 0.5) */
  minScore: number;
  /** Boost factor for exact substring matches (default: 0.15) */
  substringBoost: number;
  /** Boost factor for matching at word start (default: 0.1) */
  wordStartBoost: number;
  /** Boost factor for private jet friendly airports (default: 0.05) */
  privateJetBoost: number;
}

const DEFAULT_CONFIG: FuzzyMatcherConfig = {
  minScore: 0.5,
  substringBoost: 0.15,
  wordStartBoost: 0.1,
  privateJetBoost: 0.05,
};

/**
 * FuzzyMatcher class for approximate airport matching
 *
 * Uses a combination of:
 * - Exact matching
 * - Substring/contains matching
 * - Levenshtein distance for edit similarity
 * - Word boundary matching
 */
export class FuzzyMatcher {
  private airports: Airport[];
  private config: FuzzyMatcherConfig;

  constructor(airports: Airport[], config: Partial<FuzzyMatcherConfig> = {}) {
    this.airports = airports;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Find airports matching the query string
   *
   * @param query - User input to match against
   * @param limit - Maximum number of results to return (default: 5)
   * @returns Array of FuzzyMatch results sorted by score descending
   */
  match(query: string, limit = 5): FuzzyMatch[] {
    const results: FuzzyMatch[] = [];
    const normalized = this.normalize(query);

    if (!normalized) {
      return [];
    }

    for (const airport of this.airports) {
      const matchResult = this.matchAirport(normalized, airport);

      if (matchResult && matchResult.score >= this.config.minScore) {
        results.push(matchResult);
      }
    }

    // Sort by score descending, then by priority ascending
    return results
      .sort((a, b) => {
        if (Math.abs(b.score - a.score) > 0.001) {
          return b.score - a.score;
        }
        return a.airport.priority - b.airport.priority;
      })
      .slice(0, limit);
  }

  /**
   * Match a query against a single airport
   */
  private matchAirport(normalized: string, airport: Airport): FuzzyMatch | null {
    const fields: Array<{ value: string; field: string; weight: number }> = [
      { value: airport.icao.toLowerCase(), field: 'icao', weight: 1.0 },
      { value: airport.name.toLowerCase(), field: 'name', weight: 0.95 },
      { value: airport.city.toLowerCase(), field: 'city', weight: 0.9 },
      ...(airport.iata
        ? [{ value: airport.iata.toLowerCase(), field: 'iata', weight: 1.0 }]
        : []),
      ...airport.aliases.map((alias) => ({
        value: alias.toLowerCase(),
        field: 'alias',
        weight: 0.85,
      })),
    ];

    let bestScore = 0;
    let bestField = '';

    for (const { value, field, weight } of fields) {
      if (!value) continue;

      const rawScore = this.calculateSimilarity(normalized, value);
      const adjustedScore = rawScore * weight;

      if (adjustedScore > bestScore) {
        bestScore = adjustedScore;
        bestField = field;
      }
    }

    // Apply private jet friendly boost
    if (airport.isPrivateJetFriendly && bestScore > 0) {
      bestScore = Math.min(1.0, bestScore + this.config.privateJetBoost);
    }

    if (bestScore < this.config.minScore) {
      return null;
    }

    return {
      airport,
      score: bestScore,
      matchedField: bestField,
    };
  }

  /**
   * Calculate similarity between two strings
   *
   * Combines multiple techniques:
   * 1. Exact match → 1.0
   * 2. Contains/substring match → 0.85-0.95
   * 3. Word start match → bonus
   * 4. Levenshtein distance → normalized similarity
   */
  calculateSimilarity(query: string, target: string): number {
    // Exact match
    if (query === target) {
      return 1.0;
    }

    // Target contains query (substring match)
    if (target.includes(query)) {
      // Longer queries matching = higher confidence
      const coverage = query.length / target.length;
      const baseScore = 0.85 + coverage * 0.1;

      // Boost if match is at word boundary
      if (this.matchesWordStart(query, target)) {
        return Math.min(1.0, baseScore + this.config.wordStartBoost);
      }

      return baseScore;
    }

    // Query contains target (e.g., "teterboro airport" contains "teterboro")
    if (query.includes(target)) {
      const coverage = target.length / query.length;
      return 0.8 + coverage * 0.1;
    }

    // Levenshtein distance-based similarity
    const distance = this.levenshteinDistance(query, target);
    const maxLength = Math.max(query.length, target.length);

    if (maxLength === 0) {
      return 0;
    }

    const similarity = 1 - distance / maxLength;

    // Apply word start boost if applicable
    if (similarity > 0.5 && this.matchesWordStart(query, target)) {
      return Math.min(1.0, similarity + this.config.wordStartBoost);
    }

    return similarity;
  }

  /**
   * Check if query matches at word boundary in target
   */
  private matchesWordStart(query: string, target: string): boolean {
    // Check if target starts with query
    if (target.startsWith(query)) {
      return true;
    }

    // Check if any word in target starts with query
    const words = target.split(/\s+/);
    return words.some((word) => word.startsWith(query));
  }

  /**
   * Calculate Levenshtein (edit) distance between two strings
   *
   * Uses dynamic programming with O(n*m) time and O(min(n,m)) space
   */
  levenshteinDistance(a: string, b: string): number {
    // Optimize by ensuring 'a' is the shorter string
    if (a.length > b.length) {
      [a, b] = [b, a];
    }

    const m = a.length;
    const n = b.length;

    // Edge cases
    if (m === 0) return n;
    if (n === 0) return m;

    // Use single array with rolling computation (space optimization)
    let previousRow: number[] = Array.from({ length: m + 1 }, (_, i) => i);
    let currentRow: number[] = new Array(m + 1);

    for (let j = 1; j <= n; j++) {
      currentRow[0] = j;

      for (let i = 1; i <= m; i++) {
        const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;

        currentRow[i] = Math.min(
          previousRow[i] + 1, // deletion
          currentRow[i - 1] + 1, // insertion
          previousRow[i - 1] + substitutionCost // substitution
        );
      }

      // Swap rows
      [previousRow, currentRow] = [currentRow, previousRow];
    }

    return previousRow[m];
  }

  /**
   * Normalize a string for comparison
   */
  private normalize(input: string): string {
    return input
      .trim()
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  /**
   * Get all airports in the matcher
   */
  getAirports(): Airport[] {
    return [...this.airports];
  }

  /**
   * Add an airport to the matcher
   */
  addAirport(airport: Airport): void {
    this.airports.push(airport);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<FuzzyMatcherConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Standalone utility function for quick similarity calculation
 */
export function calculateStringSimilarity(a: string, b: string): number {
  const matcher = new FuzzyMatcher([]);
  return matcher.calculateSimilarity(a.toLowerCase(), b.toLowerCase());
}

/**
 * Standalone utility function for Levenshtein distance
 */
export function levenshteinDistance(a: string, b: string): number {
  const matcher = new FuzzyMatcher([]);
  return matcher.levenshteinDistance(a, b);
}
