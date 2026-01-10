/**
 * Prompt Builder
 *
 * Dynamic prompt builder for context-aware agent prompts.
 * Injects real-time context into base prompts for enhanced agent behavior.
 *
 * @see ONEK-143 - Enhance Agent System Prompts with Chat Messaging & Booking Tools
 */

import { AgentType } from '../core/types';
import {
  getSystemPrompt,
  FLIGHT_SEARCH_PROMPT,
  COMMUNICATION_PROMPT,
  ORCHESTRATOR_PROMPT,
} from './system-prompts';

/**
 * Context for FlightSearchAgent prompt building
 */
export interface FlightSearchContext {
  hasActiveTrip?: boolean;
  tripId?: string;
  pendingMessages?: number;
  quotesReceived?: number;
  bookingInProgress?: boolean;
  awaitingConfirmation?: boolean;
}

/**
 * Context for CommunicationAgent prompt building
 */
export interface CommunicationContext {
  hasClientData?: boolean;
  clientName?: string;
  pendingProposals?: number;
  recentEmails?: number;
  hasAttachments?: boolean;
}

/**
 * Context for OrchestratorAgent prompt building
 */
export interface OrchestratorContext {
  activeWorkflows?: number;
  pendingTasks?: number;
  recentWebhooks?: number;
  sessionActive?: boolean;
  currentIntent?: string;
}

/**
 * Generic prompt context
 */
export interface PromptContext {
  flightSearch?: FlightSearchContext;
  communication?: CommunicationContext;
  orchestrator?: OrchestratorContext;
  custom?: Record<string, unknown>;
}

/**
 * Build a dynamic prompt for FlightSearchAgent
 * Adds context-specific sections based on current state
 *
 * @param context - Current flight search context
 * @returns Enhanced system prompt with context
 */
export function buildFlightSearchPrompt(context: FlightSearchContext = {}): string {
  let prompt = FLIGHT_SEARCH_PROMPT;

  // Add active trip context
  if (context.hasActiveTrip) {
    prompt += '\n\n## Current Context';
    prompt += '\nThere is an active trip. Check for pending operator messages.';

    if (context.tripId) {
      prompt += `\nActive Trip ID: ${context.tripId}`;
    }
  }

  // Add pending messages alert
  if (context.pendingMessages && context.pendingMessages > 0) {
    prompt += `\n\nATTENTION: ${context.pendingMessages} unread operator message(s). Consider checking messages using get_trip_messages.`;
  }

  // Add quotes received context
  if (context.quotesReceived && context.quotesReceived > 0) {
    prompt += `\n\nNOTE: ${context.quotesReceived} quote(s) received. User may want to review or book.`;
  }

  // Add booking in progress context
  if (context.bookingInProgress) {
    prompt += '\n\nNOTE: Booking is in progress. Await confirmation webhook before confirming to user.';
  }

  // Add awaiting confirmation context
  if (context.awaitingConfirmation) {
    prompt += '\n\nNOTE: Awaiting operator confirmation. Check booking status if user asks.';
  }

  return prompt;
}

/**
 * Build a dynamic prompt for CommunicationAgent
 * Adds context-specific sections based on current state
 *
 * @param context - Current communication context
 * @returns Enhanced system prompt with context
 */
export function buildCommunicationPrompt(context: CommunicationContext = {}): string {
  let prompt = COMMUNICATION_PROMPT;

  // Add client data context
  if (context.hasClientData) {
    prompt += '\n\n## Current Context';
    prompt += '\nClient data is available. Personalize communications accordingly.';

    if (context.clientName) {
      prompt += `\nClient: ${context.clientName}`;
    }
  }

  // Add pending proposals context
  if (context.pendingProposals && context.pendingProposals > 0) {
    prompt += `\n\nNOTE: ${context.pendingProposals} pending proposal(s) ready to send.`;
  }

  // Add recent emails context
  if (context.recentEmails && context.recentEmails > 0) {
    prompt += `\n\nNOTE: ${context.recentEmails} recent email(s) sent. Check for replies.`;
  }

  // Add attachments context
  if (context.hasAttachments) {
    prompt += '\n\nNOTE: PDF attachments are available for email.';
  }

  return prompt;
}

/**
 * Build a dynamic prompt for OrchestratorAgent
 * Adds context-specific sections based on current state
 *
 * @param context - Current orchestrator context
 * @returns Enhanced system prompt with context
 */
export function buildOrchestratorPrompt(context: OrchestratorContext = {}): string {
  let prompt = ORCHESTRATOR_PROMPT;

  // Add workflow context
  if (context.activeWorkflows && context.activeWorkflows > 0) {
    prompt += '\n\n## Current Context';
    prompt += `\n${context.activeWorkflows} active workflow(s) in progress.`;
  }

  // Add pending tasks context
  if (context.pendingTasks && context.pendingTasks > 0) {
    prompt += `\n\nNOTE: ${context.pendingTasks} pending task(s) awaiting processing.`;
  }

  // Add recent webhooks context
  if (context.recentWebhooks && context.recentWebhooks > 0) {
    prompt += `\n\nATTENTION: ${context.recentWebhooks} recent webhook event(s) received.`;
  }

  // Add session context
  if (context.sessionActive) {
    prompt += '\n\nSession is active. Maintain conversation context.';
  }

  // Add current intent context
  if (context.currentIntent) {
    prompt += `\n\nCurrent user intent: ${context.currentIntent}`;
  }

  return prompt;
}

/**
 * Build a prompt for any agent type with optional context
 *
 * @param agentType - The type of agent
 * @param context - Optional context for dynamic sections
 * @returns The built prompt string
 */
export function buildPrompt(agentType: AgentType, context: PromptContext = {}): string {
  switch (agentType) {
    case AgentType.FLIGHT_SEARCH:
      return buildFlightSearchPrompt(context.flightSearch);

    case AgentType.COMMUNICATION:
      return buildCommunicationPrompt(context.communication);

    case AgentType.ORCHESTRATOR:
      return buildOrchestratorPrompt(context.orchestrator);

    default:
      // For other agent types, return base prompt with optional custom context
      let prompt = getSystemPrompt(agentType);

      if (context.custom && Object.keys(context.custom).length > 0) {
        prompt += '\n\n## Current Context';
        for (const [key, value] of Object.entries(context.custom)) {
          prompt += `\n${key}: ${value}`;
        }
      }

      return prompt;
  }
}

/**
 * Append a context section to an existing prompt
 *
 * @param basePrompt - The base prompt to extend
 * @param section - The section title
 * @param content - The content to add
 * @returns Extended prompt string
 */
export function appendContextSection(
  basePrompt: string,
  section: string,
  content: string
): string {
  return `${basePrompt}\n\n## ${section}\n${content}`;
}

/**
 * Create a prompt modifier that can be composed
 *
 * @param modifier - Function that modifies the prompt
 * @returns A composable modifier function
 */
export type PromptModifier = (prompt: string) => string;

/**
 * Compose multiple prompt modifiers into one
 *
 * @param modifiers - Array of modifier functions
 * @returns A single composed modifier
 */
export function composeModifiers(...modifiers: PromptModifier[]): PromptModifier {
  return (prompt: string) => modifiers.reduce((p, modifier) => modifier(p), prompt);
}

/**
 * Create a modifier that adds a context section
 *
 * @param section - Section title
 * @param content - Section content
 * @returns A prompt modifier
 */
export function contextModifier(section: string, content: string): PromptModifier {
  return (prompt: string) => appendContextSection(prompt, section, content);
}

/**
 * Create a modifier that adds an attention note
 *
 * @param note - The attention note
 * @returns A prompt modifier
 */
export function attentionModifier(note: string): PromptModifier {
  return (prompt: string) => `${prompt}\n\nATTENTION: ${note}`;
}

/**
 * Create a modifier that adds a note
 *
 * @param note - The note to add
 * @returns A prompt modifier
 */
export function noteModifier(note: string): PromptModifier {
  return (prompt: string) => `${prompt}\n\nNOTE: ${note}`;
}
