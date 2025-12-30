/**
 * Aircraft Category Inferrer
 *
 * Infers appropriate aircraft categories based on passenger count
 * and other flight requirements. Provides recommendations with
 * confidence scoring and alternatives.
 */

import type {
  AircraftCategory,
  AircraftCategoryInference,
  AircraftCategoryConfig,
  CategoryRange,
} from './types';
import { DEFAULT_AIRCRAFT_CONFIG, CATEGORY_DISPLAY_NAMES } from './types';

/**
 * Aircraft category ranges with passenger capacities
 *
 * Ranges overlap intentionally to allow for flexibility:
 * - minPax: Minimum practical passengers
 * - maxPax: Maximum certified passengers
 * - typicalRange: Sweet spot for comfort/efficiency
 */
export const CATEGORY_RANGES: CategoryRange[] = [
  {
    category: 'turboprop',
    minPax: 1,
    maxPax: 9,
    typicalRange: '4-8',
    rangeNm: 1200,
    cruiseSpeedKts: 300,
  },
  {
    category: 'very_light_jet',
    minPax: 1,
    maxPax: 4,
    typicalRange: '2-4',
    rangeNm: 1100,
    cruiseSpeedKts: 380,
  },
  {
    category: 'light_jet',
    minPax: 1,
    maxPax: 7,
    typicalRange: '4-6',
    rangeNm: 1800,
    cruiseSpeedKts: 430,
  },
  {
    category: 'midsize_jet',
    minPax: 1,
    maxPax: 9,
    typicalRange: '6-8',
    rangeNm: 2800,
    cruiseSpeedKts: 470,
  },
  {
    category: 'super_midsize_jet',
    minPax: 1,
    maxPax: 10,
    typicalRange: '8-10',
    rangeNm: 3500,
    cruiseSpeedKts: 490,
  },
  {
    category: 'heavy_jet',
    minPax: 1,
    maxPax: 16,
    typicalRange: '10-14',
    rangeNm: 4500,
    cruiseSpeedKts: 510,
  },
  {
    category: 'ultra_long_range',
    minPax: 1,
    maxPax: 19,
    typicalRange: '12-16',
    rangeNm: 7500,
    cruiseSpeedKts: 520,
  },
];

/**
 * AircraftCategoryInferrer
 *
 * Recommends aircraft categories based on passenger count
 * with confidence scoring and alternative suggestions.
 */
export class AircraftCategoryInferrer {
  private config: AircraftCategoryConfig;

  constructor(config: Partial<AircraftCategoryConfig> = {}) {
    this.config = { ...DEFAULT_AIRCRAFT_CONFIG, ...config };
  }

  /**
   * Infer aircraft category from passenger count
   *
   * @param passengerCount - Number of passengers
   * @returns Inference result with recommendation and alternatives
   */
  infer(passengerCount: number): AircraftCategoryInference {
    // Validate input
    if (passengerCount < 1) {
      return this.createInferenceResult(
        1,
        'very_light_jet',
        [],
        0.5,
        'Minimum 1 passenger assumed for empty aircraft movement.'
      );
    }

    if (passengerCount > 19) {
      return this.createInferenceResult(
        passengerCount,
        'ultra_long_range',
        [],
        0.6,
        `${passengerCount} passengers exceeds typical private jet capacity. ` +
          'Consider multiple aircraft or commercial charter.'
      );
    }

    // Get recommended category
    const recommended = this.getRecommendedCategory(passengerCount);
    const alternatives = this.getAlternativeCategories(passengerCount, recommended);
    const confidence = this.calculateConfidence(passengerCount, recommended);
    const reasoning = this.config.includeReasoning
      ? this.generateReasoning(passengerCount, recommended)
      : '';

    return this.createInferenceResult(
      passengerCount,
      recommended,
      alternatives,
      confidence,
      reasoning
    );
  }

  /**
   * Get the primary recommended category for a passenger count
   */
  private getRecommendedCategory(pax: number): AircraftCategory {
    // Optimized thresholds for comfort and efficiency
    if (pax <= 4) return 'light_jet';
    if (pax <= 6) return 'midsize_jet';
    if (pax <= 8) return 'super_midsize_jet';
    if (pax <= 12) return 'heavy_jet';
    return 'ultra_long_range';
  }

  /**
   * Get alternative categories that could work
   */
  private getAlternativeCategories(
    pax: number,
    recommended: AircraftCategory
  ): AircraftCategory[] {
    const alternatives: AircraftCategory[] = [];

    for (const range of CATEGORY_RANGES) {
      // Skip the recommended category
      if (range.category === recommended) {
        continue;
      }

      // Check if passenger count fits within this category's range
      if (pax >= range.minPax && pax <= range.maxPax) {
        alternatives.push(range.category);
      }

      // Optionally suggest slightly larger alternatives for comfort
      if (
        this.config.suggestLargerAlternatives &&
        pax < range.minPax &&
        pax >= range.minPax - 2 &&
        !alternatives.includes(range.category)
      ) {
        alternatives.push(range.category);
      }
    }

    // Sort alternatives by category size (smaller first for efficiency)
    return alternatives
      .sort((a, b) => {
        const aRange = CATEGORY_RANGES.find((r) => r.category === a);
        const bRange = CATEGORY_RANGES.find((r) => r.category === b);
        return (aRange?.maxPax || 0) - (bRange?.maxPax || 0);
      })
      .slice(0, 3); // Limit to 3 alternatives
  }

  /**
   * Calculate confidence score based on how well pax fits category
   */
  private calculateConfidence(pax: number, category: AircraftCategory): number {
    const range = CATEGORY_RANGES.find((r) => r.category === category);
    if (!range) return 0.5;

    // Parse typical range
    const [typicalMin, typicalMax] = range.typicalRange.split('-').map(Number);

    // Perfect fit within typical range = highest confidence
    if (pax >= typicalMin && pax <= typicalMax) {
      return 0.95;
    }

    // Within full capacity but outside typical = good confidence
    if (pax >= range.minPax && pax <= range.maxPax) {
      return 0.85;
    }

    // Slightly outside range = lower confidence
    if (pax >= range.minPax - 1 && pax <= range.maxPax + 2) {
      return 0.7;
    }

    return 0.6;
  }

  /**
   * Generate human-readable reasoning for the recommendation
   */
  private generateReasoning(pax: number, category: AircraftCategory): string {
    const displayName = CATEGORY_DISPLAY_NAMES[category];
    const range = CATEGORY_RANGES.find((r) => r.category === category);

    if (!range) {
      return `${displayName} recommended for ${pax} passenger${pax > 1 ? 's' : ''}.`;
    }

    const [typicalMin, typicalMax] = range.typicalRange.split('-').map(Number);
    const isInTypicalRange = pax >= typicalMin && pax <= typicalMax;

    const parts: string[] = [];

    // Main recommendation
    parts.push(
      `${displayName} is ${isInTypicalRange ? 'optimal' : 'suitable'} for ` +
        `${pax} passenger${pax > 1 ? 's' : ''}`
    );

    // Capacity context
    if (isInTypicalRange) {
      parts.push(
        `providing comfortable seating within the typical ${range.typicalRange} passenger range`
      );
    } else if (pax < typicalMin) {
      parts.push(
        `offering additional space and comfort beyond the typical ${range.typicalRange} passengers`
      );
    } else {
      parts.push(
        `accommodating up to ${range.maxPax} passengers with appropriate cabin space`
      );
    }

    // Range information
    if (range.rangeNm) {
      parts.push(`with approximately ${range.rangeNm.toLocaleString()} nm range`);
    }

    return parts.join(', ') + '.';
  }

  /**
   * Create a standardized inference result
   */
  private createInferenceResult(
    passengerCount: number,
    recommendedCategory: AircraftCategory,
    alternativeCategories: AircraftCategory[],
    confidence: number,
    reasoning: string
  ): AircraftCategoryInference {
    return {
      passengerCount,
      recommendedCategory,
      alternativeCategories,
      confidence,
      reasoning,
    };
  }

  /**
   * Get all categories that can accommodate a passenger count
   */
  getCapableCategories(pax: number): AircraftCategory[] {
    return CATEGORY_RANGES.filter((range) => pax >= range.minPax && pax <= range.maxPax).map(
      (range) => range.category
    );
  }

  /**
   * Get the range details for a category
   */
  getCategoryRange(category: AircraftCategory): CategoryRange | undefined {
    return CATEGORY_RANGES.find((r) => r.category === category);
  }

  /**
   * Check if a category can accommodate a passenger count
   */
  canAccommodate(category: AircraftCategory, pax: number): boolean {
    const range = this.getCategoryRange(category);
    if (!range) return false;
    return pax >= range.minPax && pax <= range.maxPax;
  }

  /**
   * Get the display name for a category
   */
  getDisplayName(category: AircraftCategory): string {
    return CATEGORY_DISPLAY_NAMES[category];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AircraftCategoryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): AircraftCategoryConfig {
    return { ...this.config };
  }
}

/**
 * Create a pre-configured inferrer instance
 */
export function createAircraftCategoryInferrer(
  config?: Partial<AircraftCategoryConfig>
): AircraftCategoryInferrer {
  return new AircraftCategoryInferrer(config);
}

/**
 * Singleton instance for convenience
 */
let defaultInferrer: AircraftCategoryInferrer | null = null;

export function getDefaultAircraftCategoryInferrer(): AircraftCategoryInferrer {
  if (!defaultInferrer) {
    defaultInferrer = new AircraftCategoryInferrer();
  }
  return defaultInferrer;
}

/**
 * Quick inference function using default inferrer
 */
export function inferAircraftCategory(passengerCount: number): AircraftCategoryInference {
  return getDefaultAircraftCategoryInferrer().infer(passengerCount);
}
