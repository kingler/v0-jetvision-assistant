/**
 * Conversation Module
 *
 * Progressive disclosure conversational RFP gathering flow.
 * Exports all components for easy importing.
 */

export { RFPFlow } from './rfp-flow';
export type { RFPStep, RFPData, ProcessResult } from './rfp-flow';

export { IntentExtractor } from './intent-extractor';
export { FieldValidator } from './field-validator';

export { ConversationStateManager } from './state-manager';
export type {
  ConversationState,
  ConversationMessage,
  StateUpdate,
  CreateStateParams,
} from './state-manager';
