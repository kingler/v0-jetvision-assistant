/**
 * Prompt Module
 *
 * Centralized prompt management for the Jetvision agent system.
 * This module exports the main prompt builder and supporting utilities.
 *
 * @example
 * ```typescript
 * import { buildSystemPrompt } from '@/lib/prompts';
 *
 * // Get base system prompt
 * const prompt = buildSystemPrompt();
 *
 * // Get prompt with intent-specific additions
 * const promptWithIntent = buildSystemPrompt('create_rfp');
 * ```
 */

// Main prompt builder
export { buildSystemPrompt } from './jetvision-system-prompt';

// Individual prompt sections (for testing/customization)
export {
  IDENTITY_PROMPT,
  SCENARIO_HANDLERS,
  CONTEXT_RULES,
  ERROR_HANDLING,
  RESPONSE_GUIDELINES,
} from './jetvision-system-prompt';

// Intent prompts
export {
  INTENT_PROMPTS,
  getIntentPrompt,
  isValidIntent,
  getAvailableIntents,
} from './intent-prompts';
export type { IntentType } from './intent-prompts';

// Response templates
export {
  RESPONSE_TEMPLATES,
  QUOTE_TABLE_TEMPLATE,
  TRIP_SUMMARY_TEMPLATE,
  PRICE_BREAKDOWN_TEMPLATE,
  ERROR_MESSAGE_TEMPLATE,
  CONFIRMATION_TEMPLATE,
  CLIENT_PROFILE_TEMPLATE,
} from './response-templates';

// Constants
export {
  COMMON_AIRPORT_CODES,
  TOOL_REFERENCE,
  AVINODE_TOOLS,
  DATABASE_TOOLS,
  GMAIL_TOOLS,
  ID_PATTERNS,
  ICAO_PATTERN,
  DATE_FORMAT,
} from './constants';
