// ---------------------------------------------------------------------------
// Self-Improving Agent -- Constants
// ---------------------------------------------------------------------------

/** Minimum number of completed sessions before a reflection cycle triggers. */
export const MIN_SESSIONS_FOR_REFLECTION = 10;

/** Hours to wait between consecutive reflection cycles. */
export const COOLDOWN_HOURS = 6;

/** Maximum number of autonomous prompt updates allowed in a 24-hour window. */
export const MAX_AUTO_UPDATES_PER_DAY = 3;

/**
 * Score thresholds that determine which action the reflection engine takes.
 *
 * - excellent  : no action needed
 * - suggestion : create a human-reviewable suggestion
 * - autoUpdate : apply change automatically (within daily limit)
 * - escalate   : flag for immediate human attention
 */
export const THRESHOLDS = {
  excellent: 4.0,
  suggestion: 3.0,
  autoUpdate: 2.0,
  escalate: 0,
} as const;

/**
 * Weights used to compute the weighted-average overall score from individual
 * rubric dimensions.  Values must sum to 1.0.
 */
export const RUBRIC_WEIGHTS = {
  deal_progression: 0.25,
  domain_accuracy: 0.25,
  proactive_sales: 0.25,
  communication: 0.15,
  scope: 0.10,
} as const;

/**
 * Regular expressions used to detect user corrections in conversation text.
 * A match on any pattern emits a `correction` signal.
 */
export const CORRECTION_PATTERNS: RegExp[] = [
  /\bno[,.]?\s+i\s+meant\b/i,
  /\bthat'?s\s+not\s+(what|right|correct)\b/i,
  /\bactually[,.]?\s+i\s+(want|need)\b/i,
  /\blet\s+me\s+correct\b/i,
  /\bi\s+said\b/i,
  /\bnot\s+what\s+i\s+asked\b/i,
  /\bwrong\b/i,
  /\bplease\s+(re-?read|re-?check)\b/i,
];

/** Time-to-live for cached prompt content, in milliseconds (5 minutes). */
export const PROMPT_CACHE_TTL_MS = 5 * 60 * 1000;
