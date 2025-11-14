/**
 * Conversation Tool Types
 *
 * Type definitions for conversation state management
 * and progressive data extraction in the OrchestratorAgent.
 */

import type { ExtractedRFPData } from './data-extractor';
import type { UserIntent } from './intent-parser';

/**
 * Conversation state
 * Tracks the progress of RFP data gathering
 */
export interface ConversationState {
  sessionId: string;
  userId?: string;
  requestId?: string;

  // Current state
  intent?: UserIntent;
  extractedData: ExtractedRFPData;
  missingFields: string[];

  // Conversation tracking
  clarificationRound: number; // Number of clarification questions asked
  questionsAsked: string[]; // Fields already asked about
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;

  // Status
  isComplete: boolean;
  lastUpdated: Date;
}

/**
 * Create initial conversation state
 */
export function createConversationState(
  sessionId: string,
  userId?: string,
  requestId?: string
): ConversationState {
  return {
    sessionId,
    userId,
    requestId,
    extractedData: {},
    missingFields: ['departure', 'arrival', 'departureDate', 'passengers'],
    clarificationRound: 0,
    questionsAsked: [],
    conversationHistory: [],
    isComplete: false,
    lastUpdated: new Date(),
  };
}

/**
 * Update conversation state
 */
export function updateConversationState(
  state: ConversationState,
  updates: Partial<ConversationState>
): ConversationState {
  return {
    ...state,
    ...updates,
    lastUpdated: new Date(),
  };
}
