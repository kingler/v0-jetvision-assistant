/**
 * Prompts Module
 *
 * Centralized prompt management for Jetvision agent system.
 *
 * @module lib/prompts
 */

// Re-export from jetvision-system-prompt
export {
  buildCompleteSystemPrompt,
  buildSystemPromptWithIntent as buildSystemPromptWithIntentBase,
  detectForcedTool,
  FORCED_TOOL_PATTERNS,
  PROMPT_SECTIONS,
  IDENTITY,
  TOOL_REFERENCE,
  SCENARIO_HANDLERS,
  RESPONSE_FORMATS,
  CONTEXT_RULES,
  ERROR_HANDLING,
  AIRPORT_REFERENCE,
} from './jetvision-system-prompt';

// Re-export from intent-prompts
export {
  INTENT_PROMPTS,
  INTENT_PATTERNS,
  detectIntent,
  getIntentPrompt,
  listIntents,
} from './intent-prompts';

// Import for composite function
import { buildSystemPromptWithIntent as buildBase } from './jetvision-system-prompt';
import { INTENT_PROMPTS } from './intent-prompts';

/**
 * Build system prompt with intent-specific additions (convenience wrapper)
 * Automatically includes intent prompts to avoid circular dependency issues
 * @param intent Optional intent to add specific instructions
 */
export function buildSystemPromptWithIntent(intent?: string): string {
  return buildBase(intent, INTENT_PROMPTS);
}

// Default export for convenience
export { default as buildSystemPrompt } from './jetvision-system-prompt';
